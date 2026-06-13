from typing import List, Optional
from datetime import datetime, timezone
from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    BackgroundTasks,
    UploadFile,
    File,
)
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io
import os
import logging
import json
import csv
from pathlib import Path

from app.api.deps import get_db

# Web scraping downloader removed - using API instead
# from app.services.flightradar24_downloader import fr24_downloader, DownloadRequest
from app.workers.data_import_tasks import (
    process_file_import_task,
    get_import_task_status,
)

router = APIRouter()


# General Status endpoint
@router.get("/status")
def get_data_sources_status(*, db: Session = Depends(get_db)) -> dict:
    """Get overall status of all data sources"""
    return {
        "status": "operational",
        "last_check": datetime.now(timezone.utc).isoformat(),
        "data_sources": {
            "flightradar24": {
                "status": "active",
                "authenticated": True,
                "subscription": "Gold",
                "historical_data_available": True,
            },
            "phoenix_pd": {
                "status": "pending",
                "records_requested": True,
                "records_received": False,
                "estimated_response": "5-10 business days",
            },
            "faa": {
                "status": "active",
                "registry_access": True,
                "foia_requests": 2,
                "foia_pending": 1,
            },
            "community": {
                "status": "active",
                "reports_received": 0,
                "verified_reports": 0,
            },
        },
        "total_flights_tracked": 0,
        "total_aircraft_monitored": 8,
        "data_freshness": {"real_time": True, "historical": "2023-01-01 to present"},
    }


# Generic Multi-file Import
@router.post("/import")
async def import_multiple_files(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(..., description="Multiple files to import"),
    source: Optional[str] = Query("manual", description="Data source identifier"),
    aircraft_registrations: Optional[List[str]] = Query(
        None, description="Aircraft registrations filter"
    ),
    start_date: Optional[str] = Query(
        None, description="Data start date filter (YYYY-MM-DD)"
    ),
    end_date: Optional[str] = Query(
        None, description="Data end date filter (YYYY-MM-DD)"
    ),
) -> dict:
    """Import multiple historical flight data files (CSV, KML, JSON)"""

    if not files:
        raise HTTPException(status_code=400, detail="No files provided")

    # Validate file formats and sizes
    allowed_formats = [".kml", ".csv", ".json"]
    max_file_size = 50 * 1024 * 1024  # 50MB per file

    processed_files = []
    errors = []

    for file in files:
        # Check file format
        if not any(file.filename.lower().endswith(fmt) for fmt in allowed_formats):
            errors.append(
                {
                    "filename": file.filename,
                    "error": f"Unsupported file format. Allowed: {allowed_formats}",
                }
            )
            continue

        # Check file size
        if file.size and file.size > max_file_size:
            errors.append(
                {
                    "filename": file.filename,
                    "error": f"File size ({round(file.size / 1024 / 1024, 2)}MB) exceeds limit (50MB)",
                }
            )
            continue

        processed_files.append(
            {
                "filename": file.filename,
                "size_mb": round(file.size / 1024 / 1024, 2) if file.size else 0,
                "format": file.filename.split(".")[-1].lower(),
                "status": "queued",
            }
        )

    if not processed_files:
        raise HTTPException(
            status_code=400, detail=f"No valid files to process. Errors: {errors}"
        )

    # Validate date range if provided
    if start_date and end_date and end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    # Create data directory if it doesn't exist
    data_dir = Path("/app/data/imports")
    data_dir.mkdir(parents=True, exist_ok=True)

    import_id = f"multi_import_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    import_dir = data_dir / import_id
    import_dir.mkdir(exist_ok=True)

    # Save uploaded files
    saved_file_paths = []
    for idx, file in enumerate(files):
        if not any(file.filename.lower().endswith(fmt) for fmt in allowed_formats):
            continue

        # Save file to disk
        file_path = import_dir / file.filename
        content = await file.read()

        with open(file_path, "wb") as f:
            f.write(content)

        saved_file_paths.append(str(file_path))

        # Reset file position for potential reuse
        await file.seek(0)

    # Prepare filters for background processing
    filters_dict = {
        "aircraft_registrations": aircraft_registrations,
        "start_date": start_date,
        "end_date": end_date,
    }

    # Queue Celery task for file processing
    task = process_file_import_task.delay(saved_file_paths, import_id, filters_dict)

    logging.info(
        {
            "message": f"Multiple file import initiated for {len(processed_files)} files",
            "import_id": import_id,
            "source": source,
            "files": processed_files,
            "errors": errors,
            "filters": {
                "aircraft_registrations": aircraft_registrations,
                "start_date": start_date,
                "end_date": end_date,
            },
            "status": "processing",
            "estimated_completion": f"{len(processed_files) * 3}-{len(processed_files) * 10} minutes",
        }
    )
    return {
        "message": f"Multiple file import initiated for {len(processed_files)} files",
        "import_id": import_id,
        "task_id": task.id,
        "source": source,
        "files": processed_files,
        "errors": errors,
        "filters": {
            "aircraft_registrations": aircraft_registrations,
            "start_date": start_date,
            "end_date": end_date,
        },
        "status": "processing",
        "estimated_completion": f"{len(processed_files) * 3}-{len(processed_files) * 10} minutes",
    }


