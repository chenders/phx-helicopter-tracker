"""
Celery tasks for discovering historical flights and downloading their complete tracks
"""
import logging
import asyncio
from datetime import datetime, timezone
from typing import Dict, Any, List
from celery import current_task

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.flight_discoveries import FlightDiscovery
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition  # Use PostGIS-enabled model
from app.models.aircraft import Aircraft
from app.services.flightradar24_api_service import fr24_api_service
from app.schemas.flights import FlightLogCreate, FlightPositionCreate
from app.services.elevation_service import elevation_service
from app.crud.flights import flight_log_crud, flight_position_crud
from app.crud.aircraft import aircraft_crud

logger = logging.getLogger(__name__)

# Phoenix PD helicopter registrations
PHOENIX_PD_REGISTRATIONS = ["N621FB", "N622FB", "N623FB", "N624FB", "N625FB"]


@celery_app.task(bind=True, name="download_full_historical_data")
def download_full_historical_data(self, days_back: int = 730) -> Dict[str, Any]:
    """
    Download full 2-year historical data for all Phoenix PD helicopters
    FR24 allows up to 730 days of historical data

    Args:
        days_back: Number of days to go back (default 730 = 2 years)
    """
    try:
        logger.info(f"Starting full historical download for {days_back} days")

        results = {
            "total_registrations": len(PHOENIX_PD_REGISTRATIONS),
            "days_requested": days_back,
            "registrations_processed": [],
            "total_flights_discovered": 0,
            "errors": [],
        }

        # Process each registration
        for registration in PHOENIX_PD_REGISTRATIONS:
            try:
                logger.info(f"Processing {registration}...")

                # Calculate date range
                from datetime import datetime, timedelta, timezone

                end_date = datetime.now(timezone.utc)
                start_date = end_date - timedelta(days=days_back)

                # FR24 has 14-day pagination limit, so we need to split into chunks
                chunk_results = []
                current_start = start_date

                while current_start < end_date:
                    current_end = min(current_start + timedelta(days=14), end_date)

                    logger.info(
                        f"  Discovering flights for {registration}: {current_start.date()} to {current_end.date()}"
                    )

                    # Use existing discover task for each chunk
                    result = discover_flights_for_registration(
                        registration=registration,
                        max_pages=100,  # High limit to get all flights
                        start_date=current_start.isoformat(),
                        end_date=current_end.isoformat(),
                    )

                    chunk_results.append(result)
                    logger.info(
                        f"    Discovered {result.get('flights_new', 0)} new flights"
                    )

                    # Move to next chunk
                    current_start = current_end

                # Aggregate results for this registration
                reg_summary = {
                    "registration": registration,
                    "total_discovered": sum(
                        r.get("flights_discovered", 0) for r in chunk_results
                    ),
                    "total_new": sum(r.get("flights_new", 0) for r in chunk_results),
                    "chunks_processed": len(chunk_results),
                }

                results["registrations_processed"].append(reg_summary)
                results["total_flights_discovered"] += reg_summary["total_new"]

                logger.info(
                    f"  Completed {registration}: {reg_summary['total_new']} new flights"
                )

            except Exception as exc:
                error_msg = f"Error processing {registration}: {exc}"
                logger.error(error_msg)
                results["errors"].append(error_msg)
                continue

        logger.info(
            f"Full historical download complete: {results['total_flights_discovered']} total new flights discovered"
        )
        return results

    except Exception as exc:
        logger.error(f"Full historical download failed: {exc}")
        if self.request.retries < 2:
            raise self.retry(countdown=600, exc=exc)
        raise


