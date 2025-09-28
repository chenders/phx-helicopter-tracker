"""
Flight Position Model - Updated with PostGIS support
"""
from sqlalchemy import Column, Integer, Float, Boolean, DateTime, String, ForeignKey, Index
from sqlalchemy.orm import relationship
from geoalchemy2 import Geography

from app.db.database import Base


class FlightPosition(Base):
    """Position data for flights with PostGIS spatial support"""
    __tablename__ = "flight_positions"

    id = Column(Integer, primary_key=True, index=True)
    flight_log_id = Column(Integer, ForeignKey("flight_logs.id"), nullable=False, index=True)
    aircraft_id = Column(Integer, ForeignKey("aircraft.id"), nullable=False)
    timestamp = Column(DateTime(timezone=True), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)

    # PostGIS spatial column for efficient geographic queries
    location = Column(Geography(geometry_type='POINT', srid=4326), nullable=True)

    altitude_feet = Column(Integer)
    ground_elevation_feet = Column(Integer)  # Elevation of ground at this position
    altitude_agl_feet = Column(Integer)  # Altitude Above Ground Level
    ground_speed_knots = Column(Float)
    track_degrees = Column(Float)
    vertical_rate = Column(Float)

    # Behavior flags
    is_hovering = Column(Boolean, default=False)
    hover_duration_seconds = Column(Integer)
    is_circling = Column(Boolean, default=False)
    circle_radius_feet = Column(Float)

    # Location context
    neighborhood = Column(String(100))
    address_nearby = Column(String(200))
    land_use_type = Column(String(50))  # residential, commercial, industrial, etc.
    over_private_property = Column(Boolean)

    # Privacy analysis
    altitude_privacy_concern = Column(Boolean)  # True if below legal minimums
    duration_at_location = Column(Integer)  # seconds spent in area
    position_accuracy_meters = Column(Float)
    data_source = Column(String(50))  # flightradar24, adsb_exchange, etc.

    # Relationships
    flight_log = relationship("FlightLog", back_populates="positions")
    aircraft = relationship("Aircraft")

    # Indexes for common queries
    __table_args__ = (
        Index('idx_positions_flight_timestamp', 'flight_log_id', 'timestamp'),
        Index('idx_positions_location', 'location', postgresql_using='gist'),
        Index('idx_positions_hovering', 'is_hovering', 'hover_duration_seconds'),
    )