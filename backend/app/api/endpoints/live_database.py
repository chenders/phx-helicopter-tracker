"""
Live tracking endpoints using database data
No FR24 API calls - uses data collected by the complete flight tracking system
"""
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc

from app.api.deps import get_db
from app.models.flight_logs import FlightLog, FlightPosition
from app.models.aircraft import Aircraft
from app.schemas.tracking import LiveTrackingData

import logging
logger = logging.getLogger(__name__)

router = APIRouter()


@router.get("/live-from-db", response_model=List[LiveTrackingData])
async def get_live_tracking_from_database(
    *,
    db: Session = Depends(get_db),
    phoenix_pd_only: bool = Query(True, description="Filter to Phoenix PD aircraft only"),
    active_only: bool = Query(True, description="Only show currently active aircraft"),
    min_altitude: Optional[int] = Query(None, description="Minimum altitude filter"),
    max_altitude: Optional[int] = Query(None, description="Maximum altitude filter"),
    minutes_back: int = Query(15, description="How many minutes of recent data to include")
) -> List[LiveTrackingData]:
    """
    Get live tracking data from database - no API calls
    
    This uses data collected by the complete flight tracking system:
    - Data updated every 5 minutes when flights are active
    - Complete flight paths downloaded when flights land
    - 100% of available positions captured
    
    Returns the most recent position for each active aircraft
    """
    
    # Calculate time window
    cutoff_time = datetime.now(timezone.utc) - timedelta(minutes=minutes_back)
    
    # Build base query for recent positions
    query = db.query(
        FlightPosition,
        Aircraft,
        FlightLog
    ).join(
        Aircraft, FlightPosition.aircraft_id == Aircraft.id
    ).join(
        FlightLog, FlightPosition.flight_log_id == FlightLog.id
    ).filter(
        FlightPosition.timestamp >= cutoff_time
    )
    
    # Apply filters
    if phoenix_pd_only:
        query = query.filter(Aircraft.is_phoenix_pd == True)
    
    if min_altitude is not None:
        query = query.filter(FlightPosition.altitude_feet >= min_altitude)
    
    if max_altitude is not None:
        query = query.filter(FlightPosition.altitude_feet <= max_altitude)
    
    # Get all recent positions
    recent_positions = query.order_by(desc(FlightPosition.timestamp)).all()
    
    # Group by aircraft to get most recent position for each
    aircraft_positions = {}
    aircraft_paths = {}  # Store last N positions for flight path
    
    for position, aircraft, flight_log in recent_positions:
        reg = aircraft.registration
        
        # Store most recent position for this aircraft
        if reg not in aircraft_positions:
            aircraft_positions[reg] = (position, aircraft, flight_log)
        
        # Build flight path (last 50 positions)
        if reg not in aircraft_paths:
            aircraft_paths[reg] = []
        if len(aircraft_paths[reg]) < 50:
            aircraft_paths[reg].append({
                'lat': position.latitude,
                'lng': position.longitude
            })
    
    # Convert to LiveTrackingData format
    result = []
    
    for reg, (position, aircraft, flight_log) in aircraft_positions.items():
        # Check if aircraft is still active (last position within 10 minutes)
        time_since_last = (datetime.now(timezone.utc) - position.timestamp).total_seconds() / 60
        
        if active_only and time_since_last > 10:
            continue  # Skip inactive aircraft
        
        # Determine surveillance status
        is_hovering = position.is_hovering or False
        is_circling = position.is_circling or False
        is_surveillance = (
            is_hovering or
            is_circling or
            (position.altitude_feet and position.altitude_feet < 1500) or
            (flight_log.surveillance_likelihood and flight_log.surveillance_likelihood > 0.5)
        )
        
        # Create tracking data
        tracking_data = LiveTrackingData(
            aircraft_registration=aircraft.registration,
            aircraft_id=aircraft.id,
            flight_log_id=flight_log.id,
            latitude=position.latitude,
            longitude=position.longitude,
            altitude_feet=position.altitude_feet,
            ground_speed_knots=position.ground_speed_knots,
            track_degrees=position.track_degrees,
            vertical_rate=position.vertical_rate,
            timestamp=position.timestamp.isoformat(),
            is_phoenix_pd=aircraft.is_phoenix_pd,
            is_active=time_since_last <= 10,
            is_hovering=is_hovering,
            is_circling=is_circling,
            over_residential=position.neighborhood is not None,
            privacy_concern=position.altitude_privacy_concern or False,
            data_source="database",
            raw_data={
                "flight_path": aircraft_paths.get(reg, []),
                "position_count": len(aircraft_paths.get(reg, [])),
                "flight_duration_minutes": flight_log.flight_duration_minutes,
                "surveillance_score": flight_log.surveillance_likelihood,
                "pattern_notes": flight_log.pattern_notes,
                "last_update_minutes_ago": round(time_since_last, 1)
            }
        )
        
        result.append(tracking_data)
    
    # Sort by most recent first
    result.sort(key=lambda x: x.timestamp, reverse=True)
    
    logger.info(f"Returning {len(result)} aircraft from database (no API calls)")
    
    return result


