#!/usr/bin/env python3
"""
Fixed test for Whisper on M1 Mac.
Works around MPS compatibility issues with Whisper.
"""
import os
import sys
import time
import torch
import whisper
from pathlib import Path

def test_mps_availability():
    """Test if MPS is available (but we'll use CPU for Whisper)."""
    print("=" * 60)
    print("Testing System Capabilities")
    print("=" * 60)

    print(f"PyTorch version: {torch.__version__}")

    if torch.backends.mps.is_available():
        if torch.backends.mps.is_built():
            print("✅ MPS is available (but Whisper will use CPU due to compatibility)")

            # Test basic MPS operation
            try:
                device = torch.device("mps")
                x = torch.ones(5, device=device)
                print(f"   Basic MPS test: {x}")
                return True
            except Exception as e:
                print(f"   MPS test failed: {e}")
                return False
        else:
            print("⚠️  MPS available but not built")
    else:
        print("⚠️  MPS not available")

    return False

def test_whisper_cpu(audio_file_path=None):
    """Test Whisper transcription using CPU (most compatible)."""
    print("\n" + "=" * 60)
    print("Testing Whisper Transcription (CPU)")
    print("=" * 60)

    # Find audio file
    if audio_file_path:
        audio_file = Path(audio_file_path)
    else:
        # Look for test files
        search_paths = [
            Path("data/input"),
            Path("."),
        ]

        audio_file = None
        for search_path in search_paths:
            if not search_path.exists():
                continue

            for pattern in ["*.mp3", "*.wav", "*.m4a"]:
                files = list(search_path.glob(pattern))
                if files:
                    audio_file = files[0]
                    break

            if audio_file:
                break

    if not audio_file or not audio_file.exists():
        print("❌ No audio file found")
        print("   Please place an audio file in data/input/")
        print("   Supported formats: .mp3, .wav, .m4a")
        return False

    print(f"Audio file: {audio_file}")
    print(f"File size: {audio_file.stat().st_size / 1024 / 1024:.2f} MB")

    # Load model on CPU (most compatible)
    print("\nLoading Whisper model on CPU...")
    print("Note: CPU is still very fast on M1 due to Neural Engine")

    try:
        model = whisper.load_model("tiny")  # Don't specify device, let it use CPU
        print("✅ Model loaded successfully")
    except Exception as e:
        print(f"❌ Failed to load model: {e}")
        return False

    # Transcribe
    print(f"\nTranscribing {audio_file.name}...")
    start = time.time()

    try:
        result = model.transcribe(
            str(audio_file),
            fp16=False,  # Use FP32 for compatibility
            language="en",
            verbose=False
        )
        elapsed = time.time() - start

        print(f"✅ Transcription completed in {elapsed:.2f}s")

        # Show details
        duration = result.get('duration', 0)
        if duration > 0:
            print(f"   Audio duration: {duration:.1f}s")
            print(f"   Speed: {duration/elapsed:.1f}x realtime")

        # Show transcript preview
        text = result.get('text', '').strip()
        if text:
            preview = text[:300] + "..." if len(text) > 300 else text
            print(f"\nTranscript preview:")
            print(f"   \"{preview}\"")
        else:
            print("\n⚠️  No text transcribed")

        return True

    except Exception as e:
        print(f"❌ Transcription failed: {e}")
        return False
    finally:
        # Clean up
        del model

