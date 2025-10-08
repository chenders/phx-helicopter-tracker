# Quick Start Guide - GPU Transcription Worker

## Transfer to Windows Machine

### 1. Create a Zip File (On Linux Server)

```bash
cd /home/phx/phx-helicopter-tracker
zip -r transcription-worker.zip transcription-worker/
```

Then download `transcription-worker.zip` to your Windows machine.

### 2. Extract on Windows

Extract the zip file to a location like:
```
C:\transcription-worker\
```

## Prerequisites on Windows

### Install Docker Desktop

1. Download: https://www.docker.com/products/docker-desktop/
2. Install with WSL2 backend
3. Restart computer

### Install NVIDIA Container Toolkit

Open PowerShell as Administrator:

```powershell
# Install WSL2
wsl --install
wsl --update

# Restart computer, then continue in WSL2 Ubuntu
wsl

# Inside WSL2, install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -fsSL https://nvidia.github.io/libnvidia-container/gpgkey | sudo gpg --dearmor -o /usr/share/keyrings/nvidia-container-toolkit-keyring.gpg
curl -s -L https://nvidia.github.io/libnvidia-container/$distribution/libnvidia-container.list | sed 's#deb https://#deb [signed-by=/usr/share/keyrings/nvidia-container-toolkit-keyring.gpg] https://#g' | sudo tee /etc/apt/sources.list.d/nvidia-container-toolkit.list
sudo apt-get update
sudo apt-get install -y nvidia-container-toolkit
sudo nvidia-ctk runtime configure --runtime=docker
sudo systemctl restart docker
```

### Verify GPU Access

```powershell
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi
```

You should see your GPU listed!

## Start the Worker

### Option 1: Using PowerShell Script (Easiest)

Open PowerShell in the `transcription-worker` directory:

```powershell
.\start.ps1
```

### Option 2: Using Docker Compose

```powershell
docker-compose up -d
```

## Verify It's Working

### Check Logs

```powershell
docker-compose logs -f
```

You should see:
```
gpu-transcription-worker | Loading base model...
gpu-transcription-worker | base model ready
gpu-transcription-worker | Connected to redis://192.168.1.47:6380
```

### Check from Main Server

On your Linux server (192.168.1.47):

```bash
docker compose exec celery celery -A app.workers.celery_app inspect active_queues
```

Look for:
```
->  gpu-worker@<hostname>: OK
    * {'name': 'transcription', ...}
```

### View in Flower

Open in browser: http://192.168.1.47:5555

You should see 2 workers:
- `celery@<hostname>` - Main worker
- `gpu-worker@<hostname>` - GPU transcription worker ✅

## Common Issues

### "GPU not accessible"
- Install NVIDIA Container Toolkit (see above)
- Update NVIDIA drivers
- Restart Docker Desktop

### "Cannot connect to Redis"
- Check IP address in `docker-compose.yml`
- Test connection: `Test-NetConnection 192.168.1.47 -Port 6380`
- Check firewall on Linux server

### "Out of memory"
Edit `docker-compose.yml` and change:
```yaml
- WHISPER_MODEL=tiny  # Smallest model
```

## Stopping the Worker

```powershell
docker-compose down
```

## Need Help?

See the full `README.md` for detailed troubleshooting and configuration options.
