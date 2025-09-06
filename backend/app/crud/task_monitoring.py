"""
CRUD operations for task monitoring
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from app.models.task_history import TaskHistory, TaskEvent, TaskMetrics
from app.schemas.task_monitoring import (
    TaskHistoryCreate,
    TaskHistoryUpdate,
    TaskEventCreate,
    TaskStatusSummary,
)


class TaskHistoryCRUD:
    def create(self, db: Session, *, obj_in: TaskHistoryCreate) -> TaskHistory:
        db_obj = TaskHistory(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        # Update metrics
        self.update_metrics(db, task_name=db_obj.task_name)

        return db_obj

    def get(self, db: Session, id: int) -> Optional[TaskHistory]:
        return db.query(TaskHistory).filter(TaskHistory.id == id).first()

    def get_by_task_id(self, db: Session, task_id: str) -> Optional[TaskHistory]:
        return db.query(TaskHistory).filter(TaskHistory.task_id == task_id).first()

    def get_recent(
        self,
        db: Session,
        limit: int = 100,
        task_name: Optional[str] = None,
        status: Optional[str] = None,
    ) -> List[TaskHistory]:
        query = db.query(TaskHistory)

        if task_name:
            query = query.filter(TaskHistory.task_name == task_name)
        if status:
            query = query.filter(TaskHistory.status == status)

        return query.order_by(desc(TaskHistory.created_at)).limit(limit).all()

    def update(
        self, db: Session, *, db_obj: TaskHistory, obj_in: TaskHistoryUpdate
    ) -> TaskHistory:
        update_data = obj_in.dict(exclude_unset=True)

        for field in update_data:
            setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)

        # Update metrics
        self.update_metrics(db, task_name=db_obj.task_name)

        return db_obj

    def get_status_summary(self, db: Session) -> TaskStatusSummary:
        now = datetime.now(timezone.utc)
        last_hour = now - timedelta(hours=1)
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)

        # Count by status
        status_counts = (
            db.query(TaskHistory.status, func.count(TaskHistory.id))
            .group_by(TaskHistory.status)
            .all()
        )

        status_dict = {status: count for status, count in status_counts}

        # Count recent tasks
        tasks_last_hour = (
            db.query(func.count(TaskHistory.id))
            .filter(TaskHistory.created_at >= last_hour)
            .scalar()
            or 0
        )

        tasks_last_24h = (
            db.query(func.count(TaskHistory.id))
            .filter(TaskHistory.created_at >= last_24h)
            .scalar()
            or 0
        )

        tasks_last_7d = (
            db.query(func.count(TaskHistory.id))
            .filter(TaskHistory.created_at >= last_7d)
            .scalar()
            or 0
        )

        # Calculate success rate for last 24h
        success_24h = (
            db.query(func.count(TaskHistory.id))
            .filter(
                and_(
                    TaskHistory.created_at >= last_24h, TaskHistory.status == "SUCCESS"
                )
            )
            .scalar()
            or 0
        )

        total_24h = tasks_last_24h or 1  # Avoid division by zero
        success_rate_24h = (success_24h / total_24h) * 100

        # Average runtime for last 24h
        avg_runtime = (
            db.query(func.avg(TaskHistory.runtime_seconds))
            .filter(
                and_(
                    TaskHistory.created_at >= last_24h,
                    TaskHistory.runtime_seconds.isnot(None),
                )
            )
            .scalar()
            or 0
        )

        # Total credits used in last 24h
        total_credits = (
            db.query(func.sum(TaskHistory.credits_used))
            .filter(
                and_(
                    TaskHistory.created_at >= last_24h,
                    TaskHistory.credits_used.isnot(None),
                )
            )
            .scalar()
            or 0
        )

        # Get active workers (from recent tasks)
        active_workers = (
            db.query(TaskHistory.worker)
            .filter(TaskHistory.created_at >= last_hour)
            .distinct()
            .all()
        )
        active_workers = [w[0] for w in active_workers if w[0]]

        return TaskStatusSummary(
            total_tasks=sum(status_dict.values()),
            pending=status_dict.get("PENDING", 0),
            running=status_dict.get("STARTED", 0),
            successful=status_dict.get("SUCCESS", 0),
            failed=status_dict.get("FAILURE", 0),
            retrying=status_dict.get("RETRY", 0),
            tasks_last_hour=tasks_last_hour,
            tasks_last_24h=tasks_last_24h,
            tasks_last_7d=tasks_last_7d,
            success_rate_24h=success_rate_24h,
            avg_runtime_24h=avg_runtime,
            total_credits_used_24h=total_credits,
            queue_lengths={},  # Would need Celery inspection
            active_workers=active_workers,
        )

    def update_metrics(self, db: Session, task_name: str):
        """Update aggregated metrics for a task"""
        metrics = (
            db.query(TaskMetrics).filter(TaskMetrics.task_name == task_name).first()
        )

        if not metrics:
            metrics = TaskMetrics(task_name=task_name)
            db.add(metrics)

        # Calculate updated metrics
        task_stats = (
            db.query(
                func.count(TaskHistory.id).label("total"),
                func.count(func.nullif(TaskHistory.status, "SUCCESS")).label("success"),
                func.count(func.nullif(TaskHistory.status, "FAILURE")).label("failed"),
                func.count(func.nullif(TaskHistory.status, "RETRY")).label("retry"),
                func.avg(TaskHistory.runtime_seconds).label("avg_runtime"),
                func.max(TaskHistory.runtime_seconds).label("max_runtime"),
                func.min(TaskHistory.runtime_seconds).label("min_runtime"),
                func.sum(TaskHistory.records_processed).label("total_records"),
                func.sum(TaskHistory.credits_used).label("total_credits"),
                func.max(TaskHistory.created_at).label("last_run"),
            )
            .filter(TaskHistory.task_name == task_name)
            .first()
        )

        if task_stats:
            metrics.total_runs = task_stats.total or 0
            metrics.successful_runs = task_stats.success or 0
            metrics.failed_runs = task_stats.failed or 0
            metrics.retry_runs = task_stats.retry or 0
            metrics.avg_runtime_seconds = task_stats.avg_runtime
            metrics.max_runtime_seconds = task_stats.max_runtime
            metrics.min_runtime_seconds = task_stats.min_runtime
            metrics.total_records_processed = task_stats.total_records or 0
            metrics.total_credits_used = task_stats.total_credits or 0
            metrics.last_run_at = task_stats.last_run

        # Get last success/failure
        last_success = (
            db.query(TaskHistory)
            .filter(
                and_(
                    TaskHistory.task_name == task_name, TaskHistory.status == "SUCCESS"
                )
            )
            .order_by(desc(TaskHistory.created_at))
            .first()
        )

        if last_success:
            metrics.last_success_at = last_success.created_at

        last_failure = (
            db.query(TaskHistory)
            .filter(
                and_(
                    TaskHistory.task_name == task_name, TaskHistory.status == "FAILURE"
                )
            )
            .order_by(desc(TaskHistory.created_at))
            .first()
        )

        if last_failure:
            metrics.last_failure_at = last_failure.created_at
            metrics.last_error_message = last_failure.error_message

        db.commit()


class TaskEventCRUD:
    def create(self, db: Session, *, obj_in: TaskEventCreate) -> TaskEvent:
        db_obj = TaskEvent(**obj_in.dict())
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def get_recent(
        self,
        db: Session,
        limit: int = 100,
        severity: Optional[int] = None,
        event_type: Optional[str] = None,
    ) -> List[TaskEvent]:
        query = db.query(TaskEvent)

        if severity:
            query = query.filter(TaskEvent.severity >= severity)
        if event_type:
            query = query.filter(TaskEvent.event_type == event_type)

        return query.order_by(desc(TaskEvent.created_at)).limit(limit).all()


class TaskMetricsCRUD:
    def get_all(self, db: Session) -> List[TaskMetrics]:
        return db.query(TaskMetrics).order_by(desc(TaskMetrics.last_run_at)).all()

    def get_by_name(self, db: Session, task_name: str) -> Optional[TaskMetrics]:
        return db.query(TaskMetrics).filter(TaskMetrics.task_name == task_name).first()


# Create instances
task_history_crud = TaskHistoryCRUD()
task_event_crud = TaskEventCRUD()
task_metrics_crud = TaskMetricsCRUD()
