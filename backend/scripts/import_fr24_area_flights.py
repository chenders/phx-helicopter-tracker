#!/usr/bin/env python3
"""
Import flight positions from FR24 API and group them into complete flights
This approach collects positions over multiple time windows to reconstruct flight paths
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
from datetime import datetime, timezone, timedelta
import json
import logging
import time
from typing import List, Dict, Optional
from collections import defaultdict
from sqlalchemy.orm import Session
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

class AreaFlightImporter:
    def __init__(self, db: Session):
        self.db = db
        self.imported_flights = 0
        self.total_positions = 0
        self.api_calls = 0
        self.rate_limit_delay = 0.3  # 300ms between calls
        
    def fetch_area_positions(self, timestamp: datetime) -> List[Dict]:
        """Fetch flight positions in Phoenix area at specific timestamp"""
        endpoint = f"{BASE_URL}/historic/flight-positions/full"
        params = {
            "timestamp": int(timestamp.timestamp()),
            "bounds": f"{PHOENIX_BOUNDS['lat_max']},{PHOENIX_BOUNDS['lat_min']},{PHOENIX_BOUNDS['lon_min']},{PHOENIX_BOUNDS['lon_max']}",
        }
        
        try:
            self.api_calls += 1
            time.sleep(self.rate_limit_delay)
            response = requests.get(endpoint, params=params, headers=HEADERS, timeout=30)
            
            if response.status_code == 200:
                data = response.json()
                positions = data.get('data', []) if isinstance(data, dict) else data
                return positions if isinstance(positions, list) else []
            else:
                logger.error(f"API returned {response.status_code}")
                return []
                
        except Exception as e:
            logger.error(f"Failed to fetch positions: {e}")
            return []
    
    def collect_flight_positions(self, hours_back: int = 24, interval_minutes: int = 5):
        """Collect positions at regular intervals to build complete flight paths"""
        logger.info(f"Collecting flight positions for last {hours_back} hours")
        
        flights_data = defaultdict(lambda: {
            'positions': [],
            'first_seen': None,
            'last_seen': None,
            'hex': None,
            'callsign': None,
            'registration': None
        })
        
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=hours_back)
        current_time = start_time
        
        timestamps_checked = 0
        while current_time <= end_time:
            logger.info(f"Fetching positions at {current_time.isoformat()}")
            positions = self.fetch_area_positions(current_time)
            
            if positions:
                logger.info(f"  Found {len(positions)} aircraft positions")
                
                for pos in positions:
                    fr24_id = pos.get('fr24_id')
                    if not fr24_id:
                        continue
                    
                    # Add position to flight data
                    flight = flights_data[fr24_id]
                    
                    # Store metadata if first time seeing this flight
                    if not flight['hex']:
                        flight['hex'] = pos.get('hex')
                        flight['callsign'] = pos.get('callsign')
                        # Try to determine registration from callsign or other data
                        callsign = pos.get('callsign')
                        if callsign and isinstance(callsign, str) and callsign.startswith('N'):
                            flight['registration'] = callsign
                    
                    # Add position with timestamp
                    pos['timestamp'] = pos.get('timestamp', current_time.isoformat())
                    flight['positions'].append(pos)
                    
                    # Update time range
                    pos_time = current_time
                    if not flight['first_seen'] or pos_time < flight['first_seen']:
                        flight['first_seen'] = pos_time
                    if not flight['last_seen'] or pos_time > flight['last_seen']:
                        flight['last_seen'] = pos_time
            
            current_time += timedelta(minutes=interval_minutes)
            timestamps_checked += 1
            
            # Rate limit protection
            if self.api_calls % 20 == 0:
                logger.info(f"API calls: {self.api_calls}, pausing...")
                time.sleep(2)
        
        logger.info(f"Checked {timestamps_checked} timestamps, found {len(flights_data)} unique flights")
        return flights_data
    
    def is_phoenix_pd_helicopter(self, flight_data: Dict) -> bool:
        """Check if flight is a Phoenix PD helicopter"""
        callsign = flight_data.get('callsign', '')
        registration = flight_data.get('registration', '')
        
        for reg in PHOENIX_PD_REGISTRATIONS:
            if reg in callsign or reg in registration:
                return True
        
        # Also check hex codes if we have a mapping
        hex_code = flight_data.get('hex', '')
        if hex_code:
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.icao_code == hex_code,
                Aircraft.is_phoenix_pd == True
            ).first()
            if aircraft:
                return True
        
        return False
    
    def analyze_flight_pattern(self, positions: List[Dict]) -> tuple:
        """Analyze flight pattern for surveillance characteristics"""
        if len(positions) < 2:
            return 0.0, 1, "Insufficient data"
        
        surveillance_score = 0.0
        privacy_score = 1
        notes = []
        
        # Sort positions by time
        positions = sorted(positions, key=lambda p: p.get('timestamp', ''))
        
        # Analyze patterns
        hover_count = 0
        low_alt_count = 0
        total_distance = 0.0
        
        prev_pos = None
        for pos in positions:
            alt = pos.get('alt', 0)
            
            # Low altitude check
            if alt and alt < 1500:
                low_alt_count += 1
            
            if prev_pos:
                # Calculate movement
                lat_diff = abs(pos.get('lat', 0) - prev_pos.get('lat', 0))
                lon_diff = abs(pos.get('lon', 0) - prev_pos.get('lon', 0))
                distance = (lat_diff**2 + lon_diff**2)**0.5
                total_distance += distance
                
                # Hover detection
                if distance < 0.001:  # Roughly 100m
                    hover_count += 1
            
            prev_pos = pos
        
        # Calculate metrics
        if len(positions) > 0:
            hover_ratio = hover_count / len(positions)
            low_alt_ratio = low_alt_count / len(positions)
            
            if hover_ratio > 0.3:
                surveillance_score += 0.4
                notes.append(f"Hovering {hover_ratio:.0%}")
                privacy_score = max(privacy_score, 3)
            
            if low_alt_ratio > 0.5:
                surveillance_score += 0.3
                notes.append(f"Low altitude {low_alt_ratio:.0%}")
                privacy_score = max(privacy_score, 4)
            
            # Check for circling (low total distance relative to time)
            if total_distance < 0.5 and len(positions) > 10:
                surveillance_score += 0.2
                notes.append("Circling pattern")
                privacy_score = max(privacy_score, 3)
        
        # Phoenix PD helicopter bonus
        if any(pos.get('callsign', '').startswith('N62') for pos in positions):
            surveillance_score += 0.1
            notes.append("Phoenix PD helicopter")
        
        surveillance_score = min(1.0, surveillance_score)
        
        return surveillance_score, privacy_score, "; ".join(notes) if notes else "Normal pattern"
    
    def import_flight(self, fr24_id: str, flight_data: Dict) -> bool:
        """Import a flight with its positions into database"""
        try:
            # Check if already imported
            existing = self.db.query(FlightLog).filter(
                FlightLog.flight_id == f"fr24_{fr24_id}"
            ).first()
            
            if existing:
                logger.debug(f"Flight {fr24_id} already imported")
                return False
            
            positions = flight_data['positions']
            if len(positions) < 2:
                logger.debug(f"Skipping {fr24_id} - insufficient positions")
                return False
            
            # Sort positions by timestamp
            positions = sorted(positions, key=lambda p: p.get('timestamp', ''))
            
            # Find or create aircraft
            hex_code = flight_data['hex']
            callsign = flight_data['callsign'] or hex_code
            
            aircraft = self.db.query(Aircraft).filter(
                Aircraft.icao_code == hex_code
            ).first()
            
            if not aircraft:
                is_phoenix_pd = self.is_phoenix_pd_helicopter(flight_data)
                
                aircraft = Aircraft(
                    registration=flight_data.get('registration') or callsign,
                    icao_code=hex_code,
                    model="Helicopter" if is_phoenix_pd else "Unknown",
                    make="Unknown",
                    operator="Phoenix PD" if is_phoenix_pd else "Unknown",
                    is_phoenix_pd=is_phoenix_pd,
                    is_active=True
                )
                self.db.add(aircraft)
                self.db.flush()
                logger.info(f"Created aircraft: {aircraft.registration} (Phoenix PD: {is_phoenix_pd})")
            
            # Calculate flight metrics
            altitudes = [p.get('alt', 0) for p in positions if p.get('alt')]
            max_alt = max(altitudes) if altitudes else None
            min_alt = min(altitudes) if altitudes else None
            avg_alt = sum(altitudes) / len(altitudes) if altitudes else None
            
            duration_minutes = (flight_data['last_seen'] - flight_data['first_seen']).total_seconds() / 60
            
            # Analyze surveillance patterns
            surveillance_score, privacy_score, pattern_notes = self.analyze_flight_pattern(positions)
            
            # Create flight log
            flight_log = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=f"fr24_{fr24_id}",
                callsign=flight_data['callsign'],
                departure_time=flight_data['first_seen'],
                arrival_time=flight_data['last_seen'],
                flight_duration_minutes=duration_minutes,
                departure_airport='KDVT' if aircraft.is_phoenix_pd else 'KPHX',
                arrival_airport='KDVT' if aircraft.is_phoenix_pd else 'KPHX',
                max_altitude_feet=max_alt,
                min_altitude_feet=min_alt,
                avg_altitude_feet=avg_alt,
                estimated_cost=duration_minutes * 36 if aircraft.is_phoenix_pd else None,
                data_source='flightradar24_area',
                raw_data={
                    'fr24_id': fr24_id,
                    'hex': hex_code,
                    'position_count': len(positions)
                },
                surveillance_likelihood=surveillance_score,
                privacy_concern_level=privacy_score,
                pattern_notes=pattern_notes
            )
            self.db.add(flight_log)
            self.db.flush()
            
            # Add all positions
            for pos in positions:
                timestamp_str = pos.get('timestamp', '')
                if 'Z' in timestamp_str:
                    timestamp_str = timestamp_str.replace('Z', '+00:00')
                
                try:
                    timestamp = datetime.fromisoformat(timestamp_str)
                except:
                    timestamp = flight_data['first_seen']
                
                position = FlightPosition(
                    flight_log_id=flight_log.id,
                    aircraft_id=aircraft.id,
                    timestamp=timestamp,
                    latitude=pos.get('lat'),
                    longitude=pos.get('lon'),
                    altitude_feet=pos.get('alt'),
                    ground_speed_knots=pos.get('gspeed'),
                    track_degrees=pos.get('track'),
                    vertical_rate=pos.get('vspeed'),
                    altitude_privacy_concern=pos.get('alt', 10000) < 1500,
                    data_source='flightradar24'
                )
                self.db.add(position)
                self.total_positions += 1
            
            self.db.commit()
            self.imported_flights += 1
            
            logger.info(f"✓ Imported flight {fr24_id} ({callsign}) with {len(positions)} positions")
            if aircraft.is_phoenix_pd:
                logger.info(f"  ⚠️ PHOENIX PD HELICOPTER - Surveillance score: {surveillance_score:.2f}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to import flight {fr24_id}: {e}")
            self.db.rollback()
            return False
    
    def run_import(self, hours_back: int = 24, interval_minutes: int = 5):
        """Run the complete import process"""
        logger.info("="*60)
        logger.info("PHOENIX AREA FLIGHT IMPORT")
        logger.info("="*60)
        logger.info(f"Time range: Last {hours_back} hours")
        logger.info(f"Check interval: Every {interval_minutes} minutes")
        
        # Collect all flight positions
        flights_data = self.collect_flight_positions(hours_back, interval_minutes)
        
        # Import each flight
        logger.info(f"\nImporting {len(flights_data)} flights...")
        phoenix_pd_count = 0
        
        for fr24_id, flight_data in flights_data.items():
            if len(flight_data['positions']) >= 2:  # Need at least 2 positions
                if self.import_flight(fr24_id, flight_data):
                    if self.is_phoenix_pd_helicopter(flight_data):
                        phoenix_pd_count += 1
        
        # Report
        logger.info("\n" + "="*60)
        logger.info("IMPORT COMPLETE")
        logger.info("="*60)
        logger.info(f"Flights imported: {self.imported_flights}")
        logger.info(f"Phoenix PD helicopters: {phoenix_pd_count}")
        logger.info(f"Total positions: {self.total_positions}")
        logger.info(f"API calls made: {self.api_calls}")
        
        # Database statistics
        total_flights = self.db.query(FlightLog).count()
        total_positions = self.db.query(FlightPosition).count()
        phoenix_pd_flights = self.db.query(FlightLog).join(Aircraft).filter(
            Aircraft.is_phoenix_pd == True
        ).count()
        high_surveillance = self.db.query(FlightLog).filter(
            FlightLog.surveillance_likelihood > 0.6
        ).count()
        
        logger.info(f"\nDatabase totals:")
        logger.info(f"  Total flights: {total_flights}")
        logger.info(f"  Total positions: {total_positions}")
        logger.info(f"  Phoenix PD flights: {phoenix_pd_flights}")
        logger.info(f"  High surveillance flights: {high_surveillance}")


def main():
    """Main entry point"""
    if not FR24_API_KEY:
        logger.error("FR24_API_KEY_PRODUCTION not set!")
        return
    
    import argparse
    parser = argparse.ArgumentParser(description='Import Phoenix area flights from FR24')
    parser.add_argument('--hours', type=int, default=24, help='Hours to look back (default: 24)')
    parser.add_argument('--interval', type=int, default=5, help='Minutes between checks (default: 5)')
    args = parser.parse_args()
    
    db = SessionLocal()
    try:
        importer = AreaFlightImporter(db)
        importer.run_import(hours_back=args.hours, interval_minutes=args.interval)
    except Exception as e:
        logger.error(f"Import failed: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    main()