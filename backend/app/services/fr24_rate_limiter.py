"""
FlightRadar24 API Rate Limiter
Manages API requests to prevent hitting rate limits
"""
import time
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timedelta
import redis
from functools import wraps
import random

from app.core.config import settings

logger = logging.getLogger(__name__)


class FR24RateLimiter:
    """
    Centralized rate limiter for FR24 API requests
    Tracks requests per minute/hour/day and implements backoff strategies
    """
    
    def __init__(self):
        # Connect to Redis for distributed rate limiting
        self.redis_client = redis.from_url(
            getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
            decode_responses=True
        )
        
        # Rate limits based on FR24 subscription (VERY conservative to avoid 429s)
        self.limits = {
            "per_minute": 10,  # Very conservative limit (was 30)
            "per_hour": 100,  # Reduced hourly limit (was 1000)
            "per_day": 1000,  # Reduced daily limit (was 10000)
            "monthly_credits": int(getattr(settings, "FR24_MONTHLY_CREDIT_LIMIT", 500000))
        }
        
        # Minimum delays between requests (in seconds)
        self.min_delay = 10.0  # 10 seconds between requests minimum (was 2)
        self.backoff_base = 30.0  # Base backoff time when rate limited (was 5)
        
        # Keys for Redis
        self.key_prefix = "fr24_rate_limit"
        
    def _get_redis_key(self, period: str) -> str:
        """Generate Redis key for rate limit tracking"""
        now = datetime.now()
        if period == "minute":
            return f"{self.key_prefix}:minute:{now.strftime('%Y%m%d%H%M')}"
        elif period == "hour":
            return f"{self.key_prefix}:hour:{now.strftime('%Y%m%d%H')}"
        elif period == "day":
            return f"{self.key_prefix}:day:{now.strftime('%Y%m%d')}"
        elif period == "month":
            return f"{self.key_prefix}:month:{now.strftime('%Y%m')}"
        elif period == "last_request":
            return f"{self.key_prefix}:last_request"
        return f"{self.key_prefix}:unknown"
    
    def _increment_counter(self, period: str) -> int:
        """Increment and return the counter for a period"""
        key = self._get_redis_key(period)
        pipe = self.redis_client.pipeline()
        pipe.incr(key)
        
        # Set expiry based on period
        if period == "minute":
            pipe.expire(key, 60)
        elif period == "hour":
            pipe.expire(key, 3600)
        elif period == "day":
            pipe.expire(key, 86400)
        elif period == "month":
            pipe.expire(key, 86400 * 31)
            
        results = pipe.execute()
        return results[0] if results else 1
    
    def _get_counter(self, period: str) -> int:
        """Get current counter value for a period"""
        key = self._get_redis_key(period)
        value = self.redis_client.get(key)
        return int(value) if value else 0
    
    def _wait_if_needed(self) -> None:
        """Wait if minimum delay hasn't passed since last request"""
        last_request_key = self._get_redis_key("last_request")
        last_request = self.redis_client.get(last_request_key)
        
        if last_request:
            elapsed = time.time() - float(last_request)
            if elapsed < self.min_delay:
                sleep_time = self.min_delay - elapsed + random.uniform(0.1, 0.5)
                logger.debug(f"Rate limiter sleeping for {sleep_time:.2f}s")
                time.sleep(sleep_time)
        
        # Update last request time
        self.redis_client.setex(last_request_key, 60, time.time())
    
    def can_make_request(self) -> tuple[bool, str]:
        """
        Check if a request can be made based on rate limits
        Returns (can_make_request, reason_if_not)
        """
        # Check monthly credits first
        monthly_usage = self._get_counter("month")
        if monthly_usage >= self.limits["monthly_credits"]:
            return False, f"Monthly credit limit reached ({monthly_usage}/{self.limits['monthly_credits']})"
        
        # Check daily limit
        daily_usage = self._get_counter("day")
        if daily_usage >= self.limits["per_day"]:
            return False, f"Daily limit reached ({daily_usage}/{self.limits['per_day']})"
        
        # Check hourly limit
        hourly_usage = self._get_counter("hour")
        if hourly_usage >= self.limits["per_hour"]:
            return False, f"Hourly limit reached ({hourly_usage}/{self.limits['per_hour']})"
        
        # Check per-minute limit
        minute_usage = self._get_counter("minute")
        if minute_usage >= self.limits["per_minute"]:
            return False, f"Per-minute limit reached ({minute_usage}/{self.limits['per_minute']})"
        
        return True, "OK"
    
    def wait_and_request(self, func):
        """
        Decorator that handles rate limiting for FR24 API calls
        """
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Check if we can make a request
            can_request, reason = self.can_make_request()
            
            if not can_request:
                logger.warning(f"FR24 API rate limit: {reason}")
                
                # Determine wait time based on the limit hit
                if "minute" in reason:
                    wait_time = 60 - datetime.now().second
                elif "hour" in reason:
                    wait_time = 3600 - (datetime.now().minute * 60 + datetime.now().second)
                elif "day" in reason:
                    # For daily limit, return None (don't wait)
                    logger.error("Daily FR24 API limit reached - skipping request")
                    return None
                else:
                    # Monthly limit - definitely don't wait
                    logger.error("Monthly FR24 API credit limit reached!")
                    return None
                
                logger.info(f"Waiting {wait_time}s before retrying...")
                time.sleep(wait_time)
                
                # Recheck after waiting
                can_request, reason = self.can_make_request()
                if not can_request:
                    logger.error(f"Still rate limited after waiting: {reason}")
                    return None
            
            # Enforce minimum delay between requests
            self._wait_if_needed()
            
            # Make the request
            try:
                result = func(*args, **kwargs)
                
                # Increment counters on successful request
                self._increment_counter("minute")
                self._increment_counter("hour")
                self._increment_counter("day")
                self._increment_counter("month")
                
                return result
                
            except Exception as e:
                if "429" in str(e) or "rate" in str(e).lower():
                    # We hit an unexpected rate limit - back off more aggressively
                    logger.warning(f"Unexpected rate limit hit: {e}")
                    self.min_delay = min(self.min_delay * 1.5, 10.0)  # Increase delay up to 10s
                raise
                
        return wrapper
    
    def get_usage_stats(self) -> Dict[str, Any]:
        """Get current usage statistics"""
        return {
            "minute": {
                "used": self._get_counter("minute"),
                "limit": self.limits["per_minute"],
                "remaining": max(0, self.limits["per_minute"] - self._get_counter("minute"))
            },
            "hour": {
                "used": self._get_counter("hour"),
                "limit": self.limits["per_hour"],
                "remaining": max(0, self.limits["per_hour"] - self._get_counter("hour"))
            },
            "day": {
                "used": self._get_counter("day"),
                "limit": self.limits["per_day"],
                "remaining": max(0, self.limits["per_day"] - self._get_counter("day"))
            },
            "month": {
                "used": self._get_counter("month"),
                "limit": self.limits["monthly_credits"],
                "remaining": max(0, self.limits["monthly_credits"] - self._get_counter("month"))
            },
            "min_delay_seconds": self.min_delay
        }
    
    def reset_minute_counter(self):
        """Reset minute counter (useful for testing)"""
        key = self._get_redis_key("minute")
        self.redis_client.delete(key)
    
    def adjust_limits_based_on_plan(self, plan_type: str = "essential"):
        """Adjust rate limits based on FR24 subscription plan"""
        if plan_type == "basic":
            self.limits.update({
                "per_minute": 20,
                "per_hour": 500,
                "per_day": 5000,
            })
        elif plan_type == "essential":
            self.limits.update({
                "per_minute": 30,
                "per_hour": 1000,
                "per_day": 10000,
            })
        elif plan_type == "premium":
            self.limits.update({
                "per_minute": 60,
                "per_hour": 2000,
                "per_day": 20000,
            })


# Global rate limiter instance
fr24_rate_limiter = FR24RateLimiter()