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
    registration: str,
    days_back: int = 1,
    db=Depends(get_db)
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
        )
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
    
    response = {
        "task_id": task_id,
        "status": result.status,
        "ready": result.ready()
    }
    
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
        "message": "Use /resume-all-fr24-tasks to resume earlier"
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
        "rate_limit_status": fr24_rate_limiter.get_usage_stats()
    }