# Phoenix PD radio transcription — accuracy findings & proposed changes

**Status:** experiments complete, code changes proposed but NOT applied. Awaiting review.
**Date:** 2026-06-14

## TL;DR

The dominant accuracy problem is **hallucinations during silence**, not bad decoding of
speech. Phoenix PD radio is squelch-gated: ~60-65% of every file is true silence, and
Whisper compulsively fills silence with `"you"`, `"Thanks for watching"`, etc.

The fix that worked is an **energy-based speech gate** (ffmpeg `silencedetect`) feeding
faster-whisper via `clip_timestamps`, so the model only decodes real transmissions. This
**eliminated 100% of dead-air hallucinations on the sample set while preserving real
speech** — verified segment-by-segment.

The prompt's leading hypothesis (turn on Silero `vad_filter`) **made things dramatically
worse** and is explicitly rejected below. Bigger models (`large-v3`, `large-v3-turbo`) did
**not** clearly help — the bottleneck is 32 kbps audio quality, not model capacity; turbo
was actively worse. **Recommendation: keep `medium`.**

---

## What was measured

Baseline corpus (1,912 transcribed files, 405,615 segments):
- **14,529** standalone `"you"` segments (3.6% of ALL segments)
- **176** `"Thanks for watching"` across 165 files
- 477 `"Thanks."`, 80 `"bye"/"bye-bye"`

Sample set (day/night, dead-air/busy/clean):
| role | file | local time | baseline |
|---|---|---|---|
| dead-air stress | `20251112_1762948075` | Wed 04:47 | 33 segs, **all 33 "you"** |
| busy daytime | `20251027_1761597730` | Mon 13:42 | ~271 segs, 5 "you" |
| clean daytime | `20251022_1761152016` | Wed 09:53 | ~256 segs, 1 "you" + 1 "watching" |

### Root cause (verified)
- Dead-air files are **literal digital silence**: `mean_volume = max_volume = -91.0 dB`.
  Real speech sits at **-19 dB mean / 0 dB peak**. A ~70 dB gap → trivially separable by energy.
- The dead-air `"you"` segments have **`no_speech_prob = 0.934`**; real speech is **0.25-0.50**.
- Production's `no_speech_threshold=0.4` fails to suppress them because faster-whisper only
  drops a segment when `no_speech_prob > threshold` **AND** `avg_logprob < log_prob_threshold (-1.0)`.
  The `"you"` has `avg_logprob = -0.442` (> -1.0), so it survives. This is the bug.

---

## Approaches tested

### ❌ Silero VAD (`vad_filter=True`) — REJECTED
Threshold sweep on `medium`, segs / speech-seconds:

| threshold | deadair | busy | clean |
|---|---|---|---|
| none (baseline) | 33 / 68s | 297 / 1260s | 256 / 1159s |
| 0.10 | 0 | 102 / 544s | 61 / 367s |
| 0.20 | 0 | 59 / 329s | 90 / 519s |
| 0.30 | 0 | 125 / 642s | 42 / 219s |

Silero kills dead air (good) but **destroys real speech at every threshold** and behaves
non-monotonically (clean: 61→59→90→37→42). At the prompt's suggested 0.4 the clean file
collapsed from 256 real segments to **2 garbled ones**. Silero is a neural VAD trained on
clean speech; 32 kbps/22 kHz radio confuses it into scoring real speech as silence.

### ✅ Energy gate (ffmpeg `silencedetect` → `clip_timestamps`) — RECOMMENDED
Detect non-silent regions by dB energy, pad/merge them, pass as `clip_timestamps`.
faster-whisper decodes only those regions and restores absolute timestamps.

`medium`, noise gate = -40 dB:
| file | regions | gated speech | segs | "you" | "watching" |
|---|---|---|---|---|---|
| deadair | 0 | 0s | **0** | **0** | 0 |
| busy | 188 | 834s | 242 | **0** | 0 |
| clean | 210 | 788s | 257 | **0** | 0 |