@router.get("/live-stats")
async def get_live_tracking_stats(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get statistics about live tracking data in database
    """
    now = datetime.now(timezone.utc)
    
    # Count recent positions
    last_5_min = db.query(FlightPosition).filter(
        FlightPosition.timestamp >= now - timedelta(minutes=5)
    ).count()
    
    last_15_min = db.query(FlightPosition).filter(
        FlightPosition.timestamp >= now - timedelta(minutes=15)
    ).count()
    
    last_hour = db.query(FlightPosition).filter(
        FlightPosition.timestamp >= now - timedelta(hours=1)
    ).count()
    
    # Active aircraft
    active_aircraft = db.query(func.count(func.distinct(FlightPosition.aircraft_id))).filter(
        FlightPosition.timestamp >= now - timedelta(minutes=10)
    ).scalar()
    
    # Phoenix PD active
    phoenix_pd_active = db.query(func.count(func.distinct(FlightPosition.aircraft_id))).join(
        Aircraft
    ).filter(
        FlightPosition.timestamp >= now - timedelta(minutes=10),
        Aircraft.is_phoenix_pd == True
    ).scalar()
    
    # Most recent position
    most_recent = db.query(FlightPosition).order_by(
        desc(FlightPosition.timestamp)
    ).first()
    
    # Today's flights
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    todays_flights = db.query(FlightLog).filter(
        FlightLog.departure_time >= today_start
    ).count()
    
    return {
        "database_positions": {
            "last_5_minutes": last_5_min,
            "last_15_minutes": last_15_min,
            "last_hour": last_hour
        },
        "active_aircraft": {
            "total": active_aircraft,
            "phoenix_pd": phoenix_pd_active
        },
        "most_recent_update": most_recent.timestamp.isoformat() if most_recent else None,
        "minutes_since_update": round((now - most_recent.timestamp).total_seconds() / 60, 1) if most_recent else None,
        "todays_flights": todays_flights,
        "data_source": "database",
        "api_calls_used": 0,
        "note": "Using complete flight tracks from database - no API calls"
    }


@router.post("/force-api-update")
async def force_api_update(
    db: Session = Depends(get_db),
    registration: Optional[str] = Query(None, description="Specific aircraft to update")
) -> Dict[str, Any]:
    """
    Force an immediate API update for emergency tracking
    This should be used sparingly as it consumes API credits
    """
    from app.services.fr24_official_api import fr24_official_api
    from app.services.fr24_rate_limiter import fr24_rate_limiter
    
    # Check rate limits
    can_request, reason = fr24_rate_limiter.can_make_request()
    if not can_request:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {reason}"
        )
    
    try:
        if registration:
            # Get specific aircraft
            positions = fr24_official_api.get_aircraft_positions([registration])
            message = f"Forced update for {registration}"
        else:
            # Get all Phoenix PD aircraft
            positions = fr24_official_api.get_phoenix_pd_live()
            message = "Forced update for all Phoenix PD aircraft"
        
        # The positions would need to be saved to database here
        # For now, just return the count
        
        return {
            "success": True,
            "message": message,
            "positions_found": len(positions) if positions else 0,
            "api_credits_used": 1,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"Force update failed: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Update failed: {str(e)}"
        )