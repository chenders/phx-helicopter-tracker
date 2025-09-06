from fastapi import WebSocket
from typing import List, Dict, Set
import json
import asyncio
from datetime import datetime


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.area_subscriptions: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

        # Send initial connection confirmation
        await websocket.send_text(
            json.dumps(
                {
                    "type": "connection_established",
                    "timestamp": datetime.now().isoformat(),
                    "message": "Connected to Phoenix PD Helicopter Tracker",
                }
            )
        )

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

        # Remove from all area subscriptions
        for area, subscribers in self.area_subscriptions.items():
            subscribers.discard(websocket)

    async def send_personal_message(self, message: dict, websocket: WebSocket):
        await websocket.send_text(json.dumps(message))

    async def broadcast(self, message: dict):
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.append(connection)

        # Clean up disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

    async def subscribe_to_area(self, websocket: WebSocket, area: dict):
        """Subscribe a websocket to helicopter activity in a specific area"""
        area_key = (
            f"{area['lat_min']},{area['lat_max']},{area['lon_min']},{area['lon_max']}"
        )

        if area_key not in self.area_subscriptions:
            self.area_subscriptions[area_key] = set()

        self.area_subscriptions[area_key].add(websocket)

        await websocket.send_text(
            json.dumps(
                {
                    "type": "area_subscription_confirmed",
                    "area": area,
                    "message": f"Subscribed to helicopter activity in area {area_key}",
                }
            )
        )

    async def unsubscribe_from_area(self, websocket: WebSocket, area: dict):
        """Unsubscribe a websocket from helicopter activity in a specific area"""
        area_key = (
            f"{area['lat_min']},{area['lat_max']},{area['lon_min']},{area['lon_max']}"
        )

        if area_key in self.area_subscriptions:
            self.area_subscriptions[area_key].discard(websocket)

        await websocket.send_text(
            json.dumps(
                {
                    "type": "area_unsubscription_confirmed",
                    "area": area,
                    "message": f"Unsubscribed from helicopter activity in area {area_key}",
                }
            )
        )

    async def notify_area_subscribers(self, helicopter_data: dict):
        """Notify subscribers when helicopter activity occurs in their subscribed areas"""
        lat = helicopter_data.get("latitude")
        lon = helicopter_data.get("longitude")

        if lat is None or lon is None:
            return

        # Check which areas contain this helicopter position
        for area_key, subscribers in self.area_subscriptions.items():
            if not subscribers:  # Skip empty subscription sets
                continue

            lat_min, lat_max, lon_min, lon_max = map(float, area_key.split(","))

            # Check if helicopter is in this area
            if lat_min <= lat <= lat_max and lon_min <= lon <= lon_max:
                message = {
                    "type": "helicopter_in_area",
                    "area": area_key,
                    "helicopter": helicopter_data,
                    "timestamp": datetime.now().isoformat(),
                }

                # Send to all subscribers of this area
                disconnected = []
                for (
                    subscriber
                ) in (
                    subscribers.copy()
                ):  # Use copy to avoid modification during iteration
                    try:
                        await subscriber.send_text(json.dumps(message))
                    except:
                        disconnected.append(subscriber)

                # Clean up disconnected subscribers
                for conn in disconnected:
                    subscribers.discard(conn)

    async def broadcast_helicopter_update(self, helicopter_data: dict):
        """Broadcast helicopter position update to all connected clients"""
        message = {
            "type": "helicopter_update",
            "data": helicopter_data,
            "timestamp": datetime.now().isoformat(),
        }

        await self.broadcast(message)

        # Also check area subscriptions
        await self.notify_area_subscribers(helicopter_data)

    async def broadcast_position(self, position_data: dict):
        """Broadcast aircraft position update to all connected clients"""
        message = {
            "type": "position_update",
            "data": position_data,
            "timestamp": datetime.now().isoformat(),
        }

        await self.broadcast(message)

    async def broadcast_alert(self, alert_data: dict):
        """Broadcast alert to all connected clients"""
        message = {
            "type": "alert",
            "data": alert_data,
            "timestamp": datetime.now().isoformat(),
        }

        await self.broadcast(message)


# Global instance for use across the application
websocket_manager = WebSocketManager()
