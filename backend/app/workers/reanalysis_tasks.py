"""
Celery tasks for reanalyzing existing flight data
Used to backfill analysis after database restores or schema changes
"""
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List
from celery import current_task
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.models.flight_logs import FlightLog
from app.models.flight_positions import FlightPosition
from app.schemas.flights import FlightLogUpdate

logger = logging.getLogger(__name__)


def _detect_hovering(positions: List[FlightPosition]) -> List[Dict[str, Any]]:
    """
    Detect hovering patterns from flight positions
    A hover is defined as staying within a small area for an extended period
    """
    if len(positions) < 10:
        return []

    hovering_segments = []
    current_segment = None
    HOVER_SPEED_THRESHOLD = 10  # knots
    MIN_HOVER_DURATION = 120  # 2 minutes in seconds

    for i, pos in enumerate(positions):
        is_slow = (
            pos.ground_speed_knots is not None
            and pos.ground_speed_knots < HOVER_SPEED_THRESHOLD
        )

        if is_slow:
            if current_segment is None:
                # Start new hover segment
                current_segment = {
                    "start_index": i,
                    "start_time": pos.timestamp.isoformat() if pos.timestamp else None,
                    "start_lat": pos.latitude,
                    "start_lon": pos.longitude,
                    "positions": [pos],
                }
            else:
                # Continue hover segment
                current_segment["positions"].append(pos)
        else:
            # Fast movement - check if we should save the hover segment
            if current_segment and len(current_segment["positions"]) > 0:
                first_pos = current_segment["positions"][0]
                last_pos = current_segment["positions"][-1]

                if first_pos.timestamp and last_pos.timestamp:
                    duration = (
                        last_pos.timestamp - first_pos.timestamp
                    ).total_seconds()

                    if duration >= MIN_HOVER_DURATION:
                        # Calculate center point
                        lats = [p.latitude for p in current_segment["positions"]]
                        lons = [p.longitude for p in current_segment["positions"]]

                        hovering_segments.append(
                            {
                                "start_time": current_segment["start_time"],
                                "end_time": last_pos.timestamp.isoformat()
                                if last_pos.timestamp
                                else None,
                                "duration_seconds": duration,
                                "center_lat": sum(lats) / len(lats),
                                "center_lon": sum(lons) / len(lons),
                                "position_count": len(current_segment["positions"]),
                                "avg_altitude": sum(
                                    p.altitude_feet or 0
                                    for p in current_segment["positions"]
                                )
                                / len(current_segment["positions"]),
                            }
                        )

                current_segment = None

    # Check last segment
    if current_segment and len(current_segment["positions"]) > 0:
        first_pos = current_segment["positions"][0]
        last_pos = current_segment["positions"][-1]

        if first_pos.timestamp and last_pos.timestamp:
            duration = (last_pos.timestamp - first_pos.timestamp).total_seconds()

            if duration >= MIN_HOVER_DURATION:
                lats = [p.latitude for p in current_segment["positions"]]
                lons = [p.longitude for p in current_segment["positions"]]

                hovering_segments.append(
                    {
                        "start_time": current_segment["start_time"],
                        "end_time": last_pos.timestamp.isoformat()
                        if last_pos.timestamp
                        else None,
                        "duration_seconds": duration,
                        "center_lat": sum(lats) / len(lats),
                        "center_lon": sum(lons) / len(lons),
                        "position_count": len(current_segment["positions"]),
                        "avg_altitude": sum(
                            p.altitude_feet or 0 for p in current_segment["positions"]
                        )
                        / len(current_segment["positions"]),
                    }
                )

    return hovering_segments


