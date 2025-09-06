from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func

from app.crud.base import CRUDBase
from app.models.legal import LegalDocument, ConstitutionalAnalysis, LegalPrecedent
from app.schemas.legal import LegalDocumentCreate


class CRUDLegalDocument(CRUDBase[LegalDocument, LegalDocumentCreate, None]):
    def get_by_type(
        self, db: Session, *, document_type: str, skip: int = 0, limit: int = 100
    ) -> List[LegalDocument]:
        """Get legal documents by type"""
        return (
            db.query(LegalDocument)
            .filter(LegalDocument.document_type == document_type)
            .order_by(desc(LegalDocument.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_status(
        self, db: Session, *, status: str, skip: int = 0, limit: int = 100
    ) -> List[LegalDocument]:
        """Get legal documents by generation status"""
        return (
            db.query(LegalDocument)
            .filter(LegalDocument.generation_status == status)
            .order_by(desc(LegalDocument.created_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_completed(
        self, db: Session, *, skip: int = 0, limit: int = 100
    ) -> List[LegalDocument]:
        """Get completed legal documents"""
        return (
            db.query(LegalDocument)
            .filter(LegalDocument.generation_status == "completed")
            .order_by(desc(LegalDocument.generated_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_pending_generation(self, db: Session) -> List[LegalDocument]:
        """Get documents pending generation"""
        return (
            db.query(LegalDocument)
            .filter(LegalDocument.generation_status.in_(["pending", "generating"]))
            .order_by(LegalDocument.created_at)
            .all()
        )

    def update_generation_status(
        self,
        db: Session,
        *,
        document_id: int,
        status: str,
        file_path: Optional[str] = None,
        file_size: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> Optional[LegalDocument]:
        """Update document generation status"""
        document = self.get(db, id=document_id)
        if document:
            document.generation_status = status
            if file_path:
                document.file_path = file_path
            if file_size:
                document.file_size_bytes = file_size
            if error_message:
                document.error_message = error_message
            if status == "completed":
                document.generated_at = datetime.now(timezone.utc)

            db.commit()
            db.refresh(document)
        return document

    def increment_download_count(
        self, db: Session, *, document_id: int
    ) -> Optional[LegalDocument]:
        """Increment download count for a document"""
        document = self.get(db, id=document_id)
        if document:
            document.download_count = (document.download_count or 0) + 1
            document.last_downloaded = datetime.now(timezone.utc)
            db.commit()
            db.refresh(document)
        return document


class CRUDConstitutionalAnalysis(CRUDBase[ConstitutionalAnalysis, None, None]):
    def get_by_date_range(
        self, db: Session, *, start_date: datetime, end_date: datetime
    ) -> List[ConstitutionalAnalysis]:
        """Get analyses that cover the specified date range"""
        return (
            db.query(ConstitutionalAnalysis)
            .filter(
                and_(
                    ConstitutionalAnalysis.date_range_start <= end_date,
                    ConstitutionalAnalysis.date_range_end >= start_date,
                )
            )
            .order_by(desc(ConstitutionalAnalysis.created_at))
            .all()
        )

    def get_with_violations(self, db: Session) -> List[ConstitutionalAnalysis]:
        """Get analyses that detected constitutional violations"""
        return (
            db.query(ConstitutionalAnalysis)
            .filter(ConstitutionalAnalysis.systematic_surveillance_detected == True)
            .order_by(desc(ConstitutionalAnalysis.surveillance_intensity_score))
            .all()
        )

    def get_with_discrimination(self, db: Session) -> List[ConstitutionalAnalysis]:
        """Get analyses that detected discriminatory impact"""
        return (
            db.query(ConstitutionalAnalysis)
            .filter(ConstitutionalAnalysis.discriminatory_impact_detected == True)
            .order_by(desc(ConstitutionalAnalysis.created_at))
            .all()
        )

    def get_high_confidence(
        self, db: Session, *, min_confidence: float = 0.8
    ) -> List[ConstitutionalAnalysis]:
        """Get high-confidence analyses"""
        return (
            db.query(ConstitutionalAnalysis)
            .filter(ConstitutionalAnalysis.confidence_score >= min_confidence)
            .order_by(desc(ConstitutionalAnalysis.confidence_score))
            .all()
        )

    def get_summary_statistics(self, db: Session) -> Dict[str, Any]:
        """Get summary statistics for all constitutional analyses"""
        total_analyses = db.query(ConstitutionalAnalysis).count()
        violations_detected = (
            db.query(ConstitutionalAnalysis)
            .filter(ConstitutionalAnalysis.systematic_surveillance_detected == True)
            .count()
        )
        discrimination_detected = (
            db.query(ConstitutionalAnalysis)
            .filter(ConstitutionalAnalysis.discriminatory_impact_detected == True)
            .count()
        )

        avg_intensity = (
            db.query(
                func.avg(ConstitutionalAnalysis.surveillance_intensity_score)
            ).scalar()
            or 0
        )
        avg_confidence = (
            db.query(func.avg(ConstitutionalAnalysis.confidence_score)).scalar() or 0
        )

        return {
            "total_analyses": total_analyses,
            "violations_detected": violations_detected,
            "discrimination_detected": discrimination_detected,
            "violation_rate": violations_detected / total_analyses
            if total_analyses > 0
            else 0,
            "discrimination_rate": discrimination_detected / total_analyses
            if total_analyses > 0
            else 0,
            "average_intensity_score": float(avg_intensity),
            "average_confidence_score": float(avg_confidence),
        }


class CRUDLegalPrecedent(CRUDBase[LegalPrecedent, None, None]):
    def get_by_relevance(
        self,
        db: Session,
        *,
        min_relevance: float = 0.5,
        skip: int = 0,
        limit: int = 100,
    ) -> List[LegalPrecedent]:
        """Get precedents by surveillance relevance score"""
        return (
            db.query(LegalPrecedent)
            .filter(LegalPrecedent.surveillance_relevance >= min_relevance)
            .order_by(desc(LegalPrecedent.surveillance_relevance))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_binding_precedents(self, db: Session) -> List[LegalPrecedent]:
        """Get binding precedents in our jurisdiction"""
        return (
            db.query(LegalPrecedent)
            .filter(LegalPrecedent.binding_precedent == True)
            .order_by(desc(LegalPrecedent.surveillance_relevance))
            .all()
        )

    def get_by_case_type(
        self, db: Session, *, case_type: str, skip: int = 0, limit: int = 100
    ) -> List[LegalPrecedent]:
        """Get precedents by case type"""
        return (
            db.query(LegalPrecedent)
            .filter(LegalPrecedent.case_type == case_type)
            .order_by(desc(LegalPrecedent.surveillance_relevance))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def get_by_jurisdiction(
        self, db: Session, *, jurisdiction: str, skip: int = 0, limit: int = 100
    ) -> List[LegalPrecedent]:
        """Get precedents by jurisdiction"""
        return (
            db.query(LegalPrecedent)
            .filter(LegalPrecedent.jurisdiction == jurisdiction)
            .order_by(desc(LegalPrecedent.decision_date))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def search_precedents(
        self, db: Session, *, search_term: str, skip: int = 0, limit: int = 100
    ) -> List[LegalPrecedent]:
        """Search precedents by case name, citation, or holding"""
        return (
            db.query(LegalPrecedent)
            .filter(
                or_(
                    LegalPrecedent.case_name.ilike(f"%{search_term}%"),
                    LegalPrecedent.citation.ilike(f"%{search_term}%"),
                    LegalPrecedent.holding.ilike(f"%{search_term}%"),
                )
            )
            .order_by(desc(LegalPrecedent.surveillance_relevance))
            .offset(skip)
            .limit(limit)
            .all()
        )

    def increment_citation_count(
        self, db: Session, *, precedent_id: int
    ) -> Optional[LegalPrecedent]:
        """Increment citation count for a precedent"""
        precedent = self.get(db, id=precedent_id)
        if precedent:
            precedent.citation_count = (precedent.citation_count or 0) + 1
            precedent.last_cited = datetime.now(timezone.utc)
            db.commit()
            db.refresh(precedent)
        return precedent


legal_document_crud = CRUDLegalDocument(LegalDocument)
constitutional_analysis_crud = CRUDConstitutionalAnalysis(ConstitutionalAnalysis)
legal_precedent_crud = CRUDLegalPrecedent(LegalPrecedent)
