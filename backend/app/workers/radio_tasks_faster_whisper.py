"""
Radio tasks using faster-whisper for improved performance
Based on radio_tasks_alternative.py but using faster-whisper instead of whisper
"""
import os
import re
import json
import time
import logging
import subprocess
import requests
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from pathlib import Path
from celery import current_task

# CRITICAL: Set this BEFORE any CUDA imports to prevent fork issues
os.environ["CUDA_MODULE_LOADING"] = "LAZY"

from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)

# Data paths - use absolute path for GPU worker compatibility
RADIO_DATA_PATH = Path("/app/data/radio/phoenix_pd")
RADIO_DATA_PATH.mkdir(parents=True, exist_ok=True)

# Archive settings
PHOENIX_PD_FEED_ID = "12145"
ARCHIVE_BASE_URL = "https://m.broadcastify.com/archives/download"

# Rate limiting settings
DOWNLOAD_DELAY_SECONDS = 3  # Delay between downloads to be respectful
MAX_DOWNLOADS_PER_RUN = 10  # Limit downloads per task run


# --- Transcription accuracy helpers (see RADIO_TRANSCRIPTION_FINDINGS.md) -------------
# Domain prompt biases the LM toward PHX PD radio vocabulary and away from YouTube
# clichés ("Thanks for watching"). Kept < ~200 tokens to stay within the 224-token budget.
PHX_RADIO_PROMPT = (
    "Phoenix Police radio dispatch. Units use phonetic callsigns and beat numbers: "
    "934 George Mary, 725 India, Charlie 6, Air 12, Air Unit, Adam, Boy, Charlie, David, "
    "Edward, Frank, George, Henry, Ida, John, King, Lincoln, Mary, Nora, Ocean, Paul, "
    "Queen, Robert, Sam, Tom, Union, Victor, William, X-ray, Young, Zebra. "
    "Ten-codes and status: Code 4, Code 3, 10-4, copy, priority, holding, monitor, "
    "responding, en route, dispatch, precinct, suspect, vehicle, plate, registration. "
    "Times in military format like 1853, 1859. Streets: Camelback, Indian School, "
    "Van Buren, McDowell, Thomas, Bell, 27th Avenue, 35th Avenue, Cave Creek."
)

# Known Whisper "silence" hallucinations (lowercased, trailing punctuation stripped).
# Only dropped when no_speech_prob is also elevated (see segment post-filter), so a
# genuine short transmission like "Thanks" / "Copy" is never deleted.
HALLUCINATION_PHRASES = {
    "you",
    "thank you",
    "thanks",
    "thanks for watching",
    "thank you for watching",
    "bye",
    "bye-bye",
    "thanks for having me",
    "thank you for listening",
    "thank you very much",
    "please subscribe",
}


def compute_speech_clips(
    mp3_path, noise_db=-40, min_silence=0.8, pad=0.3, merge_gap=0.4, min_len=0.4
):
    """Detect non-silent regions by dB energy (ffmpeg silencedetect) and return
    (clip_timestamps, duration_seconds). clip_timestamps is a flat list
    [s0, e0, s1, e1, ...] for faster-whisper; empty if the file is effectively silent.

    Police radio is squelch-gated (long true-silence gaps between transmissions), and
    Whisper hallucinates during silence. An energy gate is far more reliable here than
    Silero VAD, which scores this 32 kbps audio's real speech as silence and drops it.
    """
    proc = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-i",
            str(mp3_path),
            "-af",
            f"silencedetect=noise={noise_db}dB:d={min_silence}",
            "-f",
            "null",
            "/dev/null",
        ],
        capture_output=True,
        text=True,
    )
    dur_proc = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(mp3_path),
        ],
        capture_output=True,
        text=True,
    )
    try:
        duration = float(dur_proc.stdout.strip())
    except ValueError:
        return [], 0.0
    sil, cur = [], None
    for ln in proc.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", ln)
        if m:
            cur = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and cur is not None:
            sil.append((cur, float(m.group(1))))
            cur = None
    speech, prev = [], 0.0
    for a, b in sil:
        if a > prev:
            speech.append([prev, a])
        prev = b
    if prev < duration:
        speech.append([prev, duration])
    speech = [[max(0.0, s - pad), min(duration, e + pad)] for s, e in speech]
    merged = []
    for s, e in speech:
        if merged and s - merged[-1][1] <= merge_gap:
            merged[-1][1] = e
        else:
            merged.append([s, e])
    clips = []
    for s, e in merged:
        if e - s >= min_len:
            clips += [round(s, 2), round(e, 2)]
    return clips, duration


