#!/usr/bin/env python3
"""One-off PRIORITY transcription of Oct 24/25/26 radio archives.
Reproduces transcribe_phoenix_pd_archives_faster output (json+txt) exactly,
writing to the CIFS-mounted data dir. Restarts the systemd worker when done."""
import os, re, json, glob, subprocess
from datetime import datetime
from pathlib import Path

DATA = Path("/home/chris/code/phx-helicopter-tracker/transcription-worker-poetry/data/radio/phoenix_pd")
PREFIXES = ("20251024", "20251025", "20251026")
MODEL_NAME = "medium"
FEED_ID = "12145"

# Kept in sync with backend/app/workers/radio_tasks_faster_whisper.py
# See RADIO_TRANSCRIPTION_FINDINGS.md for the analysis behind these.
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
HALLUCINATION_PHRASES = {
    "you", "thank you", "thanks", "thanks for watching", "thank you for watching",
    "bye", "bye-bye", "thanks for having me", "thank you for listening",
    "thank you very much", "please subscribe",
}

def log(m):
    print(f"[{datetime.now().isoformat()}] {m}", flush=True)

def compute_speech_clips(mp3_path, noise_db=-40, min_silence=0.8,
                         pad=0.3, merge_gap=0.4, min_len=0.4):
    """Energy-based speech gate -> (clip_timestamps, duration). See findings doc."""
    proc = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(mp3_path), "-af",
         f"silencedetect=noise={noise_db}dB:d={min_silence}", "-f", "null", "/dev/null"],
        capture_output=True, text=True)
    dur_proc = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(mp3_path)],
        capture_output=True, text=True)
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

# Build sorted (chronological) list of untranscribed target files
targets = []
for p in PREFIXES:
    for mp3 in glob.glob(str(DATA / f"{p}_*.mp3")):
        if not Path(mp3).with_suffix(".json").exists():
            targets.append(Path(mp3))
targets = sorted(set(targets), key=lambda x: x.name)
log(f"Priority files to transcribe (Oct 24-26, untranscribed): {len(targets)}")

if targets:
    import torch
    from faster_whisper import WhisperModel
    device = "cuda" if torch.cuda.is_available() else "cpu"
    compute_type = "float16" if device == "cuda" else "int8"
    model = WhisperModel(MODEL_NAME, device=device, compute_type=compute_type)
    log(f"Loaded faster-whisper '{MODEL_NAME}' on {device} ({compute_type})")

    done = 0
    for i, mp3_file in enumerate(targets, 1):
        try:
            log(f"[{i}/{len(targets)}] Transcribing: {mp3_file.name}")
            # Energy-gate: decode only real transmissions, not silent gaps.
            clips, audio_duration = compute_speech_clips(str(mp3_file))
            if not clips:
                log(f"   No speech regions (silent file) - empty transcript")
                segments_list, info = [], None
            else:
                segments, info = model.transcribe(
                    str(mp3_file), language="en",
                    condition_on_previous_text=False, beam_size=5,
                    temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
                    clip_timestamps=clips, initial_prompt=PHX_RADIO_PROMPT,
                    compression_ratio_threshold=2.2, log_prob_threshold=-0.8,
                    no_speech_threshold=0.5, hallucination_silence_threshold=2.0,
                    repetition_penalty=1.1, word_timestamps=True, vad_filter=False,
                )
                segments_list = list(segments)
            # Post-filter: drop high-no_speech segments; drop blocklist phrases only
            # when they also sit on near-silence (genuine short "Thanks"/"Copy" survive).
            kept = []
            for s in segments_list:
                text = s.text.strip()
                if not text:
                    continue
                key = text.lower().rstrip(".!? ")
                nsp = getattr(s, "no_speech_prob", 0.0)
                if nsp > 0.8 or (key in HALLUCINATION_PHRASES and nsp > 0.5):
                    continue
                kept.append({"id": s.id, "start": s.start, "end": s.end, "text": text,
                             # Confidence provenance for QA / legal defensibility.
                             "no_speech_prob": round(nsp, 4),
                             "avg_logprob": round(getattr(s, "avg_logprob", 0.0), 4)})
            full_text = " ".join(k["text"] for k in kept)
            parts = mp3_file.stem.split("_")
            if len(parts) >= 2 and len(parts[0]) == 8:
                recording_time = datetime.fromtimestamp(int(parts[1]))
            else:
                recording_time = datetime.fromtimestamp(mp3_file.stat().st_mtime)
            data = {
                "filename": mp3_file.name,
                "recording_time": recording_time.isoformat(),
                "transcribed_at": datetime.now().isoformat(),
                "model": MODEL_NAME, "engine": "faster-whisper",
                "text": full_text, "segments": kept,
                "metadata": {"feed_id": FEED_ID, "feed_name": "Phoenix Police",
                             "duration": info.duration if info is not None else audio_duration,
                             "language": "en", "language_probability": 1.0},  # always English; forced in transcribe()
            }
            with open(mp3_file.with_suffix(".json"), "w") as f:
                json.dump(data, f, indent=2)
            with open(mp3_file.with_suffix(".txt"), "w") as f:
                f.write("Phoenix Police Radio Archive Transcription\n")
                f.write("=" * 60 + "\n")
                f.write(f"File: {mp3_file.name}\n")
                f.write(f"Recording Time: {recording_time.strftime('%Y-%m-%d %H:%M')}\n")
                f.write(f"Transcribed: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
                f.write(f"Model: {MODEL_NAME} (faster-whisper)\n")
                f.write("=" * 60 + "\n\n")
                f.write("TIMESTAMPED TRANSCRIPT:\n\n")
                for seg in data["segments"]:
                    ss = f"{int(seg['start']//60):02d}:{int(seg['start']%60):02d}"
                    es = f"{int(seg['end']//60):02d}:{int(seg['end']%60):02d}"
                    f.write(f"[{ss} - {es}] {seg['text']}\n")
                f.write("\n" + "=" * 60 + "\nFULL TEXT:\n\n")
                f.write(full_text)
            done += 1
            log(f"   done ({done} total)")
        except Exception as e:
            log(f"   ERROR on {mp3_file.name}: {e}")
    log(f"PRIORITY COMPLETE: transcribed {done}/{len(targets)}")
else:
    log("Nothing to do.")

log("Restarting regular transcription worker...")
subprocess.run(["sudo", "systemctl", "start", "transcription-worker"], check=False)
log("Worker restarted. Priority job finished.")
