"""
Radio transcription analysis worker tasks

Processes transcriptions to:
- Extract entities (tail numbers, locations, incident codes)
- Calculate urgency scores
- Correlate radio segments with flight activities
"""
import logging
import re
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.workers.celery_app import celery_app
from app.models.radio import (
    RadioArchive,
    RadioTranscription,
    RadioSegment,
    RadioKeyword,
    FlightRadioCorrelation,
)
from app.models.flight_logs import FlightLog
from app.models.aircraft import Aircraft

logger = logging.getLogger(__name__)


# Known Phoenix PD helicopter tail numbers
PHOENIX_PD_TAIL_NUMBERS = [
    "N621FB",
    "N623FB",
    "N624FB",
    "N625FB",  # Active fleet
    "N626FB",
    "N627FB",
    "N628FB",  # Former/inactive
]

# Common incident codes and patterns
INCIDENT_CODE_PATTERNS = [
    r"\b10-\d{1,2}\b",  # 10-codes (10-4, 10-33, etc.)
    r"\bCode\s+[123]\b",  # Code 1, Code 2, Code 3
    r"\b11-\d{1,2}\b",  # 11-codes
    r"\b211\b",
    r"\b459\b",
    r"\b484\b",
    r"\b187\b",  # Common penal codes
    r"\b415\b",
    r"\b417\b",
    r"\b245\b",  # Disturbance, weapons, assault
]

# Phoenix street/road patterns
LOCATION_PATTERNS = [
    r"\b\d{1,3}(?:st|nd|rd|th)\s+(?:Street|St|Avenue|Ave)\b",  # Numbered streets
    r"\b(?:Central|7th|19th|24th|32nd|43rd|51st)\s+(?:Avenue|Ave)\b",  # Major avenues
    r"\b(?:Camelback|Indian School|Thomas|McDowell|Van Buren|Buckeye|Broadway|Baseline)\s+(?:Road|Rd)\b",  # Major roads
    r"\b(?:I-10|I-17|Loop 101|Loop 202|US-60)\b",  # Freeways
    r"\b(?:North|South|East|West)\s+\w+\s+(?:Street|Avenue|Road|Boulevard)\b",  # Directional streets
]

# Urgency keywords for scoring
URGENCY_KEYWORDS = {
    "high": [
        "emergency",
        "urgent",
        "code 3",
        "shots fired",
        "officer down",
        "pursuit",
        "in progress",
    ],
    "medium": ["code 2", "respond", "backup", "assist", "priority"],
    "low": ["code 1", "routine", "check", "patrol"],
}


def extract_tail_numbers(text: str) -> List[str]:
    """
    Extract aircraft tail numbers from text

    Looks for N-numbers (FAA registration format: N followed by 3-5 alphanumeric)
    with special focus on known Phoenix PD fleet
    """
    tail_numbers = []

    # Pattern for N-numbers
    n_number_pattern = r"\bN\d{3,5}[A-Z]{0,2}\b"
    matches = re.findall(n_number_pattern, text.upper())

    for match in matches:
        tail_numbers.append(match)

    # Also check for known Phoenix PD tail numbers explicitly
    for known_tail in PHOENIX_PD_TAIL_NUMBERS:
        if known_tail.upper() in text.upper():
            if known_tail not in tail_numbers:
                tail_numbers.append(known_tail)

    return list(set(tail_numbers))  # Remove duplicates


def extract_locations(text: str) -> List[str]:
    """
    Extract location mentions (street names, intersections, landmarks)
    """
    locations = []

    for pattern in LOCATION_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        locations.extend(matches)

    # Look for intersections (e.g., "7th Street and Camelback")
    intersection_pattern = r"\b([\w\s]+(?:Street|Avenue|Road|Boulevard))\s+(?:and|at|near)\s+([\w\s]+(?:Street|Avenue|Road|Boulevard))\b"
    intersections = re.findall(intersection_pattern, text, re.IGNORECASE)
    for intersection in intersections:
        locations.append(f"{intersection[0]} and {intersection[1]}")

    return list(set(locations))  # Remove duplicates


def extract_incident_codes(text: str) -> List[str]:
    """
    Extract incident codes (10-codes, penal codes, etc.)
    """
    codes = []

    for pattern in INCIDENT_CODE_PATTERNS:
        matches = re.findall(pattern, text, re.IGNORECASE)
        codes.extend([m.upper() if isinstance(m, str) else m for m in matches])

    return list(set(codes))  # Remove duplicates


