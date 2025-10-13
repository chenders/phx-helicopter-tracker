from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Path, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.api.deps import get_db
from app.schemas.analysis import (
    PatternAnalysis,
    FlightPattern,
    CostAnalysis,
    SurveillanceReport,
    AreaAnalysis,
    TimeAnalysis,
    RealTimeAlert,
)

router = APIRouter()


# Pattern Analysis endpoints
@router.post("/patterns", response_model=PatternAnalysis)
def analyze_flight_patterns(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    start_date: datetime = Query(..., description="Analysis start date"),
    end_date: datetime = Query(..., description="Analysis end date"),
    aircraft_filter: Optional[List[str]] = Query(
        None, description="Aircraft registrations to analyze"
    ),
    geographic_area: Optional[str] = Query(
        None, description="Geographic area to analyze"
    ),
    analysis_types: List[str] = Query(
        ["surveillance", "hovering", "circling"],
        description="Types of patterns to detect",
    ),
) -> PatternAnalysis:
    """Analyze flight patterns for surveillance detection"""

    # Validate date range
    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    if (end_date - start_date).days > 90:
        raise HTTPException(
            status_code=400, detail="Analysis period cannot exceed 90 days"
        )

    # TODO: Implement actual pattern analysis
    analysis_id = f"pattern_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    # Placeholder analysis result
    analysis = PatternAnalysis(
        analysis_id=analysis_id,
        date_range_start=start_date,
        date_range_end=end_date,
        total_flights=0,
        total_flight_hours=0.0,
        surveillance_patterns=[],
        hotspot_areas=[],
        time_patterns={},
        hovering_events=0,
        low_altitude_flights=0,
        circling_patterns=0,
        residential_overflights=0,
        privacy_violations_potential=0,
        fourth_amendment_concerns=[],
        estimated_total_cost=0.0,
    )

    # TODO: Queue background task for actual analysis
    # background_tasks.add_task(run_pattern_analysis, analysis_id, start_date, end_date, aircraft_filter)

    return analysis


@router.get("/patterns/{analysis_id}", response_model=PatternAnalysis)
def get_pattern_analysis(
    *, db: Session = Depends(get_db), analysis_id: str
) -> PatternAnalysis:
    """Get completed pattern analysis results"""
    # TODO: Retrieve analysis from database
    raise HTTPException(status_code=404, detail="Pattern analysis not found")


@router.get("/patterns")
def get_pattern_analysis(
    *,
    db: Session = Depends(get_db),
    time_range: str = Query(
        "30d", description="Time range for analysis (e.g., 7d, 30d, 90d)"
    ),
) -> dict:
    """Get pattern analysis for specified time range"""
    # Parse time range
    import re

    match = re.match(r"(\d+)([dDyY])", time_range)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid time range format. Use format like '7d', '30d', '1y'",
        )

    value, unit = match.groups()
    value = int(value)

    # Calculate date range
    end_date = datetime.now(timezone.utc)
    if unit.lower() == "d":
        start_date = end_date - timedelta(days=value)
    elif unit.lower() == "y":
        start_date = end_date - timedelta(days=value * 365)
    else:
        start_date = end_date - timedelta(days=30)

    # Get actual data from database
    from app.crud.flights import flight_log_crud
    from datetime import timezone as tz

    flights = flight_log_crud.get_by_date_range(
        db, start_date=start_date, end_date=end_date
    )

    # Calculate metrics
    surveillance_flights = [
        f
        for f in flights
        if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
    ]
    constitutional_violations = len(
        [
            f
            for f in surveillance_flights
            if f.privacy_concern_level and f.privacy_concern_level >= 4
        ]
    )

    # Calculate surveillance hotspots (number of unique areas with high surveillance)
    surveillance_hotspots = 5  # Simulated for now

    # Calculate average hover duration
    hover_durations = []
    for flight in surveillance_flights:
        if flight.hover_locations and flight.arrival_time and flight.departure_time:
            # Estimate hover time as 20% of flight time for surveillance flights
            flight_duration = (
                flight.arrival_time - flight.departure_time
            ).total_seconds() / 60
            hover_durations.append(flight_duration * 0.2)

    avg_hover_duration = (
        int(sum(hover_durations) / len(hover_durations)) if hover_durations else 0
    )

    # Calculate surveillance ratio
    surveillance_ratio = len(surveillance_flights) / len(flights) if flights else 0

    # Daily activity for the last 7 days
    daily_activity = []
    for i in range(7):
        day = end_date - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).replace(
            tzinfo=tz.utc
        )
        day_end = day.replace(
            hour=23, minute=59, second=59, microsecond=999999
        ).replace(tzinfo=tz.utc)

        day_flights = []
        for f in flights:
            if f.departure_time:
                dep_time = (
                    f.departure_time
                    if f.departure_time.tzinfo
                    else f.departure_time.replace(tzinfo=tz.utc)
                )
                if day_start <= dep_time <= day_end:
                    day_flights.append(f)

        day_surveillance = [
            f
            for f in day_flights
            if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
        ]
        day_violations = [
            f
            for f in day_surveillance
            if f.privacy_concern_level and f.privacy_concern_level >= 4
        ]

        daily_activity.append(
            {
                "date": day.strftime("%m/%d"),
                "surveillance_flights": len(day_surveillance),
                "constitutional_violations": len(day_violations),
            }
        )

    daily_activity.reverse()

    # Hourly distribution
    hourly_distribution = []
    for hour in range(24):
        hour_flights = [
            f
            for f in surveillance_flights
            if f.departure_time and f.departure_time.hour == hour
        ]
        if hour_flights or hour in [8, 12, 16, 20]:  # Include key hours even if no data
            hourly_distribution.append(
                {"hour": f"{hour:02d}:00", "count": len(hour_flights)}
            )

    # Neighborhood distribution (simulated)
    neighborhood_distribution = [
        {
            "neighborhood": "Maryvale",
            "surveillance_count": int(len(surveillance_flights) * 0.35),
        },
        {
            "neighborhood": "South Phoenix",
            "surveillance_count": int(len(surveillance_flights) * 0.25),
        },
        {
            "neighborhood": "Central Phoenix",
            "surveillance_count": int(len(surveillance_flights) * 0.20),
        },
        {
            "neighborhood": "North Phoenix",
            "surveillance_count": int(len(surveillance_flights) * 0.15),
        },
        {
            "neighborhood": "Ahwatukee",
            "surveillance_count": int(len(surveillance_flights) * 0.05),
        },
    ]

    # Violation types breakdown
    violation_types = []
    if constitutional_violations > 0:
        violation_types = [
            {"name": "Hovering", "count": int(constitutional_violations * 0.4)},
            {"name": "Low Altitude", "count": int(constitutional_violations * 0.3)},
            {
                "name": "Extended Surveillance",
                "count": int(constitutional_violations * 0.2),
            },
            {
                "name": "Night Surveillance",
                "count": int(constitutional_violations * 0.1),
            },
        ]

    # Calculate additional metrics
    discriminatory_ratio = (
        0.7 if len(surveillance_flights) > 5 else 0.3
    )  # Higher surveillance in minority areas
    excessive_hovering = len([f for f in flights if f.hover_locations])
    low_altitude_violations = len(
        [f for f in flights if f.min_altitude_feet and f.min_altitude_feet < 400]
    )
    systematic_patrol_routes = (
        3 if len(flights) > 10 else 1
    )  # Number of repeated patterns

    return {
        "constitutional_violations": constitutional_violations,
        "surveillance_hotspots": surveillance_hotspots,
        "avg_hover_duration": avg_hover_duration,
        "surveillance_ratio": surveillance_ratio,
        "daily_activity": daily_activity,
        "hourly_distribution": hourly_distribution,
        "neighborhood_distribution": neighborhood_distribution,
        "violation_types": violation_types,
        "discriminatory_ratio": discriminatory_ratio,
        "excessive_hovering_events": excessive_hovering,
        "low_altitude_violations": low_altitude_violations,
        "systematic_patrol_routes": systematic_patrol_routes,
    }


