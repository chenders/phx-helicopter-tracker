# GPU Transcription Worker for Phoenix PD Radio

This Docker container runs a Celery worker that processes radio transcription tasks using OpenAI Whisper with NVIDIA GPU acceleration.

## Prerequisites

### On Windows 10/11:
1. **NVIDIA GPU** with CUDA support
2. **NVIDIA Driver** (latest version)
3. **Docker Desktop** installed
4. **NVIDIA Container Toolkit** for Docker

### Install NVIDIA Container Toolkit on Windows:

1. **Install Docker Desktop:**
   - Download from https://www.docker.com/products/docker-desktop/
   - Enable WSL2 backend during installation

2. **Install NVIDIA Container Toolkit:**
   - Open PowerShell as Administrator
   - Run:
     ```powershell
     wsl --install
     wsl --update
     ```
   - Inside WSL2 Ubuntu:
     ```bash
     distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
     curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
     curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | \
       sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | \
       sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
     sudo apt-get update
     sudo apt-get install -y nvidia-container-toolkit
     sudo nvidia-ctk runtime configure --runtime=docker
     sudo systemctl restart docker
     ```

3. **Verify GPU Access:**
   ```bash
   docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
   ```

## Setup Instructions

### 1. Copy Files to Windows Machine

Transfer this entire `transcription-worker` directory to your Windows machine.

### 2. Configure Connection

Edit `docker-compose.yml` and update these values:

```yaml
# Change 192.168.1.47 to your Linux server's IP address
- REDIS_URL=redis://192.168.1.47:6380
- DATABASE_URL=postgresql://postgres:postgres@192.168.1.47:5433/phoenix_helicopters
```

### 3. Copy Backend Code

Copy the `backend` directory from your main server into the `transcription-worker` directory:

```
transcription-worker/
├── backend/           ← Copy entire backend directory here
│   ├── app/
│   │   ├── workers/
│   │   ├── models/
│   │   └── ...
│   └── requirements.txt
├── docker-compose.yml
├── Dockerfile
└── README.md
```

You can do this by:
- Copying files via network share
- Using WinSCP or similar tool
- Creating a zip file and transferring

### 4. Start the Worker

Open PowerShell in the `transcription-worker` directory and run:

```powershell
docker-compose up -d
```

### 5. Check Logs

```powershell
docker-compose logs -f
```

You should see:
```
gpu-transcription-worker | Loading base model...
gpu-transcription-worker | base model ready
gpu-transcription-worker | [tasks]
gpu-transcription-worker |   . transcribe_radio_archives
```

## Configuration Options

### Change Whisper Model Size

Edit `docker-compose.yml`:

```yaml
- WHISPER_MODEL=base  # Options: tiny, base, small, medium, large
```

**Model Sizes:**
- `tiny` - 39M params, ~1GB RAM, fastest but least accurate
- `base` - 74M params, ~1GB RAM, **recommended for most users**
- `small` - 244M params, ~2GB RAM, better accuracy
- `medium` - 769M params, ~5GB RAM, high accuracy
- `large` - 1550M params, ~10GB RAM, best accuracy (requires powerful GPU)

### Adjust Concurrency

For multiple transcriptions in parallel (if you have a powerful GPU):

```yaml
CMD ["celery", "-A", "app.workers.celery_app", "worker", \
     "--queues=transcription", \
     "-n", "gpu-worker", \
     "--loglevel=info", \
     "--concurrency=2"]  # Change from 1 to 2 or more
```

## Monitoring

### Check Worker Status

From your main server (192.168.1.47):

```bash
docker compose exec celery celery -A app.workers.celery_app inspect active_queues
```

You should see:
```
->  gpu-worker@<hostname>: OK
    * {'name': 'transcription', ...}
```

### View in Flower

Open http://192.168.1.47:5555 in your browser to see the GPU worker status.

## Troubleshooting

### GPU Not Detected

```powershell
# Check if GPU is visible
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

### Worker Not Connecting

1. **Check network connectivity:**
   ```powershell
   Test-NetConnection -ComputerName 192.168.1.47 -Port 6380
   Test-NetConnection -ComputerName 192.168.1.47 -Port 5433
   ```

2. **Check firewall rules** on the Linux server:
   ```bash
   sudo ufw allow 6380/tcp  # Redis
   sudo ufw allow 5433/tcp  # PostgreSQL
   ```

### Out of Memory Errors

Reduce the model size in `docker-compose.yml`:
```yaml
- WHISPER_MODEL=tiny  # Use smallest model
```

### Container Crashes

Check logs:
```powershell
docker-compose logs
```

Restart:
```powershell
docker-compose restart
```

## Commands Reference

```powershell
# Start worker
docker-compose up -d

# Stop worker
docker-compose down

# Restart worker
docker-compose restart

# View logs
docker-compose logs -f

# Rebuild after changes
docker-compose up -d --build

# Check status
docker-compose ps
```

## File Structure

```
transcription-worker/
├── backend/              # Backend code (copied from main server)
├── data/                 # Radio archive files (auto-created)
├── logs/                 # Worker logs (auto-created)
├── docker-compose.yml    # Docker Compose configuration
├── Dockerfile            # Container build instructions
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Performance Tips

1. **SSD Storage:** Use SSD for the `data` directory for faster file I/O
2. **GPU Memory:** Monitor GPU usage with `nvidia-smi` in the container
3. **Network:** Use wired Ethernet instead of WiFi for better stability
4. **Model Size:** Start with `base` model, upgrade if accuracy is insufficient

## Stopping the Worker

```powershell
docker-compose down
```

## Updating

When the backend code changes on the main server:

1. Copy the updated `backend` directory
2. Rebuild the container:
   ```powershell
   docker-compose up -d --build
   ```

## Support

If you encounter issues:
1. Check logs: `docker-compose logs -f`
2. Verify GPU: `nvidia-smi`
3. Test network: `Test-NetConnection 192.168.1.47 -Port 6380`
4. Check Flower dashboard: http://192.168.1.47:5555
