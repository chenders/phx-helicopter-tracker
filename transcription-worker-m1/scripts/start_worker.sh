#!/bin/bash

# Start the Celery transcription worker on M1 Mac
echo "════════════════════════════════════════════════════════════"
echo "   Phoenix PD Transcription Worker (M1 Mac)"
echo "   Using Metal Performance Shaders for GPU Acceleration"
echo "════════════════════════════════════════════════════════════"
echo ""

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Activate virtual environment
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "⚠️  Virtual environment not found. Run ./scripts/setup_m1.sh first"
    exit 1
fi

# Check system info
echo "System Information:"
echo "  Architecture: $(uname -m)"
echo "  macOS Version: $(sw_vers -productVersion)"
echo "  Python: $(python3 --version)"
echo ""

# Check MPS availability
echo "GPU Status:"
python3 -c "
import torch
if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
    print('  ✅ Metal Performance Shaders: Available')
    print('  GPU acceleration will be used for transcription')
else:
    print('  ⚠️  Metal Performance Shaders: Not available')
    print('  Will use CPU for transcription (slower)')
"

echo ""
echo "Configuration:"
echo "  Redis Host: ${REDIS_HOST:-localhost}"
echo "  Redis Port: ${REDIS_PORT:-6379}"
echo "  Worker Name: ${WORKER_NAME:-m1-transcriber-01}"
echo "  Input Path: ${AUDIO_INPUT_PATH:-/Users/Shared/transcription/input}"
echo "  Output Path: ${TRANSCRIPTION_OUTPUT_PATH:-/Users/Shared/transcription/output}"
echo ""

# Check Redis connection
echo "Testing Redis connection..."
python3 -c "
import redis
import os

host = os.getenv('REDIS_HOST', 'localhost')
port = int(os.getenv('REDIS_PORT', '6379'))

try:
    r = redis.Redis(host=host, port=port, db=0, socket_connect_timeout=5)
    r.ping()
    print(f'  ✅ Connected to Redis at {host}:{port}')
except Exception as e:
    print(f'  ❌ Failed to connect to Redis at {host}:{port}')
    print(f'     Error: {e}')
    print('     Please check your .env file and network connection')
    exit(1)
"

if [ $? -ne 0 ]; then
    echo ""
    echo "Failed to connect to Redis. Exiting."
    exit 1
fi

# Create necessary directories
mkdir -p logs
mkdir -p "$AUDIO_INPUT_PATH" 2>/dev/null
mkdir -p "$TRANSCRIPTION_OUTPUT_PATH" 2>/dev/null

echo ""
echo "════════════════════════════════════════════════════════════"
echo "Starting Celery worker..."
echo "The worker will ONLY process tasks from the 'transcription' queue"
echo "Press Ctrl+C to stop"
echo "════════════════════════════════════════════════════════════"
echo ""

# Start the worker with M1-optimized settings
celery -A app.celery_worker worker \
    --loglevel=info \
    --concurrency=${WORKER_CONCURRENCY:-1} \
    --queues=transcription \
    --hostname=${WORKER_NAME:-m1-transcriber-01}@%h \
    --max-tasks-per-child=20 \
    --pool=threads \
    --logfile=logs/celery_%n_%i.log \
    --pidfile=logs/celery_%n.pid