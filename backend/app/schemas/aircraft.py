from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class AircraftBase(BaseModel):
    """Base aircraft schema with common fields"""

    registration: str = Field(..., description="Aircraft N-number registration")
    icao_code: Optional[str] = Field(None, description="ICAO 24-bit address")
    make: Optional[str] = Field(None, description="Aircraft manufacturer")
    model: Optional[str] = Field(None, description="Aircraft model")
    year_manufactured: Optional[int] = Field(None, description="Year manufactured")
    is_phoenix_pd: bool = Field(
        default=False, description="Is this a Phoenix PD aircraft"
    )
    unit_designation: Optional[str] = Field(
        None, description="Unit designation (e.g., Air15)"
    )
    has_flir: Optional[bool] = Field(default=False, description="Has FLIR camera")
    has_spotlight: Optional[bool] = Field(default=False, description="Has searchlight")
    has_loudspeaker: Optional[bool] = Field(default=False, description="Has loudspeaker")
    max_flight_time_minutes: Optional[int] = Field(
        None, description="Maximum flight time"
    )
    hourly_operating_cost: Optional[float] = Field(
        default=2160.0, description="Operating cost per hour"
    )
    purchase_cost: Optional[float] = Field(None, description="Purchase cost")
    annual_maintenance_cost: Optional[float] = Field(
        None, description="Annual maintenance cost"
    )
    is_active: bool = Field(default=True, description="Is aircraft active")
    notes: Optional[str] = Field(None, description="Additional notes")


class AircraftCreate(AircraftBase):
    """Schema for creating new aircraft"""

    pass


class AircraftUpdate(BaseModel):
    """Schema for updating existing aircraft"""

    registration: Optional[str] = None
    icao_code: Optional[str] = None
    make: Optional[str] = None
    model: Optional[str] = None
    year_manufactured: Optional[int] = None
    is_phoenix_pd: Optional[bool] = None
    unit_designation: Optional[str] = None
    has_flir: Optional[bool] = None
    has_spotlight: Optional[bool] = None
    has_loudspeaker: Optional[bool] = None
    max_flight_time_minutes: Optional[int] = None
    hourly_operating_cost: Optional[float] = None
    purchase_cost: Optional[float] = None
    annual_maintenance_cost: Optional[float] = None
    is_active: Optional[bool] = None
    notes: Optional[str] = None


class Aircraft(AircraftBase):
    """Full aircraft schema with database fields"""

    id: int
    last_seen: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AircraftList(BaseModel):
    """Schema for aircraft list responses"""

    aircraft: List[Aircraft]
    total: int
    page: int
    size: int