def _detect_low_altitude(positions: List[FlightPosition]) -> List[Dict[str, Any]]:
    """
    Detect low altitude flight segments
    Low altitude is defined as below 400 feet AGL (or 1000 feet MSL if AGL not available)
    """
    if len(positions) < 5:
        return []

    low_alt_segments = []
    current_segment = None
    LOW_ALTITUDE_THRESHOLD_AGL = 400  # feet
    LOW_ALTITUDE_THRESHOLD_MSL = 1000  # feet (fallback)
    MIN_SEGMENT_DURATION = 60  # 1 minute in seconds

    for i, pos in enumerate(positions):
        # Prefer AGL altitude if available, fallback to MSL
        if hasattr(pos, "altitude_agl_feet") and pos.altitude_agl_feet is not None:
            is_low = pos.altitude_agl_feet < LOW_ALTITUDE_THRESHOLD_AGL
            altitude_value = pos.altitude_agl_feet
            altitude_type = "AGL"
        elif pos.altitude_feet is not None:
            is_low = pos.altitude_feet < LOW_ALTITUDE_THRESHOLD_MSL
            altitude_value = pos.altitude_feet
            altitude_type = "MSL"
        else:
            is_low = False
            altitude_value = None
            altitude_type = None

        if is_low and altitude_value is not None:
            if current_segment is None:
                # Start new low altitude segment
                current_segment = {
                    "start_index": i,
                    "start_time": pos.timestamp.isoformat() if pos.timestamp else None,
                    "start_lat": pos.latitude,
                    "start_lon": pos.longitude,
                    "positions": [pos],
                    "altitude_type": altitude_type,
                }
            else:
                # Continue low altitude segment
                current_segment["positions"].append(pos)
        else:
            # Higher altitude - check if we should save the segment
            if current_segment and len(current_segment["positions"]) > 0:
                first_pos = current_segment["positions"][0]
                last_pos = current_segment["positions"][-1]

                if first_pos.timestamp and last_pos.timestamp:
                    duration = (
                        last_pos.timestamp - first_pos.timestamp
                    ).total_seconds()

                    if duration >= MIN_SEGMENT_DURATION:
                        # Calculate path center and stats
                        lats = [p.latitude for p in current_segment["positions"]]
                        lons = [p.longitude for p in current_segment["positions"]]

                        if current_segment["altitude_type"] == "AGL":
                            altitudes = [
                                p.altitude_agl_feet
                                for p in current_segment["positions"]
                                if hasattr(p, "altitude_agl_feet")
                                and p.altitude_agl_feet is not None
                            ]
                        else:
                            altitudes = [
                                p.altitude_feet
                                for p in current_segment["positions"]
                                if p.altitude_feet is not None
                            ]

                        low_alt_segments.append(
                            {
                                "start_time": current_segment["start_time"],
                                "end_time": last_pos.timestamp.isoformat()
                                if last_pos.timestamp
                                else None,
                                "duration_seconds": duration,
                                "center_lat": sum(lats) / len(lats),
                                "center_lon": sum(lons) / len(lons),
                                "position_count": len(current_segment["positions"]),
                                "min_altitude": min(altitudes) if altitudes else None,
                                "avg_altitude": sum(altitudes) / len(altitudes)
                                if altitudes
                                else None,
                                "altitude_type": current_segment["altitude_type"],
                            }
                        )

                current_segment = None

    # Check last segment
    if current_segment and len(current_segment["positions"]) > 0:
        first_pos = current_segment["positions"][0]
        last_pos = current_segment["positions"][-1]

        if first_pos.timestamp and last_pos.timestamp:
            duration = (last_pos.timestamp - first_pos.timestamp).total_seconds()

            if duration >= MIN_SEGMENT_DURATION:
                lats = [p.latitude for p in current_segment["positions"]]
                lons = [p.longitude for p in current_segment["positions"]]

                if current_segment["altitude_type"] == "AGL":
                    altitudes = [
                        p.altitude_agl_feet
                        for p in current_segment["positions"]
                        if hasattr(p, "altitude_agl_feet")
                        and p.altitude_agl_feet is not None
                    ]
                else:
                    altitudes = [
                        p.altitude_feet
                        for p in current_segment["positions"]
                        if p.altitude_feet is not None
                    ]

                low_alt_segments.append(
                    {
                        "start_time": current_segment["start_time"],
                        "end_time": last_pos.timestamp.isoformat()
                        if last_pos.timestamp
                        else None,
                        "duration_seconds": duration,
                        "center_lat": sum(lats) / len(lats),
                        "center_lon": sum(lons) / len(lons),
                        "position_count": len(current_segment["positions"]),
                        "min_altitude": min(altitudes) if altitudes else None,
                        "avg_altitude": sum(altitudes) / len(altitudes)
                        if altitudes
                        else None,
                        "altitude_type": current_segment["altitude_type"],
                    }
                )

    return low_alt_segments


