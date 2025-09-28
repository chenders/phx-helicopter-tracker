#!/usr/bin/env python3
"""
Test FR24 API to search for flights by registration
"""
import os
import requests
from datetime import datetime, timezone, timedelta
import json

# Configuration
FR24_API_KEY = os.getenv("FR24_API_KEY_PRODUCTION")
base_url = "https://fr24api.flightradar24.com/api"

# Headers for all requests
headers = {
    "Authorization": f"Bearer {FR24_API_KEY}",
    "Accept": "application/json",
    "Accept-Version": "v1",
}

def search_by_registration(registration):
    """Search for flights by registration number"""
    print(f"\n{'='*80}")
    print(f"SEARCHING FOR FLIGHTS BY REGISTRATION: {registration}")
    print('='*80)
    
    # Try the flights endpoint with registration filter
    endpoint = f"{base_url}/flights"
    params = {
        "registration": registration,
        "limit": 10
    }
    
    print(f"Request: GET {endpoint}")
    print(f"Params: {params}")
    
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response type: {type(data)}")
            
            if isinstance(data, dict):
                print(f"Response keys: {list(data.keys())}")
                # Save for inspection
                with open(f'search_{registration}.json', 'w') as f:
                    json.dump(data, f, indent=2)
                print(f"Saved to search_{registration}.json")
                
                # Check for flights
                if 'data' in data:
                    flights = data['data']
                    if flights:
                        print(f"Found {len(flights)} flights for {registration}")
                        for flight in flights[:3]:
                            print(f"  Flight ID: {flight.get('flight_id')}")
                            print(f"  From: {flight.get('origin')} To: {flight.get('destination')}")
                            print(f"  Time: {flight.get('scheduled_departure_time')}")
                        return flights
                    else:
                        print(f"No flights found for {registration}")
            elif isinstance(data, list):
                if data:
                    print(f"Found {len(data)} flights")
                    return data
                else:
                    print("No flights found")
        else:
            print(f"Error: {response.text}")
            
    except Exception as e:
        print(f"Request failed: {e}")
    
    return None

def search_historic_by_registration(registration):
    """Search for historic flights by registration"""
    print(f"\n{'-'*80}")
    print(f"SEARCHING HISTORIC FLIGHTS FOR: {registration}")
    print('-'*80)
    
    # Try different time ranges
    now = datetime.now(timezone.utc)
    for days_back in [1, 7, 30]:
        start_date = now - timedelta(days=days_back)
        
        endpoint = f"{base_url}/historic/flights"
        params = {
            "registration": registration,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": now.strftime("%Y-%m-%d"),
            "limit": 10
        }
        
        print(f"\nSearching from {params['from']} to {params['to']}")
        print(f"Request: GET {endpoint}")
        
        try:
            response = requests.get(endpoint, params=params, headers=headers, timeout=30)
            print(f"Response status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if data:
                    print(f"Found historic flights!")
                    with open(f'historic_{registration}_{days_back}d.json', 'w') as f:
                        json.dump(data, f, indent=2)
                    return data
            elif response.status_code == 404:
                print("Endpoint not found")
            else:
                print(f"Error: {response.text[:200]}")
        except Exception as e:
            print(f"Request failed: {e}")
    
    return None

def main():
    """Main test function"""
    print("\nFR24 API Flight Search Test")
    print("="*80)
    
    if not FR24_API_KEY:
        print("ERROR: FR24_API_KEY_PRODUCTION not set!")
        return
    
    print(f"API Key: {FR24_API_KEY[:20]}...")
    
    # Test with known Phoenix PD helicopters
    registrations = ["N621FB", "N624FB", "N625FB"]
    
    for reg in registrations:
        # Try regular search
        flights = search_by_registration(reg)
        
        # Try historic search
        historic = search_historic_by_registration(reg)
        
        if flights or historic:
            print(f"\n✓ Found data for {reg}")
            break
    
    # Also try searching for any N-registered aircraft in Phoenix area
    print("\n" + "="*80)
    print("SEARCHING FOR ALL FLIGHTS IN PHOENIX AREA")
    print("="*80)
    
    endpoint = f"{base_url}/flights"
    params = {
        "bounds": "33.8,33.2,-112.4,-111.8",
        "limit": 20
    }
    
    print(f"Request: GET {endpoint}")
    print(f"Params: {params}")
    
    try:
        response = requests.get(endpoint, params=params, headers=headers, timeout=30)
        print(f"Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            with open('phoenix_area_flights.json', 'w') as f:
                json.dump(data, f, indent=2)
            print("Saved to phoenix_area_flights.json")
    except Exception as e:
        print(f"Request failed: {e}")

if __name__ == "__main__":
    main()