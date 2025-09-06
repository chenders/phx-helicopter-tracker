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
        # Analysis tasks
        "analyze-recent-patterns": {
            "task": "app.workers.analysis_tasks.analyze_recent_patterns",
            "schedule": 300.0,  # Every 5 minutes
        },
        "analyze-flight-patterns": {
            "task": "app.workers.analysis_tasks.analyze_flight_patterns",
            "schedule": 3600.0,  # Every hour
            "kwargs": {
                "start_date": (datetime.now(timezone.utc) - timedelta(hours=24)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "analysis_types": ["surveillance", "hovering", "circling"],
            },
        },
        
        # Data import and management
        "cleanup-old-imports": {
            "task": "cleanup_old_imports",  # matches @celery_app.task name
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
            "schedule": 3600.0,  # Every hour - dynamically schedules downloads based on credits
        },
        "import-fr24-historical": {
            "task": "import_fr24_historical",  # matches @celery_app.task name in data_import_tasks
            "schedule": 7200.0,  # Every 2 hours
            "kwargs": {
                "registration": "N622FB",  # Primary aircraft
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "interval_hours": 6,
            },
        },
        
        # Aircraft registry sync
        "sync-aircraft-registry": {
            "task": "app.workers.tracking_tasks.sync_aircraft_registry",
            "schedule": 604800.0,  # Every week (7 days)
        },
        
        # File processing
        "process-pending-imports": {
            "task": "process_file_import",  # matches @celery_app.task name
            "schedule": 600.0,  # Every 10 minutes - check for pending file imports
            "kwargs": {
                "file_paths": [],
                "import_id": "scheduled_check",
            },
        },
        
        # Cost analysis and reports
        "generate-weekly-cost-analysis": {
            "task": "app.workers.analysis_tasks.generate_cost_analysis",
            "schedule": 604800.0,  # Every week (7 days)
            "kwargs": {
                "start_date": (datetime.now(timezone.utc) - timedelta(days=7)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            },
        },
        "generate-daily-cost-analysis": {
            "task": "app.workers.analysis_tasks.generate_cost_analysis",
            "schedule": 86400.0,  # Every 24 hours
            "kwargs": {
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            },
        },
        
        # Legal document generation
        "generate-weekly-legal-reports": {
            "task": "app.workers.legal_tasks.generate_legal_document",
            "schedule": 604800.0,  # Every week
            "kwargs": {
                "document_id": 1,  # Placeholder - would be dynamically created
            },
        },
        
        # Backup historical data collection
        "backfill-historical-data-monthly": {
            "task": "app.workers.fr24_scheduler.backfill_historical_data",  # full task name path
            "schedule": 2592000.0,  # Every 30 days
            "kwargs": {
                "registration": "N622FB",
                "months_back": 1,
            },
        },
    },
)