@celery_app.task(bind=True, name="discover_flights_for_registration")
def discover_flights_for_registration(
    self,
    registration: str,
    max_pages: int = 10,
    start_date: str = None,
    end_date: str = None,
) -> Dict[str, Any]:
    """
    Discover all historical flights for a specific registration
    Optional date range parameters for specific period discovery
    """
    try:
        logger.info(f"Starting flight discovery for {registration}")
        if start_date and end_date:
            logger.info(f"Date range: {start_date} to {end_date}")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(
            _discover_flights_async(registration, max_pages, start_date, end_date)
        )
        loop.close()

        return result

    except Exception as exc:
        logger.error(f"Flight discovery failed for {registration}: {exc}")
        if self.request.retries < 3:
            raise self.retry(countdown=300, exc=exc)
        raise


async def _discover_flights_async(
    registration: str, max_pages: int, start_date: str = None, end_date: str = None
) -> Dict[str, Any]:
    """
    Async function to discover flights
    """
    db = SessionLocal()
    results = {
        "registration": registration,
        "flights_discovered": 0,
        "flights_new": 0,
        "flights_existing": 0,
        "pages_processed": 0,
        "date_range": f"{start_date} to {end_date}" if start_date else "last 14 days",
        "errors": [],
    }

    try:
        async with fr24_api_service:
            page = 1

            while page <= max_pages:
                try:
                    # Get flight summary page
                    logger.info(
                        f"Getting flight summary for {registration}, page {page}"
                    )
                    if start_date and end_date:
                        start_dt = datetime.fromisoformat(
                            start_date.replace("Z", "+00:00")
                        )
                        end_dt = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
                        data = await fr24_api_service.get_flight_summary(
                            registration, page, start_date=start_dt, end_date=end_dt
                        )
                    else:
                        data = await fr24_api_service.get_flight_summary(
                            registration, page
                        )
                    flights = data.get("data", [])

                    if not flights:
                        logger.info(
                            f"No more flights found for {registration} at page {page}"
                        )
                        break

                    logger.info(f"Found {len(flights)} flights on page {page}")

                    # Process each flight
                    for flight_data in flights:
                        fr24_id = flight_data.get("fr24_id")
                        if not fr24_id:
                            continue

                        results["flights_discovered"] += 1

                        # Check if we already have this flight discovered
                        existing = (
                            db.query(FlightDiscovery)
                            .filter(FlightDiscovery.fr24_id == fr24_id)
                            .first()
                        )

                        if existing:
                            results["flights_existing"] += 1
                            logger.debug(f"Flight {fr24_id} already discovered")
                            continue

                        # Parse dates
                        departure_time = None
                        arrival_time = None
                        first_seen = None
                        last_seen = None

                        if flight_data.get("datetime_takeoff"):
                            departure_time = datetime.fromisoformat(
                                flight_data["datetime_takeoff"].replace("Z", "+00:00")
                            )
                        if flight_data.get("datetime_landed"):
                            arrival_time = datetime.fromisoformat(
                                flight_data["datetime_landed"].replace("Z", "+00:00")
                            )
                        if flight_data.get("first_seen"):
                            first_seen = datetime.fromisoformat(
                                flight_data["first_seen"].replace("Z", "+00:00")
                            )
                        if flight_data.get("last_seen"):
                            last_seen = datetime.fromisoformat(
                                flight_data["last_seen"].replace("Z", "+00:00")
                            )

                        # Calculate duration
                        duration = None
                        if departure_time and arrival_time:
                            duration = (
                                arrival_time - departure_time
                            ).total_seconds() / 60

                        # Create discovery record
                        discovery = FlightDiscovery(
                            fr24_id=fr24_id,
                            registration=flight_data.get("reg", registration),
                            callsign=flight_data.get("callsign"),
                            aircraft_type=flight_data.get("type"),
                            hex_code=flight_data.get("hex"),
                            departure_time=departure_time,
                            arrival_time=arrival_time,
                            origin_airport=flight_data.get("orig_icao"),
                            destination_airport=flight_data.get("dest_icao"),
                            flight_duration_minutes=duration,
                            first_seen=first_seen,
                            last_seen=last_seen,
                            track_downloaded=False,
                        )

                        db.add(discovery)
                        results["flights_new"] += 1
                        logger.info(
                            f"Discovered new flight: {fr24_id} ({registration})"
                        )

                    db.commit()
                    results["pages_processed"] += 1

                    # Check if we got a full page (more pages might exist)
                    if len(flights) < 100:
                        logger.info(
                            f"Last page reached for {registration} (only {len(flights)} flights)"
                        )
                        break

                    page += 1

                    # Rate limit between pages
                    await asyncio.sleep(2)

                except Exception as e:
                    logger.error(
                        f"Error processing page {page} for {registration}: {e}"
                    )
                    results["errors"].append(f"Page {page}: {str(e)}")
                    db.rollback()
                    # Continue to next page even if one fails
                    page += 1
                    await asyncio.sleep(5)  # Longer wait after error

    except Exception as e:
        logger.error(f"Discovery failed for {registration}: {e}")
        results["errors"].append(str(e))
    finally:
        db.close()

    logger.info(
        f"Discovery complete for {registration}: {results['flights_new']} new, "
        f"{results['flights_existing']} existing"
    )

    return results


