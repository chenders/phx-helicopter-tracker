"""
Elevation Service
Handles fetching ground elevation data for coordinates
Uses Open-Elevation API (free, no key required) with Redis caching
"""

import aiohttp
import asyncio
import logging
import json
from typing import Dict, List, Optional, Tuple
from datetime import timedelta
import redis.asyncio as redis
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import settings

logger = logging.getLogger(__name__)


class ElevationService:
    """Service for fetching and caching ground elevation data"""

    # Phoenix area roughly spans these coordinates
    PHOENIX_BOUNDS = {
        "min_lat": 33.2,
        "max_lat": 33.9,
        "min_lon": -112.4,
        "max_lon": -111.6
    }

    # Default elevation for Phoenix area if API fails (feet)
    DEFAULT_PHOENIX_ELEVATION = 1086

    def __init__(self):
        self.redis_client = None
        self.session = None
        self.cache_ttl = timedelta(days=30)  # Elevation data doesn't change often

    async def initialize(self):
        """Initialize Redis connection and HTTP session"""
        if not self.redis_client:
            self.redis_client = await redis.from_url(
                f"redis://redis:6379",
                encoding="utf-8",
                decode_responses=True
            )
        if not self.session:
            self.session = aiohttp.ClientSession()

    async def close(self):
        """Close connections"""
        if self.session:
            await self.session.close()
        if self.redis_client:
            await self.redis_client.close()

    def _get_cache_key(self, lat: float, lon: float) -> str:
        """Generate cache key for coordinates (rounded to 4 decimal places)"""
        # Round to ~10 meter precision to improve cache hits
        lat_rounded = round(lat, 4)
        lon_rounded = round(lon, 4)
        return f"elevation:{lat_rounded}:{lon_rounded}"

    async def get_elevation(self, latitude: float, longitude: float) -> Optional[int]:
        """
        Get ground elevation for given coordinates in feet
        Returns None if unable to fetch elevation
        """
        await self.initialize()

        # Check cache first
        cache_key = self._get_cache_key(latitude, longitude)
        cached = await self.redis_client.get(cache_key)
        if cached:
            logger.debug(f"Cache hit for elevation at {latitude}, {longitude}")
            return int(cached)

        # Fetch from API
        elevation_meters = await self._fetch_elevation_from_api(latitude, longitude)

        if elevation_meters is not None:
            # Convert meters to feet
            elevation_feet = int(elevation_meters * 3.28084)

            # Cache the result
            await self.redis_client.setex(
                cache_key,
                int(self.cache_ttl.total_seconds()),
                elevation_feet
            )

            logger.debug(f"Fetched elevation {elevation_feet}ft for {latitude}, {longitude}")
            return elevation_feet

        # If in Phoenix area, use default elevation
        if self._is_in_phoenix_area(latitude, longitude):
            logger.warning(f"Using default Phoenix elevation for {latitude}, {longitude}")
            return self.DEFAULT_PHOENIX_ELEVATION

        return None

    async def get_elevations_batch(self, coordinates: List[Tuple[float, float]]) -> Dict[Tuple[float, float], Optional[int]]:
        """
        Get elevations for multiple coordinates efficiently
        Returns dict mapping (lat, lon) to elevation in feet
        """
        await self.initialize()

        results = {}
        uncached_coords = []

        # Check cache for all coordinates
        for lat, lon in coordinates:
            cache_key = self._get_cache_key(lat, lon)
            cached = await self.redis_client.get(cache_key)
            if cached:
                results[(lat, lon)] = int(cached)
            else:
                uncached_coords.append((lat, lon))

        # Fetch uncached elevations in batches
        if uncached_coords:
            # Open-Elevation API supports batch requests
            batch_size = 100  # API limit
            for i in range(0, len(uncached_coords), batch_size):
                batch = uncached_coords[i:i+batch_size]
                elevations = await self._fetch_elevations_batch_from_api(batch)

                for (lat, lon), elev_m in elevations.items():
                    if elev_m is not None:
                        elev_ft = int(elev_m * 3.28084)
                        results[(lat, lon)] = elev_ft

                        # Cache result
                        cache_key = self._get_cache_key(lat, lon)
                        await self.redis_client.setex(
                            cache_key,
                            int(self.cache_ttl.total_seconds()),
                            elev_ft
                        )
                    elif self._is_in_phoenix_area(lat, lon):
                        results[(lat, lon)] = self.DEFAULT_PHOENIX_ELEVATION
                    else:
                        results[(lat, lon)] = None

        return results

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=2, max=10))
    async def _fetch_elevation_from_api(self, latitude: float, longitude: float) -> Optional[float]:
        """
        Fetch elevation from Open-Elevation API
        Returns elevation in meters or None if failed
        """
        url = "https://api.open-elevation.com/api/v1/lookup"

        try:
            data = {
                "locations": [
                    {
                        "latitude": latitude,
                        "longitude": longitude
                    }
                ]
            }

            async with self.session.post(url, json=data, timeout=5) as response:
                if response.status == 200:
                    result = await response.json()
                    if result.get("results"):
                        return result["results"][0].get("elevation")
                else:
                    logger.error(f"Elevation API returned status {response.status}")
        except Exception as e:
            logger.error(f"Failed to fetch elevation: {e}")

        return None

    async def _fetch_elevations_batch_from_api(self, coordinates: List[Tuple[float, float]]) -> Dict[Tuple[float, float], Optional[float]]:
        """
        Fetch elevations for multiple coordinates from API
        Returns dict mapping coordinates to elevation in meters
        """
        url = "https://api.open-elevation.com/api/v1/lookup"
        results = {}

        try:
            data = {
                "locations": [
                    {"latitude": lat, "longitude": lon}
                    for lat, lon in coordinates
                ]
            }

            async with self.session.post(url, json=data, timeout=10) as response:
                if response.status == 200:
                    api_result = await response.json()
                    if api_result.get("results"):
                        for i, (lat, lon) in enumerate(coordinates):
                            if i < len(api_result["results"]):
                                elevation = api_result["results"][i].get("elevation")
                                results[(lat, lon)] = elevation
                else:
                    logger.error(f"Elevation API batch returned status {response.status}")
        except Exception as e:
            logger.error(f"Failed to fetch batch elevations: {e}")

        # Fill in missing results with None
        for coord in coordinates:
            if coord not in results:
                results[coord] = None

        return results

    def _is_in_phoenix_area(self, latitude: float, longitude: float) -> bool:
        """Check if coordinates are within Phoenix area bounds"""
        return (
            self.PHOENIX_BOUNDS["min_lat"] <= latitude <= self.PHOENIX_BOUNDS["max_lat"] and
            self.PHOENIX_BOUNDS["min_lon"] <= longitude <= self.PHOENIX_BOUNDS["max_lon"]
        )

    def calculate_agl(self, msl_altitude_feet: Optional[int], ground_elevation_feet: Optional[int]) -> Optional[int]:
        """
        Calculate Above Ground Level altitude

        Args:
            msl_altitude_feet: Altitude above mean sea level in feet
            ground_elevation_feet: Ground elevation in feet

        Returns:
            AGL altitude in feet, or None if either input is None
        """
        if msl_altitude_feet is None or ground_elevation_feet is None:
            return None

        agl = msl_altitude_feet - ground_elevation_feet

        # Sanity check - helicopters shouldn't have negative AGL
        if agl < 0:
            logger.warning(f"Calculated negative AGL: MSL={msl_altitude_feet}, Ground={ground_elevation_feet}")
            return 0

        return agl


# Singleton instance
elevation_service = ElevationService()