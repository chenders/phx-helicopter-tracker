"""
Celery tasks for radio archive downloading and transcription
"""
import os
import re
import json
import time
import logging
import requests
import random
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from bs4 import BeautifulSoup
from celery import current_task
import whisper

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)

# Broadcastify credentials from environment
#BROADCASTIFY_USERNAME = settings.BROADCASTIFY_USERNAME
#BROADCASTIFY_PASSWORD = settings.BROADCASTIFY_PASSWORD
BROADCASTIFY_USERNAME = "chris@waitingforthefuture.org"
BROADCASTIFY_PASSWORD = "qjt4KRC_mem4rqu8brg"
logger.info(f"Using {BROADCASTIFY_USERNAME} / {BROADCASTIFY_PASSWORD}")
BROADCASTIFY_BASE_URL = "https://www.broadcastify.com"
PHOENIX_PD_FEED_ID = "12145"

# Data paths
RADIO_DATA_PATH = Path("./data/radio/phoenix_pd")
RADIO_DATA_PATH.mkdir(parents=True, exist_ok=True)

# Rate limiting settings
DOWNLOAD_DELAY_SECONDS = 5  # Delay between downloads to be respectful
MAX_DOWNLOADS_PER_RUN = 20  # Limit downloads per task run


@celery_app.task(bind=True, name="download_broadcastify_archives")
def download_broadcastify_archives(
    self,
    feed_id: str = PHOENIX_PD_FEED_ID,
    max_downloads: int = MAX_DOWNLOADS_PER_RUN,
    days_back: int = 7,
) -> Dict[str, Any]:
    """
    Download Broadcastify archives for Phoenix Police feed

    Args:
        feed_id: Broadcastify feed ID
        max_downloads: Maximum number of files to download in this run
        days_back: Number of days back to check for archives

    Returns:
        Dictionary with download results
    """
    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
            "Accept-Encoding": "gzip, deflate",
            "Connection": "keep-alive",
            "Upgrade-Insecure-Requests": "1",
        }
    )

    downloaded_files = []
    skipped_files = []
    errors = []

    try:
        # Update task state
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": "Logging in to Broadcastify",
                "downloaded": 0,
                "skipped": 0,
            },
        )

        # Login to Broadcastify
        session.headers["Referer"] = f"{BROADCASTIFY_BASE_URL}/login"
        login_url = f"{BROADCASTIFY_BASE_URL}/login/"
        login_data = {
            "username": BROADCASTIFY_USERNAME,  # Broadcastify uses 'username' field even for email
            "password": BROADCASTIFY_PASSWORD,
            "action": "auth",
            "redirect": "",
        }
        logger.warning(f"Login data: {login_data}")

        # Perform login
        response = session.post(login_url, data=login_data)

        # Check if login was successful
        if response.status_code != 200 or "failed=1" in response.url:
            logger.error(f"Failed to login to Broadcastify - URL: {response.url}")
            raise Exception("Login failed - check credentials")

        # Verify we have session cookies
        if not session.cookies:
            logger.warning(
                "No cookies set after login - authentication may have failed"
            )

        logger.info("Successfully logged in to Broadcastify")

        # Set AJAX headers
        session.headers.update(
            {
                "Accept": "application/json, text/javascript, */*; q=0.01",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": f"{BROADCASTIFY_BASE_URL}/archives/feed/{feed_id}",
            }
        )

        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)

        downloads_count = 0
        current_date = end_date

        while current_date >= start_date and downloads_count < max_downloads:
            # Format date for AJAX API (MM/DD/YYYY)
            date_str = current_date.strftime("%m/%d/%Y")

            # Get archives via AJAX
            ajax_url = f"{BROADCASTIFY_BASE_URL}/archives/ajax.php"
            params = {"feedId": feed_id, "date": date_str}

            current_task.update_state(
                state="PROCESSING",
                meta={
                    "status": f"Checking archives for {date_str}",
                    "downloaded": len(downloaded_files),
                    "skipped": len(skipped_files),
                },
            )

            response = session.get(ajax_url, params=params)

            if response.status_code != 200:
                logger.warning(
                    f"Failed to get archives for {date_str}: {response.status_code}"
                )
                current_date -= timedelta(days=1)
                continue

            try:
                data = response.json()
                archive_list = data.get("data", [])
            except json.JSONDecodeError:
                logger.warning(f"Invalid JSON response for {date_str}")
                current_date -= timedelta(days=1)
                continue

            # Process each archive
            for archive_data in archive_list:
                if downloads_count >= max_downloads:
                    break

                # Extract archive ID and times
                if not archive_data or len(archive_data) < 3:
                    continue

                archive_id = archive_data[0]  # Format: "12145-1757232947"
                start_time = archive_data[1]  # e.g., "01:15 AM"
                end_time = archive_data[2]  # e.g., "01:45 AM"

                # Generate filename from archive ID and date
                # Convert date back to YYYYMMDD format for filename
                date_for_filename = current_date.strftime("%Y%m%d")
                # Extract timestamp from archive ID
                parts = archive_id.split("-")
                if len(parts) == 2:
                    timestamp = parts[1]
                    filename = f"{date_for_filename}_{timestamp}_{feed_id}.mp3"
                else:
                    filename = f"{date_for_filename}_{archive_id}.mp3"

                file_path = RADIO_DATA_PATH / filename

                # Skip if already downloaded
                if file_path.exists():
                    logger.info(f"Skipping existing file: {filename}")
                    skipped_files.append(str(file_path))
                    continue

                # Build download URL - try both formats
                # Format 1: /archives/download/{archive_id}
                # Format 2: /archives/downloadv2/{archive_id}
                download_urls = [
                    f"{BROADCASTIFY_BASE_URL}/archives/downloadv2/{archive_id}",
                    f"{BROADCASTIFY_BASE_URL}/archives/download/{archive_id}",
                ]

                # Try downloading with each URL format
                downloaded = False
                for download_url in download_urls:
                    try:
                        logger.info(
                            f"Attempting download: {filename} from {download_url}"
                        )
                        download_response = session.get(
                            download_url, stream=True, timeout=30
                        )

                        if download_response.status_code == 200:
                            # Check if it's actually an audio file
                            content_type = download_response.headers.get(
                                "content-type", ""
                            )
                            if (
                                "audio" in content_type
                                or "octet-stream" in content_type
                            ):
                                with open(file_path, "wb") as f:
                                    for chunk in download_response.iter_content(
                                        chunk_size=8192
                                    ):
                                        f.write(chunk)

                                downloaded_files.append(str(file_path))
                                downloads_count += 1
                                logger.info(
                                    f"Downloaded: {filename} ({start_time} - {end_time})"
                                )
                                downloaded = True

                                # Rate limiting
                                time.sleep(DOWNLOAD_DELAY_SECONDS)
                                break
                            else:
                                logger.debug(
                                    f"Non-audio response from {download_url}: {content_type}"
                                )
                        elif download_response.status_code == 404:
                            logger.debug(f"Archive not found at {download_url}")
                        else:
                            logger.debug(
                                f"Failed to download from {download_url}: {download_response.status_code}"
                            )

                    except Exception as e:
                        logger.debug(f"Error trying {download_url}: {str(e)}")
                        continue

                if not downloaded:
                    error_msg = f"Could not download archive {archive_id} ({start_time} - {end_time})"
                    logger.warning(error_msg)
                    errors.append(error_msg)

            # Move to previous day
            current_date -= timedelta(days=1)

        # Final state update
        current_task.update_state(
            state="SUCCESS",
            meta={
                "status": "Completed",
                "downloaded": len(downloaded_files),
                "skipped": len(skipped_files),
                "errors": len(errors),
            },
        )

        return {
            "status": "success",
            "downloaded_files": downloaded_files,
            "skipped_files": skipped_files,
            "errors": errors,
            "total_downloaded": len(downloaded_files),
            "total_skipped": len(skipped_files),
        }

    except Exception as exc:
        logger.error(f"Broadcastify download task failed: {str(exc)}", exc_info=True)

        current_task.update_state(
            state="FAILURE",
            meta={
                "status": "failed",
                "error": str(exc),
            },
        )

        raise exc
    finally:
        session.close()