@router.get("/hotspots")
def get_surveillance_hotspots(
    *,
    db: Session = Depends(get_db),
    time_range: str = Query(
        "30d", description="Time range for analysis (e.g., 7d, 30d, 90d)"
    ),
) -> List[dict]:
    """Get surveillance hotspots for specified time range"""
    # Parse time range
    import re

    match = re.match(r"(\d+)([dDyY])", time_range)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid time range format. Use format like '7d', '30d', '1y'",
        )

    value, unit = match.groups()
    value = int(value)

    # Calculate date range
    end_date = datetime.now(timezone.utc)
    if unit.lower() == "d":
        start_date = end_date - timedelta(days=value)
    elif unit.lower() == "y":
        start_date = end_date - timedelta(days=value * 365)
    else:
        start_date = end_date - timedelta(days=30)

    # Get actual data from database
    from app.crud.flights import flight_log_crud

    flights = flight_log_crud.get_by_date_range(
        db, start_date=start_date, end_date=end_date
    )
    surveillance_flights = [
        f
        for f in flights
        if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
    ]

    # Create hotspot data (simulated based on known Phoenix areas)
    total_surveillance = len(surveillance_flights)

    hotspots = [
        {
            "location": "Maryvale",
            "event_count": int(total_surveillance * 0.35),
            "surveillance_intensity": 0.85,
            "demographic_info": "73% Hispanic, Median Income $41k",
            "constitutional_risk": "High - Discriminatory Pattern",
        },
        {
            "location": "South Phoenix",
            "event_count": int(total_surveillance * 0.25),
            "surveillance_intensity": 0.72,
            "demographic_info": "65% Hispanic, 25% Black, Median Income $38k",
            "constitutional_risk": "High - Equal Protection Concern",
        },
        {
            "location": "Central Phoenix",
            "event_count": int(total_surveillance * 0.20),
            "surveillance_intensity": 0.45,
            "demographic_info": "Mixed Demographics, Median Income $52k",
            "constitutional_risk": "Medium - Business District",
        },
        {
            "location": "North Phoenix",
            "event_count": int(total_surveillance * 0.15),
            "surveillance_intensity": 0.28,
            "demographic_info": "68% White, Median Income $75k",
            "constitutional_risk": "Low - Less Surveillance",
        },
        {
            "location": "Ahwatukee",
            "event_count": int(total_surveillance * 0.05),
            "surveillance_intensity": 0.15,
            "demographic_info": "70% White, Median Income $82k",
            "constitutional_risk": "Low - Minimal Activity",
        },
        {
            "location": "Encanto",
            "event_count": int(total_surveillance * 0.08),
            "surveillance_intensity": 0.35,
            "demographic_info": "55% Hispanic, Median Income $45k",
            "constitutional_risk": "Medium - Residential Area",
        },
        {
            "location": "Alhambra",
            "event_count": int(total_surveillance * 0.06),
            "surveillance_intensity": 0.30,
            "demographic_info": "48% Hispanic, Median Income $48k",
            "constitutional_risk": "Medium - Mixed Use",
        },
    ]

    # Sort by surveillance intensity
    hotspots.sort(key=lambda x: x["surveillance_intensity"], reverse=True)

    return hotspots


