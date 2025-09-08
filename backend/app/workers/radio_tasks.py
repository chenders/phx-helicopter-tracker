"""
Celery tasks for radio archive downloading and transcription
"""
import os
import re
import json
import time
import logging
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from bs4 import BeautifulSoup
from celery import current_task
import whisper

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal

logger = logging.getLogger(__name__)

# Broadcastify credentials
BROADCASTIFY_USERNAME = "chris@waitingforthefuture.org"
BROADCASTIFY_PASSWORD = "qjt4KRC_mem4rqu8brg"
BROADCASTIFY_BASE_URL = "https://www.broadcastify.com"
PHOENIX_PD_FEED_ID = "12145"

# Data paths
RADIO_DATA_PATH = Path("../data/radio/phoenix_pd")
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
    model_name: str = "base",
    batch_size: int = 10,
) -> Dict[str, Any]:
    """
    Transcribe MP3 files in the radio archives directory

    Args:
        directory_path: Path to directory containing MP3 files
        model_name: Whisper model to use (tiny, base, small, medium, large)
        batch_size: Maximum number of files to process in one run

    Returns:
        Dictionary with transcription results
    """
    transcribed_files = []
    skipped_files = []
    errors = []

    try:
        # Load Whisper model
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": f"Loading Whisper model: {model_name}",
                "transcribed": 0,
                "skipped": 0,
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

        # Limit to batch size
        files_to_process = files_to_process[:batch_size]

        logger.info(f"Found {len(files_to_process)} files to transcribe")

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

                # Transcribe with Whisper
                result = model.transcribe(
                    str(mp3_file),
                    fp16=False,  # Use FP32 for better compatibility
                    language="en",
                    task="transcribe",
                    verbose=False,
                    temperature=0,  # More deterministic results
                    condition_on_previous_text=False,  # Faster processing
                )

                # Prepare transcription data with timestamps
                transcription_data = {
                    "filename": mp3_file.name,
                    "transcribed_at": datetime.now().isoformat(),
                    "model": model_name,
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


@celery_app.task(bind=True, name="cleanup_old_radio_archives")
def cleanup_old_radio_archives(
    self,
    directory_path: str = str(RADIO_DATA_PATH),
    days_old: int = 30,
    keep_transcriptions: bool = True,
) -> Dict[str, Any]:
    """
    Clean up old radio archive files

    Args:
        directory_path: Path to directory containing archive files
        days_old: Delete files older than this many days
        keep_transcriptions: If True, keep transcription files even if MP3 is deleted

    Returns:
        Dictionary with cleanup results
    """
    deleted_files = []
    kept_files = []
    errors = []

    try:
        cutoff_date = datetime.now() - timedelta(days=days_old)

        # Get all MP3 files
        mp3_files = list(Path(directory_path).glob("*.mp3"))

        for mp3_file in mp3_files:
            try:
                # Check file age
                file_mtime = datetime.fromtimestamp(mp3_file.stat().st_mtime)

                if file_mtime < cutoff_date:
                    # Check if transcription exists
                    json_file = mp3_file.with_suffix(".json")
                    txt_file = mp3_file.with_suffix(".txt")

                    if keep_transcriptions and (
                        json_file.exists() or txt_file.exists()
                    ):
                        # Delete only the MP3, keep transcriptions
                        mp3_file.unlink()
                        deleted_files.append(str(mp3_file))
                        logger.info(
                            f"Deleted old MP3 (kept transcription): {mp3_file.name}"
                        )
                    else:
                        # Delete everything
                        mp3_file.unlink()
                        deleted_files.append(str(mp3_file))

                        if json_file.exists():
                            json_file.unlink()
                            deleted_files.append(str(json_file))

                        if txt_file.exists():
                            txt_file.unlink()
                            deleted_files.append(str(txt_file))

                        logger.info(
                            f"Deleted old archive and transcriptions: {mp3_file.name}"
                        )
                else:
                    kept_files.append(str(mp3_file))

            except Exception as e:
                logger.error(f"Error processing {mp3_file.name}: {str(e)}")
                errors.append(f"Error processing {mp3_file.name}: {str(e)}")

        return {
            "status": "success",
            "deleted_files": deleted_files,
            "kept_files": kept_files,
            "errors": errors,
            "total_deleted": len(deleted_files),
            "total_kept": len(kept_files),
        }

    except Exception as exc:
        logger.error(f"Cleanup task failed: {str(exc)}", exc_info=True)
        raise exc
