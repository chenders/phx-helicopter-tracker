#!/usr/bin/env python3
"""Test FR24 API directly with raw requests"""

import requests
import json

def test_direct_api():
    # Try the FR24 API endpoints directly
    base_url = "https://data-cloud.flightradar24.com"
    
    print("Testing direct FR24 API...")
    
    # Test 1: Try to get flight details directly
    flight_id = "3bfc9782"  # N625FB's flight ID from search
    
    # Try CDN endpoint
    print(f"\nTrying CDN endpoint for flight {flight_id}...")
    cdn_url = f"https://data-live.flightradar24.com/clickhandler/?version=1.5&flight={flight_id}"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Origin': 'https://www.flightradar24.com',
        'Referer': 'https://www.flightradar24.com/'
    }
    
    try:
        response = requests.get(cdn_url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Response keys: {list(data.keys())}")
            
            # Check for trail data
            if 'trail' in data:
                trail = data['trail']
                print(f"Trail has {len(trail)} points")
                if trail:
                    print(f"Latest position: {trail[-1]}")
            
            # Check for aircraft data
            if 'aircraft' in data:
                print(f"Aircraft: {data['aircraft']}")
                
            # Print identification
            if 'identification' in data:
                ident = data['identification']
                print(f"Identification: {json.dumps(ident, indent=2)}")
                
            # Status info
            if 'status' in data:
                status = data['status']
                print(f"Status: {json.dumps(status, indent=2)}")
                
        else:
            print(f"Error: {response.text[:200]}")
            
    except Exception as e:
        print(f"Request error: {e}")
    
    # Test 2: Try the feed endpoint for Phoenix area
    print("\n" + "=" * 60)
    print("\nTrying feed endpoint for Phoenix area...")
    
    # Phoenix bounds: top-left to bottom-right
    bounds = "33.7,-112.4,33.2,-111.9"
    feed_url = f"https://data-cloud.flightradar24.com/zones/fcgi/feed.js?bounds={bounds}&faa=1&satellite=1&mlat=1&flarm=1&adsb=1&gnd=1&air=1&vehicles=0&estimated=1&maxage=14400&gliders=0&stats=0"
    
    try:
        response = requests.get(feed_url, headers=headers, timeout=10)
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            
            # Look for N625FB
            for key, value in data.items():
                if isinstance(value, list) and len(value) > 8:
                    # Check registration (index 9)
                    if len(value) > 9 and value[9] == "N625FB":
                        print(f"\n✅ Found N625FB!")
                        print(f"   Key: {key}")
                        print(f"   Data: {value}")
                        print(f"   Lat: {value[1]}, Lon: {value[2]}")
                        print(f"   Altitude: {value[4]} ft")
                        print(f"   Speed: {value[5]} kts")
                        print(f"   Track: {value[3]}°")
                        break
        else:
            print(f"Error: {response.text[:200]}")
            
    except Exception as e:
        print(f"Request error: {e}")

if __name__ == "__main__":
    test_direct_api()