#!/bin/bash

# Hourly backup script for critical flight data tables
# This creates lightweight backups of just the flight-related tables
# Runs every hour to protect expensive FR24 data

# Configuration
BACKUP_DIR="/home/phx/phx-helicopter-tracker/backups/hourly"
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
HOUR=$(date +%H)
BACKUP_FILE="flight_data_${TIMESTAMP}.sql"

# Critical tables to backup
TABLES=(
    "flight_discoveries"
    "flight_logs"
    "flight_positions"
    "aircraft"
)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "[$(date)] Starting hourly flight data backup"

# Create the backup of specific tables
echo "Backing up flight data tables..."
TABLE_ARGS=""
for table in "${TABLES[@]}"; do
    TABLE_ARGS="$TABLE_ARGS -t $table"
done

# Run backup through Docker
docker compose -f /home/phx/phx-helicopter-tracker/docker-compose.yml exec -T db \
    pg_dump -U "$DB_USER" "$DB_NAME" $TABLE_ARGS > "${BACKUP_DIR}/${BACKUP_FILE}" 2>/dev/null

# Check if backup was successful
if [ $? -eq 0 ]; then
    # Get row counts for verification
    FLIGHT_COUNT=$(docker compose -f /home/phx/phx-helicopter-tracker/docker-compose.yml exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_logs" 2>/dev/null | tr -d ' ')
    POSITION_COUNT=$(docker compose -f /home/phx/phx-helicopter-tracker/docker-compose.yml exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_positions" 2>/dev/null | tr -d ' ')

    # Compress the backup
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"

    # Get file size
    BACKUP_SIZE=$(du -h "${BACKUP_DIR}/${BACKUP_FILE}.gz" | cut -f1)

    echo "[$(date)] Backup completed: ${BACKUP_FILE}.gz (${BACKUP_SIZE})"
    echo "  Flights: ${FLIGHT_COUNT}, Positions: ${POSITION_COUNT}"

    # Keep only last 24 hourly backups (1 day worth)
    find "$BACKUP_DIR" -name "flight_data_*.sql.gz" -mmin +1440 -exec rm {} \; 2>/dev/null

    # Create a symlink to latest backup
    ln -sf "${BACKUP_DIR}/${BACKUP_FILE}.gz" "${BACKUP_DIR}/latest_flight_data.sql.gz"
else
    echo "[$(date)] ERROR: Hourly backup failed!"
    # Send alert (could add email/notification here)
    exit 1
fi