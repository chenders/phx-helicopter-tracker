"""
Radio archives API endpoints
Provides access to police radio recordings and transcriptions
"""
from fastapi import APIRouter, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from pathlib import Path
import json
import os
import re

from app.workers.radio_tasks import download_broadcastify_archives

# Data path - use same as in radio_tasks.py
RADIO_DATA_PATH = Path("/app/data/radio/phoenix_pd") if os.path.exists("/app/data") else Path(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "radio", "phoenix_pd")))

router = APIRouter()


@router.get("/archives")
async def get_radio_archives(
    limit: int = Query(100, description="Maximum number of archives to return"),
    offset: int = Query(0, description="Number of archives to skip"),
    has_transcription: Optional[bool] = Query(None, description="Filter by transcription status")
) -> Dict[str, Any]:
    """
    Get list of radio archives with metadata
    """
    try:
        # Ensure directory exists
        RADIO_DATA_PATH.mkdir(parents=True, exist_ok=True)
        
        # Get all MP3 files in the radio directory
        mp3_files = sorted(
            RADIO_DATA_PATH.glob("*.mp3"),
            key=lambda x: x.stat().st_mtime,
            reverse=True
        )
        
        archives = []
        for mp3_file in mp3_files[offset:offset + limit]:
            # Check for transcription files
            json_file = mp3_file.with_suffix(".json")
            txt_file = mp3_file.with_suffix(".txt")
            
            has_trans = json_file.exists() or txt_file.exists()
            
            # Skip if filtering by transcription status
            if has_transcription is not None and has_trans != has_transcription:
                continue
            
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
            
            # If transcription exists, add some metadata
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
async def get_transcription(filename: str) -> Dict[str, Any]:
    """
    Get transcription for a specific radio archive
    """
    try:
        # Ensure filename ends with .mp3
        if not filename.endswith(".mp3"):
            filename += ".mp3"
        
        mp3_file = RADIO_DATA_PATH / filename
        if not mp3_file.exists():
            raise HTTPException(status_code=404, detail="Archive not found")
        
        # Try to get JSON transcription first
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


# @router.post("/archives/transcribe")
# async def trigger_transcription(
#     batch_size: int = Query(1, ge=1, le=10, description="Number of files to transcribe"),
#     model_name: Optional[str] = Query(None, description="Whisper model to use")
# ) -> Dict[str, Any]:
#     """
#     Trigger transcription of untranscribed radio archives
#     """
#     # TODO: Implement transcribe_radio_archives task
#     raise HTTPException(status_code=501, detail="Transcription feature not yet implemented")


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