# Lazy imports to avoid startup dependency issues
from .websocket_manager import WebSocketManager

# from .flightradar24_service import FlightRadar24Service  # Import when needed

__all__ = [
    "WebSocketManager",
    # "FlightRadar24Service"  # Available via direct import
]
