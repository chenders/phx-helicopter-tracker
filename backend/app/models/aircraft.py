from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class Aircraft(Base):
    __tablename__ = "aircraft"

    id = Column(Integer, primary_key=True, index=True)

    # Aircraft identification
    registration = Column(
        String(10), unique=True, index=True, nullable=False
    )  # N-number
    icao_code = Column(String(6), unique=True, index=True)  # ICAO 24-bit address

    # Aircraft details
    make = Column(String(50))  # e.g., "Airbus"
    model = Column(String(50))  # e.g., "H125"
    year_manufactured = Column(Integer)

    # Phoenix PD specific
    is_phoenix_pd = Column(Boolean, default=False, index=True)
    unit_designation = Column(String(20))  # e.g., "Air15", "Air20"

    # Capabilities
    has_flir = Column(Boolean, default=False)
    has_spotlight = Column(Boolean, default=False)
    has_loudspeaker = Column(Boolean, default=False)
    max_flight_time_minutes = Column(Integer)  # Fuel capacity in flight time

    # Cost information
    hourly_operating_cost = Column(
        Float, default=2160.0
    )  # $2,160/hour per Phoenix estimate
    purchase_cost = Column(Float)
    annual_maintenance_cost = Column(Float)

    # Status
    is_active = Column(Boolean, default=True)
    last_seen = Column(DateTime(timezone=True))

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    notes = Column(Text)

    # Relationships
    flight_logs = relationship("FlightLog", back_populates="aircraft")
    positions = relationship("FlightPosition", back_populates="aircraft")

    def __repr__(self):
        return f"<Aircraft(registration='{self.registration}', model='{self.make} {self.model}', phoenix_pd={self.is_phoenix_pd})>"
