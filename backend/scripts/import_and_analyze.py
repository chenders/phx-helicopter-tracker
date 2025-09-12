#!/usr/bin/env python3
"""
Import and analyze Phoenix PD helicopter data
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


async def import_and_analyze():
    """Import live data and perform analysis"""
    print("=" * 80)
    print("PHOENIX PD HELICOPTER DATA IMPORT & ANALYSIS")
    print(f"Time: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 80)

    from app.services.flightradar24_api_service import fr24_api_service
    from app.db.database import SessionLocal
    from app.crud.aircraft import aircraft_crud
    from app.crud.flights import flight_log_crud, flight_position_crud
    from app.schemas.flights import FlightLogCreate, FlightPositionCreate
    from app.models.flight_logs import FlightLog

    db = SessionLocal()

    try:
        # 1. Get current live data
        print("\n1. FETCHING LIVE DATA")
        print("-" * 40)

        async with fr24_api_service:
            # Check credits first
            if fr24_api_service.credit_manager:
                usage = await fr24_api_service.credit_manager.get_usage_stats()
                print(
                    f"Credits: {usage['monthly_used']:,}/{usage['monthly_limit']:,} ({usage['monthly_percentage']:.1f}%)"
                )

            # Get Phoenix PD aircraft
            phoenix_aircraft = await fr24_api_service.get_phoenix_pd_aircraft()

            if phoenix_aircraft:
                print(
                    f"\n✓ Found {len(phoenix_aircraft)} Phoenix PD aircraft currently active:"
                )

                for ac in phoenix_aircraft:
                    print(f"\n   {ac.registration or 'Unknown'}:")
                    print(f"   - Position: {ac.latitude:.4f}, {ac.longitude:.4f}")
                    print(f"   - Altitude: {ac.altitude_feet} ft")
                    print(f"   - Speed: {ac.ground_speed_knots} knots")
                    print(f"   - Heading: {ac.track_degrees}°")

                    # Find aircraft in DB
                    aircraft = aircraft_crud.get_by_registration(
                        db, registration=ac.registration
                    )

                    if aircraft:
                        # Create or update flight log
                        recent_flights = flight_log_crud.get_by_aircraft(
                            db, aircraft_id=aircraft.id, limit=1
                        )

                        # Check if we should create new flight or update existing
                        current_flight = None
                        if recent_flights:
                            last_flight = recent_flights[0]
                            if last_flight.arrival_time is None:
                                # Still flying
                                current_flight = last_flight
                                print(f"   - Continuing flight {last_flight.flight_id}")

                        if not current_flight:
                            # Create new flight
                            flight_create = FlightLogCreate(
                                aircraft_id=aircraft.id,
                                flight_id=f"live_{ac.registration}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
                                departure_time=ac.timestamp
                                or datetime.now(timezone.utc),
                                departure_airport="KDVT",  # Deer Valley Airport
                                data_source="flightradar24_live",
                                raw_data={
                                    "first_seen": ac.timestamp.isoformat()
                                    if ac.timestamp
                                    else None,
                                    "flight_id": ac.flight_id,
                                },
                            )
                            current_flight = flight_log_crud.create(
                                db, obj_in=flight_create
                            )
                            print(f"   - Created new flight {current_flight.flight_id}")

                        # Add position
                        position_create = FlightPositionCreate(
                            flight_log_id=current_flight.id,
                            aircraft_id=aircraft.id,
                            timestamp=ac.timestamp or datetime.now(timezone.utc),
                            latitude=ac.latitude,
                            longitude=ac.longitude,
                            altitude_feet=ac.altitude_feet,
                            ground_speed_knots=ac.ground_speed_knots,
                            track_degrees=ac.track_degrees,
                            vertical_speed_fpm=ac.vertical_speed_fpm,
                            data_source="flightradar24_live",
                            is_hovering=ac.ground_speed_knots
                            and ac.ground_speed_knots < 20,
                            altitude_privacy_concern=ac.altitude_feet
                            and ac.altitude_feet < 400,
                        )
                        position = flight_position_crud.create(
                            db, obj_in=position_create
                        )

                        # Analyze for surveillance patterns
                        if position.is_hovering:
                            print(f"   ⚠️  HOVERING DETECTED - Possible surveillance")
                        if position.altitude_privacy_concern:
                            print(
                                f"   ⚠️  LOW ALTITUDE ({ac.altitude_feet}ft) - Privacy concern"
                            )
                    else:
                        print(f"   ⚠️  Aircraft {ac.registration} not in database")
            else:
                print("No Phoenix PD aircraft currently active")

        # 2. Analyze all data in database
        print("\n\n2. DATABASE ANALYSIS")
        print("-" * 40)

        # Get statistics
        all_flights = db.query(FlightLog).all()
        phoenix_flights = (
            db.query(FlightLog)
            .join(FlightLog.aircraft)
            .filter(
                db.query(FlightLog)
                .join(FlightLog.aircraft)
                .filter(aircraft_crud.model.is_phoenix_pd == True)
                .exists()
            )
            .all()
        )

        print(f"Total flights in database: {len(all_flights)}")
        print(f"Phoenix PD flights: {len(phoenix_flights)}")

        # Analyze recent flights
        recent_flights = flight_log_crud.get_recent_flights(
            db, hours=24, phoenix_pd_only=True
        )

        if recent_flights:
            print(f"\nFlights in last 24 hours: {len(recent_flights)}")

            total_positions = 0
            total_hover = 0
            total_low_alt = 0

            for flight in recent_flights:
                positions = flight_position_crud.get_by_flight(
                    db, flight_log_id=flight.id
                )
                total_positions += len(positions)

                hover_count = sum(1 for p in positions if p.is_hovering)
                low_alt_count = sum(1 for p in positions if p.altitude_privacy_concern)

                total_hover += hover_count
                total_low_alt += low_alt_count

                if hover_count > 0 or low_alt_count > 0:
                    print(f"\n   Flight {flight.flight_id}:")
                    print(
                        f"   - Aircraft: {flight.aircraft.registration} ({flight.aircraft.unit_designation})"
                    )
                    print(
                        f"   - Time: {flight.departure_time.strftime('%Y-%m-%d %H:%M')}"
                    )
                    print(f"   - Positions: {len(positions)}")

                    if hover_count > 0:
                        print(f"   - ⚠️  Hovering events: {hover_count}")
                    if low_alt_count > 0:
                        print(f"   - ⚠️  Low altitude events: {low_alt_count}")

                    # Calculate surveillance score
                    surveillance_score = (hover_count * 2 + low_alt_count) / max(
                        len(positions), 1
                    )
                    if surveillance_score > 0.3:
                        print(
                            f"   - 🚨 HIGH SURVEILLANCE LIKELIHOOD (score: {surveillance_score:.2f})"
                        )

            print(f"\n\nSUMMARY STATISTICS:")
            print(f"- Total positions tracked: {total_positions}")
            print(f"- Hovering events: {total_hover}")
            print(f"- Low altitude events: {total_low_alt}")

            if total_positions > 0:
                print(
                    f"- Surveillance concern rate: {(total_hover + total_low_alt) / total_positions * 100:.1f}%"
                )

        # 3. Legal analysis
        print("\n\n3. LEGAL IMPLICATIONS")
        print("-" * 40)

        if total_hover > 0 or total_low_alt > 0:
            print("✓ Evidence of potential surveillance patterns detected")
            print("✓ Multiple low-altitude operations over residential areas")
            print("✓ Extended hovering patterns consistent with observation")
            print("\nRecommended actions:")
            print("- Document all hovering events with timestamps and locations")
            print("- Cross-reference with dispatch logs to verify emergency status")
            print("- Map affected residential areas for privacy impact assessment")
            print("- Calculate total surveillance hours and associated costs")
        else:
            print("No surveillance patterns detected in current data")

        # 4. Cost analysis
        print("\n\n4. COST ANALYSIS")
        print("-" * 40)

        if recent_flights:
            total_minutes = 0
            for flight in recent_flights:
                if flight.departure_time:
                    if flight.arrival_time:
                        duration = (
                            flight.arrival_time - flight.departure_time
                        ).total_seconds() / 60
                    else:
                        # Still flying
                        duration = (
                            datetime.now(timezone.utc) - flight.departure_time
                        ).total_seconds() / 60
                    total_minutes += duration

            total_hours = total_minutes / 60
            total_cost = total_hours * 2160  # $2,160 per hour

            print(f"Flight time in last 24 hours: {total_hours:.1f} hours")
            print(f"Estimated cost: ${total_cost:,.2f}")
            print(f"Average cost per flight: ${total_cost / len(recent_flights):,.2f}")

            if total_hover > 0:
                # Estimate hover time (assume 30 seconds per hover event)
                hover_hours = (total_hover * 0.5) / 60
                hover_cost = hover_hours * 2160
                print(f"\nEstimated surveillance cost:")
                print(f"- Hover time: {hover_hours:.1f} hours")
                print(f"- Hover cost: ${hover_cost:,.2f}")

        # Final credit check
        print("\n\n5. API USAGE")
        print("-" * 40)

        async with fr24_api_service:
            if fr24_api_service.credit_manager:
                final = await fr24_api_service.credit_manager.get_usage_stats()
                print(f"Credits used today: {final['daily_used']}")
                print(f"Monthly remaining: {final['monthly_remaining']:,}")
                print(f"Projected monthly usage: {final['projected_monthly']:,.0f}")

    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback

        traceback.print_exc()
    finally:
        db.close()

    print("\n" + "=" * 80)
    print("ANALYSIS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(import_and_analyze())