Segment counts stay **comparable to baseline** (242 vs 271, 257 vs 256) → real speech
preserved, while every hallucination class drops to **0**. Verified by aligning transcripts:
every real transmission in baseline ("31st Avenue and Coach East", "10-4 Charlie East 2",
"232 bravo", "R-415 Bravo quiz", "412 David…418") survives at the same timestamp. The gate
even recovered a transmission at ~98s that baseline skipped.

**Generalization check** (24 random files, -40 dB): speech coverage 17-41% for real files,
0% only for genuine dead-air files. **Zero files** where the gate would wrongly zero-out
real content. Threshold is safe and not a knife-edge (coverage stable -35 to -45 dB).

### Model size — `medium` wins
All three eliminate hallucinations equally (the gate does that, not the model). Quality &
speed on gated audio (per ~30-min file):
| model | time/file | VRAM | quality notes |
|---|---|---|---|
| **medium** | 96-116s | ~2.8 GB | cleanest of the three; production default |
| large-v3 | 132-150s | ~5 GB | mixed: some callsigns better, some worse; slower |
| large-v3-turbo | 75-82s | ~5 GB | **worse** — injects more YouTube clichés ("Thanks for having me"), "61 Adam"→"Sexy one, Adam" |

Bottleneck is source audio quality, not model capacity. **Keep `medium`.**

### Audio denoising — deliberately NOT done
Web consensus + Whisper maintainers: denoising "rarely works" and can *worsen*
hallucinations by altering the spectrum. Energy gating is the safe lever. (A gentle
high-pass at 80 Hz is harmless but showed no measurable benefit; not recommended as required.)

### Post-filter (belt-and-suspenders)
`medium`+gate leaked 0 hallucinations on the sample; `turbo` leaked a couple `"you"` in
brief above-threshold noise. A cheap post-filter catches any residue with no inference cost.
Two conditions, deliberately asymmetric so we never delete confidently-decoded real audio:
- `no_speech_prob > 0.8` → drop (real speech ≤ 0.5, dead-air "you" = 0.93 — wide margin, safe)
- text ∈ hallucination blocklist **AND** `no_speech_prob > 0.5` → drop

The blocklist is gated behind elevated `no_speech_prob` on purpose: police radio occasionally
contains a genuine one-word "Thanks" / "Copy, thank you", and for a legal-evidence corpus we
must not silently delete real transmissions. A real "Thanks" decodes with low `no_speech_prob`
and is therefore kept; only a "Thanks" sitting on top of near-silence (a hallucination) is dropped.

---

## Recommended final configuration

- **Model:** `medium` (unchanged), `cuda` / `float16` (unchanged)
- **Pre-step:** energy gate via ffmpeg `silencedetect` (noise=`-40dB`, min_silence=`0.8s`),
  invert → pad `0.3s` → merge gaps `≤0.4s` → drop regions `<0.4s` → `clip_timestamps`
- **transcribe kwargs:** add `clip_timestamps`, `initial_prompt` (PHX vocab),
  `compression_ratio_threshold=2.2`, `log_prob_threshold=-0.8`, `no_speech_threshold=0.5`,
  `hallucination_silence_threshold=2.0`, `repetition_penalty=1.1`, `word_timestamps=True`;
  keep `condition_on_previous_text=False`, `beam_size=5`, temperature fallback, `vad_filter=False`
- **Post-step:** drop a segment if `no_speech_prob > 0.8`, or if its text ∈ hallucination
  blocklist **and** `no_speech_prob > 0.5` (conditional so genuine short transmissions survive)
- If a file has **no speech regions** → write valid JSON with empty `segments` (schema intact),
  marking it transcribed so it isn't reprocessed.

