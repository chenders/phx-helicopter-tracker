"""
SQLAlchemy model for flight discoveries table
Used to store discovered flight IDs for later track download
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Text
from sqlalchemy.sql import func
from app.db.database import Base


class FlightDiscovery(Base):
    __tablename__ = "flight_discoveries"

    id = Column(Integer, primary_key=True, index=True)
    fr24_id = Column(String(20), unique=True, nullable=False, index=True)
    registration = Column(String(10), nullable=False, index=True)
    callsign = Column(String(10))
    aircraft_type = Column(String(10))
    hex_code = Column(String(10))

    # Flight times
    departure_time = Column(DateTime(timezone=True), index=True)
    arrival_time = Column(DateTime(timezone=True))
    origin_airport = Column(String(10))
    destination_airport = Column(String(10))
    flight_duration_minutes = Column(Float)
    first_seen = Column(DateTime(timezone=True))
    last_seen = Column(DateTime(timezone=True))

    # Discovery and download tracking
    discovered_at = Column(DateTime(timezone=True), server_default=func.now())
    track_downloaded = Column(Boolean, default=False, index=True)
    track_download_attempted_at = Column(DateTime(timezone=True))
    track_download_error = Column(Text)
    positions_count = Column(Integer, default=0)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
