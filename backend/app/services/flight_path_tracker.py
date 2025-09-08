"""
Flight Path Tracking Service
Stores historical positions for each aircraft to build flight paths
"""
import logging
from typing import Dict, List, Tuple
from datetime import datetime, timedelta, timezone
from collections import defaultdict, deque

logger = logging.getLogger(__name__)


class FlightPathTracker:
    """Tracks flight paths by storing historical positions"""

    def __init__(self, max_positions: int = 100, max_age_minutes: int = 30):
        """
        Initialize the flight path tracker

        Args:
            max_positions: Maximum number of positions to store per aircraft
            max_age_minutes: Maximum age of positions to keep (in minutes)
        """
        self.max_positions = max_positions
        self.max_age = timedelta(minutes=max_age_minutes)
        # Store positions as deque for efficient add/remove
        # Key: aircraft_registration, Value: deque of (timestamp, lat, lon, alt)
        self.flight_paths: Dict[str, deque] = defaultdict(
            lambda: deque(maxlen=max_positions)
        )

    def add_position(
        self,
        aircraft_registration: str,
        lat: float,
        lon: float,
        altitude: float = None,
        timestamp: datetime = None,
    ) -> None:
        """Add a new position to an aircraft's flight path"""
        if timestamp is None:
            timestamp = datetime.now(timezone.utc)

        # Don't add duplicate positions (same lat/lon within 1 second)
        if self.flight_paths[aircraft_registration]:
            last_time, last_lat, last_lon, _ = self.flight_paths[aircraft_registration][
                -1
            ]
            if (
                abs(last_lat - lat) < 0.0001
                and abs(last_lon - lon) < 0.0001
                and abs((timestamp - last_time).total_seconds()) < 1
            ):
                return

        # Add new position
        self.flight_paths[aircraft_registration].append((timestamp, lat, lon, altitude))

        # Clean old positions
        self._clean_old_positions(aircraft_registration)

    def get_flight_path(self, aircraft_registration: str) -> List[Dict[str, float]]:
        """
        Get the flight path for an aircraft

        Returns:
            List of position dictionaries with lat, lng, alt keys
        """
        path = []
        positions = self.flight_paths.get(aircraft_registration, [])

        for timestamp, lat, lon, alt in positions:
            path.append({"lat": lat, "lng": lon, "alt": alt})

        return path

    def get_all_paths(self) -> Dict[str, List[Dict[str, float]]]:
        """Get flight paths for all tracked aircraft"""
        paths = {}
        for registration in self.flight_paths:
            path = self.get_flight_path(registration)
            if path:  # Only include if there's actual path data
                paths[registration] = path
        return paths

    def _clean_old_positions(self, aircraft_registration: str) -> None:
        """Remove positions older than max_age"""
        now = datetime.now(timezone.utc)
        positions = self.flight_paths[aircraft_registration]

        # Remove old positions from the front
        while positions and (now - positions[0][0]) > self.max_age:
            positions.popleft()

    def clear_aircraft(self, aircraft_registration: str) -> None:
        """Clear all positions for a specific aircraft"""
        if aircraft_registration in self.flight_paths:
            del self.flight_paths[aircraft_registration]

    def clear_all(self) -> None:
        """Clear all flight paths"""
        self.flight_paths.clear()


# Singleton instance
flight_path_tracker = FlightPathTracker()
