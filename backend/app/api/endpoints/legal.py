from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.crud.legal import (
    legal_document_crud,
    constitutional_analysis_crud,
    legal_precedent_crud,
)
from app.schemas.legal import (
    LegalDocument,
    LegalDocumentCreate,
    DocumentGenerationRequest,
    DocumentGenerateRequest,
    DocumentGenerationStatus,
    ConstitutionalAnalysis,
)

router = APIRouter()


# Legal Document Generation endpoints
@router.get("/documents", response_model=List[LegalDocument])
def get_legal_documents(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=500),
    document_type: Optional[str] = Query(None, description="Filter by document type"),
    status: Optional[str] = Query(None, description="Filter by generation status"),
    completed_only: bool = Query(False, description="Only show completed documents"),
) -> List[LegalDocument]:
    """Get legal documents with optional filtering"""

    if document_type:
        documents = legal_document_crud.get_by_type(
            db, document_type=document_type, skip=skip, limit=limit
        )
    elif status:
        documents = legal_document_crud.get_by_status(
            db, status=status, skip=skip, limit=limit
        )
    elif completed_only:
        documents = legal_document_crud.get_completed(db, skip=skip, limit=limit)
    else:
        documents = legal_document_crud.get_multi(db, skip=skip, limit=limit)

    return documents


@router.post("/documents", response_model=LegalDocument)
def create_legal_document(
    *, db: Session = Depends(get_db), document_in: LegalDocumentCreate
) -> LegalDocument:
    """Create new legal document for generation"""
    document = legal_document_crud.create(db, obj_in=document_in)
    return document


