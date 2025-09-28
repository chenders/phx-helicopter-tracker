#!/usr/bin/env python3
"""
Test transcription on newly downloaded files
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.workers.radio_tasks import transcribe_radio_archives
from pathlib import Path

print("Testing transcription on newly downloaded files...")
print("=" * 50)

# Check files
radio_path = Path("../data/radio/phoenix_pd")
mp3_files = list(radio_path.glob("*.mp3"))
json_files = list(radio_path.glob("*.json"))

print(f"Found {len(mp3_files)} MP3 files")
print(f"Found {len(json_files)} existing transcriptions")

# Find untranscribed files
untranscribed = []
for mp3 in mp3_files:
    if not mp3.with_suffix(".json").exists():
        untranscribed.append(mp3.name)

print(f"Untranscribed files: {len(untranscribed)}")
for f in untranscribed[:3]:
    print(f"  - {f}")

if untranscribed:
    print("\n" + "=" * 50)
    print("Running transcription task...")

    try:
        result = transcribe_radio_archives.apply(
            kwargs={
                "model_name": "tiny",  # Use tiny for speed
                "batch_size": 1,  # Just transcribe 1 file
            }
        ).get(
            timeout=300
        )  # 5 minute timeout

        print("\nTranscription completed!")
        print(f"  Transcribed: {result.get('total_transcribed', 0)} files")
        print(f"  Skipped: {result.get('total_skipped', 0)} files")

        if result.get("transcribed_files"):
            # Check the output
            transcribed_file = Path(result["transcribed_files"][0])
            json_file = transcribed_file.with_suffix(".json")
            txt_file = transcribed_file.with_suffix(".txt")

            print(f"\nChecking output files:")
            if json_file.exists():
                print(f"  ✓ JSON transcript created: {json_file.name}")
                print(f"    Size: {json_file.stat().st_size:,} bytes")

            if txt_file.exists():
                print(f"  ✓ Text transcript created: {txt_file.name}")
                print(f"    Size: {txt_file.stat().st_size:,} bytes")

                # Show first few lines
                print("\n  First few lines of transcript:")
                with open(txt_file, "r") as f:
                    lines = f.readlines()[:15]
                    for line in lines:
                        print(f"    {line.rstrip()}")

    except Exception as e:
        print(f"\n✗ Transcription failed: {str(e)}")
else:
    print("\nAll files already transcribed!")
