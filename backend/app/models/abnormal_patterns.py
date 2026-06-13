"""
SQLAlchemy model for storing detected abnormal flight patterns
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


class AbnormalPattern(Base):
    __tablename__ = "abnormal_patterns"

    id = Column(Integer, primary_key=True, index=True)
    flight_log_id = Column(
        Integer, ForeignKey("flight_logs.id"), nullable=False, index=True
    )

    # Pattern classification
    pattern_type = Column(
        String(50), nullable=False, index=True
    )  # sky_writing, excessive_hovering, repetitive_circling, etc.
    confidence_score = Column(Float, nullable=False)  # 0.0 to 1.0

    # Detection details
    detection_metadata = Column(
        JSONB, nullable=False
    )  # Stores all metrics and analysis
    detected_at = Column(DateTime(timezone=True), server_default=func.now())

    # Human review
    reviewed = Column(
        String(10), default="pending", index=True
    )  # pending, confirmed, false_positive
    review_notes = Column(Text)
    reviewed_by = Column(String(100))
    reviewed_at = Column(DateTime(timezone=True))

    # Legal relevance
    legal_relevance = Column(String(20))  # high, medium, low
    potential_violation = Column(Text)  # Description of potential policy/law violation

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # Relationships
    flight_log = relationship("FlightLog", back_populates="abnormal_patterns")
