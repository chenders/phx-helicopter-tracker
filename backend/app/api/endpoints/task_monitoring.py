"""
API endpoints for Celery task monitoring
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from celery.result import AsyncResult

from app.api.deps import get_db
from app.workers.celery_app import celery_app
from app.crud.task_monitoring import (
    task_history_crud,
    task_event_crud,
    task_metrics_crud,
)
from app.schemas.task_monitoring import (
    TaskHistory,
    TaskEvent,
    TaskMetrics,
    TaskStatusSummary,
    TaskMonitoringDashboard,
    TaskEventCreate,
)

router = APIRouter()


@router.get("/dashboard", response_model=TaskMonitoringDashboard)
def get_monitoring_dashboard(
    *, db: Session = Depends(get_db)
) -> TaskMonitoringDashboard:
    """Get complete task monitoring dashboard data"""

    # Get status summary
    status_summary = task_history_crud.get_status_summary(db)

    # Get recent tasks
    recent_tasks = task_history_crud.get_recent(db, limit=50)

    # Get recent events (warnings and errors)
    recent_events = task_event_crud.get_recent(db, limit=50, severity=2)

    # Get task metrics
    task_metrics = task_metrics_crud.get_all(db)

    # Get scheduled tasks from Celery beat
    scheduled_tasks = []
    try:
        from app.workers.celery_app import celery_app

        beat_schedule = celery_app.conf.beat_schedule

        for name, config in beat_schedule.items():
            scheduled_tasks.append(
                {
                    "name": name,
                    "task": config.get("task"),
                    "schedule": config.get("schedule"),
                    "kwargs": config.get("kwargs", {}),
                    "options": config.get("options", {}),
                }
            )
    except Exception as e:
        # Log error but don't fail the endpoint
        pass

    # Get current credit usage
    credit_usage = {}
    try:
        # Get FR24 credit stats directly from the service
        from app.services.flightradar24_api_service import fr24_api_service
        import asyncio
        
        async def get_credits():
            await fr24_api_service.initialize()
            return await fr24_api_service.credit_manager.get_usage_stats()
        
        credit_usage = asyncio.run(get_credits())
    except Exception:
        pass

    return TaskMonitoringDashboard(
        status_summary=status_summary,
        recent_tasks=recent_tasks,
        recent_events=recent_events,
        task_metrics=task_metrics,
        scheduled_tasks=scheduled_tasks,
        credit_usage=credit_usage,
    )


@router.get("/history", response_model=List[TaskHistory])
def get_task_history(
    *,
    db: Session = Depends(get_db),
    task_name: Optional[str] = Query(None, description="Filter by task name"),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(100, ge=1, le=1000),
) -> List[TaskHistory]:
    """Get task execution history"""
    return task_history_crud.get_recent(
        db, limit=limit, task_name=task_name, status=status
    )


@router.get("/history/{task_id}", response_model=TaskHistory)
def get_task_details(*, db: Session = Depends(get_db), task_id: str) -> TaskHistory:
    """Get details of a specific task execution"""
    task = task_history_crud.get_by_task_id(db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.get("/events", response_model=List[TaskEvent])
def get_task_events(
    *,
    db: Session = Depends(get_db),
    severity: Optional[int] = Query(None, ge=1, le=4, description="Minimum severity"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=1000),
) -> List[TaskEvent]:
    """Get task events and notable occurrences"""
    return task_event_crud.get_recent(
        db, limit=limit, severity=severity, event_type=event_type
    )


@router.post("/events", response_model=TaskEvent)
def create_task_event(
    *, db: Session = Depends(get_db), event_in: TaskEventCreate
) -> TaskEvent:
    """Create a new task event (for manual logging)"""
    return task_event_crud.create(db, obj_in=event_in)


@router.get("/metrics", response_model=List[TaskMetrics])
def get_task_metrics(*, db: Session = Depends(get_db)) -> List[TaskMetrics]:
    """Get aggregated metrics for all tasks"""
    return task_metrics_crud.get_all(db)


@router.get("/metrics/{task_name}", response_model=TaskMetrics)
def get_task_metric_details(
    *, db: Session = Depends(get_db), task_name: str
) -> TaskMetrics:
    """Get metrics for a specific task"""
    metrics = task_metrics_crud.get_by_name(db, task_name=task_name)
    if not metrics:
        raise HTTPException(status_code=404, detail="Task metrics not found")
    return metrics


@router.get("/status/summary", response_model=TaskStatusSummary)
def get_status_summary(*, db: Session = Depends(get_db)) -> TaskStatusSummary:
    """Get summary of current task statuses"""
    return task_history_crud.get_status_summary(db)


@router.get("/active")
def get_active_tasks() -> List[Dict[str, Any]]:
    """Get currently active/running tasks from Celery"""
    try:
        inspect = celery_app.control.inspect()
        active = inspect.active()

        if not active:
            return []

        all_active = []
        for worker, tasks in active.items():
            for task in tasks:
                all_active.append(
                    {
                        "worker": worker,
                        "task_id": task.get("id"),
                        "name": task.get("name"),
                        "args": task.get("args"),
                        "kwargs": task.get("kwargs"),
                        "time_start": task.get("time_start"),
                    }
                )

        return all_active
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scheduled")
def get_scheduled_tasks() -> List[Dict[str, Any]]:
    """Get scheduled tasks from Celery beat"""
    try:
        from app.workers.celery_app import celery_app

        beat_schedule = celery_app.conf.beat_schedule

        scheduled = []
        for name, config in beat_schedule.items():
            scheduled.append(
                {
                    "name": name,
                    "task": config.get("task"),
                    "schedule_seconds": config.get("schedule"),
                    "kwargs": config.get("kwargs", {}),
                    "options": config.get("options", {}),
                    "enabled": True,  # All scheduled tasks are enabled
                }
            )

        return scheduled
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queues")
def get_queue_info() -> Dict[str, Any]:
    """Get information about Celery queues"""
    try:
        inspect = celery_app.control.inspect()

        # Get queue lengths
        reserved = inspect.reserved()
        scheduled = inspect.scheduled()
        active = inspect.active()

        queue_info = {
            "workers": list(reserved.keys()) if reserved else [],
            "reserved_tasks": sum(len(tasks) for tasks in reserved.values())
            if reserved
            else 0,
            "scheduled_tasks": sum(len(tasks) for tasks in scheduled.values())
            if scheduled
            else 0,
            "active_tasks": sum(len(tasks) for tasks in active.values())
            if active
            else 0,
            "details": {"reserved": reserved, "scheduled": scheduled, "active": active},
        }

        return queue_info
    except Exception as e:
        return {
            "error": str(e),
            "workers": [],
            "reserved_tasks": 0,
            "scheduled_tasks": 0,
            "active_tasks": 0,
        }


@router.post("/retry/{task_id}")
def retry_failed_task(*, db: Session = Depends(get_db), task_id: str) -> Dict[str, Any]:
    """Retry a failed task"""
    task = task_history_crud.get_by_task_id(db, task_id=task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if task.status != "FAILURE":
        raise HTTPException(status_code=400, detail="Only failed tasks can be retried")

    # Re-execute the task with the same arguments
    try:
        result = celery_app.send_task(
            task.task_name, args=task.args or [], kwargs=task.kwargs or {}
        )

        return {
            "message": "Task requeued for retry",
            "new_task_id": result.id,
            "original_task_id": task_id,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/purge")
def purge_old_history(
    *,
    db: Session = Depends(get_db),
    days_old: int = Query(30, ge=1, description="Delete records older than N days"),
) -> Dict[str, Any]:
    """Purge old task history records"""
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_old)

    # Delete old task history
    deleted_history = (
        db.query(TaskHistory).filter(TaskHistory.created_at < cutoff_date).delete()
    )

    # Delete old events
    deleted_events = (
        db.query(TaskEvent).filter(TaskEvent.created_at < cutoff_date).delete()
    )

    db.commit()

    return {
        "message": f"Purged records older than {days_old} days",
        "deleted_history": deleted_history,
        "deleted_events": deleted_events,
        "cutoff_date": cutoff_date.isoformat(),
    }
