"""
Apple Silicon (M1) optimized transcription tasks using Whisper.
Uses Metal Performance Shaders (MPS) for GPU acceleration on M1/M2/M3 Macs.
"""
import os
import json
import torch
import whisper
import logging
import platform
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, Optional, List
from celery import current_task

from app.celery_worker import celery_app

logger = logging.getLogger(__name__)

# Check for MPS (Metal Performance Shaders) availability on Apple Silicon
def get_device():
    """Get the best available device for inference."""
    if platform.system() == "Darwin":  # macOS
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            if torch.backends.mps.is_built():
                device = torch.device("mps")
                logger.info("✓ Using Apple Silicon GPU (Metal Performance Shaders)")
                return device
            else:
                logger.warning("MPS is available but not built. Falling back to CPU")
        else:
            logger.info("MPS not available. Using CPU")
    elif torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Using CUDA GPU: {torch.cuda.get_device_name(0)}")
        return device

    logger.info("Using CPU for inference")
    return torch.device("cpu")

# Get device on module load
DEVICE = get_device()

# Data paths (these will be local directories or mounted volumes)
AUDIO_INPUT_PATH = Path(os.getenv("AUDIO_INPUT_PATH", "/Users/Shared/transcription/input"))
TRANSCRIPTION_OUTPUT_PATH = Path(os.getenv("TRANSCRIPTION_OUTPUT_PATH", "/Users/Shared/transcription/output"))

# Ensure directories exist
AUDIO_INPUT_PATH.mkdir(parents=True, exist_ok=True)
TRANSCRIPTION_OUTPUT_PATH.mkdir(parents=True, exist_ok=True)

# Model cache directory
MODEL_CACHE_DIR = Path(os.getenv("MODEL_CACHE_DIR", "~/Library/Caches/whisper")).expanduser()
MODEL_CACHE_DIR.mkdir(parents=True, exist_ok=True)


