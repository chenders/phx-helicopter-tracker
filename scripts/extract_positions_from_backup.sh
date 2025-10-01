#!/bin/bash

# Script to extract and restore flight positions from backup
# Handles schema mismatch by removing the 'location' PostGIS column

BACKUP_FILE="/home/phx/phx-helicopter-tracker/backups/phx_helicopters_backup_20250925_194723.sql.gz"
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Extracting flight positions from backup..."
echo "This may take a while due to the large data size..."

# Extract just the flight_positions COPY command and data
gunzip -c "$BACKUP_FILE" | \
    sed -n '/COPY public\.flight_positions/,/^\\\.$/p' > "$TEMP_DIR/positions_raw.sql"

# Count the records
RECORD_COUNT=$(grep -c "^[0-9]" "$TEMP_DIR/positions_raw.sql")
echo "Found $RECORD_COUNT position records to restore"

# Remove the 'location' column from the COPY command and data
# The location column is the last one, so we can remove it easily
echo "Processing positions data (removing PostGIS location column)..."

# First, fix the COPY header to remove 'location'
sed -i 's/, location)/)/g' "$TEMP_DIR/positions_raw.sql"

# Then remove the last tab-delimited field (the PostGIS data) from each data row
# PostGIS data starts with "0101000020E610"
sed -i 's/\t0101000020E610[^\t]*$//g' "$TEMP_DIR/positions_raw.sql"

echo "Clearing existing positions data..."
docker compose exec -T db psql -U postgres phoenix_helicopters <<EOF
DELETE FROM flight_positions;
EOF

echo "Importing cleaned positions data..."
docker compose exec -T db psql -U postgres phoenix_helicopters < "$TEMP_DIR/positions_raw.sql"

# Verify the import
echo ""
echo "Import complete. Verifying..."
docker compose exec -T db psql -U postgres phoenix_helicopters <<EOF
SELECT
    COUNT(DISTINCT flight_log_id) as flights_with_positions,
    COUNT(*) as total_positions,
    MIN(timestamp) as earliest_position,
    MAX(timestamp) as latest_position
FROM flight_positions;
EOF

echo "Done!"