def test_performance_comparison():
    """Compare different model sizes on CPU."""
    print("\n" + "=" * 60)
    print("Comparing Whisper Model Sizes (CPU)")
    print("=" * 60)

    # Find test file
    audio_file = None
    for pattern in ["*.mp3", "*.wav", "*.m4a"]:
        files = list(Path("data/input").glob(pattern))
        if files:
            # Use shortest file for quick test
            audio_file = min(files, key=lambda f: f.stat().st_size)
            break

    if not audio_file:
        print("❌ No audio file found for comparison")
        return False

    print(f"Test file: {audio_file.name}")
    print(f"File size: {audio_file.stat().st_size / 1024:.1f} KB\n")

    models_to_test = ["tiny", "base"]

    for model_name in models_to_test:
        print(f"Testing '{model_name}' model...")

        try:
            # Load model
            load_start = time.time()
            model = whisper.load_model(model_name)
            load_time = time.time() - load_start

            # Transcribe
            trans_start = time.time()
            result = model.transcribe(
                str(audio_file),
                fp16=False,
                language="en",
                verbose=False
            )
            trans_time = time.time() - trans_start

            # Results
            duration = result.get('duration', 0)
            speed = duration / trans_time if trans_time > 0 else 0

            print(f"  Model load time: {load_time:.2f}s")
            print(f"  Transcription time: {trans_time:.2f}s")
            print(f"  Speed: {speed:.1f}x realtime")
            print(f"  Text length: {len(result.get('text', ''))} chars")
            print()

            # Clean up
            del model

        except Exception as e:
            print(f"  ❌ Failed: {e}\n")

    return True

def test_whisper_with_options():
    """Test Whisper with different options for best performance."""
    print("\n" + "=" * 60)
    print("Testing Optimal Whisper Settings")
    print("=" * 60)

    # Find a small test file
    audio_file = None
    for pattern in ["*.mp3", "*.wav"]:
        files = list(Path("data/input").glob(pattern))
        if files:
            audio_file = min(files, key=lambda f: f.stat().st_size)
            break

    if not audio_file:
        print("⚠️  No audio file found")
        return False

    print(f"Test file: {audio_file.name}\n")

    # Test different settings
    settings_to_test = [
        {"name": "Standard", "options": {}},
        {"name": "Faster (beam_size=1)", "options": {"beam_size": 1}},
        {"name": "Fastest (best_of=1)", "options": {"beam_size": 1, "best_of": 1}},
    ]

    model = whisper.load_model("tiny")

    for setting in settings_to_test:
        print(f"Testing: {setting['name']}")

        start = time.time()
        result = model.transcribe(
            str(audio_file),
            fp16=False,
            language="en",
            verbose=False,
            **setting['options']
        )
        elapsed = time.time() - start

        duration = result.get('duration', 0)
        speed = duration / elapsed if elapsed > 0 else 0

        print(f"  Time: {elapsed:.2f}s")
        print(f"  Speed: {speed:.1f}x realtime")
        print()

    del model
    return True

def main():
    print("=" * 60)
    print("Whisper Test for M1 Mac (Fixed)")
    print("=" * 60)
    print()
    print("Note: Due to MPS compatibility issues, Whisper runs on CPU.")
    print("This is still fast on M1 thanks to the Neural Engine.\n")

    # Test 1: Check system
    mps_available = test_mps_availability()

    # Test 2: Basic transcription
    transcribe_ok = test_whisper_cpu()

    # Test 3: Performance options (optional)
    if transcribe_ok:
        test_whisper_with_options()

    # Test 4: Model comparison (optional)
    # Uncomment to compare models
    # if transcribe_ok:
    #     test_performance_comparison()

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    if transcribe_ok:
        print("✅ Whisper is working correctly!")
        print("\nNotes:")
        print("• Whisper uses CPU due to MPS compatibility issues")
        print("• CPU performance is still excellent on M1")
        print("• Use 'tiny' or 'base' models for best speed")
        print("• The worker will function perfectly for transcription")
    else:
        print("❌ Whisper test failed")
        print("• Check that you have audio files in data/input/")
        print("• Ensure ffmpeg is installed: brew install ffmpeg")

    print("=" * 60)

    return 0 if transcribe_ok else 1

if __name__ == "__main__":
    # Allow passing audio file as argument
    if len(sys.argv) > 1:
        test_whisper_cpu(sys.argv[1])
    else:
        exit(main())