# Import Status endpoint
@router.get("/import/{import_id}/status")
def get_import_status(*, import_id: str) -> dict:
    """Get status of a file import task"""

    # Try to extract task ID from import_id or use it directly
    # This handles both import_id and task_id formats
    task_id = import_id

    try:
        task_status = get_import_task_status(task_id)
        return task_status
    except Exception as e:
        return {
            "import_id": import_id,
            "task_id": task_id,
            "state": "UNKNOWN",
            "error": str(e),
            "ready": False,
        }


# FlightRadar24 Web Scraping Download endpoints - REMOVED
# Use the API-based historical import instead (/api/historical/import/historical)
# The API provides more reliable access to historical data without requiring web scraping
# Previous endpoints:
#   - POST /flightradar24/download (single aircraft)
#   - POST /flightradar24/download-multiple (multiple aircraft)
# Were removed because they relied on web scraping with FR24_USERNAME/PASSWORD
# The official API is more reliable and doesn't require these credentials


# FlightRadar24 Integration
@router.get("/flightradar24/status")
def get_flightradar24_status() -> dict:
    """Get FlightRadar24 integration status"""
    return {
        "service": "FlightRadar24",
        "subscription": "Gold",
        "status": "active",
        "historical_data_available": True,
        "max_historical_days": 365,
        "export_formats": ["KML", "CSV", "JSON"],
        "rate_limits": {"requests_per_hour": 100, "remaining": 87},
        "features": {
            "real_time_tracking": True,
            "historical_playback": True,
            "flight_details": True,
            "bulk_export": True,
        },
    }


@router.post("/flightradar24/import")
def import_flightradar24_data(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    aircraft_registration: str = Query(..., description="Aircraft registration"),
    start_date: datetime = Query(..., description="Data start date"),
    end_date: datetime = Query(..., description="Data end date"),
) -> dict:
    """Import historical flight data from FlightRadar24"""

    # Validate file format
    allowed_formats = [".kml", ".csv", ".json"]
    if not any(file.filename.lower().endswith(fmt) for fmt in allowed_formats):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format. Allowed: {allowed_formats}",
        )

    # Validate date range
    if end_date <= start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    if (end_date - start_date).days > 365:
        raise HTTPException(status_code=400, detail="Data range cannot exceed 365 days")

    # TODO: Save uploaded file and queue processing
    import_id = f"fr24_import_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    return {
        "message": "FlightRadar24 data import initiated",
        "import_id": import_id,
        "aircraft_registration": aircraft_registration,
        "file_name": file.filename,
        "file_size_mb": round(file.size / 1024 / 1024, 2) if file.size else 0,
        "date_range": {"start": start_date, "end": end_date},
        "status": "processing",
        "estimated_completion": "5-15 minutes",
    }


