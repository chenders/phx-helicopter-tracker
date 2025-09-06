#!/usr/bin/env python3
"""
Test script to check live tracking for N623FB
"""
import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.services.flightradar24_api_service import fr24_api_service
from app.services.tracking_service import unified_tracking_service
import logging

# Enable debug logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_live_tracking():
    """Test live tracking for N623FB"""
    
    print("🚁 Testing Live Tracking for N623FB")
    print("=" * 50)
    
    try:
        # Test 1: Direct API call for specific aircraft
        print("\n📡 Test 1: Direct FR24 API call for N623FB...")
        async with fr24_api_service:
            positions = await fr24_api_service.get_live_positions_in_area(
                registrations=["N623FB"]
            )
            
            if positions:
                print(f"✅ Found {len(positions)} position(s) for N623FB:")
                for pos in positions:
                    print(f"   - Lat: {pos.latitude:.4f}, Lon: {pos.longitude:.4f}")
                    print(f"   - Altitude: {pos.altitude_feet} ft")
                    print(f"   - Speed: {pos.ground_speed_knots} knots")
                    print(f"   - Callsign: {pos.callsign}")
                    print(f"   - Flight ID: {pos.flight_id}")
            else:
                print("❌ No positions found for N623FB")
        
        # Test 2: Get all Phoenix PD aircraft
        print("\n📡 Test 2: Getting all Phoenix PD aircraft...")
        async with fr24_api_service:
            all_positions = await fr24_api_service.get_phoenix_pd_aircraft()
            
            if all_positions:
                print(f"✅ Found {len(all_positions)} Phoenix PD aircraft in the air:")
                for pos in all_positions:
                    print(f"   - {pos.registration}: Alt {pos.altitude_feet} ft, Speed {pos.ground_speed_knots} kts")
            else:
                print("❌ No Phoenix PD aircraft currently flying")
        
        # Test 3: Test the unified tracking service
        print("\n📡 Test 3: Testing unified tracking service...")
        tracking_data = await unified_tracking_service.get_live_tracking_data(
            phoenix_pd_only=True,
            active_only=True,
            min_altitude=None,
            max_altitude=None
        )
        
        if tracking_data:
            print(f"✅ Unified service found {len(tracking_data)} aircraft:")
            for td in tracking_data:
                print(f"   - {td.aircraft_registration}: {td.latitude:.4f}, {td.longitude:.4f} @ {td.altitude_feet} ft")
        else:
            print("❌ Unified service returned no data")
            
        # Test 4: Check API configuration
        print("\n🔧 API Configuration:")
        print(f"   - API Environment: {fr24_api_service.api_environment}")
        print(f"   - API Key Present: {bool(fr24_api_service.api_key)}")
        print(f"   - Phoenix PD Aircraft: {fr24_api_service.phoenix_pd_aircraft}")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_live_tracking())