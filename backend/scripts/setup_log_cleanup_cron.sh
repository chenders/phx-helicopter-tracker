#!/bin/bash

# Script to set up automated log cleanup via cron
# Runs daily at 3 AM

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
CLEANUP_SCRIPT="$SCRIPT_DIR/cleanup_logs.py"

# Check if cleanup script exists
if [ ! -f "$CLEANUP_SCRIPT" ]; then
    echo "Error: Cleanup script not found at $CLEANUP_SCRIPT"
    exit 1
fi

# Create cron job for daily log cleanup at 3 AM
# Keeps 30 days of logs, compresses after 7 days, archives after 90 days
CRON_JOB="0 3 * * * cd /app && python $CLEANUP_SCRIPT --retention-days 30 --compress-age 7 --archive-age 90 >> /app/logs/cleanup.log 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -q "$CLEANUP_SCRIPT") && {
    echo "Log cleanup cron job already exists"
    exit 0
}

# Add the cron job
(crontab -l 2>/dev/null; echo "$CRON_JOB") | crontab -

echo "Log cleanup cron job added successfully"
echo "Will run daily at 3 AM with the following settings:"
echo "  - Retention: 30 days"
echo "  - Compress after: 7 days"
echo "  - Archive after: 90 days"
echo ""
echo "To view current cron jobs: crontab -l"
echo "To remove the cron job: crontab -e (and delete the line)"
echo ""
echo "You can also run the cleanup manually:"
echo "  $CLEANUP_SCRIPT --help"