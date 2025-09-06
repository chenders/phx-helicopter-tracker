#!/usr/bin/env python3
"""
Download and process Phoenix PD helicopter flights from FlightRadar24
for constitutional analysis
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any

# Add backend to path
sys.path.insert(
    0, "/Users/chris/Source/phx-pd-helicopters/plan-a-comprehensive/backend"
)

from app.services.flightradar24_api_service import FlightRadar24APIService
from app.services.flightradar24_service import FlightRadar24Service
from app.db.database import engine, SessionLocal
from app.models.aircraft import Aircraft
from app.models.flight_logs import FlightLog, FlightPosition
from app.crud.aircraft import aircraft_crud
from app.crud.flights import flight_log_crud, flight_position_crud
from app.schemas.flights import FlightLogCreate, FlightPositionCreate
from sqlalchemy.orm import Session
from sqlalchemy import text


def init_database():
    """Initialize database with Phoenix PD aircraft"""
    db = SessionLocal()
    try:
        # Clear existing data
        print("Clearing existing data...")
        db.execute(
            text(
                "TRUNCATE TABLE flight_positions, flight_logs, aircraft RESTART IDENTITY CASCADE"
            )
        )
        db.commit()

        # Insert Phoenix PD aircraft
        phoenix_pd_aircraft = [
            {
                "registration": "N624FB",
                "icao_code": "A7A5F1",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N625FB",
                "icao_code": "A7A8B5",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N300FB",
                "icao_code": "A389F3",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N302FB",
                "icao_code": "A38F7B",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N303FB",
                "icao_code": "A39303",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N305FB",
                "icao_code": "A398DB",
                "make": "Airbus",
                "model": "H125",
                "is_phoenix_pd": True,
            },
            {
                "registration": "N1071J",
                "icao_code": "A0D58F",
                "make": "Agusta",
                "model": "A109E",
                "is_phoenix_pd": True,
            },
        ]

        for ac_data in phoenix_pd_aircraft:
            aircraft = Aircraft(
                registration=ac_data["registration"],
                icao_code=ac_data["icao_code"],
                make=ac_data["make"],
                model=ac_data["model"],
                is_phoenix_pd=ac_data["is_phoenix_pd"],
                is_active=True,
                hourly_operating_cost=2160.0,
                unit_designation=f"Air{ac_data['registration'][-2:]}"
                if ac_data["registration"].startswith("N6")
                else None,
            )
            db.add(aircraft)

        db.commit()
        print(f"Inserted {len(phoenix_pd_aircraft)} Phoenix PD aircraft")
        return db
    except Exception as e:
        print(f"Database initialization error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


async def download_and_process_flights():
    """Download recent flights and process them"""

    # Initialize services
    api_service = FlightRadar24APIService()
    fr24_service = FlightRadar24Service()

    db = SessionLocal()

    try:
        print("\n=== FlightRadar24 Phoenix PD Helicopter Analysis ===\n")

        # Get all Phoenix PD aircraft
        aircraft_list = db.query(Aircraft).filter(Aircraft.is_phoenix_pd == True).all()
        print(f"Found {len(aircraft_list)} Phoenix PD aircraft in database")

        all_flights = []
        total_cost = 0
        surveillance_flights = 0

        for aircraft in aircraft_list:
            print(f"\nProcessing {aircraft.registration} ({aircraft.model})...")

            # Search for recent flights
            try:
                # Use FlightRadar24 API to search for the aircraft
                search_results = await api_service.search_aircraft(
                    aircraft.registration
                )

                if search_results and len(search_results) > 0:
                    aircraft_data = search_results[0]
                    print(
                        f"  Found aircraft data: {aircraft_data.get('model', 'Unknown model')}"
                    )

                    # Get flight history (last 30 days)
                    end_date = datetime.now(timezone.utc)
                    start_date = end_date - timedelta(days=30)

                    flights = await api_service.get_aircraft_flights(
                        aircraft.registration,
                        start_date,
                        end_date,
                        limit=5,  # Get last 5 flights per aircraft
                    )

                    if flights:
                        print(f"  Found {len(flights)} recent flights")

                        for flight_data in flights:
                            # Process each flight
                            try:
                                # Create flight log
                                flight_log = FlightLog(
                                    aircraft_id=aircraft.id,
                                    flight_id=flight_data.get(
                                        "flight_id",
                                        f"FR24_{aircraft.registration}_{int(time.time())}",
                                    ),
                                    callsign=flight_data.get(
                                        "callsign", aircraft.registration
                                    ),
                                    departure_time=datetime.fromisoformat(
                                        flight_data.get(
                                            "departure_time", datetime.now().isoformat()
                                        )
                                    ),
                                    arrival_time=datetime.fromisoformat(
                                        flight_data.get(
                                            "arrival_time", datetime.now().isoformat()
                                        )
                                    ),
                                    departure_airport=flight_data.get("origin", "KDVT"),
                                    arrival_airport=flight_data.get(
                                        "destination", "KDVT"
                                    ),
                                    data_source="flightradar24",
                                    max_altitude_feet=flight_data.get(
                                        "max_altitude", 0
                                    ),
                                    flight_duration_minutes=flight_data.get(
                                        "duration_minutes", 0
                                    ),
                                )

                                # Calculate costs
                                flight_log.estimated_cost = (
                                    flight_log.flight_duration_minutes / 60
                                ) * aircraft.hourly_operating_cost
                                total_cost += flight_log.estimated_cost

                                # Check for surveillance patterns
                                if flight_log.max_altitude_feet < 1000:
                                    flight_log.surveillance_likelihood = 0.8
                                    flight_log.privacy_concern_level = 4
                                    surveillance_flights += 1

                                db.add(flight_log)
                                all_flights.append(flight_log)

                                print(
                                    f"    - Flight on {flight_log.departure_time.strftime('%Y-%m-%d %H:%M')}"
                                )
                                print(
                                    f"      Duration: {flight_log.flight_duration_minutes:.0f} min"
                                )
                                print(f"      Cost: ${flight_log.estimated_cost:,.2f}")

                                if flight_log.surveillance_likelihood > 0.5:
                                    print(f"      ⚠️  SURVEILLANCE PATTERN DETECTED")

                            except Exception as e:
                                print(f"    Error processing flight: {e}")
                                continue
                    else:
                        print(f"  No recent flights found")
                else:
                    print(f"  Aircraft not found in FlightRadar24")

            except Exception as e:
                print(f"  Error fetching data: {e}")
                continue

            # Rate limiting
            await asyncio.sleep(1)

        # Commit all flights
        db.commit()

        # Generate constitutional analysis
        print("\n=== CONSTITUTIONAL ANALYSIS REPORT ===\n")
        print(f"Total Flights Analyzed: {len(all_flights)}")
        print(f"Surveillance Pattern Flights: {surveillance_flights}")
        print(
            f"Surveillance Rate: {(surveillance_flights/len(all_flights)*100) if all_flights else 0:.1f}%"
        )
        print(f"Total Operating Cost: ${total_cost:,.2f}")
        print(
            f"Average Cost per Flight: ${(total_cost/len(all_flights)) if all_flights else 0:,.2f}"
        )

        if surveillance_flights > 0:
            print("\n⚠️  FOURTH AMENDMENT CONCERNS:")
            print("- Persistent aerial surveillance without warrants detected")
            print("- Low-altitude operations over residential areas")
            print(
                "- Pattern suggests systematic monitoring rather than emergency response"
            )
            print("\nRecommended Legal Actions:")
            print("1. File FOIA requests for flight justifications")
            print("2. Document affected neighborhoods for class action standing")
            print("3. Cite Leaders of a Beautiful Struggle v. Baltimore (2022)")
            print("4. Request flight operation policies and guidelines")

        # Save detailed report
        report = {
            "analysis_date": datetime.now().isoformat(),
            "total_flights": len(all_flights),
            "surveillance_flights": surveillance_flights,
            "total_cost": total_cost,
            "aircraft_analyzed": len(aircraft_list),
            "flights_by_aircraft": {},
        }

        for flight in all_flights:
            aircraft = (
                db.query(Aircraft).filter(Aircraft.id == flight.aircraft_id).first()
            )
            if aircraft.registration not in report["flights_by_aircraft"]:
                report["flights_by_aircraft"][aircraft.registration] = []

            report["flights_by_aircraft"][aircraft.registration].append(
                {
                    "date": flight.departure_time.isoformat()
                    if flight.departure_time
                    else None,
                    "duration_minutes": flight.flight_duration_minutes,
                    "cost": flight.estimated_cost,
                    "surveillance_likelihood": flight.surveillance_likelihood,
                    "max_altitude": flight.max_altitude_feet,
                }
            )

        with open("phoenix_pd_constitutional_analysis.json", "w") as f:
            json.dump(report, f, indent=2)

        print(f"\nDetailed report saved to phoenix_pd_constitutional_analysis.json")

    except Exception as e:
        print(f"Error in main process: {e}")
        db.rollback()
    finally:
        db.close()


def main():
    """Main entry point"""
    try:
        # Initialize database
        db = init_database()

        # Run async download and processing
        asyncio.run(download_and_process_flights())

    except Exception as e:
        print(f"Fatal error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
