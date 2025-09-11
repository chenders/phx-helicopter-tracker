from datetime import datetime, timedelta, timezone
from celery import Celery
from app.core.config import settings

# Create Celery instance
celery_app = Celery(
    "phx_pd_helicopter_tracker",
    broker=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    backend=getattr(settings, "REDIS_URL", "redis://localhost:6379/0"),
    include=[
        "app.workers.tracking_tasks",
        "app.workers.analysis_tasks",
        "app.workers.legal_tasks",
        "app.workers.data_import_tasks",
        "app.workers.fr24_scheduler",
        "app.workers.radio_tasks",
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
    # Task routing for different queues
    task_routes={
        'app.workers.tracking_tasks.*': {'queue': 'tracking'},
        'app.workers.analysis_tasks.*': {'queue': 'analysis'},
        'app.workers.legal_tasks.*': {'queue': 'legal'},
        'app.workers.data_import_tasks.*': {'queue': 'data_import'},
        'app.workers.radio_tasks.*': {'queue': 'radio'},
        'app.workers.fr24_scheduler.*': {'queue': 'scheduler'}
    },
    worker_prefetch_multiplier=1,
    task_acks_late=True,
    worker_max_tasks_per_child=1000,
    task_time_limit=30 * 60,  # 30 minutes (default)
    task_soft_time_limit=25 * 60,  # 25 minutes (default)
    beat_schedule={
        # Analysis tasks
        "analyze-recent-patterns": {
            "task": "app.workers.analysis_tasks.analyze_recent_patterns",
            "schedule": 1800.0,  # Every 30 minutes
        },
        "analyze-and-score-flights": {
            "task": "app.workers.analysis_tasks.analyze_and_score_flights",
            "schedule": 3600.0,  # Every hour
        },
        "analyze-flight-patterns": {
            "task": "app.workers.analysis_tasks.analyze_flight_patterns",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "start_date": (
                    datetime.now(timezone.utc) - timedelta(hours=24)
                ).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "analysis_types": ["surveillance", "hovering", "circling"],
            },
        },
        # Data import and management
        # REMOVED cleanup-old-imports - we want to keep all historical data
        # REMOVED cleanup-old-positions - we want to keep all position data
        # FlightRadar24 management
        "monitor-credit-usage": {
            "task": "app.workers.tracking_tasks.monitor_fr24_credits",
            "schedule": 3600.0,  # Every hour
        },
        # FR24 downloads
        "schedule-fr24-downloads": {
            "task": "app.workers.fr24_scheduler.schedule_fr24_downloads",
            "schedule": 86400.0,  # Once per day
        },
        # Individual helicopter downloads
        "download-fr24-N621FB": {
            "task": "download_and_import_fr24_flights",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "registration": "N621FB",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "format": "kml",
            },
        },
        "download-fr24-N622FB": {
            "task": "download_and_import_fr24_flights",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "registration": "N622FB",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "format": "kml",
            },
        },
        "download-fr24-N623FB": {
            "task": "download_and_import_fr24_flights",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "registration": "N623FB",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "format": "kml",
            },
        },
        "download-fr24-N624FB": {
            "task": "download_and_import_fr24_flights",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "registration": "N624FB",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "format": "kml",
            },
        },
        "download-fr24-N625FB": {
            "task": "download_and_import_fr24_flights",
            "schedule": 86400.0,  # Once per day
            "kwargs": {
                "registration": "N625FB",
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "format": "kml",
            },
        },
        # Radio archive tasks
        "download-radio-archives": {
            "task": "download_broadcastify_archives",
            "schedule": 3600.0,  # Every hour
            "kwargs": {
                "max_downloads": 5,
                "days_back": 2,
            },
        },
        # REMOVED - Using only transcribe-radio-archives-single below to avoid conflicts
        # Aircraft registry sync
        "sync-aircraft-registry": {
            "task": "app.workers.tracking_tasks.sync_aircraft_registry",
            "schedule": 604800.0,  # Every week (7 days)
        },
        # File processing
        "process-pending-imports": {
            "task": "process_file_import",
            "schedule": 3600.0,  # Every hour - check for pending file imports
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
                "start_date": (datetime.now(timezone.utc) - timedelta(days=7)).strftime(
                    "%Y-%m-%d"
                ),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            },
        },
        "generate-daily-cost-analysis": {
            "task": "app.workers.analysis_tasks.generate_cost_analysis",
            "schedule": 86400.0,  # Every 24 hours
            "kwargs": {
                "start_date": (datetime.now(timezone.utc) - timedelta(days=1)).strftime(
                    "%Y-%m-%d"
                ),
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
            "task": "app.workers.fr24_scheduler.backfill_historical_data",
            "schedule": 2592000.0,  # Every 30 days
            "kwargs": {
                "registration": "N622FB",
                "months_back": 1,
            },
        },
        # Additional radio archive tasks
        "download-broadcastify-archives-extended": {
            "task": "download_broadcastify_archives",
            "schedule": 14400.0,  # Every 4 hours
            "kwargs": {
                "feed_id": "12145",  # Phoenix Police
                "max_downloads": 5,
                "days_back": 2,  # Check last 2 days
            },
        },
        "transcribe-radio-archives-single": {
            "task": "transcribe_radio_archives",
            "schedule": 3600.0,  # Every 1 hour
            "kwargs": {
                "batch_size": 1,  # ONLY process 1 file at a time
                "model_name": "base",
            },
            "options": {
                "time_limit": 3600,  # 1 hour limit
                "soft_time_limit": 3300,  # 55 minutes soft limit
                "max_retries": 0,  # No retries to prevent overlap
                "acks_late": False,  # Acknowledge immediately to prevent requeuing
            },
        },
        # REMOVED cleanup-old-radio-archives - we want to keep all radio archives permanently
    },
)
