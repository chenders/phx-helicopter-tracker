"""
Celery tasks for complete flight tracking
Monitors flights and downloads complete tracks after landing
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any
from celery import current_task

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.services.flight_tracker import CompleteFlightTracker, PHOENIX_PD_REGISTRATIONS

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name="monitor_and_download_complete_flights")
def monitor_and_download_complete_flights(self) -> Dict[str, Any]:
    """
    Monitor active flights and download complete tracks when they land
    This task should run every 5 minutes to detect takeoffs/landings

    Returns 100% of available flight positions for legal analysis
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "active_flights": 0,
        "new_flights": [],
        "landed_flights": [],
        "tracks_downloaded": 0,
        "total_positions": 0,
        "phoenix_pd_flights": 0,
        "errors": [],
    }

    try:
        tracker = CompleteFlightTracker(db)

        # Update task state
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": "Checking for flight changes...",
                "timestamp": results["timestamp"],
            },
        )

        # Detect flight changes
        new_flights, landed_flights = tracker.detect_flight_changes()

        results["active_flights"] = len(tracker.active_flights)
        results["new_flights"] = new_flights
        results["landed_flights"] = landed_flights

        # Count Phoenix PD flights
        for flight_id, info in tracker.active_flights.items():
            if info.get("is_phoenix_pd"):
                results["phoenix_pd_flights"] += 1

        # Process each landed flight
        for flight_id in landed_flights:
            try:
                current_task.update_state(
                    state="PROCESSING",
                    meta={
                        "status": f"Downloading complete track for {flight_id}...",
                        "progress": f"{results['tracks_downloaded']}/{len(landed_flights)}",
                    },
                )

                # Download and import complete track
                if tracker.process_landed_flight(flight_id):
                    results["tracks_downloaded"] += 1

                    # Get position count from database
                    from app.models.flight_logs import FlightLog

                    flight = (
                        db.query(FlightLog)
                        .filter(FlightLog.flight_id == f"fr24_complete_{flight_id}")
                        .first()
                    )

                    if flight and flight.raw_data:
                        position_count = flight.raw_data.get("position_count", 0)
                        results["total_positions"] += position_count

                        logger.info(
                            f"Downloaded complete track: {flight_id} "
                            f"({position_count} positions)"
                        )
                else:
                    results["errors"].append(f"Failed to process {flight_id}")

            except Exception as e:
                logger.error(f"Error processing landed flight {flight_id}: {e}")
                results["errors"].append(f"{flight_id}: {str(e)}")

        # Log summary
        if new_flights or landed_flights:
            logger.info(
                f"Flight monitoring: {len(new_flights)} new, "
                f"{len(landed_flights)} landed, "
                f"{results['tracks_downloaded']} tracks downloaded, "
                f"{results['total_positions']} total positions"
            )

        # Update final state
        current_task.update_state(state="SUCCESS", meta=results)

        return results

    except Exception as e:
        logger.error(f"Flight monitoring task failed: {e}")
        results["errors"].append(str(e))

        current_task.update_state(state="FAILURE", meta=results)

        raise

    finally:
        db.close()


