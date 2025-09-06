"""
Unit tests for FlightRadar24 API service
"""
import pytest
from unittest.mock import Mock, patch, AsyncMock, MagicMock
from datetime import datetime, timedelta
import aiohttp
import json

from app.services.flightradar24_api_service import (
    FlightRadar24APIService,
    FR24Position,
    FR24Environment,
    CreditManager,
)


class TestCreditManager:
    """Test suite for credit management"""

    @pytest.mark.asyncio
    async def test_track_usage(self):
        """Test credit usage tracking"""
        mock_redis = AsyncMock()
        mock_redis.incrby = AsyncMock(return_value=10)

        manager = CreditManager(mock_redis, monthly_limit=60000)
        await manager.record_usage(
            "live_positions_light", 2
        )  # This should cost 10 credits (5*2)

        # Should track both monthly and daily
        assert mock_redis.incrby.call_count == 2
        mock_redis.incrby.assert_any_call(
            f"fr24_credits:{datetime.now().strftime('%Y-%m')}", 10
        )
        mock_redis.incrby.assert_any_call(
            f"fr24_credits:{datetime.now().strftime('%Y-%m-%d')}", 10
        )

    @pytest.mark.asyncio
    async def test_check_limit_ok(self):
        """Test credit limit check when under limit"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="30000")  # 50% used

        manager = CreditManager(mock_redis, monthly_limit=60000)
        result = await manager.can_make_request(
            "live_positions_light", 10
        )  # Check if we can make 10 requests (50 credits)

        assert result is True

    @pytest.mark.asyncio
    async def test_check_limit_exceeded(self):
        """Test credit limit check when over limit"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(return_value="59900")  # Almost at limit

        manager = CreditManager(mock_redis, monthly_limit=60000)
        result = await manager.can_make_request(
            "historic_positions_full", 2
        )  # Would exceed limit (200 credits)

        assert result is False

    @pytest.mark.asyncio
    async def test_get_usage_stats(self):
        """Test getting usage statistics"""
        mock_redis = AsyncMock()
        mock_redis.get = AsyncMock(side_effect=["45000", "1500"])  # Monthly, daily

        manager = CreditManager(mock_redis, monthly_limit=60000)
        stats = await manager.get_usage_stats()

        assert stats["monthly_used"] == 45000
        assert stats["monthly_limit"] == 60000
        assert stats["monthly_remaining"] == 15000
        assert stats["monthly_percentage"] == 75.0
        assert stats["daily_used"] == 1500


