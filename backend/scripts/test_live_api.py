#!/usr/bin/env python3
"""
Test the live tracking API endpoint to ensure no validation errors
"""
import asyncio
from app.services.adsb_service import adsb_service
from app.schemas.tracking import LiveTrackingData, TrackingSource


async def test_live_tracking_schema():
    """Test that LiveTrackingData schema validation works"""
    print("Testing LiveTrackingData schema validation...")

    async with adsb_service:
        # Get Phoenix PD aircraft
        positions = await adsb_service.get_phoenix_pd_aircraft()

        print(f"Found {len(positions)} Phoenix PD aircraft")

        for pos in positions:
            print(f"\nTesting {pos.registration}:")
            print(f"  ICAO: {pos.icao}")
            print(f"  Position: {pos.latitude}, {pos.longitude}")
            print(f"  Altitude: {pos.altitude_feet} ft")
            print(f"  Speed: {pos.ground_speed_knots} kts")

            try:
                # Test creating LiveTrackingData object (this is what was failing)
                tracking_data = LiveTrackingData(
                    aircraft_registration=pos.registration or "UNKNOWN",
                    icao_code=pos.icao,
                    timestamp=pos.timestamp,
                    latitude=pos.latitude,
                    longitude=pos.longitude,
                    altitude_feet=pos.altitude_feet,
                    ground_speed_knots=pos.ground_speed_knots,
                    track_degrees=pos.track_degrees,
                    vertical_rate=pos.vertical_rate,
                    is_phoenix_pd=adsb_service.is_phoenix_pd_aircraft(pos.registration),
                    data_source=TrackingSource.ADSB_EXCHANGE,
                    is_hovering=pos.ground_speed_knots and pos.ground_speed_knots < 10,
                    is_circling=False,
                    over_residential=False,
                    privacy_concern=adsb_service.is_likely_surveillance(pos),
                )

                print(f"  ✅ Schema validation PASSED")
                print(f"  Is Phoenix PD: {tracking_data.is_phoenix_pd}")
                print(f"  Is Hovering: {tracking_data.is_hovering}")
                print(f"  Privacy Concern: {tracking_data.privacy_concern}")

            except Exception as e:
                print(f"  ❌ Schema validation FAILED: {e}")


if __name__ == "__main__":
    asyncio.run(test_live_tracking_schema())
