#!/usr/bin/env python3
"""
Monitor Celery queues and show which workers are consuming from which queues.
This helps verify that transcription tasks are NOT being processed by the main server.
"""
import os
import sys
import redis
import json
from datetime import datetime

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

def check_queues():
    """Check all Celery queues and their message counts."""

    # Connect to Redis
    r = redis.Redis(host='localhost', port=6380, db=0, decode_responses=True)

    print("=" * 70)
    print("Celery Queue Status")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 70)

    # Define all queues
    queues = [
        ('celery', 'Default queue'),
        ('tracking', 'Flight tracking tasks'),
        ('analysis', 'Pattern analysis tasks'),
        ('legal', 'Legal document generation'),
        ('data_import', 'Data import tasks'),
        ('radio', 'Radio archive downloads'),
        ('scheduler', 'Scheduled tasks'),
        ('transcription', 'Audio transcription (GPU workers only)'),
    ]

    print("\nQueue Status:")
    print("-" * 50)

    total_messages = 0
    for queue_name, description in queues:
        # Get queue length
        queue_key = f"celery:{queue_name}"
        length = r.llen(queue_key)
        total_messages += length

        status = "⚠️ " if length > 10 else "✓ " if length == 0 else "• "

        # Special formatting for transcription queue
        if queue_name == 'transcription':
            print(f"\n{status}{queue_name:15} {length:5} messages")
            print(f"{'':17}↳ {description}")
            if length > 0:
                print(f"{'':17}  ⚠️  Should be processed by GPU workers only!")
        else:
            print(f"{status}{queue_name:15} {length:5} messages  ({description})")

    print("-" * 50)
    print(f"Total messages: {total_messages}")

    # Check for active workers
    print("\n" + "=" * 70)
    print("Active Workers:")
    print("-" * 50)

    try:
        from app.workers.celery_app import celery_app

        inspector = celery_app.control.inspect()
        active_workers = inspector.active_queues()

        if active_workers:
            for worker_name, queues in active_workers.items():
                print(f"\n🖥️  Worker: {worker_name}")

                # Check if this worker is consuming from transcription queue
                consuming_transcription = False

                for queue_info in queues:
                    queue_name = queue_info.get('name', 'unknown')
                    if queue_name == 'transcription':
                        consuming_transcription = True
                    print(f"   • {queue_name}")

                # Warning if main worker is consuming transcription
                if consuming_transcription and 'gpu' not in worker_name.lower() and 'm1' not in worker_name.lower():
                    print(f"   ⚠️  WARNING: This worker should NOT consume from transcription queue!")
        else:
            print("No active workers found")

    except Exception as e:
        print(f"Could not inspect workers: {e}")
        print("(Workers may be offline or Celery may not be running)")

    print("\n" + "=" * 70)
    print("Queue Routing Configuration:")
    print("-" * 50)
    print("Main Server Workers should consume from:")
    print("  • celery, tracking, analysis, legal, data_import, radio, scheduler")
    print("\nGPU Workers (WSL2/M1) should ONLY consume from:")
    print("  • transcription")
    print("\n⚠️  If main workers are consuming from 'transcription' queue,")
    print("   update docker-compose.yml or restart with proper --queues parameter")
    print("=" * 70)

def check_pending_transcriptions():
    """Check for pending transcription tasks."""
    r = redis.Redis(host='localhost', port=6380, db=0, decode_responses=False)

    print("\n" + "=" * 70)
    print("Pending Transcription Tasks:")
    print("-" * 50)

    queue_key = b"celery:transcription"
    messages = r.lrange(queue_key, 0, 5)  # Get first 5 messages

    if messages:
        print(f"Found {r.llen(queue_key)} pending transcription tasks")
        print("\nFirst few tasks:")

        for i, msg in enumerate(messages, 1):
            try:
                # Decode the message
                task_data = json.loads(msg)
                task_name = task_data.get('headers', {}).get('task', 'unknown')
                task_id = task_data.get('headers', {}).get('id', 'unknown')[:8]

                print(f"  {i}. Task: {task_name}")
                print(f"     ID: {task_id}...")

            except Exception as e:
                print(f"  {i}. Could not decode message: {e}")

        print("\n⚠️  These tasks should be picked up by GPU workers")
        print("   Make sure GPU workers are running on WSL2 or M1 Mac")
    else:
        print("✓ No pending transcription tasks")

    print("=" * 70)

if __name__ == "__main__":
    try:
        check_queues()
        check_pending_transcriptions()
    except redis.ConnectionError:
        print("❌ Could not connect to Redis")
        print("   Make sure Redis is running on port 6380")
    except Exception as e:
        print(f"❌ Error: {e}")