#!/bin/bash

# Start Celery worker WITHOUT transcription queue
# Transcription tasks are handled by dedicated GPU workers on other machines

echo "=========================================="
echo "Starting Celery Worker (No Transcription)"
echo "=========================================="
echo ""
echo "This worker processes these queues:"
echo "  ✓ celery (default queue)"
echo "  ✓ tracking (flight tracking)"
echo "  ✓ analysis (pattern analysis)"
echo "  ✓ legal (legal document generation)"
echo "  ✓ data_import (data imports)"
echo "  ✓ radio (radio archive downloads)"
echo "  ✓ scheduler (scheduled tasks)"
echo ""
echo "This worker does NOT process:"
echo "  ✗ transcription (handled by GPU workers)"
echo ""
echo "=========================================="

# Start worker with explicit queue list (excluding transcription)
celery -A app.workers.celery_app worker \
    --loglevel=info \
    --concurrency=2 \
    --queues=celery,tracking,analysis,legal,data_import,radio,scheduler \
    --hostname=main-worker@%h \
    --max-tasks-per-child=1000

# Note: The --queues parameter explicitly lists which queues this worker will consume from.
# The 'transcription' queue is deliberately excluded.