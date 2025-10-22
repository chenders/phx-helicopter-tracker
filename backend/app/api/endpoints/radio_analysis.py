"""
Radio transcription analysis API endpoints

Provides advanced analytics for radio communications:
- Keyword frequency analysis
- Timeline/activity heatmaps
- Entity extraction summaries
- Flight-radio correlation
"""
from fastapi import APIRouter, HTTPException, Query, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, case
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import re

from app.db.database import get_db
from app.models.radio import (
    RadioArchive,
    RadioTranscription,
    RadioSegment,
    RadioKeyword,
    FlightRadioCorrelation,
)
from app.models.flight_logs import FlightLog

router = APIRouter()


@router.get("/keywords/frequency")
async def get_keyword_frequency(
    limit: int = Query(50, description="Number of top keywords to return"),
    keyword_type: Optional[str] = Query(None, description="Filter by keyword type"),
    start_date: Optional[datetime] = Query(None, description="Start date for analysis"),
    end_date: Optional[datetime] = Query(None, description="End date for analysis"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get keyword frequency analysis across all transcriptions

    Returns top keywords by occurrence count with context
    """
    try:
        # Build query
        query = db.query(
            RadioKeyword.keyword,
            RadioKeyword.keyword_type,
            func.sum(RadioKeyword.occurrence_count).label("total_occurrences"),
            func.count(RadioKeyword.transcription_id).label("transcription_count"),
            func.avg(RadioKeyword.confidence).label("avg_confidence"),
        )

        # Apply filters
        if keyword_type:
            query = query.filter(RadioKeyword.keyword_type == keyword_type)

        if start_date or end_date:
            # Join with transcriptions and archives to filter by date
            query = query.join(RadioTranscription).join(RadioArchive)
            if start_date:
                query = query.filter(RadioArchive.recording_start >= start_date)
            if end_date:
                query = query.filter(RadioArchive.recording_end <= end_date)

        # Group and order
        results = (
            query.group_by(RadioKeyword.keyword, RadioKeyword.keyword_type)
            .order_by(desc("total_occurrences"))
            .limit(limit)
            .all()
        )

        keywords = []
        for keyword, kw_type, total_count, trans_count, avg_conf in results:
            keywords.append({
                "keyword": keyword,
                "type": kw_type,
                "total_occurrences": total_count,
                "transcription_count": trans_count,
                "avg_confidence": round(avg_conf, 3) if avg_conf else None,
            })

        return {
            "total_keywords": len(keywords),
            "keywords": keywords,
            "filters": {
                "keyword_type": keyword_type,
                "start_date": start_date.isoformat() if start_date else None,
                "end_date": end_date.isoformat() if end_date else None,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/hourly")
async def get_hourly_activity(
    days_back: int = Query(7, ge=1, le=90, description="Number of days to analyze"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get hourly radio activity heatmap

    Returns activity counts by hour of day and day of week
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # Query for hourly activity
        results = (
            db.query(
                func.extract('hour', RadioArchive.recording_start).label('hour'),
                func.extract('dow', RadioArchive.recording_start).label('day_of_week'),
                func.count(RadioArchive.id).label('archive_count'),
                func.sum(RadioArchive.duration_seconds).label('total_duration'),
            )
            .filter(RadioArchive.recording_start >= start_date)
            .group_by('hour', 'day_of_week')
            .all()
        )

        # Format data for heatmap
        heatmap_data = []
        for hour, dow, count, duration in results:
            heatmap_data.append({
                "hour": int(hour),
                "day_of_week": int(dow),  # 0=Sunday, 6=Saturday
                "archive_count": count,
                "total_duration_seconds": duration or 0,
            })

        # Get day names
        day_names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

        return {
            "days_analyzed": days_back,
            "start_date": start_date.isoformat(),
            "heatmap_data": heatmap_data,
            "day_names": day_names,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/timeline/activity")
async def get_activity_timeline(
    days_back: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    granularity: str = Query("daily", regex="^(hourly|daily|weekly)$", description="Time granularity"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get radio activity timeline with customizable granularity

    Returns transcription counts, segment counts, and keyword extraction stats
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # Determine date truncation based on granularity
        if granularity == "hourly":
            trunc = func.date_trunc('hour', RadioArchive.recording_start)
        elif granularity == "daily":
            trunc = func.date_trunc('day', RadioArchive.recording_start)
        else:  # weekly
            trunc = func.date_trunc('week', RadioArchive.recording_start)

        # Query archives with transcription stats
        results = (
            db.query(
                trunc.label('time_bucket'),
                func.count(RadioArchive.id).label('archive_count'),
                func.count(RadioTranscription.id).label('transcription_count'),
                func.sum(case((RadioArchive.transcribed == True, RadioArchive.duration_seconds), else_=0)).label('transcribed_duration'),
            )
            .outerjoin(RadioTranscription)
            .filter(RadioArchive.recording_start >= start_date)
            .group_by('time_bucket')
            .order_by('time_bucket')
            .all()
        )

        timeline = []
        for bucket, archive_count, trans_count, trans_duration in results:
            timeline.append({
                "timestamp": bucket.isoformat() if bucket else None,
                "archive_count": archive_count,
                "transcription_count": trans_count or 0,
                "transcribed_duration_seconds": trans_duration or 0,
            })

        return {
            "granularity": granularity,
            "days_analyzed": days_back,
            "start_date": start_date.isoformat(),
            "data_points": len(timeline),
            "timeline": timeline,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entities/summary")
async def get_entity_summary(
    days_back: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get summary of extracted entities (tail numbers, locations, incident codes)

    Returns counts and frequency for each entity type
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # Get segments with extracted entities
        segments = (
            db.query(RadioSegment)
            .join(RadioTranscription)
            .join(RadioArchive)
            .filter(RadioArchive.recording_start >= start_date)
            .filter(
                or_(
                    RadioSegment.contains_tail_number == True,
                    RadioSegment.contains_location == True,
                    RadioSegment.contains_incident_code == True,
                )
            )
            .all()
        )

        # Aggregate entity data
        tail_numbers = {}
        locations = {}
        incident_codes = {}

        for segment in segments:
            # Count tail numbers
            if segment.tail_numbers:
                for tail in segment.tail_numbers:
                    tail_numbers[tail] = tail_numbers.get(tail, 0) + 1

            # Count locations
            if segment.locations:
                for loc in segment.locations:
                    locations[loc] = locations.get(loc, 0) + 1

            # Count incident codes
            if segment.incident_codes:
                for code in segment.incident_codes:
                    incident_codes[code] = incident_codes.get(code, 0) + 1

        # Sort by frequency
        top_tail_numbers = sorted(tail_numbers.items(), key=lambda x: x[1], reverse=True)[:20]
        top_locations = sorted(locations.items(), key=lambda x: x[1], reverse=True)[:50]
        top_incident_codes = sorted(incident_codes.items(), key=lambda x: x[1], reverse=True)[:30]

        return {
            "days_analyzed": days_back,
            "start_date": start_date.isoformat(),
            "summary": {
                "total_segments_with_entities": len(segments),
                "unique_tail_numbers": len(tail_numbers),
                "unique_locations": len(locations),
                "unique_incident_codes": len(incident_codes),
            },
            "top_tail_numbers": [{"tail_number": t, "count": c} for t, c in top_tail_numbers],
            "top_locations": [{"location": l, "count": c} for l, c in top_locations],
            "top_incident_codes": [{"code": c, "count": cnt} for c, cnt in top_incident_codes],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/entities/tail-numbers")
async def get_tail_number_mentions(
    tail_number: Optional[str] = Query(None, description="Specific tail number to search"),
    days_back: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get all radio segments mentioning aircraft tail numbers

    Critical for correlating radio traffic with flight activities
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days_back)

        # Build query
        query = (
            db.query(
                RadioSegment,
                RadioArchive.filename,
                RadioArchive.recording_start,
            )
            .join(RadioTranscription)
            .join(RadioArchive)
            .filter(RadioArchive.recording_start >= start_date)
            .filter(RadioSegment.contains_tail_number == True)
        )

        # Filter by specific tail number if provided
        if tail_number:
            # PostgreSQL array contains operator
            query = query.filter(RadioSegment.tail_numbers.contains([tail_number]))

        results = query.order_by(desc(RadioArchive.recording_start)).limit(100).all()

        mentions = []
        for segment, filename, recording_start in results:
            mentions.append({
                "segment_id": segment.id,
                "filename": filename,
                "recording_start": recording_start.isoformat() if recording_start else None,
                "absolute_timestamp": segment.absolute_timestamp.isoformat() if segment.absolute_timestamp else None,
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "text": segment.text,
                "tail_numbers": segment.tail_numbers,
                "confidence": segment.confidence,
                "urgency_score": segment.urgency_score,
            })

        return {
            "tail_number_filter": tail_number,
            "days_analyzed": days_back,
            "total_mentions": len(mentions),
            "mentions": mentions,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/correlation/flight-radio")
async def get_flight_radio_correlations(
    flight_id: Optional[int] = Query(None, description="Specific flight ID"),
    correlation_type: Optional[str] = Query(None, description="Filter by correlation type"),
    min_strength: float = Query(0.5, ge=0.0, le=1.0, description="Minimum correlation strength"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get correlations between flight activities and radio communications

    Shows when radio traffic mentions specific flights or locations
    """
    try:
        # Build query
        query = (
            db.query(
                FlightRadioCorrelation,
                FlightLog.flight_id,
                FlightLog.callsign,
                FlightLog.departure_time,
                RadioSegment.text,
                RadioSegment.absolute_timestamp,
            )
            .join(FlightLog, FlightRadioCorrelation.flight_log_id == FlightLog.id)
            .join(RadioSegment, FlightRadioCorrelation.radio_segment_id == RadioSegment.id)
            .filter(FlightRadioCorrelation.correlation_strength >= min_strength)
        )

        # Apply filters
        if flight_id:
            query = query.filter(FlightRadioCorrelation.flight_log_id == flight_id)

        if correlation_type:
            query = query.filter(FlightRadioCorrelation.correlation_type == correlation_type)

        results = (
            query.order_by(desc(FlightRadioCorrelation.correlation_strength))
            .limit(limit)
            .all()
        )

        correlations = []
        for corr, flight_id_str, callsign, dep_time, seg_text, seg_timestamp in results:
            correlations.append({
                "correlation_id": corr.id,
                "correlation_type": corr.correlation_type,
                "correlation_strength": corr.correlation_strength,
                "time_difference_seconds": corr.time_difference_seconds,
                "flight": {
                    "id": corr.flight_log_id,
                    "flight_id": flight_id_str,
                    "callsign": callsign,
                    "departure_time": dep_time.isoformat() if dep_time else None,
                },
                "radio_segment": {
                    "id": corr.radio_segment_id,
                    "text": seg_text,
                    "timestamp": seg_timestamp.isoformat() if seg_timestamp else None,
                },
                "matched_keywords": corr.matched_keywords,
                "notes": corr.correlation_notes,
            })

        return {
            "total_correlations": len(correlations),
            "filters": {
                "flight_id": flight_id,
                "correlation_type": correlation_type,
                "min_strength": min_strength,
            },
            "correlations": correlations,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments/high-urgency")
async def get_high_urgency_segments(
    min_urgency: float = Query(0.7, ge=0.0, le=1.0, description="Minimum urgency score"),
    days_back: int = Query(7, ge=1, le=90, description="Number of days to analyze"),
    limit: int = Query(50, ge=1, le=200, description="Maximum results"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get radio segments with high urgency scores

    Identifies priority calls and emergency situations
    """
    try:
        start_date = datetime.utcnow() - timedelta(days=days_back)

        results = (
            db.query(
                RadioSegment,
                RadioArchive.filename,
                RadioArchive.recording_start,
            )
            .join(RadioTranscription)
            .join(RadioArchive)
            .filter(RadioArchive.recording_start >= start_date)
            .filter(RadioSegment.urgency_score >= min_urgency)
            .order_by(desc(RadioSegment.urgency_score))
            .limit(limit)
            .all()
        )

        urgent_segments = []
        for segment, filename, recording_start in results:
            urgent_segments.append({
                "segment_id": segment.id,
                "filename": filename,
                "recording_start": recording_start.isoformat() if recording_start else None,
                "absolute_timestamp": segment.absolute_timestamp.isoformat() if segment.absolute_timestamp else None,
                "urgency_score": segment.urgency_score,
                "text": segment.text,
                "contains_tail_number": segment.contains_tail_number,
                "contains_location": segment.contains_location,
                "contains_incident_code": segment.contains_incident_code,
                "tail_numbers": segment.tail_numbers,
                "locations": segment.locations,
                "incident_codes": segment.incident_codes,
            })

        return {
            "min_urgency": min_urgency,
            "days_analyzed": days_back,
            "total_segments": len(urgent_segments),
            "segments": urgent_segments,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/segments/during-flight")
async def get_segments_during_flight(
    start_time: datetime = Query(..., description="Flight start time"),
    end_time: datetime = Query(..., description="Flight end time"),
    include_audio_url: bool = Query(True, description="Include MP3 audio file URLs"),
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get radio segments that occurred during a specific flight time window

    Returns segments with their audio files for playback during flight replay
    """
    try:
        # Query segments within the time window
        segments = (
            db.query(
                RadioSegment,
                RadioArchive.filename,
                RadioArchive.file_path,
                RadioArchive.recording_start,
                RadioArchive.duration_seconds,
            )
            .join(RadioTranscription, RadioSegment.transcription_id == RadioTranscription.id)
            .join(RadioArchive, RadioTranscription.archive_id == RadioArchive.id)
            .filter(
                and_(
                    RadioSegment.absolute_timestamp >= start_time,
                    RadioSegment.absolute_timestamp <= end_time,
                )
            )
            .order_by(RadioSegment.absolute_timestamp)
            .all()
        )

        results = []
        for segment, filename, file_path, recording_start, duration in segments:
            result = {
                "segment_id": segment.id,
                "timestamp": segment.absolute_timestamp.isoformat() if segment.absolute_timestamp else None,
                "start_time": segment.start_time,
                "end_time": segment.end_time,
                "text": segment.text,
                "urgency_score": segment.urgency_score,
                "tail_numbers": segment.tail_numbers,
                "locations": segment.locations,
                "incident_codes": segment.incident_codes,
                "audio_file": {
                    "filename": filename,
                    "recording_start": recording_start.isoformat() if recording_start else None,
                    "duration_seconds": duration,
                }
            }

            if include_audio_url:
                # Construct audio URL for the MP3 file
                result["audio_file"]["audio_url"] = f"/api/v1/radio/archives/{filename}/audio"
                # Also include the segment-specific start/end times for audio playback
                result["audio_file"]["segment_start"] = segment.start_time
                result["audio_file"]["segment_end"] = segment.end_time

            results.append(result)

        return {
            "start_time": start_time.isoformat(),
            "end_time": end_time.isoformat(),
            "total_segments": len(results),
            "segments": results,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_analysis_stats(
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    """
    Get overall statistics for radio analysis system

    Returns counts and coverage metrics
    """
    try:
        # Get counts
        total_archives = db.query(func.count(RadioArchive.id)).scalar()
        transcribed_archives = db.query(func.count(RadioArchive.id)).filter(RadioArchive.transcribed == True).scalar()
        total_transcriptions = db.query(func.count(RadioTranscription.id)).scalar()
        total_segments = db.query(func.count(RadioSegment.id)).scalar()
        total_keywords = db.query(func.count(RadioKeyword.id)).scalar()
        total_correlations = db.query(func.count(FlightRadioCorrelation.id)).scalar()

        # Segments with entities
        segments_with_tail_numbers = db.query(func.count(RadioSegment.id)).filter(RadioSegment.contains_tail_number == True).scalar()
        segments_with_locations = db.query(func.count(RadioSegment.id)).filter(RadioSegment.contains_location == True).scalar()
        segments_with_codes = db.query(func.count(RadioSegment.id)).filter(RadioSegment.contains_incident_code == True).scalar()

        # Date range
        oldest_archive = db.query(func.min(RadioArchive.recording_start)).scalar()
        newest_archive = db.query(func.max(RadioArchive.recording_start)).scalar()

        return {
            "totals": {
                "archives": total_archives or 0,
                "transcribed_archives": transcribed_archives or 0,
                "transcriptions": total_transcriptions or 0,
                "segments": total_segments or 0,
                "keywords": total_keywords or 0,
                "correlations": total_correlations or 0,
            },
            "entity_extraction": {
                "segments_with_tail_numbers": segments_with_tail_numbers or 0,
                "segments_with_locations": segments_with_locations or 0,
                "segments_with_incident_codes": segments_with_codes or 0,
            },
            "coverage": {
                "transcription_percentage": round((transcribed_archives / total_archives * 100), 1) if total_archives else 0,
                "oldest_archive": oldest_archive.isoformat() if oldest_archive else None,
                "newest_archive": newest_archive.isoformat() if newest_archive else None,
            }
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
