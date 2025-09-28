"""
System Logs API endpoints
"""
from typing import Optional, List
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_, func

from app.db.database import get_db
from app.models.system_logs import SystemLog, LogLevel, LogCategory
from app.schemas.logs import SystemLogResponse, PaginatedLogsResponse

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("/", response_model=PaginatedLogsResponse)
def get_logs(
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(100, enum=[25, 50, 100], description="Items per page"),
    level: Optional[LogLevel] = Query(None, description="Filter by log level"),
    category: Optional[LogCategory] = Query(None, description="Filter by category"),
    search: Optional[str] = Query(None, description="Search in message"),
    flight_id: Optional[str] = Query(None, description="Filter by flight ID"),
    registration: Optional[str] = Query(None, description="Filter by aircraft registration"),
    days: int = Query(30, ge=1, le=90, description="Number of days to look back"),
):
    """
    Get paginated system logs with optional filters

    Args:
        page: Page number (starts at 1)
        page_size: Number of items per page (25, 50, or 100)
        level: Filter by log level (debug, info, warning, error, critical)
        category: Filter by category (flight_download, fr24_api, etc.)
        search: Search text in message
        flight_id: Filter by flight ID
        registration: Filter by aircraft registration
        days: Number of days to look back (default 30, max 90)
    """
    # Build query
    query = db.query(SystemLog)

    # Time filter - only show logs from last N days
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)
    query = query.filter(SystemLog.created_at >= cutoff_date)

    # Apply filters
    if level:
        query = query.filter(SystemLog.level == level)

    if category:
        query = query.filter(SystemLog.category == category)

    if search:
        query = query.filter(SystemLog.message.ilike(f"%{search}%"))

    if flight_id:
        query = query.filter(SystemLog.flight_id == flight_id)

    if registration:
        query = query.filter(SystemLog.registration == registration)

    # Get total count
    total_count = query.count()

    # Calculate pagination
    total_pages = (total_count + page_size - 1) // page_size
    offset = (page - 1) * page_size

    # Get paginated results
    logs = query.order_by(desc(SystemLog.created_at)).offset(offset).limit(page_size).all()

    # Convert to response models
    log_responses = []
    for log in logs:
        log_responses.append(SystemLogResponse.from_orm(log))

    return PaginatedLogsResponse(
        logs=log_responses,
        total=total_count,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
        has_next=page < total_pages,
        has_prev=page > 1
    )


@router.get("/levels", response_model=List[str])
def get_log_levels():
    """Get all available log levels"""
    return [level.value for level in LogLevel]


@router.get("/categories", response_model=List[str])
def get_log_categories():
    """Get all available log categories"""
    return [category.value for category in LogCategory]


@router.get("/stats")
def get_log_stats(
    db: Session = Depends(get_db),
    days: int = Query(7, ge=1, le=30, description="Number of days for statistics"),
):
    """
    Get log statistics for the specified period

    Returns counts by level and category, plus recent critical errors
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days)

    # Count by level
    level_counts = db.query(
        SystemLog.level,
        func.count(SystemLog.id).label('count')
    ).filter(
        SystemLog.created_at >= cutoff_date
    ).group_by(SystemLog.level).all()

    # Count by category
    category_counts = db.query(
        SystemLog.category,
        func.count(SystemLog.id).label('count')
    ).filter(
        SystemLog.created_at >= cutoff_date
    ).group_by(SystemLog.category).all()

    # Get recent critical errors
    critical_errors = db.query(SystemLog).filter(
        and_(
            SystemLog.created_at >= cutoff_date,
            SystemLog.level == LogLevel.CRITICAL
        )
    ).order_by(desc(SystemLog.created_at)).limit(5).all()

    # Get recent errors (not critical)
    recent_errors = db.query(SystemLog).filter(
        and_(
            SystemLog.created_at >= cutoff_date,
            SystemLog.level == LogLevel.ERROR
        )
    ).order_by(desc(SystemLog.created_at)).limit(10).all()

    return {
        "period_days": days,
        "levels": {level.value: count for level, count in level_counts},
        "categories": {category.value: count for category, count in category_counts},
        "critical_errors": [SystemLogResponse.from_orm(log) for log in critical_errors],
        "recent_errors": [SystemLogResponse.from_orm(log) for log in recent_errors],
        "total_logs": sum(count for _, count in level_counts)
    }


@router.delete("/cleanup")
def cleanup_old_logs(
    db: Session = Depends(get_db),
    days_to_keep: int = Query(30, ge=7, le=90, description="Keep logs for this many days"),
    dry_run: bool = Query(True, description="If true, only show what would be deleted"),
):
    """
    Clean up logs older than specified days

    Args:
        days_to_keep: Number of days of logs to keep (default 30)
        dry_run: If true, only show count of logs that would be deleted
    """
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)

    # Find logs to delete
    old_logs_query = db.query(SystemLog).filter(SystemLog.created_at < cutoff_date)
    count = old_logs_query.count()

    if dry_run:
        return {
            "dry_run": True,
            "logs_to_delete": count,
            "cutoff_date": cutoff_date.isoformat(),
            "message": f"Would delete {count} logs older than {cutoff_date.strftime('%Y-%m-%d')}"
        }
    else:
        # Actually delete the logs
        old_logs_query.delete(synchronize_session=False)
        db.commit()

        return {
            "dry_run": False,
            "logs_deleted": count,
            "cutoff_date": cutoff_date.isoformat(),
            "message": f"Deleted {count} logs older than {cutoff_date.strftime('%Y-%m-%d')}"
        }