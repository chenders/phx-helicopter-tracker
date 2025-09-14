"""
FlightRadar24 API Service
Handles all interactions with the FlightRadar24 API including:
- Live flight position tracking
- Historical flight data retrieval
- Credit usage management
- Intelligent caching
"""

import asyncio
import aiohttp
import json
import logging
import hashlib
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from enum import Enum
import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings
from app.services.fr24_rate_limiter import fr24_rate_limiter

logger = logging.getLogger(__name__)


class FR24Environment(Enum):
    """FlightRadar24 API environments"""

    SANDBOX = "sandbox"
    PRODUCTION = "production"


@dataclass
class FR24Position:
    """Data class for FlightRadar24 position data"""

    flight_id: str
    registration: Optional[str]
    callsign: Optional[str]
    aircraft_type: Optional[str]
    latitude: float
    longitude: float
    altitude_feet: Optional[int]
    ground_speed_knots: Optional[float]
    track_degrees: Optional[float]
    vertical_speed_fpm: Optional[float]
    timestamp: datetime
    origin: Optional[str] = None
    destination: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for caching"""
        return {
            "flight_id": self.flight_id,
            "registration": self.registration,
            "callsign": self.callsign,
            "aircraft_type": self.aircraft_type,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "altitude_feet": self.altitude_feet,
            "ground_speed_knots": self.ground_speed_knots,
            "track_degrees": self.track_degrees,
            "vertical_speed_fpm": self.vertical_speed_fpm,
            "timestamp": self.timestamp.isoformat(),
            "origin": self.origin,
            "destination": self.destination,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FR24Position":
        """Create from dictionary (for cache retrieval)"""
        data["timestamp"] = datetime.fromisoformat(data["timestamp"])
        return cls(**data)


class CreditManager:
    """Manages API credit usage and tracking"""

    def __init__(self, redis_client: redis.Redis, monthly_limit: int = 666000):
        self.redis = redis_client
        self.monthly_limit = monthly_limit
        self.credit_costs = {
            "live_positions_light": 5,
            "live_positions_full": 10,
            "historic_positions_light": 50,
            "historic_positions_full": 100,
            "flight_tracks": 20,
            "flights": 10,  # Search for flights by registration
            "flight_summary": 10,  # Flight summary by registration
        }

    async def can_make_request(self, endpoint_type: str, count: int = 1) -> bool:
        """Check if we have enough credits for a request"""
        cost = self.credit_costs.get(endpoint_type, 10) * count
        used = await self.get_monthly_usage()
        return (used + cost) <= self.monthly_limit

    async def record_usage(self, endpoint_type: str, count: int = 1):
        """Record credit usage"""
        cost = self.credit_costs.get(endpoint_type, 10) * count

        # Get current month key
        month_key = f"fr24_credits:{datetime.now().strftime('%Y-%m')}"

        # Increment usage
        await self.redis.incrby(month_key, cost)

        # Set expiry to end of next month
        await self.redis.expire(month_key, 60 * 60 * 24 * 62)  # 62 days

        # Track daily usage
        day_key = f"fr24_credits:{datetime.now().strftime('%Y-%m-%d')}"
        await self.redis.incrby(day_key, cost)
        await self.redis.expire(day_key, 60 * 60 * 24 * 7)  # 7 days

        # Log usage
        used = await self.get_monthly_usage()
        percentage = (used / self.monthly_limit) * 100
        logger.info(
            f"FR24 API: Used {cost} credits for {endpoint_type}. "
            f"Monthly usage: {used}/{self.monthly_limit} ({percentage:.1f}%)"
        )

        # Alert if approaching limits
        if percentage >= 95:
            logger.error(f"FR24 API: CRITICAL - Credit usage at {percentage:.1f}%")
        elif percentage >= 85:
            logger.warning(f"FR24 API: WARNING - Credit usage at {percentage:.1f}%")
        elif percentage >= 70:
            logger.info(f"FR24 API: INFO - Credit usage at {percentage:.1f}%")

    async def get_monthly_usage(self) -> int:
        """Get current month's credit usage"""
        month_key = f"fr24_credits:{datetime.now().strftime('%Y-%m')}"
        usage = await self.redis.get(month_key)
        return int(usage) if usage else 0

    async def get_daily_usage(self) -> int:
        """Get today's credit usage"""
        day_key = f"fr24_credits:{datetime.now().strftime('%Y-%m-%d')}"
        usage = await self.redis.get(day_key)
        return int(usage) if usage else 0

    async def get_usage_stats(self) -> Dict[str, Any]:
        """Get comprehensive usage statistics"""
        monthly = await self.get_monthly_usage()
        daily = await self.get_daily_usage()

        return {
            "monthly_used": monthly,
            "monthly_limit": self.monthly_limit,
            "monthly_remaining": self.monthly_limit - monthly,
            "monthly_percentage": (monthly / self.monthly_limit) * 100,
            "daily_used": daily,
            "daily_average": monthly / datetime.now().day,
            "projected_monthly": (monthly / datetime.now().day) * 30,
        }


