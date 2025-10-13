"""
System Issues Model
Tracks detected errors and issues for automated monitoring
"""
from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, JSON
from sqlalchemy.sql import func
from app.db.database import Base


class SystemIssue(Base):
    """
    Stores detected system errors and issues
    Populated by automated error monitoring tasks
    """
    __tablename__ = "system_issues"

    id = Column(Integer, primary_key=True, index=True)

    # Issue identification
    issue_type = Column(String(50), nullable=False, index=True)  # error, warning, critical
    component = Column(String(100), nullable=False, index=True)  # celery, api, database, etc.
    error_name = Column(String(200), nullable=False)  # Exception class name
    error_message = Column(Text, nullable=False)

    # Error details
    stack_trace = Column(Text, nullable=True)
    context = Column(JSON, nullable=True)  # Additional context (task name, file, line, etc.)

    # Tracking
    first_seen = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    last_seen = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    occurrence_count = Column(Integer, default=1, nullable=False)

    # Resolution tracking
    is_resolved = Column(Boolean, default=False, nullable=False, index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolved_by = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    # Priority and categorization
    priority = Column(String(20), default="medium")  # low, medium, high, critical
    tags = Column(JSON, nullable=True)  # For categorization

    # Unique constraint on error signature to prevent duplicates
    error_signature = Column(String(64), unique=True, index=True)  # Hash of error details

    def __repr__(self):
        return f"<SystemIssue(id={self.id}, type={self.issue_type}, component={self.component}, count={self.occurrence_count})>"
