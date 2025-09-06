from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field
from enum import Enum


class DocumentType(str, Enum):
    """Types of legal documents"""

    FLIGHT_ANALYSIS = "flight_analysis"
    PATTERN_REPORT = "pattern_report"
    COST_ANALYSIS = "cost_analysis"
    INCIDENT_SUMMARY = "incident_summary"
    SURVEILLANCE_REPORT = "surveillance_report"
    CONSTITUTIONAL_ANALYSIS = "constitutional_analysis"
    PUBLIC_RECORDS_REQUEST = "public_records_request"
    EXPERT_REPORT = "expert_report"


class DocumentFormat(str, Enum):
    """Document export formats"""

    PDF = "pdf"
    DOCX = "docx"
    CSV = "csv"
    JSON = "json"


class LegalDocumentBase(BaseModel):
    """Base legal document schema"""

    title: str = Field(..., description="Document title")
    document_type: DocumentType = Field(..., description="Type of legal document")
    description: Optional[str] = Field(None, description="Document description")
    date_range_start: Optional[datetime] = Field(
        None, description="Analysis period start"
    )
    date_range_end: Optional[datetime] = Field(None, description="Analysis period end")
    geographic_area: Optional[str] = Field(None, description="Geographic area analyzed")
    aircraft_filter: Optional[List[str]] = Field(
        None, description="Aircraft registrations included"
    )
    incident_filter: Optional[List[int]] = Field(
        None, description="Incident IDs included"
    )
    analysis_parameters: Optional[Dict[str, Any]] = Field(
        None, description="Analysis parameters"
    )
    export_format: DocumentFormat = Field(
        default=DocumentFormat.PDF, description="Export format"
    )
    include_maps: bool = Field(
        default=True, description="Include maps and visualizations"
    )
    include_raw_data: bool = Field(
        default=False, description="Include raw data appendix"
    )
    attorney_notes: Optional[str] = Field(
        None, description="Attorney notes and annotations"
    )


class LegalDocumentCreate(LegalDocumentBase):
    """Schema for creating legal documents"""

    pass


class LegalDocument(LegalDocumentBase):
    """Full legal document schema with database fields"""

    id: int
    file_path: Optional[str] = Field(None, description="Generated document file path")
    file_size_bytes: Optional[int] = Field(None, description="File size in bytes")
    generation_status: str = Field(default="pending", description="Generation status")
    generated_at: Optional[datetime] = Field(
        None, description="When document was generated"
    )
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class DocumentGenerationRequest(BaseModel):
    """Schema for document generation requests"""

    document_id: int = Field(..., description="Legal document ID to generate")
    priority: str = Field(default="normal", description="Generation priority")
    notify_email: Optional[str] = Field(
        None, description="Email for completion notification"
    )


class DocumentGenerateRequest(BaseModel):
    """Schema for direct document generation requests"""

    document_type: str = Field(..., description="Type of legal document")
    time_range: Optional[str] = Field(None, description="Time range for analysis")
    include_exhibits: bool = Field(False, description="Include supporting exhibits")
    format: str = Field(default="pdf", description="Export format (pdf, docx)")


class DocumentGenerationStatus(BaseModel):
    """Schema for document generation status"""

    document_id: int
    status: str
    progress_percent: int
    estimated_completion: Optional[datetime] = None
    error_message: Optional[str] = None


class ConstitutionalAnalysis(BaseModel):
    """Schema for constitutional analysis results"""

    fourth_amendment_violations: List[Dict[str, Any]]
    privacy_expectation_analysis: Dict[str, Any]
    surveillance_patterns: List[Dict[str, Any]]
    discriminatory_impact: Optional[Dict[str, Any]]
    precedent_cases: List[Dict[str, str]]
    recommendations: List[str]