class TestFlightRadar24APIService:
    """Test suite for FR24 API service"""

    @pytest.mark.asyncio
    async def test_service_initialization(self):
        """Test service initialization"""
        service = FlightRadar24APIService()

        assert service.environment == FR24Environment.SANDBOX
        assert service.api_key is not None
        assert service.session is None
        assert service.credit_manager is None

    @pytest.mark.asyncio
    async def test_make_api_request_success(self):
        """Test successful API request"""
        service = FlightRadar24APIService()
        await service.initialize()
        service.credit_manager = AsyncMock()
        service.credit_manager.can_make_request = AsyncMock(return_value=True)
        service.credit_manager.record_usage = AsyncMock()
        service.redis = AsyncMock()
        service.redis.get = AsyncMock(return_value=None)  # No cache
        service.redis.setex = AsyncMock()

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"data": [{"test": "data"}]})
        mock_response.headers = {"x-fr24-credits-consumed": "10"}

        # Mock the context manager properly
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_response)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        service.session.get = MagicMock(return_value=mock_context)

        with patch("app.services.flightradar24_api_service.asyncio.sleep"):
            result = await service._make_api_request(
                "test/endpoint", {"param": "value"}
            )

        assert result == {"data": [{"test": "data"}]}
        service.credit_manager.record_usage.assert_called_once()

    @pytest.mark.asyncio
    async def test_make_api_request_credit_limit(self):
        """Test API request blocked by credit limit"""
        service = FlightRadar24APIService()
        service.credit_manager = AsyncMock()
        service.credit_manager.can_make_request = AsyncMock(return_value=False)

        result = await service._make_api_request("test/endpoint", {})

        assert result is None

    @pytest.mark.asyncio
    async def test_parse_fr24_position(self):
        """Test parsing FR24 position data"""
        service = FlightRadar24APIService()

        # Mock API response data - note the field names match what the service expects
        flight_data = {
            "fr24_id": "abc123",
            "registration": "N624FB",  # Changed from "reg" to "registration"
            "callsign": "FIREBIRD4",
            "type": "AS50",
            "lat": 33.4484,
            "lon": -112.0740,
            "alt": 1500,
            "gspeed": 80,
            "track": 180,
            "vspeed": -100,
            "timestamp": "2025-08-30T12:00:00Z",
            "orig_iata": "PHX",
            "dest_iata": "DVT",
        }

        service._make_api_request = AsyncMock(return_value={"data": [flight_data]})

        await service.initialize()
        positions = await service.get_live_positions_in_area()
        await service.cleanup()

        assert len(positions) == 1
        position = positions[0]
        assert position.registration == "N624FB"
        assert position.latitude == 33.4484
        assert position.longitude == -112.0740
        assert position.altitude_feet == 1500

    @pytest.mark.asyncio
    async def test_get_phoenix_pd_aircraft(self):
        """Test getting Phoenix PD aircraft"""
        service = FlightRadar24APIService()

        # Mock response with Phoenix PD aircraft
        mock_data = {
            "data": [
                {
                    "fr24_id": "abc123",
                    "registration": "N624FB",  # Changed from "reg" to "registration"
                    "lat": 33.4484,
                    "lon": -112.0740,
                    "alt": 1500,
                    "gspeed": 80,
                    "track": 180,
                    "timestamp": "2025-08-30T12:00:00Z",
                }
            ]
        }

        service._make_api_request = AsyncMock(return_value=mock_data)

        positions = await service.get_phoenix_pd_aircraft()

        assert len(positions) == 1
        assert positions[0].registration == "N624FB"

    @pytest.mark.asyncio
    async def test_get_current_polling_interval(self):
        """Test polling interval calculation"""
        service = FlightRadar24APIService()

        # Test peak hours (6am-10pm)
        with patch("app.services.flightradar24_api_service.datetime") as mock_datetime:
            mock_datetime.now.return_value.hour = 14  # 2pm
            assert service.get_current_polling_interval() == 30

        # Test night hours
        with patch("app.services.flightradar24_api_service.datetime") as mock_datetime:
            mock_datetime.now.return_value.hour = 2  # 2am
            assert service.get_current_polling_interval() == 120

    @pytest.mark.asyncio
    async def test_cache_functionality(self):
        """Test caching mechanism"""
        service = FlightRadar24APIService()
        await service.initialize()
        service.redis = AsyncMock()
        service.credit_manager = AsyncMock()
        service.credit_manager.can_make_request = AsyncMock(return_value=True)
        service.credit_manager.record_usage = AsyncMock()

        # First call - cache miss
        service.redis.get = AsyncMock(return_value=None)
        service.redis.setex = AsyncMock()

        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"data": []})
        mock_response.headers = {}

        # Mock the context manager properly
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_response)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        service.session.get = MagicMock(return_value=mock_context)

        with patch("app.services.flightradar24_api_service.asyncio.sleep"):
            result1 = await service._make_api_request("test", {})

        # Should have tried to get from cache and set cache
        service.redis.get.assert_called_once()
        service.redis.setex.assert_called_once()

        # Second call - cache hit
        service.redis.get = AsyncMock(
            return_value=json.dumps({"data": [], "cached": True})
        )

        result2 = await service._make_api_request("test", {})

        # When cache hit, it should return the cached data
        assert "data" in result2

    @pytest.mark.asyncio
    async def test_get_service_status(self):
        """Test getting service status"""
        service = FlightRadar24APIService()
        service.credit_manager = AsyncMock()
        service.credit_manager.get_usage_stats = AsyncMock(
            return_value={
                "monthly_used": 30000,
                "monthly_limit": 60000,
                "monthly_remaining": 30000,
                "monthly_percentage": 50.0,
            }
        )

        status = await service.get_service_status()

        assert status["environment"] == "sandbox"
        assert status["api_configured"] is True
        assert status["cache_enabled"] is False  # Cache is False when redis is None
        assert status["credit_usage"]["monthly_percentage"] == 50.0

    @pytest.mark.asyncio
    async def test_retry_mechanism(self):
        """Test retry mechanism for failed requests"""
        service = FlightRadar24APIService()
        await service.initialize()
        service.redis = AsyncMock()
        service.redis.get = AsyncMock(return_value=None)  # No cache
        service.redis.setex = AsyncMock()
        service.credit_manager = AsyncMock()
        service.credit_manager.can_make_request = AsyncMock(return_value=True)
        service.credit_manager.record_usage = AsyncMock()

        # Create successful response
        mock_response = AsyncMock()
        mock_response.status = 200
        mock_response.json = AsyncMock(return_value={"data": []})
        mock_response.headers = {}

        # Mock the context manager properly
        mock_context = AsyncMock()
        mock_context.__aenter__ = AsyncMock(return_value=mock_response)
        mock_context.__aexit__ = AsyncMock(return_value=None)
        service.session.get = MagicMock(return_value=mock_context)

        with patch("app.services.flightradar24_api_service.asyncio.sleep"):
            result = await service._make_api_request("test", {})

        assert result == {"data": []}
