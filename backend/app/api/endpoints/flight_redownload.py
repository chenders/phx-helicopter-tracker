"""
API endpoints for redownloading flight data with quality issues
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any, List, Optional
from pydantic import BaseModel

from app.api.deps import get_db
import logging

logger = logging.getLogger(__name__)

router = APIRouter()


class FlightGap(BaseModel):
    flight_log_id: int
    flight_id: str
    departure_time: str
    gaps_count: int
    max_gap_minutes: float


class RedownloadRequest(BaseModel):
    flight_log_ids: List[int]
    trigger_download: bool = True


class RedownloadResponse(BaseModel):
    flights_reset: int
    task_id: Optional[str] = None
    details: List[Dict[str, Any]]


@router.get("/flights-with-gaps")
def get_flights_with_gaps(
    min_gap_minutes: int = 30,
    limit: int = 50,
    db: Session = Depends(get_db)
) -> List[FlightGap]:
    """
    Find flights with large gaps in position data

    Args:
        min_gap_minutes: Minimum gap size to consider (default: 30)
        limit: Maximum number of results (default: 50)
    """
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
        LIMIT :limit
    """)

    result = db.execute(query, {
        "min_gap": min_gap_minutes,
        "limit": limit
    })

    flights = []
    for row in result:
        flights.append(FlightGap(
            flight_log_id=row.flight_log_id,
            flight_id=row.flight_id,
            departure_time=row.departure_time.isoformat(),
            gaps_count=row.gaps_count,
            max_gap_minutes=float(row.max_gap_minutes)
        ))

    return flights


@router.post("/redownload")
def redownload_flights(
    request: RedownloadRequest,
    db: Session = Depends(get_db)
) -> RedownloadResponse:
    """
    Reset and redownload specific flights

    This will:
    1. Delete existing position data
    2. Reset download flags in flight_discoveries
    3. Optionally trigger celery task to redownload

    Args:
        request: Contains flight_log_ids to redownload and whether to trigger download
    """
    details = []
    success_count = 0

    for flight_log_id in request.flight_log_ids:
        try:
            # Get flight info using raw SQL
            flight_info_query = text("""
                SELECT id, flight_id FROM flight_logs WHERE id = :flight_id
            """)
            flight_info = db.execute(
                flight_info_query,
                {"flight_id": flight_log_id}
            ).first()

            if not flight_info:
                details.append({
                    "flight_log_id": flight_log_id,
                    "success": False,
                    "error": "Flight log not found"
                })
                continue

            logger.info(f"Resetting flight {flight_info.flight_id} (ID: {flight_log_id})")

            # Count positions
            count_query = text("""
                SELECT COUNT(*) as count FROM flight_positions
                WHERE flight_log_id = :flight_id
            """)
            position_count = db.execute(
                count_query,
                {"flight_id": flight_log_id}
            ).scalar()

            # Delete positions
            delete_query = text("""
                DELETE FROM flight_positions WHERE flight_log_id = :flight_id
            """)
            result = db.execute(delete_query, {"flight_id": flight_log_id})
            deleted = result.rowcount

            # Find and reset discovery record
            fr24_id = flight_info.flight_id.replace('fr24_complete_', '')

            # Check if discovery exists
            check_discovery_query = text("""
                SELECT id FROM flight_discoveries WHERE fr24_id = :fr24_id
            """)
            discovery = db.execute(
                check_discovery_query,
                {"fr24_id": fr24_id}
            ).first()

            discovery_reset = False
            if discovery:
                # Reset discovery flags
                reset_discovery_query = text("""
                    UPDATE flight_discoveries
                    SET track_downloaded = FALSE,
                        track_download_attempted_at = NULL,
                        track_download_error = NULL,
                        positions_count = NULL
                    WHERE fr24_id = :fr24_id
                """)
                db.execute(reset_discovery_query, {"fr24_id": fr24_id})
                discovery_reset = True

            db.commit()
            success_count += 1

            details.append({
                "flight_log_id": flight_log_id,
                "flight_id": flight_info.flight_id,
                "success": True,
                "positions_deleted": deleted,
                "discovery_reset": discovery_reset
            })

            logger.info(
                f"Reset flight {flight_log_id}: deleted {deleted} positions, "
                f"discovery_reset={discovery_reset}"
            )

        except Exception as e:
            logger.error(f"Error resetting flight {flight_log_id}: {e}")
            details.append({
                "flight_log_id": flight_log_id,
                "success": False,
                "error": str(e)
            })
            db.rollback()

    # Trigger download task if requested
    task_id = None
    if request.trigger_download and success_count > 0:
        try:
            from app.workers.celery_app import celery_app
            batch_size = min(len(request.flight_log_ids), 20)
            task = celery_app.send_task(
                'download_tracks_for_discovered_flights',
                kwargs={'batch_size': batch_size}
            )
            task_id = task.id
            logger.info(f"Triggered download task: {task_id}")
        except Exception as e:
            logger.error(f"Error triggering download task: {e}")

    return RedownloadResponse(
        flights_reset=success_count,
        task_id=task_id,
        details=details
    )


@router.post("/redownload-all-with-gaps")
def redownload_all_with_gaps(
    min_gap_minutes: int = 60,
    limit: int = 10,
    trigger_download: bool = True,
    db: Session = Depends(get_db)
) -> RedownloadResponse:
    """
    Find and redownload all flights with large gaps

    Args:
        min_gap_minutes: Minimum gap size to consider (default: 60)
        limit: Maximum number of flights to redownload (default: 10)
        trigger_download: Whether to trigger the download task (default: True)
    """
    # Find flights with gaps
    flights_with_gaps = get_flights_with_gaps(
        min_gap_minutes=min_gap_minutes,
        limit=limit,
        db=db
    )

    if not flights_with_gaps:
        return RedownloadResponse(
            flights_reset=0,
            task_id=None,
            details=[]
        )

    # Redownload them
    flight_log_ids = [f.flight_log_id for f in flights_with_gaps]

    return redownload_flights(
        request=RedownloadRequest(
            flight_log_ids=flight_log_ids,
            trigger_download=trigger_download
        ),
        db=db
    )
