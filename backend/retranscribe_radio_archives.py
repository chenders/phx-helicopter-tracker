#!/usr/bin/env python3
"""
Sequential Radio Archive Re-transcription Script

This script re-transcribes all existing radio archives sequentially using the existing
Whisper transcription infrastructure from radio_tasks.py. It handles both local development
and Docker environments correctly.

Features:
- Finds all MP3 files in the radio archive directory
- Uses the existing Whisper transcription logic with 'base' model
- Processes files sequentially to avoid overwhelming the system
- Shows progress as it processes each file
- Handles both local and Docker paths correctly
- Skips files that are already transcribed (unless force flag is used)
- Creates both JSON and TXT transcription files

Usage:
    python retranscribe_radio_archives.py [--force] [--directory /path/to/radio/files]
"""

import os
import sys
import json
import time
import logging
import argparse
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any

# Add the app directory to the Python path so we can import from it
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'app'))

try:
    import whisper
except ImportError:
    print("ERROR: Whisper is not installed. Please install it with: pip install openai-whisper")
    sys.exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('retranscribe_radio_archives.log')
    ]
)
logger = logging.getLogger(__name__)

# Default data paths - handle both local and Docker environments
def get_radio_data_path():
    """Get the correct path to radio data based on environment"""
    # Check if we're in Docker (data mounted at /app/data)
    docker_path = Path("/app/data/radio/phoenix_pd")
    if docker_path.exists():
        return docker_path
    
    # Check if we're in the backend directory (development)
    backend_relative_path = Path("../data/radio/phoenix_pd")
    if backend_relative_path.exists():
        return backend_relative_path.resolve()
    
    # Check if we're in the project root
    root_relative_path = Path("data/radio/phoenix_pd")
    if root_relative_path.exists():
        return root_relative_path.resolve()
    
    # Default fallback
    current_dir = Path(__file__).parent
    project_root = current_dir.parent
    fallback_path = project_root / "data" / "radio" / "phoenix_pd"
    fallback_path.mkdir(parents=True, exist_ok=True)
    return fallback_path

RADIO_DATA_PATH = get_radio_data_path()

def find_mp3_files(directory_path: Path) -> List[Path]:
    """Find all MP3 files in the directory"""
    mp3_files = []
    for mp3_file in directory_path.glob("*.mp3"):
        # Skip empty files
        if mp3_file.stat().st_size > 0:
            mp3_files.append(mp3_file)
    
    # Sort by filename for consistent processing order
    mp3_files.sort()
    return mp3_files

def check_existing_transcriptions(mp3_files: List[Path]) -> tuple[List[Path], List[Path]]:
    """
    Check which files already have transcriptions
    Returns: (files_to_process, files_with_transcriptions)
    """
    files_to_process = []
    files_with_transcriptions = []
    
    for mp3_file in mp3_files:
        json_file = mp3_file.with_suffix(".json")
        if json_file.exists():
            files_with_transcriptions.append(mp3_file)
        else:
            files_to_process.append(mp3_file)
    
    return files_to_process, files_with_transcriptions

def transcribe_file(mp3_file: Path, model, model_name: str = "base") -> Dict[str, Any]:
    """
    Transcribe a single MP3 file using Whisper
    This uses the same logic as the radio_tasks.py transcription function
    """
    logger.info(f"Transcribing: {mp3_file.name}")
    
    # Track transcription start time for performance metrics
    transcription_start = time.time()
    
    # Transcribe with Whisper - optimized for accuracy (same settings as radio_tasks.py)
    result = model.transcribe(
        str(mp3_file),
        fp16=False,  # Use FP32 for better accuracy on CPU
        language="en",  # Explicitly specify English
        task="transcribe",  # Transcribe, not translate
        verbose=False,
        temperature=0,  # Most deterministic results for accuracy
        best_of=5,  # Use best of 5 candidates for better accuracy (slower)
        beam_size=5,  # Beam search for better accuracy (slower)
        patience=1.0,  # Default patience for beam search
        length_penalty=1.0,  # Default length penalty
        suppress_tokens="",  # Don't suppress any tokens
        condition_on_previous_text=True,  # Better context (slower but more accurate)
        word_timestamps=False,  # We don't need word-level timestamps
    )
    
    # Track transcription time
    transcription_time = time.time() - transcription_start
    
    # Prepare transcription data with timestamps and model info
    transcription_data = {
        "filename": mp3_file.name,
        "transcribed_at": datetime.now().isoformat(),
        "model": model_name,
        "model_performance": {
            "transcription_time_seconds": round(transcription_time, 2),
            "file_size_mb": round(mp3_file.stat().st_size / (1024 * 1024), 2),
        },
        "text": result["text"],
        "segments": [],
    }
    
    # Add segment details with timestamps
    for segment in result.get("segments", []):
        transcription_data["segments"].append(
            {
                "id": segment.get("id"),
                "start": segment.get("start"),
                "end": segment.get("end"),
                "text": segment.get("text", "").strip(),
            }
        )
    
    # Save transcription as JSON
    json_file = mp3_file.with_suffix(".json")
    with open(json_file, "w") as f:
        json.dump(transcription_data, f, indent=2)
    
    # Also save plain text version for easy reading
    txt_file = mp3_file.with_suffix(".txt")
    with open(txt_file, "w") as f:
        f.write(f"Transcription of: {mp3_file.name}\\n")
        f.write(f"Transcribed at: {transcription_data['transcribed_at']}\\n")
        f.write(f"Model: {model_name}\\n")
        f.write(f"Transcription time: {transcription_data['model_performance']['transcription_time_seconds']}s\\n")
        f.write(f"File size: {transcription_data['model_performance']['file_size_mb']}MB\\n")
        f.write("=" * 80 + "\\n\\n")
        
        # Write segments with timestamps
        for segment in transcription_data["segments"]:
            start_time = segment["start"]
            end_time = segment["end"]
            # Format timestamps as MM:SS
            start_str = f"{int(start_time//60):02d}:{int(start_time%60):02d}"
            end_str = f"{int(end_time//60):02d}:{int(end_time%60):02d}"
            f.write(f"[{start_str} - {end_str}] {segment['text']}\\n")
        
        f.write("\\n" + "=" * 80 + "\\n")
        f.write("FULL TEXT:\\n\\n")
        f.write(result["text"])
    
    logger.info(f"Transcribed: {mp3_file.name} in {transcription_time:.2f}s")
    
    return transcription_data

