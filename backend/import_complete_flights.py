#!/usr/bin/env python3
"""
Import complete flight tracks from FR24 API
This script fetches full flight paths with all position data points for legal analysis
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
from datetime import datetime, timezone, timedelta
import json
import logging
import time
from typing import List, Dict, Optional, Any
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

FR24_API_KEY = os.getenv("FR24_API_KEY_PRODUCTION")
BASE_URL = "https://fr24api.flightradar24.com/api"

PHOENIX_BOUNDS = {
    "lat_min": 33.2,
    "lat_max": 33.8, 
    "lon_min": -112.4,
    "lon_max": -111.8
}

PHOENIX_PD_REGISTRATIONS = [
    "N621FB", "N622FB", "N623FB", "N624FB", "N625FB",
    "N626FB", "N627FB", "N628FB", "N629FB", "N630FB"
]

HEADERS = {
    "Authorization": f"Bearer {FR24_API_KEY}",
    "Accept": "application/json",
    "Accept-Version": "v1",
}

class FR24FlightImporter:
    def __init__(self, db: Session):
        self.db = db
        self.imported_count = 0
        self.api_calls = 0
        self.rate_limit_delay = 0.5  # 500ms between API calls
        
    def search_flights_by_registration(self, registration: str, days_back: int = 7) -> List[Dict]:
        """Search for recent flights by aircraft registration"""
        endpoint = f"{BASE_URL}/flights"
        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=days_back)
        
        params = {
            "registration": registration,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d"),
            "limit": 100
        }
        
        logger.info(f"Searching flights for {registration} from {params['from']} to {params['to']}")
        
        try:
            self.api_calls += 1
            time.sleep(self.rate_limit_delay)
            response = requests.get(endpoint, params=params, headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                flights = data.get('data', []) if isinstance(data, dict) else data
                logger.info(f"Found {len(flights)} flights for {registration}")
                return flights
            else:
                logger.error(f"Search failed for {registration}: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error searching flights for {registration}: {e}")
            return []
    
    def search_flights_in_area(self, hours_back: int = 24) -> List[Dict]:
        """Search for all flights in Phoenix area within time window"""
        endpoint = f"{BASE_URL}/historic/flight-positions/full"
        timestamp = datetime.now(timezone.utc) - timedelta(hours=hours_back)
        
        params = {
            "timestamp": int(timestamp.timestamp()),
            "bounds": f"{PHOENIX_BOUNDS['lat_max']},{PHOENIX_BOUNDS['lat_min']},{PHOENIX_BOUNDS['lon_min']},{PHOENIX_BOUNDS['lon_max']}",
        }
        
        logger.info(f"Searching area flights at {timestamp.isoformat()}")
        
        try:
            self.api_calls += 1
            time.sleep(self.rate_limit_delay)
            response = requests.get(endpoint, params=params, headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                flights = data.get('data', []) if isinstance(data, dict) else data
                logger.info(f"Found {len(flights)} flights in Phoenix area")
                return flights
            else:
                logger.error(f"Area search failed: {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Error searching area flights: {e}")
            return []
    
    def get_complete_flight_track(self, fr24_id: str) -> Optional[Dict]:
        """Fetch complete flight track with all position points"""
        endpoint = f"{BASE_URL}/flight-tracks"
        params = {"flight_id": fr24_id}
        
        logger.debug(f"Fetching complete track for flight {fr24_id}")
        
        try:
            self.api_calls += 1
            time.sleep(self.rate_limit_delay)
            response = requests.get(endpoint, params=params, headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                
                # Handle different response formats
                if isinstance(data, list):
                    # Direct list of track points
                    tracks = data
                elif isinstance(data, dict):
                    # Look for tracks in various keys
                    tracks = data.get('tracks') or data.get('data') or data.get('positions') or []
                else:
                    tracks = []
                
                if tracks:
                    logger.info(f"Got {len(tracks)} position points for flight {fr24_id}")
                    return {
                        'fr24_id': fr24_id,
                        'tracks': tracks,
                        'metadata': data if isinstance(data, dict) else {}
                    }
                return None
            else:
                logger.error(f"Failed to get tracks for {fr24_id}: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"Error fetching tracks for {fr24_id}: {e}")
            return None
    
    def find_or_create_aircraft(self, aircraft_data: Dict) -> Aircraft:
        """Find existing aircraft or create new one"""
        registration = aircraft_data.get('registration', '')
        hex_code = aircraft_data.get('hex', '')
        
        # Try to find by registration or hex code
        aircraft = None
        if registration:
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.registration == registration
            ).first()
        
        if not aircraft and hex_code:
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.icao_code == hex_code
            ).first()
        
        if not aircraft:
            # Create new aircraft
            is_phoenix_pd = registration in PHOENIX_PD_REGISTRATIONS
            
            aircraft = Aircraft(
                registration=registration or f"UNKNOWN_{hex_code}",
                icao_code=hex_code,
                model=aircraft_data.get('model', 'Unknown'),
                make=aircraft_data.get('make', 'Unknown'),
                operator=aircraft_data.get('operator', 'Unknown'),
                is_phoenix_pd=is_phoenix_pd,
                is_active=True,
                notes=f"Auto-imported from FR24 on {datetime.now().isoformat()}"
            )
            self.db.add(aircraft)
            self.db.flush()
            logger.info(f"Created aircraft: {aircraft.registration} (Phoenix PD: {is_phoenix_pd})")
        
        return aircraft
    
    def import_flight_with_tracks(self, flight_data: Dict, track_data: Optional[Dict] = None) -> bool:
        """Import a complete flight with all position data"""
        try:
            # Extract flight identifiers
            fr24_id = flight_data.get('fr24_id') or flight_data.get('flight_id')
            if not fr24_id:
                logger.warning("No flight ID found, skipping")
                return False
            
            # Check if already imported
            existing = self.db.query(FlightLog).filter(
                FlightLog.flight_id == f"fr24_{fr24_id}"
            ).first()
            
            if existing:
                logger.debug(f"Flight {fr24_id} already imported")
                return False
            
            # Get or fetch complete track data
            if not track_data:
                track_data = self.get_complete_flight_track(fr24_id)
                if not track_data:
                    logger.warning(f"Could not get track data for {fr24_id}")
                    return False
            
            tracks = track_data.get('tracks', [])
            if not tracks:
                logger.warning(f"No track points for flight {fr24_id}")
                return False
            
            # Find or create aircraft
            aircraft = self.find_or_create_aircraft({
                'registration': flight_data.get('registration'),
                'hex': flight_data.get('hex'),
                'model': flight_data.get('model'),
                'operator': flight_data.get('operator')
            })
            
            # Parse timestamps
            first_point = tracks[0]
            last_point = tracks[-1]
            
            departure_time = self.parse_timestamp(first_point.get('timestamp'))
            arrival_time = self.parse_timestamp(last_point.get('timestamp'))
            duration_minutes = (arrival_time - departure_time).total_seconds() / 60
            
            # Calculate altitude statistics
            altitudes = [p.get('altitude', 0) for p in tracks if p.get('altitude')]
            max_alt = max(altitudes) if altitudes else None
            min_alt = min(altitudes) if altitudes else None
            avg_alt = sum(altitudes) / len(altitudes) if altitudes else None
            
            # Analyze for surveillance patterns
            surveillance_score, privacy_score, pattern_notes = self.analyze_surveillance_patterns(tracks)
            
            # Create flight log
            flight_log = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=f"fr24_{fr24_id}",
                callsign=flight_data.get('callsign'),
                departure_time=departure_time,
                arrival_time=arrival_time,
                flight_duration_minutes=duration_minutes,
                departure_airport=flight_data.get('origin', 'KDVT'),
                arrival_airport=flight_data.get('destination', 'KDVT'),
                max_altitude_feet=max_alt,
                min_altitude_feet=min_alt,
                avg_altitude_feet=avg_alt,
                estimated_cost=duration_minutes * 36,  # $2160/hr = $36/min
                data_source='flightradar24_complete',
                raw_data={
                    'fr24_id': fr24_id,
                    'track_count': len(tracks),
                    'metadata': track_data.get('metadata', {})
                },
                surveillance_likelihood=surveillance_score,
                privacy_concern_level=privacy_score,
                pattern_notes=pattern_notes
            )
            self.db.add(flight_log)
            self.db.flush()
            
            # Import all position points
            position_count = 0
            prev_point = None
            
            for point in tracks:
                timestamp = self.parse_timestamp(point.get('timestamp'))
                lat = point.get('latitude') or point.get('lat')
                lon = point.get('longitude') or point.get('lon')
                
                if not (lat and lon):
                    continue
                
                # Detect hovering/circling
                is_hovering = False
                hover_duration = 0
                is_circling = False
                
                if prev_point:
                    # Simple hover detection: moved less than 0.001 degrees (~100m)
                    prev_lat = prev_point.get('latitude', prev_point.get('lat'))
                    prev_lon = prev_point.get('longitude', prev_point.get('lon'))
                    if abs(lat - prev_lat) < 0.001 and abs(lon - prev_lon) < 0.001:
                        is_hovering = True
                        prev_time = self.parse_timestamp(prev_point.get('timestamp'))
                        hover_duration = (timestamp - prev_time).total_seconds()
                
                # Determine privacy concerns
                altitude = point.get('altitude', point.get('alt'))
                altitude_privacy = altitude and altitude < 1000  # Below 1000ft
                
                position = FlightPosition(
                    flight_log_id=flight_log.id,
                    aircraft_id=aircraft.id,
                    timestamp=timestamp,
                    latitude=lat,
                    longitude=lon,
                    altitude_feet=altitude,
                    ground_speed_knots=point.get('ground_speed', point.get('gspeed')),
                    track_degrees=point.get('track', point.get('heading')),
                    vertical_rate=point.get('vertical_rate', point.get('vspeed')),
                    is_hovering=is_hovering,
                    hover_duration_seconds=int(hover_duration) if hover_duration else None,
                    is_circling=is_circling,
                    altitude_privacy_concern=altitude_privacy,
                    data_source='flightradar24'
                )
                self.db.add(position)
                position_count += 1
                prev_point = point
            
            self.db.commit()
            self.imported_count += 1
            
            logger.info(f"✓ Imported flight {fr24_id} ({aircraft.registration}) with {position_count} positions")
            logger.info(f"  Duration: {duration_minutes:.1f} min, Cost: ${duration_minutes * 36:.0f}, "
                       f"Surveillance score: {surveillance_score:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to import flight: {e}")
            self.db.rollback()
            return False
    
    def analyze_surveillance_patterns(self, tracks: List[Dict]) -> tuple:
        """Analyze flight pattern for surveillance characteristics"""
        if not tracks:
            return 0.0, 1, "No track data"
        
        surveillance_score = 0.0
        privacy_score = 1
        notes = []
        
        # Check for hovering
        hover_count = 0
        low_alt_count = 0
        circle_patterns = 0
        
        for i, point in enumerate(tracks):
            alt = point.get('altitude', point.get('alt', 0))
            
            # Low altitude operations
            if alt and alt < 1000:
                low_alt_count += 1
                
            # Simple hover detection
            if i > 0:
                prev = tracks[i-1]
                lat_diff = abs(point.get('latitude', point.get('lat', 0)) - 
                             prev.get('latitude', prev.get('lat', 0)))
                lon_diff = abs(point.get('longitude', point.get('lon', 0)) - 
                             prev.get('longitude', prev.get('lon', 0)))
                
                if lat_diff < 0.0005 and lon_diff < 0.0005:  # ~50m movement
                    hover_count += 1
        
        # Calculate scores
        hover_ratio = hover_count / len(tracks)
        low_alt_ratio = low_alt_count / len(tracks)
        
        if hover_ratio > 0.2:  # More than 20% hovering
            surveillance_score += 0.4
            notes.append(f"Significant hovering ({hover_ratio:.0%} of flight)")
            privacy_score = max(privacy_score, 3)
        
        if low_alt_ratio > 0.3:  # More than 30% at low altitude
            surveillance_score += 0.3
            notes.append(f"Extended low altitude ops ({low_alt_ratio:.0%} below 1000ft)")
            privacy_score = max(privacy_score, 4)
        
        # Duration factor
        duration = len(tracks) * 30 / 60  # Assume 30sec intervals, convert to minutes
        if duration > 60:  # Flights over 1 hour
            surveillance_score += 0.2
            notes.append(f"Extended duration ({duration:.0f} minutes)")
        
        # Time of day factor (if available)
        first_timestamp = tracks[0].get('timestamp', '')
        if first_timestamp:
            try:
                dt = self.parse_timestamp(first_timestamp)
                hour = dt.hour
                if 22 <= hour or hour <= 6:  # Night operations
                    surveillance_score += 0.1
                    notes.append("Night operation")
                    privacy_score = min(5, privacy_score + 1)
            except:
                pass
        
        surveillance_score = min(1.0, surveillance_score)
        
        return surveillance_score, privacy_score, "; ".join(notes) if notes else "Normal flight pattern"
    
    def parse_timestamp(self, timestamp_str: str) -> datetime:
        """Parse various timestamp formats from FR24"""
        if not timestamp_str:
            return datetime.now(timezone.utc)
        
        # Handle Unix timestamp
        if isinstance(timestamp_str, (int, float)):
            return datetime.fromtimestamp(timestamp_str, tz=timezone.utc)
        
        # Handle ISO format
        timestamp_str = str(timestamp_str)
        if 'Z' in timestamp_str:
            timestamp_str = timestamp_str.replace('Z', '+00:00')
        
        try:
            return datetime.fromisoformat(timestamp_str)
        except:
            try:
                return datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S")
            except:
                logger.warning(f"Could not parse timestamp: {timestamp_str}")
                return datetime.now(timezone.utc)
    
    def import_phoenix_pd_helicopters(self, days_back: int = 30):
        """Import all Phoenix PD helicopter flights"""
        logger.info(f"\n{'='*60}")
        logger.info("IMPORTING PHOENIX PD HELICOPTER FLIGHTS")
        logger.info(f"{'='*60}")
        
        for registration in PHOENIX_PD_REGISTRATIONS:
            flights = self.search_flights_by_registration(registration, days_back)
            
            for flight in flights:
                self.import_flight_with_tracks(flight)
            
            if self.api_calls > 50:  # Rate limit protection
                logger.info("Pausing for rate limit...")
                time.sleep(5)
    
    def import_area_flights(self, hours_back: int = 24):
        """Import all flights in Phoenix area"""
        logger.info(f"\n{'='*60}")
        logger.info("IMPORTING PHOENIX AREA FLIGHTS")  
        logger.info(f"{'='*60}")
        
        # Get flights at different time intervals
        for hours in [1, 6, 12, 24]:
            if hours > hours_back:
                break
                
            flights = self.search_flights_in_area(hours)
            
            # Filter for helicopters and low-flying aircraft
            for flight in flights:
                # Import if it's a helicopter or flying below 5000ft
                alt = flight.get('altitude', 0)
                model = flight.get('model', '').lower()
                
                if 'heli' in model or alt < 5000:
                    self.import_flight_with_tracks(flight)
            
            if self.api_calls > 100:  # Rate limit protection
                logger.info("Pausing for rate limit...")
                time.sleep(10)
    
    def generate_import_report(self):
        """Generate summary report of import"""
        logger.info(f"\n{'='*60}")
        logger.info("IMPORT COMPLETE")
        logger.info(f"{'='*60}")
        logger.info(f"Flights imported: {self.imported_count}")
        logger.info(f"API calls made: {self.api_calls}")
        
        # Get statistics from database
        total_flights = self.db.query(FlightLog).count()
        total_positions = self.db.query(FlightPosition).count()
        phoenix_pd_flights = self.db.query(FlightLog).join(Aircraft).filter(
            Aircraft.is_phoenix_pd == True
        ).count()
        
        high_surveillance = self.db.query(FlightLog).filter(
            FlightLog.surveillance_likelihood > 0.7
        ).count()
        
        logger.info(f"\nDatabase Statistics:")
        logger.info(f"  Total flights: {total_flights}")
        logger.info(f"  Total positions: {total_positions}")
        logger.info(f"  Phoenix PD flights: {phoenix_pd_flights}")
        logger.info(f"  High surveillance likelihood: {high_surveillance}")


def main():
    """Main import function"""
    if not FR24_API_KEY:
        logger.error("FR24_API_KEY_PRODUCTION not set!")
        return
    
    logger.info(f"Starting import with API key: {FR24_API_KEY[:20]}...")
    
    db = SessionLocal()
    try:
        importer = FR24FlightImporter(db)
        
        # Import Phoenix PD helicopters (priority)
        importer.import_phoenix_pd_helicopters(days_back=30)
        
        # Import recent area flights
        importer.import_area_flights(hours_back=48)
        
        # Generate report
        importer.generate_import_report()
        
    except Exception as e:
        logger.error(f"Import failed: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()