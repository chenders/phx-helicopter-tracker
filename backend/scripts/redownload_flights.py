#!/usr/bin/env python3
"""
Script to redownload flight tracks for flights with data quality issues

This script:
1. Deletes existing position data for specified flights
2. Resets download flags in flight_discoveries table
3. Triggers redownload via the existing download_tracks task

Usage:
    python redownload_flights.py --flight-ids 282,734,351
    python redownload_flights.py --all-with-gaps  # Redownload all flights with >30min gaps
"""

import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import argparse
from sqlalchemy import text
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition
from app.models.flight_discoveries import FlightDiscovery
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def find_flights_with_gaps(db, min_gap_minutes: int = 30):
    """Find flights with large gaps in position data"""
    query = text("""
        WITH position_gaps AS (
          SELECT
            flight_log_id,
            timestamp,
            LAG(timestamp) OVER (PARTITION BY flight_log_id ORDER BY timestamp) as prev_timestamp,
            EXTRACT(EPOCH FROM (timestamp - LAG(timestamp) OVER (PARTITION BY flight_log_id ORDER BY timestamp)))/60 as gap_minutes
          FROM flight_positions
        ),
        flights_with_gaps AS (
          SELECT
            pg.flight_log_id,
            fl.flight_id,
            fl.departure_time,
            COUNT(*) FILTER (WHERE gap_minutes > :min_gap) as gaps_count,
            MAX(gap_minutes) as max_gap_minutes
          FROM position_gaps pg
          JOIN flight_logs fl ON fl.id = pg.flight_log_id
          WHERE gap_minutes > :min_gap
          GROUP BY pg.flight_log_id, fl.flight_id, fl.departure_time
        )
        SELECT
          flight_log_id,
          flight_id,
          departure_time,
          gaps_count,
          ROUND(max_gap_minutes::numeric, 2) as max_gap_minutes
        FROM flights_with_gaps
        ORDER BY max_gap_minutes DESC
    """)

    result = db.execute(query, {"min_gap": min_gap_minutes})
    return result.fetchall()


def reset_flight_for_redownload(db, flight_log_id: int):
    """
    Reset a flight to allow redownload:
    1. Delete existing positions
    2. Reset flight_discoveries flags
    """
    # Get flight info
    flight_log = db.query(FlightLog).filter(FlightLog.id == flight_log_id).first()
    if not flight_log:
        logger.error(f"Flight log {flight_log_id} not found")
        return False

    logger.info(f"Resetting flight {flight_log.flight_id} (ID: {flight_log_id})")

    # Count existing positions
    position_count = db.query(FlightPosition).filter(
        FlightPosition.flight_log_id == flight_log_id
    ).count()
    logger.info(f"  Found {position_count} existing positions")

    # Delete positions
    deleted = db.query(FlightPosition).filter(
        FlightPosition.flight_log_id == flight_log_id
    ).delete()
    logger.info(f"  Deleted {deleted} positions")

    # Find corresponding flight_discovery record
    fr24_id = flight_log.flight_id.replace('fr24_complete_', '')
    discovery = db.query(FlightDiscovery).filter(
        FlightDiscovery.fr24_id == fr24_id
    ).first()

    if discovery:
        logger.info(f"  Found discovery record: {discovery.id}")
        discovery.track_downloaded = False
        discovery.track_download_attempted_at = None
        discovery.track_download_error = None
        discovery.positions_count = None
        logger.info(f"  Reset download flags for discovery {discovery.id}")
    else:
        logger.warning(f"  No discovery record found for FR24 ID: {fr24_id}")

    db.commit()
    logger.info(f"  ✓ Flight {flight_log_id} ready for redownload")
    return True


def trigger_track_downloads(batch_size: int = 5):
    """
    Trigger the celery task to download tracks for queued flights
    """
    from app.workers.celery_app import celery_app

    logger.info(f"Triggering track download task (batch_size={batch_size})")
    task = celery_app.send_task(
        'download_tracks_for_discovered_flights',
        kwargs={'batch_size': batch_size}
    )
    logger.info(f"Task queued: {task.id}")
    return task.id


def main():
    parser = argparse.ArgumentParser(description='Redownload flight tracks')
    parser.add_argument(
        '--flight-ids',
        help='Comma-separated list of flight_log IDs to redownload (e.g., 282,734,351)',
        type=str
    )
    parser.add_argument(
        '--all-with-gaps',
        help='Redownload all flights with gaps larger than specified minutes (default: 30)',
        type=int,
        nargs='?',
        const=30,
        default=None
    )
    parser.add_argument(
        '--limit',
        help='Limit number of flights to redownload (default: 10)',
        type=int,
        default=10
    )
    parser.add_argument(
        '--dry-run',
        help='Show what would be done without actually doing it',
        action='store_true'
    )
    parser.add_argument(
        '--trigger-download',
        help='Trigger celery task to download after reset',
        action='store_true'
    )

    args = parser.parse_args()

    db = SessionLocal()

    try:
        flight_ids = []

        if args.flight_ids:
            # Parse specific flight IDs
            flight_ids = [int(fid.strip()) for fid in args.flight_ids.split(',')]
            logger.info(f"Will redownload {len(flight_ids)} specific flights: {flight_ids}")

        elif args.all_with_gaps is not None:
            # Find all flights with gaps
            logger.info(f"Finding flights with gaps > {args.all_with_gaps} minutes...")
            flights_with_gaps = find_flights_with_gaps(db, args.all_with_gaps)

            logger.info(f"Found {len(flights_with_gaps)} flights with large gaps")

            # Limit to specified number
            flights_to_process = flights_with_gaps[:args.limit]

            logger.info(f"\nTop {len(flights_to_process)} flights with gaps:")
            for flight in flights_to_process:
                logger.info(
                    f"  ID {flight.flight_log_id}: {flight.flight_id} - "
                    f"{flight.gaps_count} gap(s), max {flight.max_gap_minutes} min"
                )

            flight_ids = [f.flight_log_id for f in flights_to_process]

        else:
            parser.error("Must specify either --flight-ids or --all-with-gaps")

        if not flight_ids:
            logger.warning("No flights to process")
            return

        if args.dry_run:
            logger.info(f"\n[DRY RUN] Would redownload {len(flight_ids)} flights")
            return

        # Reset flights
        logger.info(f"\nResetting {len(flight_ids)} flights for redownload...")
        success_count = 0
        for flight_id in flight_ids:
            if reset_flight_for_redownload(db, flight_id):
                success_count += 1

        logger.info(f"\n✓ Successfully reset {success_count}/{len(flight_ids)} flights")

        # Trigger download task if requested
        if args.trigger_download:
            batch_size = min(len(flight_ids), 20)  # Download up to 20 at a time
            task_id = trigger_track_downloads(batch_size)
            logger.info(f"\n✓ Download task triggered: {task_id}")
            logger.info("  Check task status with: docker compose logs -f backend")
        else:
            logger.info(
                "\nFlights ready for redownload. To trigger download, either:"
                "\n  1. Run this script again with --trigger-download"
                "\n  2. Wait for the scheduled task to run"
                "\n  3. Manually trigger in the UI"
            )

    finally:
        db.close()


if __name__ == '__main__':
    main()
