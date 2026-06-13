#!/usr/bin/env python3
"""
Trigger full 2-year historical data download via Celery
"""

import sys
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.workers.celery_app import celery_app


def trigger_download(days_back: int = 730):
    """
    Trigger the full historical download task

    Args:
        days_back: Number of days to download (default 730 = 2 years)
    """
    print(f"Triggering full historical download for {days_back} days...")
    print("This will download flight data for all Phoenix PD helicopters")
    print("Expected helicopters: N621FB, N622FB, N623FB, N624FB, N625FB")
    print("")
    print("The task will:")
    print(f"  1. Split {days_back} days into 14-day chunks (FR24 API limitation)")
    print("  2. Discover flights for each helicopter in each chunk")
    print("  3. Store flight metadata in the database")
    print("  4. Later tasks will download detailed position data")
    print("")

    # Send the task to Celery
    task = celery_app.send_task(
        "download_full_historical_data", kwargs={"days_back": days_back}
    )

    print("✓ Task submitted successfully!")
    print(f"  Task ID: {task.id}")
    print(f"  Status: {task.state}")
    print("")
    print("Monitor progress with:")
    print(f"  - Flower: http://localhost:5555/task/{task.id}")
    print("  - Backend logs: docker compose logs -f backend")
    print("")
    print("This will take several hours to complete due to:")
    print("  - FR24 API rate limits (3 second delays between requests)")
    print("  - Large number of API calls needed (~260 chunks × 5 helicopters)")
    print("")

    return task


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Download full historical flight data")
    parser.add_argument(
        "--days",
        type=int,
        default=730,
        help="Number of days to download (default: 730 = 2 years, max: 730)",
    )

    args = parser.parse_args()

    if args.days > 730:
        print("WARNING: FR24 API only provides up to 730 days of historical data")
        print("Setting days_back to 730")
        args.days = 730

    trigger_download(args.days)
