#!/usr/bin/env python3
"""
Test transcription on existing MP3 files
"""
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from pathlib import Path

print("Testing transcription with existing files...")

# Check what files we have
radio_path = Path("../data/radio")
mp3_files = list(radio_path.glob("*.mp3"))

print(f"\nFound {len(mp3_files)} MP3 files in data/radio/:")
for f in mp3_files:
    print(f"  - {f.name} ({f.stat().st_size / 1024 / 1024:.1f} MB)")

if mp3_files:
    # Move one file to phoenix_pd directory for testing
    phoenix_pd_path = Path("../data/radio/phoenix_pd")
    phoenix_pd_path.mkdir(exist_ok=True)

    test_file = mp3_files[0]
    target_path = phoenix_pd_path / test_file.name

    if not target_path.exists():
        print(f"\nCopying {test_file.name} to phoenix_pd/ for testing...")
        import shutil

        shutil.copy2(test_file, target_path)
    else:
        print(f"\n{test_file.name} already in phoenix_pd/")

    # Now test transcription
    from app.workers.radio_tasks_alternative import transcribe_phoenix_pd_archives

    print("\nTesting transcription task...")
    result = transcribe_phoenix_pd_archives.apply(
        kwargs={
            "model_name": "tiny",  # Use tiny model for faster testing
            "batch_size": 1,  # Just transcribe 1 file
        }
    ).get()

    print(f"\nTranscription result:")
    print(f"  - Transcribed: {result.get('total_transcribed', 0)} files")
    print(f"  - Skipped: {result.get('total_skipped', 0)} files")
    print(f"  - Errors: {len(result.get('errors', []))}")

    if result.get("transcribed_files"):
        print(f"\nTranscribed files:")
        for f in result["transcribed_files"]:
            print(f"  - {f}")

            # Check if output files were created
            mp3_path = Path(f)
            json_path = mp3_path.with_suffix(".json")
            txt_path = mp3_path.with_suffix(".txt")

            if json_path.exists():
                print(f"    ✓ JSON transcript: {json_path.name}")
            if txt_path.exists():
                print(f"    ✓ Text transcript: {txt_path.name}")
                # Show first few lines
                with open(txt_path, "r") as tf:
                    lines = tf.readlines()[:10]
                    print("    First few lines:")
                    for line in lines:
                        print(f"      {line.rstrip()}")

    if result.get("errors"):
        print(f"\nErrors encountered:")
        for error in result["errors"]:
            print(f"  - {error}")
else:
    print("\nNo MP3 files found to test with!")
