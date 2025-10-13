from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    DateTime,
    Boolean,
    Text,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import JSONB

from app.db.database import Base


class FlightLog(Base):
    __tablename__ = "flight_logs"

    id = Column(Integer, primary_key=True, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False, index=True)

    # Flight identification
    flight_id = Column(String(100), unique=True, index=True)  # Internal tracking ID
    callsign = Column(String(20), index=True)  # Radio callsign if available

    # Flight times
    departure_time = Column(DateTime(timezone=True), index=True)
    arrival_time = Column(DateTime(timezone=True), index=True)
    flight_duration_minutes = Column(Float)  # Calculated duration

    # Flight details
    departure_airport = Column(String(10))  # ICAO code, likely KDVT (Deer Valley)
    arrival_airport = Column(String(10))
    max_altitude_feet = Column(Integer)
    min_altitude_feet = Column(Integer)
    avg_altitude_feet = Column(Integer)

    # AGL (Above Ground Level) altitude data
    max_altitude_agl_feet = Column(Integer)
    min_altitude_agl_feet = Column(Integer)
    avg_altitude_agl_feet = Column(Integer)

    # Cost analysis
    estimated_cost = Column(Float)  # Based on flight duration * hourly rate
    fuel_consumed_gallons = Column(Float)

    # Data sources
    data_source = Column(String(50), index=True)  # 'flightradar24', 'flightradar24_historical', 'manual'
    raw_data = Column(JSONB)  # Store original tracking data

    # Flight pattern analysis
    area_coverage = Column(JSONB)  # Geographic areas covered during flight
    hover_locations = Column(JSONB)  # Locations where aircraft hovered
    low_altitude_segments = Column(JSONB)  # Segments below certain altitude

    # Surveillance pattern analysis
    surveillance_types = Column(JSONB)  # Types of surveillance patterns detected
    pattern_notes = Column(Text)  # Notes about detected patterns

    # Legal relevance
    surveillance_likelihood = Column(Float)  # 0-1 score for surveillance probability
    privacy_concern_level = Column(Integer)  # 1-5 scale
    legal_notes = Column(Text)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    aircraft = relationship("Aircraft", back_populates="flight_logs")
    positions = relationship(
        "FlightPosition", back_populates="flight_log", cascade="all, delete-orphan"
    )
    abnormal_patterns = relationship("AbnormalPattern", back_populates="flight_log")

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_flight_logs_time_range", "departure_time", "arrival_time"),
        Index("idx_flight_logs_aircraft_date", "aircraft_id", "departure_time"),
        Index(
            "idx_flight_logs_surveillance",
            "surveillance_likelihood",
            "privacy_concern_level",
        ),
    )

    def __repr__(self):
        return f"<FlightLog(id={self.id}, aircraft={self.aircraft.registration}, departure={self.departure_time})>"


# NOTE: FlightPosition model moved to flight_positions.py to support PostGIS geography column
# Import it from there to use the PostGIS-enabled version with spatial indexing
