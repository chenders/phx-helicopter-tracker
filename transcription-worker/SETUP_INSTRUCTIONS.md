# GPU Transcription Worker - Quick Setup Guide

## Overview

The transcription worker is a dedicated GPU-powered service that processes police radio recordings using OpenAI Whisper. It runs separately from the main application on a machine with an NVIDIA GPU.

## Current Status

✅ **Backend API**: Transcription endpoint enabled at `/api/v1/radio/archives/transcribe`
✅ **Frontend**: "Transcribe Untranscribed" button ready on Radio page
✅ **Task Routing**: Celery configured to route `transcription` queue to GPU worker
✅ **Main Worker**: Excludes `transcription` queue (prevents conflicts)
✅ **Faster-Whisper**: Optimized anti-hallucination settings for police radio

## Prerequisites

- NVIDIA GPU with CUDA support (tested with CUDA 12.1)
- Docker with NVIDIA Container Toolkit
- Network access to main server's Redis (port 6380) and PostgreSQL (port 5433)

## Quick Start

### 1. Configure Network Access

On your **main server** (where the database and Redis run):

```bash
# Allow GPU worker to connect to Redis and PostgreSQL
sudo ufw allow from <GPU_WORKER_IP> to any port 6380  # Redis
sudo ufw allow from <GPU_WORKER_IP> to any port 5433  # PostgreSQL

# Verify ports are accessible
sudo ufw status
```

### 2. Update Connection Settings

Edit `transcription-worker/docker-compose.yml`:

```yaml
# Line 56-57: Update these with your main server's IP
- REDIS_URL=redis://<MAIN_SERVER_IP>:6380
- DATABASE_URL=postgresql://postgres:postgres@<MAIN_SERVER_IP>:5433/phoenix_helicopters
```

Replace `<MAIN_SERVER_IP>` with your server's IP address (e.g., `192.168.1.47`).

### 3. Sync Backend Code

The GPU worker needs the latest backend code. Copy the backend directory:

```bash
# On main server:
cd /home/phx/phx-helicopter-tracker
tar czf backend.tar.gz backend/

# Transfer to GPU worker machine and extract
# Place in: transcription-worker/backend/
```

### 4. Create Shared Data Directory

The worker needs access to the same audio files as the main server:

**Option A: Network Share (Recommended)**
```bash
# On GPU worker machine:
# Mount the main server's data directory
sudo mount -t cifs //<MAIN_SERVER_IP>/phx-data /app/data \
  -o username=<USER>,password=<PASSWORD>
```

**Option B: Copy Files Periodically**
```bash
# Sync audio files periodically
rsync -avz <USER>@<MAIN_SERVER_IP>:/home/phx/phx-helicopter-tracker/data/radio/phoenix_pd/ \
  ./transcription-worker/data/radio/phoenix_pd/
```

### 5. Start the GPU Worker

```bash
cd transcription-worker
docker compose up -d

# Check logs
docker compose logs -f
```

You should see:
```
Loading base model...
base model ready
[tasks]
  . transcribe_phoenix_pd_archives_faster
```

### 6. Verify Worker Registration

From your **main server**:

```bash
# Check active workers and queues
docker compose exec celery celery -A app.workers.celery_app inspect active_queues

# You should see the GPU worker:
-> gpu-worker@<hostname>: OK
    * {'name': 'transcription', ...}
```

### 7. Test Transcription

1. Open the Radio page: `http://localhost:3000/radio`
2. Click "Transcribe Untranscribed" button
3. Check Flower dashboard: `http://localhost:5555`
4. Look for task in `transcription` queue being processed by GPU worker

## Configuration Options

### Model Size

Edit `docker-compose.yml` to change model (line 64):

```yaml
- WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
```

**Recommendations:**
- `tiny` - Fastest, ~1GB RAM, lower accuracy
- `base` - **Recommended**, ~1GB RAM, good balance
- `small` - Better accuracy, ~2GB RAM
- `medium` - High accuracy, ~5GB RAM
- `large` - Best accuracy, ~10GB RAM, requires powerful GPU

### Concurrency

For multiple transcriptions in parallel, edit Dockerfile (line 42):

```dockerfile
CMD ["celery", "-A", "app.workers.celery_app", "worker", \
     "--queues=transcription", \
     "-n", "gpu-worker", \
     "--loglevel=info", \
     "--concurrency=2"]  # Change from 1 to 2+
```

**Note**: Only increase if you have a powerful GPU (e.g., RTX 3080+)

## Monitoring

### View Worker Status

```bash
# On GPU worker
docker compose logs -f

# Check GPU usage
docker compose exec gpu-transcription-worker nvidia-smi
```