@celery_app.task(bind=True, name="discover_all_phoenix_pd_flights")
def discover_all_phoenix_pd_flights(self) -> Dict[str, Any]:
    """
    Discover flights for all Phoenix PD helicopters
    """
    import asyncio

    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "registrations_processed": [],
        "total_flights_discovered": 0,
        "total_flights_new": 0,
        "errors": [],
    }

    for registration in PHOENIX_PD_REGISTRATIONS:
        try:
            logger.info(f"Processing {registration}")

            # Update task state
            if current_task:
                current_task.update_state(
                    state="PROGRESS",
                    meta={
                        "current_registration": registration,
                        "progress": f"{len(results['registrations_processed'])}/{len(PHOENIX_PD_REGISTRATIONS)}",
                    },
                )

            # Discover flights for this registration
            # Call the underlying async function directly
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            discovery_result = loop.run_until_complete(
                _discover_flights_async(registration, 10, None, None)
            )
            loop.close()

            results["registrations_processed"].append(registration)
            results["total_flights_discovered"] += discovery_result.get(
                "flights_discovered", 0
            )
            results["total_flights_new"] += discovery_result.get("flights_new", 0)

            if discovery_result.get("errors"):
                results["errors"].extend(
                    [f"{registration}: {err}" for err in discovery_result["errors"]]
                )

        except Exception as e:
            logger.error(f"Failed to process {registration}: {e}")
            results["errors"].append(f"{registration}: {str(e)}")

    logger.info(
        f"Discovery complete for all Phoenix PD: "
        f"{results['total_flights_new']} new flights discovered"
    )

    return results


