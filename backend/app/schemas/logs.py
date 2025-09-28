"""
Pydantic schemas for System Logs
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field

from app.models.system_logs import LogLevel, LogCategory


class SystemLogResponse(BaseModel):
    """Response model for system log entry"""
    id: int
    level: LogLevel
    category: LogCategory
    message: str
    source: Optional[str] = None
    task_id: Optional[str] = None
    flight_id: Optional[str] = None
    registration: Optional[str] = None
    error_type: Optional[str] = None
    error_details: Optional[str] = None
    context_metadata: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
        orm_mode = True

    @classmethod
    def from_orm(cls, obj):
        """Create from ORM object"""
        return cls(
            id=obj.id,
            level=obj.level,
            category=obj.category,
            message=obj.message,
            source=obj.source,
            task_id=obj.task_id,
            flight_id=obj.flight_id,
            registration=obj.registration,
            error_type=obj.error_type,
            error_details=obj.error_details,
            context_metadata=obj.context_metadata,
            created_at=obj.created_at
        )


class PaginatedLogsResponse(BaseModel):
    """Paginated response for system logs"""
    logs: List[SystemLogResponse]
    total: int = Field(description="Total number of logs matching filters")
    page: int = Field(description="Current page number")
    page_size: int = Field(description="Number of items per page")
    total_pages: int = Field(description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")


class LogStatsResponse(BaseModel):
    """Statistics about system logs"""
    period_days: int
    levels: dict[str, int]
    categories: dict[str, int]
    critical_errors: List[SystemLogResponse]
    recent_errors: List[SystemLogResponse]
    total_logs: int