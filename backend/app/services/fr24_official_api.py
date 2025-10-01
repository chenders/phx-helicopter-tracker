"""
FlightRadar24 Official API Service
Uses the official FR24 API endpoints as documented at https://fr24api.flightradar24.com
"""
import logging
import os
import requests
import time
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone

from app.schemas.tracking import LiveTrackingData
from app.core.config import settings
from app.services.flight_path_tracker import flight_path_tracker
from app.services.cache_service import cache_service
from app.services.fr24_rate_limiter import fr24_rate_limiter

logger = logging.getLogger(__name__)


class FR24OfficialAPI:
    """Service for getting live data using official FlightRadar24 API"""

    def __init__(self):
        # Use production API for real data
        # Sandbox only returns demo data
        self.api_token = os.getenv("FR24_API_KEY_PRODUCTION", "")

        # Extract just the token part (after the |)
        if self.api_token and "|" in self.api_token:
            self.api_token = self.api_token.split("|")[1]

        self.base_url = "https://fr24api.flightradar24.com"
        self.phoenix_pd_aircraft = [
            "N621FB",
            "N622FB",
            "N623FB",
            "N624FB",
            "N625FB",
            "N626FB",
            "N627FB",
            "N628FB",
        ]
        # Phoenix area bounds: north, south, west, east
        # Phoenix is roughly centered at 33.4484, -112.0740
        self.phoenix_bounds = "33.7,33.2,-112.4,-111.9"

        self.headers = {
            "Accept": "application/json",
            "Accept-Version": "v1",
            "Authorization": f"Bearer {self.api_token}" if self.api_token else "",
        }

        # Rate limiting - Essential plan allows more requests
        self.last_request_time = 0
        self.min_request_interval = (
            0.5  # Minimum 0.5 seconds between API calls (120 requests/minute)
        )

    @fr24_rate_limiter.wait_and_request
    def _make_api_request(self, url: str, params: Dict[str, Any]) -> Optional[requests.Response]:
        """Make rate-limited API request"""
        try:
            response = requests.get(
                url, headers=self.headers, params=params, timeout=10
            )
            return response
        except Exception as e:
            logger.error(f"API request failed: {e}")
            return None

    def get_flight_positions_by_bounds(self) -> List[Dict[str, Any]]:
        """Get all flights in Phoenix area using bounds"""
        # Check cache first (5 minute cache for bounds queries)
        cache_key = "fr24_phoenix_area_flights"
        cached_data = cache_service.get(cache_key)
        if cached_data:
            logger.info(f"Returning cached data for Phoenix area flights")
            return cached_data
        
        try:
            url = f"{self.base_url}/api/live/flight-positions/light"
            params = {"bounds": self.phoenix_bounds}

            logger.info(f"Requesting flights in bounds: {self.phoenix_bounds}")
            
            # Use rate-limited request
            response = self._make_api_request(url, params)
            
            if response is None:
                # Rate limiter returned None - we're at limit
                logger.warning("Rate limit prevented request - returning cached data if available")
                # Try to return any cached data even if expired
                old_cache = cache_service.cache.get(cache_key)
                old_data = old_cache[0] if old_cache else None
                return old_data if old_data else []
            
            if response.status_code == 200:
                data = response.json()
                flights = data.get("data", [])
                logger.info(f"Found {len(flights)} flights in Phoenix area")
                # Cache the successful response
                cache_service.set(cache_key, flights, ttl_seconds=300)
                return flights
            elif response.status_code == 401:
                logger.error("FR24 API authentication failed - check API token")
            elif response.status_code == 402:
                logger.error("FR24 API payment required - check subscription")
            elif response.status_code == 429:
                # Rate limit hit despite our limiter - adjust parameters
                logger.warning("FR24 API returned 429 despite rate limiting - adjusting limits")
                fr24_rate_limiter.min_delay *= 1.5  # Increase delay
                # Try to return any cached data
                old_cache = cache_service.cache.get(cache_key)
                old_data = old_cache[0] if old_cache else None
                return old_data if old_data else []
            else:
                logger.error(f"FR24 API error {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Error getting flight positions by bounds: {e}")

        return []

    def get_flight_positions_by_registrations(self) -> List[Dict[str, Any]]:
        """Get specific Phoenix PD helicopters by registration"""
        # Check cache first
        cache_key = "fr24_phoenix_pd_flights"
        cached_data = cache_service.get(cache_key)
        if cached_data is not None:
            logger.info("Returning cached FR24 data")
            return cached_data

        # Enforce rate limiting
        current_time = time.time()
        time_since_last_request = current_time - self.last_request_time
        if time_since_last_request < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last_request
            logger.info(f"Rate limiting: sleeping for {sleep_time:.1f} seconds")
            time.sleep(sleep_time)

        try:
            url = f"{self.base_url}/api/live/flight-positions/light"
            # Join all registrations with commas
            params = {"registrations": ",".join(self.phoenix_pd_aircraft)}

            logger.info(
                f"Requesting flights by registrations: {params['registrations']}"
            )
            self.last_request_time = time.time()
            response = requests.get(
                url, headers=self.headers, params=params, timeout=10
            )

            if response.status_code == 200:
                data = response.json()
                flights = data.get("data", [])
                logger.info(f"Found {len(flights)} Phoenix PD helicopters")
                # Cache the successful response
                cache_service.set(cache_key, flights, ttl_seconds=20)
                return flights
            elif response.status_code == 401:
                logger.error("FR24 API authentication failed - check API token")
            elif response.status_code == 402:
                logger.error("FR24 API payment required - check subscription")
            elif response.status_code == 429:
                # Rate limit exceeded - return empty but don't log as error
                logger.warning(
                    "FR24 API rate limit exceeded - returning cached or empty data"
                )
                # Try to return any cached data even if expired
                old_cache = cache_service.cache.get(cache_key)
                if old_cache:
                    return old_cache[0]  # Return the value part of the tuple
            else:
                logger.error(f"FR24 API error {response.status_code}: {response.text}")

        except Exception as e:
            logger.error(f"Error getting flight positions by registrations: {e}")

        return []

    def get_phoenix_pd_live(self) -> List[LiveTrackingData]:
        """Get live data for Phoenix PD helicopters"""
        live_aircraft = []

        try:
            # Try to get flights by specific registrations first (more efficient)
            flights = self.get_flight_positions_by_registrations()

            # If no results, try getting all flights in Phoenix area
            if not flights:
                logger.info("No helicopters found by registration, checking area...")
                area_flights = self.get_flight_positions_by_bounds()

                # Filter for our helicopters
                for flight in area_flights:
                    # Check both reg field and callsign
                    reg = flight.get("reg", "")
                    callsign = flight.get("callsign", "")

                    if (reg and reg in self.phoenix_pd_aircraft) or (
                        callsign and callsign in self.phoenix_pd_aircraft
                    ):
                        flights.append(flight)

            # Convert to our tracking data format
            for flight in flights:
                try:
                    # Extract all available data from the API response
                    lat = flight.get("lat", 0)
                    lon = flight.get("lon", 0)

                    # Skip if no valid position
                    if lat == 0 and lon == 0:
                        continue

                    # Get flight details
                    altitude = flight.get("alt")  # Altitude in feet
                    ground_speed = flight.get("gspeed")  # Speed in knots
                    track = flight.get("track")  # Heading in degrees
                    vertical_speed = flight.get("vspeed")  # Vertical rate in feet/min

                    # Get aircraft info
                    # For light endpoint, callsign often contains the registration
                    callsign = flight.get("callsign", "")

                    # For Phoenix PD helicopters, callsign IS the registration
                    registration = ""
                    if callsign in self.phoenix_pd_aircraft:
                        registration = callsign
                    else:
                        # Try to get from reg field (full endpoint) or use callsign
                        registration = flight.get("reg", callsign)

                    flight_number = flight.get("flight", "")

                    # Get identifiers
                    fr24_id = flight.get("fr24_id", "")
                    hex_code = flight.get("hex", "")
                    squawk = flight.get("squawk", "")

                    # Determine flight characteristics
                    is_hovering = ground_speed and ground_speed < 10
                    is_low_altitude = altitude and altitude < 1000

                    # Parse timestamp
                    timestamp_str = flight.get("timestamp", "")
                    if timestamp_str:
                        try:
                            timestamp = datetime.fromisoformat(
                                timestamp_str.replace("Z", "+00:00")
                            )
                        except:
                            timestamp = datetime.now(timezone.utc)
                    else:
                        timestamp = datetime.now(timezone.utc)

                    # Add position to flight path tracker
                    flight_path_tracker.add_position(
                        registration, lat, lon, altitude, timestamp
                    )

                    # Get the flight path for this aircraft
                    flight_path = flight_path_tracker.get_flight_path(registration)

                    tracking_data = LiveTrackingData(
                        aircraft_registration=registration,
                        icao_code=hex_code or fr24_id,
                        callsign=callsign or flight_number or registration,
                        timestamp=timestamp,
                        latitude=lat,
                        longitude=lon,
                        altitude_feet=altitude,
                        ground_speed_knots=ground_speed,
                        track_degrees=track,
                        vertical_rate=vertical_speed,
                        is_phoenix_pd=True,
                        data_source="flightradar24",
                        raw_data={
                            "fr24_id": fr24_id,
                            "squawk": squawk,
                            "source": flight.get("source", ""),
                            "aircraft_type": flight.get("type", ""),
                            "flight_path": flight_path,  # Include the tracked flight path
                        },
                        is_hovering=is_hovering,
                        is_circling=False,  # Would need flight path analysis
                        over_residential=False,  # Would need geographic analysis
                        privacy_concern=is_low_altitude,
                    )

                    live_aircraft.append(tracking_data)
                    logger.info(
                        f"✅ Found {registration} at {lat:.4f}, {lon:.4f} - "
                        f"Alt: {altitude} ft, Speed: {ground_speed} kts, "
                        f"Track: {track}°, VSpeed: {vertical_speed} fpm"
                    )

                except Exception as e:
                    logger.error(f"Error processing flight data: {e}")
                    continue

        except Exception as e:
            logger.error(f"Error in FR24 Official API service: {e}")

        return live_aircraft


# Singleton instance
fr24_official_api = FR24OfficialAPI()
