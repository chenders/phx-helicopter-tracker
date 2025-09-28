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
from app.models.flight_logs import FlightPosition as FlightPositionModel

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
