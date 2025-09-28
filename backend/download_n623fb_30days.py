#!/usr/bin/env python3
"""
Download last 30 days of flight data for N623FB
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Import our services and models
from app.db.database import SessionLocal
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft
from app.services.flightradar24_api_service import fr24_api_service
from app.schemas.flights import FlightLogCreate, FlightPositionCreate
from app.services.elevation_service import elevation_service

async def discover_and_download_n623fb():
    """Main function to discover and download N623FB flights"""

    registration = "N623FB"
    aircraft_id = 6  # We just inserted this

    # Calculate date range (last 30 days, split into 14-day chunks)
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=30)

    logger.info(f"Starting download for {registration}")
    logger.info(f"Full date range: {start_date.date()} to {end_date.date()}")

    db = SessionLocal()

    try:
        # Initialize the API service
        async with fr24_api_service:
            # Step 1: Discover flights (in 14-day chunks due to API limit)
            logger.info(f"Step 1: Discovering flights for {registration}")

            all_flights = []

            # Split into two 14-day chunks
            date_ranges = [
                (end_date - timedelta(days=14), end_date),  # Last 14 days
                (end_date - timedelta(days=28), end_date - timedelta(days=14))  # Days 15-28
            ]

            for chunk_start, chunk_end in date_ranges:
                logger.info(f"Fetching flights from {chunk_start.date()} to {chunk_end.date()}")

                page = 1
                max_pages = 20  # Safety limit

                while page <= max_pages:
                    logger.info(f"Fetching page {page} for date range {chunk_start.date()} to {chunk_end.date()}...")

                    try:
                        # Get flight summary page
                        data = await fr24_api_service.get_flight_summary(
                            registration,
                            page,
                            start_date=chunk_start,
                            end_date=chunk_end
                        )

                        flights = data.get('data', [])

                        if not flights:
                            logger.info(f"No more flights found on page {page}")
                            break

                        logger.info(f"Found {len(flights)} flights on page {page}")
                        all_flights.extend(flights)

                        page += 1

                        # Small delay between pages
                        await asyncio.sleep(2)

                    except Exception as e:
                        logger.error(f"Error fetching page {page}: {e}")
                        break

                # Delay between date ranges
                await asyncio.sleep(3)

            logger.info(f"Total flights discovered: {len(all_flights)}")

            # Step 2: Store discoveries in database
            logger.info("Step 2: Storing flight discoveries in database")

            discoveries_created = 0
            for flight_data in all_flights:
                fr24_id = flight_data.get('fr24_id')
                if not fr24_id:
                    continue

                # Check if already exists
                existing = db.query(FlightDiscovery).filter_by(fr24_id=fr24_id).first()
                if existing:
                    logger.debug(f"Flight {fr24_id} already discovered")
                    continue

                # Create new discovery record
                discovery = FlightDiscovery(
                    fr24_id=fr24_id,
                    registration=registration,
                    callsign=flight_data.get('callsign'),
                    aircraft_type=flight_data.get('aircraft_type'),
                    hex_code=flight_data.get('hex'),
                    departure_time=flight_data.get('departure_time'),
                    arrival_time=flight_data.get('arrival_time'),
                    origin_airport=flight_data.get('origin'),
                    destination_airport=flight_data.get('destination'),
                    flight_duration_minutes=flight_data.get('duration_minutes'),
                    first_seen=flight_data.get('first_seen'),
                    last_seen=flight_data.get('last_seen'),
                    discovered_at=datetime.now(timezone.utc),
                    track_downloaded=False
                )
                db.add(discovery)
                discoveries_created += 1

            db.commit()
            logger.info(f"Created {discoveries_created} new discovery records")

            # Step 3: Download complete tracks for each discovered flight
            logger.info("Step 3: Downloading complete flight tracks")

            # Get all pending downloads
            pending_discoveries = db.query(FlightDiscovery).filter(
                FlightDiscovery.registration == registration,
                FlightDiscovery.track_downloaded == False
            ).all()

            logger.info(f"Found {len(pending_discoveries)} flights needing track downloads")

            flights_downloaded = 0
            for discovery in pending_discoveries:
                try:
                    logger.info(f"Downloading track for flight {discovery.fr24_id} from {discovery.departure_time}")

                    # Download complete flight track
                    track_data = await fr24_api_service.get_complete_flight_track(discovery.fr24_id)

                    if not track_data:
                        logger.error(f"No track data returned for {discovery.fr24_id}")
                        discovery.track_download_attempted_at = datetime.now(timezone.utc)
                        discovery.track_download_error = "No track data returned"
                        db.commit()
                        continue

                    # Create flight log record
                    flight_log = FlightLog(
                        aircraft_id=aircraft_id,
                        flight_id=discovery.fr24_id,
                        callsign=discovery.callsign,
                        departure_time=discovery.departure_time,
                        arrival_time=discovery.arrival_time,
                        flight_duration_minutes=discovery.flight_duration_minutes,
                        departure_airport=discovery.origin_airport,
                        arrival_airport=discovery.destination_airport,
                        data_source='flightradar24',
                        raw_data=track_data,
                        created_at=datetime.now(timezone.utc)
                    )

                    # Extract positions from track data
                    positions = track_data.get('track', [])
                    if positions:
                        # Calculate altitude statistics
                        altitudes = [p.get('altitude', 0) for p in positions if p.get('altitude')]
                        if altitudes:
                            flight_log.max_altitude_feet = max(altitudes)
                            flight_log.min_altitude_feet = min(altitudes)
                            flight_log.avg_altitude_feet = sum(altitudes) / len(altitudes)

                    db.add(flight_log)
                    db.flush()  # Get the flight_log.id

                    # Step 4: Store position data
                    logger.info(f"Storing {len(positions)} positions for flight {discovery.fr24_id}")

                    positions_created = 0
                    for pos in positions:
                        # Create position record
                        position = FlightPosition(
                            flight_log_id=flight_log.id,
                            aircraft_id=aircraft_id,
                            timestamp=datetime.fromtimestamp(pos.get('timestamp', 0), tz=timezone.utc),
                            latitude=pos.get('latitude'),
                            longitude=pos.get('longitude'),
                            altitude_feet=pos.get('altitude'),
                            ground_speed_knots=pos.get('ground_speed'),
                            track_degrees=pos.get('heading'),
                            vertical_rate=pos.get('vertical_rate'),
                            data_source='flightradar24'
                        )

                        # Add ground elevation if we have it
                        if pos.get('latitude') and pos.get('longitude'):
                            try:
                                elevation = await elevation_service.get_elevation(
                                    pos.get('latitude'),
                                    pos.get('longitude')
                                )
                                if elevation is not None:
                                    position.ground_elevation_feet = elevation
                                    if position.altitude_feet and elevation:
                                        position.altitude_agl_feet = position.altitude_feet - elevation
                            except Exception as e:
                                logger.debug(f"Could not get elevation: {e}")

                        db.add(position)
                        positions_created += 1

                    # Update discovery record
                    discovery.track_downloaded = True
                    discovery.track_download_attempted_at = datetime.now(timezone.utc)
                    discovery.positions_count = positions_created

                    db.commit()
                    flights_downloaded += 1
                    logger.info(f"Successfully downloaded flight {discovery.fr24_id}: {positions_created} positions")

                    # Rate limiting - wait between downloads
                    await asyncio.sleep(3)

                except Exception as e:
                    logger.error(f"Error downloading track for {discovery.fr24_id}: {e}")
                    discovery.track_download_attempted_at = datetime.now(timezone.utc)
                    discovery.track_download_error = str(e)
                    db.commit()
                    continue

            logger.info(f"Download complete! Downloaded {flights_downloaded} flights")

            # Final summary
            total_flights = db.query(FlightLog).filter(
                FlightLog.aircraft_id == aircraft_id
            ).count()

            total_positions = db.query(FlightPosition).filter(
                FlightPosition.aircraft_id == aircraft_id
            ).count()

            logger.info(f"Final database totals for N623FB:")
            logger.info(f"  - Total flights: {total_flights}")
            logger.info(f"  - Total positions: {total_positions}")

    except Exception as e:
        logger.error(f"Critical error: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    asyncio.run(discover_and_download_n623fb())