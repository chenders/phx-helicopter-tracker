"""
Celery signal handlers for task monitoring
Automatically tracks task execution history, events, and metrics
"""
import logging
from datetime import datetime, timezone
from celery import signals
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.task_history import TaskHistory, TaskEvent, TaskMetrics

logger = logging.getLogger(__name__)

# Create a separate database connection for signal handlers
# (to avoid issues with the main app's connection pool)
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@signals.task_prerun.connect
def task_prerun_handler(sender=None, task_id=None, task=None, args=None, kwargs=None, **kw):
    """Record when a task starts executing"""
    try:
        db = SessionLocal()
        try:
            # Create task history entry
            task_history = TaskHistory(
                task_id=task_id,
                task_name=task.name if task else "unknown",
                status="STARTED",
                started_at=datetime.now(timezone.utc),
                created_at=datetime.now(timezone.utc)
            )
            db.add(task_history)
            
            # Create event for important task starts
            important_tasks = ['download_and_import_fr24_flights', 'analyze_flight_patterns', 
                             'transcribe_radio_archives', 'download_broadcastify_archives']
            if task and any(t in task.name for t in important_tasks):
                task_event = TaskEvent(
                    task_name=task.name,
                    event_type="TASK_STARTED",
                    severity=1,  # Info level
                    title=f"Task {task.name.split('.')[-1]} started",
                    message=f"Task {task_id} has started execution",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(task_event)
            
            db.commit()
            logger.debug(f"Task {task_id} ({task.name if task else 'unknown'}) started")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error recording task start: {e}")


@signals.task_success.connect
def task_success_handler(sender=None, result=None, **kwargs):
    """Record successful task completion"""
    try:
        db = SessionLocal()
        try:
            task_id = sender.request.id
            
            # Update task history
            task_history = db.query(TaskHistory).filter_by(task_id=task_id).first()
            if task_history:
                task_history.status = "SUCCESS"
                task_history.completed_at = datetime.now(timezone.utc)
                if task_history.started_at:
                    runtime = (task_history.completed_at - task_history.started_at).total_seconds()
                    task_history.runtime_seconds = runtime
                
                # Extract metrics from result if available
                if isinstance(result, dict):
                    task_history.credits_used = result.get('credits_used')
                    task_history.records_processed = result.get('records_processed') or result.get('flights_processed')
            else:
                # Create new entry if prerun wasn't recorded
                task_history = TaskHistory(
                    task_id=task_id,
                    task_name=sender.name,
                    status="SUCCESS",
                    completed_at=datetime.now(timezone.utc),
                    created_at=datetime.now(timezone.utc)
                )
                db.add(task_history)
            
            # Create task event for notable successes
            if task_history and (
                (task_history.credits_used and task_history.credits_used > 100) or
                (task_history.records_processed and task_history.records_processed > 100) or
                (task_history.runtime_seconds and task_history.runtime_seconds > 60)
            ):
                task_event = TaskEvent(
                    task_name=sender.name,
                    event_type="TASK_COMPLETED",
                    severity=1,  # Info level
                    title=f"Task {sender.name.split('.')[-1]} completed",
                    message=f"Processed {task_history.records_processed or 0} records, used {task_history.credits_used or 0} credits, runtime {task_history.runtime_seconds:.1f}s",
                    created_at=datetime.now(timezone.utc)
                )
                db.add(task_event)
            
            # Update task metrics
            update_task_metrics(db, sender.name, success=True, runtime=task_history.runtime_seconds,
                              credits_used=task_history.credits_used)
            
            db.commit()
            logger.debug(f"Task {task_id} ({sender.name}) completed successfully")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error recording task success: {e}")


@signals.task_failure.connect
def task_failure_handler(sender=None, task_id=None, exception=None, traceback=None, **kwargs):
    """Record task failure"""
    try:
        db = SessionLocal()
        try:
            # Update task history
            task_history = db.query(TaskHistory).filter_by(task_id=task_id).first()
            if task_history:
                task_history.status = "FAILURE"
                task_history.completed_at = datetime.now(timezone.utc)
                task_history.error_message = str(exception)[:500] if exception else None
                if task_history.started_at:
                    runtime = (task_history.completed_at - task_history.started_at).total_seconds()
                    task_history.runtime_seconds = runtime
            else:
                # Create new entry if prerun wasn't recorded
                task_history = TaskHistory(
                    task_id=task_id,
                    task_name=sender.name if sender else "unknown",
                    status="FAILURE",
                    completed_at=datetime.now(timezone.utc),
                    error_message=str(exception)[:500] if exception else None,
                    created_at=datetime.now(timezone.utc)
                )
                db.add(task_history)
            
            # Create task event for failure
            severity = 3 if "rate limit" in str(exception).lower() else 2
            task_event = TaskEvent(
                task_name=sender.name if sender else "unknown",
                event_type="TASK_FAILURE",
                severity=severity,
                title=f"Task {sender.name if sender else 'unknown'} failed",
                message=str(exception)[:500] if exception else "Unknown error",
                created_at=datetime.now(timezone.utc)
            )
            db.add(task_event)
            
            # Update task metrics
            update_task_metrics(db, sender.name if sender else "unknown", success=False, 
                               runtime=task_history.runtime_seconds if task_history else None,
                               error_message=str(exception)[:500] if exception else None)
            
            db.commit()
            logger.warning(f"Task {task_id} ({sender.name if sender else 'unknown'}) failed: {exception}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error recording task failure: {e}")


@signals.task_retry.connect
def task_retry_handler(sender=None, reason=None, **kwargs):
    """Record task retry"""
    try:
        db = SessionLocal()
        try:
            task_id = sender.request.id
            
            # Update task history
            task_history = db.query(TaskHistory).filter_by(task_id=task_id).first()
            if task_history:
                task_history.status = "RETRY"
                task_history.error_message = str(reason)[:500] if reason else None
            
            # Create task event for retry
            task_event = TaskEvent(
                task_name=sender.name,
                event_type="TASK_RETRY",
                severity=2,
                title=f"Task {sender.name} retrying",
                message=str(reason)[:500] if reason else "Retrying task",
                created_at=datetime.now(timezone.utc)
            )
            db.add(task_event)
            
            db.commit()
            logger.info(f"Task {task_id} ({sender.name}) retrying: {reason}")
        finally:
            db.close()
    except Exception as e:
        logger.error(f"Error recording task retry: {e}")


def update_task_metrics(db, task_name: str, success: bool, runtime: float = None, 
                        credits_used: int = None, error_message: str = None):
    """Update aggregated task metrics"""
    try:
        metrics = db.query(TaskMetrics).filter_by(task_name=task_name).first()
        
        if not metrics:
            metrics = TaskMetrics(
                task_name=task_name,
                total_runs=0,
                successful_runs=0,
                failed_runs=0,
                total_credits_used=0
            )
            db.add(metrics)
        
        metrics.total_runs += 1
        if success:
            metrics.successful_runs += 1
        else:
            metrics.failed_runs += 1
            metrics.last_error_message = error_message
        
        if runtime is not None:
            if metrics.avg_runtime_seconds is None:
                metrics.avg_runtime_seconds = runtime
            else:
                # Calculate running average
                metrics.avg_runtime_seconds = (
                    (metrics.avg_runtime_seconds * (metrics.total_runs - 1) + runtime) / 
                    metrics.total_runs
                )
        
        if credits_used:
            metrics.total_credits_used += credits_used
        
        metrics.last_run_at = datetime.now(timezone.utc)
        
    except Exception as e:
        logger.error(f"Error updating task metrics: {e}")


# Log that signal handlers are registered
logger.info("Task monitoring signal handlers registered")