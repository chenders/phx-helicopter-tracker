#!/bin/bash

# Script to restore flight data from backup while preserving current schema

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║                    ⚠️  WARNING - DATA DELETION ⚠️                          ║"
echo "║                                                                            ║"
echo "║  THIS SCRIPT WILL DELETE ALL EXISTING FLIGHT DATA                         ║"
echo "║  INCLUDING: Flight logs, positions, discoveries, and aircraft records     ║"
echo "║                                                                            ║"
echo "║  🗑️  All current data will be PERMANENTLY DELETED                         ║"
echo "║  💾 Data will be restored from the backup file you specify                ║"
echo "║  ⚠️  If restore fails, your data will be LOST                             ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

BACKUP_FILE="$1"
if [ -z "$BACKUP_FILE" ]; then
    echo "❌ ERROR: No backup file specified"
    echo ""
    echo "Usage: $0 <backup_file.sql.gz>"
    echo ""
    echo "Example: $0 /home/phx/phx-helicopter-tracker/backups/phx_helicopters_backup_20251024_020001.sql.gz"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ ERROR: Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo "📁 Backup file: $BACKUP_FILE"
BACKUP_SIZE=$(ls -lh "$BACKUP_FILE" | awk '{print $5}')
echo "📊 Backup size: $BACKUP_SIZE"
echo ""

# Count current data before deletion
echo "Checking current database contents..."
CURRENT_FLIGHTS=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_logs;" 2>/dev/null | tr -d ' ' || echo "0")
CURRENT_POSITIONS=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_positions;" 2>/dev/null | tr -d ' ' || echo "0")
CURRENT_AIRCRAFT=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM aircraft WHERE is_phoenix_pd = true;" 2>/dev/null | tr -d ' ' || echo "0")

echo "📊 CURRENT DATABASE STATUS (WILL BE DELETED):"
echo "   - Flight logs: $CURRENT_FLIGHTS"
echo "   - Flight positions: $CURRENT_POSITIONS"
echo "   - Phoenix PD aircraft: $CURRENT_AIRCRAFT"
echo ""

# MANDATORY CONFIRMATION
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                     ⛔ CONFIRMATION REQUIRED ⛔                              ║"
echo "║                                                                            ║"
echo "║  To proceed with DELETING ALL FLIGHT DATA, you must type:                 ║"
echo "║                                                                            ║"
echo "║          DELETE MY FLIGHT DATA AND RESTORE FROM BACKUP                    ║"
echo "║                                                                            ║"
echo "║  Type it exactly as shown above (case-sensitive)                          ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
read -p "Type confirmation: " CONFIRMATION

if [ "$CONFIRMATION" != "DELETE MY FLIGHT DATA AND RESTORE FROM BACKUP" ]; then
    echo ""
    echo "❌ Confirmation text did not match. Aborting for safety."
    echo "✅ Your database has NOT been modified."
    exit 1
fi

echo ""
echo "⚠️  Last chance to cancel! Press Ctrl+C now to abort."
echo "⚠️  Proceeding in 5 seconds..."
for i in {5..1}; do
    echo "   $i..."
    sleep 1
done

echo ""
echo "Starting restoration process..."

# Create temporary directory for processing
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Extract backup
echo "Extracting backup..."
gunzip -c "$BACKUP_FILE" > "$TEMP_DIR/backup.sql"

# First, clear existing data to avoid conflicts
echo "🗑️  Deleting existing data..."
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