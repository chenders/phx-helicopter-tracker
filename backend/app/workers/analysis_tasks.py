import logging
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List
from celery import current_task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.crud.flights import flight_log_crud, flight_position_crud
from app.schemas.flights import FlightLogUpdate

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2)
def analyze_flight_patterns(
    self,
    start_date: str,
    end_date: str,
    aircraft_filter: List[str] = None,
    analysis_types: List[str] = None,
    max_flights: int = 100,
):
    """Analyze flight patterns for surveillance detection"""
    try:
        logger.info(f"Starting pattern analysis: {start_date} to {end_date}")

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 0, "total": 100, "status": "Starting analysis..."},
            )

        result = _analyze_patterns(
            start_date, end_date, aircraft_filter, analysis_types, max_flights
        )
        return result

    except Exception as exc:
        logger.error(f"Pattern analysis failed: {exc}")
        if self.request.retries < 2:
            raise self.retry(countdown=300, exc=exc)
        raise


def _analyze_patterns(
    start_date: str,
    end_date: str,
    aircraft_filter: List[str] = None,
    analysis_types: List[str] = None,
    max_flights: int = 100,
) -> Dict[str, Any]:
    """Internal pattern analysis function"""
    db = SessionLocal()

    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)

        # Get flights in date range (with limit)
        all_flights = flight_log_crud.get_by_date_range(
            db, start_date=start_dt, end_date=end_dt
        )
        
        # Limit number of flights to analyze to prevent overload
        flights = all_flights[:max_flights] if len(all_flights) > max_flights else all_flights
        
        logger.info(f"Analyzing {len(flights)} of {len(all_flights)} total flights")

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": 20,
                    "total": 100,
                    "status": f"Analyzing {len(flights)} flights...",
                },
            )

        analysis = {
            "analysis_id": f"pattern_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
            "date_range_start": start_dt,
            "date_range_end": end_dt,
            "total_flights": len(flights),
            "total_flight_hours": 0.0,
            "surveillance_patterns": [],
            "hotspot_areas": [],
            "hovering_events": 0,
            "low_altitude_flights": 0,
            "circling_patterns": 0,
            "residential_overflights": 0,
            "privacy_violations_potential": 0,
            "fourth_amendment_concerns": [],
            "estimated_total_cost": 0.0,
        }

        # Calculate totals
        total_minutes = sum(f.flight_duration_minutes or 0 for f in flights)
        analysis["total_flight_hours"] = total_minutes / 60
        analysis["estimated_total_cost"] = (
            analysis["total_flight_hours"] * 2160
        )  # $2160/hour

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 40, "total": 100, "status": "Analyzing positions..."},
            )

        # Analyze positions for patterns (limit positions per flight)
        all_positions = []
        for flight in flights:
            positions = flight_position_crud.get_by_flight(db, flight_log_id=flight.id, limit=100)
            all_positions.extend(positions)

        # Count behavior patterns
        analysis["hovering_events"] = len([p for p in all_positions if p.is_hovering])
        analysis["low_altitude_flights"] = len(
            [p for p in all_positions if p.altitude_feet and p.altitude_feet < 400]
        )

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 60, "total": 100, "status": "Identifying hotspots..."},
            )

        # Identify geographic hotspots
        hotspots = _identify_hotspots(all_positions)
        analysis["hotspot_areas"] = hotspots

        # Detect surveillance patterns
        surveillance_patterns = _detect_surveillance_patterns(flights, all_positions)
        analysis["surveillance_patterns"] = surveillance_patterns

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": 80,
                    "total": 100,
                    "status": "Assessing legal concerns...",
                },
            )

        # Legal analysis
        concerns = []
        if analysis["hovering_events"] > 10:
            concerns.append("Excessive hovering events detected")
        if analysis["low_altitude_flights"] > 50:
            concerns.append("Numerous low-altitude flights over residential areas")

        analysis["fourth_amendment_concerns"] = concerns
        analysis["privacy_violations_potential"] = len(concerns)

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 100, "total": 100, "status": "Analysis complete"},
            )

        return analysis

    finally:
        db.close()


def _identify_hotspots(positions: List) -> List[Dict[str, Any]]:
    """Identify geographic areas with high flight activity"""
    if not positions:
        return []

    # Simple grid-based clustering
    grid_size = 0.01  # ~1km grid
    grid_counts = {}

    for pos in positions:
        grid_lat = round(pos.latitude / grid_size) * grid_size
        grid_lon = round(pos.longitude / grid_size) * grid_size
        key = (grid_lat, grid_lon)

        if key not in grid_counts:
            grid_counts[key] = {
                "center_lat": grid_lat,
                "center_lon": grid_lon,
                "position_count": 0,
                "hovering_count": 0,
                "low_altitude_count": 0,
            }

        grid_counts[key]["position_count"] += 1
        if hasattr(pos, "is_hovering") and pos.is_hovering:
            grid_counts[key]["hovering_count"] += 1
        if pos.altitude_feet and pos.altitude_feet < 400:
            grid_counts[key]["low_altitude_count"] += 1

    # Return top hotspots
    hotspots = sorted(
        grid_counts.values(), key=lambda x: x["position_count"], reverse=True
    )
    return hotspots[:10]  # Top 10 hotspots


