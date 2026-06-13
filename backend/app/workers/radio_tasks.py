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

from app.workers.celery_app import celery_app
from app.db.database import SessionLocal
from app.core.config import settings

logger = logging.getLogger(__name__)

# Broadcastify credentials from environment
# BROADCASTIFY_USERNAME = settings.BROADCASTIFY_USERNAME
# BROADCASTIFY_PASSWORD = settings.BROADCASTIFY_PASSWORD
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


# REMOVED cleanup_old_radio_archives task - we want to keep all radio archives permanently
