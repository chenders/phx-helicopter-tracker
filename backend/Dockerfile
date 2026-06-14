FROM python:3.12-slim

# Prevent Python from generating .pyc files and __pycache__ directories
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libpq-dev \
    curl \
    gdal-bin \
    libgdal-dev \
    libgeos-dev \
    libproj-dev \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# openai-whisper==20231117's legacy setup.py imports pkg_resources, which newer
# setuptools no longer provides inside PEP 517 build isolation. Constrain setuptools
# for build environments so its sdist wheel builds. Applies to every pip step below.
RUN echo "setuptools<70" > /etc/pip-build-constraints.txt
ENV PIP_CONSTRAINT=/etc/pip-build-constraints.txt

# Copy requirements file
COPY requirements.txt .

# Install all Python dependencies with pip
RUN pip install --no-cache-dir -r requirements.txt

# Install OpenAI Whisper with CPU-only torch
# First uninstall any GPU torch that might have been installed
RUN pip uninstall -y torch torchvision torchaudio && \
    pip install --no-cache-dir torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir openai-whisper==20231117

# Verify whisper and celery are installed correctly
RUN python -c "import whisper; print(f'Whisper version: {whisper.__version__}')" && \
    python -c "import celery; print(f'Celery version: {celery.__version__}')"

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p /app/data

# Ensure the app module is in Python path
ENV PYTHONPATH=/app:$PYTHONPATH

# Expose port
EXPOSE 9000

# Default command (overridden by docker compose)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "9000"]
