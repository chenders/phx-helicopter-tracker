#!/usr/bin/env python3
"""
Directly download the ALEX incident flight using the known flight ID
"""
import sys
sys.path.insert(0, '/app')

from app.workers.data_import_tasks import import_fr24_complete_flights
from app.workers.abnormal_pattern_tasks import detect_abnormal_flight_patterns, analyze_alex_incident

# Based on FlightAware link, the flight was on July 10, 2025
# We need to find the FR24 flight ID for this specific flight
# The flight departed KDVT at 06:28Z and returned to KDVT

# These are potential flight IDs from our earlier search
POTENTIAL_ALEX_FLIGHTS = ['3b3311b0', '3b2f4a3c']

print("=" * 60)
print("ALEX Sky-Writing Incident - Direct Download")
print("=" * 60)

for flight_id in POTENTIAL_ALEX_FLIGHTS:
    print(f"\nAttempting to download flight: {flight_id}")
    
    try:
        # Import the flight
        result = import_fr24_complete_flights([flight_id])
        
        if result and result.get('success'):
            imported = result.get('imported', [])
            if imported:
                print(f"✓ Successfully imported flight {flight_id}")
                print(f"  Positions: {imported[0].get('positions_count', 0)}")
                print(f"  Duration: {imported[0].get('duration_minutes', 0):.2f} minutes")
                
                # Run pattern detection with lower threshold
                print("\nRunning abnormal pattern detection...")
                celery_task = detect_abnormal_flight_patterns.delay(
                    flight_id=flight_id,
                    min_complexity_threshold=1.0  # Very low threshold
                )
                
                detection_result = celery_task.get(timeout=120)
                
                if detection_result.get('patterns_found'):
                    print(f"✓ Found {detection_result['patterns_found']} patterns!")
                    for pattern in detection_result.get('patterns', []):
                        print(f"  - {pattern['pattern_type']}: {pattern['description']}")
                else:
                    print("No patterns detected")
        else:
            error = result.get('error', 'Unknown error')
            print(f"Failed to import: {error}")
            
    except Exception as e:
        print(f"Error: {e}")

print("\n" + "=" * 60)
print("Completed ALEX flight download attempt")
print("=" * 60)