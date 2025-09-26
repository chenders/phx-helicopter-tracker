#!/bin/bash

# Setup weekly database backup cron job
# Runs every Sunday at 2 AM

SCRIPT_PATH="/home/phx/phx-helicopter-tracker/scripts/backup_database.sh"
CRON_JOB="0 2 * * 0 $SCRIPT_PATH >> /home/phx/phx-helicopter-tracker/backups/backup.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "backup_database.sh"; then
    echo "Backup cron job already exists"
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -
    echo "Weekly backup cron job added: Every Sunday at 2 AM"
    echo "Cron job: $CRON_JOB"
fi

# Display current crontab
echo "Current cron jobs:"
crontab -l 2>/dev/null | grep backup_database

echo ""
echo "To run a backup now, execute:"
echo "  $SCRIPT_PATH"