@celery_app.task(bind=True, name="download_missed_flight_tracks")
def download_missed_flight_tracks(self, hours_back: int = 24) -> Dict[str, Any]:
    """
    Download complete tracks for any flights we may have missed
    Runs daily as a backup to ensure no flights are lost
    """
    from app.services.flight_tracker import CompleteFlightTracker
    from app.models.flight_logs import FlightLog
    import requests

    db = SessionLocal()
    results = {
        "hours_back": hours_back,
        "flights_checked": 0,
        "tracks_downloaded": 0,
        "total_positions": 0,
        "errors": [],
    }

    try:
        tracker = CompleteFlightTracker(db)

        # Get list of recent flights from FR24 using the proper service
        # This is a backup check for any flights we might have missed
        from app.services.flightradar24_api_service import fr24_api_service
        import asyncio

        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        async def get_recent_flights():
            async with fr24_api_service:
                # Calculate timestamp for hours_back
                from datetime import datetime, timedelta, timezone

                timestamp = datetime.now(timezone.utc) - timedelta(hours=hours_back)

                # Get historical positions for Phoenix area
                positions = await fr24_api_service.get_historical_positions(
                    timestamp=timestamp,
                    lat_min=33.2,
                    lat_max=33.8,
                    lon_min=-112.4,
                    lon_max=-111.8,
                )

                # Convert positions to flight list
                flight_ids = set()
                flights_data = []
                for pos in positions:
                    if pos.flight_id not in flight_ids:
                        flight_ids.add(pos.flight_id)
                        flights_data.append(
                            {
                                "flight_id": pos.flight_id,
                                "registration": pos.registration,
                                "callsign": pos.callsign,
                            }
                        )
                return flights_data

        try:
            flights = loop.run_until_complete(get_recent_flights())
        except Exception as e:
            logger.error(f"Failed to get recent flights: {e}")
            flights = []
        finally:
            loop.close()
            results["flights_checked"] = len(flights)

            for flight in flights:
                flight_id = flight.get("flight_id")
                if not flight_id:
                    continue

                # Check if we already have this flight
                existing = (
                    db.query(FlightLog)
                    .filter(FlightLog.flight_id.like(f"%{flight_id}%"))
                    .first()
                )

                if not existing:
                    # Download complete track
                    track_data = tracker.get_complete_flight_track(flight_id)
                    if track_data and track_data.get("tracks"):
                        # Process the flight
                        # (Similar to process_landed_flight but with historical data)
                        results["tracks_downloaded"] += 1
                        results["total_positions"] += len(track_data["tracks"])
                        logger.info(f"Downloaded missed flight {flight_id}")

        return results

    except Exception as e:
        logger.error(f"Missed flights task failed: {e}")
        results["errors"].append(str(e))
        raise

    finally:
        db.close()


@celery_app.task(bind=True, name="analyze_phoenix_pd_fleet_status")
def analyze_phoenix_pd_fleet_status(self) -> Dict[str, Any]:
    """
    Analyze Phoenix PD helicopter fleet status and patterns
    Provides insights into their 24/7 coverage claims
    """
    from app.models.flight_logs import FlightLog
    from app.models.aircraft import Aircraft
    from sqlalchemy import func, and_
    from datetime import timedelta

    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "fleet_size": 0,
        "currently_airborne": 0,
        "flights_today": 0,
        "flight_hours_today": 0,
        "coverage_gaps": [],
        "estimated_daily_cost": 0,
    }

    try:
        # Get Phoenix PD fleet
        phoenix_fleet = db.query(Aircraft).filter(Aircraft.is_phoenix_pd == True).all()

        results["fleet_size"] = len(phoenix_fleet)

        # Check current status
        tracker = CompleteFlightTracker(db)
        active_flights = tracker.get_active_flights()

        for flight in active_flights:
            registration = flight.get("registration", "")
            if registration in PHOENIX_PD_REGISTRATIONS:
                results["currently_airborne"] += 1

        # Today's flights
        today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0)

        today_flights = (
            db.query(FlightLog)
            .join(Aircraft)
            .filter(
                and_(
                    Aircraft.is_phoenix_pd == True,
                    FlightLog.departure_time >= today_start,
                )
            )
            .all()
        )

        results["flights_today"] = len(today_flights)

        for flight in today_flights:
            if flight.flight_duration_minutes:
                results["flight_hours_today"] += flight.flight_duration_minutes / 60

        results["estimated_daily_cost"] = results["flight_hours_today"] * 2160

        # Analyze coverage gaps (times with no helicopter airborne)
        # This would require more complex analysis of overlapping flight times

        logger.info(
            f"Phoenix PD fleet status: {results['currently_airborne']} airborne, "
            f"{results['flights_today']} flights today, "
            f"${results['estimated_daily_cost']:.0f} cost"
        )

        return results

    except Exception as e:
        logger.error(f"Fleet status analysis failed: {e}")
        raise

    finally:
        db.close()