@celery_app.task(
    bind=True,
    name="transcribe_radio_archives",
    time_limit=7200,  # 2 hours hard limit
    soft_time_limit=6600,  # 1 hour 50 minutes soft limit
)
def transcribe_radio_archives(
    self,
    directory_path: str = str(RADIO_DATA_PATH),
    model_name: str = "base",  # Always use base model for consistency
    batch_size: int = 10,
) -> Dict[str, Any]:
    """
    Transcribe MP3 files in the radio archives directory

    Args:
        directory_path: Path to directory containing MP3 files
        model_name: Whisper model to use (always 'base' for consistency)
        batch_size: Maximum number of files to process in one run

    Returns:
        Dictionary with transcription results
    """
    transcribed_files = []
    skipped_files = []
    errors = []
    model_performance = {}  # Track performance by model

    try:
        # Check if another transcription task is already running
        inspector = celery_app.control.inspect()
        active_tasks = inspector.active()

        if active_tasks:
            for worker, tasks in active_tasks.items():
                for task in tasks:
                    if task['name'] == 'transcribe_radio_archives' and task['id'] != self.request.id:
                        logger.warning(f"Another transcription task is already running: {task['id']}. Skipping.")
                        return {
                            "skipped": True,
                            "reason": "Another transcription task is already running",
                            "existing_task_id": task['id']
                        }

        # Check system load average to determine batch size
        # Only process 2 files if load average is at or below 7
        try:
            load_avg_1min = os.getloadavg()[0]  # Get 1-minute load average
            if load_avg_1min <= 7:
                batch_size = 2
                logger.info(f"System load average: {load_avg_1min:.2f} - Processing 2 files")
            else:
                batch_size = 1
                logger.info(f"System load average: {load_avg_1min:.2f} - High load, processing only 1 file")
        except:
            # If we can't get load average, default to 1 file
            batch_size = 1
            logger.info("Could not determine load average - defaulting to 1 file")

        # Always use base model for consistency and quality
        model_name = "base"
        logger.info(f"Starting transcription: Processing up to {batch_size} files with Whisper model: {model_name}")

        # Load Whisper model
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": f"Loading Whisper model: {model_name}",
                "transcribed": 0,
                "skipped": 0,
                "selected_model": model_name,
            },
        )

        model = whisper.load_model(model_name)
        logger.info(f"Loaded Whisper model: {model_name}")

        # Get list of MP3 files
        mp3_files = list(Path(directory_path).glob("*.mp3"))

        # Filter to only untranscribed files
        files_to_process = []
        for mp3_file in mp3_files:
            # Check if transcription already exists (as .json file)
            json_file = mp3_file.with_suffix(".json")
            if not json_file.exists():
                files_to_process.append(mp3_file)
            else:
                skipped_files.append(str(mp3_file))

        # CRITICAL: Limit to batch size based on system load
        # batch_size was already determined based on load average above
        files_to_process = files_to_process[:batch_size]

        logger.info(f"Processing {len(files_to_process)} file(s) (max {batch_size} per run)")

        for idx, mp3_file in enumerate(files_to_process, 1):
            try:
                current_task.update_state(
                    state="PROCESSING",
                    meta={
                        "status": f"Transcribing file {idx}/{len(files_to_process)}: {mp3_file.name}",
                        "transcribed": len(transcribed_files),
                        "skipped": len(skipped_files),
                        "current_file": mp3_file.name,
                        "progress": idx / len(files_to_process) * 100,
                    },
                )

                logger.info(f"Transcribing: {mp3_file.name}")

                # Track transcription start time for performance metrics
                transcription_start = time.time()

                # Transcribe with Whisper - optimized for accuracy
                result = model.transcribe(
                    str(mp3_file),
                    fp16=False,  # Use FP32 for better accuracy on CPU
                    language="en",  # Explicitly specify English
                    task="transcribe",  # Transcribe, not translate
                    verbose=False,
                    temperature=0,  # Most deterministic results for accuracy
                    best_of=5,  # Use best of 5 candidates for better accuracy (slower)
                    beam_size=5,  # Beam search for better accuracy (slower)
                    patience=1.0,  # Default patience for beam search
                    length_penalty=1.0,  # Default length penalty
                    suppress_tokens="",  # Don't suppress any tokens
                    condition_on_previous_text=True,  # Better context (slower but more accurate)
                    word_timestamps=False,  # We don't need word-level timestamps
                )

                # Track transcription time
                transcription_time = time.time() - transcription_start

                # Prepare transcription data with timestamps and model info
                transcription_data = {
                    "filename": mp3_file.name,
                    "transcribed_at": datetime.now().isoformat(),
                    "model": model_name,
                    "model_performance": {
                        "transcription_time_seconds": round(transcription_time, 2),
                        "file_size_mb": round(mp3_file.stat().st_size / (1024 * 1024), 2),
                    },
                    "text": result["text"],
                    "segments": [],
                }

                # Add segment details with timestamps
                for segment in result.get("segments", []):
                    transcription_data["segments"].append(
                        {
                            "id": segment.get("id"),
                            "start": segment.get("start"),
                            "end": segment.get("end"),
                            "text": segment.get("text", "").strip(),
                        }
                    )

                # Save transcription as JSON
                json_file = mp3_file.with_suffix(".json")
                with open(json_file, "w") as f:
                    json.dump(transcription_data, f, indent=2)

                # Also save plain text version for easy reading
                txt_file = mp3_file.with_suffix(".txt")
                with open(txt_file, "w") as f:
                    f.write(f"Transcription of: {mp3_file.name}\n")
                    f.write(f"Transcribed at: {transcription_data['transcribed_at']}\n")
                    f.write(f"Model: {model_name}\n")
                    f.write(f"Transcription time: {transcription_data['model_performance']['transcription_time_seconds']}s\n")
                    f.write(f"File size: {transcription_data['model_performance']['file_size_mb']}MB\n")
                    f.write("=" * 80 + "\n\n")

                    # Write segments with timestamps
                    for segment in transcription_data["segments"]:
                        start_time = segment["start"]
                        end_time = segment["end"]
                        # Format timestamps as MM:SS
                        start_str = (
                            f"{int(start_time//60):02d}:{int(start_time%60):02d}"
                        )
                        end_str = f"{int(end_time//60):02d}:{int(end_time%60):02d}"
                        f.write(f"[{start_str} - {end_str}] {segment['text']}\n")

                    f.write("\n" + "=" * 80 + "\n")
                    f.write("FULL TEXT:\n\n")
                    f.write(result["text"])

                transcribed_files.append(str(mp3_file))
                logger.info(f"Transcribed: {mp3_file.name}")

            except Exception as e:
                logger.error(f"Error transcribing {mp3_file.name}: {str(e)}")
                errors.append(f"Error transcribing {mp3_file.name}: {str(e)}")

        # Final state update
        current_task.update_state(
            state="SUCCESS",
            meta={
                "status": "Completed",
                "transcribed": len(transcribed_files),
                "skipped": len(skipped_files),
                "errors": len(errors),
            },
        )

        return {
            "status": "success",
            "transcribed_files": transcribed_files,
            "skipped_files": skipped_files,
            "errors": errors,
            "total_transcribed": len(transcribed_files),
            "total_skipped": len(skipped_files),
        }

    except Exception as exc:
        logger.error(f"Transcription task failed: {str(exc)}", exc_info=True)

        current_task.update_state(
            state="FAILURE",
            meta={
                "status": "failed",
                "error": str(exc),
            },
        )

        raise exc


# REMOVED cleanup_old_radio_archives task - we want to keep all radio archives permanently
