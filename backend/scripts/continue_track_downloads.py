#!/usr/bin/env python3
"""
Continue downloading tracks for discovered flights
"""

import asyncio
import sys
from datetime import datetime, timezone
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import select, and_
from app.db.database import SessionLocal
from app.models.aircraft import Aircraft
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog
from app.services.flightradar24_api_service import FlightRadar24APIService
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(message)s")
logger = logging.getLogger(__name__)


async def continue_track_downloads(batch_size: int = 30):
    """Continue downloading tracks for flights that don't have them yet"""

    # Initialize FR24 service
    fr24_service = FlightRadar24APIService()
    await fr24_service.initialize()

    try:
        session = SessionLocal()
        try:
            # Get active aircraft registrations
            result = session.execute(
                select(Aircraft.registration).where(
                    (Aircraft.is_phoenix_pd == True) & (Aircraft.is_active == True)
                )
            )
            active_registrations = [r[0] for r in result.fetchall()]

            # Get flights that need track downloads (excluding those with errors)
            flights_to_download = (
                session.query(FlightDiscovery)
                .filter(
                    and_(
                        FlightDiscovery.track_downloaded == False,
                        FlightDiscovery.registration.in_(active_registrations),
                        FlightDiscovery.track_download_error.is_(None),
                    )
                )
                .limit(batch_size)
                .all()
            )

            logger.info(
                f"Found {len(flights_to_download)} flights needing track downloads"
            )
            logger.info("=" * 60)

            downloaded_count = 0
            error_count = 0

            for i, flight in enumerate(flights_to_download, 1):
                try:
                    logger.info(
                        f"[{i}/{len(flights_to_download)}] Downloading track for {flight.registration} flight {flight.fr24_id}..."
                    )

                    # Get aircraft ID
                    aircraft = (
                        session.query(Aircraft)
                        .filter(Aircraft.registration == flight.registration)
                        .first()
                    )

                    if not aircraft:
                        logger.error(
                            f"  Aircraft {flight.registration} not found in database"
                        )
                        continue

                    # Download the track
                    positions = await fr24_service.get_flight_track(flight.fr24_id)

                    if positions and len(positions) > 0:
                        # Check if flight log already exists
                        existing_log = (
                            session.query(FlightLog)
                            .filter(FlightLog.flight_id == flight.fr24_id)
                            .first()
                        )

                        if not existing_log:
                            # Create flight log record
                            flight_log = FlightLog(
                                aircraft_id=aircraft.id,
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
                            logger.info(
                                f"  Created flight log with {len(positions)} positions"
                            )
                        else:
                            logger.info("  Flight log already exists, updating...")

                        # Update discovery record
                        flight.track_downloaded = True
                        flight.track_download_attempted_at = datetime.now(timezone.utc)
                        flight.positions_count = len(positions)

                        session.commit()
                        downloaded_count += 1
                        logger.info(f"  ✓ Success: {len(positions)} positions")

                    else:
                        # Mark as attempted even if no data
                        flight.track_download_attempted_at = datetime.now(timezone.utc)
                        flight.track_download_error = "No position data returned"
                        session.commit()
                        error_count += 1
                        logger.info("  ✗ No position data available")

                    # Respect rate limits
                    await asyncio.sleep(3)

                except Exception as e:
                    logger.error(f"  ✗ Error: {e}")
                    flight.track_download_attempted_at = datetime.now(timezone.utc)
                    flight.track_download_error = str(e)[
                        :500
                    ]  # Limit error message length
                    session.commit()
                    error_count += 1
                    await asyncio.sleep(3)
                    continue

            # Summary
            logger.info("\n" + "=" * 60)
            logger.info("DOWNLOAD SUMMARY")
            logger.info(f"Successfully downloaded: {downloaded_count}")
            logger.info(f"Errors: {error_count}")

            # Check remaining
            remaining = (
                session.query(FlightDiscovery)
                .filter(
                    and_(
                        FlightDiscovery.track_downloaded == False,
                        FlightDiscovery.registration.in_(active_registrations),
                        FlightDiscovery.track_download_error.is_(None),
                    )
                )
                .count()
            )

            logger.info(f"Remaining to download: {remaining}")
            logger.info("=" * 60)

        finally:
            session.close()

    finally:
        await fr24_service.close()


if __name__ == "__main__":
    asyncio.run(continue_track_downloads(30))
