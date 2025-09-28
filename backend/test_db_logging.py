#!/usr/bin/env python3
"""
Test script to generate system logs for testing the Logs page
"""
import asyncio
import random
from datetime import datetime, timedelta

from app.services.db_logger import DatabaseLogger
from app.models.system_logs import LogCategory

# Create logger
logger = DatabaseLogger("test_script")


async def generate_test_logs():
    """Generate various test logs"""

    # Success logs
    logger.info(
        "Successfully downloaded flight data",
        category=LogCategory.FLIGHT_DOWNLOAD,
        flight_id="N623FB_20250927",
        registration="N623FB",
        context={"positions_count": 142, "duration_minutes": 65}
    )

    logger.info(
        "FR24 API call successful",
        category=LogCategory.FR24_API,
        context={"endpoint": "/live-positions", "credits_used": 15}
    )

    # Warning logs
    logger.warning(
        "High hover duration detected",
        category=LogCategory.ANOMALY,
        flight_id="N624FB_20250926",
        registration="N624FB",
        context={
            "hover_duration_seconds": 480,
            "location": "Residential area",
            "altitude_feet": 500
        }
    )

    logger.warning(
        "API rate limit approaching",
        category=LogCategory.FR24_API,
        context={"requests_remaining": 5, "reset_time": "2025-09-28T01:00:00Z"}
    )

    # Error logs
    logger.error(
        "Failed to parse flight data",
        category=LogCategory.DATA_PARSING,
        exception=ValueError("Invalid timestamp format"),
        flight_id="N622FB_20250925",
        context={"raw_data": "2025-09-25T25:00:00"}  # Invalid hour
    )

    logger.error(
        "Database connection failed",
        category=LogCategory.DATABASE,
        exception=ConnectionError("Connection refused"),
        context={"retry_count": 3}
    )

    # Critical logs
    logger.critical(
        "FR24 API authentication failed",
        category=LogCategory.FR24_API,
        exception=Exception("401 Unauthorized - Invalid API key"),
        context={"environment": "production"}
    )

    # Analysis logs
    logger.info(
        "Pattern analysis completed",
        category=LogCategory.ANALYSIS,
        flight_id="N623FB_20250927",
        context={
            "patterns_detected": ["extended_hover", "low_altitude", "residential_surveillance"],
            "confidence": 0.87
        }
    )

    # Celery task logs
    logger.info(
        "Celery task started",
        category=LogCategory.CELERY_TASK,
        task_id="download_tracks_123456",
        context={"task_name": "download_tracks_for_discovered_flights", "batch_size": 20}
    )

    logger.error(
        "Celery task failed",
        category=LogCategory.CELERY_TASK,
        task_id="download_tracks_789012",
        exception=TimeoutError("Task exceeded 300s timeout"),
        context={"task_name": "process_flight_positions", "retry_count": 2}
    )

    # Data integrity logs
    logger.warning(
        "Duplicate flight record detected",
        category=LogCategory.DATA_INTEGRITY,
        flight_id="N625FB_20250924",
        registration="N625FB",
        context={"existing_id": 456, "new_id": 789}
    )

    # Backup logs
    logger.info(
        "Database backup completed",
        category=LogCategory.BACKUP,
        context={
            "backup_file": "/backups/phoenix_helicopters_20250928.sql",
            "size_mb": 145.3,
            "duration_seconds": 12
        }
    )

    # More anomaly logs with different severities
    for i in range(5):
        logger.anomaly(
            f"Unusual flight pattern detected - Pattern #{i+1}",
            flight_id=f"N62{i}FB_202509{20+i}",
            registration=f"N62{i}FB",
            context={
                "pattern_type": random.choice(["circle", "hover", "low_pass", "erratic"]),
                "duration": random.randint(60, 600),
                "altitude": random.randint(300, 2000),
                "over_residential": random.choice([True, False])
            }
        )

    print("Test logs generated successfully!")
    print("Check http://localhost:3000/logs to view them")


if __name__ == "__main__":
    asyncio.run(generate_test_logs())