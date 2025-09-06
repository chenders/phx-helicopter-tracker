#!/usr/bin/env python3
"""Test FR24 Official API"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import after loading env
from app.services.fr24_official_api import fr24_official_api

def test_official_api():
    print("Testing FR24 Official API...")
    print("=" * 60)
    
    # Check token
    print(f"API Token configured: {'Yes' if fr24_official_api.api_token else 'No'}")
    print(f"Token (first 10 chars): {fr24_official_api.api_token[:10] if fr24_official_api.api_token else 'N/A'}...")
    
    # Test API
    print("\nFetching Phoenix PD helicopters...")
    aircraft = fr24_official_api.get_phoenix_pd_live()
    
    print(f"\nFound {len(aircraft)} aircraft")
    
    for ac in aircraft:
        print(f"\n{ac.aircraft_registration}:")
        print(f"  Position: {ac.latitude:.4f}, {ac.longitude:.4f}")
        print(f"  Altitude: {ac.altitude_feet} ft")
        print(f"  Speed: {ac.ground_speed_knots} kts")
        print(f"  Heading: {ac.track_degrees}°")
        print(f"  Vertical: {ac.vertical_rate} fpm")
        print(f"  Callsign: {ac.callsign}")
        print(f"  ICAO: {ac.icao_code}")

if __name__ == "__main__":
    test_official_api()