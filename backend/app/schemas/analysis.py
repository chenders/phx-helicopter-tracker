from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class PatternAnalysis(BaseModel):
    """Schema for flight pattern analysis results"""

    analysis_id: str = Field(..., description="Unique analysis identifier")
    date_range_start: datetime = Field(..., description="Analysis period start")
    date_range_end: datetime = Field(..., description="Analysis period end")
    total_flights: int = Field(..., description="Total flights analyzed")
    total_flight_hours: float = Field(..., description="Total flight hours")

    # Pattern detection results
    surveillance_patterns: List[Dict[str, Any]] = Field(
        default=[], description="Detected surveillance patterns"
    )
    hotspot_areas: List[Dict[str, Any]] = Field(
        default=[], description="High-activity geographic areas"
    )
    time_patterns: Dict[str, Any] = Field(
        default={}, description="Temporal flight patterns"
    )

    # Behavior analysis
    hovering_events: int = Field(default=0, description="Number of hovering events")
    low_altitude_flights: int = Field(
        default=0, description="Low altitude flights count"
    )
    circling_patterns: int = Field(
        default=0, description="Circling pattern occurrences"
    )

    # Privacy metrics
    residential_overflights: int = Field(
        default=0, description="Flights over residential areas"
    )
    privacy_violations_potential: int = Field(
        default=0, description="Potential privacy violations"
    )
    fourth_amendment_concerns: List[str] = Field(
        default=[], description="Fourth Amendment concerns"
    )

    # Cost analysis
    estimated_total_cost: float = Field(
        default=0.0, description="Estimated total operational cost"
    )
    cost_per_event: Optional[float] = Field(
        None, description="Cost per documented event"
    )

    generated_at: datetime = Field(default_factory=datetime.utcnow)


class FlightPattern(BaseModel):
    """Schema for individual flight pattern"""

    pattern_type: str = Field(
        ..., description="Pattern type (hovering, circling, grid, etc)"
    )
    location: Dict[str, float] = Field(..., description="Pattern center location")
    radius_meters: float = Field(..., description="Pattern radius in meters")
    duration_minutes: float = Field(..., description="Pattern duration")
    altitude_range: Dict[str, int] = Field(
        ..., description="Min/max altitude during pattern"
    )
    privacy_score: float = Field(..., description="Privacy invasion score 0-1")
    legal_concern_level: int = Field(..., description="Legal concern level 1-5")
    flights_involved: List[int] = Field(
        ..., description="Flight log IDs involved in pattern"
    )


class CostAnalysis(BaseModel):
    """Schema for cost analysis results"""

    analysis_period_days: int = Field(..., description="Analysis period in days")
    total_flights: int = Field(..., description="Total flights analyzed")
    total_flight_hours: float = Field(..., description="Total flight hours")
    total_estimated_cost: float = Field(..., description="Total estimated cost")

    # Breakdown by activity type
    cost_by_activity: Dict[str, float] = Field(
        default={}, description="Cost breakdown by activity"
    )
    cost_by_aircraft: Dict[str, float] = Field(
        default={}, description="Cost breakdown by aircraft"
    )
    cost_by_time_period: Dict[str, float] = Field(
        default={}, description="Cost by time period"
    )

    # Efficiency metrics
    average_cost_per_flight: float = Field(..., description="Average cost per flight")
    cost_per_hour: float = Field(..., description="Actual cost per hour")
    fuel_costs: float = Field(default=0.0, description="Fuel costs")
    maintenance_costs: float = Field(default=0.0, description="Maintenance costs")
    personnel_costs: float = Field(default=0.0, description="Personnel costs")

    # Comparative analysis
    cost_vs_public_benefit: Optional[Dict[str, Any]] = Field(
        None, description="Cost vs benefit analysis"
    )
    alternative_cost_scenarios: List[Dict[str, Any]] = Field(
        default=[], description="Alternative cost scenarios"
    )


class SurveillanceReport(BaseModel):
    """Schema for surveillance analysis report"""

    report_id: str = Field(..., description="Unique report identifier")
    generated_at: datetime = Field(default_factory=datetime.utcnow)

    # Surveillance metrics
    systematic_surveillance_detected: bool = Field(
        ..., description="Systematic surveillance detected"
    )
    surveillance_intensity_score: float = Field(
        ..., description="Surveillance intensity 0-1"
    )
    targeted_areas: List[Dict[str, Any]] = Field(
        default=[], description="Areas under surveillance"
    )

    # Constitutional analysis
    fourth_amendment_violations: List[Dict[str, Any]] = Field(
        default=[], description="Potential 4th Amendment violations"
    )
    reasonable_expectation_violations: int = Field(
        default=0, description="Privacy expectation violations"
    )

    # Pattern analysis
    persistent_surveillance_areas: List[Dict[str, Any]] = Field(
        default=[], description="Areas under persistent surveillance"
    )
    surveillance_frequency: Dict[str, int] = Field(
        default={}, description="Surveillance frequency by area"
    )

    # Legal implications
    legal_precedents_applicable: List[str] = Field(
        default=[], description="Applicable legal precedents"
    )
    recommended_legal_actions: List[str] = Field(
        default=[], description="Recommended legal actions"
    )


class AreaAnalysis(BaseModel):
    """Schema for geographic area analysis"""

    area_name: str = Field(..., description="Area name or description")
    center_latitude: float = Field(..., description="Area center latitude")
    center_longitude: float = Field(..., description="Area center longitude")
    radius_meters: float = Field(..., description="Analysis radius")

    # Flight activity
    total_overflights: int = Field(..., description="Total overflights")
    unique_aircraft: int = Field(..., description="Number of unique aircraft")
    total_flight_time_minutes: float = Field(
        ..., description="Total time aircraft spent over area"
    )

    # Behavior patterns
    hovering_events: int = Field(default=0, description="Hovering events")
    low_altitude_events: int = Field(default=0, description="Low altitude events")
    night_flights: int = Field(default=0, description="Night flights")

    # Privacy analysis
    residential_density: Optional[float] = Field(
        None, description="Residential density"
    )
    privacy_expectation_level: str = Field(..., description="Expected privacy level")
    constitutional_concern_level: int = Field(
        ..., description="Constitutional concern 1-5"
    )


class TimeAnalysis(BaseModel):
    """Schema for temporal pattern analysis"""

    analysis_type: str = Field(..., description="hourly, daily, weekly, monthly")
    time_periods: List[str] = Field(..., description="Time period labels")
    flight_counts: List[int] = Field(..., description="Flight counts per period")
    flight_hours: List[float] = Field(..., description="Flight hours per period")
    cost_estimates: List[float] = Field(..., description="Cost estimates per period")

    # Pattern insights
    peak_activity_periods: List[str] = Field(
        default=[], description="Peak activity periods"
    )
    unusual_activity_periods: List[Dict[str, Any]] = Field(
        default=[], description="Unusual activity periods"
    )
    surveillance_likelihood_by_period: Dict[str, float] = Field(
        default={}, description="Surveillance likelihood by time"
    )


class RealTimeAlert(BaseModel):
    """Schema for real-time surveillance alerts"""

    alert_id: str = Field(..., description="Unique alert identifier")
    alert_type: str = Field(..., description="Type of alert")
    aircraft_registration: str = Field(..., description="Aircraft registration")
    location: Dict[str, float] = Field(..., description="Current location")
    altitude_feet: Optional[int] = Field(None, description="Current altitude")
    behavior_description: str = Field(..., description="Behavior description")
    privacy_concern_level: int = Field(..., description="Privacy concern level 1-5")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    active: bool = Field(default=True, description="Is alert still active")
