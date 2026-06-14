from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class FlightLogBase(BaseModel):
    """Base flight log schema"""

    aircraft_id: int = Field(..., description="Aircraft ID")
    flight_id: Optional[str] = Field(None, description="Internal flight tracking ID")
    callsign: Optional[str] = Field(None, description="Radio callsign")
    departure_time: Optional[datetime] = Field(
        None, description="Flight departure time"
    )
    arrival_time: Optional[datetime] = Field(None, description="Flight arrival time")
    flight_duration_minutes: Optional[float] = Field(
        None, description="Flight duration in minutes"
    )
    departure_airport: Optional[str] = Field(
        None, description="Departure airport ICAO code"
    )
    arrival_airport: Optional[str] = Field(
        None, description="Arrival airport ICAO code"
    )
    max_altitude_feet: Optional[int] = Field(
        None, description="Maximum altitude reached"
    )
    min_altitude_feet: Optional[int] = Field(
        None, description="Minimum altitude recorded"
    )
    avg_altitude_feet: Optional[int] = Field(None, description="Average altitude")
    max_altitude_agl_feet: Optional[int] = Field(
        None, description="Maximum AGL altitude"
    )
    min_altitude_agl_feet: Optional[int] = Field(
        None, description="Minimum AGL altitude"
    )
    avg_altitude_agl_feet: Optional[int] = Field(
        None, description="Average AGL altitude"
    )
    estimated_cost: Optional[float] = Field(None, description="Estimated flight cost")
    fuel_consumed_gallons: Optional[float] = Field(None, description="Fuel consumed")
    data_source: str = Field(
        default="manual", description="Data source (flightradar24, manual)"
    )
    raw_data: Optional[Dict[str, Any]] = Field(None, description="Raw tracking data")
    area_coverage: Optional[Dict[str, Any]] = Field(
        None, description="Geographic areas covered"
    )
    hover_locations: Optional[Dict[str, Any]] = Field(
        None, description="Hover locations"
    )
    low_altitude_segments: Optional[Dict[str, Any]] = Field(
        None, description="Low altitude segments"
    )
    surveillance_types: Optional[Dict[str, Any]] = Field(
        None, description="Detected surveillance patterns"
    )
    pattern_notes: Optional[str] = Field(None, description="Pattern analysis notes")
    surveillance_likelihood: Optional[float] = Field(
        None, description="Surveillance probability (0-1)"
    )
    privacy_concern_level: Optional[int] = Field(
        None, description="Privacy concern level (1-5)"
    )
    legal_notes: Optional[str] = Field(None, description="Legal relevance notes")


class FlightLogCreate(FlightLogBase):
    """Schema for creating flight logs"""

    pass


class FlightLogUpdate(BaseModel):
    """Schema for updating flight logs"""

    aircraft_id: Optional[int] = None
    flight_id: Optional[str] = None
    callsign: Optional[str] = None
    departure_time: Optional[datetime] = None
    arrival_time: Optional[datetime] = None
    flight_duration_minutes: Optional[float] = None
    departure_airport: Optional[str] = None
    arrival_airport: Optional[str] = None
    max_altitude_feet: Optional[int] = None
    min_altitude_feet: Optional[int] = None
    avg_altitude_feet: Optional[int] = None
    max_altitude_agl_feet: Optional[int] = None
    min_altitude_agl_feet: Optional[int] = None
    avg_altitude_agl_feet: Optional[int] = None
    estimated_cost: Optional[float] = None
    fuel_consumed_gallons: Optional[float] = None
    data_source: Optional[str] = None
    raw_data: Optional[Dict[str, Any]] = None
    area_coverage: Optional[Dict[str, Any]] = None
    hover_locations: Optional[Dict[str, Any]] = None
    low_altitude_segments: Optional[Dict[str, Any]] = None
    surveillance_types: Optional[Dict[str, Any]] = None
    pattern_notes: Optional[str] = None
    surveillance_likelihood: Optional[float] = None
    privacy_concern_level: Optional[int] = None
    legal_notes: Optional[str] = None


class FlightLog(FlightLogBase):
    """Full flight log schema with database fields"""

    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class FlightLogList(BaseModel):
    """Schema for flight log list responses"""

    flights: List[FlightLog]
    total: int
    page: int
    size: int


class FlightPositionBase(BaseModel):
    """Base flight position schema"""

    flight_log_id: int = Field(..., description="Flight log ID")
    aircraft_id: int = Field(..., description="Aircraft ID")
    timestamp: datetime = Field(..., description="Position timestamp")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    altitude_feet: Optional[int] = Field(None, description="Altitude in feet")
    ground_elevation_feet: Optional[int] = Field(
        None, description="Ground elevation in feet"
    )
    altitude_agl_feet: Optional[int] = Field(None, description="Altitude AGL in feet")
    ground_speed_knots: Optional[float] = Field(
        None, description="Ground speed in knots"
    )
    track_degrees: Optional[float] = Field(
        None, description="Track direction in degrees"
    )
    vertical_rate: Optional[float] = Field(None, description="Vertical rate ft/min")
    is_hovering: bool = Field(default=False, description="Is aircraft hovering")
    hover_duration_seconds: Optional[int] = Field(None, description="Hover duration")
    is_circling: bool = Field(default=False, description="Is aircraft circling")
    circle_radius_feet: Optional[float] = Field(None, description="Circle radius")
    neighborhood: Optional[str] = Field(None, description="Neighborhood name")
    address_nearby: Optional[str] = Field(None, description="Nearby address")
    land_use_type: Optional[str] = Field(None, description="Land use type")
    over_private_property: Optional[bool] = Field(
        None, description="Over private property"
    )
    altitude_privacy_concern: Optional[bool] = Field(
        None, description="Low altitude privacy concern"
    )
    duration_at_location: Optional[int] = Field(
        None, description="Duration at location (seconds)"
    )
    position_accuracy_meters: Optional[float] = Field(None, description="GPS accuracy")
    data_source: str = Field(default="flightradar24", description="Data source")


class FlightPositionCreate(FlightPositionBase):
    """Schema for creating flight positions"""

    pass


class FlightPosition(FlightPositionBase):
    """Full flight position schema with database fields"""

    id: int

    class Config:
        from_attributes = True


class FlightPositionList(BaseModel):
    """Schema for flight position list responses"""

    positions: List[FlightPosition]
    total: int
    page: int
    size: int
