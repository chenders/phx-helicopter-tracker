#!/usr/bin/env python3
"""
Import flight data from FR24 historic positions API
"""
import os
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import requests
from datetime import datetime, timezone, timedelta
import json
import logging
from sqlalchemy.orm import Session
from app.db.database import get_db, SessionLocal
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
FR24_API_KEY = os.getenv("FR24_API_KEY_PRODUCTION")
base_url = "https://fr24api.flightradar24.com/api"

# Phoenix area bounds
phoenix_bounds = {
    "lat_min": 33.2,
    "lat_max": 33.8,
    "lon_min": -112.4,
    "lon_max": -111.8
}

# Headers for all requests
headers = {
    "Authorization": f"Bearer {FR24_API_KEY}",
    "Accept": "application/json",
    "Accept-Version": "v1",
}

def fetch_historic_positions(timestamp):
    """Fetch historic flight positions at a specific timestamp"""
    endpoint = f"{base_url}/historic/flight-positions/light"
    params = {
        "timestamp": int(timestamp.timestamp()),
        "bounds": f"{phoenix_bounds['lat_max']},{phoenix_bounds['lat_min']},{phoenix_bounds['lon_min']},{phoenix_bounds['lon_max']}",
    }
    
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=30)
        if response.status_code == 200:
            data = response.json()
            if isinstance(data, dict) and 'data' in data:
                return data['data']
    except Exception as e:
        logger.error(f"Failed to fetch positions: {e}")
    
    return []

def import_positions_as_flights(db: Session):
    """Import flight positions from FR24 API"""
    logger.info("Starting FR24 position import...")
    
    # Get positions from different time windows
    now = datetime.now(timezone.utc)
    time_windows = [
        now - timedelta(hours=2),
        now - timedelta(hours=6),
        now - timedelta(hours=12),
        now - timedelta(hours=24),
        now - timedelta(days=2),
        now - timedelta(days=3),
        now - timedelta(days=7),
    ]
    
    total_imported = 0
    unique_flights = {}  # Track unique flights by fr24_id
    
    for timestamp in time_windows:
        logger.info(f"\nFetching positions at {timestamp.isoformat()}...")
        positions = fetch_historic_positions(timestamp)
        
        if positions:
            logger.info(f"Got {len(positions)} positions")
            
            for pos in positions:
                fr24_id = pos.get('fr24_id')
                if not fr24_id:
                    continue
                
                # Skip if we've already seen this flight
                if fr24_id in unique_flights:
                    # Update time range if needed
                    pos_time = datetime.fromisoformat(pos.get('timestamp', '').replace('Z', '+00:00'))
                    if pos_time < unique_flights[fr24_id]['first_seen']:
                        unique_flights[fr24_id]['first_seen'] = pos_time
                    if pos_time > unique_flights[fr24_id]['last_seen']:
                        unique_flights[fr24_id]['last_seen'] = pos_time
                    unique_flights[fr24_id]['positions'].append(pos)
                else:
                    # New flight
                    pos_time = datetime.fromisoformat(pos.get('timestamp', '').replace('Z', '+00:00'))
                    unique_flights[fr24_id] = {
                        'fr24_id': fr24_id,
                        'hex': pos.get('hex'),
                        'callsign': pos.get('callsign'),
                        'first_seen': pos_time,
                        'last_seen': pos_time,
                        'positions': [pos]
                    }
    
    logger.info(f"\nFound {len(unique_flights)} unique flights")
    
    # Import each unique flight
    for flight_data in unique_flights.values():
        try:
            # Create a generic aircraft entry if needed
            callsign = flight_data['callsign'] or flight_data['hex']
            
            # Check if we have an aircraft with this hex code
            aircraft = db.query(Aircraft).filter(Aircraft.icao_code == flight_data['hex']).first()
            
            if not aircraft:
                # Create a generic aircraft entry
                aircraft = Aircraft(
                    registration=callsign,  # Use callsign as registration
                    icao_code=flight_data['hex'],
                    model="Unknown",
                    make="Unknown",
                    is_phoenix_pd=False,
                    is_active=True
                )
                db.add(aircraft)
                db.flush()
                logger.info(f"Created aircraft {callsign} (hex: {flight_data['hex']})")
            
            # Create flight log
            flight_log = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=f"fr24_{flight_data['fr24_id']}",
                callsign=flight_data['callsign'],
                departure_time=flight_data['first_seen'],
                arrival_time=flight_data['last_seen'],
                flight_duration_minutes=(flight_data['last_seen'] - flight_data['first_seen']).total_seconds() / 60,
                data_source='flightradar24_historical',
                raw_data={'fr24_id': flight_data['fr24_id'], 'hex': flight_data['hex']}
            )
            db.add(flight_log)
            db.flush()
            
            # Add positions
            for pos in flight_data['positions']:
                position = FlightPosition(
                    flight_log_id=flight_log.id,
                    aircraft_id=aircraft.id,
                    timestamp=datetime.fromisoformat(pos.get('timestamp', '').replace('Z', '+00:00')),
                    latitude=pos.get('lat'),
                    longitude=pos.get('lon'),
                    altitude_feet=pos.get('alt'),
                    ground_speed_knots=pos.get('gspeed'),
                    track_degrees=pos.get('track'),
                    vertical_rate=pos.get('vspeed'),
                    data_source='flightradar24'
                )
                db.add(position)
            
            db.commit()
            total_imported += 1
            logger.info(f"Imported flight {callsign} with {len(flight_data['positions'])} positions")
            
        except Exception as e:
            logger.error(f"Failed to import flight {flight_data['fr24_id']}: {e}")
            db.rollback()
    
    logger.info(f"\nTotal flights imported: {total_imported}")
    return total_imported

def main():
    """Main import function"""
    if not FR24_API_KEY:
        logger.error("FR24_API_KEY_PRODUCTION not set!")
        return
    
    db = SessionLocal()
    try:
        imported = import_positions_as_flights(db)
        logger.info(f"Successfully imported {imported} flights")
    finally:
        db.close()

if __name__ == "__main__":
    main()