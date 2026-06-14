"""
Radio transcription import tasks

Imports existing JSON transcription files into the database for analysis.
This bridges the gap between file-based transcriptions and the new database schema.
"""
import json
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List
from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.workers.celery_app import celery_app
from app.models.radio import (
    RadioArchive,
    RadioTranscription,
    RadioSegment,
)

logger = logging.getLogger(__name__)

# Data paths
RADIO_DATA_PATH = Path("/app/data/radio/phoenix_pd")


@celery_app.task(bind=True, name="import_transcriptions_from_json")
def import_transcriptions_from_json(
    self,
    directory_path: str = str(RADIO_DATA_PATH),
    batch_size: int = 50,
) -> Dict[str, Any]:
    """
    Import existing JSON transcription files into the database

    Processes .json files created by faster-whisper transcription,
    creates RadioArchive, RadioTranscription, and RadioSegment records.

    Args:
        directory_path: Path to directory containing JSON transcription files
        batch_size: Maximum number of files to process in one run

    Returns:
        Dictionary with import results
    """
    try:
        with SessionLocal() as db:
            imported_count = 0
            reimported_count = 0
            skipped_count = 0
            errors = []

            # Map existing archives by filename so we can (a) skip unchanged files,
            # (b) make progress through ALL files instead of only the first
            # batch_size (the old slice-before-filter logic stalled the backfill),
            # and (c) re-import files whose JSON changed after it was imported
            # (e.g. re-transcribed with an improved pipeline).
            existing = {a.filename: a for a in db.query(RadioArchive).all()}

            all_json = list(Path(directory_path).glob("*.json"))
            logger.info(f"Found {len(all_json)} JSON transcription files")

            worklist = []  # list of (json_file, existing_archive_or_None)
            for jf in all_json:
                fn = jf.with_suffix(".mp3").name
                arch = existing.get(fn)
                if arch is None:
                    worklist.append((jf, None))  # new -> insert
                else:
                    dl_epoch = (
                        arch.downloaded_at.timestamp() if arch.downloaded_at else 0
                    )
                    try:
                        changed = jf.stat().st_mtime > dl_epoch
                    except OSError:
                        changed = False
                    if changed:
                        worklist.append((jf, arch))  # re-transcribed -> re-import

            # Unchanged, already-imported files are skipped this run.
            skipped_count = len(all_json) - len(worklist)
            # Cap work per run AFTER filtering, so each run makes real progress.
            worklist = worklist[:batch_size]

            for json_file, existing_archive in worklist:
                try:
                    # Load transcription data
                    with open(json_file, "r") as f:
                        data = json.load(f)

                    filename = (
                        data.get("filename") or json_file.with_suffix(".mp3").name
                    )

                    # Extract metadata
                    recording_time_str = data.get("recording_time")
                    if recording_time_str:
                        recording_start = datetime.fromisoformat(
                            recording_time_str.replace("Z", "+00:00")
                        )
                    else:
                        # Fall back to file modification time
                        recording_start = datetime.fromtimestamp(
                            json_file.stat().st_mtime
                        )

                    duration = data.get("metadata", {}).get("duration", 0)
                    recording_end = recording_start
                    if duration:
                        from datetime import timedelta

                        recording_end = recording_start + timedelta(seconds=duration)

                    # Get corresponding MP3 file path
                    mp3_file = json_file.with_suffix(".mp3")
                    file_path = str(mp3_file) if mp3_file.exists() else str(json_file)
                    file_size_bytes = (
                        mp3_file.stat().st_size if mp3_file.exists() else 0
                    )

                    if existing_archive is not None:
                        # Re-import: drop the stale transcription (cascade deletes its
                        # segments + keywords) and refresh the archive in place.
                        for old in (
                            db.query(RadioTranscription)
                            .filter(
                                RadioTranscription.archive_id == existing_archive.id
                            )
                            .all()
                        ):
                            db.delete(old)
                        db.flush()
                        archive = existing_archive
                        archive.file_path = file_path
                        archive.file_size_bytes = file_size_bytes
                        archive.recording_start = recording_start
                        archive.recording_end = recording_end
                        archive.duration_seconds = duration
                        archive.transcribed = True
                        archive.downloaded_at = datetime.now()  # mark re-import time
                    else:
                        # Create RadioArchive record
                        archive = RadioArchive(
                            filename=filename,
                            file_path=file_path,
                            file_size_bytes=file_size_bytes,
                            feed_id=data.get("metadata", {}).get("feed_id", "12145"),
                            feed_name=data.get("metadata", {}).get(
                                "feed_name", "Phoenix Police"
                            ),
                            recording_start=recording_start,
                            recording_end=recording_end,
                            duration_seconds=duration,
                            download_source="imported",
                            downloaded_at=datetime.now(),
                            transcribed=True,
                        )
                        db.add(archive)
                        db.flush()  # Get archive ID

                    # Create RadioTranscription record
                    transcribed_at_str = data.get("transcribed_at")
                    if transcribed_at_str:
                        transcribed_at = datetime.fromisoformat(
                            transcribed_at_str.replace("Z", "+00:00")
                        )
                    else:
                        transcribed_at = datetime.now()

                    full_text = data.get("text", "")
                    language = data.get("metadata", {}).get("language", "en")
                    language_probability = data.get("metadata", {}).get(
                        "language_probability", 0.0
                    )

                    transcription = RadioTranscription(
                        archive_id=archive.id,
                        full_text=full_text,
                        language=language,
                        model_name=data.get("model", "unknown"),
                        model_version=data.get("engine", "faster-whisper"),
                        confidence_score=None,  # Not available in JSON
                        no_speech_probability=None,
                        transcribed_at=transcribed_at,
                        transcription_time_seconds=None,
                        worker_hostname=None,
                        detected_language_probability=language_probability,
                        whisper_metadata=data.get("metadata", {}),
                        keywords_extracted=False,
                        entities_extracted=False,
                    )
                    db.add(transcription)
                    db.flush()  # Get transcription ID

                    # Create RadioSegment records
                    segments = data.get("segments", [])
                    for seg in segments:
                        segment = RadioSegment(
                            transcription_id=transcription.id,
                            segment_index=seg.get("id", 0),
                            start_time=seg.get("start", 0),
                            end_time=seg.get("end", 0),
                            duration_seconds=seg.get("end", 0) - seg.get("start", 0),
                            text=seg.get("text", ""),
                            contains_tail_number=False,
                            contains_location=False,
                            contains_incident_code=False,
                            tail_numbers=None,
                            locations=None,
                            incident_codes=None,
                            urgency_score=None,
                            absolute_timestamp=None,
                        )
                        db.add(segment)

                    db.commit()
                    if existing_archive is not None:
                        reimported_count += 1
                    else:
                        imported_count += 1

                    done = imported_count + reimported_count
                    if done % 10 == 0:
                        logger.info(f"Processed {done} transcriptions so far...")

                except Exception as e:
                    db.rollback()
                    error_msg = f"Error importing {json_file.name}: {str(e)}"
                    logger.error(error_msg)
                    errors.append(error_msg)
                    continue

            logger.info(
                f"Import complete: {imported_count} imported, "
                f"{reimported_count} re-imported, {skipped_count} skipped, "
                f"{len(errors)} errors"
            )

            return {
                "success": True,
                "imported": imported_count,
                "reimported": reimported_count,
                "skipped": skipped_count,
                "errors": errors,
                "total_files": len(all_json),
            }

    except Exception as e:
        logger.error(f"Import task failed: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }


@celery_app.task(bind=True, name="batch_import_and_extract")
def batch_import_and_extract(
    self,
    batch_size: int = 50,
) -> Dict[str, Any]:
    """
    Combined task: Import transcriptions and extract entities

    This is a convenience task that:
    1. Imports JSON transcriptions to database
    2. Triggers entity extraction on imported transcriptions

    Args:
        batch_size: Number of files to process per run

    Returns:
        Dictionary with results from both operations
    """
    try:
        # Step 1: Import transcriptions
        logger.info("Step 1: Importing transcriptions from JSON files")
        import_result = import_transcriptions_from_json.apply(
            kwargs={"batch_size": batch_size}
        ).get()

        if not import_result.get("success", False):
            return {
                "success": False,
                "error": "Import failed",
                "import_result": import_result,
            }

        imported_count = import_result.get("imported", 0)

        if imported_count == 0:
            logger.info("No new transcriptions to import")
            return {
                "success": True,
                "imported": 0,
                "extracted": 0,
                "message": "No new transcriptions to process",
            }

        # Step 2: Extract entities from newly imported transcriptions
        logger.info(f"Step 2: Extracting entities from {imported_count} transcriptions")

        # Import the entity extraction task
        from app.workers.radio_analysis_tasks import process_untranscribed_archives

        extract_result = process_untranscribed_archives.apply(
            kwargs={"batch_size": batch_size}
        ).get()

        return {
            "success": True,
            "imported": imported_count,
            "import_result": import_result,
            "extract_result": extract_result,
        }

    except Exception as e:
        logger.error(f"Batch import and extract failed: {str(e)}", exc_info=True)
        return {
            "success": False,
            "error": str(e),
        }