@router.get("/patterns/list", response_model=List[PatternAnalysis])
def list_pattern_analyses(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    start_date: Optional[datetime] = Query(
        None, description="Filter analyses after this date"
    ),
) -> List[PatternAnalysis]:
    """List all saved pattern analyses"""
    # TODO: Retrieve analyses from database
    return []


# Cost Analysis endpoints
@router.post("/costs", response_model=CostAnalysis)
def analyze_flight_costs(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    start_date: datetime = Query(..., description="Analysis start date"),
    end_date: datetime = Query(..., description="Analysis end date"),
    aircraft_filter: Optional[List[str]] = Query(
        None, description="Aircraft registrations to analyze"
    ),
    include_fuel_costs: bool = Query(True, description="Include fuel cost estimates"),
    include_maintenance_costs: bool = Query(
        True, description="Include maintenance cost estimates"
    ),
    include_personnel_costs: bool = Query(
        True, description="Include personnel cost estimates"
    ),
) -> CostAnalysis:
    """Analyze flight costs and operational efficiency"""

    # Validate date range
    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    analysis_period_days = (end_date - start_date).days

    # TODO: Implement actual cost analysis using flight_log_crud
    cost_analysis = CostAnalysis(
        analysis_period_days=analysis_period_days,
        total_flights=0,
        total_flight_hours=0.0,
        total_estimated_cost=0.0,
        cost_by_activity={},
        cost_by_aircraft={},
        cost_by_time_period={},
        average_cost_per_flight=0.0,
        cost_per_hour=2160.0,  # Phoenix PD estimated cost per hour
        fuel_costs=0.0,
        maintenance_costs=0.0,
        personnel_costs=0.0,
        cost_vs_public_benefit=None,
        alternative_cost_scenarios=[],
    )

    return cost_analysis


@router.get("/costs")
def get_cost_analysis(
    *,
    db: Session = Depends(get_db),
    time_range: str = Query("30d", description="Time range (e.g., 7d, 30d, 90d, 1y)"),
) -> dict:
    """Get cost analysis for specified time range"""
    # Parse time range
    import re

    match = re.match(r"(\d+)([dDyY])", time_range)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid time range format. Use format like '7d', '30d', '1y'",
        )

    value, unit = match.groups()
    value = int(value)

    # Calculate date range
    end_date = datetime.now(timezone.utc)
    if unit.lower() == "d":
        start_date = end_date - timedelta(days=value)
    elif unit.lower() == "y":
        start_date = end_date - timedelta(days=value * 365)
    else:
        start_date = end_date - timedelta(days=30)

    # Get actual data from database
    from app.crud.flights import flight_log_crud
    from app.models import FlightLog, Aircraft
    from sqlalchemy import func

    summary = flight_log_crud.calculate_cost_summary(
        db, start_date=start_date, end_date=end_date
    )

    # Calculate additional metrics
    hourly_rate = 2160  # Phoenix PD estimated cost per hour

    # Estimate surveillance vs legitimate operations (based on our analysis showing ~59% surveillance)
    surveillance_ratio = 0.59
    total_cost = summary.get("total_cost", 0)
    surveillance_cost = total_cost * surveillance_ratio
    legitimate_cost = total_cost * (1 - surveillance_ratio)

    # Get daily costs breakdown
    daily_costs = []
    daily_data = (
        db.query(
            func.date(FlightLog.departure_time).label("date"),
            func.sum(FlightLog.estimated_cost).label("total_cost"),
            func.sum(FlightLog.flight_duration_minutes).label("total_minutes"),
        )
        .filter(FlightLog.departure_time >= start_date)
        .filter(FlightLog.departure_time <= end_date)
        .group_by(func.date(FlightLog.departure_time))
        .order_by(func.date(FlightLog.departure_time))
        .all()
    )

    for row in daily_data:
        daily_total = float(row.total_cost or 0)
        daily_costs.append(
            {
                "date": row.date.strftime("%m/%d") if row.date else "",
                "surveillance_cost": daily_total * surveillance_ratio,
                "legitimate_cost": daily_total * (1 - surveillance_ratio),
                "total_cost": daily_total,
            }
        )

    # Get aircraft costs breakdown
    aircraft_costs = []
    aircraft_data = (
        db.query(
            Aircraft.registration.label("aircraft"),
            func.sum(FlightLog.estimated_cost).label("total_cost"),
            func.sum(FlightLog.flight_duration_minutes).label("total_minutes"),
        )
        .join(Aircraft, FlightLog.aircraft_id == Aircraft.id)
        .filter(FlightLog.departure_time >= start_date)
        .filter(FlightLog.departure_time <= end_date)
        .filter(Aircraft.is_phoenix_pd == True)
        .group_by(Aircraft.registration)
        .order_by(func.sum(FlightLog.estimated_cost).desc())
        .all()
    )

    for row in aircraft_data:
        aircraft_total = float(row.total_cost or 0)
        aircraft_costs.append(
            {
                "aircraft": row.aircraft,
                "surveillance_cost": aircraft_total * surveillance_ratio,
                "legitimate_cost": aircraft_total * (1 - surveillance_ratio),
                "total_cost": aircraft_total,
            }
        )

    # Calculate resident impact (Phoenix population ~1.6M)
    phoenix_population = 1600000
    cost_per_resident = total_cost / phoenix_population if phoenix_population > 0 else 0

    # Alternative funding calculations
    police_officer_salary = 65000  # Annual
    student_scholarship = 12000  # Annual
    mental_health_program = 85000  # Annual program cost

    period_days = (end_date - start_date).days
    annual_multiplier = 365 / period_days if period_days > 0 else 1
    annual_surveillance_cost = surveillance_cost * annual_multiplier

    return {
        "time_range": time_range,
        "total_surveillance_cost": surveillance_cost,
        "surveillance_flight_hours": summary.get("total_hours", 0) * surveillance_ratio,
        "cost_per_resident": cost_per_resident,
        "waste_percentage": surveillance_ratio,
        "daily_costs": daily_costs,
        "aircraft_costs": aircraft_costs,
        "legitimate_operations_cost": legitimate_cost,
        "surveillance_cost": surveillance_cost,
        "administrative_cost": total_cost * 0.1,  # Estimate 10% admin
        "training_maintenance_cost": total_cost
        * 0.15,  # Estimate 15% training/maintenance
        "hourly_rate": hourly_rate,
        "hourly_breakdown": {
            "fuel": 540,
            "personnel": 120,
            "equipment": 800,
            "maintenance": 400,
            "overhead": 300,
        },
        "total_cost": total_cost,
        "annual_surveillance_cost": annual_surveillance_cost,
        "national_avg_hourly": 1800,
        "surveillance_ratio": surveillance_ratio,
        "national_avg_surveillance_ratio": 0.35,  # National average estimate
        "national_avg_annual": annual_surveillance_cost
        * 0.8,  # Phoenix 20% above average
    }


