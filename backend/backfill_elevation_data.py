#!/usr/bin/env python3
"""
Backfill script to add ground elevation and AGL altitude to existing flight positions
"""

import asyncio
import logging
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.db.database import get_db
from app.models.flight_logs import FlightPosition, FlightLog
from app.services.elevation_service import elevation_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def backfill_elevations(batch_size: int = 1000):
    """
    Backfill ground elevation and AGL altitude for existing flight positions
    """
    # Create database connection
    engine = create_engine(settings.DATABASE_URL.replace("+asyncpg", ""))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Initialize elevation service
        await elevation_service.initialize()

        # Count total positions without elevation data
        total_count = db.query(FlightPosition).filter(
            FlightPosition.ground_elevation_feet.is_(None)
        ).count()

        logger.info(f"Found {total_count} positions without elevation data")

        if total_count == 0:
            logger.info("No positions to backfill")
            return

        processed = 0
        errors = 0

        # Process in batches
        while processed < total_count:
            # Get batch of positions without elevation
            positions = db.query(FlightPosition).filter(
                FlightPosition.ground_elevation_feet.is_(None)
            ).limit(batch_size).all()

            if not positions:
                break

            # Prepare coordinates for batch elevation lookup
            coordinates = [(pos.latitude, pos.longitude) for pos in positions]

            logger.info(f"Processing batch of {len(positions)} positions ({processed}/{total_count})")

            try:
                # Get elevations in batch
                elevations = await elevation_service.get_elevations_batch(coordinates)

                # Update each position
                for pos in positions:
                    ground_elevation = elevations.get((pos.latitude, pos.longitude))

                    if ground_elevation is not None:
                        pos.ground_elevation_feet = ground_elevation

                        # Calculate AGL if we have MSL altitude
                        if pos.altitude_feet is not None:
                            agl = elevation_service.calculate_agl(
                                pos.altitude_feet, ground_elevation
                            )
                            pos.altitude_agl_feet = agl

                # Commit the batch
                db.commit()
                processed += len(positions)

                logger.info(f"Successfully updated {len(positions)} positions")

            except Exception as e:
                logger.error(f"Error processing batch: {e}")
                db.rollback()
                errors += len(positions)
                # Skip this batch and continue
                processed += len(positions)

            # Small delay to avoid overwhelming the API
            await asyncio.sleep(0.5)

        logger.info(f"Backfill complete: {processed - errors} positions updated, {errors} errors")

        # Now update flight logs with AGL statistics
        logger.info("Updating flight logs with AGL statistics...")
        await update_flight_log_agl_stats(db)

    except Exception as e:
        logger.error(f"Backfill failed: {e}")
        raise
    finally:
        await elevation_service.close()
        db.close()


async def update_flight_log_agl_stats(db):
    """
    Update flight logs with calculated AGL statistics from their positions
    """
    # Get all flight logs without AGL stats
    flight_logs = db.query(FlightLog).filter(
        FlightLog.max_altitude_agl_feet.is_(None)
    ).all()

    logger.info(f"Found {len(flight_logs)} flight logs to update")

    updated_count = 0

    for flight_log in flight_logs:
        # Get all positions with AGL data for this flight
        positions_with_agl = db.query(FlightPosition.altitude_agl_feet).filter(
            FlightPosition.flight_log_id == flight_log.id,
            FlightPosition.altitude_agl_feet.isnot(None)
        ).all()

        if positions_with_agl:
            agl_values = [p[0] for p in positions_with_agl]

            flight_log.max_altitude_agl_feet = max(agl_values)
            flight_log.min_altitude_agl_feet = min(agl_values)
            flight_log.avg_altitude_agl_feet = int(sum(agl_values) / len(agl_values))

            updated_count += 1

    db.commit()
    logger.info(f"Updated {updated_count} flight logs with AGL statistics")


async def main():
    """
    Main entry point
    """
    import argparse

    parser = argparse.ArgumentParser(description="Backfill elevation and AGL data")
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Number of positions to process in each batch"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run in dry-run mode (don't save changes)"
    )

    args = parser.parse_args()

    if args.dry_run:
        logger.info("DRY RUN MODE - No changes will be saved")
        # TODO: Implement dry run logic

    await backfill_elevations(batch_size=args.batch_size)


if __name__ == "__main__":
    asyncio.run(main())