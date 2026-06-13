#!/usr/bin/env python3
"""
Download historical flight data for active Phoenix PD helicopters
from FlightRadar24 API
"""

import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select
from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog
from app.services.flightradar24_api_service import FlightRadar24APIService
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)


async def download_historical_flights(days_back: int = 60):
    """Download historical flights for active Phoenix PD helicopters"""

    # Initialize FR24 service
    fr24_service = FlightRadar24APIService()
    await fr24_service.initialize()

    try:
        session = SessionLocal()
        try:
            # Get active Phoenix PD helicopters
            result = session.execute(
                select(Aircraft)
                .where((Aircraft.is_phoenix_pd == True) & (Aircraft.is_active == True))
                .order_by(Aircraft.registration)
            )
            active_aircraft = result.scalars().all()

            logger.info(f"Found {len(active_aircraft)} active Phoenix PD helicopters")
            logger.info(f"Will download flights from last {days_back} days")
            logger.info("=" * 60)

            total_new_flights = 0
            total_existing_flights = 0

            for aircraft in active_aircraft:
                logger.info(f"\nProcessing {aircraft.registration}...")

                # We need to make multiple API calls due to 14-day limit
                # Split into chunks of 14 days each
                all_flights = []
                current_date = datetime.now(timezone.utc)

                for chunk_start in range(0, days_back, 14):
                    chunk_end = min(chunk_start + 14, days_back)

                    start_date = current_date - timedelta(days=chunk_end)
                    end_date = current_date - timedelta(days=chunk_start)

                    logger.info(
                        f"  Fetching {start_date.strftime('%Y-%m-%d')} to {end_date.strftime('%Y-%m-%d')}..."
                    )

                    try:
                        response = await fr24_service.get_flight_summary(
                            aircraft.registration,
                            start_date=start_date,
                            end_date=end_date,
                        )

                        flights = response.get("data", [])
                        all_flights.extend(flights)
                        logger.info(f"    Found {len(flights)} flights")

                        # Respect rate limits
                        await asyncio.sleep(3)

                    except Exception as e:
                        logger.error(f"    Error fetching flights: {e}")
                        continue

                # Process discovered flights
                new_flights = 0
                existing_flights = 0

                for flight_data in all_flights:
                    try:
                        # Extract flight information
                        fr24_id = flight_data.get("fr24_id") or flight_data.get(
                            "flight_id"
                        )
                        if not fr24_id:
                            continue

                        # Check if we already have this flight
                        existing = (
                            session.query(FlightDiscovery)
                            .filter(FlightDiscovery.fr24_id == fr24_id)
                            .first()
                        )

                        if existing:
                            existing_flights += 1
                            continue

                        # Parse timestamps
                        departure_time = None
                        arrival_time = None

                        if flight_data.get("departure_time"):
                            dep_str = flight_data["departure_time"]
                            if isinstance(dep_str, str):
                                departure_time = datetime.fromisoformat(
                                    dep_str.replace("Z", "+00:00")
                                )
                            else:
                                departure_time = datetime.fromtimestamp(
                                    dep_str, tz=timezone.utc
                                )

                        if flight_data.get("arrival_time"):
                            arr_str = flight_data["arrival_time"]
                            if isinstance(arr_str, str):
                                arrival_time = datetime.fromisoformat(
                                    arr_str.replace("Z", "+00:00")
                                )
                            else:
                                arrival_time = datetime.fromtimestamp(
                                    arr_str, tz=timezone.utc
                                )

                        # Calculate duration
                        duration_minutes = None
                        if departure_time and arrival_time:
                            duration_minutes = int(
                                (arrival_time - departure_time).total_seconds() / 60
                            )

                        # Create new flight discovery record
                        discovery = FlightDiscovery(
                            fr24_id=fr24_id,
                            registration=aircraft.registration,
                            callsign=flight_data.get("callsign", ""),
                            aircraft_type=flight_data.get("aircraft_type", ""),
                            hex_code=flight_data.get("hex", ""),
                            departure_time=departure_time,
                            arrival_time=arrival_time,
                            origin_airport=flight_data.get("origin", ""),
                            destination_airport=flight_data.get("destination", ""),
                            flight_duration_minutes=duration_minutes,
                            first_seen=departure_time,
                            last_seen=arrival_time,
                            discovered_at=datetime.now(timezone.utc),
                            track_downloaded=False,
                            positions_count=0,
                        )

                        session.add(discovery)
                        new_flights += 1

                    except Exception as e:
                        logger.error(
                            f"    Error processing flight {flight_data.get('fr24_id', 'unknown')}: {e}"
                        )
                        continue

                # Commit after each aircraft
                session.commit()

                logger.info(f"  Summary for {aircraft.registration}:")
                logger.info(f"    New flights: {new_flights}")
                logger.info(f"    Already in database: {existing_flights}")
                logger.info(f"    Total processed: {len(all_flights)}")

                total_new_flights += new_flights
                total_existing_flights += existing_flights

            # Final summary
            logger.info("\n" + "=" * 60)
            logger.info("DOWNLOAD COMPLETE")
            logger.info(f"Total new flights discovered: {total_new_flights}")
            logger.info(f"Total existing flights skipped: {total_existing_flights}")
            logger.info("=" * 60)

            # Now trigger download of detailed tracks for new flights
            if total_new_flights > 0:
                logger.info("\nStarting track download process...")

                # Get all flights that need track downloads
                flights_to_download = (
                    session.query(FlightDiscovery)
                    .filter(
                        (FlightDiscovery.track_downloaded == False)
                        & (
                            FlightDiscovery.registration.in_(
                                [a.registration for a in active_aircraft]
                            )
                        )
                    )
                    .limit(50)
                    .all()
                )  # Limit to avoid rate limits

                logger.info(
                    f"Found {len(flights_to_download)} flights needing track downloads"
                )

                downloaded_count = 0
                for flight in flights_to_download:
                    try:
                        logger.info(
                            f"  Downloading track for {flight.registration} flight {flight.fr24_id}..."
                        )

                        # Download the track
                        positions = await fr24_service.get_flight_track(flight.fr24_id)

                        if positions and len(positions) > 0:
                            # Create flight log record
                            flight_log = FlightLog(
                                aircraft_id=next(
                                    (
                                        a.id
                                        for a in active_aircraft
                                        if a.registration == flight.registration
                                    ),
                                    None,
                                ),
                                flight_id=flight.fr24_id,
                                callsign=flight.callsign,
                                departure_time=flight.departure_time,
                                arrival_time=flight.arrival_time,
                                flight_duration_minutes=flight.flight_duration_minutes,
                                departure_airport=flight.origin_airport,
                                arrival_airport=flight.destination_airport,
                                data_source="fr24_api",
                                raw_data={
                                    "fr24_id": flight.fr24_id,
                                    "positions_count": len(positions),
                                },
                            )

                            # Calculate altitude statistics from positions
                            altitudes = [
                                p.altitude_feet for p in positions if p.altitude_feet
                            ]
                            if altitudes:
                                flight_log.max_altitude_feet = max(altitudes)
                                flight_log.min_altitude_feet = min(altitudes)
                                flight_log.avg_altitude_feet = sum(altitudes) / len(
                                    altitudes
                                )

                            session.add(flight_log)

                            # Update discovery record
                            flight.track_downloaded = True
                            flight.track_download_attempted_at = datetime.now(
                                timezone.utc
                            )
                            flight.positions_count = len(positions)

                            session.commit()
                            downloaded_count += 1
                            logger.info(f"    Success: {len(positions)} positions")
                        else:
                            # Mark as attempted even if no data
                            flight.track_download_attempted_at = datetime.now(
                                timezone.utc
                            )
                            flight.track_download_error = "No position data returned"
                            session.commit()
                            logger.info(f"    No position data available")

                        # Respect rate limits
                        await asyncio.sleep(3)

                    except Exception as e:
                        logger.error(f"    Error downloading track: {e}")
                        flight.track_download_attempted_at = datetime.now(timezone.utc)
                        flight.track_download_error = str(e)
                        session.commit()
                        continue

                logger.info(
                    f"\nTrack download complete: {downloaded_count} tracks downloaded"
                )

        finally:
            session.close()

    finally:
        await fr24_service.close()


if __name__ == "__main__":
    asyncio.run(download_historical_flights(60))
