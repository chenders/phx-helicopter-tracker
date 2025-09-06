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


class LegalDocument(Base):
    __tablename__ = "legal_documents"

    id = Column(Integer, primary_key=True, index=True)

    # Document identification
    title = Column(String(200), nullable=False, index=True)
    document_type = Column(
        String(50), nullable=False, index=True
    )  # flight_analysis, pattern_report, etc.
    description = Column(Text)

    # Analysis parameters
    date_range_start = Column(DateTime(timezone=True), index=True)
    date_range_end = Column(DateTime(timezone=True), index=True)
    geographic_area = Column(String(200))  # Description of geographic area analyzed
    aircraft_filter = Column(ARRAY(String))  # Aircraft registrations included
    incident_filter = Column(ARRAY(Integer))  # Incident/Flight IDs included
    analysis_parameters = Column(JSONB)  # Analysis configuration

    # Export configuration
    export_format = Column(String(10), default="pdf")  # pdf, docx, csv, json
    include_maps = Column(Boolean, default=True)
    include_raw_data = Column(Boolean, default=False)

    # Document content
    attorney_notes = Column(Text)
    executive_summary = Column(Text)
    findings = Column(JSONB)  # Structured findings data
    recommendations = Column(JSONB)  # Legal recommendations

    # File information
    file_path = Column(String(500))  # Generated document path
    file_size_bytes = Column(Integer)
    generation_status = Column(
        String(20), default="pending", index=True
    )  # pending, generating, completed, failed

    # Generation metadata
    generated_at = Column(DateTime(timezone=True), index=True)
    generation_duration_seconds = Column(Integer)
    error_message = Column(Text)

    # Usage tracking
    download_count = Column(Integer, default=0)
    last_downloaded = Column(DateTime(timezone=True))

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Indexes
    __table_args__ = (
        Index("idx_legal_docs_type_status", "document_type", "generation_status"),
        Index("idx_legal_docs_date_range", "date_range_start", "date_range_end"),
        Index("idx_legal_docs_generated", "generated_at", "download_count"),
    )

    def __repr__(self):
        return f"<LegalDocument(id={self.id}, type='{self.document_type}', title='{self.title[:50]}...', status='{self.generation_status}')>"


class ConstitutionalAnalysis(Base):
    __tablename__ = "constitutional_analyses"

    id = Column(Integer, primary_key=True, index=True)

    # Analysis scope
    analysis_name = Column(String(200), nullable=False)
    date_range_start = Column(DateTime(timezone=True), nullable=False, index=True)
    date_range_end = Column(DateTime(timezone=True), nullable=False, index=True)
    geographic_scope = Column(String(200))  # Description of area analyzed

    # Fourth Amendment analysis
    fourth_amendment_violations = Column(JSONB)  # Structured violation data
    privacy_expectation_analysis = Column(JSONB)  # Privacy expectation findings
    surveillance_patterns = Column(JSONB)  # Detected surveillance patterns

    # Pattern analysis results
    systematic_surveillance_detected = Column(Boolean, default=False, index=True)
    surveillance_intensity_score = Column(
        Float, default=0.0, index=True
    )  # 0-1 intensity score
    targeted_areas = Column(JSONB)  # Areas under targeted surveillance

    # Legal precedent analysis
    applicable_precedents = Column(JSONB)  # Relevant case law
    precedent_violations = Column(JSONB)  # How current practices violate precedent

    # Discriminatory impact analysis
    discriminatory_impact_detected = Column(Boolean, default=False, index=True)
    demographic_analysis = Column(JSONB)  # Analysis by demographic areas
    disparate_impact_score = Column(Float, default=0.0)  # 0-1 disparity score

    # Statistical findings
    total_flights_analyzed = Column(Integer, nullable=False)
    total_surveillance_events = Column(Integer, default=0)
    average_surveillance_duration = Column(Float)  # Average duration in minutes
    cost_of_surveillance = Column(Float)  # Total estimated cost

    # Legal recommendations
    recommended_legal_actions = Column(JSONB)  # Recommended legal strategies
    injunction_grounds = Column(JSONB)  # Grounds for injunctive relief
    damages_analysis = Column(JSONB)  # Potential damages analysis

    # Analysis metadata
    methodology_notes = Column(Text)  # Analysis methodology description
    confidence_score = Column(Float, default=0.0)  # Confidence in findings 0-1
    peer_reviewed = Column(Boolean, default=False)
    reviewer_notes = Column(Text)

    # Related documents
    legal_document_id = Column(Integer, ForeignKey("legal_documents.id"), index=True)
    legal_document = relationship("LegalDocument", backref="constitutional_analyses")

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    analyst_name = Column(String(100))  # Name of person conducting analysis

    # Indexes
    __table_args__ = (
        Index(
            "idx_const_analysis_violations",
            "systematic_surveillance_detected",
            "discriminatory_impact_detected",
        ),
        Index(
            "idx_const_analysis_scores",
            "surveillance_intensity_score",
            "confidence_score",
        ),
        Index("idx_const_analysis_date_range", "date_range_start", "date_range_end"),
    )

    def __repr__(self):
        return f"<ConstitutionalAnalysis(id={self.id}, name='{self.analysis_name}', violations={self.systematic_surveillance_detected})>"


class LegalPrecedent(Base):
    __tablename__ = "legal_precedents"

    id = Column(Integer, primary_key=True, index=True)

    # Case information
    case_name = Column(String(200), nullable=False, index=True)
    citation = Column(String(100), nullable=False, index=True)
    court = Column(String(100), nullable=False)
    decision_date = Column(DateTime(timezone=True), nullable=False, index=True)

    # Legal details
    case_summary = Column(Text)
    holding = Column(Text, nullable=False)  # The court's holding
    legal_principle = Column(Text)  # Key legal principle established

    # Relevance to helicopter surveillance
    surveillance_relevance = Column(
        Float, default=0.0, index=True
    )  # 0-1 relevance score
    fourth_amendment_analysis = Column(Text)  # Fourth Amendment analysis from case
    privacy_analysis = Column(Text)  # Privacy expectation analysis

    # Case categorization
    case_type = Column(
        String(50), index=True
    )  # aerial_surveillance, privacy, fourth_amendment
    jurisdiction = Column(String(50), index=True)  # federal, state, local
    binding_precedent = Column(
        Boolean, default=False, index=True
    )  # Is this binding in our jurisdiction?

    # Supporting information
    key_facts = Column(JSONB)  # Key facts from case
    distinguishing_factors = Column(JSONB)  # Factors that distinguish this case
    supporting_authority = Column(JSONB)  # Other cases cited

    # Usage tracking
    citation_count = Column(Integer, default=0)  # How often we've cited this case
    last_cited = Column(DateTime(timezone=True))

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    added_by = Column(String(100))  # Who added this precedent
    notes = Column(Text)

    # Indexes
    __table_args__ = (
        Index(
            "idx_precedents_relevance", "surveillance_relevance", "binding_precedent"
        ),
        Index("idx_precedents_type_jurisdiction", "case_type", "jurisdiction"),
        Index("idx_precedents_court_date", "court", "decision_date"),
    )

    def __repr__(self):
        return f"<LegalPrecedent(id={self.id}, case='{self.case_name}', citation='{self.citation}', relevance={self.surveillance_relevance})>"
