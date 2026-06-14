"""
Backfill MSL altitude data for existing flights that have positions but no altitude stats
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition
from sqlalchemy import func


def backfill_altitude_data():
    """Calculate and populate min/max/avg altitude for existing flights"""
    db = SessionLocal()

    try:
        # Find flights with positions but NULL altitude fields
        flights_needing_update = (
            db.query(FlightLog).filter(FlightLog.min_altitude_feet.is_(None)).all()
        )

        print(f"Found {len(flights_needing_update)} flights needing altitude data")

        updated_count = 0
        for flight in flights_needing_update:
            # Get altitude stats from positions
            altitude_stats = (
                db.query(
                    func.min(FlightPosition.altitude_feet).label("min_alt"),
                    func.max(FlightPosition.altitude_feet).label("max_alt"),
                    func.avg(FlightPosition.altitude_feet).label("avg_alt"),
                )
                .filter(
                    FlightPosition.flight_log_id == flight.id,
                    FlightPosition.altitude_feet.isnot(None),
                )
                .first()
            )

            if altitude_stats and altitude_stats.min_alt is not None:
                flight.min_altitude_feet = int(altitude_stats.min_alt)
                flight.max_altitude_feet = int(altitude_stats.max_alt)
                flight.avg_altitude_feet = int(altitude_stats.avg_alt)
                updated_count += 1

                if updated_count % 50 == 0:
                    print(f"Updated {updated_count} flights...")
                    db.commit()

        db.commit()
        print(f"Successfully updated {updated_count} flights with altitude data")

    except Exception as e:
        print(f"Error backfilling altitude data: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    backfill_altitude_data()
