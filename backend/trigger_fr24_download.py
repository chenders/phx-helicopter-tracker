#!/usr/bin/env python3
"""
Script to trigger FlightRadar24 data download tasks
"""
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.workers.celery_app import celery_app
from datetime import datetime, timedelta, timezone


def trigger_scheduler():
    """Trigger the FR24 scheduler task"""
    print("🚁 Triggering FlightRadar24 download scheduler...")

    # Send the scheduler task
    result = celery_app.send_task("schedule_fr24_downloads")

    print(f"✅ Scheduler task submitted successfully!")
    print(f"📋 Task ID: {result.id}")
    print(f"📊 Task state: {result.state}")

    # Wait for the task to complete and show results
    print("\n⏳ Waiting for scheduler to complete...")
    try:
        scheduler_result = result.get(timeout=60)  # Wait up to 60 seconds
        print("✅ Scheduler completed!")
        print(f"📈 Results: {scheduler_result}")

        # Show what downloads were scheduled
        if scheduler_result.get("scheduled_tasks"):
            print(
                f"\n🛫 Scheduled {len(scheduler_result['scheduled_tasks'])} download tasks:"
            )
            for task in scheduler_result["scheduled_tasks"]:
                print(
                    f"   - {task['registration']}: {task['start_date']} to {task['end_date']} (Task ID: {task['task_id']})"
                )

        if scheduler_result.get("skipped_due_to_credits"):
            print(
                f"\n⚠️  Skipped {len(scheduler_result['skipped_due_to_credits'])} aircraft due to credit limits:"
            )
            for reg in scheduler_result["skipped_due_to_credits"]:
                print(f"   - {reg}")

    except Exception as e:
        print(f"❌ Error waiting for scheduler: {e}")
        print("The task was submitted but may still be running...")


def trigger_specific_downloads():
    """Trigger downloads for specific Phoenix PD aircraft"""
    print("\n🚁 Triggering specific downloads for Phoenix PD helicopters...")

    # Phoenix PD aircraft registrations
    aircraft = ["N624FB", "N625FB", "N626FB", "N627FB", "N628FB"]

    # Download last 7 days of data
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=7)

    task_ids = []

    for i, registration in enumerate(aircraft):
        print(f"📡 Scheduling download for {registration}...")

        # Schedule with delay to spread out API calls
        delay = i * 300  # 5 minutes between each aircraft

        result = celery_app.send_task(
            "import_fr24_historical",
            kwargs={
                "registration": registration,
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "interval_hours": 4,
            },
            countdown=delay,
        )

        task_ids.append((registration, result.id))
        print(f"   ✅ Task ID: {result.id} (starts in {delay//60} minutes)")

    print(f"\n🎯 Successfully scheduled {len(task_ids)} download tasks!")
    return task_ids


if __name__ == "__main__":
    print("🚁 Phoenix PD Helicopter Flight Data Downloader")
    print("=" * 50)

    # First try the intelligent scheduler
    trigger_scheduler()

    # Option to also trigger specific downloads
    print(f"\n{'='*50}")
    print("Would you like to also trigger specific downloads? (y/n): ", end="")

    # For automation, let's just trigger the scheduler for now
    print("Using scheduler only for credit-aware management.")
