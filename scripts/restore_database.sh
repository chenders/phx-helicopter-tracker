#!/bin/bash

# Emergency database restoration script
set -e

echo ""
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                            ║"
echo "║                    ⚠️  WARNING - DESTRUCTIVE OPERATION ⚠️                  ║"
echo "║                                                                            ║"
echo "║  THIS SCRIPT WILL PERMANENTLY DELETE YOUR ENTIRE DATABASE VOLUME          ║"
echo "║  INCLUDING ALL FLIGHT DATA, POSITION RECORDS, AND AIRCRAFT INFORMATION    ║"
echo "║                                                                            ║"
echo "║  📊 Current database will be COMPLETELY WIPED OUT                         ║"
echo "║  🗑️  Docker volume 'postgres_data' will be DELETED                        ║"
echo "║  💾 System will attempt restore from backup (may fail)                    ║"
echo "║                                                                            ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""

# Find the latest backup
LATEST_BACKUP=$(ls -t /home/phx/phx-helicopter-tracker/backups/*.sql.gz | head -1)
echo "Latest backup found: $LATEST_BACKUP"
BACKUP_SIZE=$(ls -lh "$LATEST_BACKUP" | awk '{print $5}')
echo "Backup size: $BACKUP_SIZE"
echo ""

# Count current data before deletion
echo "Checking current database contents..."
CURRENT_FLIGHTS=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_logs;" 2>/dev/null | tr -d ' ' || echo "0")
CURRENT_POSITIONS=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_positions;" 2>/dev/null | tr -d ' ' || echo "0")

echo "📊 CURRENT DATABASE STATUS (WILL BE DELETED):"
echo "   - Flight logs: $CURRENT_FLIGHTS"
echo "   - Flight positions: $CURRENT_POSITIONS"
echo ""

# MANDATORY CONFIRMATION
echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                     ⛔ CONFIRMATION REQUIRED ⛔                              ║"
echo "║                                                                            ║"
echo "║  To proceed with DELETING THE ENTIRE DATABASE, you must type:             ║"
echo "║                                                                            ║"
echo "║          I UNDERSTAND THIS WILL DELETE ALL FLIGHT DATA                    ║"
echo "║                                                                            ║"
echo "║  Type it exactly as shown above (case-sensitive)                          ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
read -p "Type confirmation: " CONFIRMATION

if [ "$CONFIRMATION" != "I UNDERSTAND THIS WILL DELETE ALL FLIGHT DATA" ]; then
    echo ""
    echo "❌ Confirmation text did not match. Aborting for safety."
    echo "✅ Your database has NOT been modified."
    exit 1
fi

echo ""
echo "⚠️  Last chance to cancel! Press Ctrl+C now to abort."
echo "⚠️  Proceeding in 10 seconds..."
for i in {10..1}; do
    echo "   $i..."
    sleep 1
done

echo ""
echo "🗑️  DELETING DATABASE..."

# Stop all services
echo "Stopping services..."
docker compose down

# Remove the corrupted volume
echo "Removing postgres volume..."
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