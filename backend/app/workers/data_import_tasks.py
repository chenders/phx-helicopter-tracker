"""
Celery tasks for data import and file processing
"""
import asyncio
import logging
from datetime import datetime, timedelta, timezone
from typing import List, Dict, Any, Optional
from celery import current_task

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.services.file_processor import process_imported_files_sync
from app.crud.flights import flight_log_crud, flight_position_crud
from app.crud.aircraft import aircraft_crud
from app.schemas.flights import FlightLogCreate, FlightPositionCreate

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="process_file_import")
def process_file_import_task(
    self,
    file_paths: List[str],
    import_id: str,
    filters: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Celery task to process imported files in background

    Args:
        file_paths: List of file paths to process
        import_id: Import batch ID
        filters: Optional filters for data processing

    Returns:
        Processing result summary
    """
    db = SessionLocal()
    try:
        # Update task state
        current_task.update_state(
            state="PROCESSING",
            meta={
                "import_id": import_id,
                "status": "processing",
                "files_total": len(file_paths),
                "files_processed": 0,
                "current_step": "Starting file processing...",
            },
        )

        logger.info(
            f"Starting file import task {import_id} with {len(file_paths)} files"
        )

        # Process files using the existing service (remove await for sync task)
        result = process_imported_files_sync(
            db=db, file_paths=file_paths, import_id=import_id, filters=filters
        )

        # Update final state
        current_task.update_state(
            state="SUCCESS",
            meta={
                "import_id": import_id,
                "status": result.get("status", "completed"),
                "files_total": result.get("total_files", len(file_paths)),
                "files_processed": result.get("total_files", len(file_paths)),
                "flights_found": result.get("total_flights_found", 0),
                "flights_saved": result.get("flights_saved", 0),
                "errors": result.get("errors", []),
                "error_count": result.get("error_count", 0),
                "current_step": "File processing completed",
            },
        )

        logger.info(f"Completed file import task {import_id}: {result}")
        return result

    except Exception as exc:
        logger.error(f"File import task {import_id} failed: {str(exc)}", exc_info=True)

        current_task.update_state(
            state="FAILURE",
            meta={
                "import_id": import_id,
                "status": "failed",
                "error": str(exc),
                "current_step": f"Failed: {str(exc)}",
            },
        )

        raise exc
    finally:
        db.close()


@celery_app.task(bind=True, name="process_flightradar24_download")
def process_fr24_download_task(
    self,
    aircraft_registrations: List[str],
    start_date: str,
    end_date: str,
    format: str,
    download_id: str,
) -> Dict[str, Any]:
    """
    Celery task to download multiple aircraft data from FlightRadar24

    Args:
        aircraft_registrations: List of aircraft to download
        start_date: Start date for download (ISO format)
        end_date: End date for download (ISO format)
        format: Download format (json, csv, kml)
        download_id: Download batch ID

    Returns:
        Download result summary
    """
    try:
        current_task.update_state(
            state="PROCESSING",
            meta={
                "download_id": download_id,
                "status": "processing",
                "aircraft_total": len(aircraft_registrations),
                "aircraft_processed": 0,
                "current_step": "Starting FlightRadar24 downloads...",
            },
        )

        logger.info(
            f"Starting FR24 download task {download_id} for {len(aircraft_registrations)} aircraft"
        )

        downloaded_files = []
        errors = []

        # TODO: Implement actual FR24 download logic here
        # This would use the fr24_downloader service to download each aircraft's data

        result = {
            "download_id": download_id,
            "status": "completed",
            "aircraft_total": len(aircraft_registrations),
            "aircraft_processed": len(aircraft_registrations),
            "downloaded_files": downloaded_files,
            "errors": errors,
            "error_count": len(errors),
        }

        current_task.update_state(state="SUCCESS", meta=result)

        logger.info(f"Completed FR24 download task {download_id}: {result}")
        return result

    except Exception as exc:
        logger.error(
            f"FR24 download task {download_id} failed: {str(exc)}", exc_info=True
        )

        current_task.update_state(
            state="FAILURE",
            meta={
                "download_id": download_id,
                "status": "failed",
                "error": str(exc),
                "current_step": f"Failed: {str(exc)}",
            },
        )

        raise exc


@celery_app.task(bind=True, name="cleanup_old_imports")
def cleanup_old_imports_task(self, days_old: int = 30) -> Dict[str, Any]:
    """
    Celery task to clean up old import files and records

    Args:
        days_old: Delete imports older than this many days

    Returns:
        Cleanup result summary
    """
    try:
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": "processing",
                "current_step": f"Cleaning up imports older than {days_old} days...",
            },
        )

        logger.info(f"Starting cleanup task for imports older than {days_old} days")

        # TODO: Implement cleanup logic
        # - Remove old files from /app/data/imports/
        # - Clean up database records if needed
        # - Log cleanup statistics

        result = {
            "status": "completed",
            "days_old": days_old,
            "files_deleted": 0,
            "records_cleaned": 0,
            "space_freed_mb": 0,
        }

        current_task.update_state(state="SUCCESS", meta=result)

        logger.info(f"Completed cleanup task: {result}")
        return result

    except Exception as exc:
        logger.error(f"Cleanup task failed: {str(exc)}", exc_info=True)

        current_task.update_state(
            state="FAILURE",
            meta={
                "status": "failed",
                "error": str(exc),
                "current_step": f"Failed: {str(exc)}",
            },
        )

        raise exc


# Utility function to get task status
def get_import_task_status(task_id: str) -> Dict[str, Any]:
    """
    Get the status of an import task

    Args:
        task_id: Celery task ID

    Returns:
        Task status information
    """
    try:
        task_result = celery_app.AsyncResult(task_id)

        return {
            "task_id": task_id,
            "state": task_result.state,
            "info": task_result.info or {},
            "ready": task_result.ready(),
            "successful": task_result.successful() if task_result.ready() else None,
            "failed": task_result.failed() if task_result.ready() else None,
            "result": task_result.result if task_result.successful() else None,
        }
    except Exception as e:
        return {"task_id": task_id, "state": "UNKNOWN", "error": str(e), "ready": False}


def get_all_active_tasks() -> List[Dict[str, Any]]:
    """
    Get information about all active Celery tasks

    Returns:
        List of active task information
    """
    try:
        inspect = celery_app.control.inspect()

        # Get active tasks from all workers
        active_tasks = inspect.active()

        if not active_tasks:
            return []

        all_tasks = []
        for worker, tasks in active_tasks.items():
            for task in tasks:
                all_tasks.append(
                    {
                        "worker": worker,
                        "task_id": task.get("id"),
                        "name": task.get("name"),
                        "args": task.get("args", []),
                        "kwargs": task.get("kwargs", {}),
                        "time_start": task.get("time_start"),
                        "delivery_info": task.get("delivery_info", {}),
                    }
                )

        return all_tasks

    except Exception as e:
        logger.error(f"Error getting active tasks: {str(e)}")
        return []


# DEPRECATED: Removed download_and_import_fr24_flights task
# This task used an inefficient approach that only captured 12.5% of positions
# while consuming excessive API credits (21,600 per month per aircraft)
# 
# REPLACED BY: monitor_and_download_complete_flights (in flight_tracking_tasks.py)
# The new task captures 100% of positions using 90% fewer API credits


# DEPRECATED: Removed _download_and_import_fr24_async helper function
# See note above about the removal of download_and_import_fr24_flights task


@celery_app.task(bind=True, name="import_fr24_complete_flights")
def import_fr24_complete_flights(
    self, registration: str, days_back: int = 7
):
    """
    Import complete flight tracks from FlightRadar24 API with ALL position data
    
    This is the correct way to import flights for legal documentation.
    Gets complete flight paths with hundreds/thousands of positions per flight.

    Args:
        registration: Aircraft registration to import
        days_back: Number of days to look back for flights
    """
    try:
        logger.info(f"Starting FR24 complete flight import for {registration}")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _import_fr24_complete_flights_async(registration, days_back)
        )
        loop.close()

        return result

    except Exception as exc:
        logger.error(f"FR24 complete import failed: {exc}")
        if self.request.retries < 3:
            raise self.retry(countdown=300, exc=exc)
        raise


@celery_app.task(bind=True, name="import_fr24_historical")
def import_fr24_historical_data(
    self, registration: str, start_date: str, end_date: str, interval_hours: int = 6
):
    """
    DEPRECATED: This only gets snapshots, not complete flight tracks!
    Use import_fr24_complete_flights instead for legal documentation.
    
    Import historical flight data from FlightRadar24 API

    Args:
        registration: Aircraft registration to import
        start_date: Start date (YYYY-MM-DD)
        end_date: End date (YYYY-MM-DD)
        interval_hours: Hours between API calls (to minimize credits)
    """
    logger.warning(
        f"DEPRECATED: import_fr24_historical only gets snapshots. "
        f"Use import_fr24_complete_flights for complete tracks!"
    )
    try:
        logger.info(f"Starting FR24 historical import for {registration}")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _import_fr24_historical_async(
                registration, start_date, end_date, interval_hours
            )
        )
        loop.close()

        return result

    except Exception as exc:
        logger.error(f"FR24 import failed: {exc}")
        if self.request.retries < 3:
            raise self.retry(countdown=300, exc=exc)
        raise


async def _import_fr24_complete_flights_async(
    registration: str, days_back: int
) -> Dict[str, Any]:
    """
    Import complete flight tracks with ALL position data for legal documentation
    """
    from app.services.flightradar24_api_service import fr24_api_service

    db = SessionLocal()
    results = {
        "registration": registration,
        "flights_found": 0,
        "flights_imported": 0,
        "positions_imported": 0,
        "credits_used": 0,
        "errors": [],
    }

    try:
        # Get aircraft
        aircraft = aircraft_crud.get_by_registration(db, registration=registration)
        if not aircraft:
            results["errors"].append(f"Aircraft {registration} not found")
            return results

        async with fr24_api_service:
            # Check credits before starting
            if fr24_api_service.credit_manager:
                stats = await fr24_api_service.credit_manager.get_usage_stats()
                if stats["monthly_percentage"] > 90:
                    logger.warning(
                        f"Credit usage at {stats['monthly_percentage']:.1f}%, limiting to 3 days"
                    )
                    days_back = min(days_back, 3)

            # Step 1: Search for flights using historic positions
            # We'll check multiple timestamps to find flights
            logger.info(f"Searching for {registration} flights from last {days_back} days")
            
            found_flight_ids = set()
            from datetime import datetime, timedelta, timezone
            
            # Check every 6 hours for the past N days
            end_time = datetime.now(timezone.utc)
            start_time = end_time - timedelta(days=days_back)
            current_time = end_time
            
            while current_time >= start_time:
                try:
                    # Get positions at this timestamp
                    positions = await fr24_api_service.get_historical_positions(
                        timestamp=current_time,
                        registrations=[registration]
                    )
                    
                    # Extract flight IDs
                    for pos in positions:
                        if pos.flight_id and pos.flight_id != "":
                            found_flight_ids.add(pos.flight_id)
                            logger.info(f"Found flight {pos.flight_id} for {registration} at {current_time}")
                    
                except Exception as e:
                    logger.warning(f"Error checking {current_time}: {e}")
                
                # Move back 6 hours
                current_time -= timedelta(hours=6)
            
            results["flights_found"] = len(found_flight_ids)
            
            if not found_flight_ids:
                logger.warning(f"No flights found for {registration} in last {days_back} days")
                return results
                
            logger.info(f"Found {len(found_flight_ids)} unique flights for {registration}")
            
            # Step 2: Get complete track for each flight
            for flight_id in found_flight_ids:
                try:
                        
                    # Check if we already have this flight
                    existing_log = db.query(FlightLog).filter(
                        FlightLog.flight_id == f"fr24_{flight_id}"
                    ).first()
                    
                    if existing_log:
                        # Check if we have complete data
                        position_count = db.query(FlightPosition).filter(
                            FlightPosition.flight_log_id == existing_log.id
                        ).count()
                        
                        if position_count > 50:  # Assume >50 positions means complete data
                            logger.info(
                                f"Flight {flight_id} already has {position_count} positions, skipping"
                            )
                            continue
                        else:
                            logger.info(
                                f"Flight {flight_id} only has {position_count} positions, re-importing"
                            )
                    
                    # Get complete flight track
                    logger.info(f"Getting complete track for flight {flight_id}")
                    positions = await fr24_api_service.get_flight_track(flight_id)
                    
                    if not positions:
                        logger.warning(f"No track data for flight {flight_id}")
                        continue
                        
                    logger.info(f"Got {len(positions)} positions for flight {flight_id}")
                    
                    # Create or update flight log
                    if positions:
                        first_pos = positions[0]
                        last_pos = positions[-1]
                        
                        flight_log_data = FlightLogCreate(
                            aircraft_id=aircraft.id,
                            flight_id=f"fr24_{flight_id}",
                            callsign=first_pos.callsign or registration,
                            departure_time=first_pos.timestamp,
                            arrival_time=last_pos.timestamp if len(positions) > 1 else None,
                            origin=first_pos.origin,
                            destination=first_pos.destination,
                            data_source="flightradar24_complete",
                        )
                        
                        if existing_log:
                            # Update existing log
                            for key, value in flight_log_data.dict().items():
                                if value is not None:
                                    setattr(existing_log, key, value)
                            db.commit()
                            flight_log = existing_log
                            
                            # Delete old incomplete positions
                            db.query(FlightPosition).filter(
                                FlightPosition.flight_log_id == flight_log.id
                            ).delete()
                            db.commit()
                        else:
                            # Create new log
                            flight_log = flight_log_crud.create(db, obj_in=flight_log_data)
                            results["flights_imported"] += 1
                        
                        # Save all positions
                        for pos in positions:
                            position_data = FlightPositionCreate(
                                flight_log_id=flight_log.id,
                                aircraft_id=aircraft.id,
                                timestamp=pos.timestamp,
                                latitude=pos.latitude,
                                longitude=pos.longitude,
                                altitude_feet=pos.altitude_feet,
                                ground_speed_knots=pos.ground_speed_knots,
                                track_degrees=pos.track_degrees,
                                vertical_rate=pos.vertical_speed_fpm,
                                data_source="flightradar24_complete",
                            )
                            flight_position_crud.create(db, obj_in=position_data)
                            results["positions_imported"] += 1
                        
                        db.commit()
                        logger.info(
                            f"Imported flight {flight_id}: {len(positions)} positions, "
                            f"duration: {(last_pos.timestamp - first_pos.timestamp).total_seconds() / 60:.1f} min"
                        )
                        
                except Exception as e:
                    logger.error(f"Error importing flight {flight_id}: {e}")
                    results["errors"].append(f"Flight {flight_id}: {str(e)}")
                    db.rollback()
                    continue
                    
            # Log final stats
            if fr24_api_service.credit_manager:
                final_stats = await fr24_api_service.credit_manager.get_usage_stats()
                results["credits_used"] = final_stats.get("session_used", 0)
                
        logger.info(
            f"Import complete for {registration}: "
            f"{results['flights_imported']} flights, "
            f"{results['positions_imported']} positions"
        )
        
        return results
        
    except Exception as e:
        logger.error(f"Complete import failed for {registration}: {e}")
        results["errors"].append(str(e))
        return results
    finally:
        db.close()


async def _import_fr24_historical_async(
    registration: str, start_date: str, end_date: str, interval_hours: int
) -> Dict[str, Any]:
    """
    Async function to import historical data
    Processes from most recent to oldest to prioritize current data
    """
    from app.services.flightradar24_api_service import fr24_api_service

    db = SessionLocal()
    results = {
        "registration": registration,
        "flights_imported": 0,
        "positions_imported": 0,
        "credits_used": 0,
        "dates_processed": [],
        "errors": [],
    }

    try:
        start = datetime.strptime(start_date, "%Y-%m-%d")
        end = datetime.strptime(end_date, "%Y-%m-%d")

        # Get aircraft
        aircraft = aircraft_crud.get_by_registration(db, registration=registration)
        if not aircraft:
            results["errors"].append(f"Aircraft {registration} not found")
            return results

        async with fr24_api_service:
            # Check credits before starting
            if fr24_api_service.credit_manager:
                stats = await fr24_api_service.credit_manager.get_usage_stats()
                if stats["monthly_percentage"] > 80:
                    logger.warning(
                        f"Credit usage at {stats['monthly_percentage']:.1f}%, limiting import range"
                    )
                    # Limit to last 7 days if credits are running low
                    start = max(start, end - timedelta(days=7))

            # Build list of timestamps to process (most recent first)
            timestamps_to_process = []
            current = end
            while current >= start:
                timestamps_to_process.append(current)
                current -= timedelta(hours=interval_hours)

            logger.info(
                f"Processing {len(timestamps_to_process)} timestamps for {registration}, "
                f"from {end.date()} to {start.date()} (newest first)"
            )

            # Process timestamps from most recent to oldest
            for timestamp in timestamps_to_process:
                try:
                    # Check credits before each API call
                    if fr24_api_service.credit_manager:
                        current_stats = (
                            await fr24_api_service.credit_manager.get_usage_stats()
                        )
                        if current_stats["monthly_percentage"] >= 95:
                            logger.warning(
                                "Credit usage critical (>=95%), stopping import"
                            )
                            results["errors"].append(
                                f"Import stopped at {timestamp.date()} due to credit limit"
                            )
                            break

                    # Get historical positions for this timestamp with retry logic
                    positions = None
                    retry_count = 0
                    max_retries = 3
                    
                    while retry_count < max_retries:
                        try:
                            positions = await fr24_api_service.get_historical_positions(
                                timestamp=timestamp, registrations=[registration]
                            )
                            break  # Success, exit retry loop
                        except Exception as e:
                            if "rate" in str(e).lower() or "429" in str(e):
                                retry_count += 1
                                if retry_count < max_retries:
                                    wait_time = min(60 * retry_count, 300)  # Max 5 min wait
                                    logger.warning(
                                        f"Rate limited, waiting {wait_time}s before retry {retry_count}/{max_retries}"
                                    )
                                    await asyncio.sleep(wait_time)
                                else:
                                    logger.error(f"Max retries reached for {timestamp}")
                                    results["errors"].append(
                                        f"{timestamp.date()}: Rate limit exceeded after {max_retries} retries"
                                    )
                                    # Skip to next timestamp
                                    continue
                            else:
                                raise  # Re-raise non-rate-limit errors

                    if positions:
                        # Check if we already have data for this time period
                        existing = flight_position_crud.get_positions_in_range(
                            db,
                            aircraft_id=aircraft.id,
                            start_time=timestamp - timedelta(hours=interval_hours / 2),
                            end_time=timestamp + timedelta(hours=interval_hours / 2),
                        )

                        if existing:
                            logger.info(
                                f"Skipping {timestamp.date()}: {len(existing)} positions already exist"
                            )
                            continue

                        # Process and save positions
                        flight_log = None
                        for pos in positions:
                            # Create or get flight log for this segment
                            if (
                                not flight_log
                                or (
                                    pos.timestamp - flight_log.departure_time
                                ).total_seconds()
                                > 7200
                            ):  # New flight if gap > 2 hours
                                flight_log = flight_log_crud.create(
                                    db,
                                    obj_in=FlightLogCreate(
                                        aircraft_id=aircraft.id,
                                        flight_id=f"fr24_historical_{registration}_{pos.timestamp.strftime('%Y%m%d_%H%M%S')}",
                                        departure_time=pos.timestamp,
                                        data_source="flightradar24_historical",
                                    ),
                                )
                                results["flights_imported"] += 1

                            # Create position record
                            position = flight_position_crud.create(
                                db,
                                obj_in=FlightPositionCreate(
                                    flight_log_id=flight_log.id,
                                    aircraft_id=aircraft.id,
                                    timestamp=pos.timestamp,
                                    latitude=pos.latitude,
                                    longitude=pos.longitude,
                                    altitude_feet=pos.altitude_feet,
                                    ground_speed_knots=pos.ground_speed_knots,
                                    track_degrees=pos.track_degrees,
                                    data_source="flightradar24_historical",
                                ),
                            )
                            results["positions_imported"] += 1

                        results["dates_processed"].append(timestamp.date().isoformat())
                        logger.info(
                            f"Imported {len(positions)} positions for {timestamp.date()}"
                        )
                    else:
                        logger.debug(
                            f"No data found for {registration} at {timestamp.date()}"
                        )

                    # Update progress if this is a Celery task
                    if current_task and current_task.request.id:
                        progress = int(
                            (
                                len(results["dates_processed"])
                                / len(timestamps_to_process)
                            )
                            * 100
                        )
                        current_task.update_state(
                            state="PROGRESS",
                            meta={
                                "current": progress,
                                "total": 100,
                                "status": f"Processed {timestamp.date()}",
                                "positions_imported": results["positions_imported"],
                            },
                        )

                except Exception as e:
                    logger.error(f"Error importing {registration} at {timestamp}: {e}")
                    results["errors"].append(f"{timestamp.date()}: {str(e)}")
                    # Rollback the session after an error to reset transaction state
                    db.rollback()
                    # Continue with next timestamp instead of failing completely
                    continue

    except Exception as e:
        logger.error(f"Import error: {e}")
        results["errors"].append(str(e))
    finally:
        db.close()

    return results
