import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any
from celery import current_task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal

# Lazy imports to avoid startup dependency issues
# from app.services.flightradar24_service import flightradar24_service
from app.crud.aircraft import aircraft_crud
from app.crud.flights import flight_log_crud, flight_position_crud
from app.schemas.flights import FlightLogCreate, FlightPositionCreate
from app.models.aircraft import Aircraft
from app.services.websocket_manager import WebSocketManager

logger = logging.getLogger(__name__)
websocket_manager = WebSocketManager()


# ADS-B refresh task removed - using FlightRadar24 API only


@celery_app.task(bind=True, max_retries=3)
def import_flightradar24_file(
    self, file_path: str, aircraft_registration: str, file_format: str = "kml"
):
    """Import FlightRadar24 historical data file"""
    try:
        logger.info(f"Starting FlightRadar24 import: {file_path}")

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 0, "total": 100, "status": "Starting import..."},
            )

        # Run async function in sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _import_flightradar24_file_async(
                file_path, aircraft_registration, file_format
            )
        )
        loop.close()

        logger.info(f"FlightRadar24 import completed: {result}")
        return result

    except Exception as exc:
        logger.error(f"FlightRadar24 import failed: {exc}")
        if self.request.retries < 3:
            raise self.retry(countdown=300, exc=exc)  # 5 minute delay
        raise


async def _import_flightradar24_file_async(
    file_path: str, aircraft_registration: str, file_format: str
) -> Dict[str, Any]:
    """Async function to import FlightRadar24 file"""
    db = SessionLocal()
    result = {
        "file_path": file_path,
        "aircraft_registration": aircraft_registration,
        "positions_imported": 0,
        "flights_created": 0,
        "errors": [],
    }

    try:
        # Update progress
        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 10, "total": 100, "status": "Parsing file..."},
            )

        # Get or create aircraft record
        aircraft = aircraft_crud.get_by_registration(
            db, registration=aircraft_registration
        )
        if not aircraft:
            # Create aircraft if it doesn't exist
            from app.schemas.aircraft import AircraftCreate

            aircraft_create = AircraftCreate(
                registration=aircraft_registration,
                is_phoenix_pd=aircraft_registration.startswith("N6")
                and "FB" in aircraft_registration,
            )
            aircraft = aircraft_crud.create(db, obj_in=aircraft_create)

        # Lazy import to avoid startup dependency issues
        from app.services.flightradar24_service import flightradar24_service

        # Import flight data
        flight, errors = await flightradar24_service.import_file(
            file_path, aircraft_registration, file_format
        )

        result["errors"] = errors

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 30, "total": 100, "status": "Creating flight log..."},
            )

        # Create flight log
        flight_create = FlightLogCreate(
            aircraft_id=aircraft.id,
            flight_id=flight.flight_id,
            departure_time=flight.departure_time,
            arrival_time=flight.arrival_time,
            departure_airport=flight.departure_airport,
            arrival_airport=flight.arrival_airport,
            flight_duration_minutes=(
                (flight.arrival_time - flight.departure_time).total_seconds() / 60
                if flight.departure_time and flight.arrival_time
                else None
            ),
            data_source="flightradar24",
            raw_data=flight.raw_data,
        )

        db_flight = flight_log_crud.create(db, obj_in=flight_create)
        result["flights_created"] = 1

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 50, "total": 100, "status": "Importing positions..."},
            )

        # Create position records in batches
        batch_size = 100
        total_positions = len(flight.positions)

        for i in range(0, total_positions, batch_size):
            batch = flight.positions[i : i + batch_size]
            position_creates = []

            for pos in batch:
                position_create = FlightPositionCreate(
                    flight_log_id=db_flight.id,
                    aircraft_id=aircraft.id,
                    timestamp=pos.timestamp,
                    latitude=pos.latitude,
                    longitude=pos.longitude,
                    altitude_feet=pos.altitude_feet,
                    ground_speed_knots=pos.ground_speed_knots,
                    track_degrees=pos.track_degrees,
                    data_source="flightradar24",
                )
                position_creates.append(position_create)

            # Bulk create positions
            flight_position_crud.create_bulk(db, positions=position_creates)
            result["positions_imported"] += len(batch)

            # Update progress
            if current_task:
                progress = 50 + int(
                    (i / total_positions) * 40
                )  # 50-90% for position import
                current_task.update_state(
                    state="PROGRESS",
                    meta={
                        "current": progress,
                        "total": 100,
                        "status": f'Imported {result["positions_imported"]}/{total_positions} positions...',
                    },
                )

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 90, "total": 100, "status": "Analyzing patterns..."},
            )

        # Analyze flight patterns
        pattern_analysis = flightradar24_service.analyze_flight_patterns(flight)

        # Update flight log with analysis
        from app.schemas.flights import FlightLogUpdate

        flight_update = FlightLogUpdate(
            surveillance_likelihood=pattern_analysis.get(
                "surveillance_likelihood", 0.0
            ),
            area_coverage={"analysis": pattern_analysis},
            hover_locations={"segments": pattern_analysis.get("hovering_segments", [])},
            low_altitude_segments={
                "segments": pattern_analysis.get("low_altitude_segments", [])
            },
        )

        flight_log_crud.update(db, db_obj=db_flight, obj_in=flight_update)

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 100, "total": 100, "status": "Import completed"},
            )

    except Exception as e:
        logger.error(f"Error importing FlightRadar24 file: {e}")
        result["errors"].append(str(e))
        raise
    finally:
        db.close()

    return result


