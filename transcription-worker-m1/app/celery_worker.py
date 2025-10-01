"""
Celery worker configuration for Apple Silicon (M1) GPU-accelerated transcription.
This worker uses Metal Performance Shaders (MPS) for GPU acceleration on M1 Macs.
"""
import os
from celery import Celery

# Set up Redis connection from environment variables
REDIS_HOST = os.getenv("REDIS_HOST", "192.168.1.100")  # Replace with your Ubuntu server IP
REDIS_PORT = os.getenv("REDIS_PORT", "6380")  # Using the mapped port
REDIS_DB = os.getenv("REDIS_DB", "0")
REDIS_URL = f"redis://{REDIS_HOST}:{REDIS_PORT}/{REDIS_DB}"

# Create Celery instance
celery_app = Celery(
    "phx_pd_helicopter_tracker",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=[
        "app.transcription_tasks",  # Our local transcription tasks
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

    # IMPORTANT: Only consume from the transcription queue
    task_routes={
        'transcribe_phoenix_pd_archives': {'queue': 'transcription'},
        'transcribe_audio_file': {'queue': 'transcription'},
        'batch_transcribe_directory': {'queue': 'transcription'},
    },

    # Worker configuration optimized for M1 GPU
    worker_prefetch_multiplier=1,  # Only fetch one task at a time
    task_acks_late=True,
    worker_max_tasks_per_child=20,  # Restart after 20 tasks to free memory

    # Longer timeouts for transcription tasks
    task_time_limit=7200,  # 2 hours hard limit
    task_soft_time_limit=6600,  # 1 hour 50 minutes soft limit

    # Worker settings
    worker_enable_remote_control=True,
    worker_send_task_events=True,
    task_send_sent_event=True,

    # Use threading pool for better M1 compatibility
    worker_pool="threads",  # Better for M1 GPU memory management
    worker_concurrency=1,  # Process one task at a time for GPU
)

print(f"M1 Mac Transcription worker configured")
print(f"Redis connection: {REDIS_URL}")
print("This worker will ONLY process tasks from the 'transcription' queue")
print("Using Metal Performance Shaders (MPS) for GPU acceleration")