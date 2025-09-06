import pytest
from unittest.mock import AsyncMock, MagicMock, patch
import json

from app.services.websocket_manager import WebSocketManager


class TestWebSocketManager:
    """Test the WebSocket manager service."""

    @pytest.fixture
    def ws_manager(self):
        """Create a WebSocket manager instance."""
        return WebSocketManager()

    @pytest.fixture
    def mock_websocket(self):
        """Create a mock WebSocket connection."""
        websocket = AsyncMock()
        websocket.accept = AsyncMock()
        websocket.send_text = AsyncMock()
        websocket.close = AsyncMock()
        return websocket

    @pytest.mark.asyncio
    async def test_connect_websocket(self, ws_manager, mock_websocket):
        """Test connecting a WebSocket."""
        await ws_manager.connect(mock_websocket)

        mock_websocket.accept.assert_called_once()
        assert mock_websocket in ws_manager.active_connections

    def test_disconnect_websocket(self, ws_manager, mock_websocket):
        """Test disconnecting a WebSocket."""
        # First add the websocket to active connections
        ws_manager.active_connections.append(mock_websocket)

        ws_manager.disconnect(mock_websocket)

        assert mock_websocket not in ws_manager.active_connections

    def test_disconnect_nonexistent_websocket(self, ws_manager, mock_websocket):
        """Test disconnecting a WebSocket that's not in active connections."""
        # Should not raise an error
        ws_manager.disconnect(mock_websocket)
        assert len(ws_manager.active_connections) == 0

    @pytest.mark.asyncio
    async def test_broadcast_message(self, ws_manager, mock_websocket):
        """Test broadcasting a message to all connections."""
        # Add websocket to active connections
        await ws_manager.connect(mock_websocket)

        test_message = {"type": "aircraft_update", "data": {"registration": "N624FB"}}
        await ws_manager.broadcast(test_message)

        mock_websocket.send_text.assert_called_once_with(json.dumps(test_message))

    @pytest.mark.asyncio
    async def test_broadcast_to_multiple_connections(self, ws_manager):
        """Test broadcasting to multiple WebSocket connections."""
        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws1.send_text = AsyncMock()

        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()
        mock_ws2.send_text = AsyncMock()

        await ws_manager.connect(mock_ws1)
        await ws_manager.connect(mock_ws2)

        test_message = {"type": "flight_update", "flight_id": "FL_001"}
        await ws_manager.broadcast(test_message)

        mock_ws1.send_text.assert_called_once_with(json.dumps(test_message))
        mock_ws2.send_text.assert_called_once_with(json.dumps(test_message))

    @pytest.mark.asyncio
    async def test_broadcast_handles_disconnected_websocket(self, ws_manager):
        """Test that broadcast handles disconnected WebSockets gracefully."""
        mock_websocket = AsyncMock()
        mock_websocket.accept = AsyncMock()
        mock_websocket.send_text = AsyncMock(side_effect=Exception("Connection closed"))

        await ws_manager.connect(mock_websocket)

        test_message = {"type": "test", "data": "test"}

        # Should not raise an exception
        await ws_manager.broadcast(test_message)

        # The failed websocket should be removed from active connections
        assert mock_websocket not in ws_manager.active_connections

    @pytest.mark.asyncio
    async def test_subscribe_to_area(self, ws_manager, mock_websocket):
        """Test subscribing a WebSocket to an area."""
        area = {"lat_min": 33.4, "lat_max": 33.5, "lon_min": -112.1, "lon_max": -112.0}

        await ws_manager.connect(mock_websocket)
        await ws_manager.subscribe_to_area(mock_websocket, area)

        # Check that the websocket is subscribed to the area
        area_key = (
            f"{area['lat_min']},{area['lat_max']},{area['lon_min']},{area['lon_max']}"
        )
        assert area_key in ws_manager.area_subscriptions
        assert mock_websocket in ws_manager.area_subscriptions[area_key]

    @pytest.mark.asyncio
    async def test_unsubscribe_from_area(self, ws_manager, mock_websocket):
        """Test unsubscribing a WebSocket from an area."""
        area = {"lat_min": 33.4, "lat_max": 33.5, "lon_min": -112.1, "lon_max": -112.0}

        await ws_manager.connect(mock_websocket)
        await ws_manager.subscribe_to_area(mock_websocket, area)
        await ws_manager.unsubscribe_from_area(mock_websocket, area)

        # Check that the websocket is unsubscribed from the area
        area_key = (
            f"{area['lat_min']},{area['lat_max']},{area['lon_min']},{area['lon_max']}"
        )
        if area_key in ws_manager.area_subscriptions:
            assert mock_websocket not in ws_manager.area_subscriptions[area_key]

    @pytest.mark.asyncio
    async def test_broadcast_to_area(self, ws_manager):
        """Test broadcasting a message to subscribers of a specific area."""
        area = {"lat_min": 33.4, "lat_max": 33.5, "lon_min": -112.1, "lon_max": -112.0}

        mock_ws1 = AsyncMock()
        mock_ws1.accept = AsyncMock()
        mock_ws1.send_text = AsyncMock()

        mock_ws2 = AsyncMock()
        mock_ws2.accept = AsyncMock()
        mock_ws2.send_text = AsyncMock()

        # Connect and subscribe first websocket to area
        await ws_manager.connect(mock_ws1)
        await ws_manager.subscribe_to_area(mock_ws1, area)

        # Connect second websocket but don't subscribe to area
        await ws_manager.connect(mock_ws2)

        test_message = {"type": "area_update", "area": area, "aircraft": ["N624FB"]}
        await ws_manager.broadcast_to_area(area, test_message)

        # Only the subscribed websocket should receive the message
        mock_ws1.send_text.assert_called_once_with(json.dumps(test_message))
        mock_ws2.send_text.assert_not_called()