@celery_app.task
def sync_aircraft_registry():
    """Sync aircraft registry information with FAA database"""
    db = SessionLocal()
    result = {"aircraft_updated": 0, "new_aircraft_found": 0, "errors": []}

    try:
        # Get all Phoenix PD aircraft
        phoenix_aircraft = aircraft_crud.get_phoenix_pd_aircraft(db, active_only=False)

        for aircraft in phoenix_aircraft:
            try:
                # TODO: Implement FAA registry lookup
                # This would query the FAA aircraft registry API
                # to get updated aircraft information

                # Placeholder for now
                logger.info(f"Would sync registry info for {aircraft.registration}")
                result["aircraft_updated"] += 1

            except Exception as e:
                logger.error(f"Error syncing aircraft {aircraft.registration}: {e}")
                result["errors"].append(f"{aircraft.registration}: {str(e)}")

    except Exception as e:
        logger.error(f"Error in aircraft registry sync: {e}")
        result["errors"].append(str(e))
    finally:
        db.close()

    return result


@celery_app.task
def monitor_fr24_credits():
    """Monitor FlightRadar24 API credit usage and alert if needed"""
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_monitor_credits_async())
        loop.close()
        return result
    except Exception as e:
        logger.error(f"Credit monitoring failed: {e}")
        return {"error": str(e)}


async def _monitor_credits_async() -> Dict[str, Any]:
    """Async function to monitor FR24 credits"""
    from app.services.flightradar24_api_service import fr24_api_service
    from app.services.alert_service import alert_service

    async with fr24_api_service:
        if not fr24_api_service.credit_manager:
            return {"error": "Credit manager not initialized"}

        stats = await fr24_api_service.credit_manager.get_usage_stats()

        # Log credit usage
        logger.info(
            f"FR24 Credit Usage: {stats['monthly_used']}/{stats['monthly_limit']} "
            f"({stats['monthly_percentage']:.1f}%)"
        )

        # Check credit usage and send alerts
        await alert_service.check_credit_usage(stats)

        # Adjust polling frequency based on credit usage
        if stats["monthly_percentage"] >= 90:
            logger.info("Reducing polling frequency due to high credit usage")
            # Dynamically adjust Celery beat schedule
            from app.workers.celery_app import celery_app

            celery_app.conf.beat_schedule["refresh-tracking-data-peak"][
                "schedule"
            ] = 120.0  # 2 minutes
        elif stats["monthly_percentage"] >= 95:
            # Emergency mode - minimal polling
            from app.workers.celery_app import celery_app

            celery_app.conf.beat_schedule["refresh-tracking-data-peak"][
                "schedule"
            ] = 300.0  # 5 minutes

        return stats


@celery_app.task
def cleanup_old_positions():
    """Clean up old position data to manage database size"""
    db = SessionLocal()
    result = {"positions_deleted": 0, "cutoff_date": None}

    try:
        # Keep position data for last 90 days
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=90)
        result["cutoff_date"] = cutoff_date.isoformat()

        # TODO: Implement position cleanup
        # This would delete old flight positions while keeping
        # flight logs for legal/analysis purposes

        logger.info(f"Would clean up positions older than {cutoff_date}")

    except Exception as e:
        logger.error(f"Error in position cleanup: {e}")
    finally:
        db.close()

    return result