@router.get("/documents/{document_id}", response_model=LegalDocument)
def get_legal_document(
    *, db: Session = Depends(get_db), document_id: int
) -> LegalDocument:
    """Get specific legal document"""
    document = legal_document_crud.get(db, id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Legal document not found")
    return document


@router.post("/generate")
def generate_legal_document_direct(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    request: DocumentGenerateRequest,
) -> dict:
    """Generate legal document directly (creates and generates in one step)"""
    from app.schemas.legal import LegalDocumentCreate, DocumentType, DocumentFormat
    from datetime import timedelta

    # Validate document type
    try:
        doc_type = DocumentType(request.document_type)
    except ValueError:
        raise HTTPException(
            status_code=400, detail=f"Invalid document type: {request.document_type}"
        )

    # Validate format
    try:
        doc_format = DocumentFormat(request.format)
    except ValueError:
        doc_format = DocumentFormat.PDF

    # Parse time range if provided
    start_date = None
    end_date = None
    if request.time_range:
        # Simple parsing for "last_X" format
        if request.time_range.startswith("last_"):
            days = int(request.time_range.replace("last_", "").replace("_days", ""))
            end_date = datetime.now(timezone.utc)
            start_date = end_date - timedelta(days=days)

    # Create document
    document_in = LegalDocumentCreate(
        title=f"{request.document_type.replace('_', ' ').title()} - {datetime.now(timezone.utc).strftime('%Y-%m-%d')}",
        document_type=doc_type,
        description=f"Auto-generated {request.document_type} report",
        date_range_start=start_date,
        date_range_end=end_date,
        export_format=doc_format,
        include_raw_data=request.include_exhibits,
    )

    document = legal_document_crud.create(db, obj_in=document_in)

    # Update status to generating
    legal_document_crud.update_generation_status(
        db, document_id=document.id, status="generating"
    )

    # TODO: Queue background task for document generation
    # background_tasks.add_task(generate_document_task, document.id, "normal", None)

    return {
        "message": "Document generation started",
        "document_id": document.id,
        "document_type": request.document_type,
        "status": "generating",
        "estimated_completion": "5-15 minutes",
    }


@router.post("/documents/{document_id}/generate")
def generate_legal_document(
    *,
    db: Session = Depends(get_db),
    document_id: int,
    background_tasks: BackgroundTasks,
    priority: str = Query(
        "normal", regex="^(low|normal|high|urgent)$", description="Generation priority"
    ),
    notify_email: Optional[str] = Query(
        None, description="Email for completion notification"
    ),
) -> dict:
    """Generate legal document (async process)"""
    document = legal_document_crud.get(db, id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Legal document not found")

    if document.generation_status in ["generating", "completed"]:
        raise HTTPException(
            status_code=400, detail=f"Document is already {document.generation_status}"
        )

    # Update status to generating
    legal_document_crud.update_generation_status(
        db, document_id=document_id, status="generating"
    )

    # TODO: Queue background task for document generation
    # background_tasks.add_task(generate_document_task, document_id, priority, notify_email)

    return {
        "message": "Document generation started",
        "document_id": document_id,
        "status": "generating",
        "priority": priority,
        "estimated_completion": "5-15 minutes",
    }


@router.get("/documents/{document_id}/status", response_model=DocumentGenerationStatus)
def get_document_generation_status(
    *, db: Session = Depends(get_db), document_id: int
) -> DocumentGenerationStatus:
    """Get document generation status"""
    document = legal_document_crud.get(db, id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Legal document not found")

    # TODO: Get actual progress from background task
    progress = 100 if document.generation_status == "completed" else 0

    return DocumentGenerationStatus(
        document_id=document_id,
        status=document.generation_status,
        progress_percent=progress,
        estimated_completion=None,
        error_message=document.error_message,
    )


@router.get("/documents/{document_id}/download")
def download_legal_document(
    *, db: Session = Depends(get_db), document_id: int
) -> FileResponse:
    """Download generated legal document"""
    document = legal_document_crud.get(db, id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Legal document not found")

    if document.generation_status != "completed" or not document.file_path:
        raise HTTPException(
            status_code=400, detail="Document is not ready for download"
        )

    # Increment download count
    legal_document_crud.increment_download_count(db, document_id=document_id)

    # TODO: Verify file exists and return FileResponse
    return FileResponse(
        path=document.file_path,
        filename=f"{document.title}.{document.export_format}",
        media_type="application/octet-stream",
    )


@router.delete("/documents/{document_id}")
def delete_legal_document(*, db: Session = Depends(get_db), document_id: int) -> dict:
    """Delete legal document and associated files"""
    document = legal_document_crud.get(db, id=document_id)
    if not document:
        raise HTTPException(status_code=404, detail="Legal document not found")

    # TODO: Delete associated file if exists

    legal_document_crud.remove(db, id=document_id)
    return {"message": "Legal document deleted successfully"}


# Document Templates and Types
@router.get("/document-types")
def get_document_types() -> dict:
    """Get available legal document types and their descriptions"""
    return {
        "flight_analysis": {
            "name": "Flight Analysis Report",
            "description": "Comprehensive analysis of flight patterns and behavior",
            "typical_sections": [
                "Executive Summary",
                "Flight Data Analysis",
                "Pattern Detection",
                "Legal Implications",
            ],
        },
        "pattern_report": {
            "name": "Surveillance Pattern Report",
            "description": "Analysis of systematic surveillance patterns",
            "typical_sections": [
                "Pattern Identification",
                "Geographic Analysis",
                "Constitutional Concerns",
                "Recommendations",
            ],
        },
        "cost_analysis": {
            "name": "Cost Analysis Report",
            "description": "Financial analysis of helicopter operations",
            "typical_sections": [
                "Cost Breakdown",
                "Efficiency Analysis",
                "Public Benefit Assessment",
                "Alternative Scenarios",
            ],
        },
        "surveillance_summary": {
            "name": "Surveillance Summary Report",
            "description": "Summary of surveillance patterns detected",
            "typical_sections": [
                "Surveillance Overview",
                "Geographic Distribution",
                "Severity Analysis",
                "Verification Status",
            ],
        },
        "surveillance_report": {
            "name": "Surveillance Assessment Report",
            "description": "Constitutional analysis of surveillance activities",
            "typical_sections": [
                "Fourth Amendment Analysis",
                "Privacy Expectations",
                "Legal Precedents",
                "Violations Identified",
            ],
        },
        "constitutional_analysis": {
            "name": "Constitutional Analysis",
            "description": "Legal analysis of constitutional violations",
            "typical_sections": [
                "Constitutional Framework",
                "Violation Analysis",
                "Precedent Review",
                "Legal Strategy",
            ],
        },
        "public_records_request": {
            "name": "Public Records Request Template",
            "description": "Template for requesting additional public records",
            "typical_sections": [
                "Request Scope",
                "Legal Basis",
                "Specific Records",
                "Follow-up Actions",
            ],
        },
        "expert_report": {
            "name": "Expert Witness Report",
            "description": "Technical expert analysis for litigation",
            "typical_sections": [
                "Expert Qualifications",
                "Technical Analysis",
                "Professional Opinions",
                "Conclusions",
            ],
        },
    }


# Constitutional Analysis endpoints
@router.get("/constitutional-analyses", response_model=List[ConstitutionalAnalysis])
def get_constitutional_analyses(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    violations_only: bool = Query(
        False, description="Only analyses that found violations"
    ),
    high_confidence_only: bool = Query(
        False, description="Only high-confidence analyses"
    ),
) -> List[ConstitutionalAnalysis]:
    """Get constitutional analyses"""

    if violations_only:
        analyses = constitutional_analysis_crud.get_with_violations(db)
    elif high_confidence_only:
        analyses = constitutional_analysis_crud.get_high_confidence(
            db, min_confidence=0.8
        )
    else:
        analyses = constitutional_analysis_crud.get_multi(db, skip=skip, limit=limit)

    return (
        analyses[skip : skip + limit]
        if not violations_only and not high_confidence_only
        else analyses
    )


@router.post("/constitutional-analyses")
def create_constitutional_analysis(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    analysis_name: str = Query(..., description="Name for this analysis"),
    start_date: datetime = Query(..., description="Analysis start date"),
    end_date: datetime = Query(..., description="Analysis end date"),
    geographic_scope: Optional[str] = Query(
        None, description="Geographic area description"
    ),
    include_demographic_analysis: bool = Query(
        True, description="Include demographic impact analysis"
    ),
) -> dict:
    """Create new constitutional analysis (async process)"""

    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    if (end_date - start_date).days > 180:
        raise HTTPException(
            status_code=400, detail="Analysis period cannot exceed 180 days"
        )

    # TODO: Create analysis record and queue background task
    analysis_id = (
        f"const_analysis_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    )

    return {
        "message": "Constitutional analysis initiated",
        "analysis_id": analysis_id,
        "analysis_name": analysis_name,
        "date_range": {"start": start_date, "end": end_date},
        "status": "processing",
        "estimated_completion": "15-30 minutes",
    }


@router.get("/constitutional-analyses/summary")
def get_constitutional_analysis_summary(*, db: Session = Depends(get_db)) -> dict:
    """Get summary statistics for all constitutional analyses"""
    return constitutional_analysis_crud.get_summary_statistics(db)


# Legal Precedent endpoints
@router.get("/precedents")
def get_legal_precedents(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    min_relevance: float = Query(
        0.5, ge=0, le=1, description="Minimum surveillance relevance"
    ),
    case_type: Optional[str] = Query(None, description="Filter by case type"),
    jurisdiction: Optional[str] = Query(None, description="Filter by jurisdiction"),
    binding_only: bool = Query(False, description="Only binding precedents"),
    search: Optional[str] = Query(
        None, description="Search case names, citations, or holdings"
    ),
) -> dict:
    """Get legal precedents with optional filtering"""

    if search:
        precedents = legal_precedent_crud.search_precedents(
            db, search_term=search, skip=skip, limit=limit
        )
    elif binding_only:
        precedents = legal_precedent_crud.get_binding_precedents(db)
        precedents = precedents[skip : skip + limit]
    elif case_type:
        precedents = legal_precedent_crud.get_by_case_type(
            db, case_type=case_type, skip=skip, limit=limit
        )
    elif jurisdiction:
        precedents = legal_precedent_crud.get_by_jurisdiction(
            db, jurisdiction=jurisdiction, skip=skip, limit=limit
        )
    else:
        precedents = legal_precedent_crud.get_by_relevance(
            db, min_relevance=min_relevance, skip=skip, limit=limit
        )

    return {
        "precedents": [
            {
                "id": p.id,
                "case_name": p.case_name,
                "citation": p.citation,
                "court": p.court,
                "decision_date": p.decision_date,
                "surveillance_relevance": p.surveillance_relevance,
                "case_type": p.case_type,
                "jurisdiction": p.jurisdiction,
                "binding_precedent": p.binding_precedent,
                "holding": p.holding[:200] + "..."
                if len(p.holding) > 200
                else p.holding,
            }
            for p in precedents
        ],
        "total": len(precedents),
        "page": skip // limit + 1,
        "size": len(precedents),
    }


@router.post("/precedents/{precedent_id}/cite")
def cite_legal_precedent(
    *,
    db: Session = Depends(get_db),
    precedent_id: int,
    citation_context: str = Query(..., description="Context where precedent was cited"),
) -> dict:
    """Record citation of a legal precedent"""
    precedent = legal_precedent_crud.increment_citation_count(
        db, precedent_id=precedent_id
    )
    if not precedent:
        raise HTTPException(status_code=404, detail="Legal precedent not found")

    return {
        "message": "Precedent citation recorded",
        "precedent": precedent.case_name,
        "citation_count": precedent.citation_count,
        "context": citation_context,
    }


# Legal Strategy endpoints
@router.get("/strategies/fourth-amendment")
def get_fourth_amendment_strategies() -> dict:
    """Get Fourth Amendment legal strategies for helicopter surveillance"""
    return {
        "strategies": [
            {
                "name": "Reasonable Expectation of Privacy",
                "description": "Challenge surveillance in areas where citizens have reasonable privacy expectations",
                "applicable_areas": [
                    "residential backyards",
                    "private property",
                    "enclosed areas",
                ],
                "key_precedents": ["Kyllo v. United States", "Florida v. Riley"],
                "strength": "high",
            },
            {
                "name": "Persistent Surveillance Doctrine",
                "description": "Apply Carpenter principles to extended helicopter surveillance",
                "applicable_areas": [
                    "systematic patrol patterns",
                    "repeated area surveillance",
                ],
                "key_precedents": [
                    "Carpenter v. United States",
                    "Leaders of a Beautiful Struggle v. Baltimore",
                ],
                "strength": "medium-high",
            },
            {
                "name": "Physical Intrusion Theory",
                "description": "Challenge low-altitude flights as physical intrusions",
                "applicable_areas": [
                    "flights below 400 feet",
                    "hovering events",
                    "noise/wind disturbance",
                ],
                "key_precedents": [
                    "United States v. Jones",
                    "State v. Davis (New Mexico)",
                ],
                "strength": "medium",
            },
            {
                "name": "Technology Enhancement Challenge",
                "description": "Challenge use of FLIR and advanced surveillance equipment",
                "applicable_areas": [
                    "thermal imaging",
                    "high-resolution cameras",
                    "specialized equipment",
                ],
                "key_precedents": [
                    "Kyllo v. United States",
                    "Dow Chemical v. United States",
                ],
                "strength": "high",
            },
        ],
        "recommended_approach": "Multi-pronged strategy combining reasonable expectation, persistent surveillance, and technology enhancement arguments",
    }


@router.get("/strategies/injunctive-relief")
def get_injunctive_relief_strategies() -> dict:
    """Get strategies for seeking injunctive relief"""
    return {
        "preliminary_injunction": {
            "requirements": [
                "likelihood of success on merits",
                "irreparable harm",
                "balance of hardships",
                "public interest",
            ],
            "evidence_needed": [
                "pattern of surveillance",
                "constitutional violations",
                "community harm",
                "lack of oversight",
            ],
            "timeline": "2-4 weeks for hearing",
        },
        "permanent_injunction": {
            "requirements": [
                "actual success on merits",
                "inadequacy of legal remedies",
                "balance of hardships",
                "public interest",
            ],
            "remedies": [
                "cease systematic surveillance",
                "implement oversight procedures",
                "require warrants",
                "community notification",
            ],
            "timeline": "6-18 months for final judgment",
        },
        "class_action": {
            "requirements": [
                "numerous affected parties",
                "common questions",
                "representative claims",
                "adequate representation",
            ],
            "advantages": ["broader impact", "shared costs", "stronger evidence base"],
            "challenges": ["complexity", "longer timeline", "settlement pressure"],
        },
    }


# Export and Reporting endpoints
@router.post("/export/case-package")
def export_case_package(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    case_name: str = Query(..., description="Name for the case package"),
    include_flight_data: bool = Query(True, description="Include flight analysis data"),
    include_patterns: bool = Query(True, description="Include pattern analysis"),
    include_costs: bool = Query(True, description="Include cost analysis"),
    include_precedents: bool = Query(
        True, description="Include legal precedent research"
    ),
    format: str = Query(
        "pdf", regex="^(pdf|docx|combined)$", description="Export format"
    ),
) -> dict:
    """Export comprehensive legal case package"""

    # TODO: Queue background task to generate comprehensive case package
    export_id = f"case_package_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    return {
        "message": "Case package generation initiated",
        "export_id": export_id,
        "case_name": case_name,
        "format": format,
        "includes": {
            "flight_data": include_flight_data,
            "patterns": include_patterns,
            "costs": include_costs,
            "precedents": include_precedents,
        },
        "status": "processing",
        "estimated_completion": "20-45 minutes",
    }


@router.get("/templates/public-records-request")
def get_public_records_request_template() -> dict:
    """Get template for public records requests"""
    return {
        "template": {
            "subject": "Public Records Request - Police Helicopter Operations",
            "body": """
            Dear Public Records Officer,
            
            Pursuant to A.R.S. § 39-121 et seq., I hereby request access to the following public records:
            
            1. Flight logs for all Phoenix Police Department helicopters for the period [DATE RANGE]
            2. Computer Aided Dispatch (CAD) records correlating with helicopter deployments
            3. Standard Operating Procedures for helicopter surveillance operations
            4. Cost analysis and budget documents for the Air Support Unit
            5. Maintenance records and aircraft specifications
            6. Communications transcripts between helicopters and dispatch
            7. Any policies regarding surveillance of residential areas
            
            This request is made in support of ongoing litigation regarding constitutional concerns
            about warrantless helicopter surveillance of Phoenix residents.
            
            Please provide an estimated timeline for production and any associated costs.
            
            Thank you for your prompt attention to this matter.
            """,
        },
        "customization_fields": [
            "date_range",
            "specific_aircraft",
            "geographic_areas",
            "surveillance_dates",
            "additional_records",
        ],
        "follow_up_timeline": {
            "initial_response": "5 business days",
            "record_production": "10-30 business days",
            "appeal_deadline": "35 calendar days",
        },
    }