def _detect_surveillance_patterns(
    flights: List, positions: List
) -> List[Dict[str, Any]]:
    """Detect systematic surveillance patterns"""
    patterns = []

    # Pattern 1: Repeated flights over same area
    area_flights = {}
    for flight in flights:
        flight_positions = [p for p in positions if p.flight_log_id == flight.id]
        if flight_positions:
            # Calculate center of flight path
            center_lat = sum(p.latitude for p in flight_positions) / len(
                flight_positions
            )
            center_lon = sum(p.longitude for p in flight_positions) / len(
                flight_positions
            )

            area_key = (round(center_lat, 2), round(center_lon, 2))
            if area_key not in area_flights:
                area_flights[area_key] = []
            area_flights[area_key].append(flight)

    # Find areas with multiple flights
    for area, area_flight_list in area_flights.items():
        if len(area_flight_list) >= 3:  # 3+ flights in same area
            patterns.append(
                {
                    "pattern_type": "repeated_area_surveillance",
                    "location": {"lat": area[0], "lon": area[1]},
                    "flight_count": len(area_flight_list),
                    "concern_level": "high" if len(area_flight_list) >= 5 else "medium",
                }
            )

    return patterns


@celery_app.task(bind=True, max_retries=2)
def generate_cost_analysis(
    self, start_date: str, end_date: str, aircraft_filter: List[str] = None, max_flights: int = 200
):
    """Generate comprehensive cost analysis"""
    try:
        logger.info(f"Starting cost analysis: {start_date} to {end_date}")

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 0, "total": 100, "status": "Calculating costs..."},
            )

        result = _generate_cost_analysis(start_date, end_date, aircraft_filter, max_flights)
        return result

    except Exception as exc:
        logger.error(f"Cost analysis failed: {exc}")
        if self.request.retries < 2:
            raise self.retry(countdown=300, exc=exc)
        raise


def _generate_cost_analysis(
    start_date: str, end_date: str, aircraft_filter: List[str] = None, max_flights: int = 200
) -> Dict[str, Any]:
    """Internal cost analysis function"""
    db = SessionLocal()

    try:
        start_dt = datetime.fromisoformat(start_date)
        end_dt = datetime.fromisoformat(end_date)
        analysis_period_days = (end_dt - start_dt).days

        # Get flights in date range (with limit)
        all_flights = flight_log_crud.get_by_date_range(
            db, start_date=start_dt, end_date=end_dt
        )
        
        # Limit for performance
        flights = all_flights[:max_flights] if len(all_flights) > max_flights else all_flights
        
        if len(all_flights) > max_flights:
            logger.warning(f"Cost analysis limited to {max_flights} of {len(all_flights)} flights")

        analysis = {
            "analysis_period_days": analysis_period_days,
            "total_flights": len(flights),
            "total_flight_hours": 0.0,
            "total_estimated_cost": 0.0,
            "cost_by_activity": {},
            "cost_by_aircraft": {},
            "cost_by_time_period": {},
            "average_cost_per_flight": 0.0,
            "cost_per_hour": 2160.0,
            "fuel_costs": 0.0,
            "maintenance_costs": 0.0,
            "personnel_costs": 0.0,
        }

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": 30,
                    "total": 100,
                    "status": "Processing flight data...",
                },
            )

        total_minutes = 0
        cost_by_aircraft = {}

        for flight in flights:
            duration = flight.flight_duration_minutes or 0
            total_minutes += duration

            # Cost by aircraft
            aircraft_reg = (
                flight.aircraft.registration if flight.aircraft else "Unknown"
            )
            if aircraft_reg not in cost_by_aircraft:
                cost_by_aircraft[aircraft_reg] = 0
            cost_by_aircraft[aircraft_reg] += (duration / 60) * 2160

        analysis["total_flight_hours"] = total_minutes / 60
        analysis["total_estimated_cost"] = analysis["total_flight_hours"] * 2160
        analysis["cost_by_aircraft"] = cost_by_aircraft
        analysis["average_cost_per_flight"] = (
            analysis["total_estimated_cost"] / len(flights) if flights else 0
        )

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={
                    "current": 70,
                    "total": 100,
                    "status": "Analyzing cost patterns...",
                },
            )

        # Break down costs
        analysis["fuel_costs"] = analysis["total_estimated_cost"] * 0.4  # 40% fuel
        analysis["maintenance_costs"] = (
            analysis["total_estimated_cost"] * 0.3
        )  # 30% maintenance
        analysis["personnel_costs"] = (
            analysis["total_estimated_cost"] * 0.3
        )  # 30% personnel

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 100, "total": 100, "status": "Analysis complete"},
            )

        return analysis

    finally:
        db.close()