@router.get("/flightradar24/imports")
def get_flightradar24_imports(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by import status"),
) -> dict:
    """Get FlightRadar24 import history"""
    # TODO: Retrieve import history from database

    return {"imports": [], "total": 0, "page": skip // limit + 1, "size": 0}


@router.get("/flightradar24/export/{aircraft_registration}")
def export_flightradar24_data(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    aircraft_registration: str,
    start_date: datetime = Query(..., description="Export start date"),
    end_date: datetime = Query(..., description="Export end date"),
    format: str = Query("csv", regex="^(csv|kml|json)$", description="Export format"),
) -> dict:
    """Export flight data in FlightRadar24 format"""

    # TODO: Queue background task to export flight data
    export_id = f"fr24_export_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    return {
        "message": "Data export initiated",
        "export_id": export_id,
        "aircraft_registration": aircraft_registration,
        "format": format,
        "date_range": {"start": start_date, "end": end_date},
        "status": "processing",
        "estimated_completion": "3-10 minutes",
    }


# Phoenix Public Records Integration
@router.get("/phoenix-pd/status")
def get_phoenix_pd_records_status() -> dict:
    """Get Phoenix PD public records integration status"""
    return {
        "service": "Phoenix PD Public Records",
        "portal_url": "https://phxpublicsafety.phoenix.gov",
        "last_request_date": "2024-01-15",
        "pending_requests": 3,
        "received_records": 47,
        "processed_records": 42,
        "records_with_helicopter_data": 38,
        "next_scheduled_request": "2024-02-01",
    }


@router.post("/phoenix-pd/request")
def submit_public_records_request(
    *,
    db: Session = Depends(get_db),
    request_subject: str = Query(..., description="Subject line for request"),
    record_types: List[str] = Query(..., description="Types of records to request"),
    date_range_start: datetime = Query(..., description="Records date range start"),
    date_range_end: datetime = Query(..., description="Records date range end"),
    specific_aircraft: Optional[List[str]] = Query(
        None, description="Specific aircraft to include"
    ),
    pattern_correlation: Optional[bool] = Query(
        False, description="Correlate with pattern analysis"
    ),
) -> dict:
    """Submit new public records request to Phoenix PD"""

    request_id = f"pr_req_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    # TODO: Generate formal request document and submit

    return {
        "message": "Public records request submitted",
        "request_id": request_id,
        "subject": request_subject,
        "record_types": record_types,
        "date_range": {"start": date_range_start, "end": date_range_end},
        "status": "submitted",
        "expected_response_date": "5-10 business days",
        "estimated_cost": "$5.00 convenience fee",
    }