@celery_app.task(bind=True, name="reanalyze_all_flights")
def reanalyze_all_flights(self, batch_size: int = 100) -> Dict[str, Any]:
    """
    Reanalyze all flights in the database to populate hover_locations and low_altitude_segments

    This task is useful after:
    - Database restores
    - Schema changes
    - Algorithm improvements

    Args:
        batch_size: Number of flights to process in this run (default: 100)

    Returns:
        Dict with analysis results and statistics
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "flights_analyzed": 0,
        "flights_with_hovering": 0,
        "flights_with_low_altitude": 0,
        "total_hover_segments": 0,
        "total_low_alt_segments": 0,
        "flights_skipped": 0,
        "errors": [],
    }

    try:
        # Get flights that need analysis (NULL or JSON null hover_locations OR low_altitude_segments)
        # We need to check for both SQL NULL and JSON null (from database restores)
        from sqlalchemy import text

        # Use raw SQL filter to properly detect JSON null values
        json_null_filter = text(
            "(hover_locations = 'null'::jsonb OR low_altitude_segments = 'null'::jsonb OR "
            "hover_locations IS NULL OR low_altitude_segments IS NULL)"
        )

        flights_query = (
            db.query(FlightLog)
            .filter(json_null_filter)
            .order_by(FlightLog.id)
            .limit(batch_size)
        )
        flights = flights_query.all()

        total_remaining = db.query(FlightLog).filter(json_null_filter).count()

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": 0,
                    "total": len(flights),
                    "status": f"Analyzing {len(flights)} flights (est. {total_remaining} remaining)...",
                },
            )

        logger.info(
            f"Starting reanalysis of {len(flights)} flights (estimated {total_remaining} total remaining)"
        )

        for idx, flight in enumerate(flights):
            try:
                # Get all positions for this flight
                positions = (
                    db.query(FlightPosition)
                    .filter(FlightPosition.flight_log_id == flight.id)
                    .order_by(FlightPosition.timestamp)
                    .all()
                )

                if len(positions) < 5:
                    # Not enough data to analyze
                    results["flights_skipped"] += 1
                    # Still mark as analyzed (empty arrays) to avoid reprocessing
                    flight_update = FlightLogUpdate(
                        hover_locations={"segments": []},
                        low_altitude_segments={"segments": []},
                    )
                    from app.crud.flights import flight_log_crud

                    flight_log_crud.update(db, db_obj=flight, obj_in=flight_update)
                    continue

                # Detect hovering
                hover_segments = _detect_hovering(positions)

                # Detect low altitude
                low_alt_segments = _detect_low_altitude(positions)

                # Update flight record
                flight_update = FlightLogUpdate(
                    hover_locations={"segments": hover_segments},
                    low_altitude_segments={"segments": low_alt_segments},
                )

                from app.crud.flights import flight_log_crud

                flight_log_crud.update(db, db_obj=flight, obj_in=flight_update)

                # Update statistics
                results["flights_analyzed"] += 1
                if hover_segments:
                    results["flights_with_hovering"] += 1
                    results["total_hover_segments"] += len(hover_segments)
                if low_alt_segments:
                    results["flights_with_low_altitude"] += 1
                    results["total_low_alt_segments"] += len(low_alt_segments)

                # Update progress every 10 flights
                if (idx + 1) % 10 == 0 and current_task:
                    current_task.update_state(
                        state="PROGRESS",
                        meta={
                            "current": idx + 1,
                            "total": len(flights),
                            "status": f"Analyzed {idx + 1}/{len(flights)} flights...",
                        },
                    )

                # Commit every 20 flights to avoid large transactions
                if (idx + 1) % 20 == 0:
                    db.commit()

            except Exception as e:
                logger.error(f"Error analyzing flight {flight.id}: {e}")
                results["errors"].append(f"Flight {flight.id}: {str(e)}")
                db.rollback()
                continue

        # Final commit
        db.commit()

        results["summary"] = {
            "batch_completed": len(flights),
            "estimated_remaining": total_remaining - results["flights_analyzed"],
            "success_rate": f"{(results['flights_analyzed'] / len(flights) * 100):.1f}%"
            if flights
            else "0%",
            "hovering_detection_rate": f"{(results['flights_with_hovering'] / results['flights_analyzed'] * 100):.1f}%"
            if results["flights_analyzed"] > 0
            else "0%",
            "low_altitude_detection_rate": f"{(results['flights_with_low_altitude'] / results['flights_analyzed'] * 100):.1f}%"
            if results["flights_analyzed"] > 0
            else "0%",
        }

        logger.info(
            f"Reanalysis complete: {results['flights_analyzed']} flights processed"
        )

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": len(flights),
                    "total": len(flights),
                    "status": "Analysis complete!",
                },
            )

    except Exception as e:
        logger.error(f"Error in reanalysis task: {e}")
        results["errors"].append(f"Task error: {str(e)}")
        db.rollback()
    finally:
        db.close()

    return results


@celery_app.task(bind=True, name="reanalyze_flight_by_id")
def reanalyze_flight_by_id(self, flight_id: int) -> Dict[str, Any]:
    """
    Reanalyze a single flight by database ID

    Args:
        flight_id: Database ID of the flight to reanalyze

    Returns:
        Dict with analysis results
    """
    db = SessionLocal()
    results = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "flight_id": flight_id,
        "success": False,
        "hover_segments": 0,
        "low_alt_segments": 0,
        "error": None,
    }

    try:
        # Get flight
        flight = db.query(FlightLog).filter(FlightLog.id == flight_id).first()

        if not flight:
            results["error"] = f"Flight {flight_id} not found"
            return results

        # Get positions
        positions = (
            db.query(FlightPosition)
            .filter(FlightPosition.flight_log_id == flight.id)
            .order_by(FlightPosition.timestamp)
            .all()
        )

        if len(positions) < 5:
            results["error"] = "Not enough position data (need at least 5 positions)"
            return results

        # Detect patterns
        hover_segments = _detect_hovering(positions)
        low_alt_segments = _detect_low_altitude(positions)

        # Update flight
        flight_update = FlightLogUpdate(
            hover_locations={"segments": hover_segments},
            low_altitude_segments={"segments": low_alt_segments},
        )

        from app.crud.flights import flight_log_crud

        flight_log_crud.update(db, db_obj=flight, obj_in=flight_update)
        db.commit()

        results["success"] = True
        results["hover_segments"] = len(hover_segments)
        results["low_alt_segments"] = len(low_alt_segments)

        logger.info(
            f"Reanalyzed flight {flight_id}: {len(hover_segments)} hover segments, {len(low_alt_segments)} low altitude segments"
        )

    except Exception as e:
        logger.error(f"Error reanalyzing flight {flight_id}: {e}")
        results["error"] = str(e)
        db.rollback()
    finally:
        db.close()

    return results
