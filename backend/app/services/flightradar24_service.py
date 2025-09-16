import asyncio
import xml.etree.ElementTree as ET
import csv
import json
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass
from pathlib import Path
import zipfile
import io

logger = logging.getLogger(__name__)


@dataclass
class FlightRadar24Position:
    """Data class for FlightRadar24 position data"""

    timestamp: datetime
    latitude: float
    longitude: float
    altitude_feet: Optional[int]
    ground_speed_knots: Optional[float]
    track_degrees: Optional[float]
    aircraft_registration: Optional[str] = None
    callsign: Optional[str] = None
    aircraft_type: Optional[str] = None


@dataclass
class FlightRadar24Flight:
    """Data class for complete FlightRadar24 flight"""

    flight_id: str
    aircraft_registration: str
    aircraft_type: Optional[str]
    departure_airport: Optional[str]
    arrival_airport: Optional[str]
    departure_time: Optional[datetime]
    arrival_time: Optional[datetime]
    positions: List[FlightRadar24Position]
    raw_data: Dict[str, Any]


class FlightRadar24Service:
    """Service for processing FlightRadar24 historical data"""

    def __init__(self):
        self.supported_formats = [".kml", ".csv", ".json"]

        # Phoenix PD aircraft registrations
        self.phoenix_pd_aircraft = {"N621FB", "N622FB", "N623FB", "N624FB", "N625FB"}

    async def import_file(
        self, file_path: str, aircraft_registration: str, file_format: str = None
    ) -> Tuple[FlightRadar24Flight, List[str]]:
        """Import flight data from FlightRadar24 file"""

        path = Path(file_path)
        if not path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")

        # Detect format if not provided
        if not file_format:
            file_format = path.suffix.lower()

        if file_format not in self.supported_formats:
            raise ValueError(
                f"Unsupported format: {file_format}. Supported: {self.supported_formats}"
            )

        logger.info(f"Importing {file_format} file: {file_path}")

        try:
            if file_format == ".kml":
                return await self._import_kml_file(file_path, aircraft_registration)
            elif file_format == ".csv":
                return await self._import_csv_file(file_path, aircraft_registration)
            elif file_format == ".json":
                return await self._import_json_file(file_path, aircraft_registration)
        except Exception as e:
            logger.error(f"Error importing {file_format} file: {e}")
            raise

    async def _import_kml_file(
        self, file_path: str, aircraft_registration: str
    ) -> Tuple[FlightRadar24Flight, List[str]]:
        """Import KML flight data"""

        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            # Remove namespace for easier parsing
            for elem in root.getiterator():
                if "}" in elem.tag:
                    elem.tag = elem.tag.split("}")[1]

            positions = []
            errors = []
            flight_info = {}

            # Parse KML structure
            for placemark in root.findall(".//Placemark"):
                name = placemark.find("name")
                if name is not None:
                    flight_info["flight_name"] = name.text

                # Look for track data
                track = placemark.find(".//Track")
                if track is not None:
                    positions.extend(self._parse_kml_track(track, errors))

                # Look for LineString coordinates (alternative format)
                linestring = placemark.find(".//LineString/coordinates")
                if linestring is not None:
                    positions.extend(self._parse_kml_coordinates(linestring, errors))

            if not positions:
                errors.append("No position data found in KML file")

            # Create flight object
            flight = FlightRadar24Flight(
                flight_id=f"fr24_import_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                aircraft_registration=aircraft_registration,
                aircraft_type=flight_info.get("aircraft_type"),
                departure_airport=None,
                arrival_airport=None,
                departure_time=positions[0].timestamp if positions else None,
                arrival_time=positions[-1].timestamp if positions else None,
                positions=positions,
                raw_data=flight_info,
            )

            logger.info(f"Imported {len(positions)} positions from KML file")
            return flight, errors

        except ET.ParseError as e:
            raise ValueError(f"Invalid KML file: {e}")

    def _parse_kml_track(
        self, track_elem, errors: List[str]
    ) -> List[FlightRadar24Position]:
        """Parse KML Track element with when/coord pairs"""
        positions = []

        when_elements = track_elem.findall("when")
        coord_elements = track_elem.findall("coord")

        if len(when_elements) != len(coord_elements):
            errors.append("Mismatch between time and coordinate elements")
            return positions

        for when_elem, coord_elem in zip(when_elements, coord_elements):
            try:
                # Parse timestamp
                timestamp_str = when_elem.text.strip()
                timestamp = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))

                # Parse coordinates (lon lat alt)
                coords = coord_elem.text.strip().split()
                if len(coords) >= 2:
                    longitude = float(coords[0])
                    latitude = float(coords[1])
                    altitude_feet = (
                        float(coords[2]) * 3.28084 if len(coords) > 2 else None
                    )  # Convert m to ft

                    position = FlightRadar24Position(
                        timestamp=timestamp,
                        latitude=latitude,
                        longitude=longitude,
                        altitude_feet=int(altitude_feet) if altitude_feet else None,
                        ground_speed_knots=None,
                        track_degrees=None,
                    )
                    positions.append(position)

            except (ValueError, IndexError) as e:
                errors.append(f"Error parsing track point: {e}")

        return positions

    def _parse_kml_coordinates(
        self, coords_elem, errors: List[str]
    ) -> List[FlightRadar24Position]:
        """Parse KML LineString coordinates"""
        positions = []

        try:
            coords_text = coords_elem.text.strip()
            coord_pairs = coords_text.split()

            for i, coord_pair in enumerate(coord_pairs):
                coords = coord_pair.split(",")
                if len(coords) >= 2:
                    longitude = float(coords[0])
                    latitude = float(coords[1])
                    altitude_feet = (
                        float(coords[2]) * 3.28084 if len(coords) > 2 else None
                    )

                    # Estimate timestamp based on position in sequence
                    base_time = datetime.now(timezone.utc) - timedelta(hours=1)
                    timestamp = base_time + timedelta(
                        seconds=i * 10
                    )  # 10 second intervals

                    position = FlightRadar24Position(
                        timestamp=timestamp,
                        latitude=latitude,
                        longitude=longitude,
                        altitude_feet=int(altitude_feet) if altitude_feet else None,
                        ground_speed_knots=None,
                        track_degrees=None,
                    )
                    positions.append(position)

        except (ValueError, IndexError) as e:
            errors.append(f"Error parsing coordinates: {e}")

        return positions

    async def _import_csv_file(
        self, file_path: str, aircraft_registration: str
    ) -> Tuple[FlightRadar24Flight, List[str]]:
        """Import CSV flight data"""

        positions = []
        errors = []

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                # Try to detect CSV format
                sample = file.read(1024)
                file.seek(0)

                # Common FlightRadar24 CSV headers
                if "Timestamp" in sample or "Time" in sample:
                    reader = csv.DictReader(file)

                    for row_num, row in enumerate(reader, 1):
                        try:
                            position = self._parse_csv_row(row)
                            if position:
                                position.aircraft_registration = aircraft_registration
                                positions.append(position)
                        except Exception as e:
                            errors.append(f"Error parsing row {row_num}: {e}")
                else:
                    errors.append("Unrecognized CSV format")

            flight = FlightRadar24Flight(
                flight_id=f"fr24_csv_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                aircraft_registration=aircraft_registration,
                aircraft_type=None,
                departure_airport=None,
                arrival_airport=None,
                departure_time=positions[0].timestamp if positions else None,
                arrival_time=positions[-1].timestamp if positions else None,
                positions=positions,
                raw_data={},
            )

            logger.info(f"Imported {len(positions)} positions from CSV file")
            return flight, errors

        except Exception as e:
            raise ValueError(f"Error reading CSV file: {e}")

    def _parse_csv_row(self, row: Dict[str, str]) -> Optional[FlightRadar24Position]:
        """Parse a single CSV row into position data"""
        try:
            # Common timestamp field names
            timestamp_fields = ["Timestamp", "Time", "DateTime", "UTC"]
            timestamp_str = None

            for field in timestamp_fields:
                if field in row and row[field]:
                    timestamp_str = row[field]
                    break

            if not timestamp_str:
                return None

            # Parse timestamp (handle various formats)
            try:
                if "T" in timestamp_str:
                    timestamp = datetime.fromisoformat(
                        timestamp_str.replace("Z", "+00:00")
                    )
                else:
                    timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
            except ValueError:
                # Try Unix timestamp
                timestamp = datetime.fromtimestamp(float(timestamp_str))

            # Parse coordinates
            lat_fields = ["Latitude", "Lat", "latitude"]
            lon_fields = ["Longitude", "Lon", "longitude", "Long"]
            alt_fields = ["Altitude", "Alt", "altitude"]
            speed_fields = ["Speed", "GroundSpeed", "ground_speed"]
            track_fields = ["Track", "Heading", "heading"]

            latitude = self._get_numeric_field(row, lat_fields)
            longitude = self._get_numeric_field(row, lon_fields)

            if latitude is None or longitude is None:
                return None

            altitude_feet = self._get_numeric_field(row, alt_fields)
            ground_speed = self._get_numeric_field(row, speed_fields)
            track = self._get_numeric_field(row, track_fields)

            return FlightRadar24Position(
                timestamp=timestamp,
                latitude=latitude,
                longitude=longitude,
                altitude_feet=int(altitude_feet) if altitude_feet else None,
                ground_speed_knots=ground_speed,
                track_degrees=track,
                callsign=row.get("Callsign") or row.get("callsign"),
            )

        except Exception as e:
            logger.error(f"Error parsing CSV row: {e}")
            return None

    def _get_numeric_field(
        self, row: Dict[str, str], field_names: List[str]
    ) -> Optional[float]:
        """Get numeric value from row using multiple possible field names"""
        for field_name in field_names:
            if field_name in row and row[field_name]:
                try:
                    return float(row[field_name])
                except ValueError:
                    continue
        return None

    async def _import_json_file(
        self, file_path: str, aircraft_registration: str
    ) -> Tuple[FlightRadar24Flight, List[str]]:
        """Import JSON flight data"""

        try:
            with open(file_path, "r", encoding="utf-8") as file:
                data = json.load(file)

            positions = []
            errors = []

            # Handle different JSON structures
            if isinstance(data, list):
                # Array of position objects
                for item in data:
                    position = self._parse_json_position(item, aircraft_registration)
                    if position:
                        positions.append(position)

            elif isinstance(data, dict):
                # Object with positions array
                if "positions" in data:
                    for item in data["positions"]:
                        position = self._parse_json_position(
                            item, aircraft_registration
                        )
                        if position:
                            positions.append(position)
                elif "trail" in data:
                    for item in data["trail"]:
                        position = self._parse_json_position(
                            item, aircraft_registration
                        )
                        if position:
                            positions.append(position)

            flight_info = data if isinstance(data, dict) else {}

            flight = FlightRadar24Flight(
                flight_id=f"fr24_json_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                aircraft_registration=aircraft_registration,
                aircraft_type=flight_info.get("aircraft_type"),
                departure_airport=flight_info.get("origin"),
                arrival_airport=flight_info.get("destination"),
                departure_time=positions[0].timestamp if positions else None,
                arrival_time=positions[-1].timestamp if positions else None,
                positions=positions,
                raw_data=flight_info,
            )

            logger.info(f"Imported {len(positions)} positions from JSON file")
            return flight, errors

        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON file: {e}")

    def _parse_json_position(
        self, item: Dict[str, Any], aircraft_registration: str
    ) -> Optional[FlightRadar24Position]:
        """Parse JSON position object"""
        try:
            # Handle timestamp
            timestamp_fields = ["timestamp", "time", "ts", "utc"]
            timestamp = None

            for field in timestamp_fields:
                if field in item:
                    ts_value = item[field]
                    if isinstance(ts_value, str):
                        timestamp = datetime.fromisoformat(
                            ts_value.replace("Z", "+00:00")
                        )
                    elif isinstance(ts_value, (int, float)):
                        timestamp = datetime.fromtimestamp(ts_value)
                    break

            if not timestamp:
                return None

            # Handle coordinates
            lat = item.get("lat") or item.get("latitude")
            lon = item.get("lon") or item.get("longitude") or item.get("lng")

            if lat is None or lon is None:
                return None

            alt = item.get("alt") or item.get("altitude")
            speed = item.get("speed") or item.get("gs") or item.get("ground_speed")
            track = item.get("track") or item.get("heading")

            return FlightRadar24Position(
                timestamp=timestamp,
                latitude=float(lat),
                longitude=float(lon),
                altitude_feet=int(alt) if alt is not None else None,
                ground_speed_knots=float(speed) if speed is not None else None,
                track_degrees=float(track) if track is not None else None,
                aircraft_registration=aircraft_registration,
                callsign=item.get("callsign"),
                aircraft_type=item.get("aircraft_type"),
            )

        except (ValueError, TypeError) as e:
            logger.error(f"Error parsing JSON position: {e}")
            return None

    def analyze_flight_patterns(self, flight: FlightRadar24Flight) -> Dict[str, Any]:
        """Analyze flight for surveillance patterns"""
        if not flight.positions:
            return {"analysis": "no_data"}

        analysis = {
            "total_positions": len(flight.positions),
            "duration_minutes": 0,
            "distance_km": 0,
            "avg_altitude": 0,
            "min_altitude": 0,
            "max_altitude": 0,
            "hovering_segments": [],
            "low_altitude_segments": [],
            "circling_patterns": [],
            "surveillance_likelihood": 0.0,
        }

        positions = flight.positions

        # Calculate duration
        if len(positions) > 1:
            duration = positions[-1].timestamp - positions[0].timestamp
            analysis["duration_minutes"] = duration.total_seconds() / 60

        # Altitude analysis
        altitudes = [p.altitude_feet for p in positions if p.altitude_feet is not None]
        if altitudes:
            analysis["avg_altitude"] = sum(altitudes) / len(altitudes)
            analysis["min_altitude"] = min(altitudes)
            analysis["max_altitude"] = max(altitudes)

        # Detect hovering (low speed for extended periods)
        hovering_segments = self._detect_hovering(positions)
        analysis["hovering_segments"] = hovering_segments

        # Detect low altitude flights
        low_alt_segments = self._detect_low_altitude(positions)
        analysis["low_altitude_segments"] = low_alt_segments

        # Calculate surveillance likelihood
        surveillance_score = 0.0

        # Low altitude increases surveillance likelihood
        if analysis["min_altitude"] < 400:
            surveillance_score += 0.3

        # Hovering increases surveillance likelihood
        if hovering_segments:
            surveillance_score += 0.4

        # Long duration increases surveillance likelihood
        if analysis["duration_minutes"] > 30:
            surveillance_score += 0.2

        # Phoenix PD aircraft
        if flight.aircraft_registration in self.phoenix_pd_aircraft:
            surveillance_score += 0.3

        analysis["surveillance_likelihood"] = min(surveillance_score, 1.0)

        return analysis

    def _detect_hovering(
        self, positions: List[FlightRadar24Position]
    ) -> List[Dict[str, Any]]:
        """Detect hovering segments in flight path"""
        hovering_segments = []

        if len(positions) < 3:
            return hovering_segments

        hover_threshold_knots = 20  # Below 20 knots considered hovering
        min_hover_duration = 30  # Minimum 30 seconds to be considered hovering

        current_hover = None

        for i in range(len(positions)):
            pos = positions[i]

            # Check if hovering (low speed)
            is_hovering = (
                pos.ground_speed_knots is not None
                and pos.ground_speed_knots < hover_threshold_knots
            )

            if is_hovering:
                if current_hover is None:
                    current_hover = {
                        "start_time": pos.timestamp,
                        "start_position": {"lat": pos.latitude, "lon": pos.longitude},
                        "positions": [pos],
                    }
                else:
                    current_hover["positions"].append(pos)
            else:
                if current_hover is not None:
                    # End current hover segment
                    duration = pos.timestamp - current_hover["start_time"]
                    if duration.total_seconds() >= min_hover_duration:
                        current_hover["end_time"] = positions[i - 1].timestamp
                        current_hover["duration_seconds"] = duration.total_seconds()
                        hovering_segments.append(current_hover)

                    current_hover = None

        return hovering_segments

    def _detect_low_altitude(
        self, positions: List[FlightRadar24Position]
    ) -> List[Dict[str, Any]]:
        """Detect low altitude segments"""
        low_alt_segments = []
        low_alt_threshold = 400  # 400 feet AGL

        current_segment = None

        for pos in positions:
            if pos.altitude_feet is not None and pos.altitude_feet < low_alt_threshold:
                if current_segment is None:
                    current_segment = {
                        "start_time": pos.timestamp,
                        "start_position": {"lat": pos.latitude, "lon": pos.longitude},
                        "min_altitude": pos.altitude_feet,
                        "positions": [],
                    }

                current_segment["positions"].append(pos)
                current_segment["min_altitude"] = min(
                    current_segment["min_altitude"], pos.altitude_feet
                )
            else:
                if current_segment is not None:
                    current_segment["end_time"] = current_segment["positions"][
                        -1
                    ].timestamp
                    current_segment["duration_seconds"] = (
                        current_segment["end_time"] - current_segment["start_time"]
                    ).total_seconds()

                    if current_segment["duration_seconds"] > 10:  # At least 10 seconds
                        low_alt_segments.append(current_segment)

                    current_segment = None

        return low_alt_segments

    def export_to_database_format(self, flight: FlightRadar24Flight) -> Dict[str, Any]:
        """Convert FlightRadar24Flight to database-compatible format"""
        return {
            "flight_log": {
                "flight_id": flight.flight_id,
                "departure_time": flight.departure_time,
                "arrival_time": flight.arrival_time,
                "departure_airport": flight.departure_airport,
                "arrival_airport": flight.arrival_airport,
                "flight_duration_minutes": (
                    (flight.arrival_time - flight.departure_time).total_seconds() / 60
                    if flight.departure_time and flight.arrival_time
                    else None
                ),
                "data_source": "flightradar24",
                "raw_data": flight.raw_data,
            },
            "positions": [
                {
                    "timestamp": pos.timestamp,
                    "latitude": pos.latitude,
                    "longitude": pos.longitude,
                    "altitude_feet": pos.altitude_feet,
                    "ground_speed_knots": pos.ground_speed_knots,
                    "track_degrees": pos.track_degrees,
                    "data_source": "flightradar24",
                }
                for pos in flight.positions
            ],
        }


# Global service instance
flightradar24_service = FlightRadar24Service()