def main():
    parser = argparse.ArgumentParser(description="Re-transcribe radio archives sequentially")
    parser.add_argument(
        "--force", 
        action="store_true", 
        help="Re-transcribe files even if transcription already exists"
    )
    parser.add_argument(
        "--directory",
        type=str,
        default=str(RADIO_DATA_PATH),
        help=f"Directory containing MP3 files (default: {RADIO_DATA_PATH})"
    )
    parser.add_argument(
        "--model",
        type=str,
        default="base",
        choices=["tiny", "base", "small", "medium", "large"],
        help="Whisper model to use (default: base, as specified in codebase)"
    )
    
    args = parser.parse_args()
    
    # Validate directory
    directory_path = Path(args.directory)
    if not directory_path.exists():
        logger.error(f"Directory does not exist: {directory_path}")
        sys.exit(1)
    
    logger.info(f"Starting radio archive re-transcription")
    logger.info(f"Directory: {directory_path}")
    logger.info(f"Model: {args.model}")
    logger.info(f"Force re-transcription: {args.force}")
    
    # Find all MP3 files
    mp3_files = find_mp3_files(directory_path)
    logger.info(f"Found {len(mp3_files)} MP3 files")
    
    if not mp3_files:
        logger.info("No MP3 files found to process")
        return
    
    # Check existing transcriptions
    if args.force:
        files_to_process = mp3_files
        files_with_transcriptions = []
        logger.info("Force mode: will re-transcribe all files")
    else:
        files_to_process, files_with_transcriptions = check_existing_transcriptions(mp3_files)
        logger.info(f"Files already transcribed: {len(files_with_transcriptions)}")
        logger.info(f"Files to process: {len(files_to_process)}")
    
    if not files_to_process:
        logger.info("No files need transcription (use --force to re-transcribe all)")
        return
    
    # Load Whisper model
    logger.info(f"Loading Whisper model: {args.model}")
    try:
        model = whisper.load_model(args.model)
        logger.info(f"Successfully loaded Whisper model: {args.model}")
    except Exception as e:
        logger.error(f"Failed to load Whisper model: {e}")
        sys.exit(1)
    
    # Process files sequentially
    transcribed_count = 0
    error_count = 0
    
    for idx, mp3_file in enumerate(files_to_process, 1):
        try:
            logger.info(f"Processing file {idx}/{len(files_to_process)}: {mp3_file.name}")
            
            # Transcribe the file
            transcription_data = transcribe_file(mp3_file, model, args.model)
            
            transcribed_count += 1
            progress_percent = (idx / len(files_to_process)) * 100
            logger.info(f"Progress: {progress_percent:.1f}% ({idx}/{len(files_to_process)})")
            
            # Brief pause between files to avoid overwhelming the system
            if idx < len(files_to_process):  # Don't pause after the last file
                time.sleep(1)
                
        except KeyboardInterrupt:
            logger.info("Interrupted by user. Stopping...")
            break
        except Exception as e:
            logger.error(f"Error transcribing {mp3_file.name}: {e}")
            error_count += 1
            continue
    
    # Summary
    logger.info("=" * 60)
    logger.info("TRANSCRIPTION SUMMARY")
    logger.info("=" * 60)
    logger.info(f"Total MP3 files found: {len(mp3_files)}")
    logger.info(f"Files already transcribed: {len(files_with_transcriptions)}")
    logger.info(f"Files processed in this run: {transcribed_count}")
    logger.info(f"Errors encountered: {error_count}")
    logger.info(f"Success rate: {(transcribed_count / len(files_to_process) * 100):.1f}%" if files_to_process else "N/A")
    
    if args.force and files_with_transcriptions:
        logger.info("\\nNote: Force mode was used - some files may have been re-transcribed")
    
    logger.info("\\nTranscription process completed!")

if __name__ == "__main__":
    main()