#!/usr/bin/env python3
"""
Demo flight data import script.
Creates sample flight data for Phoenix PD helicopters when FR24 API is unavailable.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from datetime import datetime, timedelta
import random
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition
from app.models.aircraft import Aircraft
from app.core.config import settings

# Connect to database
engine = create_engine(settings.DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def create_demo_flights():
    """Create demonstration flight data for Phoenix PD helicopters."""
    db = SessionLocal()

    try:
        # Get Phoenix PD aircraft
        aircraft = db.query(Aircraft).filter(Aircraft.is_phoenix_pd == True).all()

        if not aircraft:
            print("No Phoenix PD aircraft found in database")
            return

        print(f"Found {len(aircraft)} Phoenix PD aircraft")

        flights_created = 0
        positions_created = 0

        # Create flights for the last 7 days
        end_date = datetime.now()
        start_date = end_date - timedelta(days=7)

        for ac in aircraft:
            # Create 2-3 flights per day for each aircraft
            current_date = start_date

            while current_date < end_date:
                num_flights = random.randint(2, 3)

                for flight_num in range(num_flights):
                    # Random flight start time
                    hour = random.choice([6, 9, 12, 15, 18, 21])  # Common patrol hours
                    minute = random.randint(0, 59)
                    departure_time = current_date.replace(hour=hour, minute=minute, second=0, microsecond=0)

                    # Flight duration: 1-3 hours
                    duration_minutes = random.randint(60, 180)
                    arrival_time = departure_time + timedelta(minutes=duration_minutes)

                    # Create flight log
                    flight = FlightLog(
                        aircraft_id=ac.id,
                        flight_id=f"DEMO-{ac.registration}-{departure_time.strftime('%Y%m%d%H%M')}",
                        callsign=f"PHOENIX{flight_num+1}",
                        departure_time=departure_time,
                        arrival_time=arrival_time,
                        flight_duration_minutes=duration_minutes,
                        departure_airport="KDVT",  # Deer Valley Airport
                        arrival_airport="KDVT",
                        max_altitude_feet=random.randint(1500, 3000),
                        min_altitude_feet=random.randint(500, 1000),
                        avg_altitude_feet=random.randint(1000, 2000),
                        estimated_cost=duration_minutes * 36,  # $2160/hour = $36/minute
                        fuel_consumed_gallons=duration_minutes * 0.5,  # Estimate
                        data_source="DEMO",
                        surveillance_likelihood=random.choice([0.7, 0.8, 0.9]),
                        privacy_concern_level=random.choice(["LOW", "MEDIUM", "HIGH"]),
                        raw_data={"demo": True, "created_at": datetime.now().isoformat()}
                    )

                    db.add(flight)
                    db.flush()  # Get the flight ID
                    flights_created += 1

                    # Create position data (1 position per minute)
                    for minute in range(duration_minutes):
                        timestamp = departure_time + timedelta(minutes=minute)

                        # Phoenix area coordinates (roughly circular pattern)
                        center_lat = 33.4484  # Phoenix center
                        center_lon = -112.0740

                        # Create a patrol pattern
                        angle = (minute * 6) % 360  # Degrees
                        radius = random.uniform(0.05, 0.15)  # Degrees lat/lon

                        import math
                        lat = center_lat + radius * math.cos(math.radians(angle))
                        lon = center_lon + radius * math.sin(math.radians(angle))

                        # Altitude variations
                        altitude = random.randint(1000, 2500)

                        position = FlightPosition(
                            flight_log_id=flight.id,
                            aircraft_id=ac.id,
                            timestamp=timestamp,
                            latitude=lat,
                            longitude=lon,
                            altitude_feet=altitude,
                            ground_speed_knots=random.randint(60, 120),
                            track_degrees=random.randint(0, 359),
                            vertical_rate=random.randint(-500, 500),
                            is_hovering=(minute % 20 == 0),  # Hover every 20 minutes
                            hover_duration_seconds=random.randint(60, 300) if minute % 20 == 0 else 0,
                            is_circling=(minute % 15 == 0),  # Circle every 15 minutes
                            circle_radius_feet=random.randint(500, 1500) if minute % 15 == 0 else None,
                            data_source="DEMO"
                        )

                        db.add(position)
                        positions_created += 1

                current_date += timedelta(days=1)

        db.commit()

        print(f"\nDemo data created successfully:")
        print(f"  Flights: {flights_created}")
        print(f"  Positions: {positions_created}")

        # Verify data was created
        total_flights = db.query(FlightLog).count()
        total_positions = db.query(FlightPosition).count()

        print(f"\nTotal in database:")
        print(f"  Flights: {total_flights}")
        print(f"  Positions: {total_positions}")

    except Exception as e:
        print(f"Error creating demo data: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Creating demo flight data for Phoenix PD helicopters...")
    create_demo_flights()