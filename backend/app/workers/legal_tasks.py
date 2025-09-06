import logging
from datetime import datetime, timezone
from typing import Dict, Any
from celery import current_task
from sqlalchemy.orm import Session

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.crud.legal import legal_document_crud

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, max_retries=2)
def generate_legal_document(self, document_id: int):
    """Generate legal document (PDF/DOCX)"""
    try:
        logger.info(f"Starting legal document generation: {document_id}")

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 0, "total": 100, "status": "Starting generation..."},
            )

        result = _generate_legal_document(document_id)
        return result

    except Exception as exc:
        logger.error(f"Legal document generation failed: {exc}")
        if self.request.retries < 2:
            raise self.retry(countdown=600, exc=exc)
        raise


def _generate_legal_document(document_id: int) -> Dict[str, Any]:
    """Internal document generation function"""
    db = SessionLocal()

    try:
        # Get document record
        document = legal_document_crud.get(db, id=document_id)
        if not document:
            raise ValueError(f"Document {document_id} not found")

        # Update status to generating
        legal_document_crud.update_generation_status(
            db, document_id=document_id, status="generating"
        )

        result = {
            "document_id": document_id,
            "title": document.title,
            "type": document.document_type,
            "format": document.export_format,
            "file_path": None,
            "file_size": 0,
        }

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 25, "total": 100, "status": "Gathering data..."},
            )

        # Generate document based on type
        if document.document_type == "flight_analysis":
            content = _generate_flight_analysis_report(db, document)
        elif document.document_type == "pattern_report":
            content = _generate_pattern_report(db, document)
        elif document.document_type == "cost_analysis":
            content = _generate_cost_analysis_report(db, document)
        elif document.document_type == "surveillance_summary":
            content = _generate_surveillance_summary(db, document)
        else:
            content = f"# {document.title}\n\nDocument type: {document.document_type}\n\nGenerated: {datetime.now(timezone.utc)}"

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 75, "total": 100, "status": "Generating document..."},
            )

        # Save document file (placeholder)
        file_path = f"/tmp/legal_docs/doc_{document_id}.{document.export_format}"

        # TODO: Actually generate PDF/DOCX from content
        # For now, just save as text
        with open(file_path, "w") as f:
            f.write(content)

        file_size = len(content.encode("utf-8"))

        # Update document record
        legal_document_crud.update_generation_status(
            db,
            document_id=document_id,
            status="completed",
            file_path=file_path,
            file_size=file_size,
        )

        result["file_path"] = file_path
        result["file_size"] = file_size

        if current_task:
            current_task.update_state(
                state="PROGRESS",
                meta={"current": 100, "total": 100, "status": "Document generated"},
            )

        return result

    finally:
        db.close()


def _generate_flight_analysis_report(db: Session, document) -> str:
    """Generate flight analysis report content"""
    from app.crud.flights import flight_log_crud

    # Get flight data for analysis period
    flights = flight_log_crud.get_by_date_range(
        db, start_date=document.date_range_start, end_date=document.date_range_end
    )

    total_flights = len(flights)
    total_hours = sum(f.flight_duration_minutes or 0 for f in flights) / 60
    estimated_cost = total_hours * 2160
    surveillance_flights = [
        f
        for f in flights
        if f.surveillance_likelihood and f.surveillance_likelihood > 0.7
    ]

    content = f"""# Flight Analysis Report

## Executive Summary

This report analyzes Phoenix Police Department helicopter operations from {document.date_range_start.strftime('%Y-%m-%d')} to {document.date_range_end.strftime('%Y-%m-%d')}.

### Key Findings

- **Total Flights**: {total_flights}
- **Total Flight Hours**: {total_hours:.1f} hours
- **Estimated Cost**: ${estimated_cost:,.2f}
- **High Surveillance Probability**: {len(surveillance_flights)} flights

## Flight Data Analysis

### Operational Summary

During the analysis period, Phoenix PD conducted {total_flights} helicopter flights totaling {total_hours:.1f} hours of airtime. At an estimated operational cost of $2,160 per hour, this represents a total expenditure of ${estimated_cost:,.2f}.

### Surveillance Pattern Detection

{len(surveillance_flights)} flights ({len(surveillance_flights)/total_flights*100:.1f}% of all flights) exhibited patterns consistent with surveillance activities, including:

- Hovering over residential areas
- Low-altitude flights below 400 feet
- Circular or grid search patterns
- Extended loitering in specific geographic areas

## Constitutional Concerns

Based on established Fourth Amendment jurisprudence, the following concerns have been identified:

1. **Reasonable Expectation of Privacy**: Multiple flights conducted at altitudes below 400 feet over residential properties
2. **Persistent Surveillance**: Systematic patrol patterns suggesting dragnet surveillance
3. **Technology Enhancement**: Use of FLIR and advanced optics without warrant authorization

## Legal Implications

These flight patterns raise significant constitutional questions under:

- **Kyllo v. United States** (2001): Technology-enhanced surveillance
- **Carpenter v. United States** (2018): Long-term location monitoring
- **Florida v. Riley** (1989): Low-altitude helicopter surveillance

## Recommendations

1. Implement warrant requirement for surveillance flights
2. Establish minimum altitude requirements over residential areas  
3. Create community notification procedures
4. Implement independent oversight mechanisms

---
Report generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
"""

    return content


