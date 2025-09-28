#!/usr/bin/env python3
"""
Check recent flight activity for Phoenix PD helicopters
and update their active status in the database
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, update
from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.services.flightradar24_api_service import FlightRadar24APIService
from app.core.config import settings
import logging

logging.basicConfig(
    level=logging.WARNING,  # Only show warnings and errors for other modules
    format='%(message)s'  # Simplified format
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)  # Show INFO for our script


async def check_aircraft_activity():
    """Check recent flights for all Phoenix PD helicopters"""

    # Initialize FR24 service
    fr24_service = FlightRadar24APIService()
    await fr24_service.initialize()

    try:
        # Use synchronous session
        session = SessionLocal()
        try:
            # Get all Phoenix PD helicopters
            result = session.execute(
                select(Aircraft).where(Aircraft.is_phoenix_pd == True)
            )
            aircraft_list = result.scalars().all()

            logger.info(f"Checking activity for {len(aircraft_list)} Phoenix PD helicopters")

            # Check date range (last 30 days)
            days_back = 30
            check_date = datetime.now(timezone.utc) - timedelta(days=days_back)

            for aircraft in aircraft_list:
                try:
                    logger.info(f"\nChecking {aircraft.registration}...")

                    # Search for flights in last 30 days
                    # We'll need to make multiple requests due to 14-day API limit
                    all_flights = []

                    # First batch: last 14 days
                    flights_recent = await fr24_service.get_flight_summary(
                        aircraft.registration,
                        days_back=14
                    )
                    all_flights.extend(flights_recent.get('data', []))

                    # Second batch: 14-28 days ago
                    end_date_2 = datetime.now(timezone.utc) - timedelta(days=14)
                    start_date_2 = datetime.now(timezone.utc) - timedelta(days=28)
                    flights_older = await fr24_service.get_flight_summary(
                        aircraft.registration,
                        start_date=start_date_2,
                        end_date=end_date_2
                    )
                    all_flights.extend(flights_older.get('data', []))

                    # Check if we need a third batch for day 29-30
                    if days_back > 28:
                        end_date_3 = datetime.now(timezone.utc) - timedelta(days=28)
                        start_date_3 = datetime.now(timezone.utc) - timedelta(days=days_back)
                        flights_oldest = await fr24_service.get_flight_summary(
                            aircraft.registration,
                            start_date=start_date_3,
                            end_date=end_date_3
                        )
                        all_flights.extend(flights_oldest.get('data', []))

                    # Determine if aircraft is active
                    has_recent_flights = len(all_flights) > 0

                    # Find most recent flight
                    last_flight_time = None
                    if all_flights:
                        # Get the most recent flight timestamp
                        for flight in all_flights:
                            if flight.get('timestamp') or flight.get('departure_time'):
                                flight_time_str = flight.get('timestamp') or flight.get('departure_time')
                                try:
                                    if isinstance(flight_time_str, str):
                                        flight_time = datetime.fromisoformat(flight_time_str.replace('Z', '+00:00'))
                                    else:
                                        flight_time = datetime.fromtimestamp(flight_time_str, tz=timezone.utc)

                                    if last_flight_time is None or flight_time > last_flight_time:
                                        last_flight_time = flight_time
                                except:
                                    pass

                    # Update aircraft status using update query
                    update_data = {"is_active": has_recent_flights}
                    if last_flight_time:
                        update_data["last_seen"] = last_flight_time

                    session.execute(
                        update(Aircraft).where(Aircraft.id == aircraft.id).values(**update_data)
                    )
                    session.commit()

                    if has_recent_flights:
                        logger.info(f"✓ {aircraft.registration}: ACTIVE - {len(all_flights)} flights in last {days_back} days")
                        if last_flight_time:
                            logger.info(f"  Last seen: {last_flight_time.strftime('%Y-%m-%d %H:%M:%S UTC')}")
                    else:
                        logger.info(f"✗ {aircraft.registration}: INACTIVE - No flights in last {days_back} days")

                    # Add delay to respect rate limits
                    await asyncio.sleep(3)

                except Exception as e:
                    logger.error(f"Error checking {aircraft.registration}: {e}")
                    continue

            # Final summary
            result = session.execute(
                select(Aircraft).where(
                    (Aircraft.is_phoenix_pd == True) &
                    (Aircraft.is_active == True)
                )
            )
            active_count = len(result.scalars().all())

            logger.info(f"\n=== SUMMARY ===")
            logger.info(f"Total Phoenix PD helicopters: {len(aircraft_list)}")
            logger.info(f"Active (flights in last {days_back} days): {active_count}")
            logger.info(f"Inactive: {len(aircraft_list) - active_count}")

        finally:
            session.close()

    finally:
        await fr24_service.close()


if __name__ == "__main__":
    asyncio.run(check_aircraft_activity())