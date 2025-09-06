"""
Pydantic schemas for task monitoring
"""
from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel


class TaskHistoryBase(BaseModel):
    task_id: str
    task_name: str
    status: str
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    runtime_seconds: Optional[float] = None
    args: Optional[List[Any]] = None
    kwargs: Optional[Dict[str, Any]] = None
    queue: Optional[str] = None
    worker: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    traceback: Optional[str] = None
    retry_count: int = 0
    credits_used: Optional[int] = None
    records_processed: Optional[int] = None


class TaskHistoryCreate(TaskHistoryBase):
    pass


class TaskHistoryUpdate(BaseModel):
    status: Optional[str] = None
    completed_at: Optional[datetime] = None
    runtime_seconds: Optional[float] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    traceback: Optional[str] = None
    retry_count: Optional[int] = None
    credits_used: Optional[int] = None
    records_processed: Optional[int] = None


class TaskHistory(TaskHistoryBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskEventBase(BaseModel):
    task_id: Optional[str] = None
    task_name: str
    event_type: str
    severity: int = 1
    title: str
    message: str
    details: Optional[Dict[str, Any]] = None


class TaskEventCreate(TaskEventBase):
    pass


class TaskEvent(TaskEventBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TaskMetricsBase(BaseModel):
    task_name: str
    total_runs: int = 0
    successful_runs: int = 0
    failed_runs: int = 0
    retry_runs: int = 0
    avg_runtime_seconds: Optional[float] = None
    max_runtime_seconds: Optional[float] = None
    min_runtime_seconds: Optional[float] = None
    total_records_processed: int = 0
    total_credits_used: int = 0
    last_run_at: Optional[datetime] = None
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    last_error_message: Optional[str] = None


class TaskMetrics(TaskMetricsBase):
    id: int
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TaskStatusSummary(BaseModel):
    """Summary of current task statuses"""

    total_tasks: int
    pending: int
    running: int
    successful: int
    failed: int
    retrying: int

    # Recent activity
    tasks_last_hour: int
    tasks_last_24h: int
    tasks_last_7d: int

    # System health
    success_rate_24h: float
    avg_runtime_24h: float
    total_credits_used_24h: int

    # Current queue status
    queue_lengths: Dict[str, int]
    active_workers: List[str]


class TaskMonitoringDashboard(BaseModel):
    """Complete dashboard data"""

    status_summary: TaskStatusSummary
    recent_tasks: List[TaskHistory]
    recent_events: List[TaskEvent]
    task_metrics: List[TaskMetrics]
    scheduled_tasks: List[Dict[str, Any]]
    credit_usage: Dict[str, Any]
