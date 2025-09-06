"""
File processing service for handling uploaded flight data files
"""
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
import json
import csv
import xml.etree.ElementTree as ET
from dataclasses import dataclass
import logging

from sqlalchemy.orm import Session
from app.crud.flights import flight_log_crud
from app.schemas.flights import FlightLogCreate
from app.models.aircraft import Aircraft
from app.models.flight_logs import FlightLog

logger = logging.getLogger(__name__)


@dataclass
class ProcessedFlight:
    """Represents a processed flight from imported data"""

    aircraft_registration: str
    start_time: datetime
    end_time: Optional[datetime]
    start_lat: float
    start_lon: float
    end_lat: Optional[float] = None
    end_lon: Optional[float] = None
    max_altitude_feet: Optional[int] = None
    flight_path: Optional[List[Dict[str, float]]] = None
    source: str = "import"
    raw_data: Optional[Dict[str, Any]] = None


class FileProcessor:
    """Handles processing of various flight data file formats"""

    def __init__(self, db: Session):
        self.db = db
        self.processed_count = 0
        self.error_count = 0
        self.errors = []

    def process_json_file(self, file_path: str) -> List[ProcessedFlight]:
        """Process JSON flight data file"""
        flights = []

        try:
            with open(file_path, "r") as f:
                data = json.load(f)

            # Handle different JSON structures
            if isinstance(data, list):
                # Array of flight objects
                for flight_data in data:
                    flight = self._parse_json_flight(flight_data)
                    if flight:
                        flights.append(flight)

            elif isinstance(data, dict):
                if "flights" in data:
                    # Nested flights array
                    for flight_data in data["flights"]:
                        flight = self._parse_json_flight(flight_data)
                        if flight:
                            flights.append(flight)
                elif "data" in data:
                    # Alternative nested structure
                    for flight_data in data["data"]:
                        flight = self._parse_json_flight(flight_data)
                        if flight:
                            flights.append(flight)
                else:
                    # Single flight object
                    flight = self._parse_json_flight(data)
                    if flight:
                        flights.append(flight)

        except Exception as e:
            logger.error(f"Error processing JSON file {file_path}: {str(e)}")
            self.errors.append(f"JSON parse error: {str(e)}")
            self.error_count += 1

        return flights

    def _parse_json_flight(self, data: Dict[str, Any]) -> Optional[ProcessedFlight]:
        """Parse a single flight from JSON data"""
        try:
            # Try to extract common field names
            registration = (
                data.get("registration")
                or data.get("aircraft_registration")
                or data.get("aircraft")
                or data.get("callsign", "")
            )

            if not registration:
                return None

            # Parse timestamps
            start_time = self._parse_timestamp(
                data.get("start_time")
                or data.get("departure_time")
                or data.get("timestamp")
            )

            end_time = self._parse_timestamp(
                data.get("end_time") or data.get("arrival_time")
            )

            # Parse coordinates
            start_lat = float(
                data.get("start_lat", 0)
                or data.get("departure_lat", 0)
                or data.get("lat", 0)
            )
            start_lon = float(
                data.get("start_lon", 0)
                or data.get("departure_lon", 0)
                or data.get("lon", 0)
            )
            end_lat = (
                float(data.get("end_lat", 0) or data.get("arrival_lat", 0))
                if "end_lat" in data or "arrival_lat" in data
                else None
            )
            end_lon = (
                float(data.get("end_lon", 0) or data.get("arrival_lon", 0))
                if "end_lon" in data or "arrival_lon" in data
                else None
            )

            # Parse altitude
            altitude = (
                data.get("altitude")
                or data.get("max_altitude")
                or data.get("altitude_feet")
            )
            if altitude:
                altitude = int(altitude)

            # Parse flight path if available
            flight_path = None
            if "path" in data or "track" in data or "positions" in data:
                path_data = (
                    data.get("path") or data.get("track") or data.get("positions", [])
                )
                flight_path = []
                for point in path_data:
                    if isinstance(point, dict):
                        flight_path.append(
                            {
                                "lat": float(point.get("lat", 0)),
                                "lon": float(
                                    point.get("lon", 0) or point.get("lng", 0)
                                ),
                                "alt": float(
                                    point.get("alt", 0) or point.get("altitude", 0)
                                ),
                                "time": point.get("time") or point.get("timestamp"),
                            }
                        )

            return ProcessedFlight(
                aircraft_registration=registration,
                start_time=start_time or datetime.now(timezone.utc),
                end_time=end_time,
                start_lat=start_lat,
                start_lon=start_lon,
                end_lat=end_lat,
                end_lon=end_lon,
                max_altitude_feet=altitude,
                flight_path=flight_path,
                source="json_import",
                raw_data=data,
            )

        except Exception as e:
            logger.warning(f"Failed to parse JSON flight: {str(e)}")
            return None

    def process_csv_file(self, file_path: str) -> List[ProcessedFlight]:
        """Process CSV flight data file"""
        flights = []

        try:
            with open(file_path, "r") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    flight = self._parse_csv_flight(row)
                    if flight:
                        flights.append(flight)

        except Exception as e:
            logger.error(f"Error processing CSV file {file_path}: {str(e)}")
            self.errors.append(f"CSV parse error: {str(e)}")
            self.error_count += 1

        return flights

    def _parse_csv_flight(self, row: Dict[str, str]) -> Optional[ProcessedFlight]:
        """Parse a single flight from CSV row"""
        try:
            # Map common CSV column names
            registration = (
                row.get("Registration")
                or row.get("Aircraft")
                or row.get("Callsign")
                or row.get("registration")
                or row.get("aircraft")
            )

            if not registration:
                return None

            # Parse timestamps
            start_time = self._parse_timestamp(
                row.get("Start Time") or row.get("Departure") or row.get("Date")
            )

            end_time = self._parse_timestamp(row.get("End Time") or row.get("Arrival"))

            # Parse coordinates
            start_lat = self._safe_float(
                row.get("Start Lat") or row.get("Departure Lat") or row.get("Lat")
            )
            start_lon = self._safe_float(
                row.get("Start Lon") or row.get("Departure Lon") or row.get("Lon")
            )
            end_lat = self._safe_float(row.get("End Lat") or row.get("Arrival Lat"))
            end_lon = self._safe_float(row.get("End Lon") or row.get("Arrival Lon"))

            # Parse altitude
            altitude = self._safe_int(row.get("Altitude") or row.get("Max Altitude"))

            return ProcessedFlight(
                aircraft_registration=registration,
                start_time=start_time or datetime.now(timezone.utc),
                end_time=end_time,
                start_lat=start_lat or 33.4484,  # Phoenix default
                start_lon=start_lon or -112.0740,  # Phoenix default
                end_lat=end_lat,
                end_lon=end_lon,
                max_altitude_feet=altitude,
                source="csv_import",
                raw_data=row,
            )

        except Exception as e:
            logger.warning(f"Failed to parse CSV flight: {str(e)}")
            return None

    def process_kml_file(self, file_path: str) -> List[ProcessedFlight]:
        """Process KML (Google Earth) flight data file - specifically FlightRadar24 format"""
        flights = []

        try:
            tree = ET.parse(file_path)
            root = tree.getroot()

            # Handle KML namespace
            ns = {"kml": "http://www.opengis.net/kml/2.2"}

            # Extract aircraft registration from document name
            document = root.find("kml:Document", ns)
            aircraft_registration = "Unknown"
            if document is not None:
                name_elem = document.find("kml:name", ns)
                if name_elem is not None and name_elem.text:
                    # FlightRadar24 format: "-/N623FB" -> extract "N623FB"
                    name_text = name_elem.text.strip()
                    if "/" in name_text:
                        aircraft_registration = name_text.split("/")[-1].strip()
                    else:
                        aircraft_registration = name_text

            # Find all Placemarks in the Route folder - these are individual position points
            placemarks = (
                root.findall('.//kml:Folder[kml:name="Route"]/kml:Placemark', ns)
                or root.findall('.//Folder[name="Route"]/Placemark')
                or root.findall(".//kml:Placemark", ns)
                or root.findall(".//Placemark")
            )

            if not placemarks:
                logger.warning(f"No placemarks found in KML file {file_path}")
                return flights

            # Group all placemarks into individual position records for a single flight
            positions = []
            start_time = None
            end_time = None
            max_altitude = 0

            for placemark in placemarks:
                position_data = self._parse_kml_position(placemark, ns)
                if position_data:
                    positions.append(position_data)

                    # Track flight time bounds
                    if position_data["timestamp"]:
                        if not start_time or position_data["timestamp"] < start_time:
                            start_time = position_data["timestamp"]
                        if not end_time or position_data["timestamp"] > end_time:
                            end_time = position_data["timestamp"]

                    # Track max altitude
                    if position_data.get("altitude", 0) > max_altitude:
                        max_altitude = position_data["altitude"]

            if positions:
                # Create individual ProcessedFlight records for each position
                # This matches how CSV import works - each position becomes a flight record
                for position in positions:
                    flight = ProcessedFlight(
                        aircraft_registration=aircraft_registration,
                        start_time=position["timestamp"] or datetime.now(timezone.utc),
                        end_time=None,  # Individual position points don't have end times
                        start_lat=position["latitude"],
                        start_lon=position["longitude"],
                        max_altitude_feet=position["altitude"],
                        source="kml_import",
                        raw_data=position["raw_data"],
                    )
                    flights.append(flight)

                logger.info(
                    f"Processed KML file {file_path}: {len(positions)} positions for aircraft {aircraft_registration}"
                )
            else:
                logger.warning(f"No valid positions found in KML file {file_path}")

        except Exception as e:
            logger.error(f"Error processing KML file {file_path}: {str(e)}")
            self.errors.append(f"KML parse error: {str(e)}")
            self.error_count += 1

        return flights

    def _parse_kml_position(
        self, placemark, ns: Dict[str, str]
    ) -> Optional[Dict[str, Any]]:
        """Parse a single position from KML Placemark (FlightRadar24 format)"""
        try:
            # Extract timestamp from name (FlightRadar24 format: "2025-08-13 06:30:07 UTC")
            name_elem = placemark.find("kml:name", ns)
            timestamp = None
            if name_elem is not None and name_elem.text:
                timestamp = self._parse_timestamp(name_elem.text)

            # Also try TimeStamp element
            time_elem = placemark.find("kml:TimeStamp/kml:when", ns)
            if time_elem is not None and time_elem.text:
                timestamp = self._parse_timestamp(time_elem.text.replace("+00:00", "Z"))

            # Extract coordinates from Point
            point_elem = placemark.find("kml:Point/kml:coordinates", ns)

            if point_elem is not None and point_elem.text:
                coords = self._parse_kml_coordinates(point_elem.text)
                if coords and len(coords) > 0:
                    coord = coords[0]

                    # Extract additional data from description
                    desc_elem = placemark.find("kml:description", ns)
                    altitude = coord.get("alt", 0)
                    speed = 0
                    heading = 0

                    if desc_elem is not None and desc_elem.text:
                        # Parse FlightRadar24 description format
                        description = desc_elem.text
                        import re

                        # Extract altitude
                        alt_match = re.search(
                            r"<b>Altitude:</b></span> <span>(\d+) ft</span>",
                            description,
                        )
                        if alt_match:
                            altitude = int(alt_match.group(1))

                        # Extract speed
                        speed_match = re.search(
                            r"<b>Speed:</b></span> <span>(\d+) kt</span>", description
                        )
                        if speed_match:
                            speed = int(speed_match.group(1))

                        # Extract heading
                        heading_match = re.search(
                            r"<b>Heading:</b></span> <span>(\d+)&deg;</span>",
                            description,
                        )
                        if heading_match:
                            heading = int(heading_match.group(1))

                    return {
                        "timestamp": timestamp,
                        "latitude": coord["lat"],
                        "longitude": coord["lon"],
                        "altitude": altitude,
                        "speed": speed,
                        "heading": heading,
                        "raw_data": {
                            "name": name_elem.text if name_elem is not None else None,
                            "description": desc_elem.text
                            if desc_elem is not None
                            else None,
                            "coordinates": point_elem.text,
                            "timestamp": timestamp.isoformat() if timestamp else None,
                            "altitude": altitude,
                            "speed": speed,
                            "heading": heading,
                        },
                    }

        except Exception as e:
            logger.warning(f"Failed to parse KML position: {str(e)}")

        return None

    def _parse_kml_placemark(
        self, placemark, ns: Dict[str, str]
    ) -> Optional[ProcessedFlight]:
        """Parse a single flight from KML Placemark"""
        try:
            # Extract name (often contains aircraft registration)
            name_elem = placemark.find(".//kml:name", ns) or placemark.find(".//name")
            name = name_elem.text if name_elem is not None else "Unknown"

            # Extract description (may contain additional flight info)
            desc_elem = placemark.find(".//kml:description", ns) or placemark.find(
                ".//description"
            )
            description = desc_elem.text if desc_elem is not None else ""

            # Extract coordinates (LineString for flight path)
            coords_elem = placemark.find(
                ".//kml:LineString/kml:coordinates", ns
            ) or placemark.find(".//LineString/coordinates")

            if coords_elem is not None and coords_elem.text:
                coordinates = self._parse_kml_coordinates(coords_elem.text)
                if coordinates:
                    return ProcessedFlight(
                        aircraft_registration=name or "Unknown",
                        start_time=datetime.now(
                            timezone.utc
                        ),  # KML often doesn't have timestamps
                        end_time=None,
                        start_lat=coordinates[0]["lat"],
                        start_lon=coordinates[0]["lon"],
                        end_lat=coordinates[-1]["lat"]
                        if len(coordinates) > 1
                        else None,
                        end_lon=coordinates[-1]["lon"]
                        if len(coordinates) > 1
                        else None,
                        max_altitude_feet=max(c.get("alt", 0) for c in coordinates)
                        if coordinates
                        else None,
                        flight_path=coordinates,
                        source="kml_import",
                        raw_data={"name": name, "description": description},
                    )

            # Try Point geometry for single location
            point_elem = placemark.find(
                ".//kml:Point/kml:coordinates", ns
            ) or placemark.find(".//Point/coordinates")

            if point_elem is not None and point_elem.text:
                coords = self._parse_kml_coordinates(point_elem.text)
                if coords:
                    return ProcessedFlight(
                        aircraft_registration=name or "Unknown",
                        start_time=datetime.now(timezone.utc),
                        end_time=None,
                        start_lat=coords[0]["lat"],
                        start_lon=coords[0]["lon"],
                        source="kml_import",
                        raw_data={"name": name, "description": description},
                    )

        except Exception as e:
            logger.warning(f"Failed to parse KML placemark: {str(e)}")

        return None

    def _parse_kml_coordinates(self, coord_string: str) -> List[Dict[str, float]]:
        """Parse KML coordinate string (lon,lat,alt format)"""
        coordinates = []

        try:
            for coord in coord_string.strip().split():
                parts = coord.split(",")
                if len(parts) >= 2:
                    coordinates.append(
                        {
                            "lon": float(parts[0]),
                            "lat": float(parts[1]),
                            "alt": float(parts[2]) * 3.28084
                            if len(parts) > 2
                            else 0,  # Convert meters to feet
                        }
                    )
        except Exception as e:
            logger.warning(f"Failed to parse KML coordinates: {str(e)}")

        return coordinates

    def _parse_timestamp(self, value: Any) -> Optional[datetime]:
        """Parse various timestamp formats"""
        if not value:
            return None

        if isinstance(value, datetime):
            return value

        if isinstance(value, (int, float)):
            # Unix timestamp
            return datetime.fromtimestamp(value)

        if isinstance(value, str):
            # Try common date formats
            formats = [
                "%Y-%m-%d %H:%M:%S UTC",  # FlightRadar24 format
                "%Y-%m-%d %H:%M:%S",
                "%Y-%m-%dT%H:%M:%S",
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S.%fZ",
                "%Y-%m-%dT%H:%M:%S+00:00",  # ISO format with timezone
                "%m/%d/%Y %H:%M:%S",
                "%d/%m/%Y %H:%M:%S",
                "%Y-%m-%d",
                "%m/%d/%Y",
                "%d/%m/%Y",
            ]

            for fmt in formats:
                try:
                    return datetime.strptime(value, fmt)
                except ValueError:
                    continue

        return None

    def _safe_float(self, value: Any) -> Optional[float]:
        """Safely convert value to float"""
        try:
            if value:
                return float(value)
        except (ValueError, TypeError):
            pass
        return None

    def _safe_int(self, value: Any) -> Optional[int]:
        """Safely convert value to int"""
        try:
            if value:
                return int(float(value))
        except (ValueError, TypeError):
            pass
        return None

    def save_flights_to_database(self, flights: List[ProcessedFlight]) -> int:
        """Save processed flights to database"""
        saved_count = 0

        for flight in flights:
            try:
                # Find or create aircraft
                aircraft = (
                    self.db.query(Aircraft)
                    .filter(Aircraft.registration == flight.aircraft_registration)
                    .first()
                )

                if not aircraft:
                    # Create new aircraft record
                    aircraft = Aircraft(
                        registration=flight.aircraft_registration,
                        make="Unknown",
                        model="Helicopter",
                        is_phoenix_pd=True,  # Assumption for now
                    )
                    self.db.add(aircraft)
                    self.db.flush()

                # Create flight log entry
                flight_log = FlightLog(
                    aircraft_id=aircraft.id,
                    departure_time=flight.start_time,
                    arrival_time=flight.end_time,
                    max_altitude_feet=flight.max_altitude_feet,
                    data_source=flight.source,
                    raw_data=json.dumps(flight.raw_data) if flight.raw_data else None,
                )

                self.db.add(flight_log)
                saved_count += 1

            except Exception as e:
                logger.error(f"Error saving flight to database: {str(e)}")
                self.errors.append(f"Database save error: {str(e)}")
                self.error_count += 1

        self.db.commit()
        self.processed_count = saved_count

        return saved_count


