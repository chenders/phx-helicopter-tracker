"""
Radio archives API endpoints
Provides access to police radio recordings and transcriptions
"""
from fastapi import APIRouter, HTTPException, Query, Request, Response, Depends
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import json
import os
import re

from app.db.database import get_db
from app.models.radio import RadioArchive, RadioTranscription
from app.workers.radio_tasks import download_broadcastify_archives

# Data path - use same as in radio_tasks.py
RADIO_DATA_PATH = Path("/app/data/radio/phoenix_pd") if os.path.exists("/app/data") else Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "radio", "phoenix_pd")))

router = APIRouter()


@router.get("/archives")
async def get_radio_archives(
    limit: int = Query(100, description="Maximum number of archives to return"),
    offset: int = Query(0, description="Number of archives to skip"),
    has_transcription: Optional[bool] = Query(None, description="Filter by transcription status"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """
    Get list of radio archives with metadata
    Combines filesystem MP3 files with database transcription status
    """
    try:
        # Ensure directory exists
        RADIO_DATA_PATH.mkdir(parents=True, exist_ok=True)

        # Get all MP3 files in the radio directory
        all_mp3_files = sorted(
            RADIO_DATA_PATH.glob("*.mp3"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )

        # Query database for all transcriptions to create lookup map
        db_archives = db.query(RadioArchive).filter(RadioArchive.transcribed == True).all()
        db_transcription_map = {archive.filename: archive for archive in db_archives}

        # Apply transcription filter BEFORE pagination
        mp3_files = []
        for mp3_file in all_mp3_files:
            # Check both filesystem and database for transcription
            json_file = mp3_file.with_suffix(".json")
            txt_file = mp3_file.with_suffix(".txt")
            has_file_trans = json_file.exists() or txt_file.exists()
            has_db_trans = mp3_file.name in db_transcription_map
            has_trans = has_file_trans or has_db_trans

            # Skip if filtering by transcription status
            if has_transcription is not None and has_trans != has_transcription:
                continue

            mp3_files.append(mp3_file)

        # Now apply pagination
        archives = []
        for mp3_file in mp3_files[offset:offset + limit]:
            # Check for transcription files
            json_file = mp3_file.with_suffix(".json")
            txt_file = mp3_file.with_suffix(".txt")
            has_file_trans = json_file.exists() or txt_file.exists()
            has_db_trans = mp3_file.name in db_transcription_map
            has_trans = has_file_trans or has_db_trans

            # Get file metadata
            file_stat = mp3_file.stat()
            archive_info = {
                "filename": mp3_file.name,
                "size_mb": round(file_stat.st_size / (1024 * 1024), 2),
                "created_at": datetime.fromtimestamp(file_stat.st_mtime).isoformat(),
                "has_transcription": has_trans,
                "transcription_json": json_file.name if json_file.exists() else None,
                "transcription_text": txt_file.name if txt_file.exists() else None,
            }

            # If transcription exists in filesystem JSON, add metadata from there
            if json_file.exists():
                try:
                    with open(json_file, 'r') as f:
                        trans_data = json.load(f)
                        archive_info["transcription_model"] = trans_data.get("model")
                        archive_info["transcribed_at"] = trans_data.get("transcribed_at")
                        if "model_performance" in trans_data:
                            archive_info["transcription_time"] = trans_data["model_performance"].get("transcription_time_seconds")
                except Exception:
                    pass
            # Otherwise, if in database, add metadata from there
            elif has_db_trans:
                db_archive = db_transcription_map[mp3_file.name]
                if db_archive.transcription:
                    archive_info["transcription_model"] = db_archive.transcription.model_name
                    archive_info["transcribed_at"] = db_archive.transcription.created_at.isoformat() if db_archive.transcription.created_at else None

            archives.append(archive_info)

        return {
            "total": len(mp3_files),
            "offset": offset,
            "limit": limit,
            "archives": archives
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats")
async def get_archive_stats() -> Dict[str, Any]:
    """
    Get statistics about radio archives
    """
    try:
        # Ensure directory exists
        RADIO_DATA_PATH.mkdir(parents=True, exist_ok=True)
        
        mp3_files = list(RADIO_DATA_PATH.glob("*.mp3"))
        json_files = list(RADIO_DATA_PATH.glob("*.json"))
        
        total_size_mb = sum(f.stat().st_size for f in mp3_files) / (1024 * 1024) if mp3_files else 0
        
        # Get date range
        if mp3_files:
            oldest = min(f.stat().st_mtime for f in mp3_files)
            newest = max(f.stat().st_mtime for f in mp3_files)
            date_range = {
                "oldest": datetime.fromtimestamp(oldest).isoformat(),
                "newest": datetime.fromtimestamp(newest).isoformat()
            }
        else:
            date_range = None
        
        # Calculate storage growth rate
        storage_growth_per_day = 0
        if mp3_files and date_range:
            # Get files from last 7 days for more accurate average
            seven_days_ago = datetime.now() - timedelta(days=7)
            recent_files = [f for f in mp3_files if datetime.fromtimestamp(f.stat().st_mtime) > seven_days_ago]
            
            if recent_files:
                recent_size_mb = sum(f.stat().st_size for f in recent_files) / (1024 * 1024)
                days_of_data = min(7, (datetime.now() - datetime.fromtimestamp(oldest)).days)
                if days_of_data > 0:
                    storage_growth_per_day = round(recent_size_mb / days_of_data, 2)
        
        # Count by model type
        model_counts = {}
        total_transcription_time = 0
        for json_file in json_files:
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    model = data.get("model", "unknown")
                    model_counts[model] = model_counts.get(model, 0) + 1
                    
                    if "model_performance" in data:
                        total_transcription_time += data["model_performance"].get("transcription_time_seconds", 0)
            except Exception:
                pass
        
        return {
            "total_archives": len(mp3_files),
            "total_transcribed": len(json_files),
            "transcription_percentage": round(len(json_files) / len(mp3_files) * 100, 1) if mp3_files else 0,
            "total_size_mb": round(total_size_mb, 2),
            "date_range": date_range,
            "model_usage": model_counts,
            "storage_growth_per_day_mb": storage_growth_per_day,
            "total_transcription_time_seconds": round(total_transcription_time, 2),
            "average_transcription_time_seconds": round(total_transcription_time / len(json_files), 2) if json_files else 0
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/archives/{filename}/transcription")
async def get_transcription(filename: str, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Get transcription for a specific radio archive
    Checks both filesystem and database for transcription
    """
    try:
        # Ensure filename ends with .mp3
        if not filename.endswith(".mp3"):
            filename += ".mp3"

        mp3_file = RADIO_DATA_PATH / filename
        if not mp3_file.exists():
            raise HTTPException(status_code=404, detail="Archive not found")

        # Try to get JSON transcription from filesystem first
        json_file = mp3_file.with_suffix(".json")
        if json_file.exists():
            with open(json_file, 'r') as f:
                return json.load(f)

        # Fall back to text file
        txt_file = mp3_file.with_suffix(".txt")
        if txt_file.exists():
            with open(txt_file, 'r') as f:
                return {
                    "filename": filename,
                    "text": f.read(),
                    "segments": []
                }

        # Finally, check database
        db_archive = db.query(RadioArchive).filter(RadioArchive.filename == filename).first()
        if db_archive and db_archive.transcription:
            trans = db_archive.transcription

            # Query segments for this transcription
            from app.models.radio import RadioSegment
            segments = db.query(RadioSegment).filter(
                RadioSegment.transcription_id == trans.id
            ).order_by(RadioSegment.start_time).all()

            # Format response to match filesystem JSON structure
            return {
                "filename": filename,
                "text": trans.full_text,
                "model": trans.model_name,
                "language": trans.language,
                "transcribed_at": trans.created_at.isoformat() if trans.created_at else None,
                "segments": [
                    {
                        "id": seg.id,
                        "start": seg.start_time,
                        "end": seg.start_time + seg.duration_seconds,
                        "text": seg.text
                    }
                    for seg in segments
                ]
            }

        raise HTTPException(status_code=404, detail="Transcription not found")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search")
async def search_transcriptions(
    query: str = Query(..., description="Search query"),
    limit: int = Query(50, description="Maximum results")
) -> List[Dict[str, Any]]:
    """
    Search through transcriptions
    """
    try:
        results = []
        json_files = RADIO_DATA_PATH.glob("*.json")
        
        for json_file in json_files:
            if len(results) >= limit:
                break
            
            try:
                with open(json_file, 'r') as f:
                    data = json.load(f)
                    text = data.get("text", "").lower()
                    
                    if query.lower() in text:
                        # Find matching segments
                        matching_segments = []
                        for segment in data.get("segments", []):
                            if query.lower() in segment.get("text", "").lower():
                                matching_segments.append(segment)
                        
                        results.append({
                            "filename": data.get("filename"),
                            "transcribed_at": data.get("transcribed_at"),
                            "model": data.get("model"),
                            "matching_segments": matching_segments[:5],  # Limit to first 5 matches
                            "total_matches": len(matching_segments)
                        })
            except Exception:
                continue
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/archives/download")
async def trigger_archive_download(
    days_back: int = Query(1, ge=1, le=7, description="Number of days to download"),
    max_downloads: int = Query(5, ge=1, le=20, description="Maximum files to download")
) -> Dict[str, Any]:
    """
    Trigger download of radio archives from Broadcastify
    """
    task = download_broadcastify_archives.delay(
        max_downloads=max_downloads,
        days_back=days_back
    )
    
    return {
        "task_id": task.id,
        "status": "Task queued",
        "parameters": {
            "days_back": days_back,
            "max_downloads": max_downloads
        }
    }


@router.post("/archives/transcribe")
async def trigger_transcription(
    batch_size: int = Query(1, ge=1, le=10, description="Number of files to transcribe"),
    model_name: str = Query("base", description="Whisper model to use (tiny, base, small, medium, large)")
) -> Dict[str, Any]:
    """
    Trigger transcription of untranscribed radio archives
    Uses faster-whisper on dedicated GPU worker
    """
    from app.workers.radio_tasks_faster_whisper import transcribe_phoenix_pd_archives_faster

    task = transcribe_phoenix_pd_archives_faster.apply_async(
        kwargs={
            "directory_path": str(RADIO_DATA_PATH),
            "model_name": model_name,
            "batch_size": batch_size
        },
        queue='transcription'  # Route to GPU worker
    )

    return {
        "task_id": task.id,
        "status": "Task queued for GPU worker",
        "parameters": {
            "batch_size": batch_size,
            "model_name": model_name,
            "queue": "transcription"
        },
        "note": "Task will be processed by dedicated GPU transcription worker"
    }


@router.get("/archives/{filename}/audio")
async def get_audio_file(filename: str, request: Request):
    """
    Stream audio file for playback with Range request support for seeking
    """
    try:
        # Ensure filename ends with .mp3
        if not filename.endswith(".mp3"):
            filename += ".mp3"
        
        file_path = RADIO_DATA_PATH / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Get file size
        file_size = file_path.stat().st_size
        
        # Check for Range header
        range_header = request.headers.get('range')
        
        if range_header:
            # Parse range header (e.g., "bytes=0-1023")
            range_match = re.match(r'bytes=(\d+)-(\d*)', range_header)
            if range_match:
                start = int(range_match.group(1))
                end = int(range_match.group(2)) if range_match.group(2) else file_size - 1
                
                # Ensure valid range
                if start >= file_size:
                    raise HTTPException(status_code=416, detail="Range Not Satisfiable")
                
                end = min(end, file_size - 1)
                content_length = end - start + 1
                
                # Open file and seek to start position
                with open(file_path, 'rb') as file_handle:
                    file_handle.seek(start)
                    # Read the requested range
                    data = file_handle.read(content_length)
                
                # Return partial content response
                return Response(
                    content=data,
                    status_code=206,
                    headers={
                        'Content-Type': 'audio/mpeg',
                        'Content-Length': str(content_length),
                        'Content-Range': f'bytes {start}-{end}/{file_size}',
                        'Accept-Ranges': 'bytes',
                    }
                )
        
        # No range header, return full file with Accept-Ranges header
        return FileResponse(
            path=str(file_path),
            media_type="audio/mpeg",
            filename=filename,
            headers={
                'Accept-Ranges': 'bytes',
                'Content-Length': str(file_size)
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/archives/by-timerange")
async def get_archives_by_timerange(
    start_time: datetime = Query(..., description="Start of time range (ISO format)"),
    end_time: datetime = Query(..., description="End of time range (ISO format)"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get radio archives that overlap with a specific time range
    Used to find radio communications during a flight

    Returns archives where:
    - archive.recording_start <= end_time
    - archive.recording_end >= start_time
    """
    try:
        # Query archives that overlap with the time range
        archives = db.query(RadioArchive).filter(
            and_(
                RadioArchive.recording_start <= end_time,
                RadioArchive.recording_end >= start_time,
                RadioArchive.transcribed == True  # Only return transcribed archives
            )
        ).order_by(RadioArchive.recording_start).all()

        # Format response
        result = []
        for archive in archives:
            archive_data = {
                "id": archive.id,
                "filename": archive.filename,
                "recording_start": archive.recording_start.isoformat() if archive.recording_start else None,
                "recording_end": archive.recording_end.isoformat() if archive.recording_end else None,
                "duration_seconds": archive.duration_seconds,
                "has_transcription": archive.transcribed,
                "file_size_mb": round(archive.file_size_bytes / (1024 * 1024), 2) if archive.file_size_bytes else None,
            }

            # Add transcription info if available
            if archive.transcription:
                archive_data["transcription"] = {
                    "id": archive.transcription.id,
                    "model_name": archive.transcription.model_name,
                    "full_text_preview": archive.transcription.full_text[:200] + "..." if len(archive.transcription.full_text) > 200 else archive.transcription.full_text,
                    "language": archive.transcription.language,
                    "confidence_score": archive.transcription.confidence_score,
                    "entities_extracted": archive.transcription.entities_extracted,
                }

            result.append(archive_data)

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/activity/by-timerange")
async def get_radio_activity_by_timerange(
    start_time: datetime = Query(..., description="Start of time range (ISO format)"),
    end_time: datetime = Query(..., description="End of time range (ISO format)"),
    include_locations: bool = Query(True, description="Only include segments with location data"),
    db: Session = Depends(get_db)
) -> List[Dict[str, Any]]:
    """
    Get radio activity (segments with locations and urgency) for CAD visualization
    
    Returns radio segments within the time range that contain:
    - Location mentions (street names, intersections)
    - Urgency scores for color coding
    - Incident codes for context
    
    Used to visualize where police activity was occurring during a flight
    """
    try:
        from app.models.radio import RadioSegment, RadioTranscription, RadioArchive
        
        # Query segments within time range
        query = db.query(RadioSegment).join(
            RadioTranscription, RadioSegment.transcription_id == RadioTranscription.id
        ).join(
            RadioArchive, RadioTranscription.archive_id == RadioArchive.id
        ).filter(
            and_(
                RadioSegment.absolute_timestamp >= start_time,
                RadioSegment.absolute_timestamp <= end_time
            )
        )
        
        # Optionally filter to only segments with location data
        if include_locations:
            query = query.filter(RadioSegment.contains_location == True)
        
        segments = query.order_by(RadioSegment.absolute_timestamp).limit(500).all()
        
        # Format response
        result = []
        for segment in segments:
            segment_data = {
                "id": segment.id,
                "timestamp": segment.absolute_timestamp.isoformat() if segment.absolute_timestamp else None,
                "text": segment.text[:200] + "..." if len(segment.text) > 200 else segment.text,
                "urgency_score": segment.urgency_score,
                "locations": segment.locations if segment.locations else [],
                "incident_codes": segment.incident_codes if segment.incident_codes else [],
                "tail_numbers": segment.tail_numbers if segment.tail_numbers else [],
                "contains_tail_number": segment.contains_tail_number,
                "contains_location": segment.contains_location,
                "contains_incident_code": segment.contains_incident_code,
                "start_time": segment.start_time,
                "duration_seconds": segment.duration_seconds,
            }
            
            result.append(segment_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
