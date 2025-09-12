#!/usr/bin/env python3
"""
Test raw FR24 API response to understand data format
"""

import asyncio
import aiohttp
import json
import os
from datetime import datetime

# Force production environment
os.environ["FR24_API_ENVIRONMENT"] = "production"


async def test_raw_api():
    """Test raw FR24 API calls"""
    print("=" * 80)
    print("FR24 RAW API TEST")
    print("=" * 80)

    # Get API key
    api_key = "0198f8ec-7e4c-70e6-b98f-54d1704798b9|I3LmVyOqSVjc8Hsvw8bNkML5guofmFdvOD75YsOCbb1ab15b"
    base_url = "https://fr24api.flightradar24.com/api"

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
        "Accept-Version": "v1",
        "User-Agent": "PhoenixPDTracker/1.0",
    }

    async with aiohttp.ClientSession(headers=headers) as session:
        # Test 1: Simple endpoint
        print("\n1. Testing live/flight-positions/light endpoint...")

        params = {
            "bounds": "33.8,-111.6,33.2,-112.4",  # Format: north,east,south,west
            "limit": 5,
        }

        try:
            async with session.get(
                f"{base_url}/live/flight-positions/light", params=params
            ) as response:
                print(f"   Status: {response.status}")
                print(f"   Headers: {dict(response.headers)}")

                if response.status == 200:
                    data = await response.json()
                    print(f"\n   Response structure:")
                    print(f"   Keys: {list(data.keys())}")

                    if "data" in data:
                        print(f"   Data count: {len(data['data'])}")
                        if data["data"]:
                            print(f"\n   First item structure:")
                            first = data["data"][0]
                            for key, value in first.items():
                                print(f"     {key}: {type(value).__name__} = {value}")

                    # Save full response for analysis
                    with open("/app/data/fr24_response.json", "w") as f:
                        json.dump(data, f, indent=2)
                    print(f"\n   Full response saved to /app/data/fr24_response.json")

                else:
                    text = await response.text()
                    print(f"   Error response: {text}")

        except Exception as e:
            print(f"   Error: {e}")

        # Test 2: Search for Phoenix PD registrations
        print("\n2. Testing search for Phoenix PD registrations...")

        phoenix_regs = [
            "N622FB",
            "N623FB",
            "N624FB",
            "N625FB",
            "N626FB",
            "N627FB",
            "N628FB",
        ]
        params = {"registrations": ",".join(phoenix_regs), "limit": 10}

        try:
            async with session.get(
                f"{base_url}/live/flight-positions/full", params=params
            ) as response:
                print(f"   Status: {response.status}")

                if response.status == 200:
                    data = await response.json()
                    print(f"   Found: {len(data.get('data', []))} results")

                    if data.get("data"):
                        print(f"\n   Aircraft data:")
                        aircraft = data["data"][0]
                        for key, value in aircraft.items():
                            if value is not None:
                                print(f"     {key}: {value}")
                else:
                    text = await response.text()
                    print(f"   Error: {text}")

        except Exception as e:
            print(f"   Error: {e}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(test_raw_api())