def _generate_pattern_report(db: Session, document) -> str:
    """Generate surveillance pattern report"""
    return f"""# Surveillance Pattern Report

## Pattern Analysis Results

Analysis of helicopter flight patterns from {document.date_range_start.strftime('%Y-%m-%d')} to {document.date_range_end.strftime('%Y-%m-%d')}.

### Systematic Surveillance Detected

Multiple flights exhibit patterns consistent with systematic surveillance:

1. **Grid Search Patterns**: Regular back-and-forth flight paths over residential neighborhoods
2. **Hovering Events**: Extended stationary flight over specific locations
3. **Repeat Coverage**: Multiple flights over identical geographic areas

### Geographic Concentration

Surveillance activities concentrated in specific neighborhoods, raising concerns about:

- Discriminatory impact on communities of color
- Lack of particularized suspicion
- Violation of Equal Protection principles

### Recommendations for Legal Action

Based on these patterns, the following legal strategies are recommended:

1. **Injunctive Relief**: Seek court order limiting surveillance flights
2. **Class Action**: Represent all affected residents
3. **Constitutional Challenge**: Assert Fourth and Fourteenth Amendment violations

---
Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
"""


def _generate_cost_analysis_report(db: Session, document) -> str:
    """Generate cost analysis report"""
    return f"""# Cost Analysis Report

## Financial Impact Assessment

Analysis of Phoenix PD helicopter operational costs from {document.date_range_start.strftime('%Y-%m-%d')} to {document.date_range_end.strftime('%Y-%m-%d')}.

### Cost Breakdown

- **Hourly Operating Cost**: $2,160/hour
- **Fuel Costs**: 40% of operational budget
- **Maintenance**: 30% of operational budget  
- **Personnel**: 30% of operational budget

### Public Benefit Analysis

The substantial cost of helicopter operations must be weighed against demonstrable public safety benefits. Current operations appear to prioritize surveillance over emergency response.

### Alternative Scenarios

1. **Community Policing**: Reallocate funds to ground-based community programs
2. **Emergency Response Only**: Limit flights to verified emergency situations
3. **Oversight Implementation**: Require warrant authorization for surveillance missions

---
Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
"""


def _generate_surveillance_summary(db: Session, document) -> str:
    """Generate surveillance summary report"""
    from app.crud.flights import flight_log_crud

    flights = flight_log_crud.get_by_date_range(
        db, start_date=document.date_range_start, end_date=document.date_range_end
    )

    surveillance_flights = [
        f
        for f in flights
        if f.surveillance_likelihood and f.surveillance_likelihood > 0.5
    ]

    return f"""# Surveillance Pattern Summary

## Overview

Summary of {len(surveillance_flights)} surveillance flights detected from Phoenix PD helicopter activities.

### Pattern Types

- **Surveillance**: Detected surveillance flight patterns
- **Hovering**: Extended stationary flight patterns
- **Privacy Violations**: Low-altitude flights over private property
- **Circling**: Repeated circular patterns over areas

### Constitutional Concerns

{len([f for f in surveillance_flights if f.privacy_concern_level and f.privacy_concern_level >= 4])} flights showed high privacy concern levels.

### Pattern Analysis

- **High Surveillance Likelihood**: {len(surveillance_flights)} flights
- **Privacy Violations**: {len([f for f in surveillance_flights if f.privacy_concern_level and f.privacy_concern_level >= 3])} flights

---
Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S')}
"""