def process_imported_files_sync(
    db: Session,
    file_paths: List[str],
    import_id: str,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Synchronous function to process imported files for use in Celery tasks

    Args:
        db: Database session
        file_paths: List of file paths to process
        import_id: Import batch ID
        filters: Optional filters for data processing

    Returns:
        Processing result summary
    """
    processor = FileProcessor(db)
    all_flights = []

    for file_path in file_paths:
        path = Path(file_path)

        if not path.exists():
            processor.errors.append(f"File not found: {file_path}")
            processor.error_count += 1
            continue

        try:
            # Process based on file extension
            if path.suffix.lower() == ".json":
                flights = processor.process_json_file(file_path)
                all_flights.extend(flights)

            elif path.suffix.lower() == ".csv":
                flights = processor.process_csv_file(file_path)
                all_flights.extend(flights)

            elif path.suffix.lower() == ".kml":
                flights = processor.process_kml_file(file_path)
                all_flights.extend(flights)

            else:
                processor.errors.append(f"Unsupported file type: {path.suffix}")
                processor.error_count += 1

        except Exception as e:
            logger.error(f"Error processing file {file_path}: {str(e)}")
            processor.errors.append(f"Processing error for {path.name}: {str(e)}")
            processor.error_count += 1

    # Apply filters if provided
    if filters:
        filtered_flights = []

        for flight in all_flights:
            # Filter by aircraft registration
            if filters.get("aircraft_registrations"):
                if (
                    flight.aircraft_registration
                    not in filters["aircraft_registrations"]
                ):
                    continue

            # Filter by date range
            if filters.get("start_date"):
                start_date = datetime.fromisoformat(filters["start_date"])
                if flight.start_time < start_date:
                    continue

            if filters.get("end_date"):
                end_date = datetime.fromisoformat(filters["end_date"])
                if flight.start_time > end_date:
                    continue

            filtered_flights.append(flight)

        all_flights = filtered_flights

    # Save to database
    saved_count = processor.save_flights_to_database(all_flights)

    # Return processing summary
    return {
        "import_id": import_id,
        "total_files": len(file_paths),
        "total_flights_found": len(all_flights),
        "flights_saved": saved_count,
        "errors": processor.errors,
        "error_count": processor.error_count,
        "status": "completed"
        if processor.error_count == 0
        else "completed_with_errors",
    }