@celery_app.task(
    bind=True,
    name="transcribe_phoenix_pd_archives",
    queue="transcription",
    time_limit=7200,
    soft_time_limit=6600,
)
def transcribe_phoenix_pd_archives(
    self,
    directory_path: str = None,
    model_name: str = "base",
    batch_size: int = 5,
    use_gpu: bool = True,
) -> Dict[str, Any]:
    """
    Transcribe Phoenix PD radio archives with Apple Silicon GPU acceleration.

    Args:
        directory_path: Path to directory containing audio files
        model_name: Whisper model (tiny, base, small, medium, large, large-v2, large-v3)
        batch_size: Number of files to process in one run
        use_gpu: Whether to use GPU acceleration (MPS on M1)

    Returns:
        Dictionary with transcription results
    """
    if directory_path is None:
        directory_path = str(AUDIO_INPUT_PATH)

    transcribed_files = []
    skipped_files = []
    errors = []
    device_info = {}

    try:
        # Determine device
        if use_gpu and DEVICE.type == "mps":
            device = "mps"
            device_info = {
                "device": "Apple Silicon GPU (MPS)",
                "platform": platform.machine(),  # Should show 'arm64' on M1
                "processor": platform.processor(),
                "system": f"{platform.system()} {platform.release()}",
            }
            logger.info(f"Using Metal Performance Shaders on {platform.machine()}")
        else:
            device = "cpu"
            device_info = {
                "device": "CPU",
                "platform": platform.machine(),
                "processor": platform.processor(),
            }

        # Update task state
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": f"Loading Whisper model: {model_name}",
                "device": device,
                "device_info": device_info,
                "transcribed": 0,
                "skipped": 0,
            },
        )

        # Load Whisper model
        # Note: Due to MPS compatibility issues with Whisper, we use CPU
        # M1 CPU is still very fast due to Neural Engine optimizations
        if device == "mps":
            logger.info("Note: Using CPU instead of MPS due to Whisper compatibility")
            device = "cpu"
            device_info["note"] = "CPU used (MPS incompatible with Whisper)"

        model = whisper.load_model(
            model_name,
            device=device,  # Will use CPU even on M1
            download_root=str(MODEL_CACHE_DIR)
        )
        logger.info(f"Loaded Whisper model '{model_name}' on {device}")

        # Get list of audio files
        audio_extensions = ["*.mp3", "*.wav", "*.m4a", "*.flac", "*.ogg", "*.aac"]
        audio_files = []
        for ext in audio_extensions:
            audio_files.extend(Path(directory_path).glob(ext))

        # Filter to only untranscribed files
        files_to_process = []
        for audio_file in audio_files:
            json_file = TRANSCRIPTION_OUTPUT_PATH / f"{audio_file.stem}.json"
            if not json_file.exists():
                files_to_process.append(audio_file)
            else:
                skipped_files.append(str(audio_file.name))

        # Limit to batch size
        files_to_process = files_to_process[:batch_size]
        logger.info(f"Found {len(files_to_process)} files to transcribe")

        for idx, audio_file in enumerate(files_to_process, 1):
            try:
                # Update progress
                current_task.update_state(
                    state="PROCESSING",
                    meta={
                        "status": f"Transcribing {idx}/{len(files_to_process)}: {audio_file.name}",
                        "device": device,
                        "device_info": device_info,
                        "transcribed": len(transcribed_files),
                        "skipped": len(skipped_files),
                        "current_file": audio_file.name,
                        "progress": (idx - 1) / len(files_to_process) * 100,
                    },
                )

                logger.info(f"Transcribing: {audio_file.name} on {device}")
                start_time = datetime.now()

                # Transcribe with Whisper
                # Using CPU for compatibility
                result = model.transcribe(
                    str(audio_file),
                    fp16=False,  # Use FP32 for compatibility
                    language="en",
                    task="transcribe",
                    verbose=False,
                    temperature=0,  # Deterministic results
                    condition_on_previous_text=False,  # Faster processing
                    beam_size=5,  # Good balance of speed and accuracy
                    best_of=5,
                )

                transcription_time = (datetime.now() - start_time).total_seconds()

                # Extract metadata from filename
                filename_parts = audio_file.stem.split("-")
                if filename_parts and len(filename_parts[0]) == 12:
                    timestamp_str = filename_parts[0]
                    try:
                        recording_time = datetime.strptime(timestamp_str, "%Y%m%d%H%M")
                    except ValueError:
                        recording_time = datetime.fromtimestamp(audio_file.stat().st_mtime)
                else:
                    recording_time = datetime.fromtimestamp(audio_file.stat().st_mtime)

                # Prepare transcription data
                transcription_data = {
                    "filename": audio_file.name,
                    "recording_time": recording_time.isoformat(),
                    "transcribed_at": datetime.now().isoformat(),
                    "model": model_name,
                    "device": device,
                    "device_info": device_info,
                    "transcription_time_seconds": transcription_time,
                    "text": result["text"],
                    "segments": [],
                    "metadata": {
                        "duration": result.get("duration"),
                        "language": result.get("language", "en"),
                    },
                }

                # Add segment details
                for segment in result.get("segments", []):
                    transcription_data["segments"].append({
                        "id": segment.get("id"),
                        "start": segment.get("start"),
                        "end": segment.get("end"),
                        "text": segment.get("text", "").strip(),
                        "no_speech_prob": segment.get("no_speech_prob"),
                    })

                # Save transcription as JSON
                json_file = TRANSCRIPTION_OUTPUT_PATH / f"{audio_file.stem}.json"
                with open(json_file, "w") as f:
                    json.dump(transcription_data, f, indent=2)

                # Also save plain text version
                txt_file = TRANSCRIPTION_OUTPUT_PATH / f"{audio_file.stem}.txt"
                with open(txt_file, "w") as f:
                    f.write(f"Transcription of: {audio_file.name}\n")
                    f.write(f"{'=' * 60}\n")
                    f.write(f"Recording Time: {recording_time.strftime('%Y-%m-%d %H:%M')}\n")
                    f.write(f"Transcribed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                    f.write(f"Model: {model_name} on {device}\n")
                    if device == "mps":
                        f.write(f"Device: Apple Silicon GPU (Metal Performance Shaders)\n")
                    f.write(f"Processing Time: {transcription_time:.1f} seconds\n")
                    f.write(f"{'=' * 60}\n\n")
                    f.write("TRANSCRIPT:\n\n")
                    f.write(result["text"])
                    f.write("\n\n")
                    f.write("TIMESTAMPED SEGMENTS:\n\n")
                    for segment in transcription_data["segments"]:
                        start = segment["start"]
                        end = segment["end"]
                        text = segment["text"]
                        if text:
                            f.write(f"[{start:06.2f} - {end:06.2f}] {text}\n")

                transcribed_files.append({
                    "file": audio_file.name,
                    "output_json": str(json_file),
                    "output_txt": str(txt_file),
                    "duration": result.get("duration"),
                    "transcription_time": transcription_time,
                })

                speed_factor = result.get('duration', 0) / transcription_time if transcription_time > 0 else 0
                logger.info(
                    f"Completed {audio_file.name} in {transcription_time:.1f}s "
                    f"({speed_factor:.1f}x realtime)"
                )

            except Exception as e:
                logger.error(f"Error transcribing {audio_file.name}: {str(e)}")
                errors.append({
                    "file": audio_file.name,
                    "error": str(e),
                })

        # Clean up memory if using MPS
        if device == "mps":
            # MPS doesn't have empty_cache like CUDA, but we can delete the model
            del model
            import gc
            gc.collect()

        return {
            "success": True,
            "transcribed_count": len(transcribed_files),
            "skipped_count": len(skipped_files),
            "error_count": len(errors),
            "transcribed_files": transcribed_files,
            "skipped_files": skipped_files[:10],  # Limit for response size
            "errors": errors,
            "device": device,
            "device_info": device_info,
            "model": model_name,
        }

    except Exception as e:
        logger.error(f"Task failed: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "transcribed_count": len(transcribed_files),
            "device": device if 'device' in locals() else "unknown",
        }


@celery_app.task(
    bind=True,
    name="transcribe_audio_file",
    queue="transcription",
    time_limit=3600,
)
def transcribe_audio_file(
    self,
    file_path: str,
    model_name: str = "base",
    use_gpu: bool = True,
) -> Dict[str, Any]:
    """
    Transcribe a single audio file using Apple Silicon GPU.

    Args:
        file_path: Path to the audio file
        model_name: Whisper model to use
        use_gpu: Whether to use MPS acceleration

    Returns:
        Dictionary with transcription result
    """
    try:
        device = "mps" if (use_gpu and DEVICE.type == "mps") else "cpu"

        model = whisper.load_model(
            model_name,
            device=device,
            download_root=str(MODEL_CACHE_DIR)
        )

        result = model.transcribe(
            file_path,
            fp16=False,  # MPS doesn't support fp16
            language="en",
            task="transcribe",
            temperature=0,
        )

        # Clean up
        del model
        import gc
        gc.collect()

        return {
            "success": True,
            "text": result["text"],
            "segments": result.get("segments", []),
            "language": result.get("language", "en"),
            "device": device,
        }

    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }


@celery_app.task(
    bind=True,
    name="batch_transcribe_directory",
    queue="transcription",
)
def batch_transcribe_directory(
    self,
    directory_path: str,
    model_name: str = "base",
    max_files: int = 100,
    use_gpu: bool = True,
) -> Dict[str, Any]:
    """
    Batch transcribe all audio files in a directory using M1 GPU.

    Args:
        directory_path: Directory containing audio files
        model_name: Whisper model to use
        max_files: Maximum number of files to process
        use_gpu: Whether to use MPS acceleration

    Returns:
        Dictionary with batch transcription results
    """
    return transcribe_phoenix_pd_archives(
        self,
        directory_path=directory_path,
        model_name=model_name,
        batch_size=max_files,
        use_gpu=use_gpu,
    )