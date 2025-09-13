"""
Flight tracking service for complete flight path collection
Monitors active flights and downloads complete tracks after landing
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Optional, Set, Tuple
from collections import defaultdict
from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft

logger = logging.getLogger(__name__)

PHOENIX_BOUNDS = {
    "lat_min": 33.2,
    "lat_max": 33.8,
    "lon_min": -112.4,
    "lon_max": -111.8
}

PHOENIX_PD_REGISTRATIONS = {
    "N621FB", "N622FB", "N623FB", "N624FB", "N625FB",
    "N626FB", "N627FB", "N628FB", "N629FB", "N630FB"
}


class CompleteFlightTracker:
    """
    Tracks active flights and downloads complete flight paths after landing
    This approach captures 100% of available positions for legal evidence
    """
    
    def __init__(self, db: Session = None):
        self.db = db or SessionLocal()
        self.active_flights: Dict[str, Dict] = {}  # Currently airborne flights
        self.completed_flights: Set[str] = set()  # Flights that have landed
        self.last_check = datetime.now(timezone.utc)
        
    def get_active_flights(self) -> List[Dict]:
        """Get currently active Phoenix PD helicopters ONLY"""
        from app.services.fr24_official_api import fr24_official_api
        
        try:
            # Use the working FR24 official API that properly identifies Phoenix PD aircraft
            helicopters = fr24_official_api.get_phoenix_pd_live()
            
            # Convert to flight dict format
            flights = []
            for heli in helicopters:
                flight = {
                    'flight_id': heli.raw_data.get('fr24_id', ''),
                    'registration': heli.aircraft_registration,
                    'callsign': heli.callsign,
                    'latitude': heli.latitude,
                    'longitude': heli.longitude,
                    'altitude': heli.altitude_feet,
                    'speed': heli.ground_speed_knots,
                    'track': heli.track_degrees,
                    'timestamp': heli.timestamp.isoformat()
                }
                flights.append(flight)
                logger.info(f"Phoenix PD helicopter active: {heli.aircraft_registration} at {heli.latitude},{heli.longitude}")
            
            return flights
            
        except Exception as e:
            logger.error(f"Error fetching Phoenix PD helicopters: {e}")
            return []
    
    def get_complete_flight_track(self, flight_id: str) -> Optional[Dict]:
        """
        Download complete flight track with all available positions
        This returns positions every 5-15 seconds for the entire flight
        """
        from app.services.flightradar24_api_service import fr24_api_service
        import asyncio
        
        try:
            # Use the FR24 API service to get complete flight tracks
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def get_track():
                async with fr24_api_service:
                    # Get flight track data
                    positions = await fr24_api_service.get_flight_track(flight_id)
                    return positions
            
            positions = loop.run_until_complete(get_track())
            loop.close()
            
            if positions:
                # Convert FR24Position objects to dict format
                tracks = []
                for pos in positions:
                    tracks.append({
                        'latitude': pos.latitude,
                        'longitude': pos.longitude,
                        'altitude': pos.altitude_feet,
                        'speed': pos.ground_speed_knots,
                        'track': pos.track_degrees,
                        'timestamp': pos.timestamp.isoformat()
                    })
                
                logger.info(f"Downloaded complete track for {flight_id}: {len(tracks)} positions")
                return {
                    'flight_id': flight_id,
                    'tracks': tracks,
                    'metadata': {
                        'registration': positions[0].registration if positions else None,
                        'callsign': positions[0].callsign if positions else None,
                        'aircraft_type': positions[0].aircraft_type if positions else None
                    }
                }
            return None
            
        except Exception as e:
            logger.error(f"Error downloading flight track {flight_id}: {e}")
            return None
    
    def detect_flight_changes(self) -> Tuple[List[str], List[str]]:
        """
        Detect new takeoffs and landings for Phoenix PD helicopters ONLY
        Returns: (new_flights, landed_flights)
        """
        current_flights = self.get_active_flights()
        current_ids = set()
        new_flights = []
        
        # Process current active flights - PHOENIX PD ONLY
        for flight in current_flights:
            flight_id = flight.get('flight_id') or flight.get('fr24_id')
            if not flight_id:
                continue
            
            registration = flight.get('registration', '')
            callsign = flight.get('callsign', '')
            
            # ONLY track Phoenix PD helicopters - skip everything else
            is_phoenix_pd = (
                registration in PHOENIX_PD_REGISTRATIONS or
                callsign in PHOENIX_PD_REGISTRATIONS
            )
            
            if not is_phoenix_pd:
                continue  # Skip ALL non-Phoenix PD aircraft
                
            current_ids.add(flight_id)
            
            # Check if this is a new Phoenix PD flight
            if flight_id not in self.active_flights:
                
                self.active_flights[flight_id] = {
                    'first_seen': datetime.now(timezone.utc),
                    'last_seen': datetime.now(timezone.utc),
                    'registration': registration,
                    'callsign': callsign,
                    'hex': flight.get('hex'),
                    'is_phoenix_pd': is_phoenix_pd,
                    'last_position': {
                        'lat': flight.get('latitude'),
                        'lon': flight.get('longitude'),
                        'alt': flight.get('altitude')
                    },
                    'flight_log_id': None  # Will be set when we create the flight log
                }
                
                new_flights.append(flight_id)
                logger.info(f"Phoenix PD helicopter detected: {flight_id} ({registration or callsign})")
            else:
                # Update last seen time and check for landing
                self.active_flights[flight_id]['last_seen'] = datetime.now(timezone.utc)
                prev_alt = self.active_flights[flight_id]['last_position'].get('alt', 0)
                current_alt = flight.get('altitude', 0)
                
                self.active_flights[flight_id]['last_position'] = {
                    'lat': flight.get('latitude'),
                    'lon': flight.get('longitude'),
                    'alt': current_alt
                }
                
                # Detect landing: altitude drops to near zero (below 100 feet)
                if prev_alt > 500 and current_alt < 100 and current_alt >= 0:
                    logger.info(f"Detected landing by altitude: {flight_id} dropped from {prev_alt}ft to {current_alt}ft")
                    # Mark for landing processing but keep tracking until it disappears
                    self.active_flights[flight_id]['landing_detected'] = True
        
        # Detect landed flights (no longer in active list OR altitude indicates landing)
        landed_flights = []
        for flight_id in list(self.active_flights.keys()):
            if flight_id not in current_ids:
                # Flight disappeared from radar
                landed_flights.append(flight_id)
                logger.info(f"Flight disappeared (landed): {flight_id} ({self.active_flights[flight_id]['registration']})")
            elif self.active_flights[flight_id].get('landing_detected'):
                # Landing was detected by altitude
                time_since_landing = datetime.now(timezone.utc) - self.active_flights[flight_id]['last_seen']
                if time_since_landing.total_seconds() > 120:  # Wait 2 minutes after landing detection
                    landed_flights.append(flight_id)
                    logger.info(f"Flight confirmed landed: {flight_id} ({self.active_flights[flight_id]['registration']})")
        
        # Store current positions for all active flights AFTER processing them
        self._store_active_positions(current_flights)
        
        return new_flights, landed_flights
    
    def process_landed_flight(self, flight_id: str) -> bool:
        """
        Download and import complete flight track for a landed flight
        This captures 100% of available positions
        """
        if flight_id not in self.active_flights:
            logger.warning(f"Flight {flight_id} not in active flights")
            return False
        
        flight_info = self.active_flights[flight_id]
        
        # Download complete flight track
        track_data = self.get_complete_flight_track(flight_id)
        if not track_data or not track_data.get('tracks'):
            logger.error(f"Failed to get complete track for {flight_id}")
            return False
        
        tracks = track_data['tracks']
        logger.info(f"Processing {len(tracks)} positions for flight {flight_id}")
        
        try:
            # Find or create aircraft
            aircraft = self._find_or_create_aircraft(flight_info)
            
            # Analyze complete flight path
            analysis = self._analyze_complete_path(tracks, flight_info)
            
            # Create flight log
            flight_log = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=f"fr24_complete_{flight_id}",
                callsign=flight_info['callsign'],
                departure_time=flight_info['first_seen'],
                arrival_time=flight_info['last_seen'],
                flight_duration_minutes=(
                    flight_info['last_seen'] - flight_info['first_seen']
                ).total_seconds() / 60,
                departure_airport='KDVT' if flight_info['is_phoenix_pd'] else None,
                arrival_airport='KDVT' if flight_info['is_phoenix_pd'] else None,
                max_altitude_feet=analysis['max_altitude'],
                min_altitude_feet=analysis['min_altitude'],
                avg_altitude_feet=analysis['avg_altitude'],
                estimated_cost=analysis['estimated_cost'],
                data_source='flightradar24_complete',
                raw_data={
                    'flight_id': flight_id,
                    'position_count': len(tracks),
                    'complete_track': True,
                    'capture_rate': '100%'
                },
                area_coverage=analysis['areas_covered'],
                hover_locations=analysis['hover_locations'],
                low_altitude_segments=analysis['low_altitude_segments'],
                surveillance_types=analysis['surveillance_types'],
                pattern_notes=analysis['pattern_notes'],
                surveillance_likelihood=analysis['surveillance_score'],
                privacy_concern_level=analysis['privacy_score'],
                legal_notes=analysis['legal_notes']
            )
            
            self.db.add(flight_log)
            self.db.flush()
            
            # Add all position points
            for i, track in enumerate(tracks):
                # Parse timestamp
                timestamp = self._parse_timestamp(track.get('timestamp'))
                
                # Detect hovering with high precision (we have positions every 5-15 seconds)
                is_hovering = False
                hover_duration = None
                
                if i > 0:
                    prev_track = tracks[i-1]
                    lat_diff = abs(track.get('latitude', 0) - prev_track.get('latitude', 0))
                    lon_diff = abs(track.get('longitude', 0) - prev_track.get('longitude', 0))
                    
                    # Very small movement = hovering (less than ~50 meters)
                    if lat_diff < 0.0005 and lon_diff < 0.0005:
                        is_hovering = True
                        prev_time = self._parse_timestamp(prev_track.get('timestamp'))
                        hover_duration = int((timestamp - prev_time).total_seconds())
                
                position = FlightPosition(
                    flight_log_id=flight_log.id,
                    aircraft_id=aircraft.id,
                    timestamp=timestamp,
                    latitude=track.get('latitude'),
                    longitude=track.get('longitude'),
                    altitude_feet=track.get('altitude'),
                    ground_speed_knots=track.get('speed'),
                    track_degrees=track.get('track'),
                    vertical_rate=track.get('vertical_rate'),
                    is_hovering=is_hovering,
                    hover_duration_seconds=hover_duration,
                    altitude_privacy_concern=track.get('altitude', 10000) < 1000,
                    data_source='flightradar24_complete'
                )
                self.db.add(position)
            
            self.db.commit()
            
            # Mark as completed and remove from active
            self.completed_flights.add(flight_id)
            del self.active_flights[flight_id]
            
            logger.info(f"✓ Imported complete flight {flight_id}: {len(tracks)} positions, "
                       f"surveillance score: {analysis['surveillance_score']:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to process landed flight {flight_id}: {e}")
            self.db.rollback()
            return False
    
    def _store_active_positions(self, current_flights: List[Dict]):
        """Store current positions for all active flights in the database"""
        try:
            for flight in current_flights:
                flight_id = flight.get('flight_id') or flight.get('fr24_id')
                if not flight_id or flight_id not in self.active_flights:
                    continue
                
                flight_info = self.active_flights[flight_id]
                
                # Only store positions for Phoenix PD or other relevant aircraft
                if not flight_info.get('is_phoenix_pd'):
                    continue  # Skip commercial/unknown aircraft
                
                # Create flight log if it doesn't exist
                if not flight_info.get('flight_log_id'):
                    aircraft = self._find_or_create_aircraft(flight_info)
                    
                    flight_log = FlightLog(
                        aircraft_id=aircraft.id,
                        flight_id=f"fr24_active_{flight_id}",
                        callsign=flight_info['callsign'] or flight_info['registration'],
                        departure_time=flight_info['first_seen'],
                        departure_airport='KDVT' if flight_info['is_phoenix_pd'] else None,
                        data_source='flightradar24',
                        raw_data={'active': True, 'flight_id': flight_id}
                    )
                    self.db.add(flight_log)
                    self.db.flush()
                    flight_info['flight_log_id'] = flight_log.id
                
                # Add current position
                position = FlightPosition(
                    flight_log_id=flight_info['flight_log_id'],
                    aircraft_id=aircraft.id if 'aircraft' in locals() else self._find_or_create_aircraft(flight_info).id,
                    timestamp=datetime.now(timezone.utc),
                    latitude=flight.get('latitude'),
                    longitude=flight.get('longitude'),
                    altitude_feet=flight.get('altitude'),
                    ground_speed_knots=flight.get('speed'),
                    track_degrees=flight.get('track'),
                    is_hovering=flight.get('speed', 100) < 10,
                    altitude_privacy_concern=flight.get('altitude', 10000) < 1000,
                    data_source='flightradar24'
                )
                self.db.add(position)
            
            self.db.commit()
            logger.debug(f"Stored positions for {len(current_flights)} active flights")
            
        except Exception as e:
            logger.error(f"Error storing active positions: {e}")
            self.db.rollback()
    
    def _find_or_create_aircraft(self, flight_info: Dict) -> Aircraft:
        """Find or create aircraft record"""
        registration = flight_info.get('registration', '')
        hex_code = flight_info.get('hex', '')
        
        # Only process known Phoenix PD aircraft
        if not flight_info.get('is_phoenix_pd'):
            return None
        
        # Try to find by registration first
        if registration:
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.registration == registration
            ).first()
            if aircraft:
                return aircraft
        
        # Try by hex code
        if hex_code:
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.icao_code == hex_code
            ).first()
            if aircraft:
                return aircraft
        
        # Create new Phoenix PD aircraft only if we have a valid registration
        if registration and registration in PHOENIX_PD_REGISTRATIONS:
            aircraft = Aircraft(
                registration=registration,
                icao_code=hex_code,
                model="Airbus H125",  # Phoenix PD fleet model
                operator="Phoenix Police Department",
                is_phoenix_pd=True,
                is_active=True,
                hourly_operating_cost=2160.0
            )
            self.db.add(aircraft)
            self.db.flush()
            return aircraft
        
        return None
    
    def _analyze_complete_path(self, tracks: List[Dict], flight_info: Dict) -> Dict:
        """
        Analyze complete flight path for surveillance patterns
        With positions every 5-15 seconds, we can detect precise patterns
        """
        if not tracks:
            return self._empty_analysis()
        
        # Initialize analysis
        altitudes = []
        hover_locations = []
        low_altitude_segments = []
        areas_covered = set()
        surveillance_types = []
        
        hover_start_idx = None
        low_alt_start_idx = None
        consecutive_hover_positions = 0
        
        # Process each position
        for i, track in enumerate(tracks):
            lat = track.get('lat', 0)
            lon = track.get('lon', 0)
            alt = track.get('alt', 0)
            
            if alt:
                altitudes.append(alt)
            
            # Grid square for area coverage
            if lat and lon:
                grid = f"{lat:.3f},{lon:.3f}"
                areas_covered.add(grid)
            
            # Hovering detection (consecutive positions within ~100m)
            if i > 0:
                prev = tracks[i-1]
                movement = ((lat - prev.get('lat', 0))**2 + 
                           (lon - prev.get('lon', 0))**2)**0.5
                
                if movement < 0.001:  # ~100 meters
                    consecutive_hover_positions += 1
                    if hover_start_idx is None:
                        hover_start_idx = i - 1
                else:
                    # End of hover if we had 3+ positions (15-45 seconds)
                    if consecutive_hover_positions >= 3:
                        start_track = tracks[hover_start_idx]
                        hover_locations.append({
                            'lat': start_track.get('lat'),
                            'lon': start_track.get('lon'),
                            'start_time': start_track.get('timestamp'),
                            'duration_seconds': consecutive_hover_positions * 10,  # Approximate
                            'position_count': consecutive_hover_positions
                        })
                    consecutive_hover_positions = 0
                    hover_start_idx = None
            
            # Low altitude segments
            if alt and alt < 1000:
                if low_alt_start_idx is None:
                    low_alt_start_idx = i
            elif low_alt_start_idx is not None:
                # End of low altitude segment
                segment_positions = tracks[low_alt_start_idx:i]
                if len(segment_positions) >= 3:  # At least 15-45 seconds
                    low_altitude_segments.append({
                        'start_position': {
                            'lat': segment_positions[0].get('lat'),
                            'lon': segment_positions[0].get('lon')
                        },
                        'end_position': {
                            'lat': segment_positions[-1].get('lat'),
                            'lon': segment_positions[-1].get('lon')
                        },
                        'duration_seconds': len(segment_positions) * 10,
                        'min_altitude': min(p.get('alt', 1000) for p in segment_positions)
                    })
                low_alt_start_idx = None
        
        # Calculate metrics
        total_positions = len(tracks)
        hover_positions = sum(h['position_count'] for h in hover_locations)
        low_alt_positions = sum(len(s) for s in low_altitude_segments)
        
        # Surveillance scoring
        surveillance_score = 0.0
        privacy_score = 1
        notes = []
        legal_notes = []
        
        # Hovering analysis (very strong indicator with complete data)
        hover_ratio = hover_positions / total_positions if total_positions else 0
        if hover_ratio > 0.2:
            surveillance_score += 0.5
            surveillance_types.append('persistent_hovering')
            notes.append(f"Hovering {hover_ratio:.0%} of flight ({len(hover_locations)} locations)")
            privacy_score = 5
            legal_notes.append(f"Extended hovering at {len(hover_locations)} locations indicates targeted surveillance")
        elif hover_ratio > 0.1:
            surveillance_score += 0.3
            surveillance_types.append('hovering')
            notes.append(f"Some hovering ({hover_ratio:.0%})")
            privacy_score = max(privacy_score, 3)
        
        # Low altitude analysis
        low_alt_ratio = low_alt_positions / total_positions if total_positions else 0
        if low_alt_ratio > 0.3:
            surveillance_score += 0.3
            surveillance_types.append('low_altitude_surveillance')
            notes.append(f"Low altitude {low_alt_ratio:.0%}")
            privacy_score = max(privacy_score, 4)
            legal_notes.append("Extended low-altitude operations violate reasonable expectation of privacy")
        
        # Circling pattern detection (returning to same area)
        if len(areas_covered) < len(tracks) / 10:  # Visiting same areas repeatedly
            surveillance_score += 0.2
            surveillance_types.append('circling_pattern')
            notes.append("Circling/repeated coverage")
            privacy_score = max(privacy_score, 4)
            legal_notes.append("Circular flight pattern indicates focused surveillance of specific area")
        
        # Duration factor
        duration_minutes = (flight_info['last_seen'] - flight_info['first_seen']).total_seconds() / 60
        if duration_minutes > 90:
            notes.append(f"Extended {duration_minutes:.0f}min flight")
        
        # Cost calculation for Phoenix PD
        estimated_cost = None
        if flight_info['is_phoenix_pd']:
            estimated_cost = duration_minutes * 36  # $2160/hour = $36/minute
            notes.append(f"Cost: ${estimated_cost:.0f}")
        
        surveillance_score = min(1.0, surveillance_score)
        
        return {
            'max_altitude': max(altitudes) if altitudes else None,
            'min_altitude': min(altitudes) if altitudes else None,
            'avg_altitude': sum(altitudes) / len(altitudes) if altitudes else None,
            'areas_covered': list(areas_covered),
            'hover_locations': hover_locations,
            'low_altitude_segments': low_altitude_segments,
            'surveillance_types': surveillance_types,
            'surveillance_score': surveillance_score,
            'privacy_score': privacy_score,
            'pattern_notes': f"COMPLETE TRACK ({total_positions} positions); " + "; ".join(notes),
            'legal_notes': "; ".join(legal_notes) if legal_notes else None,
            'estimated_cost': estimated_cost
        }
    
    def _empty_analysis(self) -> Dict:
        """Return empty analysis structure"""
        return {
            'max_altitude': None,
            'min_altitude': None,
            'avg_altitude': None,
            'areas_covered': [],
            'hover_locations': [],
            'low_altitude_segments': [],
            'surveillance_types': [],
            'surveillance_score': 0.0,
            'privacy_score': 1,
            'pattern_notes': 'No data',
            'legal_notes': None,
            'estimated_cost': None
        }
    
    def _parse_timestamp(self, timestamp_str) -> datetime:
        """Parse various timestamp formats"""
        if not timestamp_str:
            return datetime.now(timezone.utc)
        
        if isinstance(timestamp_str, (int, float)):
            return datetime.fromtimestamp(timestamp_str, tz=timezone.utc)
        
        timestamp_str = str(timestamp_str)
        if 'Z' in timestamp_str:
            timestamp_str = timestamp_str.replace('Z', '+00:00')
        
        try:
            return datetime.fromisoformat(timestamp_str)
        except:
            return datetime.now(timezone.utc)
    
    def monitor_flights(self, check_interval_seconds: int = 300):
        """
        Main monitoring loop
        Checks every 5 minutes for flight changes
        Downloads complete tracks when flights land
        """
        logger.info("Starting flight monitoring for complete track collection")
        
        while True:
            try:
                # Detect flight changes
                new_flights, landed_flights = self.detect_flight_changes()
                
                # Process landed flights immediately
                for flight_id in landed_flights:
                    logger.info(f"Processing complete track for landed flight {flight_id}")
                    self.process_landed_flight(flight_id)
                
                # Log status
                logger.info(f"Active flights: {len(self.active_flights)}, "
                          f"New: {len(new_flights)}, Landed: {len(landed_flights)}")
                
                # Sleep before next check
                import time
                time.sleep(check_interval_seconds)
                
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                import time
                time.sleep(60)  # Wait a minute on error


def run_flight_monitor():
    """Run the flight monitoring service"""
    db = SessionLocal()
    try:
        tracker = CompleteFlightTracker(db)
        tracker.monitor_flights(check_interval_seconds=300)  # Check every 5 minutes
    finally:
        db.close()


if __name__ == "__main__":
    run_flight_monitor()