from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, case, and_, or_
from app.db.database import get_db
from app.models import FlightLog, Aircraft
from collections import defaultdict
import random

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

    # Identify surveillance hotspots
    surveillance_hotspots = 5  # Placeholder - would need geographic data

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

    # Generate neighborhood distribution (simulated)
    neighborhoods = [
        "Maryvale",
        "South Phoenix",
        "Central Phoenix",
        "North Phoenix",
        "Ahwatukee",
    ]
    neighborhood_distribution = []
    for neighborhood in neighborhoods:
        # Simulate surveillance count with bias towards certain neighborhoods
        if neighborhood in ["Maryvale", "South Phoenix"]:
            count = random.randint(15, 25)  # Higher surveillance in these areas
        else:
            count = random.randint(5, 12)

        neighborhood_distribution.append(
            {"neighborhood": neighborhood, "surveillance_count": count}
        )

    # Generate violation types
    violation_types = [
        {"name": "Hovering", "count": constitutional_violations * 0.6},
        {"name": "Low Altitude", "count": constitutional_violations * 0.25},
        {"name": "Repeated Passes", "count": constitutional_violations * 0.15},
    ]

    # Calculate additional metrics
    discriminatory_ratio = (
        1.8  # Placeholder - would calculate from actual geographic data
    )
    excessive_hovering_events = sum(
        1
        for f in flights
        if f.flight_duration_minutes and f.flight_duration_minutes > 90
    )
    low_altitude_violations = random.randint(10, 20)  # Placeholder
    systematic_patrol_routes = 12  # Placeholder

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
    Get top surveillance hotspot locations
    """
    # Simulated hotspot data - in production would use actual geographic clustering
    hotspots = [
        {
            "location": "Maryvale (35th Ave & Indian School)",
            "event_count": 42,
            "surveillance_intensity": 0.85,
            "demographic_info": "73% Hispanic, Median Income $35k",
            "constitutional_risk": "High Risk",
        },
        {
            "location": "South Phoenix (Central & Baseline)",
            "event_count": 38,
            "surveillance_intensity": 0.78,
            "demographic_info": "65% Hispanic, 28% Black, Median Income $32k",
            "constitutional_risk": "High Risk",
        },
        {
            "location": "West Phoenix (43rd Ave & McDowell)",
            "event_count": 35,
            "surveillance_intensity": 0.72,
            "demographic_info": "68% Hispanic, Median Income $38k",
            "constitutional_risk": "Moderate Risk",
        },
        {
            "location": "Central Phoenix (7th St & Van Buren)",
            "event_count": 28,
            "surveillance_intensity": 0.65,
            "demographic_info": "Mixed Demographics, Median Income $42k",
            "constitutional_risk": "Moderate Risk",
        },
        {
            "location": "North Phoenix (19th Ave & Dunlap)",
            "event_count": 22,
            "surveillance_intensity": 0.48,
            "demographic_info": "52% White, Median Income $55k",
            "constitutional_risk": "Low Risk",
        },
        {
            "location": "Ahwatukee (48th St & Ray)",
            "event_count": 12,
            "surveillance_intensity": 0.25,
            "demographic_info": "65% White, Median Income $78k",
            "constitutional_risk": "Low Risk",
        },
    ]

    return hotspots
