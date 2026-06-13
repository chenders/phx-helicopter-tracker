#!/usr/bin/env python3
"""
Check and display aircraft activity summary
"""

import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from datetime import datetime


def check_aircraft_summary():
    """Display summary of Phoenix PD helicopter fleet status"""

    session = SessionLocal()
    try:
        # Get all Phoenix PD helicopters
        result = session.execute(
            select(Aircraft)
            .where(Aircraft.is_phoenix_pd == True)
            .order_by(Aircraft.registration)
        )
        aircraft_list = result.scalars().all()

        print("\n" + "=" * 60)
        print("PHOENIX PD HELICOPTER FLEET STATUS")
        print("=" * 60 + "\n")

        active_count = 0
        inactive_count = 0

        for aircraft in aircraft_list:
            status = "✓ ACTIVE" if aircraft.is_active else "✗ INACTIVE"
            if aircraft.is_active:
                active_count += 1
            else:
                inactive_count += 1

            print(f"{aircraft.registration}: {status}")
            if aircraft.last_seen:
                days_ago = (datetime.utcnow() - aircraft.last_seen).days
                print(
                    f"  Last seen: {aircraft.last_seen.strftime('%Y-%m-%d')} ({days_ago} days ago)"
                )
            else:
                print(f"  Last seen: No recent flight data")
            print()

        print("-" * 60)
        print(f"Summary: {active_count} Active, {inactive_count} Inactive")
        print(f"Total Fleet: {len(aircraft_list)} helicopters")
        print("-" * 60)

        # Get flight counts for active aircraft
        from app.models.flight_logs import FlightLog

        print("\nFlight Activity (Last 30 Days):")
        for aircraft in aircraft_list:
            if aircraft.is_active:
                flight_count = (
                    session.query(FlightLog)
                    .filter(FlightLog.aircraft_id == aircraft.id)
                    .count()
                )
                print(
                    f"  {aircraft.registration}: {flight_count} flights recorded in database"
                )

    finally:
        session.close()


if __name__ == "__main__":
    check_aircraft_summary()
