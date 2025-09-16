"""
Pydantic schemas for abnormal patterns
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime


class AbnormalPatternResponse(BaseModel):
    id: int
    flight_id: Optional[str]
    aircraft_registration: Optional[str]
    pattern_type: str
    confidence_score: float
    detected_at: datetime
    reviewed: str
    flight_date: Optional[datetime]
    duration_minutes: Optional[float]
    metadata: Dict[str, Any]

    class Config:
        from_attributes = True


class PositionPoint(BaseModel):
    lat: float
    lng: float
    alt: Optional[int]
    spd: Optional[int]
    ts: Optional[int]


class AbnormalPatternDetail(BaseModel):
    id: int
    flight_id: Optional[str]
    aircraft_registration: Optional[str]
    aircraft_type: Optional[str]
    pattern_type: str
    confidence_score: float
    detected_at: datetime
    reviewed: str
    review_notes: Optional[str]
    legal_relevance: Optional[str]
    potential_violation: Optional[str]
    flight_date: Optional[datetime]
    duration_minutes: Optional[float]
    departure_airport: Optional[str]
    arrival_airport: Optional[str]
    metadata: Dict[str, Any]
    positions: List[PositionPoint]

    class Config:
        from_attributes = True


class AbnormalPatternSummary(BaseModel):
    total_patterns: int
    pattern_types: Dict[str, int]
    review_status: Dict[str, int]
    high_confidence_count: int
    days_analyzed: int
    most_common_pattern: Optional[str]