#!/bin/bash

# Safety wrapper for docker-compose commands
# Prevents accidental data loss

# Check if trying to remove volumes
if [[ "$*" == *"down"* ]] && [[ "$*" == *"-v"* ]]; then
    echo "⚠️  WARNING: You are about to DELETE ALL DATABASE DATA!"
    echo "This will remove the postgres_data volume containing all flight records."
    echo ""
    echo "Type 'DELETE ALL DATA' to proceed or press Ctrl+C to cancel:"
    read -r confirmation

    if [ "$confirmation" != "DELETE ALL DATA" ]; then
        echo "Cancelled."
        exit 1
    fi
fi

# Check if trying to remove or recreate the database container
if [[ "$*" == *"rm"* ]] && [[ "$*" == *"db"* ]]; then
    echo "⚠️  WARNING: Removing database container."
    echo "Make sure the data volume is properly mounted!"
    echo "Press Enter to continue or Ctrl+C to cancel..."
    read -r
fi

# Check current volume status before any operation
if [[ "$*" == *"up"* ]] || [[ "$*" == *"build"* ]]; then
    echo "Checking database volume status..."
    volume_exists=$(docker volume ls -q | grep -c "phx-helicopter-tracker_postgres_data" || true)

    if [ "$volume_exists" -eq 0 ]; then
        echo "⚠️  WARNING: Database volume does not exist. Data will be lost on container removal!"
        echo "Consider restoring from backup after starting."
    else
        echo "✅ Database volume exists"
        # Show volume size
        volume_size=$(docker run --rm -v phx-helicopter-tracker_postgres_data:/data alpine du -sh /data 2>/dev/null | cut -f1 || echo "unknown")
        echo "   Volume size: $volume_size"
    fi
fi

# Run the actual docker-compose command
docker compose "$@"