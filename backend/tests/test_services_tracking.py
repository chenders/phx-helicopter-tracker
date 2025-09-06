"""
Unit tests for unified tracking service
"""
import pytest
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone

from app.services.tracking_service import UnifiedTrackingService, DataSource
from app.schemas.tracking import LiveTrackingData, TrackingSource


class TestUnifiedTrackingService:
    """Test suite for unified tracking service"""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test service initialization"""
        service = UnifiedTrackingService()

        assert service.primary_source == DataSource.FR24_API
        assert service.fallback_source == DataSource.ADSB_EXCHANGE
        assert service.use_cache_on_failure is True

    @pytest.mark.asyncio
    async def test_get_current_source(self):
        """Test getting current data source"""
        service = UnifiedTrackingService()
        assert service.get_current_source() == DataSource.FR24_API

        service.primary_source = DataSource.ADSB_EXCHANGE
        assert service.get_current_source() == DataSource.ADSB_EXCHANGE

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fr24_success(self):
        """Test getting live data from FR24"""
        service = UnifiedTrackingService()

        # Mock FR24 service
        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_position = Mock()
            mock_position.registration = "N624FB"
            mock_position.latitude = 33.4484
            mock_position.longitude = -112.0740
            mock_position.altitude_feet = 1500
            mock_position.ground_speed_knots = 80
            mock_position.track_degrees = 180
            mock_position.vertical_speed_fpm = 0
            mock_position.timestamp = datetime.now(timezone.utc)

            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(return_value=[mock_position])
            mock_fr24.is_likely_surveillance = Mock(return_value=False)

            result = await service.get_live_tracking_data(phoenix_pd_only=True)

            assert len(result) == 1
            assert result[0].aircraft_registration == "N624FB"
            assert result[0].data_source == TrackingSource.FR24_API
            assert result[0].latitude == 33.4484

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fallback_to_cache(self):
        """Test fallback to cache when FR24 fails"""
        service = UnifiedTrackingService()

        # Mock FR24 failure - should fallback to cache
        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(
                side_effect=Exception("FR24 Error")
            )

            # For now, cache returns empty since it's not implemented
            result = await service.get_live_tracking_data(phoenix_pd_only=True)

            # Should return empty list when no cache is available
            assert result == []

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fail_no_cache(self):
        """Test when data source fails and no cache available"""
        service = UnifiedTrackingService()

        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(
                side_effect=Exception("FR24 Error")
            )

            result = await service.get_live_tracking_data(phoenix_pd_only=True)

            assert result == []

    @pytest.mark.asyncio
    async def test_filter_active_aircraft(self):
        """Test filtering for active aircraft only"""
        service = UnifiedTrackingService()

        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_positions = [
                Mock(
                    registration="N624FB",
                    latitude=33.4484,
                    longitude=-112.0740,
                    altitude_feet=1500,
                    ground_speed_knots=80,
                    track_degrees=180,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc),
                ),
                Mock(
                    registration="N625FB",
                    latitude=33.5000,
                    longitude=-112.1000,
                    altitude_feet=0,  # On ground
                    ground_speed_knots=0,
                    track_degrees=0,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc) - timedelta(minutes=30),
                ),
            ]

            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(return_value=mock_positions)

            # Get all aircraft
            result_all = await service.get_live_tracking_data(
                phoenix_pd_only=True, active_only=False
            )
            assert len(result_all) == 2

            # Get active only
            result_active = await service.get_live_tracking_data(
                phoenix_pd_only=True, active_only=True
            )
            assert len(result_active) == 1
            assert result_active[0].aircraft_registration == "N624FB"

    @pytest.mark.asyncio
    async def test_altitude_filtering(self):
        """Test altitude-based filtering"""
        service = UnifiedTrackingService()

        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_positions = [
                Mock(
                    registration="N624FB",
                    latitude=33.4484,
                    longitude=-112.0740,
                    altitude_feet=1500,
                    ground_speed_knots=80,
                    track_degrees=180,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc),
                ),
                Mock(
                    registration="N625FB",
                    latitude=33.5000,
                    longitude=-112.1000,
                    altitude_feet=350,  # Low altitude
                    ground_speed_knots=60,
                    track_degrees=90,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc),
                ),
                Mock(
                    registration="N626FB",
                    latitude=33.4000,
                    longitude=-112.0500,
                    altitude_feet=3000,  # High altitude
                    ground_speed_knots=100,
                    track_degrees=0,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc),
                ),
            ]

            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(return_value=mock_positions)

            # Filter for low altitude only
            result = await service.get_live_tracking_data(
                phoenix_pd_only=True, min_altitude=None, max_altitude=500
            )

            assert len(result) == 1
            assert result[0].aircraft_registration == "N625FB"
            assert result[0].altitude_feet == 350

            # Filter for mid-range altitude
            result = await service.get_live_tracking_data(
                phoenix_pd_only=True, min_altitude=1000, max_altitude=2000
            )

            assert len(result) == 1
            assert result[0].aircraft_registration == "N624FB"

    @pytest.mark.asyncio
    async def test_privacy_concern_detection(self):
        """Test detection of privacy concerns"""
        service = UnifiedTrackingService()

        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_positions = [
                Mock(
                    registration="N624FB",
                    latitude=33.4484,
                    longitude=-112.0740,
                    altitude_feet=350,  # Low altitude
                    ground_speed_knots=15,  # Hovering speed
                    track_degrees=180,
                    vertical_speed_fpm=0,
                    timestamp=datetime.now(timezone.utc),
                )
            ]

            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(return_value=mock_positions)

            result = await service.get_live_tracking_data(phoenix_pd_only=True)

            assert len(result) == 1
            assert result[0].privacy_concern is True  # Should detect privacy concern

    @pytest.mark.asyncio
    async def test_data_conversion_fr24(self):
        """Test conversion from FR24 position to tracking data"""
        service = UnifiedTrackingService()

        with patch("app.services.tracking_service.fr24_api_service") as mock_fr24:
            mock_position = Mock()
            mock_position.registration = "N624FB"
            mock_position.callsign = "FIREBIRD4"
            mock_position.aircraft_type = "AS50"
            mock_position.latitude = 33.4484
            mock_position.longitude = -112.0740
            mock_position.altitude_feet = 1500
            mock_position.ground_speed_knots = 80
            mock_position.track_degrees = 180
            mock_position.vertical_speed_fpm = -100
            mock_position.timestamp = datetime(2025, 8, 30, 12, 0, 0)

            mock_fr24.get_phoenix_pd_aircraft = AsyncMock(return_value=[mock_position])
            mock_fr24.is_likely_surveillance = Mock(return_value=False)

            result = await service.get_live_tracking_data(phoenix_pd_only=True)

            assert len(result) == 1
            data = result[0]

            assert data.aircraft_registration == "N624FB"
            assert data.callsign == "FIREBIRD4"
            assert data.aircraft_type == "AS50"
            assert data.latitude == 33.4484
            assert data.longitude == -112.0740
            assert data.altitude_feet == 1500
            assert data.ground_speed_knots == 80
            assert data.track_degrees == 180
            assert data.vertical_speed_fpm == -100
            assert data.data_source == TrackingSource.FR24_API
