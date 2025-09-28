#!/bin/bash

# Script to set up automated backup cron jobs
# Run this to configure all backup schedules

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}Setting up automated backup schedules...${NC}"

# Backup current crontab
crontab -l > /tmp/current_cron.txt 2>/dev/null || touch /tmp/current_cron.txt

# Remove old backup entries to avoid duplicates
grep -v "phx-helicopter-tracker.*backup" /tmp/current_cron.txt > /tmp/new_cron.txt

# Add new backup schedules
cat >> /tmp/new_cron.txt << 'EOF'

# Phoenix Helicopter Tracker - Automated Backups
# ================================================

# HOURLY: Backup flight data (critical tables only)
0 * * * * /home/phx/phx-helicopter-tracker/backend/scripts/backup_flight_data_hourly.sh >> /home/phx/phx-helicopter-tracker/backups/hourly.log 2>&1

# DAILY: Full database backup at 2 AM
0 2 * * * /home/phx/phx-helicopter-tracker/scripts/backup_database.sh >> /home/phx/phx-helicopter-tracker/backups/backup.log 2>&1

# DAILY: Data integrity verification at 3 AM
0 3 * * * cd /home/phx/phx-helicopter-tracker/backend && /usr/bin/python3 scripts/verify_flight_data.py >> /home/phx/phx-helicopter-tracker/backups/verification.log 2>&1

# WEEKLY: Extended backup on Sunday at 2 AM (kept by existing script)
0 2 * * 0 /home/phx/phx-helicopter-tracker/scripts/backup_database.sh >> /home/phx/phx-helicopter-tracker/backups/backup.log 2>&1

EOF

# Install new crontab
crontab /tmp/new_cron.txt

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Cron jobs successfully configured${NC}"
    echo ""
    echo "Configured schedules:"
    echo "  • Hourly: Flight data backup (every hour at :00)"
    echo "  • Daily: Full database backup (2:00 AM)"
    echo "  • Daily: Data integrity check (3:00 AM)"
    echo "  • Weekly: Extended backup (Sunday 2:00 AM)"
    echo ""
    echo "Current cron jobs:"
    crontab -l | grep "phx-helicopter-tracker.*backup\|verify"
else
    echo -e "${RED}✗ Failed to configure cron jobs${NC}"
    exit 1
fi

# Clean up
rm -f /tmp/current_cron.txt /tmp/new_cron.txt

echo -e "${GREEN}✓ Backup automation complete${NC}"