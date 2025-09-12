#!/usr/bin/env python3
"""
Test FlightRadar24 SDK to get live data
"""
from FlightRadar24 import FlightRadar24API

# Initialize the API
fr24 = FlightRadar24API()

print("🚁 Testing FlightRadar24 SDK")
print("=" * 50)

# Test 1: Search for specific aircraft by registration
print("\n📡 Searching for N623FB...")
flights = fr24.get_flights()  # Get all current flights

# Filter for Phoenix area (approximate bounds)
phoenix_lat_min, phoenix_lat_max = 33.2, 33.7
phoenix_lon_min, phoenix_lon_max = -112.4, -111.9

phoenix_flights = []
for flight in flights:
    if (
        phoenix_lat_min <= flight.latitude <= phoenix_lat_max
        and phoenix_lon_min <= flight.longitude <= phoenix_lon_max
    ):
        phoenix_flights.append(flight)
        print(f"Found aircraft in Phoenix area:")
        print(
            f"  - Registration: {flight.registration if hasattr(flight, 'registration') else 'N/A'}"
        )
        print(f"  - Callsign: {flight.callsign}")
        print(f"  - Position: {flight.latitude:.4f}, {flight.longitude:.4f}")
        print(f"  - Altitude: {flight.altitude} ft")
        print(f"  - Speed: {flight.ground_speed} kts")
        print(
            f"  - Aircraft: {flight.aircraft_code if hasattr(flight, 'aircraft_code') else 'N/A'}"
        )
        print()

print(f"\n✅ Found {len(phoenix_flights)} aircraft in Phoenix area")

# Test 2: Try to get specific aircraft by registration
print("\n📡 Trying to find specific registrations...")
phoenix_pd_helis = [
    "N622FB",
    "N623FB",
    "N624FB",
    "N625FB",
    "N626FB",
    "N627FB",
    "N628FB",
]

for reg in phoenix_pd_helis:
    print(f"Searching for {reg}...")
    # Search through all flights for matching registration
    for flight in flights:
        if hasattr(flight, "registration") and flight.registration == reg:
            print(f"  ✅ FOUND {reg}!")
            print(f"     - Position: {flight.latitude:.4f}, {flight.longitude:.4f}")
            print(f"     - Altitude: {flight.altitude} ft")
            break
    else:
        # Also check if it might be in the callsign
        for flight in flights:
            if flight.callsign and reg in flight.callsign:
                print(f"  ✅ FOUND {reg} (via callsign {flight.callsign})!")
                print(f"     - Position: {flight.latitude:.4f}, {flight.longitude:.4f}")
                print(f"     - Altitude: {flight.altitude} ft")
                break
        else:
            print(f"  ❌ {reg} not currently flying")

print("\n📊 Note: The SDK returns limited data for each flight in the free tier")
