"""
Database logging service for persistent system logs
"""
import logging
import traceback
from datetime import datetime
from typing import Optional
import json
from contextlib import contextmanager

from sqlalchemy.orm import Session
from app.db.database import SessionLocal
from app.models.system_logs import SystemLog, LogLevel, LogCategory


class DatabaseLogger:
    """Logger that writes to both file and database"""

    def __init__(self, source: str):
        self.source = source
        self.file_logger = logging.getLogger(source)

    @contextmanager
    def get_db(self):
        """Get database session"""
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    def _log_to_db(
        self,
        level: LogLevel,
        category: LogCategory,
        message: str,
        flight_id: Optional[str] = None,
        registration: Optional[str] = None,
        task_id: Optional[str] = None,
        error_type: Optional[str] = None,
        error_details: Optional[str] = None,
        context: Optional[dict] = None
    ):
        """Write log entry to database"""
        try:
            with self.get_db() as db:
                log_entry = SystemLog(
                    level=level,
                    category=category,
                    message=message,
                    source=self.source,
                    flight_id=flight_id,
                    registration=registration,
                    task_id=task_id,
                    error_type=error_type,
                    error_details=error_details,
                    context_metadata=json.dumps(context) if context else None
                )
                db.add(log_entry)
                db.commit()
        except Exception as e:
            # If we can't log to DB, at least log to file
            self.file_logger.error(f"Failed to write to database log: {e}")

    def debug(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log debug message"""
        self.file_logger.debug(message)
        self._log_to_db(LogLevel.DEBUG, category, message, **kwargs)

    def info(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log info message"""
        self.file_logger.info(message)
        self._log_to_db(LogLevel.INFO, category, message, **kwargs)

    def warning(self, message: str, category: LogCategory = LogCategory.SYSTEM, **kwargs):
        """Log warning message"""
        self.file_logger.warning(message)
        self._log_to_db(LogLevel.WARNING, category, message, **kwargs)

    def error(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        exception: Optional[Exception] = None,
        **kwargs
    ):
        """Log error message"""
        self.file_logger.error(message)

        error_type = None
        error_details = None

        if exception:
            error_type = type(exception).__name__
            error_details = traceback.format_exc()

        self._log_to_db(
            LogLevel.ERROR,
            category,
            message,
            error_type=error_type,
            error_details=error_details,
            **kwargs
        )

    def critical(
        self,
        message: str,
        category: LogCategory = LogCategory.SYSTEM,
        exception: Optional[Exception] = None,
        **kwargs
    ):
        """Log critical message"""
        self.file_logger.critical(message)

        error_type = None
        error_details = None

        if exception:
            error_type = type(exception).__name__
            error_details = traceback.format_exc()

        self._log_to_db(
            LogLevel.CRITICAL,
            category,
            message,
            error_type=error_type,
            error_details=error_details,
            **kwargs
        )

    def anomaly(
        self,
        message: str,
        flight_id: Optional[str] = None,
        registration: Optional[str] = None,
        context: Optional[dict] = None
    ):
        """Log anomaly detection"""
        self.file_logger.warning(f"ANOMALY DETECTED: {message}")
        self._log_to_db(
            LogLevel.WARNING,
            LogCategory.ANOMALY,
            message,
            flight_id=flight_id,
            registration=registration,
            context=context
        )


# Create a global instance
db_logger = DatabaseLogger("app.services.db_logger")