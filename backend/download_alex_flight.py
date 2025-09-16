#!/usr/bin/env python3
"""
Download the specific ALEX sky-writing incident flight from FlightRadar24
Flight: N624FB on July 10, 2025 06:28Z from KDVT
"""
import os
import sys
sys.path.insert(0, '/app')

from datetime import datetime, timezone
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.services.flightradar24_api_service import FlightRadar24APIService
from app.workers.data_import_tasks import import_fr24_complete_flights
import asyncio
import json

async def download_alex_incident():
    """Download and import the ALEX sky-writing incident flight"""
    
    print("=" * 60)
    print("ALEX Sky-Writing Incident Flight Downloader")
    print("Target: N624FB on July 10, 2025 06:28Z from KDVT")
    print("=" * 60)
    
    # Initialize FR24 API service
    fr24_service = FlightRadar24APIService()
    
    # The flight was on July 10, 2025 around 06:28Z
    # Convert to local time for the search (MST = UTC-7)
    start_date = datetime(2025, 7, 10, 0, 0, 0, tzinfo=timezone.utc)
    end_date = datetime(2025, 7, 10, 23, 59, 59, tzinfo=timezone.utc)
    
    try:
        # Get flight summary for N624FB on that date
        print(f"\nSearching for N624FB flights on July 10, 2025...")
        search_results = await fr24_service.get_flight_summary(
            registration="N624FB",
            start_date=start_date,
            end_date=end_date
        )
        
        if not search_results:
            print("No search results found")
            return
            
        flights = search_results.get('data', [])
        print(f"Found {len(flights)} flights in time window")
        
        # Display all flights found
        print("\nFlights found:")
        for i, flight in enumerate(flights):
            flight_id = flight.get('flight_id')
            dep_time = flight.get('time_details', {}).get('real', {}).get('departure')
            arr_time = flight.get('time_details', {}).get('real', {}).get('arrival')
            
            if dep_time:
                dep_str = datetime.fromtimestamp(dep_time, tz=timezone.utc).strftime('%H:%M:%S UTC')
            else:
                dep_str = "Unknown"
                
            if arr_time:
                arr_str = datetime.fromtimestamp(arr_time, tz=timezone.utc).strftime('%H:%M:%S UTC')
                duration = (arr_time - dep_time) / 60 if dep_time else 0
            else:
                arr_str = "Unknown"
                duration = 0
                
            print(f"  {i+1}. Flight ID: {flight_id}")
            print(f"     Departure: {dep_str}, Arrival: {arr_str}")
            print(f"     Duration: {duration:.1f} minutes")
            
            # The ALEX incident was approximately 1 hour 48 minutes (108 minutes)
            if 100 <= duration <= 115:
                print(f"     *** LIKELY ALEX INCIDENT FLIGHT (duration matches ~108 min) ***")
        
        # Look for the most likely ALEX flight (around 06:28Z departure, ~108 minute duration)
        target_flight = None
        for flight in flights:
            dep_time = flight.get('time_details', {}).get('real', {}).get('departure')
            arr_time = flight.get('time_details', {}).get('real', {}).get('arrival')
            
            if dep_time and arr_time:
                duration = (arr_time - dep_time) / 60
                dep_hour = datetime.fromtimestamp(dep_time, tz=timezone.utc).hour
                dep_minute = datetime.fromtimestamp(dep_time, tz=timezone.utc).minute
                
                # Looking for flight departing around 06:28Z with duration ~108 minutes
                if 6 <= dep_hour <= 7 and 100 <= duration <= 115:
                    target_flight = flight
                    break
        
        if not target_flight:
            # Just take the first flight as a fallback
            if flights:
                print("\nCouldn't identify exact ALEX flight, using first flight found")
                target_flight = flights[0]
            else:
                print("No flights found to process")
                return
        
        flight_id = target_flight.get('flight_id')
        print(f"\n{'=' * 60}")
        print(f"Selected flight for download: {flight_id}")
        print(f"{'=' * 60}")
        
        # Check if we already have this flight with positions
        session = SessionLocal()
        try:
            existing = session.query(FlightLog).filter(FlightLog.flight_id == flight_id).first()
            if existing and existing.has_complete_track:
                print(f"Flight {flight_id} already has complete track data")
            else:
                if existing:
                    print(f"Flight {flight_id} exists but needs track data")
                else:
                    print(f"Flight {flight_id} not in database")
            
            # Use the import task directly
            print(f"\nCalling import_fr24_complete_flights for {flight_id}...")
            result = import_fr24_complete_flights([flight_id])
            
            if result and result.get('success'):
                imported = result.get('imported', [])
                if imported:
                    print(f"\n✓ Successfully imported flight {flight_id}")
                    print(f"  Positions: {imported[0].get('positions_count', 0)}")
                    print(f"  Duration: {imported[0].get('duration_minutes', 0):.2f} minutes")
                    
                    # Now run abnormal pattern detection with lower thresholds
                    print("\n" + "=" * 60)
                    print("Running Abnormal Pattern Detection")
                    print("=" * 60)
                    
                    from app.workers.abnormal_pattern_tasks import detect_abnormal_patterns_task
                    
                    # Run with lower complexity threshold to catch sky-writing
                    print("Starting detection with min_complexity_threshold=1.5...")
                    celery_task = detect_abnormal_patterns_task.delay(
                        flight_id=flight_id,
                        min_complexity_threshold=1.5  # Lower threshold for sky-writing
                    )
                    print(f"Task ID: {celery_task.id}")
                    
                    # Wait for completion
                    print("Waiting for pattern detection...")
                    detection_result = celery_task.get(timeout=120)
                    
                    if detection_result.get('patterns_found'):
                        print(f"\n✓ Found {detection_result['patterns_found']} abnormal patterns!")
                        for pattern in detection_result.get('patterns', []):
                            print(f"\n  Pattern Type: {pattern['pattern_type']}")
                            print(f"  Confidence: {pattern['confidence_score']:.2f}")
                            print(f"  Description: {pattern['description']}")
                    else:
                        print("\n⚠ No abnormal patterns detected with current thresholds")
                        print("The sky-writing may require even lower thresholds or different detection logic")
                else:
                    print("No flights were imported")
            else:
                print(f"Failed to import flight: {result}")
                
        finally:
            session.close()
            
    except Exception as e:
        print(f"\nError: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(download_alex_incident())