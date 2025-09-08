"""
Simple in-memory cache service for API responses
"""
import time
from typing import Dict, Any, Optional
from datetime import datetime, timedelta


class CacheService:
    """Simple TTL cache for API responses"""

    def __init__(self, default_ttl_seconds: int = 20):
        """
        Initialize cache service

        Args:
            default_ttl_seconds: Default time-to-live in seconds
        """
        self.cache: Dict[str, tuple[Any, float]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Optional[Any]:
        """Get value from cache if not expired"""
        if key in self.cache:
            value, expiry = self.cache[key]
            if time.time() < expiry:
                return value
            else:
                # Remove expired entry
                del self.cache[key]
        return None

    def set(self, key: str, value: Any, ttl_seconds: Optional[int] = None) -> None:
        """Set value in cache with TTL"""
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        expiry = time.time() + ttl
        self.cache[key] = (value, expiry)

    def clear(self) -> None:
        """Clear all cache entries"""
        self.cache.clear()

    def clean_expired(self) -> None:
        """Remove all expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry) in self.cache.items() if current_time >= expiry
        ]
        for key in expired_keys:
            del self.cache[key]


# Singleton instance
cache_service = CacheService(default_ttl_seconds=20)  # 20 second cache for FR24 data
