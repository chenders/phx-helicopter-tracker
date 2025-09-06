"""
Dynamic scheduler for FlightRadar24 historical data downloads
Manages credit usage and prioritizes most recent data
"""
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from celery import Task

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.crud.aircraft import aircraft_crud

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="app.workers.fr24_scheduler.schedule_fr24_downloads")
def schedule_fr24_downloads(self) -> Dict[str, Any]:
    """
    Dynamically schedule FlightRadar24 historical downloads based on:
    - Credit usage
    - Data gaps
    - Aircraft priority

    This runs every 2 hours and determines what data to download next
    """
    db = SessionLocal()
    results = {"scheduled_tasks": [], "skipped_due_to_credits": [], "errors": []}

    try:
        # Get all Phoenix PD aircraft
        aircraft_list = aircraft_crud.get_phoenix_pd_aircraft(db, active_only=True)

        # Priority order for aircraft (most important first) - from .env file
        priority_registrations = ["N622FB", "N623FB", "N624FB", "N625FB", "N626FB", "N627FB", "N628FB"]

        # Sort aircraft by priority
        sorted_aircraft = sorted(
            aircraft_list,
            key=lambda a: priority_registrations.index(a.registration)
            if a.registration in priority_registrations
            else 999,
        )

        # Check current credit usage
        from app.services.flightradar24_api_service import fr24_api_service
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def check_and_schedule():
            async with fr24_api_service:
                if not fr24_api_service.credit_manager:
                    logger.error("Credit manager not initialized")
                    return

                stats = await fr24_api_service.credit_manager.get_usage_stats()
                credit_percentage = stats["monthly_percentage"]

                logger.info(f"FR24 Credit Usage: {credit_percentage:.1f}%")

                # Determine how aggressive to be with downloads
                if credit_percentage >= 95:
                    logger.warning(
                        "Credit usage critical (>=95%), skipping all downloads"
                    )
                    results["skipped_due_to_credits"] = [
                        a.registration for a in sorted_aircraft
                    ]
                    return
                elif credit_percentage >= 90:
                    # Only download most important aircraft, last 24 hours
                    max_aircraft = 1
                    days_back = 1
                    interval_hours = 12
                elif credit_percentage >= 80:
                    # Limited downloads - top 2 aircraft, last 3 days
                    max_aircraft = 2
                    days_back = 3
                    interval_hours = 8
                elif credit_percentage >= 60:
                    # Moderate downloads - top 3 aircraft, last 7 days
                    max_aircraft = 3
                    days_back = 7
                    interval_hours = 6
                else:
                    # Full downloads - all aircraft, last 14 days
                    max_aircraft = len(sorted_aircraft)
                    days_back = 14
                    interval_hours = 4

                # Schedule downloads for selected aircraft
                for i, aircraft in enumerate(sorted_aircraft[:max_aircraft]):
                    # Calculate date range
                    end_date = datetime.now(timezone.utc)
                    start_date = end_date - timedelta(days=days_back)

                    # Check when we last downloaded data for this aircraft
                    from app.crud.flights import flight_log_crud

                    # Get recent flights to find the latest one
                    recent_flights = flight_log_crud.get_recent_flights(
                        db, hours=720, phoenix_pd_only=False  # Last 30 days
                    )
                    # Filter for this aircraft and get the latest
                    aircraft_flights = [f for f in recent_flights if f.aircraft_id == aircraft.id]
                    latest_flight = max(aircraft_flights, key=lambda f: f.departure_time) if aircraft_flights else None

                    if latest_flight and latest_flight.departure_time:
                        # Start from where we left off
                        start_date = max(start_date, latest_flight.departure_time)

                    # Skip if we already have recent data
                    if (end_date - start_date).days < 1:
                        logger.info(
                            f"Skipping {aircraft.registration}: already have recent data"
                        )
                        continue

                    # Schedule the download task with a delay to spread out API calls
                    delay = i * 300  # 5 minutes between each aircraft

                    task = celery_app.send_task(
                        "import_fr24_historical",
                        kwargs={
                            "registration": aircraft.registration,
                            "start_date": start_date.strftime("%Y-%m-%d"),
                            "end_date": end_date.strftime("%Y-%m-%d"),
                            "interval_hours": interval_hours,
                        },
                        countdown=delay,
                    )

                    results["scheduled_tasks"].append(
                        {
                            "registration": aircraft.registration,
                            "task_id": task.id,
                            "start_date": start_date.strftime("%Y-%m-%d"),
                            "end_date": end_date.strftime("%Y-%m-%d"),
                            "interval_hours": interval_hours,
                            "delay_seconds": delay,
                        }
                    )

                    logger.info(
                        f"Scheduled download for {aircraft.registration}: "
                        f"{start_date.date()} to {end_date.date()}"
                    )

                # Handle aircraft that were skipped due to credits
                if max_aircraft < len(sorted_aircraft):
                    results["skipped_due_to_credits"] = [
                        a.registration for a in sorted_aircraft[max_aircraft:]
                    ]

        loop.run_until_complete(check_and_schedule())
        loop.close()

    except Exception as e:
        logger.error(f"Error in FR24 scheduler: {e}")
        results["errors"].append(str(e))
    finally:
        db.close()

    return results


@celery_app.task(bind=True, name="backfill_historical_data")
def backfill_historical_data(
    self, registration: str, months_back: int = 12
) -> Dict[str, Any]:
    """
    Backfill historical data for a specific aircraft going back N months
    This is a one-time task for initial data collection

    Args:
        registration: Aircraft registration to backfill
        months_back: Number of months to go back (default 12)
    """
    results = {
        "registration": registration,
        "months_processed": [],
        "total_flights": 0,
        "total_positions": 0,
        "errors": [],
    }

    try:
        # Process month by month, starting from most recent
        end_date = datetime.now(timezone.utc)

        for month_offset in range(months_back):
            # Calculate month boundaries
            month_end = end_date - timedelta(days=30 * month_offset)
            month_start = month_end - timedelta(days=30)

            # Schedule import task for this month
            task = celery_app.send_task(
                "app.workers.data_import_tasks.import_fr24_historical",
                kwargs={
                    "registration": registration,
                    "start_date": month_start.strftime("%Y-%m-%d"),
                    "end_date": month_end.strftime("%Y-%m-%d"),
                    "interval_hours": 6,  # Sample every 6 hours for historical data
                },
                countdown=month_offset * 600,  # 10 minutes between each month
            )

            results["months_processed"].append(
                {"month": month_start.strftime("%Y-%m"), "task_id": task.id}
            )

            logger.info(
                f"Scheduled backfill for {registration} - {month_start.strftime('%Y-%m')}"
            )

    except Exception as e:
        logger.error(f"Error in backfill: {e}")
        results["errors"].append(str(e))

    return results