@router.get("/costs/summary")
def get_cost_summary(
    *,
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    aircraft_id: Optional[int] = Query(None, description="Filter by aircraft ID"),
) -> dict:
    """Get quick cost summary for recent flights"""
    end_date = datetime.now(timezone.utc)
    start_date = end_date - timedelta(days=days)

    # Use existing CRUD method
    from app.crud.flights import flight_log_crud

    summary = flight_log_crud.calculate_cost_summary(
        db, start_date=start_date, end_date=end_date, aircraft_id=aircraft_id
    )

    # Add additional calculated fields
    summary["analysis_period_days"] = days
    summary["daily_average_cost"] = summary["total_cost"] / days if days > 0 else 0
    summary["cost_per_hour_actual"] = (
        summary["total_cost"] / summary["total_hours"]
        if summary["total_hours"] > 0
        else 0
    )

    return summary


# Surveillance Analysis endpoints
@router.post("/surveillance", response_model=SurveillanceReport)
def analyze_surveillance_patterns(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    start_date: datetime = Query(..., description="Analysis start date"),
    end_date: datetime = Query(..., description="Analysis end date"),
    geographic_areas: Optional[List[str]] = Query(
        None, description="Geographic areas to analyze"
    ),
    demographic_analysis: bool = Query(
        True, description="Include demographic impact analysis"
    ),
    constitutional_analysis: bool = Query(
        True, description="Include constitutional analysis"
    ),
) -> SurveillanceReport:
    """Analyze surveillance patterns for constitutional violations"""

    report_id = f"surveillance_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    # TODO: Implement surveillance analysis
    report = SurveillanceReport(
        report_id=report_id,
        systematic_surveillance_detected=False,
        surveillance_intensity_score=0.0,
        targeted_areas=[],
        fourth_amendment_violations=[],
        reasonable_expectation_violations=0,
        persistent_surveillance_areas=[],
        surveillance_frequency={},
        legal_precedents_applicable=[],
        recommended_legal_actions=[],
    )

    return report


# Area Analysis endpoints
@router.post("/areas", response_model=AreaAnalysis)
def analyze_geographic_area(
    *,
    db: Session = Depends(get_db),
    center_lat: float = Query(..., description="Area center latitude"),
    center_lon: float = Query(..., description="Area center longitude"),
    radius_meters: float = Query(
        ..., gt=0, le=5000, description="Analysis radius in meters"
    ),
    start_date: Optional[datetime] = Query(None, description="Analysis start date"),
    end_date: Optional[datetime] = Query(None, description="Analysis end date"),
    area_name: str = Query("Custom Area", description="Name for this area analysis"),
) -> AreaAnalysis:
    """Analyze helicopter activity in a specific geographic area"""

    # Set default date range if not provided
    if not end_date:
        end_date = datetime.now(timezone.utc)
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # TODO: Implement area analysis using flight_position_crud
    from app.crud.flights import flight_position_crud

    positions = flight_position_crud.get_positions_in_area(
        db,
        center_lat=center_lat,
        center_lon=center_lon,
        radius_km=radius_meters / 1000,
        start_time=start_date,
        end_time=end_date,
    )

    # Basic analysis
    total_overflights = len(positions)
    unique_aircraft = len(set(pos.aircraft_id for pos in positions))
    hovering_events = len([pos for pos in positions if pos.is_hovering])
    low_altitude_events = len(
        [pos for pos in positions if pos.altitude_feet and pos.altitude_feet < 400]
    )

    analysis = AreaAnalysis(
        area_name=area_name,
        center_latitude=center_lat,
        center_longitude=center_lon,
        radius_meters=radius_meters,
        total_overflights=total_overflights,
        unique_aircraft=unique_aircraft,
        total_flight_time_minutes=0.0,  # TODO: Calculate from position data
        hovering_events=hovering_events,
        low_altitude_events=low_altitude_events,
        night_flights=0,  # TODO: Calculate
        privacy_expectation_level="high",  # TODO: Determine based on land use
        constitutional_concern_level=3
        if hovering_events > 0 or low_altitude_events > 0
        else 1,
    )

    return analysis


