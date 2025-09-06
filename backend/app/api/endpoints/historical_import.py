"""
API endpoints for historical data import from FlightRadar24
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.api.deps import get_db
from app.crud.aircraft import aircraft_crud
from app.workers.data_import_tasks import import_fr24_historical_data

router = APIRouter()


class HistoricalImportRequest(BaseModel):
    """Request model for historical data import"""

    registrations: List[str] = Field(
        ..., description="Aircraft registrations to import"
    )
    start_date: str = Field(..., description="Start date (YYYY-MM-DD)")
    end_date: Optional[str] = Field(
        None, description="End date (YYYY-MM-DD), defaults to today"
    )
    interval_hours: int = Field(6, description="Hours between data points (default: 6)")
    priority_recent: bool = Field(True, description="Process most recent data first")


class HistoricalImportResponse(BaseModel):
    """Response model for historical import request"""

    task_ids: List[str]
    message: str
    estimated_credits: int
    warnings: List[str]


@router.post("/import/historical", response_model=HistoricalImportResponse)
async def import_historical_data(
    request: HistoricalImportRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Import historical flight data from FlightRadar24 API

    This endpoint queues background tasks to import historical data for specified aircraft.
    Data is imported from most recent to oldest to prioritize current information.
    """
    # Validate dates
    try:
        start = datetime.strptime(request.start_date, "%Y-%m-%d")
        end = datetime.strptime(
            request.end_date
            if request.end_date
            else datetime.now().strftime("%Y-%m-%d"),
            "%Y-%m-%d",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid date format: {e}")

    if start > end:
        raise HTTPException(
            status_code=400, detail="Start date must be before end date"
        )

    if end > datetime.now():
        raise HTTPException(status_code=400, detail="End date cannot be in the future")

    # Calculate date range
    days_range = (end - start).days + 1
    if days_range > 365:
        raise HTTPException(
            status_code=400,
            detail="Date range cannot exceed 365 days to prevent excessive credit usage",
        )

    # Validate aircraft registrations
    valid_registrations = []
    warnings = []

    for reg in request.registrations:
        aircraft = aircraft_crud.get_by_registration(db, registration=reg)
        if aircraft:
            valid_registrations.append(reg)
        else:
            warnings.append(f"Aircraft {reg} not found in database")

    if not valid_registrations:
        raise HTTPException(
            status_code=404, detail="No valid aircraft registrations found"
        )

    # Estimate credit usage
    # Historical data costs approximately 50-100 credits per query
    queries_per_aircraft = days_range * 24 // request.interval_hours
    estimated_credits = (
        len(valid_registrations) * queries_per_aircraft * 75
    )  # Average 75 credits

    if estimated_credits > 30000:  # Half of monthly limit
        warnings.append(
            f"WARNING: Estimated {estimated_credits} credits will be used. "
            "Consider reducing date range or number of aircraft."
        )

    # Sort registrations by priority (Phoenix PD first)
    phoenix_pd = [r for r in valid_registrations if r.startswith("N6") and "FB" in r]
    others = [r for r in valid_registrations if r not in phoenix_pd]
    sorted_registrations = phoenix_pd + others

    # Queue import tasks
    task_ids = []

    for registration in sorted_registrations:
        # Import in reverse chronological order if priority_recent is True
        task = import_fr24_historical_data.apply_async(
            args=[
                registration,
                request.start_date,
                request.end_date
                if request.end_date
                else datetime.now().strftime("%Y-%m-%d"),
                request.interval_hours,
            ],
            priority=10
            if registration in phoenix_pd
            else 5,  # Higher priority for Phoenix PD
        )
        task_ids.append(task.id)

    return HistoricalImportResponse(
        task_ids=task_ids,
        message=f"Queued {len(task_ids)} import tasks for {len(valid_registrations)} aircraft",
        estimated_credits=estimated_credits,
        warnings=warnings,
    )


@router.get("/import/status/{task_id}")
async def get_import_status(task_id: str):
    """Get the status of a historical import task"""
    from app.workers.data_import_tasks import get_import_task_status

    status = get_import_task_status(task_id)
    if status["state"] == "UNKNOWN":
        raise HTTPException(status_code=404, detail="Task not found")

    return status


@router.post("/import/recent-flights")
async def import_recent_flights(
    days: int = 7,
    background_tasks: BackgroundTasks = None,
    db: Session = Depends(get_db),
):
    """
    Import recent flights for all Phoenix PD aircraft
    Automatically processes most recent data first
    """
    # Get all Phoenix PD aircraft
    phoenix_aircraft = aircraft_crud.get_phoenix_pd_aircraft(db, active_only=True)

    if not phoenix_aircraft:
        raise HTTPException(
            status_code=404, detail="No active Phoenix PD aircraft found"
        )

    # Calculate date range
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)

    # Queue import tasks for each aircraft
    task_ids = []
    for aircraft in phoenix_aircraft:
        task = import_fr24_historical_data.apply_async(
            args=[
                aircraft.registration,
                start_date.strftime("%Y-%m-%d"),
                end_date.strftime("%Y-%m-%d"),
                6,  # 6-hour intervals for recent data
            ],
            priority=10,  # High priority for recent data
        )
        task_ids.append({"registration": aircraft.registration, "task_id": task.id})

    return {
        "message": f"Importing last {days} days for {len(phoenix_aircraft)} aircraft",
        "aircraft_count": len(phoenix_aircraft),
        "date_range": {"start": start_date.isoformat(), "end": end_date.isoformat()},
        "tasks": task_ids,
        "note": "Processing from most recent to oldest",
    }


@router.delete("/import/cancel/{task_id}")
async def cancel_import(task_id: str):
    """Cancel a running import task"""
    from app.workers.celery_app import celery_app

    result = celery_app.control.revoke(task_id, terminate=True)

    return {
        "task_id": task_id,
        "status": "cancelled",
        "message": "Import task has been cancelled",
    }


@router.get("/import/active")
async def get_active_imports():
    """Get all active import tasks"""
    from app.workers.data_import_tasks import get_all_active_tasks

    active_tasks = get_all_active_tasks()

    # Filter for import tasks
    import_tasks = [
        task for task in active_tasks if "import" in task.get("name", "").lower()
    ]

    return {"active_imports": len(import_tasks), "tasks": import_tasks}
