"""
Unit tests for unified tracking service
"""
import pytest
from unittest.mock import Mock, AsyncMock, MagicMock, patch
from datetime import datetime, timedelta, timezone

from app.services.tracking_service import UnifiedTrackingService, DataSource
from app.schemas.tracking import LiveTrackingData, TrackingSource


def _mock_fr24(positions, *, surveillance=False, active=True):
    """Mock fr24_api_service supporting `async with` plus the methods
    UnifiedTrackingService calls."""
    m = MagicMock()
    m.__aenter__ = AsyncMock(return_value=m)
    m.__aexit__ = AsyncMock(return_value=False)
    m.get_phoenix_pd_aircraft = AsyncMock(return_value=positions)
    m.get_live_positions_in_area = AsyncMock(return_value=positions)
    m.is_aircraft_active = AsyncMock(return_value=active)
    m.record_aircraft_activity = AsyncMock(return_value=None)
    m.is_phoenix_pd_aircraft = Mock(return_value=True)
    m.is_likely_surveillance = Mock(return_value=surveillance)
    return m


def _pos(**kw):
    p = Mock()
    p.registration = kw.get("registration", "N624FB")
    p.flight_id = kw.get("flight_id", "ABC123")
    p.callsign = kw.get("callsign", "FIREBIRD4")
    p.latitude = kw.get("latitude", 33.4484)
    p.longitude = kw.get("longitude", -112.0740)
    p.altitude_feet = kw.get("altitude_feet", 1500)
    p.ground_speed_knots = kw.get("ground_speed_knots", 80)
    p.track_degrees = kw.get("track_degrees", 180)
    p.vertical_speed_fpm = kw.get("vertical_speed_fpm", 0)
    p.timestamp = kw.get("timestamp", datetime.now(timezone.utc))
    return p


class TestUnifiedTrackingService:
    """Test suite for unified tracking service"""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        service = UnifiedTrackingService()
        assert service.primary_source == DataSource.FR24_API
        assert service.use_cache_on_failure is True

    @pytest.mark.asyncio
    async def test_get_current_source(self):
        service = UnifiedTrackingService()
        assert service.get_current_source() == DataSource.FR24_API
        service.primary_source = DataSource.CACHED
        assert service.get_current_source() == DataSource.CACHED

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fr24_success(self):
        service = UnifiedTrackingService()
        with patch(
            "app.services.tracking_service.fr24_api_service", _mock_fr24([_pos()])
        ):
            result = await service.get_live_tracking_data(phoenix_pd_only=True)
        assert len(result) == 1
        assert result[0].aircraft_registration == "N624FB"
        assert result[0].data_source == TrackingSource.FLIGHTRADAR24
        assert result[0].latitude == 33.4484

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fallback_to_cache(self):
        service = UnifiedTrackingService()
        m = _mock_fr24([])
        m.get_phoenix_pd_aircraft = AsyncMock(side_effect=Exception("FR24 Error"))
        with patch("app.services.tracking_service.fr24_api_service", m):
            result = await service.get_live_tracking_data(phoenix_pd_only=True)
        assert result == []

    @pytest.mark.asyncio
    async def test_get_live_tracking_data_fail_no_cache(self):
        service = UnifiedTrackingService()
        m = _mock_fr24([])
        m.get_phoenix_pd_aircraft = AsyncMock(side_effect=Exception("FR24 Error"))
        with patch("app.services.tracking_service.fr24_api_service", m):
            result = await service.get_live_tracking_data(phoenix_pd_only=True)
        assert result == []

    @pytest.mark.asyncio
    async def test_filter_active_aircraft(self):
        service = UnifiedTrackingService()
        positions = [
            _pos(registration="N624FB", ground_speed_knots=80, altitude_feet=1500),
            _pos(
                registration="N625FB",
                ground_speed_knots=0,
                altitude_feet=0,
                timestamp=datetime.now(timezone.utc) - timedelta(minutes=30),
            ),
        ]
        # active_only drops an aircraft only when it's inactive AND ~stationary.
        with patch(
            "app.services.tracking_service.fr24_api_service",
            _mock_fr24(positions, active=False),
        ):
            result_all = await service.get_live_tracking_data(
                phoenix_pd_only=True, active_only=False
            )
        assert len(result_all) == 2
        with patch(
            "app.services.tracking_service.fr24_api_service",
            _mock_fr24(positions, active=False),
        ):
            result_active = await service.get_live_tracking_data(
                phoenix_pd_only=True, active_only=True
            )
        assert len(result_active) == 1
        assert result_active[0].aircraft_registration == "N624FB"

    @pytest.mark.asyncio
    async def test_altitude_filtering(self):
        service = UnifiedTrackingService()
        positions = [
            _pos(registration="N624FB", altitude_feet=1500),
            _pos(registration="N625FB", altitude_feet=350, ground_speed_knots=60),
            _pos(registration="N626FB", altitude_feet=3000, ground_speed_knots=100),
        ]
        with patch(
            "app.services.tracking_service.fr24_api_service", _mock_fr24(positions)
        ):
            result = await service.get_live_tracking_data(
                phoenix_pd_only=True, max_altitude=500
            )
        assert len(result) == 1
        assert result[0].aircraft_registration == "N625FB"
        assert result[0].altitude_feet == 350
        with patch(
            "app.services.tracking_service.fr24_api_service", _mock_fr24(positions)
        ):
            result = await service.get_live_tracking_data(
                phoenix_pd_only=True, min_altitude=1000, max_altitude=2000
            )
        assert len(result) == 1
        assert result[0].aircraft_registration == "N624FB"

    @pytest.mark.asyncio
    async def test_privacy_concern_detection(self):
        service = UnifiedTrackingService()
        positions = [
            _pos(registration="N624FB", altitude_feet=350, ground_speed_knots=15)
        ]
        with patch(
            "app.services.tracking_service.fr24_api_service",
            _mock_fr24(positions, surveillance=True),
        ):
            result = await service.get_live_tracking_data(phoenix_pd_only=True)
        assert len(result) == 1
        assert result[0].privacy_concern is True

    @pytest.mark.asyncio
    async def test_data_conversion_fr24(self):
        service = UnifiedTrackingService()
        pos = _pos(
            registration="N624FB",
            callsign="FIREBIRD4",
            altitude_feet=1500,
            ground_speed_knots=80,
            track_degrees=180,
            vertical_speed_fpm=-100,
        )
        with patch("app.services.tracking_service.fr24_api_service", _mock_fr24([pos])):
            result = await service.get_live_tracking_data(phoenix_pd_only=True)
        assert len(result) == 1
        data = result[0]
        assert data.aircraft_registration == "N624FB"
        assert data.callsign == "FIREBIRD4"
        assert data.latitude == 33.4484
        assert data.longitude == -112.0740
        assert data.altitude_feet == 1500
        assert data.ground_speed_knots == 80
        assert data.track_degrees == 180
        assert data.vertical_rate == -100
        assert data.data_source == TrackingSource.FLIGHTRADAR24
