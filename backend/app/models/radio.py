"""
Radio transcription models for police radio archive analysis

Stores radio archives, transcriptions, segments, and extracted keywords
for correlation with flight data and pattern analysis.
"""
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
from sqlalchemy.dialects.postgresql import JSONB, ARRAY

from app.db.database import Base


class RadioArchive(Base):
    """
    Radio archive file metadata
    Represents a single MP3 file downloaded from Broadcastify
    """
    __tablename__ = "radio_archives"

    id = Column(Integer, primary_key=True, index=True)

    # File identification
    filename = Column(String(255), unique=True, nullable=False, index=True)
    file_path = Column(String(512), nullable=False)
    file_size_bytes = Column(Integer)

    # Broadcastify metadata
    feed_id = Column(String(20), index=True)  # e.g., "12145" for Phoenix PD
    feed_name = Column(String(100))  # e.g., "Phoenix Police"

    # Recording time metadata (extracted from filename or metadata)
    recording_start = Column(DateTime(timezone=True), index=True)
    recording_end = Column(DateTime(timezone=True), index=True)
    duration_seconds = Column(Integer)

    # Download tracking
    downloaded_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    download_source = Column(String(100))  # 'broadcastify', 'manual', etc.

    # Audio metadata
    audio_format = Column(String(20))  # 'mp3', 'wav', etc.
    sample_rate = Column(Integer)
    bitrate = Column(Integer)

    # Processing status
    transcribed = Column(Boolean, default=False, index=True)
    analyzed = Column(Boolean, default=False, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    transcription = relationship("RadioTranscription", back_populates="archive", uselist=False, cascade="all, delete-orphan")

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_radio_archives_time_range", "recording_start", "recording_end"),
        Index("idx_radio_archives_feed_time", "feed_id", "recording_start"),
        Index("idx_radio_archives_status", "transcribed", "analyzed"),
    )

    def __repr__(self):
        return f"<RadioArchive(id={self.id}, filename={self.filename}, recording_start={self.recording_start})>"


