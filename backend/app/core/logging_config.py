"""
Centralized logging configuration for the Phoenix Helicopter Tracker
"""
import logging
import logging.handlers
import os
from pathlib import Path
from datetime import datetime
import json

# Create logs directory if it doesn't exist
LOG_DIR = Path("/app/logs")
LOG_DIR.mkdir(exist_ok=True)


class JSONFormatter(logging.Formatter):
    """Custom JSON formatter for structured logging"""

    def format(self, record):
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }

        # Add exception info if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)

        # Add extra fields if present
        if hasattr(record, "extra_fields"):
            log_data.update(record.extra_fields)

        return json.dumps(log_data)


def setup_logging(
    log_level: str = "INFO",
    log_to_file: bool = True,
    log_to_console: bool = True,
    json_format: bool = False
):
    """
    Configure application-wide logging

    Args:
        log_level: Logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        log_to_file: Whether to log to file
        log_to_console: Whether to log to console
        json_format: Whether to use JSON formatting
    """
    # Get root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(getattr(logging, log_level.upper()))

    # Clear existing handlers
    root_logger.handlers.clear()

    # Create formatters
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(funcName)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )

    # Console handler
    if log_to_console:
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(getattr(logging, log_level.upper()))
        root_logger.addHandler(console_handler)

    # File handlers
    if log_to_file:
        # Main application log with rotation
        app_log_file = LOG_DIR / "app.log"
        app_file_handler = logging.handlers.RotatingFileHandler(
            app_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        app_file_handler.setFormatter(formatter)
        app_file_handler.setLevel(logging.DEBUG)
        root_logger.addHandler(app_file_handler)

        # Error log file
        error_log_file = LOG_DIR / "error.log"
        error_file_handler = logging.handlers.RotatingFileHandler(
            error_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        error_file_handler.setFormatter(formatter)
        error_file_handler.setLevel(logging.ERROR)
        root_logger.addHandler(error_file_handler)

        # Service-specific logs
        setup_service_loggers(formatter)

    # Configure third-party library logging levels
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("asyncio").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("celery").setLevel(logging.INFO)

    # Log startup message
    root_logger.info(f"Logging initialized - Level: {log_level}, File: {log_to_file}, Console: {log_to_console}")


def setup_service_loggers(formatter):
    """Set up specialized loggers for different services"""

    # FR24 API logger
    fr24_logger = logging.getLogger("app.services.flightradar24")
    fr24_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "fr24_api.log",
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=3
    )
    fr24_handler.setFormatter(formatter)
    fr24_logger.addHandler(fr24_handler)
    fr24_logger.setLevel(logging.DEBUG)

    # Celery tasks logger
    celery_logger = logging.getLogger("app.workers")
    celery_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "celery_tasks.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3
    )
    celery_handler.setFormatter(formatter)
    celery_logger.addHandler(celery_handler)
    celery_logger.setLevel(logging.INFO)

    # Database operations logger
    db_logger = logging.getLogger("app.crud")
    db_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "database.log",
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=3
    )
    db_handler.setFormatter(formatter)
    db_logger.addHandler(db_handler)
    db_logger.setLevel(logging.INFO)

    # API endpoints logger
    api_logger = logging.getLogger("app.api")
    api_handler = logging.handlers.RotatingFileHandler(
        LOG_DIR / "api.log",
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=3
    )
    api_handler.setFormatter(formatter)
    api_logger.addHandler(api_handler)
    api_logger.setLevel(logging.INFO)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance for a specific module"""
    return logging.getLogger(name)


# Utility function to log with extra context
def log_with_context(logger: logging.Logger, level: str, message: str, **context):
    """
    Log a message with additional context

    Args:
        logger: Logger instance
        level: Log level
        message: Log message
        **context: Additional context to include in the log
    """
    record = logger.makeRecord(
        logger.name,
        getattr(logging, level.upper()),
        None, None, message, None, None
    )
    record.extra_fields = context
    logger.handle(record)