from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
import math

from app.api.deps import get_db
from app.crud.flights import flight_log_crud, flight_position_crud
from app.schemas.flights import (
    FlightLog,
    FlightLogCreate,
    FlightLogUpdate,
    FlightLogList,
    FlightPosition,
    FlightPositionCreate,
    FlightPositionList,
)
from app.models.flight_logs import FlightLog as FlightLogModel
from app.models.flight_positions import FlightPosition as FlightPositionModel  # Use PostGIS-enabled model

router = APIRouter()


# Flight Logs endpoints
@router.get("/logs", response_model=FlightLogList)
def get_flight_logs(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    aircraft_id: Optional[int] = Query(None, description="Filter by aircraft ID"),
    start_date: Optional[datetime] = Query(None, description="Filter by start date"),
    end_date: Optional[datetime] = Query(None, description="Filter by end date"),
    min_surveillance_score: Optional[float] = Query(
        None, ge=0, le=1, description="Minimum surveillance likelihood score"
    )
) -> FlightLogList:
    """Get flight logs with optional filtering"""

    if start_date and end_date:
        flights = flight_log_crud.get_by_date_range(
            db, start_date=start_date, end_date=end_date, aircraft_id=aircraft_id
        )
        total = len(flights)
        flights = flights[skip : skip + limit]
    elif aircraft_id:
        flights = flight_log_crud.get_by_aircraft(
            db, aircraft_id=aircraft_id, skip=skip, limit=limit
        )
        # Get total count for aircraft
        all_flights = flight_log_crud.get_by_aircraft(
            db, aircraft_id=aircraft_id, skip=0, limit=10000
        )
        total = len(all_flights)
    elif min_surveillance_score is not None:
        flights = flight_log_crud.get_surveillance_flights(
            db, min_surveillance_score=min_surveillance_score, skip=skip, limit=limit
        )
        # Approximate total - this could be optimized with a count query
        total = len(
            flight_log_crud.get_surveillance_flights(
                db, min_surveillance_score=min_surveillance_score, skip=0, limit=10000
            )
        )
    else:
        flights = flight_log_crud.get_multi(db, skip=skip, limit=limit)
        total = flight_log_crud.count(db)

    return FlightLogList(
        flights=flights, total=total, page=skip // limit + 1, size=len(flights)
    )


@router.post("/logs", response_model=FlightLog)
def create_flight_log(
    *, db: Session = Depends(get_db), flight_in: FlightLogCreate
) -> FlightLog:
    """Create new flight log"""
    flight = flight_log_crud.create(db, obj_in=flight_in)
    return flight


