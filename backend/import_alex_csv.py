#!/usr/bin/env python3
"""
Import the ALEX sky-writing flight CSV and run abnormal pattern detection
"""
import sys
sys.path.insert(0, '/app')

import csv
from datetime import datetime
from sqlalchemy import create_engine, text
from app.core.config import settings
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.models.aircraft import Aircraft
import json

def import_alex_flight():
    """Import the ALEX flight from CSV"""
    
    csv_path = '/app/3b2f4a3c.csv'  # Docker path
    flight_id = '3b2f4a3c'
    
    print("=" * 60)
    print("ALEX Sky-Writing Flight Importer")
    print(f"Flight ID: {flight_id}")
    print("=" * 60)
    
    session = SessionLocal()
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        # First check if N624FB aircraft exists
        aircraft = session.query(Aircraft).filter(Aircraft.registration == 'N624FB').first()
        if not aircraft:
            print("Creating N624FB aircraft record...")
            aircraft = Aircraft(
                registration='N624FB',
                make='Airbus',
                model='H125',
                operator='Phoenix Police Department',
                is_phoenix_pd=True,
                unit_designation='FIREBIRD 4'
            )
            session.add(aircraft)
            session.commit()
            print(f"Created aircraft: {aircraft.registration} (ID: {aircraft.id})")
        else:
            print(f"Found aircraft: {aircraft.registration} (ID: {aircraft.id})")
        
        # Check if flight already exists
        existing_flight = session.query(FlightLog).filter(FlightLog.flight_id == flight_id).first()
        if existing_flight:
            print(f"Flight {flight_id} already exists in flight_logs")
            flight_log = existing_flight
        else:
            # Read CSV to get flight details
            positions = []
            with open(csv_path, 'r') as f:
                reader = csv.DictReader(f)
                for row in reader:
                    timestamp = datetime.utcfromtimestamp(int(row['Timestamp']))
                    lat, lon = row['Position'].strip('"').split(',')
                    positions.append({
                        'timestamp': timestamp,
                        'latitude': float(lat),
                        'longitude': float(lon),
                        'altitude': int(row['Altitude']) if row['Altitude'] else 0,
                        'speed': int(row['Speed']) if row['Speed'] else 0,
                        'direction': int(row['Direction']) if row['Direction'] else 0
                    })
            
            if not positions:
                print("No positions found in CSV")
                return
            
            # Create flight log
            print(f"Creating flight log for {len(positions)} positions...")
            departure_time = positions[0]['timestamp']
            arrival_time = positions[-1]['timestamp']
            duration_minutes = (arrival_time - departure_time).total_seconds() / 60
            
            flight_log = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=flight_id,
                callsign='N624FB',
                departure_time=departure_time,
                arrival_time=arrival_time,
                flight_duration_minutes=duration_minutes,
                departure_airport='KDVT',
                arrival_airport='KDVT',
                data_source='fr24_csv',
                raw_data={'positions_count': len(positions)}
            )
            session.add(flight_log)
            session.commit()
            print(f"Created flight log ID: {flight_log.id}")
            
            # Insert positions using bulk insert for speed
            print(f"Inserting {len(positions)} positions...")
            position_records = []
            for pos in positions:
                position_records.append({
                    'flight_log_id': flight_log.id,
                    'aircraft_id': aircraft.id,
                    'timestamp': pos['timestamp'],
                    'latitude': pos['latitude'],
                    'longitude': pos['longitude'],
                    'altitude_feet': pos['altitude'],
                    'ground_speed_knots': pos['speed'],
                    'track_degrees': pos['direction'],
                    'data_source': 'fr24_csv'
                })
            
            # Bulk insert positions
            with engine.connect() as conn:
                conn.execute(
                    text('''
                        INSERT INTO flight_positions 
                        (flight_log_id, aircraft_id, timestamp, latitude, longitude, 
                         altitude_feet, ground_speed_knots, track_degrees, data_source)
                        VALUES 
                        (:flight_log_id, :aircraft_id, :timestamp, :latitude, :longitude,
                         :altitude_feet, :ground_speed_knots, :track_degrees, :data_source)
                    '''),
                    position_records
                )
                conn.commit()
            
            print(f"✓ Successfully imported {len(positions)} positions")
        
        # Now run abnormal pattern detection
        print("\n" + "=" * 60)
        print("Running Abnormal Pattern Detection")
        print("=" * 60)
        
        from app.workers.abnormal_pattern_tasks import detect_abnormal_flight_patterns
        
        # Run with very low threshold to catch sky-writing
        print(f"Starting detection on flight_id={flight_log.id} with low threshold...")
        task = detect_abnormal_flight_patterns.delay(
            flight_id=flight_log.id,  # Use the database ID, not FR24 ID
            min_complexity_threshold=0.5
        )
        
        print(f"Task ID: {task.id}")
        print("Waiting for pattern detection (timeout 120s)...")
        
        result = task.get(timeout=120)
        
        print("\nPattern Detection Results:")
        print("-" * 40)
        
        if result.get('abnormal_patterns_found'):
            patterns = result.get('abnormal_patterns_found', [])
            print(f"✓ Found {len(patterns)} abnormal patterns!")
            
            # Query the actual patterns from database
            with engine.connect() as conn:
                pattern_results = conn.execute(
                    text('''
                        SELECT pattern_type, confidence_score, pattern_data
                        FROM abnormal_patterns
                        WHERE flight_log_id = :flight_id
                        ORDER BY confidence_score DESC
                    '''),
                    {'flight_id': flight_log.id}
                )
                
                for pattern in pattern_results:
                    print(f"\n  Pattern Type: {pattern[0]}")
                    print(f"  Confidence: {pattern[1]:.2f}")
                    if pattern[2]:
                        data = json.loads(pattern[2]) if isinstance(pattern[2], str) else pattern[2]
                        if 'description' in data:
                            print(f"  Description: {data['description']}")
        else:
            print("⚠ No abnormal patterns detected")
            print("The sky-writing pattern may require:")
            print("  - Even lower complexity thresholds")
            print("  - Specific letter/character recognition logic")
            print("  - Analysis of the path shape rather than just complexity")
            
            # Let's do a manual check of the flight path
            print("\nManual flight path analysis...")
            with engine.connect() as conn:
                positions = conn.execute(
                    text('''
                        SELECT latitude, longitude, altitude_feet, timestamp
                        FROM flight_positions
                        WHERE flight_log_id = :flight_id
                        ORDER BY timestamp
                    '''),
                    {'flight_id': flight_log.id}
                ).fetchall()
                
                if positions:
                    # Calculate some basic stats
                    min_lat = min(p[0] for p in positions)
                    max_lat = max(p[0] for p in positions)
                    min_lon = min(p[1] for p in positions)
                    max_lon = max(p[1] for p in positions)
                    
                    print(f"\n  Flight covered area:")
                    print(f"    Latitude: {min_lat:.4f} to {max_lat:.4f} ({(max_lat-min_lat)*69:.1f} miles)")
                    print(f"    Longitude: {min_lon:.4f} to {max_lon:.4f} ({(max_lon-min_lon)*53:.1f} miles)")
                    print(f"    This large area coverage with many position points suggests complex maneuvering")
                    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        session.close()

if __name__ == "__main__":
    import_alex_flight()