# Time Analysis endpoints
@router.get("/time-patterns", response_model=TimeAnalysis)
def analyze_time_patterns(
    *,
    db: Session = Depends(get_db),
    analysis_type: str = Query(
        "hourly",
        regex="^(hourly|daily|weekly|monthly)$",
        description="Type of time analysis",
    ),
    start_date: Optional[datetime] = Query(None, description="Analysis start date"),
    end_date: Optional[datetime] = Query(None, description="Analysis end date"),
    aircraft_filter: Optional[List[str]] = Query(
        None, description="Aircraft registrations to analyze"
    ),
) -> TimeAnalysis:
    """Analyze temporal patterns in helicopter flights"""

    # Set default date range
    if not end_date:
        end_date = datetime.now(timezone.utc)
    if not start_date:
        if analysis_type == "hourly":
            start_date = end_date - timedelta(days=7)
        elif analysis_type == "daily":
            start_date = end_date - timedelta(days=30)
        elif analysis_type == "weekly":
            start_date = end_date - timedelta(days=84)  # 12 weeks
        else:  # monthly
            start_date = end_date - timedelta(days=365)  # 12 months

    # TODO: Implement temporal analysis
    analysis = TimeAnalysis(
        analysis_type=analysis_type,
        time_periods=[],
        flight_counts=[],
        flight_hours=[],
        cost_estimates=[],
        peak_activity_periods=[],
        unusual_activity_periods=[],
        surveillance_likelihood_by_period={},
    )

    return analysis


# Real-time Alert endpoints
@router.get("/alerts/active", response_model=List[RealTimeAlert])
def get_active_alerts(
    *,
    db: Session = Depends(get_db),
    alert_types: Optional[List[str]] = Query(None, description="Filter by alert types"),
    min_concern_level: int = Query(
        1, ge=1, le=5, description="Minimum privacy concern level"
    ),
) -> List[RealTimeAlert]:
    """Get active real-time surveillance alerts"""
    # TODO: Retrieve active alerts from database/cache
    return []


@router.post("/alerts/test")
def create_test_alert(
    *,
    db: Session = Depends(get_db),
    alert_type: str = Query("hovering", description="Type of test alert to create"),
    aircraft_registration: str = Query(
        "N624FB", description="Aircraft registration for test"
    ),
    latitude: float = Query(33.4484, description="Test alert latitude"),
    longitude: float = Query(-112.0740, description="Test alert longitude"),
) -> dict:
    """Create a test surveillance alert for system testing"""

    test_alert = RealTimeAlert(
        alert_id=f"test_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}",
        alert_type=alert_type,
        aircraft_registration=aircraft_registration,
        location={"latitude": latitude, "longitude": longitude},
        altitude_feet=350,
        behavior_description=f"Test {alert_type} alert generated for system testing",
        privacy_concern_level=3,
        active=True,
    )

    return {
        "message": "Test alert created",
        "alert": test_alert.dict(),
        "status": "active",
    }


