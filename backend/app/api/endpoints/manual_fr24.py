"""
Manual FR24 data fetching endpoints
Allows controlled, on-demand data fetching instead of automatic scheduled tasks
"""
from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from app.api.deps import get_db
from app.services.fr24_rate_limiter import fr24_rate_limiter
from app.workers.data_import_tasks import download_and_import_fr24_flights

router = APIRouter()


@router.post("/fetch-helicopter-data")
async def manually_fetch_helicopter_data(
    registration: str,
    days_back: int = 1,
    db=Depends(get_db)
) -> Dict[str, Any]:
    """
    Manually trigger FR24 data fetch for a specific helicopter
    
    Args:
        registration: Aircraft registration (e.g., "N622FB")
        days_back: Number of days of historical data to fetch (default: 1)
    
    Returns:
        Task status and data fetched
    """
    # Check rate limits first
    can_request, reason = fr24_rate_limiter.can_make_request()
    if not can_request:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {reason}. Please wait before making another request."
        )
    
    # Validate registration
    valid_registrations = [
        "N621FB", "N622FB", "N623FB", "N624FB", 
        "N625FB", "N626FB", "N627FB", "N628FB"
    ]
    
    if registration not in valid_registrations:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid registration. Must be one of: {', '.join(valid_registrations)}"
        )
    
    # Limit days_back to prevent excessive API usage
    if days_back > 7:
        raise HTTPException(
            status_code=400,
            detail="Cannot fetch more than 7 days of historical data at once"
        )
    
    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days_back)
    
    # Trigger the task asynchronously
    task = download_and_import_fr24_flights.delay(
        registration=registration,
        start_date=start_date.strftime("%Y-%m-%d"),
        end_date=end_date.strftime("%Y-%m-%d"),
        format="kml"
    )
    
    return {
        "status": "Task queued",
        "task_id": task.id,
        "registration": registration,
        "date_range": {
            "start": start_date.strftime("%Y-%m-%d"),
            "end": end_date.strftime("%Y-%m-%d")
        },
        "rate_limit_status": fr24_rate_limiter.get_usage_stats()
    }


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