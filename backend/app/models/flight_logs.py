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


class FlightPosition(Base):
    __tablename__ = "flight_positions"

    id = Column(Integer, primary_key=True, index=True)
    flight_log_id = Column(
        Integer, ForeignKey("flight_logs.id"), nullable=False, index=True
    )
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False, index=True)

    # Position data
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    altitude_feet = Column(Integer)

    # Flight dynamics
    ground_speed_knots = Column(Float)
    track_degrees = Column(Float)  # Direction of travel
    vertical_rate = Column(Float)  # Rate of climb/descent

    # Special activities
    is_hovering = Column(Boolean, default=False, index=True)
    hover_duration_seconds = Column(Integer)
    is_circling = Column(Boolean, default=False)
    circle_radius_feet = Column(Float)

    # Location context
    neighborhood = Column(String(100), index=True)  # Detected neighborhood
    address_nearby = Column(String(200))  # Nearest address if available
    land_use_type = Column(String(50))  # residential, commercial, industrial

    # Privacy analysis
    over_private_property = Column(Boolean, index=True)
    altitude_privacy_concern = Column(Boolean)  # True if below reasonable expectation
    duration_at_location = Column(Integer)  # Seconds spent within 100ft radius

    # Data quality
    position_accuracy_meters = Column(Float)  # GPS accuracy
    data_source = Column(String(50))  # 'flightradar24', 'flightradar24_historical', 'interpolated'

    # Relationships
    flight_log = relationship("FlightLog", back_populates="positions")
    aircraft = relationship("Aircraft", back_populates="positions")

    # Indexes for geospatial and time-based queries
    __table_args__ = (
        Index("idx_positions_location", "latitude", "longitude"),
        Index("idx_positions_time_aircraft", "timestamp", "aircraft_id"),
        Index("idx_positions_hovering", "is_hovering", "hover_duration_seconds"),
        Index(
            "idx_positions_privacy", "over_private_property", "altitude_privacy_concern"
        ),
    )

    def __repr__(self):
        return f"<FlightPosition(id={self.id}, time={self.timestamp}, lat={self.latitude}, lon={self.longitude})>"
