from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class TrackingSource(str, Enum):
    """Data sources for tracking"""

    FLIGHTRADAR24 = "flightradar24"
    MANUAL = "manual"
    COMMUNITY = "community"


class AlertType(str, Enum):
    """Types of tracking alerts"""

    LOW_ALTITUDE = "low_altitude"
    HOVERING = "hovering"
    CIRCLING = "circling"
    SURVEILLANCE_PATTERN = "surveillance_pattern"
    RESIDENTIAL_OVERFLIGHT = "residential_overflight"
    EXTENDED_OBSERVATION = "extended_observation"


class LiveTrackingData(BaseModel):
    """Schema for live tracking data"""

    aircraft_registration: str = Field(..., description="Aircraft registration")
    icao_code: Optional[str] = Field(None, description="ICAO address")
    callsign: Optional[str] = Field(None, description="Flight callsign")
    timestamp: datetime = Field(..., description="Position timestamp")
    latitude: float = Field(..., description="Current latitude")
    longitude: float = Field(..., description="Current longitude")
    altitude_feet: Optional[int] = Field(None, description="Current altitude")
    ground_speed_knots: Optional[float] = Field(None, description="Ground speed")
    track_degrees: Optional[float] = Field(None, description="Track direction")
    vertical_rate: Optional[float] = Field(None, description="Vertical rate")
    is_phoenix_pd: bool = Field(default=False, description="Is Phoenix PD aircraft")
    data_source: TrackingSource = Field(..., description="Data source")
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw tracking data")

    # Derived analytics
    is_hovering: bool = Field(default=False, description="Currently hovering")
    is_circling: bool = Field(default=False, description="Currently circling")
    over_residential: bool = Field(default=False, description="Over residential area")
    privacy_concern: bool = Field(default=False, description="Privacy concern flag")


class TrackingAlert(BaseModel):
    """Schema for tracking alerts"""

    alert_id: str = Field(..., description="Unique alert identifier")
    aircraft_registration: str = Field(..., description="Aircraft registration")
    alert_type: AlertType = Field(..., description="Type of alert")
    location: Dict[str, float] = Field(..., description="Alert location")
    timestamp: datetime = Field(..., description="Alert timestamp")
    severity: int = Field(..., description="Alert severity 1-5")
    description: str = Field(..., description="Alert description")
    duration_seconds: Optional[int] = Field(
        None, description="Duration of concerning behavior"
    )
    auto_generated: bool = Field(
        default=True, description="Automatically generated alert"
    )
    acknowledged: bool = Field(default=False, description="Has been acknowledged")
    resolved: bool = Field(default=False, description="Has been resolved")


class TrackingSubscription(BaseModel):
    """Schema for tracking subscriptions"""

    subscription_id: str = Field(..., description="Unique subscription identifier")
    user_id: Optional[str] = Field(None, description="User identifier")
    area_name: str = Field(..., description="Subscription area name")
    center_latitude: float = Field(..., description="Center latitude")
    center_longitude: float = Field(..., description="Center longitude")
    radius_meters: float = Field(..., description="Subscription radius")
    alert_types: List[AlertType] = Field(..., description="Alert types to monitor")
    notification_methods: List[str] = Field(
        default=["websocket"], description="Notification methods"
    )
    active: bool = Field(default=True, description="Subscription active")
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AircraftTrackingStatus(BaseModel):
    """Schema for aircraft tracking status"""

    aircraft_registration: str = Field(..., description="Aircraft registration")
    last_seen: Optional[datetime] = Field(None, description="Last seen timestamp")
    current_location: Optional[Dict[str, float]] = Field(
        None, description="Current location if active"
    )
    is_airborne: bool = Field(default=False, description="Currently airborne")
    flight_duration_minutes: Optional[int] = Field(
        None, description="Current flight duration"
    )
    tracking_quality: str = Field(
        default="unknown", description="Tracking data quality"
    )
    data_source: TrackingSource = Field(..., description="Primary data source")


class FlightRadar24Import(BaseModel):
    """Schema for FlightRadar24 data import"""

    import_id: str = Field(..., description="Import batch identifier")
    aircraft_registration: str = Field(..., description="Aircraft registration")
    file_format: str = Field(..., description="Data format (KML, CSV)")
    file_path: str = Field(..., description="Uploaded file path")
    date_range_start: datetime = Field(..., description="Data start date")
    date_range_end: datetime = Field(..., description="Data end date")
    total_positions: int = Field(..., description="Total position records")
    processed_positions: int = Field(
        default=0, description="Processed position records"
    )
    import_status: str = Field(default="pending", description="Import status")
    error_message: Optional[str] = Field(None, description="Error message if failed")


class TrackingStats(BaseModel):
    """Schema for tracking statistics"""

    total_aircraft_tracked: int = Field(..., description="Total aircraft being tracked")
    phoenix_pd_aircraft_active: int = Field(
        ..., description="Active Phoenix PD aircraft"
    )
    alerts_last_24h: int = Field(..., description="Alerts in last 24 hours")
    data_sources_active: List[str] = Field(..., description="Active data sources")
    last_update: datetime = Field(..., description="Last data update")
    tracking_coverage_percent: float = Field(
        ..., description="Tracking coverage percentage"
    )
    # Additional fields for frontend dashboard
    flights_today: Optional[int] = Field(0, description="Number of flights today")
    surveillance_flights_today: Optional[int] = Field(
        0, description="Number of surveillance flights today"
    )
    total_flight_hours_today: Optional[float] = Field(
        0.0, description="Total flight hours today"
    )
    helicopters_in_air: Optional[int] = Field(
        0, description="Current helicopters in air"
    )

    # Dashboard-specific fields expected by frontend
    active_flights: Optional[int] = Field(0, description="Currently active flights")
    surveillance_incidents_today: Optional[int] = Field(
        0, description="Surveillance incidents detected today"
    )
    total_cost_today: Optional[float] = Field(
        0.0, description="Total operational cost today in dollars"
    )
    pattern_alerts: Optional[int] = Field(0, description="Pattern analysis alerts")