@celery_app.task(bind=True, name="discover_full_year_for_registration")
def discover_full_year_for_registration(
    self, registration: str, days_back: int = 365
) -> Dict[str, Any]:
    """
    Discover all flights for a registration for the past year
    Processes in 14-day chunks to stay within API limits
    """
    from datetime import datetime, timedelta, timezone
    import asyncio

    results = {
        "registration": registration,
        "total_flights_discovered": 0,
        "total_flights_new": 0,
        "chunks_processed": 0,
        "date_ranges": [],
        "errors": [],
    }

    try:
        # Calculate date ranges in 14-day chunks
        end_date = datetime.now(timezone.utc)
        current_end = end_date
        chunk_size_days = 14

        logger.info(
            f"Starting full year discovery for {registration}, going back {days_back} days"
        )

        while current_end > end_date - timedelta(days=days_back):
            current_start = current_end - timedelta(days=chunk_size_days)

            # Don't go further back than requested
            if current_start < end_date - timedelta(days=days_back):
                current_start = end_date - timedelta(days=days_back)

            # Format dates for API
            start_str = current_start.strftime("%Y-%m-%dT%H:%M:%SZ")
            end_str = current_end.strftime("%Y-%m-%dT%H:%M:%SZ")

            logger.info(
                f"Processing chunk: {current_start.date()} to {current_end.date()}"
            )

            # Update task state
            if current_task:
                chunks_total = days_back // chunk_size_days + 1
                current_task.update_state(
                    state="PROGRESS",
                    meta={
                        "registration": registration,
                        "current_range": f"{current_start.date()} to {current_end.date()}",
                        "chunks_progress": f"{results['chunks_processed']}/{chunks_total}",
                    },
                )

            try:
                # Discover flights for this date range
                # Call the underlying async function directly
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                chunk_result = loop.run_until_complete(
                    _discover_flights_async(registration, 10, start_str, end_str)
                )
                loop.close()

                results["chunks_processed"] += 1
                results["total_flights_discovered"] += chunk_result.get(
                    "flights_discovered", 0
                )
                results["total_flights_new"] += chunk_result.get("flights_new", 0)
                results["date_ranges"].append(
                    {
                        "start": current_start.isoformat(),
                        "end": current_end.isoformat(),
                        "flights_discovered": chunk_result.get("flights_discovered", 0),
                        "flights_new": chunk_result.get("flights_new", 0),
                    }
                )

                if chunk_result.get("errors"):
                    results["errors"].extend(chunk_result["errors"])

                # Wait between chunks to avoid rate limits
                import time

                time.sleep(5)

            except Exception as e:
                logger.error(
                    f"Failed to process chunk {current_start.date()} to {current_end.date()}: {e}"
                )
                results["errors"].append(
                    f"Chunk {current_start.date()} to {current_end.date()}: {str(e)}"
                )

            # Move to next chunk
            current_end = current_start

        logger.info(
            f"Full year discovery complete for {registration}: "
            f"{results['total_flights_new']} new flights, "
            f"{results['chunks_processed']} chunks processed"
        )

    except Exception as e:
        logger.error(f"Full year discovery failed for {registration}: {e}")
        results["errors"].append(str(e))

    return results


@celery_app.task(bind=True, name="discover_full_year_all_phoenix_pd")
def discover_full_year_all_phoenix_pd(self, days_back: int = 365) -> Dict[str, Any]:
    """
    Discover all flights for all Phoenix PD helicopters for the past year
    """
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "registrations_processed": [],
        "total_flights_discovered": 0,
        "total_flights_new": 0,
        "total_chunks": 0,
        "errors": [],
    }

    for registration in PHOENIX_PD_REGISTRATIONS:
        try:
            logger.info(f"Processing full year for {registration}")

            # Update task state
            if current_task:
                current_task.update_state(
                    state="PROGRESS",
                    meta={
                        "current_registration": registration,
                        "progress": f"{len(results['registrations_processed'])}/{len(PHOENIX_PD_REGISTRATIONS)}",
                    },
                )

            # Discover flights for this registration
            # Call the function directly (not as a task)
            discovery_result = discover_full_year_for_registration.run(
                registration=registration, days_back=days_back
            )

            results["registrations_processed"].append(registration)
            results["total_flights_discovered"] += discovery_result.get(
                "total_flights_discovered", 0
            )
            results["total_flights_new"] += discovery_result.get("total_flights_new", 0)
            results["total_chunks"] += discovery_result.get("chunks_processed", 0)

            if discovery_result.get("errors"):
                results["errors"].extend(
                    [f"{registration}: {err}" for err in discovery_result["errors"]]
                )

            # Wait between registrations to avoid rate limits
            import time

            time.sleep(10)

        except Exception as e:
            logger.error(f"Failed to process full year for {registration}: {e}")
            results["errors"].append(f"{registration}: {str(e)}")

    logger.info(
        f"Full year discovery complete for all Phoenix PD: "
        f"{results['total_flights_new']} new flights discovered across "
        f"{results['total_chunks']} chunks"
    )

    return results


