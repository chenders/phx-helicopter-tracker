#!/bin/bash

# Database Restoration Script
# Safely restores database from backup with verification

set -e

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
BACKUP_DIR="/home/phx/phx-helicopter-tracker/backups"
DOCKER_COMPOSE="/home/phx/phx-helicopter-tracker/docker-compose.yml"
LOG_FILE="/home/phx/phx-helicopter-tracker/backups/restore.log"

# Function to log
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [backup_file]"
    echo ""
    echo "If no backup file specified, shows list of available backups."
    echo ""
    echo "Examples:"
    echo "  $0                    # List available backups"
    echo "  $0 latest             # Restore from latest backup"
    echo "  $0 backup.sql.gz      # Restore specific backup"
    exit 1
}

# Function to list available backups
list_backups() {
    echo -e "${BLUE}Available backups:${NC}"
    echo ""

    # List main backups
    echo "Full Database Backups:"
    ls -lht "$BACKUP_DIR"/phx_helicopters_backup_*.sql.gz 2>/dev/null | head -10 | while read line; do
        echo "  $line"
    done

    echo ""
    echo "Hourly Flight Data Backups:"
    if [ -d "$BACKUP_DIR/hourly" ]; then
        ls -lht "$BACKUP_DIR/hourly"/flight_data_*.sql.gz 2>/dev/null | head -5 | while read line; do
            echo "  $line"
        done
    fi

    echo ""
    echo "Safety Backups:"
    if [ -d "$BACKUP_DIR/safety" ]; then
        ls -lht "$BACKUP_DIR/safety"/safety_backup_*.sql.gz 2>/dev/null | head -5 | while read line; do
            echo "  $line"
        done
    fi
}

# Function to get current statistics
get_current_stats() {
    local flights=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_logs" 2>/dev/null | tr -d ' ')
    local positions=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_positions" 2>/dev/null | tr -d ' ')

    echo "Flights: ${flights:-0}, Positions: ${positions:-0}"
}

# Main restoration function
restore_backup() {
    local backup_file="$1"

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "                    DATABASE RESTORATION"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Check if backup file exists
    if [ ! -f "$backup_file" ]; then
        echo -e "${RED}Error: Backup file not found: $backup_file${NC}"
        exit 1
    fi

    echo -e "${YELLOW}Backup file:${NC} $backup_file"
    echo -e "${YELLOW}File size:${NC} $(du -h "$backup_file" | cut -f1)"
    echo -e "${YELLOW}Created:${NC} $(stat -c %y "$backup_file" | cut -d' ' -f1,2)"
    echo ""

    # Show current database statistics
    echo -e "${YELLOW}Current database statistics:${NC}"
    current_stats=$(get_current_stats)
    echo "  $current_stats"
    echo ""

    # Warning
    echo -e "${RED}⚠️  WARNING: This will REPLACE all current data! ⚠️${NC}"
    echo ""
    echo "To proceed with restoration, type EXACTLY:"
    echo "  RESTORE and replace all data"
    echo ""
    read -p "Confirmation: " confirmation

    if [ "$confirmation" != "RESTORE and replace all data" ]; then
        echo -e "${GREEN}✓ Restoration cancelled. Database unchanged.${NC}"
        exit 0
    fi

    # Create safety backup first
    echo ""
    echo -e "${YELLOW}Creating safety backup before restoration...${NC}"
    timestamp=$(date +%Y%m%d_%H%M%S)
    safety_backup="$BACKUP_DIR/safety/pre_restore_${timestamp}.sql.gz"
    mkdir -p "$BACKUP_DIR/safety"

    docker compose -f "$DOCKER_COMPOSE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | \
        gzip > "$safety_backup"

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Safety backup created: $(basename "$safety_backup")${NC}"
    else
        echo -e "${RED}✗ Failed to create safety backup. Aborting restoration.${NC}"
        exit 1
    fi

    # Perform restoration
    echo ""
    echo -e "${YELLOW}Restoring database...${NC}"
    log_message "Starting restoration from $backup_file"

    # Drop and recreate database
    docker compose -f "$DOCKER_COMPOSE" exec -T db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;" 2>/dev/null
    docker compose -f "$DOCKER_COMPOSE" exec -T db psql -U "$DB_USER" -c "CREATE DATABASE ${DB_NAME}_temp;" 2>/dev/null

    # Restore to temp database first
    if [[ "$backup_file" == *.gz ]]; then
        gunzip -c "$backup_file" | docker compose -f "$DOCKER_COMPOSE" exec -T db \
            psql -U "$DB_USER" "${DB_NAME}_temp" 2>/dev/null
    else
        docker compose -f "$DOCKER_COMPOSE" exec -T db \
            psql -U "$DB_USER" "${DB_NAME}_temp" < "$backup_file" 2>/dev/null
    fi

    if [ $? -eq 0 ]; then
        # Verify temp database
        temp_flights=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
            psql -U "$DB_USER" "${DB_NAME}_temp" -t -c "SELECT COUNT(*) FROM flight_logs" 2>/dev/null | tr -d ' ')

        if [ "$temp_flights" -gt 0 ]; then
            # Swap databases
            docker compose -f "$DOCKER_COMPOSE" exec -T db psql -U "$DB_USER" << EOF 2>/dev/null
ALTER DATABASE $DB_NAME RENAME TO ${DB_NAME}_old;
ALTER DATABASE ${DB_NAME}_temp RENAME TO $DB_NAME;
DROP DATABASE ${DB_NAME}_old;
EOF

            echo -e "${GREEN}✓ Database restored successfully${NC}"

            # Show new statistics
            echo ""
            echo -e "${YELLOW}New database statistics:${NC}"
            new_stats=$(get_current_stats)
            echo "  $new_stats"

            log_message "Restoration completed successfully"
        else
            echo -e "${RED}✗ Restored database appears empty. Rolling back.${NC}"
            docker compose -f "$DOCKER_COMPOSE" exec -T db psql -U "$DB_USER" -c "DROP DATABASE ${DB_NAME}_temp;" 2>/dev/null
            exit 1
        fi
    else
        echo -e "${RED}✗ Restoration failed${NC}"
        docker compose -f "$DOCKER_COMPOSE" exec -T db psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS ${DB_NAME}_temp;" 2>/dev/null
        log_message "Restoration failed"
        exit 1
    fi

    echo ""
    echo -e "${GREEN}✅ Restoration complete!${NC}"
    echo -e "Safety backup available at: ${safety_backup}"
}

# Main execution
main() {
    if [ -z "$1" ]; then
        list_backups
        echo ""
        echo "To restore a backup, run:"
        echo "  $0 <backup_file>"
        echo "  $0 latest"
        exit 0
    fi

    if [ "$1" == "--help" ] || [ "$1" == "-h" ]; then
        show_usage
    fi

    if [ "$1" == "latest" ]; then
        # Find latest backup
        backup_file=$(ls -t "$BACKUP_DIR"/phx_helicopters_backup_*.sql.gz 2>/dev/null | head -1)
        if [ -z "$backup_file" ]; then
            echo -e "${RED}No backups found${NC}"
            exit 1
        fi
    else
        backup_file="$1"
        # If not full path, check in backup directory
        if [ ! -f "$backup_file" ]; then
            if [ -f "$BACKUP_DIR/$backup_file" ]; then
                backup_file="$BACKUP_DIR/$backup_file"
            fi
        fi
    fi

    restore_backup "$backup_file"
}

# Run main function
main "$@"