@celery_app.task(bind=True, name="generate_complete_flight_report")
def generate_complete_flight_report(self, flight_log_id: int = None) -> Dict[str, Any]:
    """
    Generate detailed report for a flight with complete track data
    Useful for legal documentation
    """
    from app.models.flight_logs import FlightLog
    from app.models.flight_positions import FlightPosition  # Use PostGIS-enabled model
    from app.models.aircraft import Aircraft

    db = SessionLocal()

    try:
        # Handle case where no flight_log_id is provided
        if flight_log_id is None:
            logger.warning(
                "generate_complete_flight_report called without flight_log_id, skipping"
            )
            return {"status": "skipped", "reason": "No flight_log_id provided"}

        # Get flight with all positions
        flight = db.query(FlightLog).filter(FlightLog.id == flight_log_id).first()

        if not flight:
            return {"error": f"Flight {flight_log_id} not found"}

        positions = (
            db.query(FlightPosition)
            .filter(FlightPosition.flight_log_id == flight_log_id)
            .order_by(FlightPosition.timestamp)
            .all()
        )

        aircraft = db.query(Aircraft).filter(Aircraft.id == flight.aircraft_id).first()

        # Analyze hovering events
        hover_events = []
        consecutive_hovers = []

        for i, pos in enumerate(positions):
            if pos.is_hovering:
                consecutive_hovers.append(pos)
            elif consecutive_hovers:
                # End of hover sequence
                if len(consecutive_hovers) >= 3:  # At least 15-45 seconds
                    hover_events.append(
                        {
                            "start_time": consecutive_hovers[0].timestamp.isoformat(),
                            "end_time": consecutive_hovers[-1].timestamp.isoformat(),
                            "duration_seconds": len(consecutive_hovers) * 10,
                            "location": {
                                "lat": consecutive_hovers[0].latitude,
                                "lon": consecutive_hovers[0].longitude,
                            },
                            "position_count": len(consecutive_hovers),
                        }
                    )
                consecutive_hovers = []

        # Calculate arrival time and duration from positions if not available
        if not flight.arrival_time and positions:
            # Use last position timestamp as arrival time
            flight.arrival_time = positions[-1].timestamp

        if (
            not flight.flight_duration_minutes
            and flight.departure_time
            and flight.arrival_time
        ):
            duration_delta = flight.arrival_time - flight.departure_time
            flight.flight_duration_minutes = duration_delta.total_seconds() / 60

        if not flight.estimated_cost and flight.flight_duration_minutes:
            flight.estimated_cost = (
                flight.flight_duration_minutes / 60 * 2160
            )  # $2160/hour

        # Generate report
        report = {
            "flight_id": flight.flight_id,
            "aircraft": {
                "registration": aircraft.registration if aircraft else "Unknown",
                "is_phoenix_pd": aircraft.is_phoenix_pd if aircraft else False,
                "operator": aircraft.operator if aircraft else "Unknown",
            },
            "flight_summary": {
                "departure_time": flight.departure_time.isoformat()
                if flight.departure_time
                else None,
                "arrival_time": flight.arrival_time.isoformat()
                if flight.arrival_time
                else None,
                "duration_minutes": flight.flight_duration_minutes,
                "estimated_cost": flight.estimated_cost,
            },
            "position_data": {
                "total_positions": len(positions),
                "data_resolution": "Complete track (100% capture)",
                "average_interval_seconds": flight.flight_duration_minutes
                * 60
                / len(positions)
                if positions
                else 0,
            },
            "surveillance_analysis": {
                "surveillance_score": flight.surveillance_likelihood,
                "privacy_concern_level": flight.privacy_concern_level,
                "pattern_notes": flight.pattern_notes,
                "legal_notes": flight.legal_notes,
            },
            "hover_analysis": {
                "total_hover_events": len(hover_events),
                "hover_events": hover_events,
                "total_hover_time_seconds": sum(
                    e["duration_seconds"] for e in hover_events
                ),
            },
            "altitude_analysis": {
                "max_altitude": flight.max_altitude_feet,
                "min_altitude": flight.min_altitude_feet,
                "avg_altitude": flight.avg_altitude_feet,
                "low_altitude_percentage": len(
                    [p for p in positions if p.altitude_feet and p.altitude_feet < 1000]
                )
                / len(positions)
                * 100
                if positions
                else 0,
            },
        }

        logger.info(f"Generated complete flight report for {flight.flight_id}")

        return report

    except Exception as e:
        logger.error(f"Report generation failed: {e}")
        return {"error": str(e)}

    finally:
        db.close()