@celery_app.task(bind=True, name="download_phoenix_pd_archives")
def download_phoenix_pd_archives(
    self,
    feed_id: str = PHOENIX_PD_FEED_ID,
    max_downloads: int = MAX_DOWNLOADS_PER_RUN,
    hours_back: int = 24,
) -> Dict[str, Any]:
    """
    Download Phoenix PD archives using direct URL patterns

    This task attempts to download archives based on the observed URL pattern.
    Archives appear to be available at specific time intervals.

    Args:
        feed_id: Broadcastify feed ID
        max_downloads: Maximum number of files to download in this run
        hours_back: Number of hours back to check for archives

    Returns:
        Dictionary with download results
    """
    downloaded_files = []
    skipped_files = []
    errors = []
    attempted_urls = []

    session = requests.Session()
    session.headers.update(
        {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
        }
    )

    try:
        # Update task state
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": "Starting archive download",
                "downloaded": 0,
                "skipped": 0,
            },
        )

        # Calculate time range
        end_time = datetime.now()
        start_time = end_time - timedelta(hours=hours_back)

        downloads_count = 0
        current_time = end_time

        # Archives appear to be created at regular intervals (likely every 30 minutes or hour)
        # Based on existing files: 202509062247, 202509062346, 202509070046, 202509070116
        # This suggests roughly hourly archives

        while current_time >= start_time and downloads_count < max_downloads:
            # Round to nearest 30 minutes for archive availability
            archive_time = current_time.replace(second=0, microsecond=0)
            if archive_time.minute >= 30:
                archive_time = archive_time.replace(minute=30)
            else:
                archive_time = archive_time.replace(minute=0)

            # Format timestamp for filename (YYYYMMDDHHMM)
            timestamp = archive_time.strftime("%Y%m%d%H%M")

            # Generate a pseudo-random ID based on timestamp (simplified approach)
            # In reality, these IDs are generated by Broadcastify
            archive_id = str(hash(timestamp) % 1000000).zfill(6)

            # Construct filename
            filename = f"{timestamp}-{archive_id}-{feed_id}.mp3"
            file_path = RADIO_DATA_PATH / filename

            # Skip if already downloaded
            if file_path.exists():
                logger.info(f"Skipping existing file: {filename}")
                skipped_files.append(str(file_path))
                current_time -= timedelta(minutes=30)
                continue

            # Try to construct a download URL
            # Note: This is a simplified approach - actual URLs may require authentication
            download_url = f"{ARCHIVE_BASE_URL}/{archive_id}"
            attempted_urls.append(download_url)

            current_task.update_state(
                state="PROCESSING",
                meta={
                    "status": f"Checking archive for {timestamp}",
                    "downloaded": len(downloaded_files),
                    "skipped": len(skipped_files),
                },
            )

            try:
                # Attempt download
                logger.info(f"Attempting to download: {filename}")
                response = session.head(download_url, timeout=10)

                if response.status_code == 200:
                    # Download the file
                    response = session.get(download_url, stream=True, timeout=30)

                    if response.status_code == 200:
                        with open(file_path, "wb") as f:
                            for chunk in response.iter_content(chunk_size=8192):
                                f.write(chunk)

                        downloaded_files.append(str(file_path))
                        downloads_count += 1
                        logger.info(f"Downloaded: {filename}")

                        # Rate limiting
                        time.sleep(DOWNLOAD_DELAY_SECONDS)

            except requests.RequestException as e:
                # This is expected for many URLs as we're guessing
                logger.debug(f"Could not download {filename}: {str(e)}")

            # Move to previous time slot
            current_time -= timedelta(minutes=30)

        # Log attempted URLs for debugging
        if not downloaded_files and attempted_urls:
            logger.info(f"No files downloaded. Attempted URLs: {attempted_urls[:5]}")
            logger.info(
                "Note: Direct download may require premium account or authentication"
            )

        # Final state update
        current_task.update_state(
            state="SUCCESS",
            meta={
                "status": "Completed",
                "downloaded": len(downloaded_files),
                "skipped": len(skipped_files),
                "errors": len(errors),
                "note": "Direct download may require premium account"
                if not downloaded_files
                else None,
            },
        )

        return {
            "status": "success",
            "downloaded_files": downloaded_files,
            "skipped_files": skipped_files,
            "errors": errors,
            "total_downloaded": len(downloaded_files),
            "total_skipped": len(skipped_files),
            "note": "Archives may require premium Broadcastify account for download"
            if not downloaded_files
            else None,
        }

    except Exception as exc:
        logger.error(f"Archive download task failed: {str(exc)}", exc_info=True)

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
    name="transcribe_phoenix_pd_archives_faster",
    time_limit=7200,  # 2 hours hard limit
    soft_time_limit=6600,  # 1 hour 50 minutes soft limit
)
def transcribe_phoenix_pd_archives_faster(
    self,
    directory_path: str = str(RADIO_DATA_PATH),
    model_name: str = "base",
    batch_size: int = 5,
) -> Dict[str, Any]:
    """
    Transcribe MP3 files using faster-whisper for improved performance

    Uses optimized parameters to prevent hallucination and repetition loops
    commonly found in police radio transcriptions.

    Args:
        directory_path: Path to directory containing MP3 files
        model_name: Whisper model to use (tiny, base, small, medium, large-v2, large-v3)
        batch_size: Maximum number of files to process in one run

    Returns:
        Dictionary with transcription results
    """
    transcribed_files = []
    skipped_files = []
    errors = []

    try:
        # Import faster-whisper
        from faster_whisper import WhisperModel

        # Load Whisper model
        current_task.update_state(
            state="PROCESSING",
            meta={
                "status": f"Loading faster-whisper model: {model_name}",
                "transcribed": 0,
                "skipped": 0,
            },
        )

        # Detect device and compute type
        import torch

        device = "cuda" if torch.cuda.is_available() else "cpu"
        # Use float16 for best performance with cuDNN 9 (CUDA 12.1)
        compute_type = "float16" if device == "cuda" else "int8"

        # Load model with faster-whisper
        model = WhisperModel(model_name, device=device, compute_type=compute_type)
        logger.info(
            f"Loaded faster-whisper model: {model_name} on device: {device} with compute_type: {compute_type}"
        )

        if device == "cuda":
            logger.info(f"GPU: {torch.cuda.get_device_name(0)}")
        else:
            logger.warning("CUDA not available! Running on CPU (will be very slow)")

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

                # Energy-gate the audio: decode ONLY real transmissions, not the long
                # silent gaps where Whisper hallucinates ("you", "Thanks for watching").
                # See RADIO_TRANSCRIPTION_FINDINGS.md for the analysis behind these params.
                clips, audio_duration = compute_speech_clips(str(mp3_file))
                if not clips:
                    logger.info(
                        f"No speech regions in {mp3_file.name} (silent file) - empty transcript"
                    )
                    segments_list = []
                    info = None
                else:
                    segments, info = model.transcribe(
                        str(mp3_file),
                        language="en",
                        condition_on_previous_text=False,  # CRITICAL - prevents repetition loops
                        beam_size=5,
                        temperature=(
                            0.0,
                            0.2,
                            0.4,
                            0.6,
                            0.8,
                            1.0,
                        ),  # Fallback strategy breaks loops
                        clip_timestamps=clips,  # energy-gated: decode only real transmissions
                        initial_prompt=PHX_RADIO_PROMPT,  # bias toward PHX PD vocab
                        compression_ratio_threshold=2.2,  # 1.35 discarded valid short "10-4. 10-4."
                        log_prob_threshold=-0.8,  # slightly stricter low-confidence fallback
                        no_speech_threshold=0.5,
                        hallucination_silence_threshold=2.0,
                        repetition_penalty=1.1,
                        word_timestamps=True,
                        vad_filter=False,  # Silero VAD destroys real speech on this 32 kbps audio
                    )
                    segments_list = list(segments)

                # Extract timestamp from filename (YYYYMMDDHHMM format)
                filename_parts = mp3_file.stem.split("_")
                if len(filename_parts) >= 2 and len(filename_parts[0]) == 8:
                    # Format: YYYYMMDD_timestamp_feedid
                    date_str = filename_parts[0]
                    timestamp_str = filename_parts[1]
                    recording_time = datetime.fromtimestamp(int(timestamp_str))
                else:
                    recording_time = datetime.fromtimestamp(mp3_file.stat().st_mtime)

                # Build segments with a post-filter: drop high-no_speech segments outright,
                # and drop known hallucination phrases only when they ALSO sit on near-silence
                # (so a genuine, confidently-decoded "Thanks" / "Copy" survives).
                kept_segments = []
                for segment in segments_list:
                    text = segment.text.strip()
                    if not text:
                        continue
                    key = text.lower().rstrip(".!? ")
                    nsp = getattr(segment, "no_speech_prob", 0.0)
                    if nsp > 0.8 or (key in HALLUCINATION_PHRASES and nsp > 0.5):
                        continue
                    kept_segments.append(
                        {
                            "id": segment.id,
                            "start": segment.start,
                            "end": segment.end,
                            "text": text,
                            # Confidence provenance for QA / legal defensibility (consumers
                            # ignore unknown fields). Lower no_speech_prob = more speech-like.
                            "no_speech_prob": round(nsp, 4),
                            "avg_logprob": round(
                                getattr(segment, "avg_logprob", 0.0), 4
                            ),
                        }
                    )

                full_text = " ".join(s["text"] for s in kept_segments)

                # Prepare transcription data with timestamps
                transcription_data = {
                    "filename": mp3_file.name,
                    "recording_time": recording_time.isoformat(),
                    "transcribed_at": datetime.now().isoformat(),
                    "model": model_name,
                    "engine": "faster-whisper",
                    "text": full_text,
                    "segments": kept_segments,
                    "metadata": {
                        "feed_id": PHOENIX_PD_FEED_ID,
                        "feed_name": "Phoenix Police",
                        "duration": info.duration
                        if info is not None
                        else audio_duration,
                        # Feed is always English; language is forced in transcribe() so no
                        # detection ever runs. Hardcode rather than echo info.language.
                        "language": "en",
                        "language_probability": 1.0,
                        # True when the archive yielded no transmissions (e.g. -91 dB
                        # silent feed dropout) so consumers can show a clear placeholder.
                        "silent": len(kept_segments) == 0,
                    },
                }

                # Save transcription as JSON
                json_file = mp3_file.with_suffix(".json")
                with open(json_file, "w") as f:
                    json.dump(transcription_data, f, indent=2)

                # Also save plain text version for easy reading
                txt_file = mp3_file.with_suffix(".txt")
                with open(txt_file, "w") as f:
                    f.write("Phoenix Police Radio Archive Transcription\n")
                    f.write(f"{'=' * 60}\n")
                    f.write(f"File: {mp3_file.name}\n")
                    f.write(
                        f"Recording Time: {recording_time.strftime('%Y-%m-%d %H:%M')}\n"
                    )
                    f.write(
                        f"Transcribed: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
                    )
                    f.write(f"Model: {model_name} (faster-whisper)\n")
                    f.write(f"{'=' * 60}\n\n")

                    # Write segments with timestamps
                    f.write("TIMESTAMPED TRANSCRIPT:\n\n")
                    for segment in transcription_data["segments"]:
                        start_time = segment["start"]
                        end_time = segment["end"]
                        # Format timestamps as MM:SS
                        start_str = (
                            f"{int(start_time//60):02d}:{int(start_time%60):02d}"
                        )
                        end_str = f"{int(end_time//60):02d}:{int(end_time%60):02d}"
                        f.write(f"[{start_str} - {end_str}] {segment['text']}\n")

                    f.write("\n" + "=" * 60 + "\n")
                    f.write("FULL TEXT:\n\n")
                    f.write(full_text)

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