### Expected corpus impact
- Dead-air `"you"` hallucinations: ~14,500 → near 0
- `"Thanks for watching"`: 176 → near 0
- Speed: roughly **unchanged-to-faster** (decoding ~35% less audio offsets the ~1s ffmpeg pass)
- Trade-off: a transmission entirely below -40 dB (very weak/distant unit) could be missed.
  Generalization check found none in 24 files; if a quieter feed appears, raise gate to -45 dB.

---

## Before / after (clean file, `medium`)

```
BASELINE (no VAD)                              ENERGY GATE
[  0.0] It's going to be 31st Avenue and...    [  0.0] 7B, 31st Avenue ... Coach East Drive, 45th Subject
[ 25.0] You said you were switching prior?     [ 25.2] You said you were searching prior?
[ 31.0] 10-4, Charlie East 2, is there a...    [ 31.6] 10-4, Charlie East 2 ... follow, 17th
[ 70-104] (30s gap, no segments)               [ 98.2] I can turn 6-0-1   <-- recovered real transmission
[127.0] Can you put this all through as an...  [126.6] Can you put this all through as an R-415 Bravo quiz?
(scattered " you" / "Thanks for watching")     (none)
```
dead-air file: **33 "you" segments → 0**.

---

## Proposed code edits (NOT applied)

Two files must stay in sync: `backend/app/workers/radio_tasks_faster_whisper.py` (production
task) and `transcription-worker-poetry/priority_transcribe.py` (one-off). Both get the same
helper + transcribe block + post-filter.

### Shared additions

Add near the top (after existing imports):

```python
import subprocess
import re

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

# Known Whisper "silence" hallucinations (lowercased, stripped of trailing punctuation)
HALLUCINATION_PHRASES = {
    "you", "thank you", "thanks", "thanks for watching", "thank you for watching",
    "bye", "bye-bye", "thanks for having me", "thank you for listening",
    "thank you very much", "please subscribe",
}

def compute_speech_clips(mp3_path, noise_db=-40, min_silence=0.8,
                         pad=0.3, merge_gap=0.4, min_len=0.4):
    """Return flat [s0,e0,s1,e1,...] of non-silent regions (seconds) via ffmpeg
    silencedetect, or [] if the file is effectively silent. Energy-based VAD tuned
    to squelch-gated radio — far more reliable than Silero on 32 kbps audio."""
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
        return []  # can't probe -> let caller fall back
    sil, cur = [], None
    for ln in proc.stderr.splitlines():
        m = re.search(r"silence_start: ([\d.]+)", ln)
        if m:
            cur = float(m.group(1))
        m = re.search(r"silence_end: ([\d.]+)", ln)
        if m and cur is not None:
            sil.append((cur, float(m.group(1)))); cur = None
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
    return clips
```

### Replace the `model.transcribe(...)` block

`radio_tasks_faster_whisper.py` lines **318-333**, and `priority_transcribe.py` lines **38-44**:

```python
clips = compute_speech_clips(str(mp3_file))
if not clips:
    logger.info(f"No speech regions in {mp3_file.name} (silent file) - empty transcript")
    segments_list = []
    info = None
else:
    segments, info = model.transcribe(
        str(mp3_file),
        language="en",
        condition_on_previous_text=False,   # prevents repetition loops
        beam_size=5,
        temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0),
        clip_timestamps=clips,              # energy-gated: decode only real transmissions
        initial_prompt=PHX_RADIO_PROMPT,    # bias toward PHX PD vocab, away from YouTube clichés
        compression_ratio_threshold=2.2,    # was 1.35; 1.35 discarded valid short "10-4. 10-4."
        log_prob_threshold=-0.8,            # slightly stricter low-confidence fallback
        no_speech_threshold=0.5,
        hallucination_silence_threshold=2.0,
        repetition_penalty=1.1,
        word_timestamps=True,
        vad_filter=False,                   # Silero VAD destroys real speech on this audio
    )
    segments_list = list(segments)
```

### Replace the segment-building loop with a post-filter

