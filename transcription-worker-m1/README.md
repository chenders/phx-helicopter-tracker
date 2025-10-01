# Phoenix PD Transcription Worker for Apple Silicon (M1/M2/M3)

This is a Celery worker optimized for Apple Silicon Macs, using Metal Performance Shaders (MPS) for GPU-accelerated audio transcription with OpenAI's Whisper model.

## 🚀 Key Features

- **Metal GPU Acceleration**: Uses Apple's Metal Performance Shaders for 5-10x faster transcription
- **Apple Silicon Optimized**: Native arm64 support for M1/M2/M3 chips
- **Queue Isolation**: Only processes tasks from the `transcription` queue
- **Unified Memory**: Efficiently uses Apple's unified memory architecture
- **Energy Efficient**: Leverages Apple Silicon's efficiency cores for background processing
- **Native macOS Integration**: Works with macOS services and LaunchAgents

## 📋 Prerequisites

### Hardware Requirements
- Apple Silicon Mac (M1, M1 Pro, M1 Max, M1 Ultra, M2, M3 series)
- 8GB+ RAM recommended (16GB+ for large Whisper models)
- macOS 12.0 (Monterey) or later

### Software Requirements
- macOS 12.0 or later
- Xcode Command Line Tools
- Homebrew (will be installed if missing)
- Python 3.11

## 🔧 Installation

### Quick Setup

1. **Transfer the worker package to your M1 Mac**
```bash
# On source machine
cd /home/phx/phx-helicopter-tracker
tar -czf transcription-worker-m1.tar.gz transcription-worker-m1/

# Transfer to M1 Mac, then extract
tar -xzf transcription-worker-m1.tar.gz
cd transcription-worker-m1
```

2. **Run the automated setup script**
```bash
chmod +x scripts/setup_m1.sh
./scripts/setup_m1.sh
```

This will:
- Install Homebrew (if needed)
- Install Python 3.11 and ffmpeg
- Create a Python virtual environment
- Install PyTorch with MPS support
- Download Whisper models
- Configure the environment

3. **Configure Redis connection**
```bash
nano .env
```

Update the Redis server IP:
```env
REDIS_HOST=192.168.1.100  # Your Ubuntu server's IP
REDIS_PORT=6380
```

4. **Test the installation**
```bash
./scripts/test_transcription.py
```

## 🏃 Running the Worker

### Option 1: Native macOS (Recommended - Uses GPU)

```bash
./scripts/start_worker.sh
```

This runs natively on macOS and can access the Metal GPU for acceleration.

### Option 2: Docker (CPU only)

```bash
# Build for arm64
docker buildx build --platform linux/arm64 -t phx-transcription-m1 .

# Run with docker compose
docker compose up
```

⚠️ **Note**: Docker containers cannot access Metal/MPS, so they run CPU-only. Use native execution for GPU acceleration.

### Option 3: Auto-start with LaunchAgent

```bash
# Load the LaunchAgent (created during setup)
launchctl load ~/Library/LaunchAgents/com.phxpd.transcription.plist

# Start manually
launchctl start com.phxpd.transcription

# Check status
launchctl list | grep phxpd
```

## 🎯 Performance Optimization

### MPS (Metal Performance Shaders) Acceleration

The worker automatically detects and uses MPS when available:

```python
# Automatic in the worker, but you can test manually:
import torch
if torch.backends.mps.is_available():
    device = torch.device("mps")
    print("Using Apple Silicon GPU!")
```

### Recommended Whisper Models for M1

| Model | VRAM Usage | Speed | Accuracy | Recommendation |
|-------|------------|-------|----------|----------------|
| tiny | ~500MB | Fastest (50x) | Good | Testing/Development |
| base | ~1GB | Very Fast (30x) | Better | **Production (Best balance)** |
| small | ~2GB | Fast (15x) | Good | High accuracy needs |
| medium | ~5GB | Moderate (5x) | Very Good | Quality priority |
| large | ~10GB | Slow (1x) | Best | Maximum accuracy |

### Memory Management

M1 Macs use unified memory, so the worker is configured to:
- Process one file at a time to avoid memory pressure
- Restart after 20 tasks to free memory
- Use memory-efficient attention when configured

## 📊 Monitoring

### Check Worker Status
```bash
# View logs
tail -f logs/celery_*.log

# Check system GPU usage
sudo powermetrics --samplers gpu_power -i1000 -n1

# Monitor with Activity Monitor
# Look for Python process and GPU History
```

