"""
System Logger Service for centralized error and anomaly tracking
"""
import json
import traceback
import logging
from typing import Optional, Dict, Any
from datetime import datetime, timezone
from contextlib import contextmanager

from sqlalchemy.orm import Session
from sqlalchemy.exc import SQLAlchemyError

from app.db.database import SessionLocal
from app.models.system_logs import SystemLog, LogLevel, LogCategory


class SystemLoggerService:
    """Service for logging system events, errors, and anomalies"""

    def __init__(self):
        self.python_logger = logging.getLogger(__name__)

    def _get_db(self) -> Session:
        """Get a database session"""
        return SessionLocal()

    def log(
        self,
        level: LogLevel,
        category: LogCategory,
        message: str,
        source: Optional[str] = None,
        task_id: Optional[str] = None,
        flight_id: Optional[str] = None,
        registration: Optional[str] = None,
        error_type: Optional[str] = None,
        error_details: Optional[str] = None,
        context_metadata: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None
    ) -> Optional[SystemLog]:
        """
        Log a system event

        Args:
            level: Severity level of the log
            category: Category of the operation
            message: Log message
            source: Module/function that generated the log
            task_id: Celery task ID if applicable
            flight_id: Flight ID if applicable
            registration: Aircraft registration if applicable
            error_type: Exception type if it's an error
            error_details: Full error traceback or details
            context_metadata: Additional context as dictionary
            db: Database session (optional, will create if not provided)

        Returns:
            Created SystemLog entry or None if failed
        """
        close_db = False
        if db is None:
            db = self._get_db()
            close_db = True

        try:
            # Convert context_metadata to JSON string if provided
            metadata_str = json.dumps(context_metadata) if context_metadata else None

            # Create log entry
            log_entry = SystemLog(
                level=level,
                category=category,
                message=message[:5000],  # Truncate very long messages
                source=source,
                task_id=task_id,
                flight_id=flight_id,
                registration=registration,
                error_type=error_type,
                error_details=error_details[:10000] if error_details else None,  # Truncate very long errors
                context_metadata=metadata_str
            )

            db.add(log_entry)
            db.commit()
            db.refresh(log_entry)

            # Also log to Python logger
            self._log_to_python(level, category, message, context_metadata)

            return log_entry

        except Exception as e:
            # If we can't log to database, at least log to Python logger
            self.python_logger.error(f"Failed to write to system_logs: {e}")
            self._log_to_python(level, category, message, context_metadata)
            if db:
                db.rollback()
            return None
        finally:
            if close_db and db:
                db.close()

    def _log_to_python(self, level: LogLevel, category: LogCategory, message: str, context_metadata: Optional[Dict] = None):
        """Log to Python logger as backup"""
        log_message = f"[{category.value}] {message}"
        if context_metadata:
            log_message += f" | {json.dumps(context_metadata)}"

        if level == LogLevel.DEBUG:
            self.python_logger.debug(log_message)
        elif level == LogLevel.INFO:
            self.python_logger.info(log_message)
        elif level == LogLevel.WARNING:
            self.python_logger.warning(log_message)
        elif level == LogLevel.ERROR:
            self.python_logger.error(log_message)
        elif level == LogLevel.CRITICAL:
            self.python_logger.critical(log_message)

    def log_error(
        self,
        category: LogCategory,
        message: str,
        exception: Optional[Exception] = None,
        **kwargs
    ):
        """
        Convenience method for logging errors

        Args:
            category: Category of the operation
            message: Error message
            exception: Exception object if available
            **kwargs: Additional arguments for log()
        """
        error_type = None
        error_details = None

        if exception:
            error_type = type(exception).__name__
            error_details = traceback.format_exc()

        return self.log(
            level=LogLevel.ERROR,
            category=category,
            message=message,
            error_type=error_type,
            error_details=error_details,
            **kwargs
        )

    def log_warning(self, category: LogCategory, message: str, **kwargs):
        """Convenience method for logging warnings"""
        return self.log(level=LogLevel.WARNING, category=category, message=message, **kwargs)

    def log_info(self, category: LogCategory, message: str, **kwargs):
        """Convenience method for logging info"""
        return self.log(level=LogLevel.INFO, category=category, message=message, **kwargs)

    def log_anomaly(
        self,
        message: str,
        anomaly_type: str,
        details: Dict[str, Any],
        **kwargs
    ):
        """
        Log detected anomalies

        Args:
            message: Description of the anomaly
            anomaly_type: Type of anomaly detected
            details: Detailed information about the anomaly
            **kwargs: Additional arguments for log()
        """
        context_metadata = {
            "anomaly_type": anomaly_type,
            "details": details,
            "detected_at": datetime.now(timezone.utc).isoformat()
        }

        return self.log(
            level=LogLevel.WARNING,
            category=LogCategory.ANOMALY,
            message=message,
            context_metadata=context_metadata,
            **kwargs
        )

    def log_fr24_error(
        self,
        message: str,
        flight_id: Optional[str] = None,
        registration: Optional[str] = None,
        error_code: Optional[int] = None,
        **kwargs
    ):
        """Log FlightRadar24 API errors"""
        context_metadata = kwargs.pop('context_metadata', {})
        if error_code:
            context_metadata['error_code'] = error_code

        return self.log_error(
            category=LogCategory.FR24_API,
            message=message,
            flight_id=flight_id,
            registration=registration,
            context_metadata=context_metadata,
            **kwargs
        )

    def log_download_error(
        self,
        message: str,
        flight_id: Optional[str] = None,
        registration: Optional[str] = None,
        **kwargs
    ):
        """Log flight download errors"""
        return self.log_error(
            category=LogCategory.FLIGHT_DOWNLOAD,
            message=message,
            flight_id=flight_id,
            registration=registration,
            **kwargs
        )

    def log_parsing_error(
        self,
        message: str,
        data_type: str,
        **kwargs
    ):
        """Log data parsing errors"""
        context_metadata = kwargs.pop('context_metadata', {})
        context_metadata['data_type'] = data_type

        return self.log_error(
            category=LogCategory.DATA_PARSING,
            message=message,
            context_metadata=context_metadata,
            **kwargs
        )

    def log_celery_task_error(
        self,
        task_name: str,
        task_id: str,
        message: str,
        exception: Optional[Exception] = None,
        **kwargs
    ):
        """Log Celery task errors"""
        context_metadata = kwargs.pop('context_metadata', {})
        context_metadata['task_name'] = task_name

        return self.log_error(
            category=LogCategory.CELERY_TASK,
            message=message,
            task_id=task_id,
            exception=exception,
            context_metadata=context_metadata,
            source=task_name,
            **kwargs
        )

    def log_integrity_issue(
        self,
        message: str,
        issue_type: str,
        affected_data: Dict[str, Any],
        **kwargs
    ):
        """Log data integrity issues"""
        context_metadata = {
            "issue_type": issue_type,
            "affected_data": affected_data,
            "detected_at": datetime.now(timezone.utc).isoformat()
        }

        return self.log(
            level=LogLevel.WARNING,
            category=LogCategory.DATA_INTEGRITY,
            message=message,
            context_metadata=context_metadata,
            **kwargs
        )

    @contextmanager
    def log_context(self, category: LogCategory, operation: str, **context_kwargs):
        """
        Context manager for logging operation start/completion/failure

        Usage:
            with system_logger.log_context(LogCategory.FLIGHT_DOWNLOAD, "Downloading flight ABC123", flight_id="ABC123"):
                # Do operation
                pass
        """
        start_time = datetime.now(timezone.utc)

        # Log start
        self.log_info(
            category=category,
            message=f"Starting: {operation}",
            **context_kwargs
        )

        try:
            yield
            # Log successful completion
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.log_info(
                category=category,
                message=f"Completed: {operation} (took {duration:.2f}s)",
                context_metadata={"duration_seconds": duration},
                **context_kwargs
            )
        except Exception as e:
            # Log failure
            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            self.log_error(
                category=category,
                message=f"Failed: {operation} (after {duration:.2f}s)",
                exception=e,
                context_metadata={"duration_seconds": duration},
                **context_kwargs
            )
            raise


# Singleton instance
system_logger = SystemLoggerService()