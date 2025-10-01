#!/bin/bash

# Database backup script for Phoenix Helicopter Tracker
# This script creates a backup of the database and keeps the last 4 weeks of backups

# Configuration
PROJECT_DIR="/home/phx/phx-helicopter-tracker"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="phx_helicopters_backup_${TIMESTAMP}.sql"
LOG_FILE="${BACKUP_DIR}/backup.log"

# Change to project directory (required for docker compose to find docker-compose.yml)
cd "$PROJECT_DIR" || { echo "ERROR: Cannot change to project directory: $PROJECT_DIR" >> "$LOG_FILE"; exit 1; }

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)" | tee -a "$LOG_FILE"

# Create the backup using docker compose with explicit path
echo "Creating backup: ${BACKUP_FILE}" | tee -a "$LOG_FILE"
docker compose -f "${PROJECT_DIR}/docker-compose.yml" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" > "${BACKUP_DIR}/${BACKUP_FILE}" 2>> "$LOG_FILE"

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Check if backup file has content
    if [ ! -s "${BACKUP_DIR}/${BACKUP_FILE}" ]; then
        echo "ERROR: Backup file is empty!" | tee -a "$LOG_FILE"
        rm -f "${BACKUP_DIR}/${BACKUP_FILE}"
        exit 1
    fi

    # Compress the backup
    echo "Compressing backup..." | tee -a "$LOG_FILE"
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"

    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)
    echo "Backup completed successfully: ${BACKUP_FILE}.gz (${BACKUP_SIZE})" | tee -a "$LOG_FILE"

    # Verify the backup contains expected tables
    echo "Verifying backup integrity..." | tee -a "$LOG_FILE"
    TABLES_COUNT=$(zcat "${BACKUP_DIR}/${BACKUP_FILE}.gz" | grep -c "CREATE TABLE" || true)
    INSERT_COUNT=$(zcat "${BACKUP_DIR}/${BACKUP_FILE}.gz" | grep -c "INSERT INTO" || true)
    echo "  Tables found: ${TABLES_COUNT}" | tee -a "$LOG_FILE"
    echo "  Insert statements: ${INSERT_COUNT}" | tee -a "$LOG_FILE"

    # Clean up old backups (keep last 4 weeks = 28 days)
    echo "Cleaning up old backups..." | tee -a "$LOG_FILE"
    find "$BACKUP_DIR" -name "phx_helicopters_backup_*.sql.gz" -mtime +28 -exec rm {} \; -print | tee -a "$LOG_FILE"

    # List current backups
    echo "Current backups:" | tee -a "$LOG_FILE"
    ls -lh "$BACKUP_DIR"/*.gz 2>/dev/null | tail -5 | tee -a "$LOG_FILE"
else
    echo "ERROR: Backup failed!" | tee -a "$LOG_FILE"
    exit 1
fi

echo "Backup process completed at $(date)" | tee -a "$LOG_FILE"