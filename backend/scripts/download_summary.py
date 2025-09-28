#!/usr/bin/env python3
"""
Display summary of downloaded flight data
"""

import sys
from pathlib import Path
from datetime import datetime

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, func, and_
from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog


def display_download_summary():
    """Display comprehensive summary of downloaded flight data"""

    session = SessionLocal()
    try:
        print("\n" + "=" * 70)
        print("PHOENIX PD HELICOPTER FLIGHT DATA DOWNLOAD SUMMARY")
        print("=" * 70)
        print(f"Report generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()

        # Get active aircraft
        result = session.execute(
            select(Aircraft).where(
                (Aircraft.is_phoenix_pd == True) &
                (Aircraft.is_active == True)
            ).order_by(Aircraft.registration)
        )
        active_aircraft = result.scalars().all()

        print(f"Active Aircraft: {', '.join([a.registration for a in active_aircraft])}")
        print("-" * 70)

        # Per-aircraft summary
        for aircraft in active_aircraft:
            print(f"\n{aircraft.registration}:")

            # Discovery stats
            discoveries = session.query(FlightDiscovery).filter(
                FlightDiscovery.registration == aircraft.registration
            )

            total_discoveries = discoveries.count()
            downloaded = discoveries.filter(FlightDiscovery.track_downloaded == True).count()
            pending = discoveries.filter(
                and_(
                    FlightDiscovery.track_downloaded == False,
                    FlightDiscovery.track_download_error.is_(None)
                )
            ).count()
            errors = discoveries.filter(FlightDiscovery.track_download_error.isnot(None)).count()

            # Date range
            date_range = session.query(
                func.min(FlightDiscovery.departure_time),
                func.max(FlightDiscovery.departure_time)
            ).filter(
                FlightDiscovery.registration == aircraft.registration
            ).first()

            # Flight logs (actual downloaded data)
            flight_logs = session.query(FlightLog).filter(
                FlightLog.aircraft_id == aircraft.id
            ).count()

            print(f"  Flights discovered: {total_discoveries}")
            print(f"  Tracks downloaded: {downloaded}")
            print(f"  Pending download: {pending}")
            print(f"  Download errors: {errors}")
            print(f"  Flight logs created: {flight_logs}")

            if date_range[0] and date_range[1]:
                print(f"  Date range: {date_range[0].strftime('%Y-%m-%d')} to {date_range[1].strftime('%Y-%m-%d')}")
                days = (date_range[1] - date_range[0]).days + 1
                print(f"  Coverage: {days} days")
                if days > 0:
                    print(f"  Average flights/day: {total_discoveries / days:.1f}")

        # Overall summary
        print("\n" + "-" * 70)
        print("OVERALL STATISTICS:")

        total_discoveries = session.query(FlightDiscovery).filter(
            FlightDiscovery.registration.in_([a.registration for a in active_aircraft])
        ).count()

        total_downloaded = session.query(FlightDiscovery).filter(
            and_(
                FlightDiscovery.registration.in_([a.registration for a in active_aircraft]),
                FlightDiscovery.track_downloaded == True
            )
        ).count()

        total_pending = session.query(FlightDiscovery).filter(
            and_(
                FlightDiscovery.registration.in_([a.registration for a in active_aircraft]),
                FlightDiscovery.track_downloaded == False,
                FlightDiscovery.track_download_error.is_(None)
            )
        ).count()

        total_errors = session.query(FlightDiscovery).filter(
            and_(
                FlightDiscovery.registration.in_([a.registration for a in active_aircraft]),
                FlightDiscovery.track_download_error.isnot(None)
            )
        ).count()

        total_flight_logs = session.query(FlightLog).filter(
            FlightLog.aircraft_id.in_([a.id for a in active_aircraft])
        ).count()

        print(f"  Total flights discovered: {total_discoveries}")
        print(f"  Total tracks downloaded: {total_downloaded}")
        print(f"  Total pending download: {total_pending}")
        print(f"  Total download errors: {total_errors}")
        print(f"  Total flight logs in database: {total_flight_logs}")

        if total_discoveries > 0:
            success_rate = (total_downloaded / (total_downloaded + total_errors)) * 100 if (total_downloaded + total_errors) > 0 else 0
            print(f"  Download success rate: {success_rate:.1f}%")
            completion = (total_downloaded / total_discoveries) * 100
            print(f"  Overall completion: {completion:.1f}%")

        # Credit usage estimate
        credits_used = (total_downloaded + total_errors) * 20  # 20 credits per track download
        credits_discoveries = total_discoveries * 10 / 100  # Estimate based on batched discovery
        total_credits = credits_used + credits_discoveries
        print(f"\n  Estimated FR24 credits used:")
        print(f"    Discovery: ~{credits_discoveries:.0f}")
        print(f"    Track downloads: {credits_used}")
        print(f"    Total: ~{total_credits:.0f}")

        print("\n" + "=" * 70)

    finally:
        session.close()


if __name__ == "__main__":
    display_download_summary()