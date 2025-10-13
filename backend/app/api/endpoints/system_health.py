"""
System Health API endpoints
View detected errors and system health metrics
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.system_issues import SystemIssue
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/system-health", tags=["system-health"])


@router.get("/health-report")
async def get_health_report():
    """
    Get overall system health report
    """
    # Trigger health report generation
    task = celery_app.send_task('get_system_health_report')
    result = task.get(timeout=10)
    return result


@router.get("/issues")
async def get_issues(
    resolved: Optional[bool] = Query(None, description="Filter by resolution status"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    component: Optional[str] = Query(None, description="Filter by component"),
    limit: int = Query(100, le=500, description="Max results"),
    db: Session = Depends(get_db)
):
    """
    Get list of detected system issues
    """
    query = db.query(SystemIssue)

    # Apply filters
    if resolved is not None:
        query = query.filter(SystemIssue.is_resolved == resolved)

    if priority:
        query = query.filter(SystemIssue.priority == priority)

    if component:
        query = query.filter(SystemIssue.component == component)

    # Order by priority and recent activity
    query = query.order_by(
        desc(SystemIssue.priority == 'critical'),
        desc(SystemIssue.priority == 'high'),
        desc(SystemIssue.last_seen)
    )

    issues = query.limit(limit).all()

    return {
        "total": len(issues),
        "issues": [
            {
                "id": issue.id,
                "issue_type": issue.issue_type,
                "component": issue.component,
                "priority": issue.priority,
                "error_name": issue.error_name,
                "error_message": issue.error_message,
                "occurrence_count": issue.occurrence_count,
                "first_seen": issue.first_seen.isoformat(),
                "last_seen": issue.last_seen.isoformat(),
                "is_resolved": issue.is_resolved,
                "context": issue.context
            }
            for issue in issues
        ]
    }


@router.get("/issues/{issue_id}")
async def get_issue_detail(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific issue
    """
    issue = db.query(SystemIssue).filter(SystemIssue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    return {
        "id": issue.id,
        "issue_type": issue.issue_type,
        "component": issue.component,
        "priority": issue.priority,
        "error_name": issue.error_name,
        "error_message": issue.error_message,
        "stack_trace": issue.stack_trace,
        "context": issue.context,
        "occurrence_count": issue.occurrence_count,
        "first_seen": issue.first_seen.isoformat(),
        "last_seen": issue.last_seen.isoformat(),
        "is_resolved": issue.is_resolved,
        "resolved_at": issue.resolved_at.isoformat() if issue.resolved_at else None,
        "resolved_by": issue.resolved_by,
        "resolution_notes": issue.resolution_notes,
        "tags": issue.tags
    }


@router.post("/issues/{issue_id}/resolve")
async def resolve_issue(
    issue_id: int,
    resolution_notes: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """
    Mark an issue as resolved
    """
    issue = db.query(SystemIssue).filter(SystemIssue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.is_resolved = True
    issue.resolved_at = datetime.utcnow()
    issue.resolved_by = "manual"
    issue.resolution_notes = resolution_notes

    db.commit()

    return {
        "success": True,
        "message": f"Issue {issue_id} marked as resolved"
    }


@router.post("/issues/{issue_id}/reopen")
async def reopen_issue(
    issue_id: int,
    db: Session = Depends(get_db)
):
    """
    Reopen a resolved issue
    """
    issue = db.query(SystemIssue).filter(SystemIssue.id == issue_id).first()

    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.is_resolved = False
    issue.resolved_at = None
    issue.resolved_by = None
    issue.resolution_notes = None

    db.commit()

    return {
        "success": True,
        "message": f"Issue {issue_id} reopened"
    }


@router.get("/issues/by-component")
async def get_issues_by_component(
    resolved: bool = False,
    db: Session = Depends(get_db)
):
    """
    Get issue counts grouped by component
    """
    issues = db.query(SystemIssue).filter(
        SystemIssue.is_resolved == resolved
    ).all()

    by_component = {}
    for issue in issues:
        component = issue.component
        if component not in by_component:
            by_component[component] = {
                'count': 0,
                'total_occurrences': 0,
                'priorities': {'critical': 0, 'high': 0, 'medium': 0, 'low': 0}
            }
        by_component[component]['count'] += 1
        by_component[component]['total_occurrences'] += issue.occurrence_count
        by_component[component]['priorities'][issue.priority] += 1

    return by_component


@router.post("/monitor-now")
async def trigger_monitoring():
    """
    Manually trigger error monitoring
    """
    task = celery_app.send_task('monitor_system_errors', kwargs={'hours_back': 1})

    return {
        "success": True,
        "task_id": task.id,
        "message": "Error monitoring task started"
    }


@router.get("/stats")
async def get_system_stats(
    db: Session = Depends(get_db)
):
    """
    Get system issue statistics
    """
    # Issues in last 24 hours
    last_24h = datetime.utcnow() - timedelta(hours=24)

    stats = {
        "total_issues": db.query(SystemIssue).count(),
        "active_issues": db.query(SystemIssue).filter(
            SystemIssue.is_resolved == False
        ).count(),
        "resolved_issues": db.query(SystemIssue).filter(
            SystemIssue.is_resolved == True
        ).count(),
        "new_in_last_24h": db.query(SystemIssue).filter(
            SystemIssue.first_seen >= last_24h
        ).count(),
        "resolved_in_last_24h": db.query(SystemIssue).filter(
            and_(
                SystemIssue.is_resolved == True,
                SystemIssue.resolved_at >= last_24h
            )
        ).count(),
        "by_priority": {
            "critical": db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == False,
                    SystemIssue.priority == 'critical'
                )
            ).count(),
            "high": db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == False,
                    SystemIssue.priority == 'high'
                )
            ).count(),
            "medium": db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == False,
                    SystemIssue.priority == 'medium'
                )
            ).count(),
            "low": db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == False,
                    SystemIssue.priority == 'low'
                )
            ).count()
        }
    }

    return stats
