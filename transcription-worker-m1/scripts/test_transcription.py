#!/usr/bin/env python3
"""
Test script for M1 Mac transcription worker.
Tests MPS (Metal Performance Shaders) GPU acceleration and transcription functionality.
"""
import os
import sys
import time
import platform
from pathlib import Path

# Add app directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))


def test_system_info():
    """Display system information."""
    print("Testing System Information...")
    print(f"  Platform: {platform.platform()}")
    print(f"  Architecture: {platform.machine()}")
    print(f"  Processor: {platform.processor()}")
    print(f"  Python: {platform.python_version()}")

    if platform.system() == "Darwin":
        print(f"  macOS Version: {platform.mac_ver()[0]}")

        # Check if running on Apple Silicon
        if platform.machine() == "arm64":
            print("  ✅ Running on Apple Silicon (M1/M2/M3)")
            return True
        else:
            print("  ⚠️  Not running on Apple Silicon")
            return False
    return False


def test_mps_availability():
    """Test if Metal Performance Shaders (MPS) is available."""
    print("\nTesting Metal Performance Shaders (MPS) availability...")
    try:
        import torch
        print(f"  ✓ PyTorch version: {torch.__version__}")

        if hasattr(torch.backends, 'mps'):
            if torch.backends.mps.is_available():
                if torch.backends.mps.is_built():
                    print("  ✅ MPS is available and built!")

                    # Test MPS with actual computation
                    try:
                        # Create tensors on MPS
                        device = torch.device("mps")
                        x = torch.randn(1000, 1000, device=device)
                        y = torch.randn(1000, 1000, device=device)

                        # Perform matrix multiplication
                        start = time.time()
                        z = torch.matmul(x, y)
                        torch.mps.synchronize()  # Ensure computation completes
                        mps_time = time.time() - start

                        # Compare with CPU
                        x_cpu = x.cpu()
                        y_cpu = y.cpu()
                        start = time.time()
                        z_cpu = torch.matmul(x_cpu, y_cpu)
                        cpu_time = time.time() - start

                        print(f"  Matrix multiplication (1000x1000):")
                        print(f"    MPS time: {mps_time:.4f}s")
                        print(f"    CPU time: {cpu_time:.4f}s")
                        print(f"    Speedup: {cpu_time/mps_time:.2f}x")

                        return True
                    except Exception as e:
                        print(f"  ⚠️  MPS test computation failed: {e}")
                        return False
                else:
                    print("  ⚠️  MPS is available but not built in PyTorch")
                    return False
            else:
                print("  ⚠️  MPS is not available on this system")
                return False
        else:
            print("  ⚠️  PyTorch doesn't have MPS support")
            return False

    except ImportError as e:
        print(f"  ✗ Error importing torch: {e}")
        return False


def test_whisper_import():
    """Test if Whisper can be imported and models are available."""
    print("\nTesting Whisper import...")
    try:
        import whisper
        print(f"  ✓ Whisper imported successfully")

        # List available models
        models = whisper.available_models()
        print(f"  Available models: {', '.join(models)}")

        # Check for cached models
        cache_dir = Path.home() / "Library" / "Caches" / "whisper"
        if cache_dir.exists():
            cached_models = list(cache_dir.glob("*.pt"))
            if cached_models:
                print(f"  Cached models found:")
                for model in cached_models:
                    size = model.stat().st_size / (1024**2)
                    print(f"    - {model.name}: {size:.1f} MB")
        return True

    except ImportError as e:
        print(f"  ✗ Error importing whisper: {e}")
        return False