@celery_app.task(bind=True, name="app.workers.analysis_tasks.analyze_and_score_flights", max_retries=2, time_limit=600, soft_time_limit=540)
def analyze_and_score_flights(self):
    """Analyze flights without surveillance scores and update them"""
    db = SessionLocal()

    try:
        # Get flights that need analysis (no surveillance score)
        flights = (
            db.query(flight_log_crud.model)
            .filter(flight_log_crud.model.surveillance_likelihood.is_(None))
            .limit(50)
            .all()
        )  # Process in batches

        if not flights:
            return {"message": "No flights need scoring", "flights_processed": 0}

        flights_processed = 0
        flights_scored_surveillance = 0

        for flight in flights:
            # Get all positions for this flight
            positions = flight_position_crud.get_by_flight(db, flight_log_id=flight.id)

            if not positions:
                continue

            # Calculate flight duration from positions
            if len(positions) > 1:
                first_pos = min(positions, key=lambda p: p.timestamp)
                last_pos = max(positions, key=lambda p: p.timestamp)
                duration_minutes = (
                    last_pos.timestamp - first_pos.timestamp
                ).total_seconds() / 60

                # Update arrival time and duration
                flight_update = FlightLogUpdate(
                    arrival_time=last_pos.timestamp,
                    flight_duration_minutes=duration_minutes,
                )
            else:
                # Single position - estimate 30 minute flight
                flight_update = FlightLogUpdate(
                    arrival_time=positions[0].timestamp + timedelta(minutes=30),
                    flight_duration_minutes=30.0,
                )

            # Analyze surveillance patterns
            surveillance_score = 0.0
            privacy_level = 0

            # Check for hovering (even with limited data)
            hovering_positions = [p for p in positions if p.is_hovering]
            if hovering_positions:
                surveillance_score += 0.3
                privacy_level += 1

            # Check for low altitude
            low_altitude = [
                p for p in positions if p.altitude_feet and p.altitude_feet < 500
            ]
            if low_altitude:
                surveillance_score += 0.3
                privacy_level += 1

            # Check for circling patterns (need at least 3 positions)
            if len(positions) >= 3:
                # Simple check: if positions are close together spatially
                lat_variance = max(p.latitude for p in positions) - min(
                    p.latitude for p in positions
                )
                lon_variance = max(p.longitude for p in positions) - min(
                    p.longitude for p in positions
                )

                if lat_variance < 0.05 and lon_variance < 0.05:  # Roughly 5km area
                    surveillance_score += 0.2
                    privacy_level += 1

            # Check for residential areas (Phoenix metro area)
            residential_positions = [
                p
                for p in positions
                if 33.3 < p.latitude < 33.7 and -112.3 < p.longitude < -111.8
            ]
            if residential_positions:
                surveillance_score += 0.2
                privacy_level += 1

            # Update flight with scores
            flight_update.surveillance_likelihood = min(surveillance_score, 1.0)
            flight_update.privacy_concern_level = min(privacy_level, 5)

            # Add pattern notes
            patterns = []
            if hovering_positions:
                patterns.append("hovering detected")
            if low_altitude:
                patterns.append("low altitude flight")
            if residential_positions:
                patterns.append("residential overflight")

            if patterns:
                flight_update.pattern_notes = ", ".join(patterns)

            # Calculate estimated cost
            flight_duration_hours = (flight_update.flight_duration_minutes or 30) / 60
            flight_update.estimated_cost = flight_duration_hours * 2160.0

            # Update the flight
            flight_log_crud.update(db, db_obj=flight, obj_in=flight_update)
            flights_processed += 1

            if surveillance_score > 0.5:
                flights_scored_surveillance += 1

        db.commit()

        result = {
            "flights_processed": flights_processed,
            "flights_scored_surveillance": flights_scored_surveillance,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

        logger.info(f"Flight scoring complete: {result}")
        return result

    except Exception as e:
        logger.error(f"Error scoring flights: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task
def analyze_recent_patterns(max_flights: int = 50):
    """Periodic task to analyze recent flight patterns"""
    db = SessionLocal()

    try:
        # Analyze last 24 hours
        end_time = datetime.now(timezone.utc)
        start_time = end_time - timedelta(hours=24)

        all_flights = flight_log_crud.get_by_date_range(
            db, start_date=start_time, end_date=end_time
        )
        
        # Limit to prevent overload
        flights = all_flights[:max_flights] if len(all_flights) > max_flights else all_flights
        logger.info(f"Analyzing {len(flights)} of {len(all_flights)} recent flights")

        if not flights:
            return {"message": "No recent flights to analyze"}

        # Quick analysis
        surveillance_flights = [
            f
            for f in flights
            if f.surveillance_likelihood and f.surveillance_likelihood > 0.7
        ]

        result = {
            "analysis_time": end_time.isoformat(),
            "total_flights": len(flights),
            "surveillance_flights": len(surveillance_flights),
            "alert_level": "high" if len(surveillance_flights) > 3 else "normal",
        }

        logger.info(f"Recent pattern analysis: {result}")
        return result

    finally:
        db.close()