class FlightRadar24APIService:
    """Main service for FlightRadar24 API integration"""

    def __init__(self):
        # Environment configuration
        self.environment = FR24Environment(
            getattr(settings, "FR24_API_ENVIRONMENT", "production")
        )

        # API configuration
        if self.environment == FR24Environment.SANDBOX:
            self.api_key = getattr(settings, "FR24_API_KEY_SANDBOX", None)
            self.base_url = "https://fr24api.flightradar24.com/api/sandbox"
        else:
            self.api_key = getattr(settings, "FR24_API_KEY_PRODUCTION", None)
            self.base_url = "https://fr24api.flightradar24.com/api"

        # Session management
        self.session: Optional[aiohttp.ClientSession] = None

        # Redis for caching
        self.redis: Optional[redis.Redis] = None
        self.cache_ttl = {
            "live_positions": 30,  # 30 seconds
            "flight_details": 300,  # 5 minutes
            "historic_data": 3600,  # 1 hour
            "static_data": 86400,  # 24 hours
        }

        # Credit manager
        self.credit_manager: Optional[CreditManager] = None

        # Phoenix area bounds
        self.phoenix_bounds = {
            "lat_min": 33.0,
            "lat_max": 34.0,
            "lon_min": -113.0,
            "lon_max": -111.0,
        }

        # Phoenix PD aircraft
        self.phoenix_pd_aircraft = {
            "N622FB",
            "N623FB",
            "N624FB",
            "N625FB",
            "N626FB",
            "N627FB",
            "N628FB",
        }

        # Intelligent polling configuration
        self.polling_intervals = {
            "peak": 30,  # 6am-10pm: every 30 seconds
            "night": 120,  # 10pm-6am: every 2 minutes
            "inactive": 300,  # No activity: every 5 minutes
            "incident": 10,  # Active incident: every 10 seconds
        }

        logger.info(f"FR24 API Service initialized in {self.environment.value} mode")

    async def __aenter__(self):
        """Async context manager entry"""
        await self.initialize()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.cleanup()

    async def initialize(self):
        """Initialize connections and services"""
        # Initialize HTTP session
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Accept": "application/json",
            "Accept-Version": "v1",
            "User-Agent": "PhoenixPDTracker/1.0",
        }

        self.session = aiohttp.ClientSession(
            headers=headers, timeout=aiohttp.ClientTimeout(total=30)
        )

        # Initialize Redis
        redis_url = getattr(settings, "REDIS_URL", "redis://localhost:6379/0")
        self.redis = await redis.from_url(redis_url, decode_responses=True)

        # Initialize credit manager
        monthly_limit = int(getattr(settings, "FR24_MONTHLY_CREDIT_LIMIT", 666000))
        self.credit_manager = CreditManager(self.redis, monthly_limit)

        logger.info("FR24 API Service initialized successfully")

    async def cleanup(self):
        """Cleanup connections"""
        if self.session:
            await self.session.close()
        if self.redis:
            await self.redis.close()

    def _get_cache_key(self, operation: str, params: Dict[str, Any]) -> str:
        """Generate cache key for API responses"""
        # Create deterministic key from operation and parameters
        param_str = json.dumps(params, sort_keys=True)
        hash_str = hashlib.md5(param_str.encode()).hexdigest()[:8]
        return f"fr24_cache:{operation}:{hash_str}"

    async def _get_cached_response(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get cached API response"""
        if not self.redis:
            return None

        try:
            cached = await self.redis.get(cache_key)
            if cached:
                logger.debug(f"Cache hit for {cache_key}")
                return json.loads(cached)
        except Exception as e:
            logger.error(f"Cache retrieval error: {e}")

        return None

    async def _cache_response(self, cache_key: str, data: Dict[str, Any], ttl: int):
        """Cache API response"""
        if not self.redis:
            return

        try:
            await self.redis.setex(cache_key, ttl, json.dumps(data))
            logger.debug(f"Cached response for {cache_key} with TTL {ttl}s")
        except Exception as e:
            logger.error(f"Cache storage error: {e}")

    @retry(
        stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10)
    )
    async def _make_api_request(
        self,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        credit_type: str = "live_positions_light",
    ) -> Optional[Dict[str, Any]]:
        """Make API request with retry logic and credit management"""

        # Check credits
        if not await self.credit_manager.can_make_request(credit_type):
            logger.error("Insufficient FR24 API credits")
            return None

        # Check cache first
        cache_key = self._get_cache_key(endpoint, params or {})
        cached = await self._get_cached_response(cache_key)
        if cached:
            return cached

        # Check rate limit before making request
        can_request, reason = fr24_rate_limiter.can_make_request()
        if not can_request:
            logger.warning(f"FR24 API rate limit hit: {reason}")
            # For async, we'll wait the appropriate time
            if "minute" in reason:
                await asyncio.sleep(60 - datetime.now().second + 1)
            elif "hour" in reason:
                await asyncio.sleep(60)  # Wait a minute and retry
            else:
                logger.error(f"FR24 API limit reached: {reason}")
                return None
            
            # Recheck after waiting
            can_request, reason = fr24_rate_limiter.can_make_request()
            if not can_request:
                logger.error(f"Still rate limited after waiting: {reason}")
                return None
        
        # Enforce minimum delay between requests
        fr24_rate_limiter._wait_if_needed()
        
        # Make API request
        url = f"{self.base_url}/{endpoint}"

        try:
            async with self.session.get(url, params=params) as response:
                if response.status == 200:
                    data = await response.json()

                    # Record credit usage
                    await self.credit_manager.record_usage(credit_type)
                    
                    # Update rate limiter counters
                    fr24_rate_limiter._increment_counter("minute")
                    fr24_rate_limiter._increment_counter("hour")
                    fr24_rate_limiter._increment_counter("day")
                    fr24_rate_limiter._increment_counter("month")

                    # Cache response
                    ttl = self.cache_ttl.get(
                        credit_type.replace("_light", "").replace("_full", ""), 60
                    )
                    await self._cache_response(cache_key, data, ttl)

                    return data

                elif response.status == 401:
                    logger.error("FR24 API: Authentication failed")
                elif response.status == 429:
                    logger.error("FR24 API: Rate limit exceeded")
                elif response.status == 402:
                    logger.error("FR24 API: Payment required (credits exhausted)")
                else:
                    logger.error(
                        f"FR24 API error {response.status}: {await response.text()}"
                    )

        except asyncio.TimeoutError:
            logger.error(f"FR24 API timeout for {endpoint}")
        except Exception as e:
            logger.error(f"FR24 API error for {endpoint}: {e}")

        return None

    async def get_live_positions_in_area(
        self,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        registrations: Optional[List[str]] = None,
    ) -> List[FR24Position]:
        """Get live aircraft positions in specified area"""

        # Use Phoenix bounds if not specified
        if lat_min is None:
            lat_min = self.phoenix_bounds["lat_min"]
        if lat_max is None:
            lat_max = self.phoenix_bounds["lat_max"]
        if lon_min is None:
            lon_min = self.phoenix_bounds["lon_min"]
        if lon_max is None:
            lon_max = self.phoenix_bounds["lon_max"]

        params = {
            "bounds": f"{lat_max},{lon_max},{lat_min},{lon_min}",  # north,east,south,west
        }

        # Add registration filter if specified
        if registrations:
            params["registrations"] = ",".join(registrations)

        # Use live flight positions endpoint - this is the correct FR24 API endpoint
        data = await self._make_api_request("live/flight-positions/light", params, "live_positions_light")

        if not data:
            return []

        positions = []
        for flight_data in data.get("data", []):
            try:
                # Parse timestamp - it might be a string or unix timestamp
                timestamp_val = flight_data.get("timestamp")
                if isinstance(timestamp_val, str):
                    timestamp = datetime.fromisoformat(
                        timestamp_val.replace("Z", "+00:00")
                    )
                elif timestamp_val:
                    timestamp = datetime.fromtimestamp(timestamp_val)
                else:
                    timestamp = datetime.now(timezone.utc)

                position = FR24Position(
                    flight_id=flight_data.get("fr24_id", ""),
                    registration=flight_data.get("registration"),
                    callsign=flight_data.get("callsign"),
                    aircraft_type=flight_data.get("aircraft_type"),
                    latitude=float(flight_data.get("lat", 0)),
                    longitude=float(flight_data.get("lon", 0)),
                    altitude_feet=flight_data.get("alt"),
                    ground_speed_knots=flight_data.get("gspeed"),
                    track_degrees=flight_data.get("track"),
                    vertical_speed_fpm=flight_data.get("vspeed"),
                    timestamp=timestamp,
                    origin=flight_data.get("origin"),
                    destination=flight_data.get("destination"),
                )

                # Only add if we have valid coordinates
                if position.latitude != 0 and position.longitude != 0:
                    positions.append(position)

            except (KeyError, ValueError) as e:
                logger.error(f"Error parsing flight position: {e}")

        return positions

    async def get_phoenix_pd_aircraft(self) -> List[FR24Position]:
        """Get positions for all Phoenix PD aircraft"""
        return await self.get_live_positions_in_area(
            registrations=list(self.phoenix_pd_aircraft)
        )

    async def search_flights_by_registration(
        self, registration: str, days_back: int = 7
    ) -> List[Dict[str, Any]]:
        """Search for recent flights by aircraft registration"""
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        params = {
            "registration": registration,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d"),
            "limit": 100
        }
        
        logger.info(f"Searching flights for {registration} from {params['from']} to {params['to']}")
        
        data = await self._make_api_request("flights", params, "flights")
        
        if not data:
            return []
            
        flights = data.get('data', []) if isinstance(data, dict) else data
        logger.info(f"Found {len(flights)} flights for {registration}")
        return flights

    async def get_flight_summary(self, registration: str, page: int = 1, days_back: int = 14, start_date: datetime = None, end_date: datetime = None) -> Dict[str, Any]:
        """
        Get flight summary for a specific registration
        Returns list of all flights with their IDs for later track download
        Note: API has a 14-day maximum date range limit
        """
        # If specific dates provided, use them
        if start_date and end_date:
            # Ensure we don't exceed 14-day limit
            date_diff = (end_date - start_date).days
            if date_diff > 14:
                raise ValueError(f"Date range cannot exceed 14 days (got {date_diff} days)")
        else:
            # Use days_back parameter
            days_back = min(days_back, 14)
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days_back)
        
        params = {
            "registrations": registration,  # Note: plural 'registrations'
            "flight_datetime_from": start_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "flight_datetime_to": end_date.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "page": page,
            "limit": 100  # Max results per page
        }
        
        logger.info(f"Getting flight summary for {registration}, page {page}, from {start_date.date()} to {end_date.date()}")
        
        data = await self._make_api_request(
            "flight-summary/light", params, "flight_summary"
        )
        
        if not data:
            return {"data": []}
            
        # Ensure consistent format
        if isinstance(data, list):
            return {"data": data}
        elif isinstance(data, dict) and "data" in data:
            return data
        else:
            return {"data": []}

    async def get_flight_track(self, flight_id: str) -> List[FR24Position]:
        """Get complete track for a specific flight - ALL positions for the entire flight"""

        # Use flight-tracks endpoint with flight_id as parameter
        params = {"flight_id": flight_id}
        data = await self._make_api_request(
            "flight-tracks", params, "flight_tracks"
        )

        if not data:
            return []

        positions = []
        
        # Response is a list with flight data
        if isinstance(data, list) and len(data) > 0:
            flight_data = data[0]
            fr24_id = flight_data.get("fr24_id", flight_id)
            tracks = flight_data.get("tracks", [])
            
            logger.info(f"Processing {len(tracks)} track points for flight {fr24_id}")
            
            for track_point in tracks:
                try:
                    # Parse timestamp
                    timestamp_str = track_point.get("timestamp", "")
                    if timestamp_str:
                        # Handle ISO format with Z
                        if isinstance(timestamp_str, str):
                            timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                        else:
                            timestamp = datetime.fromtimestamp(timestamp_str, tz=timezone.utc)
                    else:
                        timestamp = datetime.now(timezone.utc)
                    
                    position = FR24Position(
                        flight_id=fr24_id,
                        registration=track_point.get("callsign") or fr24_id,  # Use callsign if available
                        callsign=track_point.get("callsign", ""),
                        aircraft_type=None,  # Not in track data
                        latitude=float(track_point.get("lat", 0)),
                        longitude=float(track_point.get("lon", 0)),
                        altitude_feet=track_point.get("alt"),
                        ground_speed_knots=track_point.get("gspeed"),
                        track_degrees=track_point.get("track"),
                        vertical_speed_fpm=track_point.get("vspeed"),
                        timestamp=timestamp,
                        origin=None,  # Not in track data
                        destination=None,  # Not in track data
                    )
                    positions.append(position)
                except (KeyError, ValueError) as e:
                    logger.error(f"Error parsing track point: {e}")

        return positions

    async def get_historical_positions(
        self,
        timestamp: datetime,
        lat_min: Optional[float] = None,
        lat_max: Optional[float] = None,
        lon_min: Optional[float] = None,
        lon_max: Optional[float] = None,
        registrations: Optional[List[str]] = None,
    ) -> List[FR24Position]:
        """Get historical positions for a specific time"""

        # Use Phoenix bounds if not specified
        if lat_min is None:
            lat_min = self.phoenix_bounds["lat_min"]
        if lat_max is None:
            lat_max = self.phoenix_bounds["lat_max"]
        if lon_min is None:
            lon_min = self.phoenix_bounds["lon_min"]
        if lon_max is None:
            lon_max = self.phoenix_bounds["lon_max"]

        params = {
            "timestamp": int(timestamp.timestamp()),
            "bounds": f"{lat_max},{lat_min},{lon_min},{lon_max}",
        }

        if registrations:
            params["registrations"] = ",".join(registrations)

        # Use historic flight positions endpoint
        data = await self._make_api_request(
            "historic/flight-positions/light", params, "historic_positions"
        )

        if not data:
            return []

        positions = []
        for flight_data in data.get("data", []):
            try:
                # Historic endpoint uses same field names as live endpoint
                position = FR24Position(
                    flight_id=flight_data.get("fr24_id", ""),
                    registration=flight_data.get("reg") or flight_data.get("callsign"),
                    callsign=flight_data.get("callsign"),
                    aircraft_type=flight_data.get("type"),
                    latitude=float(flight_data.get("lat", 0)),
                    longitude=float(flight_data.get("lon", 0)),
                    altitude_feet=flight_data.get("alt"),
                    ground_speed_knots=flight_data.get("gspeed"),
                    track_degrees=flight_data.get("track"),
                    vertical_speed_fpm=flight_data.get("vspeed"),
                    timestamp=timestamp,
                    origin=flight_data.get("origin"),
                    destination=flight_data.get("destination"),
                )

                # Only add if we have valid coordinates
                if position.latitude != 0 and position.longitude != 0:
                    positions.append(position)
            except (KeyError, ValueError) as e:
                logger.error(f"Error parsing historical position: {e}")

        return positions

    def get_current_polling_interval(self) -> int:
        """Get intelligent polling interval based on time of day"""
        current_hour = datetime.now().hour

        # Peak hours: 6am - 10pm
        if 6 <= current_hour < 22:
            return self.polling_intervals["peak"]
        # Night hours: 10pm - 6am
        else:
            return self.polling_intervals["night"]

    async def is_aircraft_active(self, registration: str) -> bool:
        """Check if aircraft is currently active (not parked)"""
        # Check cache for recent activity
        activity_key = f"fr24_activity:{registration}"
        last_active = await self.redis.get(activity_key)

        if last_active:
            last_time = datetime.fromisoformat(last_active)
            # Consider active if seen in last 30 minutes
            if datetime.now() - last_time < timedelta(minutes=30):
                return True

        return False

    async def record_aircraft_activity(self, registration: str):
        """Record aircraft activity for intelligent polling"""
        activity_key = f"fr24_activity:{registration}"
        await self.redis.setex(
            activity_key, 1800, datetime.now().isoformat()  # 30 minutes
        )

    def is_phoenix_pd_aircraft(self, registration: Optional[str]) -> bool:
        """Check if aircraft belongs to Phoenix PD"""
        return registration in self.phoenix_pd_aircraft if registration else False

    def is_likely_surveillance(self, position: FR24Position) -> bool:
        """Analyze if aircraft behavior suggests surveillance activity"""
        surveillance_indicators = 0

        # Low altitude (below 1000 feet AGL)
        if position.altitude_feet and position.altitude_feet < 1000:
            surveillance_indicators += 1

        # Low speed (below 60 knots suggests hovering/circling)
        if position.ground_speed_knots and position.ground_speed_knots < 60:
            surveillance_indicators += 1

        # Phoenix PD aircraft
        if self.is_phoenix_pd_aircraft(position.registration):
            surveillance_indicators += 1

        # Night time operation
        if datetime.now().hour >= 22 or datetime.now().hour <= 6:
            surveillance_indicators += 1

        return surveillance_indicators >= 2

    async def get_service_status(self) -> Dict[str, Any]:
        """Get comprehensive service status"""
        usage_stats = (
            await self.credit_manager.get_usage_stats() if self.credit_manager else {}
        )

        return {
            "service": "FlightRadar24 API",
            "environment": self.environment.value,
            "status": "active" if self.api_key else "inactive",
            "api_configured": bool(self.api_key),
            "base_url": self.base_url,
            "credit_usage": usage_stats,
            "phoenix_pd_aircraft": list(self.phoenix_pd_aircraft),
            "coverage_area": self.phoenix_bounds,
            "current_polling_interval": self.get_current_polling_interval(),
            "cache_enabled": self.redis is not None,
        }


# Global service instance
fr24_api_service = FlightRadar24APIService()
