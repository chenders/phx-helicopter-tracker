#!/usr/bin/env python3
"""
Trigger Celery tasks to download N623FB flights
"""
from datetime import datetime, timedelta, timezone
from app.workers.celery_app import celery_app

# Get the tasks
discover_task = celery_app.signature('discover_flights_for_registration')
download_task = celery_app.signature('download_tracks_for_discovered_flights')

# Calculate date ranges (split into 14-day chunks)
end_date = datetime.now(timezone.utc)

# First chunk: Last 14 days
chunk1_start = (end_date - timedelta(days=14)).isoformat()
chunk1_end = end_date.isoformat()

# Second chunk: Days 15-28
chunk2_start = (end_date - timedelta(days=28)).isoformat()
chunk2_end = (end_date - timedelta(days=14)).isoformat()

print(f"Triggering discovery for N623FB")
print(f"Chunk 1: {chunk1_start[:10]} to {chunk1_end[:10]}")
print(f"Chunk 2: {chunk2_start[:10]} to {chunk2_end[:10]}")

# Trigger discovery for both chunks
result1 = discover_task.apply_async(
    args=['N623FB'],
    kwargs={
        'max_pages': 20,
        'start_date': chunk1_start,
        'end_date': chunk1_end
    }
)
print(f"Task 1 ID: {result1.id}")

result2 = discover_task.apply_async(
    args=['N623FB'],
    kwargs={
        'max_pages': 20,
        'start_date': chunk2_start,
        'end_date': chunk2_end
    }
)
print(f"Task 2 ID: {result2.id}")

# Wait for discovery to complete
print("Waiting for discovery tasks to complete...")
result1.wait(timeout=300)
result2.wait(timeout=300)

print("Discovery complete! Now triggering track downloads...")

# Trigger track downloads
download_result = download_task.apply_async(
    kwargs={'batch_size': 20}
)
print(f"Download task ID: {download_result.id}")

print("Tasks submitted! Monitor progress in Flower at http://localhost:5555")