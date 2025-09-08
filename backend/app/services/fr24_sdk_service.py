"""
FlightRadar24 service using the official Python SDK
"""
import logging
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from FlightRadar24 import FlightRadar24API

from app.schemas.tracking import LiveTrackingData

logger = logging.getLogger(__name__)


class FR24SDKService:
    """Service for getting live data using FlightRadar24 Python SDK"""

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
        found_registrations = set()

        try:
            # First try to get flights in Phoenix area - this gives us complete data
            try:
                logger.info("Searching Phoenix area for helicopters...")
                flights = self.fr24.get_flights(bounds=self.phoenix_bounds)

                for flight in flights:
                    reg = getattr(flight, "registration", None)
                    if reg and reg in self.phoenix_pd_aircraft:
                        found_registrations.add(reg)

                        # Extract all available flight data
                        tracking_data = LiveTrackingData(
                            aircraft_registration=reg,
                            icao_code=getattr(flight, "id", ""),
                            callsign=getattr(flight, "callsign", reg),
                            timestamp=datetime.now(timezone.utc),
                            latitude=getattr(flight, "latitude", 0),
                            longitude=getattr(flight, "longitude", 0),
                            altitude_feet=getattr(flight, "altitude", None),
                            ground_speed_knots=getattr(flight, "ground_speed", None),
                            track_degrees=getattr(flight, "heading", None),
                            vertical_rate=getattr(flight, "vertical_speed", None),
                            is_phoenix_pd=True,
                            data_source="flightradar24",
                            is_hovering=getattr(flight, "ground_speed", 100) < 10,
                            is_circling=False,
                            over_residential=False,
                            privacy_concern=getattr(flight, "altitude", 10000) < 1000,
                        )
                        live_aircraft.append(tracking_data)
                        logger.info(
                            f"✅ Found {reg} via area search - Alt: {tracking_data.altitude_feet} ft, Speed: {tracking_data.ground_speed_knots} kts"
                        )

            except Exception as e:
                logger.error(f"Error getting area flights: {e}")

            # Then search for any helicopters we might have missed
            for registration in self.phoenix_pd_aircraft:
                if registration in found_registrations:
                    continue  # Already found via area search

                logger.info(f"Searching specifically for {registration}...")

                try:
                    # Use the SDK search function
                    results = self.fr24.search(registration)

                    # Check if there's live data
                    if results and "live" in results and results["live"]:
                        for live_flight in results["live"]:
                            flight_id = live_flight.get("id", "")

                            # Try to get detailed flight data
                            try:
                                logger.info(
                                    f"Getting detailed data for {registration} (ID: {flight_id})..."
                                )
                                flight_details = self._get_flight_details(flight_id)

                                if flight_details:
                                    # Extract comprehensive data from flight details
                                    aircraft_data = flight_details.get("aircraft", {})
                                    trail_data = flight_details.get("trail", [])

                                    # Get the most recent position from trail if available
                                    lat = 0
                                    lon = 0
                                    alt = None
                                    spd = None
                                    hdg = None

                                    if trail_data and len(trail_data) > 0:
                                        latest = trail_data[-1]  # Most recent position
                                        lat = latest.get("lat", 0)
                                        lon = latest.get("lng", 0)
                                        alt = latest.get("alt", None)
                                        spd = latest.get("spd", None)
                                        hdg = latest.get("hd", None)
                                    else:
                                        # Fall back to detail data
                                        detail = live_flight.get("detail", {})
                                        lat = float(detail.get("lat", 0))
                                        lon = float(detail.get("lon", 0))

                                    tracking_data = LiveTrackingData(
                                        aircraft_registration=registration,
                                        icao_code=flight_id,
                                        callsign=aircraft_data.get(
                                            "registration", registration
                                        ),
                                        timestamp=datetime.now(timezone.utc),
                                        latitude=lat,
                                        longitude=lon,
                                        altitude_feet=alt,
                                        ground_speed_knots=spd,
                                        track_degrees=hdg,
                                        vertical_rate=None,
                                        is_phoenix_pd=True,
                                        data_source="flightradar24",
                                        is_hovering=spd and spd < 10 if spd else False,
                                        is_circling=False,
                                        over_residential=False,
                                        privacy_concern=alt and alt < 1000
                                        if alt
                                        else False,
                                    )

                                    live_aircraft.append(tracking_data)
                                    logger.info(
                                        f"✅ Found {registration} via search - Alt: {alt} ft, Speed: {spd} kts"
                                    )
                                else:
                                    # Use basic data if details not available
                                    detail = live_flight.get("detail", {})
                                    tracking_data = LiveTrackingData(
                                        aircraft_registration=detail.get(
                                            "reg", registration
                                        ),
                                        icao_code=flight_id,
                                        callsign=detail.get("callsign", registration),
                                        timestamp=datetime.now(timezone.utc),
                                        latitude=float(detail.get("lat", 0)),
                                        longitude=float(detail.get("lon", 0)),
                                        altitude_feet=None,
                                        ground_speed_knots=None,
                                        track_degrees=None,
                                        vertical_rate=None,
                                        is_phoenix_pd=True,
                                        data_source="flightradar24",
                                        is_hovering=False,
                                        is_circling=False,
                                        over_residential=False,
                                        privacy_concern=False,
                                    )
                                    live_aircraft.append(tracking_data)
                                    logger.info(
                                        f"✅ Found {registration} (basic data only)"
                                    )

                            except Exception as e:
                                logger.debug(
                                    f"Could not get detailed data for {flight_id}: {e}"
                                )
                                # Still add with basic data
                                detail = live_flight.get("detail", {})
                                tracking_data = LiveTrackingData(
                                    aircraft_registration=detail.get(
                                        "reg", registration
                                    ),
                                    icao_code=flight_id,
                                    callsign=detail.get("callsign", registration),
                                    timestamp=datetime.now(timezone.utc),
                                    latitude=float(detail.get("lat", 0)),
                                    longitude=float(detail.get("lon", 0)),
                                    altitude_feet=None,
                                    ground_speed_knots=None,
                                    track_degrees=None,
                                    vertical_rate=None,
                                    is_phoenix_pd=True,
                                    data_source="flightradar24",
                                    is_hovering=False,
                                    is_circling=False,
                                    over_residential=False,
                                    privacy_concern=False,
                                )
                                live_aircraft.append(tracking_data)
                                logger.info(
                                    f"✅ Found {registration} at {detail.get('lat')}, {detail.get('lon')} (no detailed data)"
                                )

                except Exception as e:
                    logger.debug(f"Error searching for {registration}: {e}")

        except Exception as e:
            logger.error(f"Error in FR24 SDK service: {e}")

        return live_aircraft


# Singleton instance
fr24_sdk_service = FR24SDKService()
