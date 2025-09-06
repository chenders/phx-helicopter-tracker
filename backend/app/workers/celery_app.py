from datetime import datetime, timedelta, timezone
from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "phoenix_helicopter_tracker",
    broker=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    backend=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    include=[
        "app.workers.tracking_tasks",
        "app.workers.analysis_tasks",
        "app.workers.legal_tasks",
        "app.workers.data_import_tasks",
        "app.workers.fr24_scheduler",
    ],
)

# Celery configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    # Temporarily disable task routing to use default queue for all tasks
    # task_routes={
    #     'app.workers.tracking_tasks.*': {'queue': 'tracking'},
    #     'app.workers.analysis_tasks.*': {'queue': 'analysis'},
    #     'app.workers.legal_tasks.*': {'queue': 'legal'},
    #     'app.workers.data_import_tasks.*': {'queue': 'data_import'}
    # },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    task_time_limit=30 * 60,  # 30 minutes
    task_soft_time_limit=25 * 60,  # 25 minutes
    beat_schedule={
        # Live tracking updates removed - using FlightRadar24 API only
        # Analysis tasks
        "analyze-recent-patterns": {
            "task": "app.workers.analysis_tasks.analyze_recent_patterns",
            "schedule": 300.0,  # Every 5 minutes
        },
        # Data management
        "cleanup-old-imports": {
            "task": "app.workers.data_import_tasks.cleanup_old_imports_task",
            "schedule": 86400.0,  # Every 24 hours
            "kwargs": {"days_old": 30},
        },
        "cleanup-old-positions": {
            "task": "app.workers.tracking_tasks.cleanup_old_positions",
            "schedule": 86400.0,  # Every 24 hours
        },
        # FlightRadar24 management
        "monitor-credit-usage": {
            "task": "app.workers.tracking_tasks.monitor_fr24_credits",
            "schedule": 3600.0,  # Every hour
        },
        "schedule-fr24-downloads": {
            "task": "app.workers.fr24_scheduler.schedule_fr24_downloads",
            "schedule": 1800.0,  # Every 30 minutes - dynamically schedules downloads based on credits
        },
        # Aircraft registry sync (weekly)
        "sync-aircraft-registry": {
            "task": "app.workers.tracking_tasks.sync_aircraft_registry",
            "schedule": 604800.0,  # Every week (7 days)
        },
        # Weekly reports
        "generate-weekly-cost-analysis": {
            "task": "app.workers.analysis_tasks.generate_cost_analysis",
            "schedule": 604800.0,  # Every week (7 days)
            "kwargs": {
                "start_date": (datetime.now(timezone.utc) - timedelta(days=7)).strftime(
                    "%Y-%m-%d"
                ),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            },
        },
    },
)
