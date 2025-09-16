"""
API endpoints for abnormal flight patterns
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc, and_
from typing import List, Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.abnormal_patterns import AbnormalPattern
from app.models.flight_logs import FlightLog
from app.models.aircraft import Aircraft
from app.schemas.abnormal_patterns import (
    AbnormalPatternResponse,
    AbnormalPatternDetail,
    AbnormalPatternSummary
)

router = APIRouter()


@router.get("", response_model=List[AbnormalPatternResponse])
@router.get("/", response_model=List[AbnormalPatternResponse], include_in_schema=False)
async def get_abnormal_patterns(
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    reviewed: Optional[str] = Query(None, description="Filter by review status"),
    days_back: int = Query(7, description="Number of days to look back"),
    limit: int = Query(100, description="Maximum number of patterns to return"),
    db: Session = Depends(get_db)
):
    """Get list of detected abnormal flight patterns"""
    
    query = db.query(AbnormalPattern).join(
        FlightLog, AbnormalPattern.flight_log_id == FlightLog.id
    ).join(
        Aircraft, FlightLog.aircraft_id == Aircraft.id
    )

    # Filter out normal patterns (those are just for tracking)
    query = query.filter(AbnormalPattern.pattern_type != "normal")

    # Apply filters
    if pattern_type and pattern_type != "all":
        query = query.filter(AbnormalPattern.pattern_type == pattern_type)
    
    if reviewed:
        query = query.filter(AbnormalPattern.reviewed == reviewed)
    
    # Time filter
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    query = query.filter(AbnormalPattern.detected_at >= cutoff_date)
    
    # Order by detection time and limit
    patterns = query.order_by(desc(AbnormalPattern.detected_at)).limit(limit).all()
    
    # Format response
    results = []
    for pattern in patterns:
        flight = pattern.flight_log
        aircraft = flight.aircraft if flight else None
        
        results.append({
            "id": pattern.id,
            "flight_id": flight.flight_id if flight else None,
            "aircraft_registration": aircraft.registration if aircraft else None,
            "pattern_type": pattern.pattern_type,
            "confidence_score": pattern.confidence_score,
            "detected_at": pattern.detected_at,
            "reviewed": pattern.reviewed,
            "flight_date": flight.departure_time if flight else None,
            "duration_minutes": flight.flight_duration_minutes if flight else None,
            "metadata": pattern.detection_metadata
        })
    
    return results


@router.get("/{pattern_id}", response_model=AbnormalPatternDetail)
async def get_abnormal_pattern_detail(
    pattern_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a specific abnormal pattern"""
    
    pattern = db.query(AbnormalPattern).filter(
        AbnormalPattern.id == pattern_id
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    flight = pattern.flight_log
    aircraft = flight.aircraft if flight else None
    
    # Get flight positions if available
    positions = []
    if flight and flight.raw_data:
        trail = flight.raw_data.get("trail", [])
        for point in trail:
            positions.append({
                "lat": point.get("lat"),
                "lng": point.get("lng"),
                "alt": point.get("alt"),
                "spd": point.get("spd"),
                "ts": point.get("ts")
            })
    
    return {
        "id": pattern.id,
        "flight_id": flight.flight_id if flight else None,
        "aircraft_registration": aircraft.registration if aircraft else None,
        "aircraft_type": aircraft.aircraft_type if aircraft else None,
        "pattern_type": pattern.pattern_type,
        "confidence_score": pattern.confidence_score,
        "detected_at": pattern.detected_at,
        "reviewed": pattern.reviewed,
        "review_notes": pattern.review_notes,
        "legal_relevance": pattern.legal_relevance,
        "potential_violation": pattern.potential_violation,
        "flight_date": flight.departure_time if flight else None,
        "duration_minutes": flight.flight_duration_minutes if flight else None,
        "departure_airport": flight.departure_airport if flight else None,
        "arrival_airport": flight.arrival_airport if flight else None,
        "metadata": pattern.detection_metadata,
        "positions": positions
    }


@router.get("/summary/stats", response_model=AbnormalPatternSummary)
async def get_abnormal_patterns_summary(
    days_back: int = Query(30, description="Number of days to analyze"),
    db: Session = Depends(get_db)
):
    """Get summary statistics of abnormal patterns"""
    
    cutoff_date = datetime.utcnow() - timedelta(days=days_back)
    
    # Get counts by pattern type
    patterns = db.query(AbnormalPattern).filter(
        AbnormalPattern.detected_at >= cutoff_date
    ).all()
    
    pattern_counts = {}
    for pattern in patterns:
        pattern_type = pattern.pattern_type
        if pattern_type not in pattern_counts:
            pattern_counts[pattern_type] = 0
        pattern_counts[pattern_type] += 1
    
    # Get review status counts
    pending_count = sum(1 for p in patterns if p.reviewed == "pending")
    confirmed_count = sum(1 for p in patterns if p.reviewed == "confirmed")
    false_positive_count = sum(1 for p in patterns if p.reviewed == "false_positive")
    
    # Get high confidence patterns
    high_confidence = [p for p in patterns if p.confidence_score > 0.8]
    
    return {
        "total_patterns": len(patterns),
        "pattern_types": pattern_counts,
        "review_status": {
            "pending": pending_count,
            "confirmed": confirmed_count,
            "false_positive": false_positive_count
        },
        "high_confidence_count": len(high_confidence),
        "days_analyzed": days_back,
        "most_common_pattern": max(pattern_counts.items(), key=lambda x: x[1])[0] if pattern_counts else None
    }


@router.put("/{pattern_id}/review")
async def update_pattern_review(
    pattern_id: int,
    reviewed: str = Query(..., description="Review status: confirmed, false_positive"),
    review_notes: Optional[str] = Query(None, description="Review notes"),
    legal_relevance: Optional[str] = Query(None, description="Legal relevance: high, medium, low"),
    db: Session = Depends(get_db)
):
    """Update the review status of an abnormal pattern"""
    
    pattern = db.query(AbnormalPattern).filter(
        AbnormalPattern.id == pattern_id
    ).first()
    
    if not pattern:
        raise HTTPException(status_code=404, detail="Pattern not found")
    
    # Update review fields
    pattern.reviewed = reviewed
    if review_notes:
        pattern.review_notes = review_notes
    if legal_relevance:
        pattern.legal_relevance = legal_relevance
    pattern.reviewed_at = datetime.utcnow()
    
    db.commit()
    
    return {"message": "Pattern review updated successfully", "pattern_id": pattern_id}