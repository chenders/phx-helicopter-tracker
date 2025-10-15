# GPU Transcription Worker - Quick Start

## Ready to Use! ✅

The transcription worker is **fully configured and ready to deploy**. Here's what's been set up:

### Backend
- ✅ API endpoint enabled: `POST /api/v1/radio/archives/transcribe`
- ✅ Task routing configured: `transcription` queue → GPU worker only
- ✅ faster-whisper implementation with anti-hallucination settings
- ✅ Main worker excludes transcription queue (no conflicts)

### Frontend
- ✅ "Transcribe Untranscribed" button on Radio page
- ✅ Task status tracking with spinner icons
- ✅ Real-time transcription progress display

### Worker Container
- ✅ CUDA 12.1 + cuDNN 9 support
- ✅ PyTorch with GPU acceleration
- ✅ faster-whisper for 4x speed improvement vs OpenAI Whisper
- ✅ Optimized for police radio (prevents hallucinations)

## 3-Step Deployment

### Step 1: Configure Connection (2 minutes)

Edit `transcription-worker/docker-compose.yml` lines 56-57:

```yaml
- REDIS_URL=redis://YOUR_SERVER_IP:6380
- DATABASE_URL=postgresql://postgres:postgres@YOUR_SERVER_IP:5433/phoenix_helicopters
```

Replace `YOUR_SERVER_IP` with your main server's IP address.

### Step 2: Copy Backend Code (5 minutes)

From main server:
```bash
cd /home/phx/phx-helicopter-tracker
tar czf backend.tar.gz backend/
# Transfer backend.tar.gz to GPU worker machine
```

On GPU worker machine:
```bash
cd transcription-worker/
tar xzf backend.tar.gz
```

### Step 3: Start Worker (1 minute)

```bash
cd transcription-worker/
docker compose up -d
```

**That's it!** The worker will:
1. Connect to your Redis and PostgreSQL
2. Register on the `transcription` queue
3. Wait for tasks from the web interface

## How to Use

### From the Web Interface

1. Navigate to **Radio** page: `http://localhost:3000/radio`
2. Click **"Transcribe Untranscribed"** button
3. Worker automatically processes next untranscribed file
4. Refresh page to see completed transcription
5. Click green icon to view transcript

### From the API

```bash
curl -X POST "http://localhost:8001/api/v1/radio/archives/transcribe?batch_size=1&model_name=base"
```

### Monitor Progress

- **Flower Dashboard**: `http://localhost:5555`
  - View active workers
  - Monitor task progress
  - Check GPU worker stats

- **Radio Page**:
  - See transcription percentage
  - View files being transcribed (spinner icon)
  - Access completed transcripts (green icon)

## Verify It's Working

### 1. Check Worker Connected

From main server:
```bash
docker compose exec celery celery -A app.workers.celery_app inspect active_queues | grep -A2 gpu-worker
```

Should show:
```
-> gpu-worker@hostname: OK
    * {'name': 'transcription', ...}
```

### 2. Test Transcription

1. Go to Radio page
2. Click "Transcribe Untranscribed"
3. Check Flower dashboard (`http://localhost:5555`)
4. Look for task in "Tasks" tab
5. Should show as running on `gpu-worker`

### 3. Check Output

After ~30-60 seconds (for base model):
```bash
ls -la data/radio/phoenix_pd/*.json
```

Should see new `.json` and `.txt` files with transcriptions.

## Model Performance

| Model  | Speed (30min audio) | Accuracy | GPU RAM | Recommended For |
|--------|---------------------|----------|---------|-----------------|
| tiny   | ~30 sec             | Fair     | ~1 GB   | Testing only    |
| base   | ~60 sec             | Good     | ~1 GB   | **Recommended** |
| small  | ~2 min              | Better   | ~2 GB   | Higher accuracy |
| medium | ~5 min              | High     | ~5 GB   | Best results    |
| large  | ~10 min             | Highest  | ~10 GB  | RTX 3090+ only  |

**Recommendation**: Start with `base` model. It provides the best balance of speed and accuracy for police radio.

## Troubleshooting

### Worker not showing up?

```bash
# On GPU worker machine
docker compose logs -f

# Should see:
# "Loading base model..."
# "base model ready"
# "[tasks] . transcribe_phoenix_pd_archives_faster"
```

### Can't connect to Redis/PostgreSQL?

```bash
# From GPU worker machine
telnet YOUR_SERVER_IP 6380  # Redis
telnet YOUR_SERVER_IP 5433  # PostgreSQL

# If fails, on main server:
sudo ufw allow 6380/tcp
sudo ufw allow 5433/tcp
```

### GPU not detected?

```bash
# Verify NVIDIA Container Toolkit
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi
```

### Out of memory?

Change model in `docker-compose.yml`:
```yaml
- WHISPER_MODEL=tiny  # Use smallest model
```

## What Happens During Transcription

1. **User clicks "Transcribe" button** → Frontend sends POST to `/api/v1/radio/archives/transcribe`
2. **API creates Celery task** → Routes to `transcription` queue
3. **GPU worker picks up task** → Loads Whisper model on GPU
4. **Processes audio** → ~60 seconds for 30min file (base model)
5. **Saves results** → Creates `.json` and `.txt` files
6. **Frontend updates** → Shows green icon, allows viewing transcript

## File Output

Each transcription creates two files:

**`recording.json`** - Full data with segments:
```json
{
  "filename": "20250907_1757297388_12145.mp3",
  "model": "base",
  "engine": "faster-whisper",
  "text": "Unit 23 responding to...",
  "segments": [
    {"start": 0.0, "end": 3.5, "text": "Unit 23 responding to..."}
  ]
}
```

**`recording.txt`** - Human-readable:
```
Phoenix Police Radio Archive Transcription
============================================================
File: 20250907_1757297388_12145.mp3
Recording Time: 2025-09-07 14:23
Model: base (faster-whisper)
============================================================

TIMESTAMPED TRANSCRIPT:

[00:00 - 00:03] Unit 23 responding to...
[00:04 - 00:08] Copy that, unit 23...
```

## Advanced Configuration

See **SETUP_INSTRUCTIONS.md** for:
- Network share setup
- Model selection guide
- Concurrency tuning
- Anti-hallucination settings explained
- Performance optimization
- Detailed troubleshooting

## Summary

✅ **Everything is ready** - just configure IP address and start the worker
✅ **No code changes needed** - all integration complete
✅ **Web interface ready** - button already functional
✅ **Queue routing configured** - main worker won't interfere
✅ **Optimized for police radio** - anti-hallucination settings tuned

Deploy the GPU worker and start transcribing!
