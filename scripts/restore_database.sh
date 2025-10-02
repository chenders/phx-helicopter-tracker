#!/bin/bash

# Emergency database restoration script
set -e

echo "Starting emergency database restoration..."

# Find the latest backup
LATEST_BACKUP=$(ls -t /home/phx/phx-helicopter-tracker/backups/*.sql.gz | head -1)
echo "Found latest backup: $LATEST_BACKUP"

# Stop all services
echo "Stopping services..."
docker compose down

# Remove the corrupted volume
echo "Removing corrupted volume..."
docker volume rm phx-helicopter-tracker_postgres_data || true

# Start only the database
echo "Starting database..."
docker compose up -d db

# Wait for database to be ready
echo "Waiting for database to initialize..."
sleep 20

# Check if database is ready
until docker compose exec db psql -U postgres -c "SELECT 1;" &> /dev/null
do
  echo "Waiting for database..."
  sleep 5
done

echo "Database is ready!"

# Restore from backup
echo "Restoring from backup: $LATEST_BACKUP"
gunzip -c "$LATEST_BACKUP" | docker compose exec -T db psql -U postgres phoenix_helicopters

# Verify restoration
echo "Verifying restoration..."
FLIGHT_COUNT=$(docker compose exec db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_logs;")
POSITION_COUNT=$(docker compose exec db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_positions;")

echo "Restoration complete!"
echo "Flights restored: $FLIGHT_COUNT"
echo "Positions restored: $POSITION_COUNT"

# Start all services
echo "Starting all services..."
docker compose up -d

echo "All services started. Database restoration complete!"