"""
System monitoring tasks
Detects errors and issues from logs and task failures
"""
import re
import hashlib
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List
from celery import current_task
from sqlalchemy import and_

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.system_issues import SystemIssue
from app.models.task_history import TaskHistory

logger = logging.getLogger(__name__)


def generate_error_signature(error_name: str, error_message: str, component: str) -> str:
    """
    Generate unique signature for error deduplication
    Removes timestamps, IDs, and variable data to group similar errors
    """
    # Normalize error message - remove numbers, timestamps, IDs
    normalized = re.sub(r'\d{4}-\d{2}-\d{2}', 'DATE', error_message)
    normalized = re.sub(r'\d{2}:\d{2}:\d{2}', 'TIME', normalized)
    normalized = re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', 'UUID', normalized)
    normalized = re.sub(r'\d+', 'NUM', normalized)
    normalized = re.sub(r'/[a-z]+/[a-z]+/\d+', '/path/to/NUM', normalized)

    # Create signature from normalized data
    signature_data = f"{component}:{error_name}:{normalized[:200]}"
    return hashlib.sha256(signature_data.encode()).hexdigest()[:16]


def extract_error_info(error_text: str) -> Dict[str, Any]:
    """
    Extract structured error information from error text
    """
    # Extract exception class name
    error_match = re.search(r'(\w+Error|\w+Exception):\s*(.+?)(?:\n|$)', error_text)
    if error_match:
        error_name = error_match.group(1)
        error_message = error_match.group(2).strip()
    else:
        error_name = "UnknownError"
        error_message = error_text[:200]

    # Extract file and line number
    file_match = re.search(r'File "([^"]+)", line (\d+)', error_text)
    file_info = None
    if file_match:
        file_info = {
            'file': file_match.group(1),
            'line': int(file_match.group(2))
        }

    # Extract function name
    func_match = re.search(r'in (\w+)', error_text)
    function = func_match.group(1) if func_match else None

    return {
        'error_name': error_name,
        'error_message': error_message,
        'file_info': file_info,
        'function': function
    }


def determine_priority(error_name: str, component: str, occurrence_count: int) -> str:
    """
    Determine priority based on error type and frequency
    """
    critical_errors = [
        'DatabaseError', 'ConnectionError', 'OutOfMemoryError',
        'CriticalError', 'SystemError', 'PermissionError'
    ]

    if error_name in critical_errors:
        return 'critical'

    if component in ['database', 'api']:
        if occurrence_count > 10:
            return 'high'
        elif occurrence_count > 5:
            return 'medium'

    if occurrence_count > 50:
        return 'high'
    elif occurrence_count > 20:
        return 'medium'

    return 'low'


