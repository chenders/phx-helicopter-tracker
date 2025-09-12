#!/usr/bin/env python3
"""
Test the updated radio download task
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers.radio_tasks import download_broadcastify_archives
from pathlib import Path

print("Testing updated Broadcastify download task...")
print("=" * 50)

# Check current files before download
radio_path = Path("../data/radio/phoenix_pd")
existing_files = list(radio_path.glob("*.mp3"))
print(f"Existing files in phoenix_pd: {len(existing_files)}")
for f in existing_files[:3]:
    print(f"  - {f.name}")

print("\n" + "=" * 50)
print("Starting download task...")

try:
    # Test with limited parameters
    result = download_broadcastify_archives.apply(
        kwargs={
            "max_downloads": 2,  # Just download 2 files for testing
            "days_back": 2,  # Check last 2 days
        }
    ).get(
        timeout=60
    )  # 60 second timeout for testing

    print("\nDownload task completed!")
    print(f"Result: {result}")

    # Check results
    if result.get("total_downloaded", 0) > 0:
        print(f"\n✓ Successfully downloaded {result['total_downloaded']} files:")
        for file in result.get("downloaded_files", []):
            print(f"  - {Path(file).name}")

    if result.get("total_skipped", 0) > 0:
        print(f"\n✓ Skipped {result['total_skipped']} existing files")

    if result.get("errors", []):
        print(f"\n⚠ Encountered {len(result['errors'])} errors:")
        for error in result["errors"][:3]:
            print(f"  - {error}")

    # Check for new files
    new_files = list(radio_path.glob("*.mp3"))
    if len(new_files) > len(existing_files):
        print(f"\n✓ New files added to directory!")

except Exception as e:
    print(f"\n✗ Task failed with error: {str(e)}")
    import traceback

    traceback.print_exc()

print("\n" + "=" * 50)
print("Test complete!")