def calculate_urgency_score(text: str) -> float:
    """
    Calculate urgency score (0.0 - 1.0) based on keywords

    Returns:
        Float between 0 and 1, where 1 is highest urgency
    """
    text_lower = text.lower()
    score = 0.0

    # High urgency keywords
    for keyword in URGENCY_KEYWORDS["high"]:
        if keyword in text_lower:
            score += 0.3

    # Medium urgency keywords
    for keyword in URGENCY_KEYWORDS["medium"]:
        if keyword in text_lower:
            score += 0.15

    # Low urgency keywords (actually decrease score)
    for keyword in URGENCY_KEYWORDS["low"]:
        if keyword in text_lower:
            score -= 0.1

    # Cap at 0.0 - 1.0
    return max(0.0, min(1.0, score))


@celery_app.task(bind=True, name="extract_entities_from_transcription")
def extract_entities_from_transcription(
    self,
    transcription_id: int,
) -> Dict[str, Any]:
    """
    Extract entities from a radio transcription

    Processes all segments to identify:
    - Aircraft tail numbers
    - Location mentions
    - Incident codes
    - Urgency scores

    Updates segments with extracted entities and creates keyword records
    """
    try:
        with SessionLocal() as db:
            # Get transcription with segments
            transcription = (
                db.query(RadioTranscription)
                .filter(RadioTranscription.id == transcription_id)
                .first()
            )

            if not transcription:
                return {
                    "success": False,
                    "error": f"Transcription {transcription_id} not found",
                }

            # Get associated archive for timestamp calculation
            archive = (
                db.query(RadioArchive)
                .filter(RadioArchive.id == transcription.archive_id)
                .first()
            )

            if not archive:
                return {
                    "success": False,
                    "error": f"Archive not found for transcription {transcription_id}",
                }

            segments_updated = 0
            keywords_created = 0
            keyword_tracker = {}  # Track keywords across transcription

            # Process each segment
            for segment in transcription.segments:
                # Extract entities
                tail_numbers = extract_tail_numbers(segment.text)
                locations = extract_locations(segment.text)
                incident_codes = extract_incident_codes(segment.text)
                urgency = calculate_urgency_score(segment.text)

                # Calculate absolute timestamp
                if archive.recording_start:
                    absolute_timestamp = archive.recording_start + timedelta(
                        seconds=segment.start_time
                    )
                else:
                    absolute_timestamp = None

                # Update segment
                segment.tail_numbers = tail_numbers if tail_numbers else None
                segment.locations = locations if locations else None
                segment.incident_codes = incident_codes if incident_codes else None
                segment.contains_tail_number = len(tail_numbers) > 0
                segment.contains_location = len(locations) > 0
                segment.contains_incident_code = len(incident_codes) > 0
                segment.urgency_score = urgency
                segment.absolute_timestamp = absolute_timestamp

                segments_updated += 1

                # Track keywords for keyword table
                for tail in tail_numbers:
                    key = ("tail_number", tail)
                    if key not in keyword_tracker:
                        keyword_tracker[key] = {
                            "count": 0,
                            "first_time": segment.start_time,
                            "context": segment.text[:200],
                        }
                    keyword_tracker[key]["count"] += 1

                for loc in locations:
                    key = ("location", loc)
                    if key not in keyword_tracker:
                        keyword_tracker[key] = {
                            "count": 0,
                            "first_time": segment.start_time,
                            "context": segment.text[:200],
                        }
                    keyword_tracker[key]["count"] += 1

                for code in incident_codes:
                    key = ("incident_code", code)
                    if key not in keyword_tracker:
                        keyword_tracker[key] = {
                            "count": 0,
                            "first_time": segment.start_time,
                            "context": segment.text[:200],
                        }
                    keyword_tracker[key]["count"] += 1

            # Create keyword records
            for (kw_type, kw_text), data in keyword_tracker.items():
                keyword = RadioKeyword(
                    transcription_id=transcription_id,
                    keyword=kw_text,
                    keyword_type=kw_type,
                    occurrence_count=data["count"],
                    first_occurrence_time=data["first_time"],
                    context_snippet=data["context"],
                    confidence=0.8,  # Default confidence for regex extraction
                )
                db.add(keyword)
                keywords_created += 1

            # Mark transcription as having entities extracted
            transcription.entities_extracted = True
            transcription.keywords_extracted = True

            db.commit()

            logger.info(
                f"Extracted entities from transcription {transcription_id}: "
                f"{segments_updated} segments updated, {keywords_created} keywords created"
            )

            return {
                "success": True,
                "transcription_id": transcription_id,
                "segments_updated": segments_updated,
                "keywords_created": keywords_created,
            }

    except Exception as e:
        logger.error(
            f"Error extracting entities from transcription {transcription_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": str(e),
        }


