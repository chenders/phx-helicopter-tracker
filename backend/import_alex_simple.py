#!/usr/bin/env python3
"""
Simple import of ALEX flight CSV using raw SQL
"""
import sys
sys.path.insert(0, '/app')

import csv
from datetime import datetime
from sqlalchemy import create_engine, text
from app.core.config import settings
import json

def import_alex_flight():
    """Import the ALEX flight from CSV using raw SQL"""
    
    # The CSV is now in the backend directory
    csv_path = '/app/3b2f4a3c.csv'
    flight_id = '3b2f4a3c'
    
    print("=" * 60)
    print("ALEX Sky-Writing Flight Importer (Simple)")
    print(f"Flight ID: {flight_id}")
    print("=" * 60)
    
    engine = create_engine(settings.DATABASE_URL)
    
    try:
        with engine.connect() as conn:
            # Check if aircraft exists
            result = conn.execute(
                text("SELECT id FROM aircraft WHERE registration = :reg"),
                {'reg': 'N624FB'}
            )
            aircraft_row = result.fetchone()
            
            if not aircraft_row:
                print("Creating N624FB aircraft record...")
                result = conn.execute(
                    text('''
                        INSERT INTO aircraft (registration, make, model, operator, is_phoenix_pd, unit_designation)
                        VALUES (:reg, :make, :model, :operator, :is_pd, :unit)
                        RETURNING id
                    '''),
                    {
                        'reg': 'N624FB',
                        'make': 'Airbus',
                        'model': 'H125',
                        'operator': 'Phoenix Police Department',
                        'is_pd': True,
                        'unit': 'FIREBIRD 4'
                    }
                )
                aircraft_id = result.fetchone()[0]
                conn.commit()
                print(f"Created aircraft ID: {aircraft_id}")
            else:
                aircraft_id = aircraft_row[0]
                print(f"Found aircraft ID: {aircraft_id}")
            
            # Check if flight exists
            result = conn.execute(
                text("SELECT id FROM flight_logs WHERE flight_id = :fid"),
                {'fid': flight_id}
            )
            flight_row = result.fetchone()
            
            if flight_row:
                flight_log_id = flight_row[0]
                print(f"Flight already exists with ID: {flight_log_id}")
            else:
                # Read CSV
                print("Reading CSV file...")
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
                
                print(f"Read {len(positions)} positions from CSV")
                
                if positions:
                    departure_time = positions[0]['timestamp']
                    arrival_time = positions[-1]['timestamp']
                    duration_minutes = (arrival_time - departure_time).total_seconds() / 60
                    
                    # Create flight log
                    print("Creating flight log...")
                    result = conn.execute(
                        text('''
                            INSERT INTO flight_logs 
                            (aircraft_id, flight_id, callsign, departure_time, arrival_time, 
                             flight_duration_minutes, departure_airport, arrival_airport, data_source)
                            VALUES 
                            (:aircraft_id, :flight_id, :callsign, :dep_time, :arr_time,
                             :duration, :dep_apt, :arr_apt, :source)
                            RETURNING id
                        '''),
                        {
                            'aircraft_id': aircraft_id,
                            'flight_id': flight_id,
                            'callsign': 'N624FB',
                            'dep_time': departure_time,
                            'arr_time': arrival_time,
                            'duration': duration_minutes,
                            'dep_apt': 'KDVT',
                            'arr_apt': 'KDVT',
                            'source': 'fr24_csv'
                        }
                    )
                    flight_log_id = result.fetchone()[0]
                    conn.commit()
                    print(f"Created flight log ID: {flight_log_id}")
                    
                    # Insert positions in batches
                    print(f"Inserting {len(positions)} positions...")
                    batch_size = 100
                    for i in range(0, len(positions), batch_size):
                        batch = positions[i:i+batch_size]
                        position_records = []
                        for pos in batch:
                            position_records.append({
                                'flight_log_id': flight_log_id,
                                'aircraft_id': aircraft_id,
                                'timestamp': pos['timestamp'],
                                'latitude': pos['latitude'],
                                'longitude': pos['longitude'],
                                'altitude_feet': pos['altitude'],
                                'ground_speed_knots': pos['speed'],
                                'track_degrees': pos['direction'],
                                'data_source': 'fr24_csv'
                            })
                        
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
                    print(f"✓ Successfully imported all positions")
            
            # Verify the import
            result = conn.execute(
                text('''
                    SELECT COUNT(*) as pos_count, 
                           MIN(timestamp) as first_pos,
                           MAX(timestamp) as last_pos
                    FROM flight_positions 
                    WHERE flight_log_id = :fid
                '''),
                {'fid': flight_log_id}
            )
            verify = result.fetchone()
            print(f"\nVerification:")
            print(f"  Positions in database: {verify[0]}")
            print(f"  First position: {verify[1]}")
            print(f"  Last position: {verify[2]}")
            
            # Now run abnormal pattern detection
            print("\n" + "=" * 60)
            print("Running Abnormal Pattern Detection")
            print("=" * 60)
            
            from app.workers.abnormal_pattern_tasks import detect_abnormal_flight_patterns
            
            # Run with very low threshold
            print(f"Starting detection on flight_log_id={flight_log_id}...")
            task = detect_abnormal_flight_patterns.delay(
                flight_id=str(flight_log_id),
                min_complexity_threshold=0.5
            )
            
            print(f"Task ID: {task.id}")
            print("Waiting for results...")
            
            result = task.get(timeout=120)
            print("\nResults:")
            print(json.dumps(result, indent=2, default=str))
            
            # Check if patterns were created
            result = conn.execute(
                text('''
                    SELECT pattern_type, confidence_score, pattern_data
                    FROM abnormal_patterns
                    WHERE flight_log_id = :fid
                '''),
                {'fid': flight_log_id}
            )
            patterns = result.fetchall()
            
            if patterns:
                print(f"\n✓ Found {len(patterns)} abnormal patterns in database:")
                for p in patterns:
                    print(f"  - {p[0]}: confidence {p[1]:.2f}")
            else:
                print("\n⚠ No patterns detected - may need lower thresholds or different detection logic")
                
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    import_alex_flight()