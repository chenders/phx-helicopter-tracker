from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_, text
from app.db.database import get_db
from app.models import FlightLog, Aircraft, FlightPosition
from collections import defaultdict

router = APIRouter()


@router.get("/analysis")
def get_pattern_analysis(
    time_range: str = Query("30d", description="Time range: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Analyze surveillance patterns to identify constitutional violations
    """
    # Parse time range
    now = datetime.utcnow()
    if time_range == "7d":
        start_date = now - timedelta(days=7)
    elif time_range == "30d":
        start_date = now - timedelta(days=30)
    elif time_range == "90d":
        start_date = now - timedelta(days=90)
    elif time_range == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)

    # Get flight data
    flights = db.query(FlightLog).filter(FlightLog.departure_time >= start_date).all()

    # Calculate metrics
    total_flights = len(flights)
    surveillance_flights = sum(
        1
        for f in flights
        if f.flight_duration_minutes and f.flight_duration_minutes > 30
    )
    surveillance_ratio = (
        surveillance_flights / total_flights if total_flights > 0 else 0
    )

    # Calculate hover duration (flights that stayed in one area)
    hover_events = [
        f
        for f in flights
        if f.flight_duration_minutes and f.flight_duration_minutes > 60
    ]
    avg_hover_duration = (
        sum(f.flight_duration_minutes for f in hover_events) / len(hover_events)
        if hover_events
        else 0
    )

    # Identify constitutional violations (simplified heuristics)
    constitutional_violations = 0
    for flight in flights:
        # Long duration hovering over residential areas
        if flight.flight_duration_minutes and flight.flight_duration_minutes > 120:
            constitutional_violations += 1
        # Low altitude operations (if we had altitude data)
        # Multiple passes over same area (if we had route data)

    # Count surveillance hotspots from actual data
    surveillance_hotspots = surveillance_flights

    # Generate daily activity data
    daily_activity = []
    for i in range(30):
        date = (now - timedelta(days=i)).strftime("%m/%d")
        daily_flights = [
            f
            for f in flights
            if f.departure_time
            and f.departure_time.date() == (now - timedelta(days=i)).date()
        ]
        surveillance_count = sum(
            1
            for f in daily_flights
            if f.flight_duration_minutes and f.flight_duration_minutes > 30
        )
        violations = sum(
            1
            for f in daily_flights
            if f.flight_duration_minutes and f.flight_duration_minutes > 120
        )

        daily_activity.append(
            {
                "date": date,
                "surveillance_flights": surveillance_count,
                "constitutional_violations": violations,
            }
        )

    # Generate hourly distribution
    hourly_distribution = []
    for hour in range(24):
        hour_flights = [
            f for f in flights if f.departure_time and f.departure_time.hour == hour
        ]
        hourly_distribution.append(
            {"hour": f"{hour:02d}:00", "count": len(hour_flights)}
        )

    # Neighborhood distribution using actual Phoenix village boundaries
    neighborhood_distribution = []
    try:
        # Filter surveillance flights
        surveillance_flight_ids = [
            f.id
            for f in flights
            if (f.surveillance_likelihood and f.surveillance_likelihood > 0.5)
            or (f.flight_duration_minutes and f.flight_duration_minutes > 30)
        ]

        if surveillance_flight_ids:
            # Query neighborhood distribution using actual village boundaries
            # Count surveillance flight positions by neighborhood
            neighborhood_query = text(
                """
                SELECT
                    neighborhood,
                    COUNT(DISTINCT flight_log_id) as surveillance_count,
                    COUNT(*) as position_count
                FROM flight_positions
                WHERE
                    flight_log_id = ANY(:flight_ids)
                    AND neighborhood IS NOT NULL
                GROUP BY neighborhood
                ORDER BY surveillance_count DESC
                LIMIT 10
            """
            )

            results = db.execute(
                neighborhood_query,
                {
                    "flight_ids": surveillance_flight_ids[:1000]
                },  # Limit to first 1000 flights
            ).fetchall()

            for row in results:
                neighborhood_distribution.append(
                    {
                        "neighborhood": row.neighborhood,
                        "surveillance_count": row.surveillance_count,
                    }
                )

    except Exception as e:
        # If query fails, return empty array (graceful degradation)
        import logging

        logging.error(f"Error generating neighborhood distribution: {e}")
        neighborhood_distribution = []

    # Calculate additional metrics from actual data
    excessive_hovering_events = sum(
        1
        for f in flights
        if f.flight_duration_minutes and f.flight_duration_minutes > 90
    )
    low_altitude_violations = sum(
        1 for f in flights if f.min_altitude_feet and f.min_altitude_feet < 400
    )
    # Note: discriminatory_ratio and systematic_patrol_routes would require
    # geographic clustering and pattern matching which we don't have implemented
    discriminatory_ratio = 0
    systematic_patrol_routes = 0

    # Violation-type breakdown from REAL computed counts. (Previously this was a fabricated
    # fixed split — 0.6/0.25/0.15 of the total — which invented the proportions and produced
    # fractional "violation" counts. Use the actual per-type counts instead.)
    violation_types = [
        {"name": "Excessive Hovering", "count": excessive_hovering_events},
        {"name": "Low Altitude", "count": low_altitude_violations},
        # Route-clustering for repeated passes isn't implemented yet; report the real (0)
        # value rather than a fabricated share.
        {"name": "Repeated Passes", "count": systematic_patrol_routes},
    ]

    return {
        "constitutional_violations": constitutional_violations,
        "surveillance_hotspots": surveillance_hotspots,
        "avg_hover_duration": round(avg_hover_duration, 0),
        "surveillance_ratio": surveillance_ratio,
        "daily_activity": daily_activity[-7:],  # Last 7 days for chart
        "hourly_distribution": hourly_distribution,
        "neighborhood_distribution": neighborhood_distribution,
        "violation_types": violation_types,
        "discriminatory_ratio": discriminatory_ratio,
        "excessive_hovering_events": excessive_hovering_events,
        "low_altitude_violations": low_altitude_violations,
        "systematic_patrol_routes": systematic_patrol_routes,
    }


@router.get("/hotspots")
def get_surveillance_hotspots(
    time_range: str = Query("30d", description="Time range: 7d, 30d, 90d, 1y"),
    db: Session = Depends(get_db),
) -> List[Dict[str, Any]]:
    """
    Get top surveillance hotspot locations using PostGIS geographic clustering
    """
    # Parse time range
    now = datetime.utcnow()
    if time_range == "7d":
        start_date = now - timedelta(days=7)
    elif time_range == "30d":
        start_date = now - timedelta(days=30)
    elif time_range == "90d":
        start_date = now - timedelta(days=90)
    elif time_range == "1y":
        start_date = now - timedelta(days=365)
    else:
        start_date = now - timedelta(days=30)

    hotspots = []
    try:
        # Use grid-based aggregation for performance
        hotspot_query = text(
            """
            WITH surveillance_flights AS (
                SELECT id, surveillance_likelihood, min_altitude_feet
                FROM flight_logs
                WHERE departure_time >= :start_date
                    AND (surveillance_likelihood > 0.5
                         OR flight_duration_minutes > 30)
            ),
            grid_positions AS (
                SELECT
                    FLOOR(fp.latitude / 0.015) * 0.015 as grid_lat,
                    FLOOR(fp.longitude / 0.015) * 0.015 as grid_lon,
                    fp.flight_log_id,
                    sf.surveillance_likelihood,
                    fp.is_hovering,
                    sf.min_altitude_feet
                FROM flight_positions fp
                JOIN surveillance_flights sf ON fp.flight_log_id = sf.id
                WHERE fp.latitude IS NOT NULL
                    AND fp.longitude IS NOT NULL
            )
            SELECT
                grid_lat,
                grid_lon,
                COUNT(*) as position_count,
                COUNT(DISTINCT flight_log_id) as flight_count,
                AVG(COALESCE(surveillance_likelihood, 0)) as avg_surveillance,
                SUM(CASE WHEN is_hovering THEN 1 ELSE 0 END) as hover_positions,
                SUM(CASE WHEN min_altitude_feet < 400 THEN 1 ELSE 0 END) as low_altitude_count
            FROM grid_positions
            GROUP BY grid_lat, grid_lon
            HAVING COUNT(*) > 50
            ORDER BY position_count DESC
            LIMIT 10
        """
        )

        results = db.execute(hotspot_query, {"start_date": start_date}).fetchall()

        for row in results:
            # Calculate surveillance intensity (0-1 scale)
            surveillance_intensity = min(
                1.0, row.avg_surveillance * (row.position_count / 1000)
            )

            # Estimate constitutional risk based on multiple factors
            risk_score = 0
            if row.hover_positions > 20:
                risk_score += 0.3
            if row.low_altitude_count > 10:
                risk_score += 0.3
            if surveillance_intensity > 0.7:
                risk_score += 0.4

            risk_level = (
                "High Risk"
                if risk_score > 0.6
                else "Moderate Risk"
                if risk_score > 0.3
                else "Low Risk"
            )

            # Get neighborhood name for this location if available
            neighborhood_query = text(
                """
                SELECT name
                FROM phoenix_neighborhoods
                WHERE ST_DWithin(
                    ST_MakePoint(:lon, :lat)::geography,
                    boundary,
                    1000  -- Within 1km of grid center
                )
                LIMIT 1
            """
            )
            neighborhood_result = db.execute(
                neighborhood_query, {"lat": row.grid_lat, "lon": row.grid_lon}
            ).fetchone()

            location_name = (
                f"{neighborhood_result.name} Village"
                if neighborhood_result
                else f"Area at {round(row.grid_lat, 4)}, {round(row.grid_lon, 4)}"
            )

            hotspots.append(
                {
                    "location": location_name,
                    "event_count": row.flight_count,
                    "surveillance_intensity": round(surveillance_intensity, 2),
                    "demographic_info": neighborhood_result.name
                    if neighborhood_result
                    else "Outside Phoenix",
                    "constitutional_risk": risk_level,
                    "hover_events": row.hover_positions,
                    "low_altitude_incidents": row.low_altitude_count,
                }
            )

    except Exception as e:
        import logging

        logging.error(f"Error generating surveillance hotspots: {e}")
        hotspots = []

    return hotspots