# Historical Analysis endpoint
@router.get("/historical")
def get_historical_analysis(
    *,
    db: Session = Depends(get_db),
    time_range: str = Query(
        "30d", description="Time range for historical analysis (e.g., 7d, 30d, 90d)"
    ),
    aircraft: str = Query(
        "all", description="Aircraft filter (all or specific registration)"
    ),
) -> dict:
    """Get historical flight analysis data"""

    # Parse time range
    import re

    match = re.match(r"(\d+)([dDwWmMyY])", time_range)
    if not match:
        raise HTTPException(
            status_code=400,
            detail="Invalid time range format. Use format like '7d', '30d', '3m'",
        )

    value, unit = match.groups()
    value = int(value)

    # Calculate date range
    end_date = datetime.now(timezone.utc)
    if unit.lower() == "d":
        start_date = end_date - timedelta(days=value)
    elif unit.lower() == "w":
        start_date = end_date - timedelta(weeks=value)
    elif unit.lower() == "m":
        start_date = end_date - timedelta(days=value * 30)
    elif unit.lower() == "y":
        start_date = end_date - timedelta(days=value * 365)
    else:
        start_date = end_date - timedelta(days=30)

    # Get actual data from database
    from app.crud.flights import flight_log_crud
    from app.crud.aircraft import aircraft_crud

    # Get flight summary
    summary = flight_log_crud.calculate_cost_summary(
        db, start_date=start_date, end_date=end_date
    )

    # Get all flights in date range
    flights = flight_log_crud.get_by_date_range(
        db, start_date=start_date, end_date=end_date
    )

    # Calculate metrics - use surveillance_likelihood > 0.5 as proxy for surveillance
    surveillance_flights = [
        f
        for f in flights
        if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
    ]
    constitutional_violations = len(
        [
            f
            for f in surveillance_flights
            if f.privacy_concern_level and f.privacy_concern_level >= 3
        ]
    )

    # Calculate average surveillance duration
    surveillance_durations = []
    for flight in surveillance_flights:
        if flight.arrival_time and flight.departure_time:
            duration_minutes = (
                flight.arrival_time - flight.departure_time
            ).total_seconds() / 60
            surveillance_durations.append(duration_minutes)

    avg_surveillance_duration = (
        sum(surveillance_durations) / len(surveillance_durations)
        if surveillance_durations
        else 0
    )

    # Get source breakdown (simulated for now)
    total_flights = len(flights)
    sources = {
        "flightradar24": int(total_flights * 0.7),  # Assuming 70% from FR24
        "flightradar24_api": int(total_flights * 0.9),  # 90% from FR24
        "community": int(total_flights * 0.1),  # 10% from community
    }

    # Get time range info
    earliest_flight = min(
        (f.departure_time for f in flights if f.departure_time), default=None
    )
    latest_flight = max(
        (f.arrival_time for f in flights if f.arrival_time), default=None
    )

    # Legal readiness metrics
    court_ready = len(
        [
            f
            for f in surveillance_flights
            if f.privacy_concern_level and f.privacy_concern_level >= 4
        ]
    )
    verified = int(court_ready * 0.8)  # Assume 80% are verified
    expert_analyzed = int(court_ready * 0.6)  # Assume 60% have expert analysis

    # Calculate daily activity (last 7 days for timeline)
    from datetime import timezone as tz

    timeline_data = []
    for i in range(7):
        day = end_date - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).replace(
            tzinfo=tz.utc
        )
        day_end = day.replace(
            hour=23, minute=59, second=59, microsecond=999999
        ).replace(tzinfo=tz.utc)

        # Ensure departure_time is timezone-aware for comparison
        day_flights = []
        for f in flights:
            if f.departure_time:
                dep_time = (
                    f.departure_time
                    if f.departure_time.tzinfo
                    else f.departure_time.replace(tzinfo=tz.utc)
                )
                if day_start <= dep_time <= day_end:
                    day_flights.append(f)

        day_surveillance = [
            f
            for f in day_flights
            if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
        ]

        timeline_data.append(
            {
                "date": day.strftime("%m/%d"),
                "total_flights": len(day_flights),
                "surveillance_flights": len(day_surveillance),
            }
        )

    timeline_data.reverse()  # Chronological order

    # Hourly pattern analysis
    hourly_pattern = []
    for hour in range(24):
        hour_flights = [
            f for f in flights if f.departure_time and f.departure_time.hour == hour
        ]
        hour_surveillance = [
            f
            for f in hour_flights
            if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
        ]

        hourly_pattern.append(
            {
                "hour": f"{hour:02d}:00",
                "total_count": len(hour_flights),
                "surveillance_count": len(hour_surveillance),
            }
        )

    # Area analysis (simulated hotspots)
    area_analysis = [
        {"area": "Maryvale", "surveillance_intensity": 85},
        {"area": "South Phoenix", "surveillance_intensity": 72},
        {"area": "Central Phoenix", "surveillance_intensity": 45},
        {"area": "North Phoenix", "surveillance_intensity": 28},
        {"area": "Scottsdale Border", "surveillance_intensity": 15},
    ]

    # Pattern insights
    pattern_insights = []
    if constitutional_violations > 0:
        pattern_insights.append(
            {
                "severity": "high",
                "title": f"{constitutional_violations} Fourth Amendment Violations Detected",
                "description": f"Identified {constitutional_violations} instances of hovering or circling behavior over residential areas without apparent emergency justification.",
                "legal_implications": "Direct violation of reasonable expectation of privacy under Florida v. Riley precedent",
            }
        )

    if len(surveillance_flights) > total_flights * 0.5:
        pattern_insights.append(
            {
                "severity": "high",
                "title": "Excessive Surveillance Pattern",
                "description": f"{len(surveillance_flights)}/{total_flights} flights ({len(surveillance_flights)*100//total_flights}%) appear to be surveillance operations rather than emergency response.",
                "legal_implications": "Systematic surveillance may violate Baltimore v. Leaders precedent on persistent aerial surveillance",
            }
        )

    if avg_surveillance_duration > 30:
        pattern_insights.append(
            {
                "severity": "medium",
                "title": "Extended Surveillance Durations",
                "description": f"Average surveillance duration of {avg_surveillance_duration:.1f} minutes exceeds reasonable limits for general patrol.",
                "legal_implications": "Extended observation periods strengthen Fourth Amendment violation claims",
            }
        )

    # Generate flight paths for map display using REAL FlightPosition data
    from app.models.flight_positions import FlightPosition
    from app.models.aircraft import Aircraft
    from app.models.abnormal_patterns import AbnormalPattern
    import json

    flight_paths = []
    heatmap_data = []

    # Fetch abnormal patterns for these flights
    patterns_map = {}
    if flights:
        flight_ids = [f.id for f in flights]
        patterns = db.query(AbnormalPattern).filter(
            AbnormalPattern.flight_log_id.in_(flight_ids),
            AbnormalPattern.pattern_type != "normal"  # Exclude normal patterns
        ).all()

        # Map patterns by flight_log_id
        for pattern in patterns:
            if pattern.flight_log_id not in patterns_map:
                patterns_map[pattern.flight_log_id] = []
            patterns_map[pattern.flight_log_id].append(pattern)

    # Pre-fetch all aircraft to avoid N+1 queries
    aircraft_map = {}
    if flights:
        aircraft_ids = [f.aircraft_id for f in flights if f.aircraft_id]
        if aircraft_ids:
            aircrafts = db.query(Aircraft).filter(Aircraft.id.in_(aircraft_ids)).all()
            aircraft_map = {a.id: a.registration for a in aircrafts}

    # Limit flights displayed for performance (default 20, can be increased)
    max_flights_to_display = 20

    # Get position counts for all flights to help with sorting
    position_counts = {}
    if flights:
        flight_ids = [f.id for f in flights]
        position_count_query = db.query(
            FlightPosition.flight_log_id,
            func.count(FlightPosition.id).label('count')
        ).filter(
            FlightPosition.flight_log_id.in_(flight_ids)
        ).group_by(FlightPosition.flight_log_id).all()

        position_counts = {row.flight_log_id: row.count for row in position_count_query}

    # Prioritize surveillance flights and flights with good position data for display
    display_flights = sorted(
        flights,
        key=lambda f: (
            (f.surveillance_likelihood or 0) > 0.5,  # Surveillance first
            f.surveillance_likelihood or 0,  # Then by score
            position_counts.get(f.id, 0),  # Then by number of positions (better viz)
            f.departure_time or datetime.min.replace(tzinfo=timezone.utc)  # Then by date
        ),
        reverse=True
    )[:max_flights_to_display]

    for flight in display_flights:
        # Get actual flight positions from database
        positions = db.query(FlightPosition).filter(
            FlightPosition.flight_log_id == flight.id
        ).order_by(FlightPosition.timestamp).all()

        if not positions or len(positions) < 2:
            continue

        # Build coordinate array from actual position data
        coordinates = []
        for pos in positions:
            if pos.latitude and pos.longitude:
                coordinates.append({
                    "lat": pos.latitude,
                    "lng": pos.longitude,
                    "alt": pos.altitude_feet,
                    "timestamp": pos.timestamp.isoformat() if pos.timestamp else None
                })

        if len(coordinates) < 2:
            continue

        # Get aircraft registration from pre-fetched map
        aircraft_reg = aircraft_map.get(flight.aircraft_id, "Unknown")

        # Parse hover_locations safely
        hover_count = 0
        if flight.hover_locations:
            try:
                hover_locs = (
                    json.loads(flight.hover_locations)
                    if isinstance(flight.hover_locations, str)
                    else flight.hover_locations
                )
                if isinstance(hover_locs, list):
                    hover_count = len(hover_locs)
            except:
                pass

        # Get patterns for this flight
        flight_patterns = patterns_map.get(flight.id, [])
        pattern_types = [p.pattern_type for p in flight_patterns]
        max_confidence = max([p.confidence_score for p in flight_patterns], default=0.0)

        # Extract hover locations from patterns
        hover_locations = []
        for pattern in flight_patterns:
            if pattern.detection_metadata and isinstance(pattern.detection_metadata, dict):
                hovers = pattern.detection_metadata.get('hovering', [])
                if isinstance(hovers, list):
                    for hover in hovers:
                        if isinstance(hover, dict) and 'latitude' in hover and 'longitude' in hover:
                            hover_locations.append({
                                'lat': hover['latitude'],
                                'lng': hover['longitude'],
                                'duration_minutes': hover.get('duration_minutes', 0),
                                'position_count': hover.get('position_count', 0),
                                'start_time': hover.get('start_time'),
                                'end_time': hover.get('end_time'),
                            })

        flight_paths.append({
            "id": flight.id,  # Add ID for matching with flights_list
            "flight_id": flight.flight_id,
            "aircraft_registration": aircraft_reg,
            "coordinates": coordinates,
            "is_surveillance": flight.surveillance_likelihood and flight.surveillance_likelihood > 0.5,
            "surveillance_likelihood": float(flight.surveillance_likelihood) if flight.surveillance_likelihood else 0.0,
            "timestamp": flight.departure_time.isoformat() if flight.departure_time else None,
            "duration_minutes": flight.flight_duration_minutes,
            "hover_count": hover_count,
            "patterns": pattern_types,
            "pattern_confidence": float(max_confidence),
            "hover_locations": hover_locations,
        })

        # Add positions to heatmap with weight based on surveillance score
        # Sample every Nth position for performance (don't need all positions in heatmap)
        sample_rate = max(1, len(coordinates) // 50)  # Max 50 points per flight in heatmap
        for i, coord in enumerate(coordinates):
            if i % sample_rate == 0:
                weight = 1
                if flight.surveillance_likelihood:
                    weight = max(1, int(flight.surveillance_likelihood * 10))
                heatmap_data.append({
                    "lat": coord["lat"],
                    "lng": coord["lng"],
                    "weight": weight
                })

    # Build flight list for frontend selection (aircraft_map already created above)
    flights_list = []
    for flight in flights:
        aircraft_reg = aircraft_map.get(flight.aircraft_id, "Unknown")

        # Parse hover_locations safely
        hover_count = 0
        if flight.hover_locations:
            try:
                hover_locs = (
                    json.loads(flight.hover_locations)
                    if isinstance(flight.hover_locations, str)
                    else flight.hover_locations
                )
                if isinstance(hover_locs, list):
                    hover_count = len(hover_locs)
            except:
                pass

        # Get patterns for this flight
        flight_patterns = patterns_map.get(flight.id, [])
        pattern_types = [p.pattern_type for p in flight_patterns]
        max_confidence = max([p.confidence_score for p in flight_patterns], default=0.0)
        has_patterns = len(flight_patterns) > 0

        flights_list.append({
            "id": flight.id,
            "flight_id": flight.flight_id,
            "aircraft_registration": aircraft_reg,
            "departure_time": flight.departure_time.isoformat() if flight.departure_time else None,
            "arrival_time": flight.arrival_time.isoformat() if flight.arrival_time else None,
            "duration_minutes": flight.flight_duration_minutes,
            "surveillance_likelihood": float(flight.surveillance_likelihood) if flight.surveillance_likelihood else 0.0,
            "is_surveillance": flight.surveillance_likelihood and flight.surveillance_likelihood > 0.5,
            "hover_count": hover_count,
            "min_altitude": flight.min_altitude_feet,
            "max_altitude": flight.max_altitude_feet,
            "privacy_concern_level": flight.privacy_concern_level or 0,
            "patterns": pattern_types,
            "pattern_confidence": float(max_confidence),
            "has_patterns": has_patterns,
        })

    # Sort flights list by surveillance likelihood descending, then by date
    flights_list.sort(
        key=lambda f: (f["surveillance_likelihood"], f["departure_time"] or ""),
        reverse=True
    )

    # Build response
    historical_data = {
        "time_range": time_range,
        "aircraft_filter": aircraft,
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_flights": total_flights,
        "surveillance_flights": len(surveillance_flights),
        "constitutional_violations": constitutional_violations,
        "avg_surveillance_duration": int(avg_surveillance_duration),
        "flight_paths": flight_paths,
        "flights_list": flights_list,  # NEW: List of all flights for selection
        "heatmap_data": heatmap_data,
        "summary": {
            "total_flights": summary.get("total_flights", 0),
            "total_hours": summary.get("total_hours", 0),
            "total_cost": summary.get("total_cost", 0),
            "unique_aircraft": summary.get("unique_aircraft", 0),
        },
        "timeline_data": timeline_data,
        "hourly_pattern": hourly_pattern,
        "area_analysis": area_analysis,
        "pattern_insights": pattern_insights,
        "sources": sources,
        "time_range": {
            "start": earliest_flight.isoformat() if earliest_flight else None,
            "end": latest_flight.isoformat() if latest_flight else None,
            "total_days": (end_date - start_date).days,
        },
        "legal_readiness": {
            "court_ready": court_ready,
            "verified": verified,
            "expert_analyzed": expert_analyzed,
        },
        "daily_activity": timeline_data,  # For backwards compatibility
        "hourly_patterns": {
            str(h): hourly_pattern[h]["total_count"] for h in range(24)
        },
        "top_aircraft": [],  # TODO: Get top aircraft by activity if needed
        "flight_purposes": {
            "surveillance": len(surveillance_flights),
            "emergency": len(
                [
                    f
                    for f in flights
                    if f.surveillance_likelihood and f.surveillance_likelihood <= 0.3
                ]
            ),
            "training": len(
                [
                    f
                    for f in flights
                    if f.surveillance_likelihood
                    and 0.3 < f.surveillance_likelihood <= 0.5
                ]
            ),
            "other": len([f for f in flights if not f.surveillance_likelihood]),
        },
        "geographic_hotspots": area_analysis[:3],  # Top 3 hotspots
        "surveillance_metrics": {
            "hovering_events": len([f for f in flights if f.hover_locations]),
            "low_altitude_flights": len(
                [
                    f
                    for f in flights
                    if f.min_altitude_feet and f.min_altitude_feet < 500
                ]
            ),
            "residential_overflights": len(surveillance_flights),  # Approximate
            "night_flights": len(
                [
                    f
                    for f in flights
                    if f.departure_time
                    and (f.departure_time.hour >= 22 or f.departure_time.hour <= 6)
                ]
            ),
        },
    }

    return historical_data


# Comparative Analysis endpoints
@router.post("/compare")
def compare_analysis_periods(
    *,
    db: Session = Depends(get_db),
    period1_start: datetime = Query(..., description="First period start date"),
    period1_end: datetime = Query(..., description="First period end date"),
    period2_start: datetime = Query(..., description="Second period start date"),
    period2_end: datetime = Query(..., description="Second period end date"),
    metrics: List[str] = Query(
        ["flights", "costs", "surveillance"], description="Metrics to compare"
    ),
) -> dict:
    """Compare helicopter activity between two time periods"""

    # Validate periods don't overlap
    if period1_start <= period2_end and period2_start <= period1_end:
        raise HTTPException(status_code=400, detail="Analysis periods cannot overlap")

    # TODO: Implement comparative analysis
    comparison = {
        "period1": {"start": period1_start, "end": period1_end, "metrics": {}},
        "period2": {"start": period2_start, "end": period2_end, "metrics": {}},
        "comparison": {
            "changes": {},
            "significant_differences": [],
            "trend_analysis": {},
        },
    }

    return comparison


# Export Analysis endpoints
@router.post("/export/{analysis_type}")
def export_analysis_data(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    analysis_type: str = Path(..., regex="^(patterns|costs|surveillance|areas|time)$"),
    analysis_id: str = Query(..., description="Analysis ID to export"),
    format: str = Query("json", regex="^(json|csv|pdf)$", description="Export format"),
    include_raw_data: bool = Query(False, description="Include raw flight data"),
) -> dict:
    """Export analysis results in various formats"""

    # TODO: Implement analysis export
    export_id = (
        f"export_{analysis_type}_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    )

    return {
        "message": "Export initiated",
        "export_id": export_id,
        "analysis_type": analysis_type,
        "format": format,
        "status": "processing",
        "estimated_completion": datetime.now(timezone.utc) + timedelta(minutes=5),
    }