@celery_app.task(bind=True, name="download_tracks_for_discovered_flights")
def download_tracks_for_discovered_flights(self, batch_size: int = 5) -> Dict[str, Any]:
    """
    Download complete tracks for discovered flights that haven't been processed yet
    """
    try:
        logger.info(f"Starting track download for batch of {batch_size} flights")

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(_download_tracks_async(batch_size))
        loop.close()

        return result

    except Exception as exc:
        logger.error(f"Track download failed: {exc}")
        if self.request.retries < 3:
            raise self.retry(countdown=300, exc=exc)
        raise


async def _download_tracks_async(batch_size: int) -> Dict[str, Any]:
    """
    Async function to download tracks
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "flights_processed": 0,
        "tracks_downloaded": 0,
        "total_positions": 0,
        "errors": [],
    }

    try:
        # Get unprocessed flights
        unprocessed_flights = (
            db.query(FlightDiscovery)
            .filter(
                FlightDiscovery.track_downloaded == False,
                FlightDiscovery.track_download_attempted_at.is_(None),
            )
            .order_by(
                FlightDiscovery.departure_time.desc()  # Prioritize recent flights
            )
            .limit(batch_size)
            .all()
        )

        if not unprocessed_flights:
            logger.info("No unprocessed flights to download")
            return results

        logger.info(f"Found {len(unprocessed_flights)} flights to process")

        async with fr24_api_service:
            for flight in unprocessed_flights:
                try:
                    logger.info(
                        f"Downloading track for {flight.fr24_id} ({flight.registration})"
                    )

                    # Mark as attempted
                    flight.track_download_attempted_at = datetime.now(timezone.utc)
                    db.commit()

                    # Download complete track
                    positions = await fr24_api_service.get_flight_track(flight.fr24_id)

                    if not positions:
                        logger.warning(f"No track data for {flight.fr24_id}")
                        flight.track_download_error = "No track data available"
                        db.commit()
                        continue

                    logger.info(f"Got {len(positions)} positions for {flight.fr24_id}")

                    # Get or create aircraft
                    aircraft = aircraft_crud.get_by_registration(
                        db, registration=flight.registration
                    )
                    if not aircraft:
                        # Create aircraft record
                        from app.schemas.aircraft import AircraftCreate

                        aircraft = aircraft_crud.create(
                            db,
                            obj_in=AircraftCreate(
                                registration=flight.registration,
                                is_phoenix_pd=flight.registration
                                in PHOENIX_PD_REGISTRATIONS,
                                operator="Phoenix Police Department"
                                if flight.registration in PHOENIX_PD_REGISTRATIONS
                                else None,
                                model=flight.aircraft_type,
                            ),
                        )

                    # Check if flight log already exists
                    existing_log = (
                        db.query(FlightLog)
                        .filter(
                            FlightLog.flight_id == f"fr24_complete_{flight.fr24_id}"
                        )
                        .first()
                    )

                    if existing_log:
                        # Check if positions already exist for this flight
                        existing_positions_count = (
                            db.query(FlightPosition)
                            .filter(FlightPosition.flight_log_id == existing_log.id)
                            .count()
                        )

                        if existing_positions_count > 0:
                            logger.info(
                                f"Flight {flight.fr24_id} already has {existing_positions_count} positions, skipping"
                            )
                            flight.track_downloaded = True
                            flight.positions_count = existing_positions_count
                            db.commit()
                            continue
                        else:
                            logger.info(
                                f"Flight {flight.fr24_id} exists but has no positions, will add them"
                            )
                            flight_log = existing_log
                    else:
                        # Create flight log only if it doesn't exist
                        flight_log = flight_log_crud.create(
                            db,
                            obj_in=FlightLogCreate(
                                aircraft_id=aircraft.id,
                                flight_id=f"fr24_complete_{flight.fr24_id}",
                                callsign=flight.callsign or flight.registration,
                                departure_time=flight.departure_time
                                or positions[0].timestamp,
                                arrival_time=flight.arrival_time
                                or positions[-1].timestamp,
                                flight_duration_minutes=flight.flight_duration_minutes,
                                departure_airport=flight.origin_airport,
                                arrival_airport=flight.destination_airport,
                                data_source="flightradar24_complete",
                            ),
                        )

                    # Get elevations for all positions in batch for efficiency
                    coordinates = [(pos.latitude, pos.longitude) for pos in positions]

                    # Initialize elevation service and get elevations
                    # Close any existing connections first to avoid event loop issues in forked workers
                    try:
                        await elevation_service.close()
                    except:
                        pass  # Ignore errors closing stale connections

                    await elevation_service.initialize()
                    elevations = await elevation_service.get_elevations_batch(
                        coordinates
                    )

                    # Close connections after batch to avoid event loop issues
                    await elevation_service.close()

                    # Variables to track altitude stats (both MSL and AGL)
                    agl_altitudes = []
                    msl_altitudes = []

                    # Save all positions
                    for pos in positions:
                        # Track MSL altitude for stats
                        if pos.altitude_feet is not None:
                            msl_altitudes.append(pos.altitude_feet)

                        # Get elevation for this position
                        ground_elevation = elevations.get((pos.latitude, pos.longitude))

                        # Calculate AGL if we have both MSL altitude and ground elevation
                        altitude_agl = None
                        if (
                            pos.altitude_feet is not None
                            and ground_elevation is not None
                        ):
                            altitude_agl = elevation_service.calculate_agl(
                                pos.altitude_feet, ground_elevation
                            )
                            if altitude_agl is not None:
                                agl_altitudes.append(altitude_agl)

                        position_data = FlightPositionCreate(
                            flight_log_id=flight_log.id,
                            aircraft_id=aircraft.id,
                            timestamp=pos.timestamp,
                            latitude=pos.latitude,
                            longitude=pos.longitude,
                            altitude_feet=pos.altitude_feet,
                            ground_elevation_feet=ground_elevation,
                            altitude_agl_feet=altitude_agl,
                            ground_speed_knots=pos.ground_speed_knots,
                            track_degrees=pos.track_degrees,
                            vertical_rate=pos.vertical_speed_fpm,
                            data_source="flightradar24_complete",
                        )
                        flight_position_crud.create(db, obj_in=position_data)

                    # Update flight log with altitude statistics
                    # MSL (Mean Sea Level) altitudes - primary display values
                    if msl_altitudes:
                        flight_log.min_altitude_feet = min(msl_altitudes)
                        flight_log.max_altitude_feet = max(msl_altitudes)
                        flight_log.avg_altitude_feet = int(
                            sum(msl_altitudes) / len(msl_altitudes)
                        )

                    # AGL (Above Ground Level) altitudes - additional context
                    if agl_altitudes:
                        flight_log.min_altitude_agl_feet = min(agl_altitudes)
                        flight_log.max_altitude_agl_feet = max(agl_altitudes)
                        flight_log.avg_altitude_agl_feet = int(
                            sum(agl_altitudes) / len(agl_altitudes)
                        )

                    db.commit()

                    # Update discovery record
                    flight.track_downloaded = True
                    flight.positions_count = len(positions)
                    db.commit()

                    results["tracks_downloaded"] += 1
                    results["total_positions"] += len(positions)

                    logger.info(
                        f"Successfully downloaded {len(positions)} positions for {flight.fr24_id}"
                    )

                except Exception as e:
                    logger.error(f"Error downloading track for {flight.fr24_id}: {e}")
                    flight.track_download_error = str(e)[:500]  # Truncate error message
                    db.commit()
                    results["errors"].append(f"{flight.fr24_id}: {str(e)}")

                results["flights_processed"] += 1

                # Rate limit between downloads
                await asyncio.sleep(2)

    except Exception as e:
        logger.error(f"Track download batch failed: {e}")
        results["errors"].append(str(e))
    finally:
        db.close()

    logger.info(
        f"Track download complete: {results['tracks_downloaded']} tracks, "
        f"{results['total_positions']} positions"
    )

    return results
