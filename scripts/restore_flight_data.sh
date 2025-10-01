#!/bin/bash

# Script to restore flight data from backup while preserving current schema

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file.sql.gz>"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "Restoring flight data from $BACKUP_FILE..."

# Create temporary directory for processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo "Extracting backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/backup.sql"

# First, clear existing data to avoid conflicts
echo "Clearing existing data..."
docker compose exec -T db psql -U postgres phoenix_helicopters <<EOF
-- Disable foreign key checks temporarily
SET session_replication_role = 'replica';

-- Clear data in reverse dependency order
DELETE FROM flight_positions;
DELETE FROM abnormal_patterns;
DELETE FROM flight_logs;
DELETE FROM flight_discoveries;
DELETE FROM aircraft WHERE is_phoenix_pd = true;

-- Re-enable foreign key checks
SET session_replication_role = 'origin';
EOF

# Extract and restore aircraft data
echo "Restoring aircraft data..."
sed -n '/COPY public.aircraft/,/\\\.$/p' "$TEMP_DIR/backup.sql" | \
    docker compose exec -T db psql -U postgres phoenix_helicopters

# Extract and restore flight_logs data
echo "Restoring flight_logs data..."
sed -n '/COPY public.flight_logs/,/\\\.$/p' "$TEMP_DIR/backup.sql" | \
    docker compose exec -T db psql -U postgres phoenix_helicopters

# Extract and restore flight_discoveries data
echo "Restoring flight_discoveries data..."
sed -n '/COPY public.flight_discoveries/,/\\\.$/p' "$TEMP_DIR/backup.sql" | \
    docker compose exec -T db psql -U postgres phoenix_helicopters

# Extract and restore flight_positions data (may be large)
echo "Restoring flight_positions data (this may take a while)..."
sed -n '/COPY public.flight_positions/,/\\\.$/p' "$TEMP_DIR/backup.sql" | \
    docker compose exec -T db psql -U postgres phoenix_helicopters

# Update sequences
echo "Updating sequences..."
docker compose exec -T db psql -U postgres phoenix_helicopters <<EOF
-- Reset sequences to max values
SELECT setval('aircraft_id_seq', COALESCE((SELECT MAX(id) FROM aircraft), 1));
SELECT setval('flight_logs_id_seq', COALESCE((SELECT MAX(id) FROM flight_logs), 1));
SELECT setval('flight_discoveries_id_seq', COALESCE((SELECT MAX(id) FROM flight_discoveries), 1));
SELECT setval('flight_positions_id_seq', COALESCE((SELECT MAX(id) FROM flight_positions), 1));
EOF

# Show summary
echo ""
echo "Restoration complete. Summary:"
docker compose exec -T db psql -U postgres phoenix_helicopters <<EOF
SELECT
    (SELECT COUNT(*) FROM aircraft WHERE is_phoenix_pd = true) as phoenix_aircraft,
    (SELECT COUNT(*) FROM flight_logs) as flight_logs,
    (SELECT COUNT(*) FROM flight_discoveries) as flight_discoveries,
    (SELECT COUNT(*) FROM flight_positions) as flight_positions;
EOF

echo "Done!"