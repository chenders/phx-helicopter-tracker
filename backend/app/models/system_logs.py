"""
System Logs Model for tracking errors, warnings, and anomalies
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Index
from sqlalchemy.sql import func
import enum

from app.db.database import Base


class LogLevel(str, enum.Enum):
    """Log severity levels"""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class LogCategory(str, enum.Enum):
    """Categories of system operations"""
    FLIGHT_DOWNLOAD = "flight_download"
    DATA_PARSING = "data_parsing"
    FR24_API = "fr24_api"
    DATABASE = "database"
    ANALYSIS = "analysis"
    CELERY_TASK = "celery_task"
    DATA_INTEGRITY = "data_integrity"
    BACKUP = "backup"
    AUTHENTICATION = "authentication"
    SYSTEM = "system"
    ANOMALY = "anomaly"


class SystemLog(Base):
    """System log entries for tracking all system events and errors"""
    __tablename__ = "system_logs"

    id = Column(Integer, primary_key=True, index=True)

    # Basic log information
    level = Column(Enum(LogLevel), nullable=False, index=True)
    category = Column(Enum(LogCategory), nullable=False, index=True)
    message = Column(Text, nullable=False)

    # Context information
    source = Column(String(100), index=True)  # Module/function that generated the log
    task_id = Column(String(100))  # Celery task ID if applicable
    flight_id = Column(String(100), index=True)  # Flight ID if applicable
    registration = Column(String(20), index=True)  # Aircraft registration if applicable

    # Error details
    error_type = Column(String(100))  # Exception type if it's an error
    error_details = Column(Text)  # Full error traceback or details

    # Additional context
    context_metadata = Column(Text)  # JSON string for additional context

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Indexes for common queries
    __table_args__ = (
        Index('idx_logs_created_level', 'created_at', 'level'),
        Index('idx_logs_category_created', 'category', 'created_at'),
        Index('idx_logs_level_category', 'level', 'category'),
    )