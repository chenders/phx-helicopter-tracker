"""
Manual FR24 data fetching endpoints
Allows controlled, on-demand data fetching instead of automatic scheduled tasks
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.services.fr24_rate_limiter import fr24_rate_limiter

# DEPRECATED: download_and_import_fr24_flights removed - use new monitoring system
# from app.workers.flight_tracking_tasks import monitor_and_download_complete_flights

router = APIRouter()


@router.post("/fetch-helicopter-data", deprecated=True)
async def manually_fetch_helicopter_data(
    registration: str, days_back: int = 1, db=Depends(get_db)
) -> Dict[str, Any]:
    """
    DEPRECATED: This endpoint used the old inefficient download method.
    The system now automatically monitors flights and downloads complete tracks.

    The new system:
    - Monitors flights every 5 minutes via monitor_and_download_complete_flights
    - Downloads complete tracks when flights land (100% of positions)
    - Uses 90% fewer API credits

    Args:
        registration: Aircraft registration (e.g., "N622FB")
        days_back: Number of days of historical data to fetch (default: 1)

    Returns:
        Deprecation notice
    """
    raise HTTPException(
        status_code=410,  # Gone
        detail=(
            "This endpoint has been deprecated. The system now automatically "
            "monitors all flights and downloads complete tracks when they land. "
            "This captures 100% of positions using 90% fewer API credits. "
            "Check /api/v1/flights for complete flight data."
        ),
    )


@router.get("/fetch-status/{task_id}")
async def get_fetch_status(task_id: str) -> Dict[str, Any]:
    """
    Check the status of a manual fetch task

    Args:
        task_id: The task ID returned from manually_fetch_helicopter_data

    Returns:
        Task status and result if completed
    """
    from celery.result import AsyncResult
    from app.workers.celery_app import celery_app

    result = AsyncResult(task_id, app=celery_app)

    response = {"task_id": task_id, "status": result.status, "ready": result.ready()}

    if result.ready():
        if result.successful():
            response["result"] = result.result
        else:
            response["error"] = str(result.info)

    return response


@router.post("/pause-all-fr24-tasks")
async def pause_all_fr24_tasks() -> Dict[str, str]:
    """
    Emergency stop for all FR24 API tasks
    This doesn't stop currently running tasks but prevents new ones from starting
    """
    # This would need to be implemented with a flag in Redis that tasks check
    from app.services.cache_service import cache_service

    cache_service.set("fr24_tasks_paused", True, ttl=3600)  # Pause for 1 hour

    return {
        "status": "All FR24 tasks paused for 1 hour",
        "message": "Use /resume-all-fr24-tasks to resume earlier",
    }


@router.post("/resume-all-fr24-tasks")
async def resume_all_fr24_tasks() -> Dict[str, str]:
    """
    Resume FR24 API tasks after pause
    """
    from app.services.cache_service import cache_service

    cache_service.delete("fr24_tasks_paused")

    return {
        "status": "FR24 tasks resumed",
        "rate_limit_status": fr24_rate_limiter.get_usage_stats(),
    }


@router.post("/discover-historical-flights")
async def discover_historical_flights(
    days_back: int = 60, registration: Optional[str] = None
) -> Dict[str, Any]:
    """
    Trigger historical flight discovery for Phoenix PD helicopters

    Args:
        days_back: Number of days to go back (default: 60, max: 730)
        registration: Optional - specific aircraft registration (e.g., "N621FB")
                     If not provided, discovers for all Phoenix PD helicopters

    Returns:
        Task ID and status

    Example:
        POST /api/v1/manual-fr24/discover-historical-flights?days_back=60

    Note: This task processes in 14-day chunks to stay within API rate limits.
          For 60 days with 5 aircraft, expect ~20-30 minutes to complete.
    """
    from app.workers.celery_app import celery_app

    if days_back > 730:
        raise HTTPException(
            status_code=400,
            detail="Maximum days_back is 730 (FR24 API limit for historical data)",
        )

    if days_back < 1:
        raise HTTPException(status_code=400, detail="days_back must be at least 1")

    # Check rate limiter
    rate_status = fr24_rate_limiter.get_usage_stats()
    month_remaining = rate_status.get("month", {}).get("remaining", 0)
    if month_remaining < 10000:
        raise HTTPException(
            status_code=429,
            detail=f"Insufficient FR24 credits. Remaining this month: {month_remaining}",
        )

    if registration:
        # Discover for specific aircraft
        task = celery_app.send_task(
            "discover_full_year_for_registration",
            kwargs={"registration": registration.upper(), "days_back": days_back},
        )

        return {
            "task_id": task.id,
            "status": "started",
            "message": f"Started historical discovery for {registration} ({days_back} days)",
            "registration": registration.upper(),
            "days_back": days_back,
            "estimated_chunks": days_back // 14 + 1,
            "check_status_url": f"/api/v1/manual-fr24/fetch-status/{task.id}",
        }
    else:
        # Discover for all Phoenix PD helicopters
        task = celery_app.send_task(
            "discover_full_year_all_phoenix_pd", kwargs={"days_back": days_back}
        )

        return {
            "task_id": task.id,
            "status": "started",
            "message": f"Started historical discovery for all Phoenix PD helicopters ({days_back} days)",
            "aircraft_count": 5,
            "days_back": days_back,
            "estimated_chunks_per_aircraft": days_back // 14 + 1,
            "estimated_total_chunks": (days_back // 14 + 1) * 5,
            "estimated_duration_minutes": ((days_back // 14 + 1) * 5)
            * 2,  # ~2 min per chunk
            "check_status_url": f"/api/v1/manual-fr24/fetch-status/{task.id}",
        }


@router.post("/download-discovered-tracks")
async def download_discovered_tracks(batch_size: int = 10) -> Dict[str, Any]:
    """
    Trigger download of tracks for discovered flights that haven't been downloaded yet

    Args:
        batch_size: Number of flights to process in this batch (default: 10)

    Returns:
        Task ID and status

    Example:
        POST /api/v1/manual-fr24/download-discovered-tracks?batch_size=20
    """
    from app.workers.celery_app import celery_app
    from app.models.flight_discoveries import FlightDiscovery
    from sqlalchemy import and_

    # Check how many flights need downloading
    db = next(get_db())
    pending_count = (
        db.query(FlightDiscovery)
        .filter(
            and_(
                FlightDiscovery.track_downloaded == False,
                FlightDiscovery.track_download_attempted_at.is_(None),
            )
        )
        .count()
    )

    if pending_count == 0:
        return {"message": "No pending flights to download", "pending_count": 0}

    # Check rate limiter
    rate_status = fr24_rate_limiter.get_usage_stats()
    month_remaining = rate_status.get("month", {}).get("remaining", 0)
    if month_remaining < 1000:
        raise HTTPException(
            status_code=429,
            detail=f"Insufficient FR24 credits. Remaining this month: {month_remaining}",
        )

    task = celery_app.send_task(
        "download_tracks_for_discovered_flights", kwargs={"batch_size": batch_size}
    )

    return {
        "task_id": task.id,
        "status": "started",
        "message": f"Started track download for {batch_size} flights",
        "batch_size": batch_size,
        "pending_flights": pending_count,
        "estimated_duration_minutes": batch_size * 0.5,  # ~30 sec per flight
        "check_status_url": f"/api/v1/manual-fr24/fetch-status/{task.id}",
    }


@router.get("/discovery-status")
async def get_discovery_status(db=Depends(get_db)) -> Dict[str, Any]:
    """
    Get status of flight discovery and track downloads

    Returns counts of discovered flights, downloaded tracks, and pending downloads
    """
    from app.models.flight_discoveries import FlightDiscovery
    from sqlalchemy import and_, func, case

    total_discovered = db.query(FlightDiscovery).count()
    downloaded = (
        db.query(FlightDiscovery)
        .filter(FlightDiscovery.track_downloaded == True)
        .count()
    )
    pending = (
        db.query(FlightDiscovery)
        .filter(
            and_(
                FlightDiscovery.track_downloaded == False,
                FlightDiscovery.track_download_attempted_at.is_(None),
            )
        )
        .count()
    )
    failed = (
        db.query(FlightDiscovery)
        .filter(
            and_(
                FlightDiscovery.track_downloaded == False,
                FlightDiscovery.track_download_attempted_at.isnot(None),
            )
        )
        .count()
    )

    # Get breakdown by registration
    by_registration = (
        db.query(
            FlightDiscovery.registration,
            func.count(FlightDiscovery.id).label("total"),
            func.sum(
                case((FlightDiscovery.track_downloaded == True, 1), else_=0)
            ).label("downloaded"),
        )
        .group_by(FlightDiscovery.registration)
        .all()
    )

    return {
        "total_discovered": total_discovered,
        "tracks_downloaded": downloaded,
        "pending_download": pending,
        "download_failed": failed,
        "completion_percentage": round(
            (downloaded / total_discovered * 100) if total_discovered > 0 else 0, 1
        ),
        "by_aircraft": [
            {
                "registration": reg,
                "total_discovered": total,
                "tracks_downloaded": downloaded or 0,
                "pending": total - (downloaded or 0),
            }
            for reg, total, downloaded in by_registration
        ],
    }
