#!/bin/bash

# Backup monitoring and alerting script
# Checks backup health and sends alerts if issues are detected

# Configuration
PROJECT_DIR="/home/phx/phx-helicopter-tracker"
BACKUP_DIR="${PROJECT_DIR}/backups"
HOURLY_DIR="${BACKUP_DIR}/hourly"
MONITORING_LOG="${BACKUP_DIR}/monitoring.log"
ALERT_FILE="${BACKUP_DIR}/BACKUP_ALERT.txt"

# Thresholds
MAX_AGE_HOURS=26  # Daily backups should be less than 26 hours old
MAX_HOURLY_AGE_MINUTES=70  # Hourly backups should be less than 70 minutes old
MIN_BACKUP_SIZE_KB=100  # Minimum size for a valid backup (100KB)

# Colors for terminal output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$MONITORING_LOG"
    echo "$1"
}

# Function to create alert
create_alert() {
    local message="$1"
    echo "BACKUP ALERT - $(date)" > "$ALERT_FILE"
    echo "=========================" >> "$ALERT_FILE"
    echo "$message" >> "$ALERT_FILE"
    echo "" >> "$ALERT_FILE"
    echo "Action required: Check backup system immediately" >> "$ALERT_FILE"

    log_message "ALERT: $message"
    echo -e "${RED}ALERT: $message${NC}"
}

# Function to check database connectivity
check_database() {
    log_message "Checking database connectivity..."

    cd "$PROJECT_DIR" || return 1

    # Try to get row counts
    FLIGHT_COUNT=$(docker compose exec -T db psql -U postgres phoenix_helicopters -t -c "SELECT COUNT(*) FROM flight_logs" 2>/dev/null | tr -d ' \n')

    if [ -z "$FLIGHT_COUNT" ]; then
        create_alert "Cannot connect to database!"
        return 1
    fi

    log_message "Database is accessible. Flight logs: ${FLIGHT_COUNT}"
    return 0
}

# Function to check daily backups
check_daily_backups() {
    log_message "Checking daily backups..."

    # Find most recent daily backup
    LATEST_BACKUP=$(find "$BACKUP_DIR" -name "phx_helicopters_backup_*.sql.gz" -type f 2>/dev/null | sort -r | head -1)

    if [ -z "$LATEST_BACKUP" ]; then
        create_alert "No daily backup files found!"
        return 1
    fi

    # Check age of latest backup
    BACKUP_AGE_MINUTES=$(( ($(date +%s) - $(stat -c %Y "$LATEST_BACKUP")) / 60 ))
    BACKUP_AGE_HOURS=$(( BACKUP_AGE_MINUTES / 60 ))

    if [ $BACKUP_AGE_HOURS -gt $MAX_AGE_HOURS ]; then
        create_alert "Daily backup is ${BACKUP_AGE_HOURS} hours old (threshold: ${MAX_AGE_HOURS} hours)"
        return 1
    fi

    # Check size of latest backup
    BACKUP_SIZE_KB=$(du -k "$LATEST_BACKUP" | cut -f1)

    if [ $BACKUP_SIZE_KB -lt $MIN_BACKUP_SIZE_KB ]; then
        create_alert "Daily backup is too small: ${BACKUP_SIZE_KB}KB (minimum: ${MIN_BACKUP_SIZE_KB}KB)"
        return 1
    fi

    # Verify backup contains data
    TABLE_COUNT=$(zcat "$LATEST_BACKUP" 2>/dev/null | grep -c "CREATE TABLE" || echo "0")

    if [ "$TABLE_COUNT" -lt 5 ]; then
        create_alert "Daily backup appears corrupted - only ${TABLE_COUNT} tables found"
        return 1
    fi

    log_message "Daily backup OK: $(basename "$LATEST_BACKUP") - ${BACKUP_SIZE_KB}KB, ${BACKUP_AGE_HOURS}h old"
    return 0
}

# Function to check hourly backups
check_hourly_backups() {
    log_message "Checking hourly backups..."

    if [ ! -d "$HOURLY_DIR" ]; then
        log_message "WARNING: Hourly backup directory does not exist"
        return 1
    fi

    # Find most recent hourly backup
    LATEST_HOURLY=$(find "$HOURLY_DIR" -name "flight_data_*.sql.gz" -type f 2>/dev/null | sort -r | head -1)

    if [ -z "$LATEST_HOURLY" ]; then
        create_alert "No hourly backup files found!"
        return 1
    fi

    # Check age of latest hourly backup
    BACKUP_AGE_MINUTES=$(( ($(date +%s) - $(stat -c %Y "$LATEST_HOURLY")) / 60 ))

    if [ $BACKUP_AGE_MINUTES -gt $MAX_HOURLY_AGE_MINUTES ]; then
        create_alert "Hourly backup is ${BACKUP_AGE_MINUTES} minutes old (threshold: ${MAX_HOURLY_AGE_MINUTES} minutes)"
        return 1
    fi

    log_message "Hourly backup OK: $(basename "$LATEST_HOURLY") - ${BACKUP_AGE_MINUTES} minutes old"
    return 0
}

# Function to check backup logs for errors
check_backup_logs() {
    log_message "Checking backup logs for recent errors..."

    # Check main backup log
    if [ -f "${BACKUP_DIR}/backup.log" ]; then
        RECENT_ERRORS=$(tail -100 "${BACKUP_DIR}/backup.log" | grep -c "ERROR" || echo "0")

        if [ "$RECENT_ERRORS" -gt 0 ]; then
            log_message "WARNING: Found ${RECENT_ERRORS} errors in recent backup log"

            # Check if the most recent entry is an error
            LAST_LINE=$(tail -1 "${BACKUP_DIR}/backup.log")
            if [[ "$LAST_LINE" == *"ERROR"* ]]; then
                create_alert "Most recent backup attempt failed: $LAST_LINE"
                return 1
            fi
        fi
    fi

    # Check hourly backup log
    if [ -f "${BACKUP_DIR}/hourly.log" ]; then
        RECENT_HOURLY_ERRORS=$(tail -100 "${BACKUP_DIR}/hourly.log" | grep -c "ERROR" || echo "0")

        if [ "$RECENT_HOURLY_ERRORS" -gt 0 ]; then
            log_message "WARNING: Found ${RECENT_HOURLY_ERRORS} errors in recent hourly backup log"
        fi
    fi

    return 0
}

# Main monitoring function
main() {
    echo ""
    echo "==================================="
    echo "Backup Monitoring Check"
    echo "Time: $(date)"
    echo "==================================="

    # Remove old alert file if exists
    [ -f "$ALERT_FILE" ] && rm "$ALERT_FILE"

    # Track overall status
    STATUS=0

    # Run checks
    check_database || STATUS=1
    check_daily_backups || STATUS=1
    check_hourly_backups || STATUS=1
    check_backup_logs || STATUS=1

    # Summary
    echo ""
    if [ $STATUS -eq 0 ]; then
        echo -e "${GREEN}✓ All backup checks passed${NC}"
        log_message "Monitoring check completed successfully"
    else
        echo -e "${RED}✗ Backup issues detected - check $ALERT_FILE${NC}"
        log_message "Monitoring check completed with issues"

        # Display alert file if it exists
        if [ -f "$ALERT_FILE" ]; then
            echo ""
            echo "Alert details:"
            cat "$ALERT_FILE"
        fi
    fi

    return $STATUS
}

# Run main function
main
exit $?