"""
Unified Tracking Service
Provides a single interface for aircraft tracking that can use multiple data sources
with intelligent fallback and source selection.
"""

import logging
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum

from app.services.flightradar24_api_service import fr24_api_service, FR24Position
from app.schemas.tracking import LiveTrackingData, TrackingSource

logger = logging.getLogger(__name__)


class DataSource(Enum):
    """Available data sources for tracking"""

    FR24_API = "fr24_api"
    CACHED = "cached"


class UnifiedTrackingService:
    """Unified service for aircraft tracking across multiple data sources"""

    def __init__(self):
        self.primary_source = DataSource.FR24_API
        self.use_cache_on_failure = True

    def get_current_source(self) -> DataSource:
        """Get the currently configured primary data source"""
        return self.primary_source

    async def get_live_tracking_data(
        self,
        phoenix_pd_only: bool = True,
        active_only: bool = True,
        min_altitude: Optional[int] = None,
        max_altitude: Optional[int] = None,
    ) -> List[LiveTrackingData]:
        """
        Get live tracking data with intelligent source selection
        """
        tracking_data = []
        data_source_used = None

        try:
            # Try primary source (FR24 API)
            if self.primary_source == DataSource.FR24_API:
                logger.info("Fetching live data from FlightRadar24 API")
                tracking_data = await self._get_fr24_tracking_data(
                    phoenix_pd_only, active_only, min_altitude, max_altitude
                )
                data_source_used = DataSource.FR24_API

        except Exception as e:
            logger.error(f"Primary source (FR24) failed: {e}")

            # Use cached data if available
            if self.use_cache_on_failure:
                logger.info("Using cached data")
                tracking_data = await self._get_cached_tracking_data(
                    phoenix_pd_only, active_only, min_altitude, max_altitude
                )
                data_source_used = DataSource.CACHED

        # Log data source used
        if tracking_data:
            logger.info(
                f"Retrieved {len(tracking_data)} aircraft from {data_source_used.value}"
            )
        else:
            logger.warning("No tracking data available from any source")

        return tracking_data

    async def _get_fr24_tracking_data(
        self,
        phoenix_pd_only: bool,
        active_only: bool,
        min_altitude: Optional[int],
        max_altitude: Optional[int],
    ) -> List[LiveTrackingData]:
        """Get tracking data from FlightRadar24 API"""
        tracking_data = []

        async with fr24_api_service:
            if phoenix_pd_only:
                positions = await fr24_api_service.get_phoenix_pd_aircraft()
            else:
                positions = await fr24_api_service.get_live_positions_in_area()

            for pos in positions:
                # Apply altitude filters
                if min_altitude and (
                    pos.altitude_feet is None or pos.altitude_feet < min_altitude
                ):
                    continue
                if max_altitude and (
                    pos.altitude_feet is None or pos.altitude_feet > max_altitude
                ):
                    continue

                # Check if aircraft is active
                if active_only and pos.registration:
                    is_active = await fr24_api_service.is_aircraft_active(
                        pos.registration
                    )
                    if (
                        not is_active
                        and pos.ground_speed_knots
                        and pos.ground_speed_knots < 5
                    ):
                        continue

                # Record activity for intelligent polling
                if pos.registration:
                    await fr24_api_service.record_aircraft_activity(pos.registration)

                tracking_data.append(
                    LiveTrackingData(
                        aircraft_registration=pos.registration or "UNKNOWN",
                        icao_code=pos.flight_id,
                        callsign=pos.callsign,
                        timestamp=pos.timestamp,
                        latitude=pos.latitude,
                        longitude=pos.longitude,
                        altitude_feet=pos.altitude_feet,
                        ground_speed_knots=pos.ground_speed_knots,
                        track_degrees=pos.track_degrees,
                        vertical_rate=pos.vertical_speed_fpm,
                        is_phoenix_pd=fr24_api_service.is_phoenix_pd_aircraft(
                            pos.registration
                        ),
                        data_source=TrackingSource.FLIGHTRADAR24,
                        is_hovering=pos.ground_speed_knots
                        and pos.ground_speed_knots < 10,
                        is_circling=False,  # TODO: Implement circling detection
                        over_residential=False,  # TODO: Implement residential area check
                        privacy_concern=fr24_api_service.is_likely_surveillance(pos),
                    )
                )

        return tracking_data

    async def _get_cached_tracking_data(
        self,
        phoenix_pd_only: bool,
        active_only: bool,
        min_altitude: Optional[int],
        max_altitude: Optional[int],
    ) -> List[LiveTrackingData]:
        """Get cached tracking data when all sources fail"""
        # This would retrieve cached data from Redis
        # For now, return empty list
        logger.warning("Cache retrieval not yet implemented")
        return []

    async def get_aircraft_by_registration(
        self, registration: str
    ) -> Optional[LiveTrackingData]:
        """Get specific aircraft data by registration"""
        try:
            # Try FR24 first
            async with fr24_api_service:
                positions = await fr24_api_service.get_live_positions_in_area(
                    registrations=[registration]
                )

                if positions:
                    pos = positions[0]
                    return LiveTrackingData(
                        aircraft_registration=pos.registration or registration,
                        icao_code=pos.flight_id,
                        callsign=pos.callsign,
                        timestamp=pos.timestamp,
                        latitude=pos.latitude,
                        longitude=pos.longitude,
                        altitude_feet=pos.altitude_feet,
                        ground_speed_knots=pos.ground_speed_knots,
                        track_degrees=pos.track_degrees,
                        vertical_rate=pos.vertical_speed_fpm,
                        is_phoenix_pd=fr24_api_service.is_phoenix_pd_aircraft(
                            pos.registration
                        ),
                        data_source=TrackingSource.FLIGHTRADAR24,
                        is_hovering=pos.ground_speed_knots
                        and pos.ground_speed_knots < 10,
                        is_circling=False,
                        over_residential=False,
                        privacy_concern=fr24_api_service.is_likely_surveillance(pos),
                    )
        except Exception as e:
            logger.error(f"FR24 failed for {registration}: {e}")

            # Fallback to ADS-B
            try:
                async with adsb_service:
                    position = await adsb_service.get_aircraft_by_registration(
                        registration
                    )

                    if position:
                        return LiveTrackingData(
                            aircraft_registration=position.registration or registration,
                            icao_code=position.icao,
                            timestamp=position.timestamp,
                            latitude=position.latitude,
                            longitude=position.longitude,
                            altitude_feet=position.altitude_feet,
                            ground_speed_knots=position.ground_speed_knots,
                            track_degrees=position.track_degrees,
                            vertical_rate=position.vertical_rate,
                            is_phoenix_pd=adsb_service.is_phoenix_pd_aircraft(
                                position.registration
                            ),
                            data_source=TrackingSource.ADSB_EXCHANGE,
                            is_hovering=position.ground_speed_knots
                            and position.ground_speed_knots < 10,
                            is_circling=False,
                            over_residential=False,
                            privacy_concern=adsb_service.is_likely_surveillance(
                                position
                            ),
                        )
            except Exception as e2:
                logger.error(f"ADS-B also failed for {registration}: {e2}")

        return None

    async def get_service_status(self) -> Dict[str, Any]:
        """Get status of all tracking services"""
        status = {
            "primary_source": self.primary_source.value,
            "fallback_source": self.fallback_source.value,
            "services": {},
        }

        # Get FR24 status
        try:
            async with fr24_api_service:
                fr24_status = await fr24_api_service.get_service_status()
                status["services"]["fr24_api"] = fr24_status
        except Exception as e:
            status["services"]["fr24_api"] = {"status": "error", "error": str(e)}

        # Get ADS-B status
        try:
            adsb_status = adsb_service.get_service_status()
            status["services"]["adsb_exchange"] = adsb_status
        except Exception as e:
            status["services"]["adsb_exchange"] = {"status": "error", "error": str(e)}

        return status


# Global service instance
unified_tracking_service = UnifiedTrackingService()
