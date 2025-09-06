"""
Database models for Celery task history and monitoring
"""
from sqlalchemy import Column, String, DateTime, Text, Integer, Float, Boolean, JSON
from sqlalchemy.sql import func

from app.db.database import Base


class TaskHistory(Base):
    """Record of all Celery task executions"""

    __tablename__ = "task_history"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(255), unique=True, index=True)
    task_name = Column(String(255), index=True)

    # Execution details
    status = Column(String(50), index=True)  # PENDING, STARTED, SUCCESS, FAILURE, RETRY
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
    runtime_seconds = Column(Float)

    # Task metadata
    args = Column(JSON)
    kwargs = Column(JSON)
    queue = Column(String(100))
    worker = Column(String(255))

    # Results and errors
    result = Column(JSON)
    error_message = Column(Text)
    traceback = Column(Text)
    retry_count = Column(Integer, default=0)

    # Metrics
    credits_used = Column(Integer)  # For FR24 tasks
    records_processed = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class TaskEvent(Base):
    """Notable events from task execution"""

    __tablename__ = "task_events"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(String(255), index=True)
    task_name = Column(String(255), index=True)
    event_type = Column(
        String(50), index=True
    )  # ERROR, WARNING, INFO, CREDIT_LIMIT, etc.
    severity = Column(Integer, default=1)  # 1=info, 2=warning, 3=error, 4=critical

    title = Column(String(255))
    message = Column(Text)
    details = Column(JSON)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)


class TaskMetrics(Base):
    """Aggregated metrics for task performance"""

    __tablename__ = "task_metrics"

    id = Column(Integer, primary_key=True, index=True)
    task_name = Column(String(255), unique=True, index=True)

    # Execution statistics
    total_runs = Column(Integer, default=0)
    successful_runs = Column(Integer, default=0)
    failed_runs = Column(Integer, default=0)
    retry_runs = Column(Integer, default=0)

    # Performance metrics
    avg_runtime_seconds = Column(Float)
    max_runtime_seconds = Column(Float)
    min_runtime_seconds = Column(Float)

    # Task-specific metrics
    total_records_processed = Column(Integer, default=0)
    total_credits_used = Column(Integer, default=0)

    # Recent activity
    last_run_at = Column(DateTime(timezone=True))
    last_success_at = Column(DateTime(timezone=True))
    last_failure_at = Column(DateTime(timezone=True))
    last_error_message = Column(Text)

    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
