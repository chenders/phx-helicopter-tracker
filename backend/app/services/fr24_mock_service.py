"""
FlightRadar24 service with mock data for testing
"""
import logging
import random
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from FlightRadar24 import FlightRadar24API

from app.schemas.tracking import LiveTrackingData

logger = logging.getLogger(__name__)


class FR24MockService:
    """Service for getting live data with mock values for testing"""

    def __init__(self):
        self.fr24 = FlightRadar24API()
        self.phoenix_pd_aircraft = [
            "N622FB",
            "N623FB",
            "N624FB",
            "N625FB",
            "N626FB",
            "N627FB",
            "N628FB",
        ]
        # Phoenix area bounds
        self.phoenix_bounds = "33.7,-112.4,33.2,-111.9"  # tl_y,tl_x,br_y,br_x

    def get_phoenix_pd_live(self) -> List[LiveTrackingData]:
        """Get live data for Phoenix PD helicopters"""
        live_aircraft = []

        try:
            # Search for each Phoenix PD helicopter
            for registration in self.phoenix_pd_aircraft:
                logger.info(f"Searching for {registration}...")

                try:
                    # Use the SDK search function
                    results = self.fr24.search(registration)

                    # Check if there's live data
                    if results and "live" in results and results["live"]:
                        for live_flight in results["live"]:
                            detail = live_flight.get("detail", {})
                            flight_id = live_flight.get("id", "")

                            # Get position from search results
                            lat = float(detail.get("lat", 0))
                            lon = float(detail.get("lon", 0))

                            # Skip if no valid position
                            if lat == 0 and lon == 0:
                                continue

                            # Generate realistic mock data for demo purposes
                            # In production, these would come from the actual FR24 API
                            altitude = random.randint(
                                500, 3000
                            )  # Typical helicopter altitude
                            speed = random.randint(
                                20, 120
                            )  # Typical helicopter speed in knots
                            heading = random.randint(0, 359)  # Random heading
                            vertical_rate = random.randint(
                                -500, 500
                            )  # Typical vertical rate

                            # Determine flight characteristics
                            is_hovering = speed < 10
                            is_low_altitude = altitude < 1000

                            tracking_data = LiveTrackingData(
                                aircraft_registration=detail.get("reg", registration),
                                icao_code=flight_id,
                                callsign=detail.get("callsign", registration),
                                timestamp=datetime.now(timezone.utc),
                                latitude=lat,
                                longitude=lon,
                                altitude_feet=altitude,
                                ground_speed_knots=speed,
                                track_degrees=heading,
                                vertical_rate=vertical_rate,
                                is_phoenix_pd=True,
                                data_source="flightradar24",
                                is_hovering=is_hovering,
                                is_circling=False,  # Would need flight path analysis
                                over_residential=True
                                if random.random() > 0.5
                                else False,
                                privacy_concern=is_low_altitude,
                            )

                            live_aircraft.append(tracking_data)
                            logger.info(
                                f"✅ Found {registration} at {lat}, {lon} - Alt: {altitude} ft, Speed: {speed} kts, Heading: {heading}°"
                            )

                except Exception as e:
                    logger.debug(f"Error searching for {registration}: {e}")

        except Exception as e:
            logger.error(f"Error in FR24 mock service: {e}")

        return live_aircraft


# Singleton instance
fr24_mock_service = FR24MockService()
