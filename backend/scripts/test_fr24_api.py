#!/usr/bin/env python3
"""
Test script for FlightRadar24 API integration
Tests all major functionality without using excessive credits
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta

# Add the app directory to path
sys.path.insert(0, "/app" if os.path.exists("/app") else "./backend")


async def test_fr24_api():
    """Test FR24 API functionality"""
    print("=" * 60)
    print("FlightRadar24 API Test Suite")
    print("=" * 60)

    # Import after path is set
    from app.services.flightradar24_api_service import fr24_api_service

    async with fr24_api_service:
        # Test 1: Service Status
        print("\n1. Testing Service Status...")
        status = await fr24_api_service.get_service_status()
        print(f"   Environment: {status['environment']}")
        print(f"   API Configured: {status['api_configured']}")
        print(f"   Cache Enabled: {status['cache_enabled']}")
        print(f"   Monthly Credits: {status['credit_usage'].get('monthly_limit', 0)}")

        # Test 2: Credit Manager
        print("\n2. Testing Credit Manager...")
        if fr24_api_service.credit_manager:
            usage = await fr24_api_service.credit_manager.get_usage_stats()
            print(f"   Monthly Used: {usage['monthly_used']}/{usage['monthly_limit']}")
            print(f"   Percentage Used: {usage['monthly_percentage']:.1f}%")
            print(f"   Daily Used: {usage['daily_used']}")
        else:
            print("   Credit manager not initialized!")

        # Test 3: Phoenix PD Aircraft (uses credits!)
        print("\n3. Testing Phoenix PD Aircraft Tracking...")
        print("   WARNING: This will use API credits!")
        response = input("   Continue? (y/n): ")

        if response.lower() == "y":
            aircraft = await fr24_api_service.get_phoenix_pd_aircraft()
            print(f"   Found {len(aircraft)} Phoenix PD aircraft")

            for ac in aircraft[:2]:  # Show first 2
                print(
                    f"   - {ac.registration}: {ac.latitude:.4f}, {ac.longitude:.4f} @ {ac.altitude_feet}ft"
                )

        # Test 4: Polling Interval
        print("\n4. Testing Intelligent Polling...")
        interval = fr24_api_service.get_current_polling_interval()
        hour = datetime.now().hour
        expected = "peak" if 6 <= hour < 22 else "night"
        print(f"   Current hour: {hour}:00")
        print(f"   Expected mode: {expected}")
        print(f"   Polling interval: {interval} seconds")

        # Test 5: Area Search (uses credits!)
        print("\n5. Testing Area Search...")
        print("   WARNING: This will use API credits!")
        response = input("   Continue? (y/n): ")

        if response.lower() == "y":
            positions = await fr24_api_service.get_live_positions_in_area()
            print(f"   Found {len(positions)} aircraft in Phoenix area")

            # Filter for helicopters
            helicopters = [
                p for p in positions if "helicopter" in (p.aircraft_type or "").lower()
            ]
            print(f"   Helicopters: {len(helicopters)}")

        # Test 6: Historical Data (uses many credits!)
        print("\n6. Testing Historical Data...")
        print("   WARNING: This uses significant credits (50-100)!")
        response = input("   Continue? (y/n): ")

        if response.lower() == "y":
            yesterday = datetime.now() - timedelta(days=1)
            historical = await fr24_api_service.get_historical_positions(
                timestamp=yesterday, registrations=["N623FB", "N624FB"]
            )
            print(f"   Found {len(historical)} historical positions")

        # Test 7: Cache Test
        print("\n7. Testing Cache...")
        print("   Making same request twice (second should be cached)...")

        import time

        start = time.time()
        positions1 = await fr24_api_service.get_phoenix_pd_aircraft()
        time1 = time.time() - start

        start = time.time()
        positions2 = await fr24_api_service.get_phoenix_pd_aircraft()
        time2 = time.time() - start

        print(f"   First request: {time1:.3f}s")
        print(f"   Second request: {time2:.3f}s (should be faster)")
        print(f"   Cache working: {time2 < time1 * 0.5}")

        # Final credit check
        print("\n8. Final Credit Check...")
        if fr24_api_service.credit_manager:
            usage = await fr24_api_service.credit_manager.get_usage_stats()
            print(f"   Credits used in this test: {usage['daily_used']}")
            print(f"   Monthly remaining: {usage['monthly_remaining']}")

    print("\n" + "=" * 60)
    print("Test Complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_fr24_api())