@celery_app.task(bind=True, name="monitor_system_errors")
def monitor_system_errors(
    self,
    hours_back: int = 1,
    auto_resolve_age_hours: int = 24
) -> Dict[str, Any]:
    """
    Monitor system for errors by checking task history and logs

    Args:
        hours_back: How many hours of history to check
        auto_resolve_age_hours: Auto-resolve issues not seen in this many hours

    Returns:
        Dictionary with monitoring results
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "new_issues": 0,
        "updated_issues": 0,
        "resolved_issues": 0,
        "total_active_issues": 0,
        "errors": []
    }

    try:
        current_task.update_state(
            state="PROCESSING",
            meta={"status": "Checking task failures..."}
        )

        # Check task history for failures in the last hour
        since_time = datetime.now(timezone.utc) - timedelta(hours=hours_back)

        failed_tasks = db.query(TaskHistory).filter(
            and_(
                TaskHistory.status == 'FAILURE',
                TaskHistory.finished_at >= since_time
            )
        ).all()

        logger.info(f"Found {len(failed_tasks)} failed tasks in last {hours_back} hour(s)")

        # Process each failure
        for task in failed_tasks:
            try:
                # Extract error information
                error_text = task.result or task.exception or "Unknown error"
                error_info = extract_error_info(str(error_text))

                # Determine component from task name
                component = "celery"
                if "transcribe" in task.task_name.lower():
                    component = "transcription"
                elif "download" in task.task_name.lower():
                    component = "download"
                elif "fr24" in task.task_name.lower() or "flightradar" in task.task_name.lower():
                    component = "fr24_api"
                elif "database" in str(error_text).lower() or "sql" in str(error_text).lower():
                    component = "database"
                elif "radio" in task.task_name.lower():
                    component = "radio"

                # Generate signature for deduplication
                signature = generate_error_signature(
                    error_info['error_name'],
                    error_info['error_message'],
                    component
                )

                # Check if we've seen this error before
                existing = db.query(SystemIssue).filter(
                    SystemIssue.error_signature == signature
                ).first()

                if existing:
                    # Update existing issue
                    existing.last_seen = datetime.now(timezone.utc)
                    existing.occurrence_count += 1
                    existing.priority = determine_priority(
                        existing.error_name,
                        existing.component,
                        existing.occurrence_count
                    )

                    # Update context with latest task info
                    if not existing.context:
                        existing.context = {}
                    existing.context['latest_task_id'] = task.task_id
                    existing.context['latest_task_name'] = task.task_name

                    results["updated_issues"] += 1
                    logger.info(f"Updated existing issue: {existing.error_name} (count: {existing.occurrence_count})")
                else:
                    # Create new issue
                    context = {
                        'task_id': task.task_id,
                        'task_name': task.task_name,
                        'worker': task.worker
                    }

                    if error_info['file_info']:
                        context.update(error_info['file_info'])
                    if error_info['function']:
                        context['function'] = error_info['function']

                    issue = SystemIssue(
                        issue_type='error',
                        component=component,
                        error_name=error_info['error_name'],
                        error_message=error_info['error_message'],
                        stack_trace=str(error_text)[:5000],  # Limit size
                        context=context,
                        error_signature=signature,
                        priority=determine_priority(error_info['error_name'], component, 1)
                    )

                    db.add(issue)
                    results["new_issues"] += 1
                    logger.info(f"Created new issue: {issue.error_name} in {component}")

            except Exception as e:
                logger.error(f"Error processing task failure {task.task_id}: {e}")
                results["errors"].append(f"Processing error: {str(e)}")

        # Auto-resolve old issues
        current_task.update_state(
            state="PROCESSING",
            meta={"status": "Auto-resolving old issues..."}
        )

        resolve_threshold = datetime.now(timezone.utc) - timedelta(hours=auto_resolve_age_hours)
        old_issues = db.query(SystemIssue).filter(
            and_(
                SystemIssue.is_resolved == False,
                SystemIssue.last_seen < resolve_threshold
            )
        ).all()

        for issue in old_issues:
            issue.is_resolved = True
            issue.resolved_at = datetime.now(timezone.utc)
            issue.resolved_by = "auto_resolver"
            issue.resolution_notes = f"Auto-resolved: No occurrences in {auto_resolve_age_hours} hours"
            results["resolved_issues"] += 1
            logger.info(f"Auto-resolved: {issue.error_name} (not seen since {issue.last_seen})")

        # Get total active issues
        results["total_active_issues"] = db.query(SystemIssue).filter(
            SystemIssue.is_resolved == False
        ).count()

        db.commit()

        # Log summary
        if results["new_issues"] > 0 or results["updated_issues"] > 0:
            logger.warning(f"System monitoring: {results['new_issues']} new issues, "
                         f"{results['updated_issues']} updated, "
                         f"{results['total_active_issues']} active")
        else:
            logger.info(f"System monitoring: No new issues, {results['total_active_issues']} active")

        current_task.update_state(
            state="SUCCESS",
            meta=results
        )

        return results

    except Exception as exc:
        logger.error(f"System monitoring failed: {exc}", exc_info=True)
        results["errors"].append(str(exc))

        current_task.update_state(
            state="FAILURE",
            meta=results
        )
        raise

    finally:
        db.close()


@celery_app.task(bind=True, name="get_system_health_report")
def get_system_health_report(self) -> Dict[str, Any]:
    """
    Generate system health report based on recent issues
    """
    db = SessionLocal()

    try:
        # Get issue counts by priority
        issues_by_priority = {}
        for priority in ['critical', 'high', 'medium', 'low']:
            count = db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == False,
                    SystemIssue.priority == priority
                )
            ).count()
            issues_by_priority[priority] = count

        # Get issue counts by component
        issues_by_component = {}
        active_issues = db.query(SystemIssue).filter(
            SystemIssue.is_resolved == False
        ).all()

        for issue in active_issues:
            component = issue.component
            if component not in issues_by_component:
                issues_by_component[component] = {
                    'count': 0,
                    'total_occurrences': 0,
                    'issues': []
                }
            issues_by_component[component]['count'] += 1
            issues_by_component[component]['total_occurrences'] += issue.occurrence_count
            issues_by_component[component]['issues'].append({
                'id': issue.id,
                'error_name': issue.error_name,
                'priority': issue.priority,
                'occurrences': issue.occurrence_count,
                'first_seen': issue.first_seen.isoformat(),
                'last_seen': issue.last_seen.isoformat()
            })

        # Overall health score (100 = perfect, 0 = critical)
        health_score = 100
        health_score -= issues_by_priority.get('critical', 0) * 30
        health_score -= issues_by_priority.get('high', 0) * 10
        health_score -= issues_by_priority.get('medium', 0) * 3
        health_score -= issues_by_priority.get('low', 0) * 1
        health_score = max(0, health_score)

        # Determine health status
        if health_score >= 90:
            health_status = "healthy"
        elif health_score >= 70:
            health_status = "warning"
        elif health_score >= 50:
            health_status = "degraded"
        else:
            health_status = "critical"

        report = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "health_score": health_score,
            "health_status": health_status,
            "issues_by_priority": issues_by_priority,
            "issues_by_component": issues_by_component,
            "total_active_issues": len(active_issues),
            "total_resolved_today": db.query(SystemIssue).filter(
                and_(
                    SystemIssue.is_resolved == True,
                    SystemIssue.resolved_at >= datetime.now(timezone.utc) - timedelta(hours=24)
                )
            ).count()
        }

        logger.info(f"Health report: {health_status} (score: {health_score}), "
                   f"{report['total_active_issues']} active issues")

        return report

    finally:
        db.close()
