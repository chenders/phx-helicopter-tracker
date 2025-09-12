#!/usr/bin/env python3
"""
Test FR24 API flight-tracks endpoint with proper flight ID retrieval
"""
import os
import requests
from datetime import datetime, timezone, timedelta
import json

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

def search_recent_flights():
    """Search for recent flights using the historic flight positions endpoint"""
    print("\n" + "="*80)
    print("SEARCHING FOR RECENT HELICOPTER FLIGHTS")
    print("="*80)
    
    # Try different time windows to find flights
    now = datetime.now(timezone.utc)
    time_windows = [
        now - timedelta(hours=1),
        now - timedelta(hours=6),
        now - timedelta(hours=12),
        now - timedelta(hours=24),
        now - timedelta(days=2),
    ]
    
    for timestamp in time_windows:
        print(f"\nSearching at {timestamp.isoformat()}...")
        
        # Use the light endpoint for faster results
        endpoint = f"{base_url}/historic/flight-positions/light"
        params = {
            "timestamp": int(timestamp.timestamp()),
            "bounds": f"{phoenix_bounds['lat_max']},{phoenix_bounds['lat_min']},{phoenix_bounds['lon_min']},{phoenix_bounds['lon_max']}",
        }
        
        print(f"Request: GET {endpoint}")
        print(f"Params: {params}")
        
        try:
            response = requests.get(endpoint, params=params, headers=headers, timeout=30)
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Debug: see what we got
                print(f"Response type: {type(data)}")
                if isinstance(data, dict):
                    print(f"Response keys: {list(data.keys())}")
                    
                    # Save first response for debugging
                    if timestamp == time_windows[0]:
                        with open('fr24_response_sample.json', 'w') as f:
                            json.dump(data, f, indent=2)
                        print("Saved response to fr24_response_sample.json")
                    
                    # Check for different possible structures
                    flights_data = None
                    if 'data' in data:
                        flights_data = data['data']
                    elif 'flights' in data:
                        flights_data = data['flights']
                    elif 'result' in data:
                        flights_data = data['result']
                    else:
                        # Show sample of response for debugging
                        print(f"Sample response: {json.dumps(data, indent=2)[:500]}...")
                    
                    # If we have flight data, process it
                    if flights_data:
                        if isinstance(flights_data, list):
                            helicopters = [f for f in flights_data if f.get('registration', '').startswith('N62')]
                            if helicopters:
                                print(f"Found {len(helicopters)} Phoenix PD helicopters!")
                                for heli in helicopters[:3]:
                                    print(f"  - {heli.get('registration')} (Flight ID: {heli.get('flight_id')})")
                                return helicopters
                            else:
                                all_aircraft = [f.get('registration') for f in flights_data if f.get('registration')]
                                print(f"Found {len(flights_data)} aircraft, but no Phoenix PD helicopters")
                                if all_aircraft:
                                    print(f"Sample registrations: {all_aircraft[:10]}")
                                # Also look for any helicopters (not just Phoenix PD)
                                helis = [f for f in flights_data if f.get('registration', '').startswith('N') and 
                                        (f.get('aircraft_type', '').upper() in ['HELI', 'HELICOPTER', 'H'] or
                                         'heli' in f.get('model', '').lower() if f.get('model') else False)]
                                if helis:
                                    print(f"Found {len(helis)} helicopters:")
                                    for h in helis[:5]:
                                        print(f"  - {h.get('registration')} ({h.get('model', 'Unknown model')})")
                        elif isinstance(flights_data, dict):
                            # Maybe keyed by registration or flight ID
                            print(f"Flights data is dict with keys: {list(flights_data.keys())[:5]}")
                            # Look for helicopters in dict values
                            helicopters = []
                            for key, value in flights_data.items():
                                if isinstance(value, dict) and value.get('registration', '').startswith('N62'):
                                    helicopters.append(value)
                            if helicopters:
                                print(f"Found {len(helicopters)} Phoenix PD helicopters!")
                                return helicopters
                elif isinstance(data, list):
                    helicopters = [f for f in data if f.get('registration', '').startswith('N62')]
                    if helicopters:
                        print(f"Found {len(helicopters)} Phoenix PD helicopters!")
                        return helicopters
                    else:
                        print(f"Found {len(data)} aircraft, no Phoenix PD helicopters")
                    
            elif response.status_code == 401:
                print("Authentication failed!")
                print(f"Response: {response.text}")
                return None
            else:
                print(f"Error: {response.text}")
                
        except Exception as e:
            print(f"Request failed: {e}")
    
    return []

def get_flight_tracks(flight_id):
    """Get detailed flight track data for a specific flight"""
    print(f"\n" + "-"*80)
    print(f"GETTING FLIGHT TRACKS FOR ID: {flight_id}")
    print("-"*80)
    
    endpoint = f"{base_url}/flight-tracks"
    params = {
        "flight_id": flight_id
    }
    
    print(f"Request: GET {endpoint}")
    print(f"Params: {params}")
    
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            
            # Check what we got
            if isinstance(data, dict):
                if 'tracks' in data:
                    tracks = data['tracks']
                    print(f"Got {len(tracks)} track points")
                    if tracks:
                        # Show sample points
                        print("\nFirst 3 track points:")
                        for point in tracks[:3]:
                            print(f"  Time: {point.get('timestamp')}, "
                                  f"Lat: {point.get('latitude')}, "
                                  f"Lon: {point.get('longitude')}, "
                                  f"Alt: {point.get('altitude')}")
                        return data
                else:
                    print(f"Response structure: {list(data.keys())}")
            else:
                print(f"Unexpected response type: {type(data)}")
                
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")
    
    return None

def main():
    """Main test function"""
    print("\nFR24 API Flight Tracks Test")
    print("="*80)
    
    if not FR24_API_KEY:
        print("ERROR: FR24_API_KEY_PRODUCTION not set!")
        return
    
    print(f"API Key: {FR24_API_KEY[:20]}...")
    
    # Step 1: Search for recent flights
    flights = search_recent_flights()
    
    if not flights:
        print("\nNo flights found to test with")
        return
    
    # Step 2: Get tracks for first flight found
    first_flight = flights[0]
    flight_id = first_flight.get('flight_id')
    
    if flight_id:
        print(f"\nTesting with flight: {first_flight.get('registration')} (ID: {flight_id})")
        tracks = get_flight_tracks(flight_id)
        
        if tracks:
            print("\nSUCCESS! Got flight track data")
            # Save for inspection
            with open('flight_tracks_sample.json', 'w') as f:
                json.dump(tracks, f, indent=2)
            print("Saved full response to flight_tracks_sample.json")
    else:
        print("No flight_id found in response")

if __name__ == "__main__":
    main()