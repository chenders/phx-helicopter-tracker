#!/bin/bash
#
# Full database backup for Phoenix Helicopter Tracker.
#
# Hardened against the failure mode that left ~11 days of 0-byte backups:
#  - dumps to a temp .partial file (trap-removed on any exit), so a failed
#    pg_dump never leaves a bogus backup behind;
#  - skips cleanly (no partial) if the db isn't ready;
#  - verifies size + contents before promoting the file to its final name;
#  - prunes old .gz backups AND any stale uncompressed/empty .sql leftovers.
#
set -uo pipefail

PROJECT_DIR="/home/phx/phx-helicopter-tracker"
BACKUP_DIR="${PROJECT_DIR}/backups"
DB_NAME="phoenix_helicopters"
DB_USER="postgres"
COMPOSE="docker compose -f ${PROJECT_DIR}/docker-compose.yml"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
FINAL="${BACKUP_DIR}/phx_helicopters_backup_${TIMESTAMP}.sql.gz"
TMP="${BACKUP_DIR}/.backup_${TIMESTAMP}.sql.gz.partial"
LOG_FILE="${BACKUP_DIR}/backup.log"
RETENTION_DAYS=28

log() { echo "[$(date)] $*" | tee -a "$LOG_FILE"; }

cd "$PROJECT_DIR" || { log "ERROR: cannot cd to $PROJECT_DIR"; exit 1; }
mkdir -p "$BACKUP_DIR"

# Always remove the temp partial, whether we succeed or fail.
trap 'rm -f "$TMP"' EXIT

log "Starting database backup -> $(basename "$FINAL")"

# Don't even try if the database isn't accepting connections (the old failure mode).
if ! $COMPOSE exec -T db pg_isready -U "$DB_USER" >/dev/null 2>&1; then
    log "ERROR: db is not ready (service down?); skipping backup, no partial written."
    exit 1
fi

# Dump straight into a gzipped temp file. pipefail makes a pg_dump failure fail here.
if ! $COMPOSE exec -T db pg_dump -U "$DB_USER" "$DB_NAME" 2>>"$LOG_FILE" | gzip > "$TMP"; then
    log "ERROR: pg_dump failed; partial discarded."
    exit 1
fi

# A header-only / empty dump compresses to well under 1 KB.
SIZE=$(stat -c %s "$TMP" 2>/dev/null || echo 0)
if [ "$SIZE" -lt 1024 ]; then
    log "ERROR: backup suspiciously small (${SIZE} bytes); discarded."
    exit 1
fi

# Sanity check: must contain schema.
TABLES=$(zcat "$TMP" | grep -c "^CREATE TABLE" || true)
COPIES=$(zcat "$TMP" | grep -c "^COPY " || true)
if [ "${TABLES:-0}" -lt 1 ]; then
    log "ERROR: no CREATE TABLE statements in dump; discarded."
    exit 1
fi

# Promote atomically only after all checks pass.
mv "$TMP" "$FINAL"
log "Backup OK: $(basename "$FINAL") ($(du -h "$FINAL" | cut -f1); ${TABLES} tables, ${COPIES} COPY blocks)"

# Prune old compressed backups, and remove any stale uncompressed/0-byte leftovers
# from older failed runs (the bug this script now prevents).
log "Pruning backups older than ${RETENTION_DAYS} days + stale .sql leftovers..."
find "$BACKUP_DIR" -maxdepth 1 -name "phx_helicopters_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -print -delete 2>/dev/null | tee -a "$LOG_FILE" || true
find "$BACKUP_DIR" -maxdepth 1 -name "phx_helicopters_backup_*.sql" -print -delete 2>/dev/null | tee -a "$LOG_FILE" || true

log "Backup process completed."
