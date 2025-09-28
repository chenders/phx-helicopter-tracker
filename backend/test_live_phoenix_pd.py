#!/usr/bin/env python3
"""
Test live Phoenix PD helicopter tracking with production API
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the app directory to path
sys.path.insert(0, "/app" if os.path.exists("/app") else "./backend")

# Force production environment
os.environ["FR24_API_ENVIRONMENT"] = "production"


async def test_live_tracking():
    """Test live Phoenix PD helicopter tracking"""
    print("=" * 80)
    print("PHOENIX PD HELICOPTER LIVE TRACKING TEST")
    print("Using: PRODUCTION FlightRadar24 API")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 80)

    from app.services.flightradar24_api_service import fr24_api_service
    from app.services.tracking_service import unified_tracking_service

    try:
        # Check API status
        print("\n1. API Status:")
        async with fr24_api_service:
            status = await fr24_api_service.get_service_status()
            print(f"   Environment: {status['environment']}")
            print(f"   API Configured: {status['api_configured']}")

            if fr24_api_service.credit_manager:
                usage = await fr24_api_service.credit_manager.get_usage_stats()
                print(
                    f"   Credits: {usage['monthly_used']:,}/{usage['monthly_limit']:,} ({usage['monthly_percentage']:.1f}%)"
                )

        # Try to get Phoenix PD aircraft directly
        print("\n2. Searching for Phoenix PD Aircraft:")
        print("   Registrations: N622FB, N623FB, N624FB, N625FB, N626FB")

        async with fr24_api_service:
            # Try the Phoenix PD specific method
            phoenix_aircraft = await fr24_api_service.get_phoenix_pd_aircraft()

            if phoenix_aircraft:
                print(f"\n   ✓ Found {len(phoenix_aircraft)} Phoenix PD aircraft:")
                for ac in phoenix_aircraft:
                    print(f"   - {ac.registration}:")
                    print(f"     Position: {ac.latitude:.4f}, {ac.longitude:.4f}")
                    print(f"     Altitude: {ac.altitude_feet} ft")
                    print(f"     Speed: {ac.ground_speed_knots} knots")
                    print(f"     Track: {ac.track_degrees}°")
                    if ac.timestamp:
                        print(f"     Time: {ac.timestamp.strftime('%H:%M:%S')}")
            else:
                print("   No Phoenix PD aircraft currently active")

        # Try area search for Phoenix
        # print("\n3. Area Search (Phoenix Metropolitan Area):")
        # async with fr24_api_service:
        #     area_aircraft = await fr24_api_service.get_live_positions_in_area(
        #         lat_min=33.2,
        #         lat_max=33.8,
        #         lon_min=-112.4,
        #         lon_max=-111.6
        #     )
        #
        #     if area_aircraft:
        #         # Filter for helicopters
        #         helicopters = [
        #             ac for ac in area_aircraft
        #             if ac.aircraft_type and 'heli' in ac.aircraft_type.lower()
        #         ]
        #
        #         print(f"   Total aircraft in area: {len(area_aircraft)}")
        #         print(f"   Helicopters: {len(helicopters)}")
        #
        #         # Check for Phoenix PD
        #         phoenix_pd = [
        #             h for h in helicopters
        #             if h.registration and any(
        #                 reg in h.registration
        #                 for reg in ['N622FB', 'N623FB', 'N624FB', 'N625FB', 'N626FB']
        #             )
        #         ]
        #
        #         if phoenix_pd:
        #             print(f"   Phoenix PD helicopters found: {len(phoenix_pd)}")
        #             for h in phoenix_pd:
        #                 print(f"   - {h.registration} at {h.altitude_feet}ft")
        #
        #         # Show other helicopters
        #         other_helis = [h for h in helicopters if h not in phoenix_pd][:5]
        #         if other_helis:
        #             print(f"\n   Other helicopters in area (first 5):")
        #             for h in other_helis:
        #                 print(f"   - {h.registration or 'Unknown'} ({h.aircraft_type})")
        #     else:
        #         print("   No aircraft data available for Phoenix area")
        #
        # Check unified tracking service
        print("\n4. Unified Tracking Service:")
        live_data = await unified_tracking_service.get_live_tracking_data(
            phoenix_pd_only=True, active_only=False
        )

        if live_data:
            print(f"   Found {len(live_data)} Phoenix PD aircraft via unified service")
            for track in live_data:
                print(
                    f"   - {track.aircraft_registration}: Source={track.data_source.value}"
                )
        else:
            print("   No Phoenix PD aircraft found via unified service")

        # Final credit check
        print("\n5. Credit Usage:")
        async with fr24_api_service:
            if fr24_api_service.credit_manager:
                final = await fr24_api_service.credit_manager.get_usage_stats()
                print(f"   Credits used in test: {final['daily_used']}")
                print(f"   Monthly remaining: {final['monthly_remaining']:,}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback

        traceback.print_exc()

    print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(test_live_tracking())