@router.get("/logs/{flight_id}", response_model=FlightLog)
def get_flight_log(*, db: Session = Depends(get_db), flight_id: int) -> FlightLog:
    """Get specific flight log by ID"""
    flight = flight_log_crud.get(db, id=flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight log not found")
    return flight


@router.get("/logs/flight-id/{flight_id_str}", response_model=FlightLog)
def get_flight_log_by_flight_id(
    *, db: Session = Depends(get_db), flight_id_str: str
) -> FlightLog:
    """Get flight log by flight ID string"""
    flight = flight_log_crud.get_by_flight_id(db, flight_id=flight_id_str)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight log not found")
    return flight


@router.put("/logs/{flight_id}", response_model=FlightLog)
def update_flight_log(
    *, db: Session = Depends(get_db), flight_id: int, flight_in: FlightLogUpdate
) -> FlightLog:
    """Update flight log"""
    flight = flight_log_crud.get(db, id=flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight log not found")

    flight = flight_log_crud.update(db, db_obj=flight, obj_in=flight_in)
    return flight


@router.delete("/logs/{flight_id}")
def delete_flight_log(*, db: Session = Depends(get_db), flight_id: int) -> dict:
    """Delete flight log"""
    flight = flight_log_crud.get(db, id=flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight log not found")

    flight_log_crud.remove(db, id=flight_id)
    return {"message": "Flight log deleted successfully"}


@router.get("/logs/recent/{hours}", response_model=List[FlightLog])
def get_recent_flights(
    *,
    db: Session = Depends(get_db),
    hours: int = Path(..., ge=1, le=168, description="Hours to look back"),
    phoenix_pd_only: bool = Query(
        True, description="Filter to Phoenix PD aircraft only"
    )
) -> List[FlightLog]:
    """Get recent flights within specified hours"""
    return flight_log_crud.get_recent_flights(
        db, hours=hours, phoenix_pd_only=phoenix_pd_only
    )


@router.get("/logs/{flight_id}/with-positions", response_model=FlightLog)
def get_flight_with_positions(
    *, db: Session = Depends(get_db), flight_id: int
) -> FlightLog:
    """Get flight log with all position data loaded"""
    flight = flight_log_crud.get_flights_with_positions(db, flight_id=flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight log not found")
    return flight


@router.get("/logs/surveillance/high-risk", response_model=List[FlightLog])
def get_surveillance_flights(
    *,
    db: Session = Depends(get_db),
    min_score: float = Query(
        0.7, ge=0, le=1, description="Minimum surveillance likelihood score"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500)
) -> List[FlightLog]:
    """Get flights with high surveillance likelihood"""
    return flight_log_crud.get_surveillance_flights(
        db, min_surveillance_score=min_score, skip=skip, limit=limit
    )


# Flight Positions endpoints
@router.get("/positions", response_model=FlightPositionList)
def get_flight_positions(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=5000),
    flight_log_id: Optional[int] = Query(None, description="Filter by flight log ID"),
    aircraft_id: Optional[int] = Query(None, description="Filter by aircraft ID"),
    start_time: Optional[datetime] = Query(None, description="Filter by start time"),
    end_time: Optional[datetime] = Query(None, description="Filter by end time")
) -> FlightPositionList:
    """Get flight positions with optional filtering"""

    if flight_log_id:
        positions = flight_position_crud.get_by_flight(
            db, flight_log_id=flight_log_id, skip=skip, limit=limit
        )
        # Get total count for this flight
        all_positions = flight_position_crud.get_by_flight(
            db, flight_log_id=flight_log_id, skip=0, limit=50000
        )
        total = len(all_positions)
    elif aircraft_id and start_time and end_time:
        positions = flight_position_crud.get_positions_by_aircraft_and_time(
            db, aircraft_id=aircraft_id, start_time=start_time, end_time=end_time
        )
        total = len(positions)
        positions = positions[skip : skip + limit]
    else:
        positions = flight_position_crud.get_multi(db, skip=skip, limit=limit)
        total = flight_position_crud.count(db)

    return FlightPositionList(
        positions=positions, total=total, page=skip // limit + 1, size=len(positions)
    )


@router.post("/positions", response_model=FlightPosition)
def create_flight_position(
    *, db: Session = Depends(get_db), position_in: FlightPositionCreate
) -> FlightPosition:
    """Create new flight position"""
    position = flight_position_crud.create(db, obj_in=position_in)
    return position


@router.post("/positions/bulk", response_model=List[FlightPosition])
def create_flight_positions_bulk(
    *, db: Session = Depends(get_db), positions_in: List[FlightPositionCreate]
) -> List[FlightPosition]:
    """Create multiple flight positions in bulk"""
    if len(positions_in) > 10000:
        raise HTTPException(
            status_code=400, detail="Too many positions. Maximum 10,000 per request."
        )

    positions = flight_position_crud.create_bulk(db, positions=positions_in)
    return positions


@router.get("/positions/area", response_model=List[FlightPosition])
def get_positions_in_area(
    *,
    db: Session = Depends(get_db),
    center_lat: float = Query(..., description="Center latitude"),
    center_lon: float = Query(..., description="Center longitude"),
    radius_km: float = Query(..., gt=0, le=50, description="Radius in kilometers"),
    start_time: Optional[datetime] = Query(None, description="Filter by start time"),
    end_time: Optional[datetime] = Query(None, description="Filter by end time")
) -> List[FlightPosition]:
    """Get flight positions within a geographic area"""
    return flight_position_crud.get_positions_in_area(
        db,
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=radius_km,
        start_time=start_time,
        end_time=end_time,
    )


@router.get("/positions/hovering", response_model=List[FlightPosition])
def get_hovering_positions(
    *,
    db: Session = Depends(get_db),
    min_duration: int = Query(
        30, ge=10, description="Minimum hover duration in seconds"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000)
) -> List[FlightPosition]:
    """Get positions where aircraft was hovering"""
    return flight_position_crud.get_hovering_positions(
        db, min_duration_seconds=min_duration, skip=skip, limit=limit
    )


@router.get("/positions/low-altitude", response_model=List[FlightPosition])
def get_low_altitude_positions(
    *,
    db: Session = Depends(get_db),
    max_altitude: int = Query(
        400, gt=0, le=2000, description="Maximum altitude in feet"
    ),
    residential_only: bool = Query(
        False, description="Only positions over residential areas"
    )
) -> List[FlightPosition]:
    """Get positions at low altitude"""
    return flight_position_crud.get_low_altitude_positions(
        db, max_altitude_feet=max_altitude, over_residential_only=residential_only
    )


# Search endpoint
@router.get("/search")
def search_flights(
    *,
    db: Session = Depends(get_db),
    start_time: datetime = Query(..., description="Search start time"),
    end_time: datetime = Query(..., description="Search end time"),
    aircraft_registration: Optional[str] = Query(None, description="Aircraft registration"),
    latitude: Optional[float] = Query(None, description="Search location latitude"),
    longitude: Optional[float] = Query(None, description="Search location longitude"),
    radius: Optional[float] = Query(1000, description="Search radius in meters")
) -> Dict[str, Any]:
    """
    Search for flights within a time range and optionally near a location
    """
    # Build base query with eager loading of positions if location search
    if latitude is not None and longitude is not None:
        # Use a subquery to find flight_log_ids that have positions within the radius
        from sqlalchemy import text

        # Use PostGIS for accurate and fast spatial queries
        spatial_query = text("""
            SELECT DISTINCT fp.flight_log_id
            FROM flight_positions fp
            WHERE fp.location IS NOT NULL
            AND ST_DWithin(
                fp.location,
                ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                :radius
            )
            AND fp.timestamp BETWEEN :start_time AND :end_time
        """)

        result = db.execute(spatial_query, {
            'lon': longitude,
            'lat': latitude,
            'radius': radius,
            'start_time': start_time,
            'end_time': end_time
        })

        flight_log_ids = [row[0] for row in result]

        if flight_log_ids:
            query = db.query(FlightLogModel).filter(
                FlightLogModel.id.in_(flight_log_ids)
            )
        else:
            # No flights found within radius
            return {
                "flights": [],
                "total": 0,
                "filters": {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "aircraft": aircraft_registration,
                    "location": {"lat": latitude, "lng": longitude, "radius": radius}
                }
            }
    else:
        # No location filter, use time-based query
        query = db.query(FlightLogModel)

        # Time range filter
        query = query.filter(
            and_(
                FlightLogModel.departure_time <= end_time,
                or_(
                    FlightLogModel.arrival_time >= start_time,
                    FlightLogModel.arrival_time.is_(None)
                )
            )
        )

    # Aircraft filter
    if aircraft_registration:
        query = query.filter(FlightLogModel.aircraft_id == aircraft_registration)

    # Execute query with limit to prevent timeout
    flights = query.limit(100).all()

    results = []
    for flight in flights:
        # Check for data quality issues (significant discrepancy between recorded duration and position span)
        has_data_quality_issue = False
        data_quality_info = None

        if flight.departure_time and flight.arrival_time and flight.flight_duration_minutes:
            from sqlalchemy import text

            quality_check_query = text("""
                SELECT
                    EXTRACT(EPOCH FROM (MAX(fp.timestamp) - MIN(fp.timestamp))) / 60.0 as actual_span_minutes,
                    :recorded_duration as recorded_duration_minutes,
                    (EXTRACT(EPOCH FROM (MAX(fp.timestamp) - MIN(fp.timestamp))) / 60.0) - :recorded_duration as discrepancy_minutes
                FROM flight_positions fp
                WHERE fp.flight_log_id = :flight_id
                HAVING COUNT(*) > 1
            """)

            quality_result = db.execute(quality_check_query, {
                'flight_id': flight.id,
                'recorded_duration': flight.flight_duration_minutes
            }).first()

            if quality_result and quality_result.actual_span_minutes:
                discrepancy_pct = abs(float(quality_result.discrepancy_minutes)) / flight.flight_duration_minutes if flight.flight_duration_minutes > 0 else 0
                # Flag as issue if discrepancy is more than 20% of recorded duration
                if discrepancy_pct > 0.20:
                    has_data_quality_issue = True
                    data_quality_info = {
                        "recorded_duration_minutes": flight.flight_duration_minutes,
                        "actual_span_minutes": float(quality_result.actual_span_minutes),
                        "discrepancy_minutes": float(quality_result.discrepancy_minutes),
                        "discrepancy_percentage": float(discrepancy_pct * 100)
                    }

        flight_dict = {
            "id": flight.id,
            "aircraft_id": flight.aircraft_id,
            "registration": flight.aircraft_id,  # Assuming aircraft_id is registration
            "callsign": flight.callsign,
            "departure_time": flight.departure_time.isoformat() if flight.departure_time else None,
            "arrival_time": flight.arrival_time.isoformat() if flight.arrival_time else None,
            "duration_minutes": flight.flight_duration_minutes,
            "max_altitude": flight.max_altitude_feet,
            "min_altitude": flight.min_altitude_feet,
            "positions_count": len(flight.positions) if hasattr(flight, 'positions') else 0,
            "hover_locations": flight.hover_locations,
            "surveillance_score": flight.surveillance_likelihood or 0,
            "has_data_quality_issue": has_data_quality_issue,
            "data_quality_info": data_quality_info,
        }

        # If location search, get distance info using PostGIS
        if latitude is not None and longitude is not None:
            from sqlalchemy import text

            # Use PostGIS to find closest position efficiently
            distance_query = text("""
                SELECT
                    ST_Distance(
                        fp.location,
                        ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography
                    ) as distance,
                    fp.latitude,
                    fp.longitude,
                    fp.timestamp,
                    fp.altitude_feet,
                    fp.altitude_agl_feet,
                    fp.ground_speed_knots,
                    fp.track_degrees,
                    fp.vertical_rate,
                    fp.is_hovering,
                    fp.hover_duration_seconds
                FROM flight_positions fp
                WHERE fp.flight_log_id = :flight_id
                AND fp.location IS NOT NULL
                ORDER BY distance
                LIMIT 1
            """)

            result = db.execute(distance_query, {
                'lon': longitude,
                'lat': latitude,
                'flight_id': flight.id
            }).first()

            if result:
                flight_dict["distance_from_search"] = result.distance
                flight_dict["closest_position"] = {
                    "latitude": result.latitude,
                    "longitude": result.longitude,
                    "timestamp": result.timestamp.isoformat(),
                    "altitude_feet": result.altitude_feet,
                    "altitude_agl_feet": result.altitude_agl_feet,
                    "ground_speed_knots": result.ground_speed_knots,
                    "track_degrees": result.track_degrees,
                    "vertical_rate": result.vertical_rate,
                    "is_hovering": result.is_hovering,
                    "hover_duration_seconds": result.hover_duration_seconds,
                }
            else:
                flight_dict["distance_from_search"] = None
                flight_dict["closest_position"] = None

            # Calculate time spent in radius - only count time when consecutive points are BOTH in radius
            time_in_radius_query = text("""
                WITH all_positions AS (
                    SELECT
                        fp.timestamp,
                        fp.location,
                        LAG(fp.timestamp) OVER (ORDER BY fp.timestamp) as prev_timestamp,
                        LAG(fp.location) OVER (ORDER BY fp.timestamp) as prev_location,
                        ST_DWithin(
                            fp.location,
                            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                            :radius
                        ) as is_in_radius,
                        LAG(ST_DWithin(
                            fp.location,
                            ST_SetSRID(ST_MakePoint(:lon, :lat), 4326)::geography,
                            :radius
                        )) OVER (ORDER BY fp.timestamp) as prev_in_radius
                    FROM flight_positions fp
                    WHERE fp.flight_log_id = :flight_id
                    AND fp.location IS NOT NULL
                    ORDER BY fp.timestamp
                )
                SELECT
                    COALESCE(
                        SUM(
                            CASE
                                -- Only count time when BOTH current and previous points are in radius
                                WHEN is_in_radius AND prev_in_radius AND prev_timestamp IS NOT NULL
                                THEN EXTRACT(EPOCH FROM (timestamp - prev_timestamp))
                                ELSE 0
                            END
                        ),
                        0
                    ) as time_in_radius_seconds
                FROM all_positions
            """)

            time_result = db.execute(time_in_radius_query, {
                'lon': longitude,
                'lat': latitude,
                'radius': radius,
                'flight_id': flight.id
            }).first()

            if time_result and time_result.time_in_radius_seconds:
                flight_dict["time_in_radius_seconds"] = int(time_result.time_in_radius_seconds)
            else:
                flight_dict["time_in_radius_seconds"] = 0

            results.append(flight_dict)
        else:
            # No location search, include all
            flight_dict["distance_from_search"] = None
            flight_dict["closest_position"] = None
            results.append(flight_dict)

    # Sort by distance if location search
    if latitude is not None and longitude is not None:
        results.sort(key=lambda x: x.get("distance_from_search") or float('inf'))

    return {"flights": results, "total": len(results)}


@router.get("/{flight_id}/positions", response_model=List[FlightPosition])
def get_flight_positions_by_id(
    *,
    db: Session = Depends(get_db),
    flight_id: int
) -> List[FlightPosition]:
    """Get all positions for a specific flight"""
    flight = flight_log_crud.get(db, id=flight_id)
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")

    positions = db.query(FlightPositionModel).filter(
        FlightPositionModel.flight_log_id == flight_id
    ).order_by(FlightPositionModel.timestamp).all()

    return positions


# Analysis endpoints
@router.get("/analysis/cost-summary")
def get_flight_cost_summary(
    *,
    db: Session = Depends(get_db),
    start_date: Optional[datetime] = Query(None, description="Start date for analysis"),
    end_date: Optional[datetime] = Query(None, description="End date for analysis"),
    aircraft_id: Optional[int] = Query(None, description="Filter by aircraft ID")
) -> dict:
    """Get cost summary for flights"""
    return flight_log_crud.calculate_cost_summary(
        db, start_date=start_date, end_date=end_date, aircraft_id=aircraft_id
    )


@router.get("/data-quality-metrics")
def get_data_quality_metrics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get data quality metrics showing discrepancies between flight metadata
    and actual position data timestamps
    """
    from sqlalchemy import text

    # Summary statistics
    summary_query = text("""
        WITH flight_position_spans AS (
            SELECT
                fl.id,
                fl.departure_time,
                fl.arrival_time,
                fl.flight_duration_minutes,
                MIN(fp.timestamp) as first_position,
                MAX(fp.timestamp) as last_position,
                EXTRACT(EPOCH FROM (MAX(fp.timestamp) - MIN(fp.timestamp)))/60 as position_span_minutes
            FROM flight_logs fl
            JOIN flight_positions fp ON fp.flight_log_id = fl.id
            GROUP BY fl.id, fl.departure_time, fl.arrival_time, fl.flight_duration_minutes
        )
        SELECT
            COUNT(*) as total_flights,
            COUNT(*) FILTER (WHERE first_position < departure_time) as flights_with_early_positions,
            COUNT(*) FILTER (WHERE last_position > arrival_time) as flights_with_late_positions,
            COUNT(*) FILTER (WHERE first_position < departure_time OR last_position > arrival_time) as flights_with_any_discrepancy,
            COUNT(*) FILTER (WHERE position_span_minutes > flight_duration_minutes * 1.5) as flights_with_50pct_longer_span,
            COUNT(*) FILTER (WHERE position_span_minutes > flight_duration_minutes * 2) as flights_with_double_span,
            AVG(position_span_minutes - flight_duration_minutes) as avg_discrepancy_minutes,
            MAX(position_span_minutes - flight_duration_minutes) as max_discrepancy_minutes
        FROM flight_position_spans
    """)

    summary_result = db.execute(summary_query).first()

    # Time series data (monthly aggregation)
    time_series_query = text("""
        WITH flight_position_spans AS (
            SELECT
                fl.id,
                fl.departure_time,
                fl.arrival_time,
                fl.flight_duration_minutes,
                MIN(fp.timestamp) as first_position,
                MAX(fp.timestamp) as last_position,
                EXTRACT(EPOCH FROM (MAX(fp.timestamp) - MIN(fp.timestamp)))/60 as position_span_minutes,
                EXTRACT(EPOCH FROM (MIN(fp.timestamp) - fl.departure_time))/60 as minutes_before_departure,
                EXTRACT(EPOCH FROM (MAX(fp.timestamp) - fl.arrival_time))/60 as minutes_after_arrival
            FROM flight_logs fl
            JOIN flight_positions fp ON fp.flight_log_id = fl.id
            GROUP BY fl.id, fl.departure_time, fl.arrival_time, fl.flight_duration_minutes
        )
        SELECT
            TO_CHAR(departure_time, 'YYYY-MM') as month,
            AVG(position_span_minutes - flight_duration_minutes) as avg_discrepancy_minutes,
            MAX(position_span_minutes - flight_duration_minutes) as max_discrepancy_minutes,
            COUNT(*) FILTER (WHERE first_position < departure_time OR last_position > arrival_time) as flights_with_discrepancy,
            COUNT(*) as total_flights,
            (COUNT(*) FILTER (WHERE first_position < departure_time OR last_position > arrival_time)::float / COUNT(*) * 100) as pct_with_discrepancy,
            COUNT(*) FILTER (WHERE position_span_minutes > flight_duration_minutes * 1.5) as flights_50pct_longer,
            COUNT(*) FILTER (WHERE position_span_minutes > flight_duration_minutes * 2) as flights_double
        FROM flight_position_spans
        GROUP BY TO_CHAR(departure_time, 'YYYY-MM')
        ORDER BY month
    """)

    time_series_result = db.execute(time_series_query).fetchall()

    # Worst cases
    worst_cases_query = text("""
        WITH flight_position_spans AS (
            SELECT
                fl.id,
                fl.flight_id,
                fl.departure_time,
                fl.arrival_time,
                fl.flight_duration_minutes,
                MIN(fp.timestamp) as first_position,
                MAX(fp.timestamp) as last_position,
                EXTRACT(EPOCH FROM (MAX(fp.timestamp) - MIN(fp.timestamp)))/60 as position_span_minutes,
                EXTRACT(EPOCH FROM (MIN(fp.timestamp) - fl.departure_time))/60 as minutes_before_departure,
                EXTRACT(EPOCH FROM (MAX(fp.timestamp) - fl.arrival_time))/60 as minutes_after_arrival
            FROM flight_logs fl
            JOIN flight_positions fp ON fp.flight_log_id = fl.id
            GROUP BY fl.id, fl.flight_id, fl.departure_time, fl.arrival_time, fl.flight_duration_minutes
        )
        SELECT
            id,
            flight_id,
            departure_time,
            flight_duration_minutes as recorded_duration_minutes,
            position_span_minutes as actual_span_minutes,
            (position_span_minutes - flight_duration_minutes) as discrepancy_minutes,
            minutes_before_departure,
            minutes_after_arrival
        FROM flight_position_spans
        WHERE position_span_minutes > flight_duration_minutes * 1.2
        ORDER BY (position_span_minutes - flight_duration_minutes) DESC
        LIMIT 50
    """)

    worst_cases_result = db.execute(worst_cases_query).fetchall()

    return {
        "summary": {
            "total_flights": summary_result.total_flights,
            "flights_with_early_positions": summary_result.flights_with_early_positions,
            "flights_with_late_positions": summary_result.flights_with_late_positions,
            "flights_with_any_discrepancy": summary_result.flights_with_any_discrepancy,
            "flights_with_50pct_longer_span": summary_result.flights_with_50pct_longer_span,
            "flights_with_double_span": summary_result.flights_with_double_span,
            "avg_discrepancy_minutes": float(summary_result.avg_discrepancy_minutes or 0),
            "max_discrepancy_minutes": float(summary_result.max_discrepancy_minutes or 0),
        },
        "time_series": [
            {
                "month": row.month,
                "avg_discrepancy_minutes": float(row.avg_discrepancy_minutes or 0),
                "max_discrepancy_minutes": float(row.max_discrepancy_minutes or 0),
                "flights_with_discrepancy": row.flights_with_discrepancy,
                "total_flights": row.total_flights,
                "pct_with_discrepancy": float(row.pct_with_discrepancy or 0),
                "flights_50pct_longer": row.flights_50pct_longer,
                "flights_double": row.flights_double,
            }
            for row in time_series_result
        ],
        "worst_cases": [
            {
                "id": row.id,
                "flight_id": row.flight_id,
                "departure_time": row.departure_time.isoformat() if row.departure_time else None,
                "recorded_duration_minutes": float(row.recorded_duration_minutes or 0),
                "actual_span_minutes": float(row.actual_span_minutes or 0),
                "discrepancy_minutes": float(row.discrepancy_minutes or 0),
                "minutes_before_departure": float(row.minutes_before_departure or 0),
                "minutes_after_arrival": float(row.minutes_after_arrival or 0),
            }
            for row in worst_cases_result
        ]
    }


@router.get("/camelback-mountain-analysis")
def analyze_camelback_mountain_flights(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Analyze flights near Camelback Mountain peaks.

    Camelback Mountain has two prominent peaks:
    - Eastern peak (the "head"): 33.5145° N, 111.9710° W, elevation ~2,704 ft
    - Western peak (the "hump"): 33.5156° N, 111.9780° W, elevation ~2,400 ft

    This endpoint finds flights that flew within 500 feet (horizontally) of either peak
    at or above the peak elevation, which may indicate sightseeing rather than police work.
    """

    from sqlalchemy import text

    # Define the two peak locations
    # Eastern peak ("head") - higher peak
    east_peak_lat = 33.5145
    east_peak_lng = -111.9710
    east_peak_elevation = 2704  # feet

    # Western peak ("hump")
    west_peak_lat = 33.5156
    west_peak_lng = -111.9780
    west_peak_elevation = 2400  # feet

    # 500 feet radius in degrees (approximately)
    # At Phoenix latitude, 1 degree ≈ 364,000 feet latitude, 288,000 feet longitude
    radius_lat = 500 / 364000  # ~0.00137 degrees
    radius_lng = 500 / 288000  # ~0.00174 degrees

    query = text("""
        WITH peak_visits AS (
            -- Find positions near eastern peak
            SELECT DISTINCT
                fp.flight_log_id,
                fl.flight_id,
                fl.departure_time,
                fl.aircraft_id,
                a.registration,
                'Eastern Peak (Head)' as peak_name,
                COUNT(*) OVER (PARTITION BY fp.flight_log_id) as visit_count,
                MIN(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as min_altitude,
                MAX(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as max_altitude,
                AVG(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as avg_altitude,
                SUM(CASE WHEN fp.is_hovering THEN 1 ELSE 0 END) OVER (PARTITION BY fp.flight_log_id) as hover_positions,
                SUM(CASE WHEN fp.is_circling THEN 1 ELSE 0 END) OVER (PARTITION BY fp.flight_log_id) as circling_positions
            FROM flight_positions fp
            JOIN flight_logs fl ON fp.flight_log_id = fl.id
            JOIN aircraft a ON fl.aircraft_id = a.id
            WHERE fp.latitude BETWEEN :east_lat - :radius_lat AND :east_lat + :radius_lat
                AND fp.longitude BETWEEN :east_lng - :radius_lng AND :east_lng + :radius_lng
                AND fp.altitude_feet >= :east_elevation - 200  -- Within 200 ft of peak elevation

            UNION ALL

            -- Find positions near western peak
            SELECT DISTINCT
                fp.flight_log_id,
                fl.flight_id,
                fl.departure_time,
                fl.aircraft_id,
                a.registration,
                'Western Peak (Hump)' as peak_name,
                COUNT(*) OVER (PARTITION BY fp.flight_log_id) as visit_count,
                MIN(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as min_altitude,
                MAX(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as max_altitude,
                AVG(fp.altitude_feet) OVER (PARTITION BY fp.flight_log_id) as avg_altitude,
                SUM(CASE WHEN fp.is_hovering THEN 1 ELSE 0 END) OVER (PARTITION BY fp.flight_log_id) as hover_positions,
                SUM(CASE WHEN fp.is_circling THEN 1 ELSE 0 END) OVER (PARTITION BY fp.flight_log_id) as circling_positions
            FROM flight_positions fp
            JOIN flight_logs fl ON fp.flight_log_id = fl.id
            JOIN aircraft a ON fl.aircraft_id = a.id
            WHERE fp.latitude BETWEEN :west_lat - :radius_lat AND :west_lat + :radius_lat
                AND fp.longitude BETWEEN :west_lng - :radius_lng AND :west_lng + :radius_lng
                AND fp.altitude_feet >= :west_elevation - 200  -- Within 200 ft of peak elevation
        ),
        unique_flights AS (
            SELECT DISTINCT
                flight_log_id,
                flight_id,
                departure_time,
                aircraft_id,
                registration,
                STRING_AGG(DISTINCT peak_name, ', ') as peaks_visited,
                MAX(visit_count) as max_positions_near_peak,
                MIN(min_altitude) as min_altitude,
                MAX(max_altitude) as max_altitude,
                AVG(avg_altitude) as avg_altitude,
                MAX(hover_positions) as hover_positions,
                MAX(circling_positions) as circling_positions
            FROM peak_visits
            GROUP BY flight_log_id, flight_id, departure_time, aircraft_id, registration
        )
        SELECT
            flight_log_id,
            flight_id,
            departure_time,
            registration,
            peaks_visited,
            max_positions_near_peak,
            min_altitude,
            max_altitude,
            avg_altitude,
            hover_positions,
            circling_positions,
            CASE
                WHEN hover_positions > 5 OR circling_positions > 5 THEN 'Likely Sightseeing'
                WHEN max_positions_near_peak > 10 THEN 'Possible Sightseeing'
                ELSE 'Passing Through'
            END as likely_purpose
        FROM unique_flights
        ORDER BY departure_time DESC
    """)

    results = db.execute(query, {
        "east_lat": east_peak_lat,
        "east_lng": east_peak_lng,
        "east_elevation": east_peak_elevation,
        "west_lat": west_peak_lat,
        "west_lng": west_peak_lng,
        "west_elevation": west_peak_elevation,
        "radius_lat": radius_lat,
        "radius_lng": radius_lng,
    }).fetchall()

    # Get summary statistics
    summary_query = text("""
        WITH peak_visits AS (
            -- Eastern peak
            SELECT DISTINCT fp.flight_log_id
            FROM flight_positions fp
            WHERE fp.latitude BETWEEN :east_lat - :radius_lat AND :east_lat + :radius_lat
                AND fp.longitude BETWEEN :east_lng - :radius_lng AND :east_lng + :radius_lng
                AND fp.altitude_feet >= :east_elevation - 200

            UNION

            -- Western peak
            SELECT DISTINCT fp.flight_log_id
            FROM flight_positions fp
            WHERE fp.latitude BETWEEN :west_lat - :radius_lat AND :west_lat + :radius_lat
                AND fp.longitude BETWEEN :west_lng - :radius_lng AND :west_lng + :radius_lng
                AND fp.altitude_feet >= :west_elevation - 200
        )
        SELECT
            COUNT(*) as flights_near_peaks,
            (SELECT COUNT(*) FROM flight_logs) as total_flights,
            ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM flight_logs), 2) as percentage
        FROM peak_visits
    """)

    summary = db.execute(summary_query, {
        "east_lat": east_peak_lat,
        "east_lng": east_peak_lng,
        "east_elevation": east_peak_elevation,
        "west_lat": west_peak_lat,
        "west_lng": west_peak_lng,
        "west_elevation": west_peak_elevation,
        "radius_lat": radius_lat,
        "radius_lng": radius_lng,
    }).fetchone()

    return {
        "summary": {
            "total_flights_in_database": summary.total_flights,
            "flights_near_camelback_peaks": summary.flights_near_peaks,
            "percentage_of_all_flights": float(summary.percentage),
            "search_criteria": {
                "eastern_peak": {"lat": east_peak_lat, "lng": east_peak_lng, "elevation_ft": east_peak_elevation},
                "western_peak": {"lat": west_peak_lat, "lng": west_peak_lng, "elevation_ft": west_peak_elevation},
                "search_radius_feet": 500,
                "elevation_tolerance_feet": 200,
            }
        },
        "flights": [
            {
                "flight_log_id": row.flight_log_id,
                "flight_id": row.flight_id,
                "departure_time": row.departure_time.isoformat() if row.departure_time else None,
                "aircraft": row.registration,
                "peaks_visited": row.peaks_visited,
                "positions_near_peak": row.max_positions_near_peak,
                "altitude_range": {
                    "min": float(row.min_altitude),
                    "max": float(row.max_altitude),
                    "avg": float(row.avg_altitude),
                },
                "hovering_positions": row.hover_positions,
                "circling_positions": row.circling_positions,
                "likely_purpose": row.likely_purpose,
            }
            for row in results
        ]
    }
