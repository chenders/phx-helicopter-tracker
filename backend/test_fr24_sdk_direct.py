#!/usr/bin/env python3
"""Test FR24 SDK directly to see what data is available"""

from FlightRadar24 import FlightRadar24API
import json
from datetime import datetime

def test_fr24_sdk():
    fr24 = FlightRadar24API()
    
    # Phoenix area bounds
    phoenix_bounds = "33.7,-112.4,33.2,-111.9"
    
    print("Testing FlightRadar24 SDK...")
    print("=" * 60)
    
    # Test 1: Search for specific helicopter
    print("\n1. Searching for N625FB...")
    try:
        results = fr24.search("N625FB")
        print(f"Search results: {json.dumps(results, indent=2, default=str)[:1000]}...")
        
        if results and 'live' in results and results['live']:
            for live_flight in results['live']:
                flight_id = live_flight.get('id')
                print(f"\nFound flight ID: {flight_id}")
                
                # Try to get flight details
                if flight_id:
                    print(f"Getting flight details for ID: {flight_id}...")
                    try:
                        details = fr24.get_flight_details(flight_id)
                        if details:
                            print(f"Flight details keys: {list(details.keys())}")
                            
                            # Check aircraft data
                            if 'aircraft' in details:
                                print(f"Aircraft data: {json.dumps(details['aircraft'], indent=2, default=str)[:500]}")
                            
                            # Check trail data
                            if 'trail' in details:
                                trail = details['trail']
                                print(f"Trail has {len(trail)} points")
                                if trail:
                                    print(f"Latest trail point: {json.dumps(trail[-1], indent=2, default=str)}")
                                    print(f"First trail point: {json.dumps(trail[0], indent=2, default=str)}")
                        else:
                            print("No flight details returned")
                    except Exception as e:
                        print(f"Error getting flight details: {e}")
    except Exception as e:
        print(f"Search error: {e}")
    
    # Test 2: Get flights in Phoenix area
    print("\n" + "=" * 60)
    print("\n2. Getting flights in Phoenix area...")
    try:
        # Try without bounds first
        print("Getting all flights (no bounds)...")
        all_flights = fr24.get_flights()
        print(f"Total flights worldwide: {len(all_flights)}")
        
        # Check for N625FB globally
        for flight in all_flights:
            reg = getattr(flight, 'registration', None)
            if reg == "N625FB":
                print(f"\n✅ Found N625FB globally!")
                print(f"   All attributes: {vars(flight)}")
                break
        
        # Now try with bounds
        print("\nGetting flights in Phoenix area with bounds...")
        flights = fr24.get_flights(bounds=phoenix_bounds)
        print(f"Found {len(flights)} flights in Phoenix area")
        
        # Look for Phoenix PD helicopters
        phoenix_pd = ["N622FB", "N623FB", "N624FB", "N625FB", "N626FB", "N627FB", "N628FB"]
        
        # First, print all helicopter registrations found
        helis = []
        for flight in flights:
            reg = getattr(flight, 'registration', None)
            if reg and reg.startswith('N'):
                # Check if it's a helicopter based on aircraft type
                aircraft_type = getattr(flight, 'aircraft_code', '')
                if 'H' in aircraft_type or 'AS' in aircraft_type or 'EC' in aircraft_type:
                    helis.append(reg)
        
        if helis:
            print(f"\nHelicopters found: {helis}")
        
        for flight in flights:
            reg = getattr(flight, 'registration', None)
            if reg and reg in phoenix_pd:
                print(f"\n✅ Found Phoenix PD helicopter: {reg}")
                print(f"   Flight attributes: {dir(flight)}")
                print(f"   Registration: {getattr(flight, 'registration', 'N/A')}")
                print(f"   Callsign: {getattr(flight, 'callsign', 'N/A')}")
                print(f"   ID: {getattr(flight, 'id', 'N/A')}")
                print(f"   Latitude: {getattr(flight, 'latitude', 'N/A')}")
                print(f"   Longitude: {getattr(flight, 'longitude', 'N/A')}")
                print(f"   Altitude: {getattr(flight, 'altitude', 'N/A')}")
                print(f"   Ground Speed: {getattr(flight, 'ground_speed', 'N/A')}")
                print(f"   Heading: {getattr(flight, 'heading', 'N/A')}")
                print(f"   Vertical Speed: {getattr(flight, 'vertical_speed', 'N/A')}")
                
                # Try to access as dict
                if hasattr(flight, '__dict__'):
                    print(f"   Flight dict: {json.dumps(flight.__dict__, indent=2, default=str)[:500]}")
                
    except Exception as e:
        print(f"Area search error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_fr24_sdk()