#!/bin/bash
# Setup cron job to import transcriptions from JSON files
# Runs every 6 hours to keep database in sync with filesystem transcriptions

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMPORT_SCRIPT="$SCRIPT_DIR/import_transcriptions_cron.sh"

# Check if script exists
if [ ! -f "$IMPORT_SCRIPT" ]; then
    echo "Error: Import script not found at $IMPORT_SCRIPT"
    exit 1
fi

# Make sure script is executable
chmod +x "$IMPORT_SCRIPT"

# Create cron job entry
# Run every 6 hours to import new transcriptions
CRON_ENTRY="0 */6 * * * $IMPORT_SCRIPT >> /var/log/radio_import.log 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "import_transcriptions_cron.sh"; then
    echo "Cron job already exists. Updating..."
    # Remove old entry and add new one
    (crontab -l 2>/dev/null | grep -v "import_transcriptions_cron.sh"; echo "$CRON_ENTRY") | crontab -
else
    echo "Adding new cron job..."
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
fi

echo "Cron job configured successfully!"
echo "Schedule: Every 6 hours"
echo "Script: $IMPORT_SCRIPT"
echo "Log: /var/log/radio_import.log"
echo ""
echo "Current crontab:"
crontab -l | grep import_transcriptions_cron.sh
