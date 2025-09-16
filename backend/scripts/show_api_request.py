#!/usr/bin/env python3
"""
Show example FR24 API request for historical flight data
"""
import os
from datetime import datetime, timezone

# Configuration
FR24_API_KEY = os.getenv("FR24_API_KEY_PRODUCTION", "YOUR_API_KEY")
base_url = "https://fr24api.flightradar24.com/api"

# Phoenix area bounds
phoenix_bounds = {
    "lat_min": 33.2,
    "lat_max": 33.8,
    "lon_min": -112.4,
    "lon_max": -111.8
}

# Example timestamp (September 10, 2025 at 12:00 PM UTC)
timestamp = datetime(2025, 9, 10, 12, 0, 0, tzinfo=timezone.utc)

# Build the request
endpoint = f"{base_url}/historic/flight-positions/light"

# Parameters
params = {
    "timestamp": int(timestamp.timestamp()),  # Unix timestamp: 1757505600
    "bounds": f"{phoenix_bounds['lat_max']},{phoenix_bounds['lat_min']},{phoenix_bounds['lon_min']},{phoenix_bounds['lon_max']}",
    # Results in: "33.8,33.2,-112.4,-111.8"
    "registrations": "N621FB,N622FB,N623FB,N624FB,N625FB"  # Optional: specific aircraft
}

# Headers
headers = {
    "Accept": "application/json",
    "x-fr24-key": FR24_API_KEY
}

print("EXACT API REQUEST:")
print("=" * 80)
print(f"Method: GET")
print(f"URL: {endpoint}")
print(f"\nQuery Parameters:")
for key, value in params.items():
    print(f"  {key}: {value}")
print(f"\nHeaders:")
for key, value in headers.items():
    if key == "x-fr24-key":
        print(f"  {key}: [REDACTED]")
    else:
        print(f"  {key}: {value}")

print("\nFull URL with parameters:")
param_string = "&".join([f"{k}={v}" for k, v in params.items()])
print(f"{endpoint}?{param_string}")

print("\nExample cURL command:")
print(f"""curl -X GET \\
  "{endpoint}?timestamp={params['timestamp']}&bounds={params['bounds']}&registrations={params['registrations']}" \\
  -H "Accept: application/json" \\
  -H "x-fr24-key: YOUR_API_KEY"
""")

print("\nNote: This requests historical positions for Phoenix PD helicopters")
print("at September 10, 2025 12:00 PM UTC within the Phoenix area bounds.")