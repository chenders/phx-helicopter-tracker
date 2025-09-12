#!/usr/bin/env python3
"""Test parsing FR24 API response"""

import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Use production API
api_token = os.getenv("FR24_API_KEY_PRODUCTION", "")
if api_token and "|" in api_token:
    api_token = api_token.split("|")[1]

print("Testing FR24 API Response Parsing")
print("=" * 60)

# Test specific helicopter
url = "https://fr24api.flightradar24.com/api/live/flight-positions/light"
headers = {
    "Accept": "application/json",
    "Accept-Version": "v1",
    "Authorization": f"Bearer {api_token}",
}

params = {"registrations": "N625FB,N622FB,N623FB,N624FB,N626FB,N627FB,N628FB"}

response = requests.get(url, headers=headers, params=params)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    flights = data.get("data", [])
    print(f"Found {len(flights)} Phoenix PD helicopters")

    for flight in flights:
        print(f"\nFlight data structure:")
        print(json.dumps(flight, indent=2))

        # Parse the data
        print(f"\nParsed data:")
        print(f"  FR24 ID: {flight.get('fr24_id')}")
        print(f"  Hex: {flight.get('hex')}")
        print(f"  Callsign: {flight.get('callsign')}")
        print(f"  Position: {flight.get('lat')}, {flight.get('lon')}")
        print(f"  Altitude: {flight.get('alt')} ft")
        print(f"  Speed: {flight.get('gspeed')} kts")
        print(f"  Track: {flight.get('track')}°")
        print(f"  Vertical: {flight.get('vspeed')} fpm")
        print(f"  Squawk: {flight.get('squawk')}")
        print(f"  Source: {flight.get('source')}")

        # The light endpoint doesn't return registration directly
        # We need to map from our request or use the callsign
        if flight.get("callsign") in [
            "N625FB",
            "N622FB",
            "N623FB",
            "N624FB",
            "N626FB",
            "N627FB",
            "N628FB",
        ]:
            print(f"  ✅ Identified as Phoenix PD: {flight.get('callsign')}")
else:
    print(f"Error: {response.text}")
