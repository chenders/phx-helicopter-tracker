#!/bin/bash

# Database Safety Wrapper Script
# Protects against accidental database deletion or corruption
# MUST be used for any potentially destructive database operations

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Configuration
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
BACKUP_DIR="/home/phx/phx-helicopter-tracker/backups/safety"
LOG_FILE="/home/phx/phx-helicopter-tracker/backups/operations.log"
DOCKER_COMPOSE="/home/phx/phx-helicopter-tracker/docker-compose.yml"

# Create directories if needed
mkdir -p "$BACKUP_DIR"
touch "$LOG_FILE"

# Function to log operations
log_operation() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

# Function to check current database statistics
check_database_stats() {
    echo -e "${YELLOW}Current Database Statistics:${NC}"

    # Get counts using docker compose exec
    FLIGHTS=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_logs" 2>/dev/null | tr -d ' ')
    POSITIONS=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_positions" 2>/dev/null | tr -d ' ')
    DISCOVERIES=$(docker compose -f "$DOCKER_COMPOSE" exec -T db \
        psql -U "$DB_USER" "$DB_NAME" -t -c "SELECT COUNT(*) FROM flight_discoveries" 2>/dev/null | tr -d ' ')

    echo "  • Flight Logs: ${FLIGHTS:-0}"
    echo "  • Flight Positions: ${POSITIONS:-0}"
    echo "  • Flight Discoveries: ${DISCOVERIES:-0}"
    echo ""
}

# Function to create safety backup
create_safety_backup() {
    local reason="$1"
    local timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="${BACKUP_DIR}/safety_backup_${timestamp}.sql.gz"

    echo -e "${YELLOW}Creating safety backup...${NC}"
    docker compose -f "$DOCKER_COMPOSE" exec -T db pg_dump -U "$DB_USER" "$DB_NAME" 2>/dev/null | gzip > "$backup_file"

    if [ $? -eq 0 ]; then
        local size=$(du -h "$backup_file" | cut -f1)
        echo -e "${GREEN}✓ Safety backup created: $(basename "$backup_file") (${size})${NC}"
        log_operation "BACKUP: Created safety backup for: $reason"
        echo "$backup_file"
    else
        echo -e "${RED}✗ Failed to create safety backup!${NC}"
        exit 1
    fi
}

# Function to detect dangerous operations
is_dangerous_operation() {
    local operation="$1"
    local dangerous_keywords=(
        "DROP DATABASE"
        "DROP TABLE flight"
        "DELETE FROM flight"
        "TRUNCATE flight"
        "purge"
        "pg_dropcluster"
        "rm -rf"
        "postgresql/data"
        "postgres_data"
        "ALTER TABLE flight"
    )

    for keyword in "${dangerous_keywords[@]}"; do
        if [[ "$operation" =~ $keyword ]]; then
            return 0  # Is dangerous
        fi
    done
    return 1  # Not dangerous
}

# Main execution
main() {
    local operation="$*"

    echo ""
    echo "════════════════════════════════════════════════════════════════"
    echo "           DATABASE SAFETY CHECK"
    echo "════════════════════════════════════════════════════════════════"
    echo ""

    # Check if operation is provided
    if [ -z "$operation" ]; then
        echo -e "${RED}Error: No operation provided${NC}"
        echo "Usage: $0 <database operation command>"
        exit 1
    fi

    # Log the attempted operation
    log_operation "ATTEMPT: $operation"

    # Show current stats
    check_database_stats

    # Check if operation is dangerous
    if is_dangerous_operation "$operation"; then
        echo -e "${RED}⚠️  WARNING: POTENTIALLY DESTRUCTIVE OPERATION DETECTED ⚠️${NC}"
        echo ""
        echo "You are about to execute:"
        echo "  $operation"
        echo ""
        echo -e "${YELLOW}This operation may DELETE or MODIFY flight data!${NC}"
        echo ""

        # Require explicit confirmation
        echo -e "${RED}To proceed, type EXACTLY:${NC}"
        echo "  I understand this may DELETE flight data"
        echo ""
        read -p "Confirmation: " confirmation

        if [ "$confirmation" != "I understand this may DELETE flight data" ]; then
            echo -e "${GREEN}✓ Operation cancelled. Database is safe.${NC}"
            log_operation "CANCELLED: User did not confirm dangerous operation"
            exit 0
        fi

        # Create backup before proceeding
        backup_file=$(create_safety_backup "dangerous operation: $operation")

        echo ""
        echo -e "${YELLOW}Executing operation...${NC}"
        log_operation "EXECUTED: $operation (backup: $backup_file)"
    else
        # Non-dangerous operation, but still log it
        echo -e "${GREEN}✓ Operation appears safe${NC}"

        # Ask for confirmation for any database operation
        read -p "Proceed with operation? (y/N): " -n 1 -r
        echo ""

        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            echo "Operation cancelled."
            exit 0
        fi

        log_operation "EXECUTED (SAFE): $operation"
    fi

    # Execute the operation
    echo ""
    eval "$operation"
    result=$?

    if [ $result -eq 0 ]; then
        echo ""
        echo -e "${GREEN}✓ Operation completed successfully${NC}"

        # Show new stats for comparison
        echo ""
        echo "New Database Statistics:"
        check_database_stats
    else
        echo ""
        echo -e "${RED}✗ Operation failed with exit code: $result${NC}"
        if [ ! -z "$backup_file" ]; then
            echo -e "${YELLOW}Restore from backup if needed: $backup_file${NC}"
        fi
    fi

    log_operation "COMPLETED: Exit code $result"
    exit $result
}

# Run main function
main "$@"