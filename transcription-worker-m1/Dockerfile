# Multi-platform Dockerfile for M1 Mac
# Uses buildx for arm64 support
FROM --platform=linux/arm64 python:3.11-slim

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DEBIAN_FRONTEND=noninteractive

# Install system dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    git \
    curl \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy requirements
COPY requirements.txt .

# Install Python packages
# Note: MPS is not available in Docker, will use CPU
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    torch==2.1.2 \
    torchaudio==2.1.2 \
    --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Create necessary directories
RUN mkdir -p /data/input /data/output /models /app/logs

# Copy application code
COPY app/ ./app/

# Create non-root user
RUN useradd -m -u 1000 celeryuser && \
    chown -R celeryuser:celeryuser /app /data /models

USER celeryuser

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python3 -c "import redis; r=redis.Redis(host='${REDIS_HOST}', port=${REDIS_PORT}); r.ping()" || exit 1

# Note: Docker containers can't access MPS, will use CPU
ENV DEVICE=cpu

# Default command
CMD ["celery", "-A", "app.celery_worker", "worker", \
     "--loglevel=info", \
     "--concurrency=1", \
     "--queues=transcription", \
     "--hostname=m1-docker@%h", \
     "--max-tasks-per-child=20", \
     "--pool=threads"]