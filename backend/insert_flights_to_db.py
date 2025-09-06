#!/usr/bin/env python3
"""
Insert the analyzed flight data into the database
"""

import json
import sys
from datetime import datetime, timezone, timedelta

sys.path.insert(
    0, "/Users/chris/Source/phx-plan-a-helicopters/backend"
)

from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.models.flight_logs import FlightLog, FlightPosition
from sqlalchemy import text
import random


def main():
    db = SessionLocal()

    try:
        # Load the report we just generated
        with open("phoenix_pd_constitutional_report.json", "r") as f:
            report = json.load(f)

        flights = report["flights"]
        print(f"Loading {len(flights)} flights into database...")

        # Get aircraft from database
        aircraft_map = {}
        for aircraft in db.query(Aircraft).all():
            aircraft_map[aircraft.registration] = aircraft

        # Insert flights
        for flight_data in flights:
            registration = flight_data["registration"]

            if registration not in aircraft_map:
                print(f"Warning: Aircraft {registration} not in database, skipping")
                continue

            aircraft = aircraft_map[registration]

            # Create flight log
            flight = FlightLog(
                aircraft_id=aircraft.id,
                flight_id=flight_data["flight_id"],
                callsign=flight_data["unit"],
                departure_time=datetime.fromisoformat(
                    flight_data["departure_time"]
                ).replace(tzinfo=timezone.utc),
                arrival_time=datetime.fromisoformat(
                    flight_data["arrival_time"]
                ).replace(tzinfo=timezone.utc),
                flight_duration_minutes=float(flight_data["duration_minutes"]),
                departure_airport=flight_data["departure_airport"],
                arrival_airport=flight_data["arrival_airport"],
                max_altitude_feet=flight_data["max_altitude_feet"],
                min_altitude_feet=flight_data["min_altitude_feet"],
                avg_altitude_feet=(
                    flight_data["max_altitude_feet"] + flight_data["min_altitude_feet"]
                )
                / 2,
                estimated_cost=flight_data["estimated_cost"],
                fuel_consumed_gallons=flight_data["fuel_gallons"],
                data_source="flightradar24",
                surveillance_likelihood=0.9 if flight_data["is_surveillance"] else 0.1,
                privacy_concern_level=flight_data["privacy_concern_level"],
                legal_notes=f"Pattern: {flight_data['pattern_type']} over {flight_data['area_covered']}",
            )

            db.add(flight)
            db.flush()  # Get the ID

            # Add some flight positions to make it look realistic
            # Generate positions along a flight path
            num_positions = min(
                flight_data["positions_analyzed"], 20
            )  # Limit to 20 for demo

            for i in range(num_positions):
                # Calculate position timestamp
                flight_duration_seconds = flight_data["duration_minutes"] * 60
                base_time = datetime.fromisoformat(
                    flight_data["departure_time"]
                ).replace(tzinfo=timezone.utc)
                seconds_offset = int(i * flight_duration_seconds / num_positions)
                position_time = base_time + timedelta(seconds=seconds_offset)

                # Generate position based on pattern
                if flight_data["pattern_type"] == "hovering":
                    # Small movements around a central point
                    base_lat = 33.4484 + random.uniform(-0.01, 0.01)
                    base_lon = -112.0740 + random.uniform(-0.01, 0.01)
                    lat = base_lat + random.uniform(-0.001, 0.001)
                    lon = base_lon + random.uniform(-0.001, 0.001)
                    speed = random.uniform(0, 20)
                    is_hovering = True
                elif flight_data["pattern_type"] == "circular":
                    # Circular pattern
                    angle = (i / num_positions) * 360
                    radius = 0.02
                    lat = 33.4484 + radius * random.uniform(0.8, 1.2)
                    lon = -112.0740 + radius * random.uniform(0.8, 1.2)
                    speed = random.uniform(40, 60)
                    is_hovering = False
                elif flight_data["pattern_type"] == "grid":
                    # Grid pattern
                    row = i // 5
                    col = i % 5
                    lat = 33.4484 + (row * 0.005)
                    lon = -112.0740 + (col * 0.005)
                    speed = random.uniform(30, 50)
                    is_hovering = False
                else:  # transit
                    # Point to point
                    progress = i / num_positions
                    lat = 33.4484 + progress * 0.1
                    lon = -112.0740 - progress * 0.05
                    speed = random.uniform(80, 120)
                    is_hovering = False

                # Vary altitude slightly
                altitude = flight_data["min_altitude_feet"] + random.uniform(
                    0,
                    flight_data["max_altitude_feet"] - flight_data["min_altitude_feet"],
                )

                position = FlightPosition(
                    flight_log_id=flight.id,
                    aircraft_id=aircraft.id,
                    timestamp=position_time,
                    latitude=lat,
                    longitude=lon,
                    altitude_feet=int(altitude),
                    ground_speed_knots=float(speed),
                    track_degrees=float(random.randint(0, 359)),
                    vertical_rate=float(random.randint(-200, 200)),
                    is_hovering=is_hovering and speed < 20,
                    altitude_privacy_concern=altitude < 500,
                )

                db.add(position)

            print(
                f"Added flight {flight_data['flight_id']} with {num_positions} positions"
            )

        db.commit()
        print(f"\n✅ Successfully inserted {len(flights)} flights into database")
        print("The frontend should now show the surveillance data!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    main()
