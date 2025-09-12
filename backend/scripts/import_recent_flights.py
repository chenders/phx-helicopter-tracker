#!/usr/bin/env python3
"""
Import recent Phoenix PD helicopter flights using production FR24 API
"""

import asyncio
import sys
import os
from datetime import datetime, timedelta, timezone
import json

# Add the app directory to path
sys.path.insert(0, "/app" if os.path.exists("/app") else "./backend")

# Force production environment
os.environ["FR24_API_ENVIRONMENT"] = "production"


async def import_recent_flights():
    """Import recent Phoenix PD helicopter flights"""
    print("=" * 80)
    print("IMPORTING RECENT PHOENIX PD HELICOPTER FLIGHTS")
    print("Using: PRODUCTION FlightRadar24 API")
    print("=" * 80)

    # Import services after environment is set
    from app.services.flightradar24_api_service import fr24_api_service
    from app.services.tracking_service import unified_tracking_service
    from app.db.database import SessionLocal
    from app.crud.aircraft import aircraft_crud
    from app.crud.flights import flight_log_crud, flight_position_crud
    from app.schemas.flights import FlightLogCreate, FlightPositionCreate

    db = SessionLocal()

    try:
        # Check API status first
        print("\n1. Checking API Status...")
        async with fr24_api_service:
            status = await fr24_api_service.get_service_status()
            print(f"   Environment: {status['environment']}")
            print(f"   API Configured: {status['api_configured']}")

            if fr24_api_service.credit_manager:
                usage = await fr24_api_service.credit_manager.get_usage_stats()
                print(
                    f"   Credits Used: {usage['monthly_used']:,}/{usage['monthly_limit']:,}"
                )
                print(f"   Credits Remaining: {usage['monthly_remaining']:,}")
                print(f"   Usage: {usage['monthly_percentage']:.1f}%")

                if usage["monthly_percentage"] > 90:
                    print("   WARNING: Credit usage is very high!")
                    return

        # Get Phoenix PD aircraft
        print("\n2. Finding Phoenix PD Aircraft...")
        phoenix_aircraft = aircraft_crud.get_phoenix_pd_aircraft(db, active_only=True)
        print(f"   Found {len(phoenix_aircraft)} active Phoenix PD helicopters:")
        for aircraft in phoenix_aircraft:
            print(f"   - {aircraft.registration} ({aircraft.unit_designation})")

        # Get live tracking data first
        print("\n3. Getting Live Tracking Data...")
        async with fr24_api_service:
            live_data = await unified_tracking_service.get_live_tracking_data(
                phoenix_pd_only=True, active_only=False
            )

            print(f"   Found {len(live_data)} aircraft currently active")

            flights_created = 0
            positions_created = 0

            for track in live_data:
                # Find aircraft in database
                aircraft = aircraft_crud.get_by_registration(
                    db, registration=track.aircraft_registration
                )

                if not aircraft:
                    print(
                        f"   WARNING: Aircraft {track.aircraft_registration} not in database"
                    )
                    continue

                # Create flight log
                flight_log = flight_log_crud.create(
                    db,
                    obj_in=FlightLogCreate(
                        aircraft_id=aircraft.id,
                        flight_id=f"live_{aircraft.registration}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                        departure_time=datetime.now(timezone.utc)
                        - timedelta(minutes=30),  # Estimate
                        data_source="flightradar24_live",
                        raw_data={
                            "source": track.data_source.value,
                            "timestamp": track.timestamp.isoformat()
                            if track.timestamp
                            else None,
                            "altitude": track.altitude_feet,
                            "speed": track.ground_speed_knots,
                        },
                    ),
                )
                flights_created += 1

                # Create position record
                position = flight_position_crud.create(
                    db,
                    obj_in=FlightPositionCreate(
                        flight_log_id=flight_log.id,
                        aircraft_id=aircraft.id,
                        timestamp=track.timestamp or datetime.now(timezone.utc),
                        latitude=track.latitude,
                        longitude=track.longitude,
                        altitude_feet=track.altitude_feet,
                        ground_speed_knots=track.ground_speed_knots,
                        track_degrees=track.track_degrees,
                        data_source="flightradar24_live",
                        is_hovering=track.ground_speed_knots
                        and track.ground_speed_knots < 20,
                        altitude_privacy_concern=track.altitude_feet
                        and track.altitude_feet < 400,
                    ),
                )
                positions_created += 1

                print(
                    f"   ✓ {aircraft.registration}: {track.latitude:.4f}, {track.longitude:.4f} @ {track.altitude_feet}ft"
                )

        # Import historical data for the last 24 hours
        print("\n4. Importing Historical Data (Last 24 Hours)...")

        end_date = datetime.now(timezone.utc)
        start_date = end_date - timedelta(days=1)

        print(
            f"   Time range: {start_date.strftime('%Y-%m-%d %H:%M')} to {end_date.strftime('%Y-%m-%d %H:%M')}"
        )

        # Import for each aircraft
        for aircraft in phoenix_aircraft[:3]:  # Limit to 3 aircraft to conserve credits
            print(f"\n   Importing history for {aircraft.registration}...")

            try:
                async with fr24_api_service:
                    # Get historical positions (this uses significant credits)
                    positions = await fr24_api_service.get_historical_positions(
                        timestamp=end_date
                        - timedelta(hours=12),  # Mid-point of last 24 hours
                        registrations=[aircraft.registration],
                    )

                    if positions:
                        # Group positions into flights (2 hour gaps = new flight)
                        current_flight = None

                        for pos in sorted(positions, key=lambda p: p.timestamp):
                            # Create new flight if needed
                            if (
                                not current_flight
                                or (
                                    pos.timestamp - current_flight.departure_time
                                ).total_seconds()
                                > 7200
                            ):
                                current_flight = flight_log_crud.create(
                                    db,
                                    obj_in=FlightLogCreate(
                                        aircraft_id=aircraft.id,
                                        flight_id=f"historical_{aircraft.registration}_{pos.timestamp.strftime('%Y%m%d_%H%M%S')}",
                                        departure_time=pos.timestamp,
                                        data_source="flightradar24_historical",
                                    ),
                                )
                                flights_created += 1

                            # Create position
                            position = flight_position_crud.create(
                                db,
                                obj_in=FlightPositionCreate(
                                    flight_log_id=current_flight.id,
                                    aircraft_id=aircraft.id,
                                    timestamp=pos.timestamp,
                                    latitude=pos.latitude,
                                    longitude=pos.longitude,
                                    altitude_feet=pos.altitude_feet,
                                    ground_speed_knots=pos.ground_speed_knots,
                                    track_degrees=pos.track_degrees,
                                    data_source="flightradar24_historical",
                                ),
                            )
                            positions_created += 1

                        print(
                            f"   ✓ Imported {len(positions)} positions for {aircraft.registration}"
                        )
                    else:
                        print(
                            f"   - No historical data found for {aircraft.registration}"
                        )

            except Exception as e:
                print(f"   ✗ Error importing {aircraft.registration}: {e}")

        # Summary
        print("\n" + "=" * 80)
        print("IMPORT SUMMARY")
        print("=" * 80)
        print(f"Flights Created: {flights_created}")
        print(f"Positions Created: {positions_created}")

        # Check final credit usage
        async with fr24_api_service:
            if fr24_api_service.credit_manager:
                final_usage = await fr24_api_service.credit_manager.get_usage_stats()
                print(
                    f"\nFinal Credit Usage: {final_usage['monthly_used']:,}/{final_usage['monthly_limit']:,}"
                )
                print(f"Credits Used in Import: {final_usage['daily_used']}")

        # Analyze imported data
        print("\n" + "=" * 80)
        print("ANALYZING IMPORTED DATA")
        print("=" * 80)

        # Get flight statistics
        recent_flights = flight_log_crud.get_recent_flights(
            db, hours=24, phoenix_pd_only=True
        )
        print(f"\nFlights in last 24 hours: {len(recent_flights)}")

        for flight in recent_flights[:10]:  # Show first 10
            positions = flight_position_crud.get_by_flight(db, flight_log_id=flight.id)

            if positions:
                min_alt = min(p.altitude_feet for p in positions if p.altitude_feet)
                max_alt = max(p.altitude_feet for p in positions if p.altitude_feet)
                hover_count = sum(1 for p in positions if p.is_hovering)
                low_alt_count = sum(1 for p in positions if p.altitude_privacy_concern)

                print(f"\nFlight: {flight.flight_id}")
                print(f"  Aircraft: {flight.aircraft.registration}")
                print(f"  Time: {flight.departure_time.strftime('%Y-%m-%d %H:%M')}")
                print(f"  Positions: {len(positions)}")
                print(f"  Altitude: {min_alt}-{max_alt} ft")
                print(f"  Hovering positions: {hover_count}")
                print(f"  Low altitude positions: {low_alt_count}")

                if hover_count > 0 or low_alt_count > 0:
                    print(f"  ⚠️  PRIVACY CONCERN: Surveillance pattern detected")

        print("\n" + "=" * 80)
        print("IMPORT COMPLETE!")
        print("=" * 80)

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()


if __name__ == "__main__":
    print("Starting Phoenix PD Helicopter Import...")
    print("Environment: PRODUCTION")
    print("")

    asyncio.run(import_recent_flights())
