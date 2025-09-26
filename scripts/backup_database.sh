#!/bin/bash

# Database backup script for Phoenix Helicopter Tracker
# This script creates a backup of the database and keeps the last 4 weeks of backups

# Configuration
BACKUP_DIR="/home/phx/phx-helicopter-tracker/backups"
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="phx_helicopters_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)"

# Create the backup using docker compose
echo "Creating backup: ${BACKUP_FILE}"
docker compose exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "${BACKUP_DIR}/${BACKUP_FILE}"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Compress the backup
    echo "Compressing backup..."
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"

    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "Backup completed successfully: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"

    # Clean up old backups (keep last 4 weeks = 28 days)
    echo "Cleaning up old backups..."
    find "$BACKUP_DIR" -name "phx_helicopters_backup_*.sql.gz" -mtime +28 -exec rm {} \; -print

    # List current backups
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -5
else
    echo "ERROR: Backup failed!"
    exit 1
fi

echo "Backup process completed at $(date)"