@router.get("/phoenix-pd/requests")
def get_public_records_requests(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None, description="Filter by request status"),
) -> dict:
    """Get submitted public records requests"""
    # TODO: Retrieve requests from database

    return {"requests": [], "total": 0, "page": skip // limit + 1, "size": 0}


# FAA Records Integration
@router.get("/faa/status")
def get_faa_records_status() -> dict:
    """Get FAA records integration status"""
    return {
        "service": "FAA Records",
        "aircraft_registry_access": True,
        "flight_data_access": "limited",
        "registration_lookups_today": 5,
        "pending_foia_requests": 1,
        "last_registry_sync": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/faa/aircraft/{registration}")
def lookup_faa_aircraft_registration(
    *, db: Session = Depends(get_db), registration: str
) -> dict:
    """Lookup aircraft registration in FAA database"""
    # TODO: Implement FAA registry lookup

    return {
        "registration": registration,
        "make": "Airbus Helicopters",
        "model": "H125",
        "year": 2018,
        "registered_owner": "City of Phoenix",
        "registration_status": "Valid",
        "expiration_date": "2027-03-31",
        "aircraft_type": "Rotorcraft",
        "engine_type": "Turboshaft",
        "source": "FAA Aircraft Registry",
    }


@router.post("/faa/foia-request")
def submit_faa_foia_request(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    request_description: str = Query(
        ..., description="Description of records requested"
    ),
    aircraft_registrations: Optional[List[str]] = Query(
        None, description="Specific aircraft"
    ),
    date_range_start: Optional[datetime] = Query(None, description="Date range start"),
    date_range_end: Optional[datetime] = Query(None, description="Date range end"),
) -> dict:
    """Submit FOIA request to FAA"""

    foia_id = f"faa_foia_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    # TODO: Generate and submit FOIA request

    return {
        "message": "FAA FOIA request submitted",
        "foia_id": foia_id,
        "description": request_description,
        "aircraft": aircraft_registrations,
        "status": "submitted",
        "expected_response": "20 business days",
        "tracking_url": f"https://www.faa.gov/foia/track/{foia_id}",
    }


# Community Data Sources
@router.get("/community/status")
def get_community_data_status() -> dict:
    """Get community-contributed data status"""
    return {
        "active_contributors": 12,
        "surveillance_reports_this_month": 23,
        "verified_patterns": 18,
        "photo_submissions": 45,
        "video_submissions": 12,
        "audio_submissions": 8,
        "average_response_time": "2.3 hours",
        "data_quality_score": 0.87,
    }


@router.post("/community/contribute")
def submit_community_data(
    *,
    db: Session = Depends(get_db),
    data_type: str = Query(
        ...,
        regex="^(sighting|surveillance|media|tip)$",
        description="Type of contribution",
    ),
    aircraft_registration: Optional[str] = Query(
        None, description="Aircraft registration if known"
    ),
    location_lat: float = Query(..., description="Location latitude"),
    location_lon: float = Query(..., description="Location longitude"),
    timestamp: datetime = Query(..., description="When observation occurred"),
    description: str = Query(..., description="Description of observation"),
    contributor_contact: Optional[str] = Query(
        None, description="Contact info for follow-up"
    ),
) -> dict:
    """Submit community-contributed data"""

    contribution_id = (
        f"community_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"
    )

    # TODO: Create community contribution record

    return {
        "message": "Community contribution received",
        "contribution_id": contribution_id,
        "data_type": data_type,
        "status": "under_review",
        "estimated_verification": "24-48 hours",
        "legal_use_potential": "high"
        if data_type in ["surveillance", "media"]
        else "medium",
    }


# Data Integration and Analysis
@router.get("/integration/status")
def get_data_integration_status() -> dict:
    """Get overall data integration status"""
    return {
        "sources": {
            "flightradar24": {"status": "active", "last_import": "2024-01-20"},
            "phoenix_pd": {"status": "pending", "next_request": "2024-02-01"},
            "faa": {"status": "active", "last_lookup": datetime.now(timezone.utc)},
            "community": {"status": "active", "contributions_today": 3},
        },
        "data_quality": {
            "overall_score": 0.89,
            "completeness": 0.85,
            "accuracy": 0.92,
            "timeliness": 0.91,
        },
        "processing": {
            "pending_imports": 2,
            "processing_queue": 5,
            "failed_jobs": 0,
            "last_successful_sync": datetime.now(timezone.utc),
        },
    }


@router.post("/integration/sync-all")
def sync_all_data_sources(
    *,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks,
    force_refresh: bool = Query(False, description="Force refresh all sources"),
) -> dict:
    """Sync data from all available sources"""

    # TODO: Queue background tasks for all data source syncs
    sync_id = f"sync_all_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}"

    return {
        "message": "Data synchronization initiated for all sources",
        "sync_id": sync_id,
        "sources_included": [
            "flightradar24",
            "phoenix_pd",
            "faa",
            "community",
        ],
        "force_refresh": force_refresh,
        "status": "processing",
        "estimated_completion": "10-20 minutes",
    }


@router.get("/integration/conflicts")
def get_data_conflicts(
    *,
    db: Session = Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
) -> dict:
    """Get data conflicts between sources that need resolution"""
    # TODO: Identify conflicts between different data sources

    return {
        "conflicts": [],
        "total": 0,
        "resolution_needed": 0,
        "auto_resolved": 0,
        "manual_review_required": 0,
    }


@router.post("/integration/resolve-conflict/{conflict_id}")
def resolve_data_conflict(
    *,
    db: Session = Depends(get_db),
    conflict_id: str,
    resolution: str = Query(..., description="How to resolve the conflict"),
    preferred_source: str = Query(
        ..., description="Preferred data source for this type of conflict"
    ),
) -> dict:
    """Resolve specific data conflict"""

    # TODO: Implement conflict resolution

    return {
        "message": f"Data conflict {conflict_id} resolved",
        "resolution": resolution,
        "preferred_source": preferred_source,
        "status": "resolved",
    }