### View Task Queue

Open Flower dashboard on main server: `http://localhost:5555`

- Navigate to "Workers" to see GPU worker
- Check "Tasks" for active transcription tasks
- Monitor task completion time

### Check Transcription Progress

On the Radio page:
- Stats show "X of Y transcribed"
- Transcribed files have green icon
- Files being transcribed show spinner icon

## Troubleshooting

### Worker Not Connecting

**Test network connectivity:**
```bash
# From GPU worker machine
telnet <MAIN_SERVER_IP> 6380  # Redis
telnet <MAIN_SERVER_IP> 5433  # PostgreSQL
```

**Check firewall:**
```bash
# On main server
sudo ufw status
sudo ufw allow 6380/tcp
sudo ufw allow 5433/tcp
```

### GPU Not Detected

```bash
# Verify NVIDIA runtime
docker run --rm --gpus all nvidia/cuda:12.1.0-base-ubuntu22.04 nvidia-smi

# If fails, reinstall NVIDIA Container Toolkit
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker
```

### Out of Memory

Reduce model size in `docker-compose.yml`:
```yaml
- WHISPER_MODEL=tiny  # Smallest model
```

### Task Not Being Picked Up

**Verify queue routing:**
```bash
# Check main worker excludes transcription queue
docker compose exec celery celery -A app.workers.celery_app inspect active_queues

# Should NOT show 'transcription' in main worker
```

**Check GPU worker is listening:**
```bash
# Should show GPU worker with 'transcription' queue
docker compose exec -T celery celery -A app.workers.celery_app inspect active_queues | grep -A2 gpu-worker
```

### File Not Found Errors

Ensure data directory is properly mounted:
```bash
# On GPU worker
docker compose exec gpu-transcription-worker ls -la /app/data/radio/phoenix_pd/
```

Should show `.mp3` files. If empty, check data mounting/syncing.

## Performance Tips

1. **Use SSD**: Store data directory on SSD for faster I/O
2. **Wired Network**: Use Ethernet instead of WiFi for stability
3. **Start Small**: Begin with `base` model, upgrade if needed
4. **Monitor GPU**: Use `nvidia-smi` to check GPU memory usage
5. **Batch Processing**: Let worker process files one at a time (concurrency=1)

## Anti-Hallucination Settings

The task uses these optimized settings for police radio:

```python
condition_on_previous_text=False  # Prevents repetition loops
temperature=(0.0, 0.2, 0.4, 0.6, 0.8, 1.0)  # Fallback strategy
compression_ratio_threshold=1.35  # Aggressive hallucination detection
log_prob_threshold=-1.0  # Triggers fallback on low confidence
```

These settings prevent common Whisper issues with police radio like:
- Infinite repetition of phrases
- Hallucinated content during silence
- Repeated emergency codes

## File Structure

```
transcription-worker/
├── backend/              # Backend code (synced from main server)
├── data/                 # Radio archive files (shared/mounted)
│   └── radio/
│       └── phoenix_pd/   # MP3 files go here
├── docker-compose.yml    # Worker configuration
├── Dockerfile            # GPU container build
└── requirements.txt      # Python dependencies
```

## Output Files

For each `recording.mp3`, the worker creates:

- `recording.json` - Full transcription with metadata
- `recording.txt` - Human-readable transcript with timestamps

Example JSON structure:
```json
{
  "filename": "20250907_1757297388_12145.mp3",
  "recording_time": "2025-09-07T14:23:08",
  "transcribed_at": "2025-10-14T20:15:32",
  "model": "base",
  "engine": "faster-whisper",
  "text": "Full transcript text...",
  "segments": [
    {
      "id": 0,
      "start": 0.0,
      "end": 3.5,
      "text": "Unit 23 responding to..."
    }
  ],
  "metadata": {
    "feed_id": "12145",
    "feed_name": "Phoenix Police",
    "duration": 1800.0,
    "language": "en",
    "language_probability": 0.99
  }
}
```

## Updating

When backend code changes:

```bash
# 1. Copy updated backend from main server
rsync -avz <USER>@<MAIN_SERVER_IP>:/home/phx/phx-helicopter-tracker/backend/ ./backend/

# 2. Rebuild and restart worker
docker compose down
docker compose up -d --build

# 3. Verify worker reconnected
docker compose logs -f
```

## Support

If issues persist:
1. Check logs: `docker compose logs -f`
2. Verify GPU: `nvidia-smi`
3. Test network: `telnet <MAIN_SERVER_IP> 6380`
4. Check Flower: `http://<MAIN_SERVER_IP>:5555`
