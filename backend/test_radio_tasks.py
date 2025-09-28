#!/usr/bin/env python3
"""
Test script for radio archive tasks
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers.radio_tasks import (
    download_broadcastify_archives,
    transcribe_radio_archives,
)


def test_download():
    """Test downloading Broadcastify archives"""
    print("Testing Broadcastify download task...")

    # Test with limited downloads for testing
    result = download_broadcastify_archives.apply(
        kwargs={
            "max_downloads": 2,  # Just download 2 files for testing
            "days_back": 1,  # Check last 1 day
        }
    ).get()

    print(f"Download result: {result}")
    return result


def test_transcribe():
    """Test transcription of downloaded archives"""
    print("\nTesting transcription task...")

    # Test with small batch
    result = transcribe_radio_archives.apply(
        kwargs={
            "model_name": "tiny",  # Use tiny model for faster testing
            "batch_size": 1,  # Just transcribe 1 file for testing
        }
    ).get()

    print(f"Transcription result: {result}")
    return result


if __name__ == "__main__":
    print("Starting radio task tests...")
    print("=" * 50)

    # Test download
    download_result = test_download()

    if (
        download_result.get("total_downloaded", 0) > 0
        or download_result.get("total_skipped", 0) > 0
    ):
        print("\n✓ Download task working!")
    else:
        print("\n✗ Download task may have issues - check logs")

    # Test transcription if we have files
    print("\n" + "=" * 50)
    transcribe_result = test_transcribe()

    if (
        transcribe_result.get("total_transcribed", 0) > 0
        or transcribe_result.get("total_skipped", 0) > 0
    ):
        print("\n✓ Transcription task working!")
    else:
        print("\n✗ Transcription task may have issues - check logs")

    print("\n" + "=" * 50)
    print("Test complete!")
