#!/usr/bin/env python3
"""
Direct test of Whisper transcription with MPS acceleration.
This bypasses Celery to test the core functionality.
"""
import os
import sys
import time
import torch
import whisper
from pathlib import Path

def test_mps():
    """Test MPS availability and performance."""
    print("=" * 60)
    print("Testing Metal Performance Shaders (MPS)")
    print("=" * 60)

    if not torch.backends.mps.is_available():
        print("❌ MPS is not available on this system")
        return False

    if not torch.backends.mps.is_built():
        print("❌ MPS is available but not built in PyTorch")
        return False

    print("✅ MPS is available and built!")

    # Test MPS computation
    device = torch.device("mps")

    # Simple computation test
    print("\nTesting MPS computation...")
    x = torch.randn(1000, 1000, device=device)
    y = torch.randn(1000, 1000, device=device)

    start = time.time()
    z = torch.matmul(x, y)
    torch.mps.synchronize()
    mps_time = time.time() - start

    print(f"✅ MPS matrix multiplication: {mps_time:.4f}s")

    # Compare with CPU
    x_cpu = x.cpu()
    y_cpu = y.cpu()
    start = time.time()
    z_cpu = torch.matmul(x_cpu, y_cpu)
    cpu_time = time.time() - start

    print(f"   CPU matrix multiplication: {cpu_time:.4f}s")
    print(f"   MPS Speedup: {cpu_time/mps_time:.2f}x\n")

    return True

def test_whisper_transcription(audio_file_path=None):
    """Test Whisper transcription with MPS."""
    print("=" * 60)
    print("Testing Whisper Transcription")
    print("=" * 60)

    # Find an audio file
    if audio_file_path:
        audio_file = Path(audio_file_path)
    else:
        # Look for test files
        test_locations = [
            Path("data/input/test.mp3"),
            Path("data/input/test.wav"),
            Path("test.mp3"),
            Path("test.wav"),
        ]

        audio_file = None
        for loc in test_locations:
            if loc.exists():
                audio_file = loc
                break

        # If no test file, find any audio file
        if not audio_file:
            for pattern in ["*.mp3", "*.wav", "*.m4a"]:
                files = list(Path("data/input").glob(pattern))
                if files:
                    audio_file = files[0]
                    break

    if not audio_file or not audio_file.exists():
        print("❌ No audio file found for testing")
        print("   Please place an audio file at: data/input/test.mp3")
        return False

    print(f"Audio file: {audio_file}")

    # Determine device
    if torch.backends.mps.is_available() and torch.backends.mps.is_built():
        device = "mps"
        print("Device: Apple Silicon GPU (MPS)")
    else:
        device = "cpu"
        print("Device: CPU")

    # Load model
    print(f"\nLoading Whisper 'tiny' model on {device}...")
    model = whisper.load_model("tiny", device=device)

    # Test transcription
    print(f"Transcribing {audio_file.name}...")
    start = time.time()

    result = model.transcribe(
        str(audio_file),
        fp16=False,  # MPS doesn't support fp16
        language="en",
        verbose=False
    )

    elapsed = time.time() - start

    print(f"\n✅ Transcription completed in {elapsed:.2f}s")
    print(f"   Audio duration: {result.get('duration', 0):.1f}s")
    if result.get('duration', 0) > 0:
        print(f"   Speed: {result['duration']/elapsed:.1f}x realtime")

    # Show transcript preview
    text = result.get('text', '')
    if text:
        preview = text[:200] + "..." if len(text) > 200 else text
        print(f"\nTranscript preview:")
        print(f"   {preview}")

    # Clean up
    del model
    torch.mps.empty_cache() if device == "mps" else None

    return True

def test_model_comparison():
    """Compare different Whisper models."""
    print("=" * 60)
    print("Comparing Whisper Models")
    print("=" * 60)

    # Find an audio file
    audio_file = None
    for pattern in ["*.mp3", "*.wav"]:
        files = list(Path("data/input").glob(pattern))
        if files:
            audio_file = files[0]
            break

    if not audio_file:
        print("❌ No audio file found for comparison")
        return False

    print(f"Test file: {audio_file.name}\n")

    device = "mps" if torch.backends.mps.is_available() else "cpu"

    models_to_test = ["tiny", "base"]
    results = {}

    for model_name in models_to_test:
        print(f"Testing '{model_name}' model...")

        model = whisper.load_model(model_name, device=device)

        start = time.time()
        result = model.transcribe(
            str(audio_file),
            fp16=False,
            language="en",
            verbose=False
        )
        elapsed = time.time() - start

        results[model_name] = {
            "time": elapsed,
            "text_length": len(result['text']),
            "speed": result.get('duration', 0) / elapsed
        }

        print(f"  Time: {elapsed:.2f}s")
        print(f"  Speed: {results[model_name]['speed']:.1f}x realtime")

        del model
        torch.mps.empty_cache() if device == "mps" else None

    print("\nModel Comparison Summary:")
    for model_name, res in results.items():
        print(f"  {model_name}: {res['time']:.2f}s ({res['speed']:.1f}x realtime)")

    return True

def main():
    print("=" * 60)
    print("Direct Whisper + MPS Test for M1 Mac")
    print("=" * 60)
    print()

    # Test 1: MPS availability
    mps_ok = test_mps()

    # Test 2: Basic transcription
    print()
    transcribe_ok = test_whisper_transcription()

    # Test 3: Model comparison (optional)
    # Uncomment to compare different models
    # print()
    # test_model_comparison()

    print("\n" + "=" * 60)
    if mps_ok and transcribe_ok:
        print("✅ All tests passed!")
        print("   Your M1 Mac is ready for GPU-accelerated transcription")
    else:
        print("⚠️  Some tests failed")
        if not mps_ok:
            print("   MPS not working - will use CPU (slower)")
        if not transcribe_ok:
            print("   Transcription failed - check audio file")
    print("=" * 60)

if __name__ == "__main__":
    # Allow passing audio file as argument
    if len(sys.argv) > 1:
        test_whisper_transcription(sys.argv[1])
    else:
        main()