def test_local_transcription():
    """Test local transcription with MPS acceleration."""
    print("\nTesting local transcription...")

    try:
        from app.transcription_tasks import transcribe_audio_file
        import torch

        # Create or find a test audio file
        test_file = Path("data/input/test.mp3")

        if not test_file.exists():
            print(f"  ⚠️  Test file not found: {test_file}")
            print("     Please place an MP3 file at data/input/test.mp3")

            # Try to find any audio file
            audio_dir = Path("data/input")
            audio_files = list(audio_dir.glob("*.mp3")) + list(audio_dir.glob("*.wav"))
            if audio_files:
                test_file = audio_files[0]
                print(f"     Using alternative file: {test_file}")
            else:
                print("     No audio files found for testing")
                return False

        print(f"  Transcribing: {test_file.name}")

        # Check device
        device = "mps" if (torch.backends.mps.is_available() and torch.backends.mps.is_built()) else "cpu"
        print(f"  Using device: {device}")

        # Mock Celery task context
        class MockTask:
            def update_state(self, state=None, meta=None):
                pass

        # Call the task's underlying function directly
        # For Celery tasks, we need to call .run() or access the wrapped function
        start = time.time()

        # Create a mock self object for the bound task
        mock_self = MockTask()

        # Call the actual function, not the Celery task wrapper
        result = transcribe_audio_file.run(
            mock_self,
            file_path=str(test_file),
            model_name="tiny",
            use_gpu=True
        )
        elapsed = time.time() - start

        if result["success"]:
            print(f"  ✅ Transcription successful in {elapsed:.1f}s!")
            print(f"     Device used: {result.get('device', 'unknown')}")
            text = result['text'][:200] if result['text'] else "No text"
            print(f"     Text preview: {text}...")
            return True
        else:
            print(f"  ✗ Transcription failed: {result.get('error')}")
            return False

    except Exception as e:
        print(f"  ✗ Error during transcription: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_celery_connection():
    """Test Celery/Redis connection."""
    print("\nTesting Celery/Redis connection...")

    try:
        from app.celery_worker import celery_app
        import redis
        import os

        # Test Redis connection
        host = os.getenv("REDIS_HOST", "localhost")
        port = int(os.getenv("REDIS_PORT", "6379"))

        r = redis.Redis(host=host, port=port, db=0, socket_connect_timeout=5)
        r.ping()
        print(f"  ✅ Connected to Redis at {host}:{port}")

        # Try to inspect Celery
        inspector = celery_app.control.inspect()
        stats = inspector.stats()

        if stats:
            print(f"  Active workers: {list(stats.keys())}")
        else:
            print("  No active workers found (start with ./scripts/start_worker.sh)")

        return True

    except Exception as e:
        print(f"  ✗ Error connecting to Redis: {e}")
        print("     Check your .env file settings")
        return False


def test_performance_comparison():
    """Compare transcription performance on MPS vs CPU."""
    print("\nTesting performance comparison (MPS vs CPU)...")

    try:
        import whisper
        import torch
        import time

        test_file = Path("data/input/test.mp3")
        if not test_file.exists():
            audio_files = list(Path("data/input").glob("*.mp3"))
            if not audio_files:
                print("  ⚠️  No audio files found for performance testing")
                return False
            test_file = audio_files[0]

        print(f"  Test file: {test_file.name}")

        # Test with tiny model for quick comparison
        model_name = "tiny"

        # Test MPS if available
        if torch.backends.mps.is_available() and torch.backends.mps.is_built():
            print("\n  Testing MPS performance...")
            model_mps = whisper.load_model(model_name, device="mps")
            start = time.time()
            result_mps = model_mps.transcribe(str(test_file), fp16=False)
            mps_time = time.time() - start
            print(f"    MPS time: {mps_time:.2f}s")
            del model_mps
        else:
            mps_time = None
            print("  MPS not available")

        # Test CPU
        print("\n  Testing CPU performance...")
        model_cpu = whisper.load_model(model_name, device="cpu")
        start = time.time()
        result_cpu = model_cpu.transcribe(str(test_file), fp16=False)
        cpu_time = time.time() - start
        print(f"    CPU time: {cpu_time:.2f}s")

        if mps_time:
            speedup = cpu_time / mps_time
            print(f"\n  🚀 MPS Speedup: {speedup:.2f}x faster than CPU")

        return True

    except Exception as e:
        print(f"  ✗ Performance test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("=" * 60)
    print("M1 Mac Transcription Worker Test Suite")
    print("=" * 60)

    # Load environment variables
    from dotenv import load_dotenv
    load_dotenv()

    results = {
        "System Info": test_system_info(),
        "MPS Availability": test_mps_availability(),
        "Whisper Import": test_whisper_import(),
        "Redis Connection": test_celery_connection(),
    }

    # Only test transcription if Whisper is available
    if results["Whisper Import"]:
        results["Local Transcription"] = test_local_transcription()
        # results["Performance Comparison"] = test_performance_comparison()

    print("\n" + "=" * 60)
    print("Test Results:")
    print("=" * 60)

    for test_name, passed in results.items():
        status = "✅ PASSED" if passed else "❌ FAILED"
        print(f"{test_name:.<30} {status}")

    all_passed = all(results.values())

    print("\n" + "=" * 60)
    if all_passed:
        print("✅ All tests passed! Your M1 Mac is ready for transcription.")
        print("   MPS GPU acceleration will provide 5-10x speedup")
    else:
        print("⚠️  Some tests failed. Check the configuration.")
        print("   The worker may still function but with reduced performance")
    print("=" * 60)

    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())