from datetime import datetime, timedelta, timezone
from celery import Celery
from celery.schedules import crontab
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
        "app.workers.radio_tasks_alternative",
        "app.workers.radio_tasks_faster_whisper",
        "app.workers.radio_analysis_tasks",
        "app.workers.radio_import_tasks",
        "app.workers.flight_tracking_tasks",
        "app.workers.flight_discovery_tasks",
        "app.workers.abnormal_pattern_tasks",
        "app.workers.data_maintenance_tasks",
        "app.workers.system_monitoring_tasks",
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
    # Broker heartbeat settings - prevent "missed heartbeat" errors on long tasks
    broker_transport_options={
        "visibility_timeout": 7200,  # 2 hours - how long task can run before broker reclaims it
        "fanout_prefix": True,
        "fanout_patterns": True,
    },
    broker_heartbeat=0,  # Disable broker heartbeat checks (workers send task updates instead)
    worker_send_task_events=True,  # Send task events for monitoring
    # Task routing for different queues
    # IMPORTANT: Transcription queue is handled by dedicated GPU workers (WSL2/M1 Mac)
    # Main workers MUST exclude the 'transcription' queue
    task_routes={
        "app.workers.tracking_tasks.*": {"queue": "tracking"},
        "app.workers.analysis_tasks.*": {"queue": "analysis"},
        "app.workers.legal_tasks.*": {"queue": "legal"},
        "app.workers.data_import_tasks.*": {"queue": "data_import"},
        "app.workers.radio_tasks.*": {"queue": "radio"},
        "app.workers.radio_analysis_tasks.*": {"queue": "analysis"},
        "app.workers.radio_import_tasks.*": {"queue": "data_import"},
        "app.workers.fr24_scheduler.*": {"queue": "scheduler"},
        # TRANSCRIPTION TASKS - ONLY processed by dedicated GPU workers
        # DO NOT process these on the main server
        "transcribe_phoenix_pd_archives": {"queue": "transcription"},
        "transcribe_phoenix_pd_archives_faster": {"queue": "transcription"},
        "transcribe_audio_file": {"queue": "transcription"},
        "batch_transcribe_directory": {"queue": "transcription"},
        # Ensure radio download tasks stay on radio queue
        "download_phoenix_pd_archives": {"queue": "radio"},
        "download_broadcastify_archives": {"queue": "radio"},
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
            "schedule": crontab(minute="0,30"),  # Every 30 minutes at :00 and :30
        },
        "analyze-and-score-flights": {
            "task": "app.workers.analysis_tasks.analyze_and_score_flights",
            "schedule": crontab(
                minute="15,45"
            ),  # Every 30 minutes at :15 and :45 (offset by 15 min)
            "options": {
                "expires": 1700,  # Expire if not started within ~28 minutes
            },
        },
        "analyze-flight-patterns": {
            "task": "app.workers.analysis_tasks.analyze_flight_patterns",
            "schedule": 3600.0,  # Every hour
            "kwargs": {
                "start_date": (
                    datetime.now(timezone.utc) - timedelta(hours=24)
                ).strftime("%Y-%m-%d"),
                "end_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "analysis_types": ["surveillance", "hovering", "circling"],
                "max_flights": 100,  # Limit to prevent overload
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
        # COMPLETE FLIGHT TRACKING - Reduced frequency to save credits
        # DISABLED - Consuming too many credits
        # "monitor-complete-flights": {
        #     "task": "monitor_and_download_complete_flights",
        #     "schedule": 300.0,  # Every 5 minutes - detect takeoffs/landings
        # },
        # DISABLED - Replaced by discover-phoenix-pd-flights which gets complete tracks
        # "download-missed-flights-daily": {
        #     "task": "download_missed_flight_tracks",
        #     "schedule": 86400.0,  # Once per day - catch any missed flights
        #     "kwargs": {
        #         "hours_back": 24,
        #     },
        # },
        "analyze-phoenix-pd-fleet": {
            "task": "analyze_phoenix_pd_fleet_status",
            "schedule": 3600.0,  # Every hour - track 24/7 coverage claims
        },
        # Radio archive download - downloads latest MP3 archives from Broadcastify
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
        # DISABLED - Replaced by discover-phoenix-pd-flights which gets complete tracks
        # "weekly-complete-flight-backfill": {
        #     "task": "download_missed_flight_tracks",
        #     "schedule": 604800.0,  # Every 7 days
        #     "kwargs": {
        #         "hours_back": 168,  # Full week of data
        #     },
        # },
        # Additional radio archive tasks - TEMPORARILY DISABLED
        # "download-broadcastify-archives-extended": {
        #     "task": "download_broadcastify_archives",
        #     "schedule": 14400.0,  # Every 4 hours
        #     "kwargs": {
        #         "feed_id": "12145",  # Phoenix Police
        #         "max_downloads": 5,
        #         "days_back": 2,  # Check last 2 days
        #     },
        # },
        # Flight discovery for historical backfill
        "discover-phoenix-pd-flights": {
            "task": "discover_all_phoenix_pd_flights",
            "schedule": 43200.0,  # Twice daily (every 12 hours) for better coverage
        },
        # Balanced download schedule for complete data capture
        # Runs every 15 minutes to ensure we get tracks before they expire
        # But not so frequent as to exhaust credits
        "download-discovered-tracks-1": {
            "task": "download_tracks_for_discovered_flights",
            "schedule": 900.0,  # Every 15 minutes (balanced)
            "kwargs": {"batch_size": 10},  # 10 flights per batch
        },
        # Additional parallel task for faster downloads (disabled for now, enable if needed)
        # "download-discovered-tracks-2": {
        #     "task": "download_tracks_for_discovered_flights",
        #     "schedule": 60.0,  # Every minute
        #     "kwargs": {"batch_size": 10}
        # },
        # Abnormal pattern detection - reduced frequency to save credits
        "detect-abnormal-patterns": {
            "task": "detect_abnormal_flight_patterns",
            "schedule": 86400.0,  # Once per day (was every 30 minutes)
            "kwargs": {
                "batch_size": 100,  # Process 100 unanalyzed flights per run (was 50)
                "min_complexity_threshold": 2.0,
            },
        },
        # Radio transcription - processes untranscribed MP3 files
        "transcribe-radio-archives-single": {
            "task": "transcribe_phoenix_pd_archives_faster",
            "schedule": 1200.0,  # Every 20 minutes
            "kwargs": {
                "batch_size": 5,  # Process 5 files at a time with faster-whisper
                "model_name": "medium",
            },
            "options": {
                "time_limit": 7200,  # 2 hour limit
                "soft_time_limit": 6600,  # 1h 50m soft limit
                "max_retries": 0,  # No retries to prevent overlap
                "acks_late": False,  # Acknowledge immediately to prevent requeuing
                "queue": "transcription",  # Route to GPU worker
            },
        },
        # Import JSON transcripts into the DB (powers RadioAnalysis + flight-radio correlation)
        "import-radio-transcriptions-to-db": {
            "task": "import_transcriptions_from_json",
            "schedule": 1800.0,  # Every 30 minutes - import new JSON transcripts into DB
            "kwargs": {"batch_size": 200},
        },
        # REMOVED cleanup-old-radio-archives - we want to keep all radio archives permanently
        # Radio transcription analysis - extract entities and correlate with flights
        "extract-radio-entities": {
            "task": "process_untranscribed_archives",
            "schedule": 3600.0,  # Every hour - process new transcriptions
            "kwargs": {
                "batch_size": 10,  # Process 10 transcriptions per run
            },
            "options": {
                "queue": "analysis",
            },
        },
        "correlate-radio-with-flights": {
            "task": "correlate_radio_with_flights",
            "schedule": 86400.0,  # Daily - correlate radio mentions with flights
            "kwargs": {
                "days_back": 7,  # Analyze last 7 days
                "time_window_minutes": 30,  # ±30 minute correlation window
            },
            "options": {
                "queue": "analysis",
            },
        },
        # System monitoring and error detection
        "monitor-system-errors": {
            "task": "monitor_system_errors",
            "schedule": 3600.0,  # Every hour - check for new errors
            "kwargs": {
                "hours_back": 1,  # Check last hour
                "auto_resolve_age_hours": 24,  # Auto-resolve issues not seen in 24 hours
            },
        },
    },
)

# Import signal handlers for task monitoring
try:
    from app.workers import task_monitoring_signals
except ImportError:
    # Task monitoring signals are optional
    pass