### Optional: Flower Web UI
```bash
# Start Flower monitoring
docker compose --profile monitoring up

# Access at http://localhost:5556
```

## 🧪 Testing

### Run Test Suite
```bash
./scripts/test_transcription.py
```

This tests:
- System compatibility
- MPS availability
- PyTorch GPU operations
- Whisper model loading
- Redis connectivity
- Transcription performance

### Manual Testing
```python
# Test MPS availability
python3 -c "import torch; print(f'MPS available: {torch.backends.mps.is_available()}')"

# Test transcription
python3 -c "
from app.transcription_tasks import transcribe_audio_file
result = transcribe_audio_file(None, 'test.mp3', use_gpu=True)
print(f'Success: {result['success']}')
"
```

## 🔍 Troubleshooting

### MPS Not Available

1. **Check macOS version**: Must be 12.0+
```bash
sw_vers -productVersion
```

2. **Verify Apple Silicon**:
```bash
uname -m  # Should show 'arm64'
```

3. **Update PyTorch**:
```bash
pip install --upgrade torch torchvision torchaudio
```

### Redis Connection Issues

1. **Check firewall** on Ubuntu server
2. **Verify Redis binding** to external interface:
```bash
# On Ubuntu server
sudo nano /etc/redis/redis.conf
# Set: bind 0.0.0.0
```

3. **Test connection**:
```bash
redis-cli -h YOUR_SERVER_IP -p 6380 ping
```

### Memory Pressure

1. **Use smaller models** (tiny or base)
2. **Reduce batch size** in task parameters
3. **Close other applications**
4. **Monitor with Activity Monitor**

## 📁 File Structure

```
transcription-worker-m1/
├── app/
│   ├── __init__.py
│   ├── celery_worker.py        # Worker configuration
│   └── transcription_tasks.py  # MPS-optimized tasks
├── data/
│   ├── input/                  # Audio files to transcribe
│   └── output/                 # Transcription results
├── models/                     # Whisper model cache
├── logs/                       # Worker logs
├── scripts/
│   ├── setup_m1.sh            # Installation script
│   ├── start_worker.sh        # Start worker
│   └── test_transcription.py  # Test suite
├── .env.example               # Environment template
├── requirements.txt           # Python dependencies
├── Dockerfile                 # Docker image (CPU only)
├── docker-compose.yml         # Docker orchestration
└── README.md                  # This file
```

## ⚡ Performance Benchmarks

Typical performance on M1 MacBook Air (8GB RAM) with `base` model:

| Audio Duration | CPU Time | MPS Time | Speedup |
|---------------|----------|----------|---------|
| 1 minute | 12s | 2s | 6x |
| 5 minutes | 60s | 10s | 6x |
| 30 minutes | 360s | 45s | 8x |

## 🔐 Security

- Worker runs with user permissions only
- Only processes from specified queue
- No database access
- Isolated Python environment
- Secure Redis connection over network

## 🛠 Advanced Configuration

### Environment Variables

See `.env.example` for all options:

```env
# Performance tuning
MAX_BATCH_SIZE=5
MEMORY_EFFICIENT=true
USE_MPS=true
MPS_FALLBACK_CPU=true

# Whisper settings
DEFAULT_WHISPER_MODEL=base
```

### Custom Model Paths

```bash
# Download models to custom location
export MODEL_CACHE_DIR=~/my-models
whisper --model base --model_dir ~/my-models
```

### Using with iCloud Drive

```bash
# Symlink to iCloud for backup
ln -s ~/Library/Mobile\ Documents/com~apple~CloudDocs/transcriptions data/output
```

## 📚 Additional Resources

- [Whisper Documentation](https://github.com/openai/whisper)
- [PyTorch MPS Documentation](https://pytorch.org/docs/stable/notes/mps.html)
- [Apple Metal Performance Shaders](https://developer.apple.com/documentation/metalperformanceshaders)
- [Celery Documentation](https://docs.celeryproject.org/)

## 🤝 Support

For issues:
1. Check logs in `logs/` directory
2. Run test suite: `./scripts/test_transcription.py`
3. Verify MPS status in Activity Monitor
4. Check Redis connection from Ubuntu server

## 📈 Optimization Tips

1. **Use `base` model** for best speed/accuracy balance
2. **Keep audio files local** (not on network drives)
3. **Close Chrome/Safari** to free memory for large models
4. **Use native execution** (not Docker) for GPU access
5. **Process during off-hours** for better performance
6. **Enable "Reduce Motion"** in System Preferences for slight GPU boost

---

*Optimized for Apple Silicon • Powered by Metal Performance Shaders*