class RadioTranscription(Base):
    """
    Full transcription of a radio archive
    Stores the complete transcription with model metadata
    """
    __tablename__ = "radio_transcriptions"

    id = Column(Integer, primary_key=True, index=True)
    archive_id = Column(Integer, ForeignKey("radio_archives.id"), unique=True, nullable=False, index=True)

    # Transcription content
    full_text = Column(Text, nullable=False)  # Complete transcription
    language = Column(String(10), default="en")  # Detected language

    # Whisper model metadata
    model_name = Column(String(50), index=True)  # 'tiny', 'base', 'small', 'medium', 'large'
    model_version = Column(String(50))

    # Transcription quality metrics
    confidence_score = Column(Float)  # Average confidence across all segments
    no_speech_probability = Column(Float)  # Probability of silence/no speech

    # Processing metadata
    transcribed_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    transcription_time_seconds = Column(Float)  # Time taken to transcribe
    worker_hostname = Column(String(100))  # Which worker processed this

    # Additional Whisper output
    detected_language_probability = Column(Float)
    whisper_metadata = Column(JSONB)  # Additional metadata from Whisper

    # Analysis flags
    keywords_extracted = Column(Boolean, default=False, index=True)
    entities_extracted = Column(Boolean, default=False, index=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    archive = relationship("RadioArchive", back_populates="transcription")
    segments = relationship("RadioSegment", back_populates="transcription", cascade="all, delete-orphan")
    keywords = relationship("RadioKeyword", back_populates="transcription", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (
        Index("idx_radio_transcriptions_quality", "confidence_score", "no_speech_probability"),
        Index("idx_radio_transcriptions_model", "model_name", "transcribed_at"),
    )

    def __repr__(self):
        return f"<RadioTranscription(id={self.id}, archive_id={self.archive_id}, model={self.model_name})>"


class RadioSegment(Base):
    """
    Individual timestamped segments from transcription
    Allows for fine-grained analysis and correlation with flight data
    """
    __tablename__ = "radio_segments"

    id = Column(Integer, primary_key=True, index=True)
    transcription_id = Column(Integer, ForeignKey("radio_transcriptions.id"), nullable=False, index=True)

    # Segment identification
    segment_index = Column(Integer, nullable=False)  # Order within transcription

    # Timing information
    start_time = Column(Float, nullable=False)  # Seconds from start of audio
    end_time = Column(Float, nullable=False)
    duration_seconds = Column(Float)

    # Absolute timestamp (recording_start + start_time)
    absolute_timestamp = Column(DateTime(timezone=True), index=True)

    # Content
    text = Column(Text, nullable=False)

    # Quality metrics
    confidence = Column(Float)  # Whisper confidence for this segment
    no_speech_prob = Column(Float)  # Probability this is silence

    # Analysis results
    contains_tail_number = Column(Boolean, default=False, index=True)  # Mentions aircraft registration
    contains_location = Column(Boolean, default=False, index=True)  # Mentions street/address
    contains_incident_code = Column(Boolean, default=False, index=True)  # 10-codes, etc.
    urgency_score = Column(Float)  # 0-1 score for urgency/priority

    # Extracted entities (JSON arrays)
    tail_numbers = Column(ARRAY(String))  # e.g., ["N621FB", "N623FB"]
    locations = Column(ARRAY(String))  # e.g., ["Central Ave", "Camelback Rd"]
    incident_codes = Column(ARRAY(String))  # e.g., ["10-33", "Code 3"]

    # Additional metadata
    segment_metadata = Column(JSONB)  # Additional Whisper segment data

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transcription = relationship("RadioTranscription", back_populates="segments")

    # Indexes for efficient querying
    __table_args__ = (
        Index("idx_radio_segments_time", "absolute_timestamp"),
        Index("idx_radio_segments_transcript_time", "transcription_id", "start_time"),
        Index("idx_radio_segments_content_flags", "contains_tail_number", "contains_location", "contains_incident_code"),
        Index("idx_radio_segments_urgency", "urgency_score"),
    )

    def __repr__(self):
        return f"<RadioSegment(id={self.id}, time={self.start_time:.1f}s, text='{self.text[:50]}...')>"


class RadioKeyword(Base):
    """
    Extracted keywords and phrases from radio transcriptions
    Tracks frequency and context for pattern analysis
    """
    __tablename__ = "radio_keywords"

    id = Column(Integer, primary_key=True, index=True)
    transcription_id = Column(Integer, ForeignKey("radio_transcriptions.id"), nullable=False, index=True)

    # Keyword information
    keyword = Column(String(100), nullable=False, index=True)  # The actual keyword/phrase
    keyword_type = Column(String(50), index=True)  # 'tail_number', 'location', 'incident_code', 'person', 'action'

    # Frequency and context
    occurrence_count = Column(Integer, default=1)  # How many times in this transcription
    first_occurrence_time = Column(Float)  # Seconds from start of audio
    context_snippet = Column(Text)  # Surrounding text for context

    # Metadata
    confidence = Column(Float)  # Confidence in extraction
    extracted_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    transcription = relationship("RadioTranscription", back_populates="keywords")

    # Indexes
    __table_args__ = (
        Index("idx_radio_keywords_keyword_type", "keyword", "keyword_type"),
        Index("idx_radio_keywords_frequency", "keyword", "occurrence_count"),
    )

    def __repr__(self):
        return f"<RadioKeyword(id={self.id}, keyword='{self.keyword}', type={self.keyword_type}, count={self.occurrence_count})>"


class FlightRadioCorrelation(Base):
    """
    Correlation between flight events and radio communications
    Links specific radio segments to flight activities
    """
    __tablename__ = "flight_radio_correlations"

    id = Column(Integer, primary_key=True, index=True)

    # Flight reference
    flight_log_id = Column(Integer, ForeignKey("flight_logs.id"), nullable=False, index=True)

    # Radio reference
    radio_segment_id = Column(Integer, ForeignKey("radio_segments.id"), nullable=False, index=True)

    # Correlation metadata
    correlation_type = Column(String(50), index=True)  # 'tail_number_mention', 'location_match', 'time_proximity'
    correlation_strength = Column(Float)  # 0-1 confidence score

    # Timing information
    time_difference_seconds = Column(Float)  # Difference between radio mention and flight event

    # Context
    correlation_notes = Column(Text)  # What specifically correlates
    matched_keywords = Column(ARRAY(String))  # Keywords that matched

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)

    # Relationships
    flight_log = relationship("FlightLog")
    radio_segment = relationship("RadioSegment")

    # Indexes
    __table_args__ = (
        Index("idx_flight_radio_corr_flight", "flight_log_id", "correlation_type"),
        Index("idx_flight_radio_corr_strength", "correlation_strength"),
    )

    def __repr__(self):
        return f"<FlightRadioCorrelation(flight={self.flight_log_id}, segment={self.radio_segment_id}, type={self.correlation_type})>"
