#!/usr/bin/env python3
"""
Download recent flight data from September 18, 2025 to present
"""
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Add backend to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from app.db.database import SessionLocal
from app.services.flightradar24_api_service import FlightRadar24APIService
from app.models.flight_logs import FlightLog
from app.models.flight_discoveries import FlightDiscovery
import asyncio

# Phoenix PD helicopter registrations
PHOENIX_PD_HELICOPTERS = [
    "N620FB",
    "N621FB",
    "N622FB",
    "N623FB",
    "N624FB",
    "N625FB"
]

async def download_recent_flights():
    """Download flights from Sept 18 to now"""

    # Initialize service
    service = FlightRadar24APIService()
    db = SessionLocal()

    try:
        # Get the date range
        # Latest data we have is September 18, 2025
        start_date = datetime(2025, 9, 18)
        end_date = datetime.now()

        print(f"Downloading flights from {start_date} to {end_date}")

        total_discovered = 0

        # Process each helicopter
        for registration in PHOENIX_PD_HELICOPTERS:
            print(f"\nProcessing {registration}...")

            try:
                # Calculate days to look back
                days_back = (end_date - start_date).days + 1

                # Search for flights
                flights = await service.search_flights_by_registration(
                    registration=registration,
                    days_back=days_back
                )

                if flights:
                    print(f"Found {len(flights)} flights for {registration}")

                    for flight_data in flights:
                        # Check if we already have this flight
                        existing = db.query(FlightDiscovery).filter(
                            FlightDiscovery.fr24_id == flight_data.get('id')
                        ).first()

                        if not existing:
                            # Create discovery record
                            discovery = FlightDiscovery(
                                fr24_id=flight_data.get('id'),
                                registration=registration,
                                callsign=flight_data.get('callsign'),
                                aircraft_type=flight_data.get('aircraft', {}).get('model', {}).get('text'),
                                hex_code=flight_data.get('aircraft', {}).get('hex'),
                                departure_time=datetime.fromtimestamp(flight_data['time']['real']['departure']) if flight_data.get('time', {}).get('real', {}).get('departure') else None,
                                arrival_time=datetime.fromtimestamp(flight_data['time']['real']['arrival']) if flight_data.get('time', {}).get('real', {}).get('arrival') else None,
                                origin_airport=flight_data.get('airport', {}).get('origin', {}).get('code', {}).get('iata'),
                                destination_airport=flight_data.get('airport', {}).get('destination', {}).get('code', {}).get('iata'),
                                first_seen=flight_data.get('time', {}).get('real', {}).get('departure'),
                                last_seen=flight_data.get('time', {}).get('real', {}).get('arrival'),
                                track_downloaded=False,
                                discovered_at=datetime.utcnow()
                            )
                            db.add(discovery)
                            total_discovered += 1
                else:
                    print(f"No flights found for {registration}")

                # Commit after each aircraft to avoid losing data
                db.commit()

                # Rate limit between aircraft
                await asyncio.sleep(5)

            except Exception as e:
                print(f"Error processing {registration}: {e}")
                db.rollback()
                continue

        print(f"\n✅ Discovery complete! Found {total_discovered} new flights")
        print("The Celery beat scheduler will download the detailed tracks in batches")

    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(download_recent_flights())