Where segments are appended (`radio_tasks_faster_whisper.py` ~368-376; `priority_transcribe.py` ~62-63):

```python
for segment in segments_list:
    text = segment.text.strip()
    key = text.lower().rstrip(".!? ")
    nsp = getattr(segment, "no_speech_prob", 0.0)
    if not text:
        continue
    # Drop high-no_speech segments outright; drop blocklist phrases only when they
    # ALSO sit on near-silence, so a genuine confidently-decoded "Thanks" survives.
    if nsp > 0.8 or (key in HALLUCINATION_PHRASES and nsp > 0.5):
        continue
    transcription_data["segments"].append({
        "id": segment.id, "start": segment.start,
        "end": segment.end, "text": text,
    })

full_text = " ".join(s["text"] for s in transcription_data["segments"])
```

(Build `full_text` from the *filtered* segments, and when `info is None` set
`metadata.duration` from `mp3_file.stat()` / ffprobe and `language_probability` to `1.0`.)

### Schema
Backward-compatible. Still emits `filename`, `recording_time`, `transcribed_at`, `model`,
`engine`, `text`, `segments[{id,start,end,text}]`, `metadata{...}` and the `.txt` sidecar.
Each segment now ALSO carries two additive provenance fields — `no_speech_prob` and
`avg_logprob` — for QA / legal defensibility (e.g. "every retained segment scored below X
silence-probability"). Verified safe: the backend returns the JSON via `json.load` with no
Pydantic `response_model`/`extra="forbid"`, and the frontend reads only `start`/`end`/`text`
(extra keys ignored). The frontend `Segment` TS interface was extended with both as optional.

### Dependencies
**None added.** Uses `ffmpeg`/`ffprobe` (already required) and stdlib `subprocess`/`re`.
`clip_timestamps`, `hallucination_silence_threshold`, `repetition_penalty` are all supported
by the installed `faster-whisper 1.2.0`.

### Optional: faster-whisper 1.2.0 → 1.2.1 upgrade (recommended, low-risk)
- Installed **1.2.0**; latest **1.2.1**. The pyproject constraint `^1.0.3` already allows it,
  so it's an in-range patch bump (edit `poetry.lock` via `poetry update faster-whisper`; no
  pyproject change needed).
- **Directly relevant fix:** 1.2.1 "prevented merging behavior when `clip_timestamps` are
  supplied" — i.e. the library now respects our energy-gated clips faithfully instead of
  potentially re-merging them. This aligns with our approach. (Our own `merge_gap` pre-merge
  in `compute_speech_clips` is independent and still wanted.)
- Also: Silero-VAD V6 (irrelevant — we don't use Silero), distil-large-v3.5 support.
- **Breaking change is batched-only** (`<|nocaptions|>` token fix in `BatchedInferencePipeline`),
  which this pipeline does not use. The non-batched `model.transcribe(...)` API is unchanged.
- **Validated:** re-ran the energy-gated pipeline on both versions (`medium`, 3 timed
  iterations/file after GPU warmup). Runtime is **equal** (within noise) and output is
  materially identical (no regression):

  | file | 1.2.0 mean | 1.2.1 mean | Δ |
  |---|---|---|---|
  | busy | 97.1s (95.8/97.2/98.4) | 97.3s (99.2/97.0/95.7) | +0.2% |
  | clean | 114.8s (114.3/116.0/114.2) | 116.6s (115.8/115.3/118.6) | +1.6% |

  Segment counts match (busy 239=239; clean 257 vs 259); transcript text is char-identical
  across the first 14 segments, with only trivial boundary shifts elsewhere. Upgrade is
  safe and free. **Note:** the venv was bumped to 1.2.1 for this test via `pip`; `poetry.lock`
  still pins 1.2.0 — run `poetry add "faster-whisper@^1.2.1"` (or `poetry lock`) to make it
  official, or `pip install faster-whisper==1.2.0` to revert.
