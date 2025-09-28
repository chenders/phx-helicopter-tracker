#!/usr/bin/env python3
"""Test FR24 API directly with curl equivalent"""

import os
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Force production environment for testing real data
environment = "production"
api_token = os.getenv("FR24_API_KEY_PRODUCTION", "")

# Extract just the token part (after the |)
if api_token and "|" in api_token:
    api_token = api_token.split("|")[1]

print(f"Using {environment} environment")
print(f"Token (first 10 chars): {api_token[:10]}...")

# Test 1: Search by specific registration
print("\n" + "=" * 60)
print("Test 1: Search for N625FB by registration")

url = "https://fr24api.flightradar24.com/api/live/flight-positions/light"
headers = {
    "Accept": "application/json",
    "Accept-Version": "v1",
    "Authorization": f"Bearer {api_token}",
}

params = {"registrations": "N625FB"}

response = requests.get(url, headers=headers, params=params)
print(f"Status: {response.status_code}")
print(f"Response: {response.text[:500]}")

# Test 2: Search Phoenix area
print("\n" + "=" * 60)
print("Test 2: Search Phoenix area by bounds")

params = {"bounds": "33.7,33.2,-112.4,-111.9"}

response = requests.get(url, headers=headers, params=params)
print(f"Status: {response.status_code}")

if response.status_code == 200:
    data = response.json()
    flights = data.get("data", [])
    print(f"Found {len(flights)} flights in Phoenix area")

    # Look for helicopters
    phoenix_pd = ["N622FB", "N623FB", "N621FB", "N622FB", "N623FB", "N624FB", "N625FB"]

    for flight in flights[:10]:  # Show first 10
        reg = flight.get("reg", "N/A")
        callsign = flight.get("callsign", "N/A")
        aircraft_type = flight.get("type", "N/A")
        alt = flight.get("alt", "N/A")

        if reg in phoenix_pd:
            print(
                f"  ✅ Phoenix PD: {reg} ({callsign}) - Type: {aircraft_type}, Alt: {alt} ft"
            )
        else:
            print(f"  {reg} ({callsign}) - Type: {aircraft_type}, Alt: {alt} ft")
else:
    print(f"Error: {response.text}")
