#!/bin/bash
# Import JSON transcription files into database
# Runs periodically via cron to sync filesystem transcriptions with database

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Trigger import task via Celery
# Process up to 100 files per run
docker compose exec -T backend python3 -c "
from app.workers.radio_import_tasks import import_transcriptions_from_json
from app.workers.celery_app import celery_app

# Trigger import task
task = import_transcriptions_from_json.apply_async(
    kwargs={'batch_size': 100}
)

print(f'Import task triggered: {task.id}')
print('Task will process up to 100 JSON files')
"

echo "Import task triggered successfully at $(date)"