@celery_app.task(bind=True, name="correlate_radio_with_flights")
def correlate_radio_with_flights(
    self,
    days_back: int = 7,
    time_window_minutes: int = 30,
) -> Dict[str, Any]:
    """
    Correlate radio segments with flight activities

    Creates FlightRadioCorrelation records when:
    - Radio mentions aircraft tail number near flight time
    - Radio mentions location where flight was hovering
    - Radio activity coincides with flight operations

    Args:
        days_back: Number of days to analyze
        time_window_minutes: Time window for correlation (±minutes)
    """
    try:
        with SessionLocal() as db:
            start_date = datetime.utcnow() - timedelta(days=days_back)
            correlations_created = 0

            # Get radio segments with tail numbers from specified period
            segments_with_tail_numbers = (
                db.query(RadioSegment)
                .join(RadioTranscription)
                .join(RadioArchive)
                .filter(
                    RadioArchive.recording_start >= start_date,
                    RadioSegment.contains_tail_number == True,
                    RadioSegment.tail_numbers.isnot(None),
                )
                .all()
            )

            logger.info(
                f"Found {len(segments_with_tail_numbers)} segments with tail numbers"
            )

            # For each segment with tail numbers, find matching flights
            for segment in segments_with_tail_numbers:
                if not segment.tail_numbers or not segment.absolute_timestamp:
                    continue

                for tail_number in segment.tail_numbers:
                    # Find aircraft by registration
                    aircraft = (
                        db.query(Aircraft)
                        .filter(Aircraft.registration == tail_number)
                        .first()
                    )

                    if not aircraft:
                        continue

                    # Find flights for this aircraft within time window
                    time_window = timedelta(minutes=time_window_minutes)
                    flights = (
                        db.query(FlightLog)
                        .filter(
                            FlightLog.aircraft_id == aircraft.id,
                            or_(
                                # Flight was active during radio mention
                                and_(
                                    FlightLog.departure_time
                                    <= segment.absolute_timestamp + time_window,
                                    FlightLog.arrival_time
                                    >= segment.absolute_timestamp - time_window,
                                ),
                            ),
                        )
                        .all()
                    )

                    for flight in flights:
                        # Check if correlation already exists
                        existing = (
                            db.query(FlightRadioCorrelation)
                            .filter(
                                FlightRadioCorrelation.flight_log_id == flight.id,
                                FlightRadioCorrelation.radio_segment_id == segment.id,
                            )
                            .first()
                        )

                        if existing:
                            continue

                        # Calculate time difference
                        if flight.departure_time:
                            time_diff = abs(
                                (
                                    segment.absolute_timestamp - flight.departure_time
                                ).total_seconds()
                            )
                        else:
                            time_diff = 0

                        # Calculate correlation strength
                        # Stronger if mention is closer in time to flight
                        # Max strength (1.0) if within 5 minutes, decreases to 0.5 at 30 minutes
                        if time_diff <= 300:  # 5 minutes
                            strength = 1.0
                        elif time_diff <= 1800:  # 30 minutes
                            strength = 1.0 - ((time_diff - 300) / 1500 * 0.5)
                        else:
                            strength = 0.5

                        # Create correlation
                        correlation = FlightRadioCorrelation(
                            flight_log_id=flight.id,
                            radio_segment_id=segment.id,
                            correlation_type="tail_number_mention",
                            correlation_strength=strength,
                            time_difference_seconds=time_diff,
                            matched_keywords=[tail_number],
                            correlation_notes=f"Radio mentioned {tail_number} during flight operations",
                        )
                        db.add(correlation)
                        correlations_created += 1

            db.commit()

            logger.info(f"Created {correlations_created} flight-radio correlations")

            return {
                "success": True,
                "correlations_created": correlations_created,
                "days_analyzed": days_back,
                "segments_analyzed": len(segments_with_tail_numbers),
            }

    except Exception as e:
        logger.error(f"Error correlating radio with flights: {str(e)}")
        return {
            "success": False,
            "error": str(e),
        }


@celery_app.task(bind=True, name="process_untranscribed_archives")
def process_untranscribed_archives(
    self,
    batch_size: int = 10,
) -> Dict[str, Any]:
    """
    Process radio archives that have transcriptions but haven't been analyzed

    Extracts entities from transcriptions that don't have entities extracted yet
    """
    try:
        with SessionLocal() as db:
            # Find transcriptions without entity extraction
            unprocessed = (
                db.query(RadioTranscription)
                .filter(
                    RadioTranscription.entities_extracted == False,
                )
                .limit(batch_size)
                .all()
            )

            if not unprocessed:
                logger.info("No unprocessed transcriptions found")
                return {
                    "success": True,
                    "processed": 0,
                    "message": "No unprocessed transcriptions",
                }

            logger.info(f"Found {len(unprocessed)} unprocessed transcriptions")

            # Queue entity extraction tasks
            tasks_queued = 0
            for transcription in unprocessed:
                extract_entities_from_transcription.delay(transcription.id)
                tasks_queued += 1

            logger.info(f"Queued {tasks_queued} entity extraction tasks")

            return {
                "success": True,
                "tasks_queued": tasks_queued,
            }

    except Exception as e:
        logger.error(f"Error processing untranscribed archives: {str(e)}")
        return {
            "success": False,
            "error": str(e),
        }
