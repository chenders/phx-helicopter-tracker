# Database Backup & Protection Procedures

## 🚨 CRITICAL: Flight Data Protection

This document outlines the comprehensive backup and data protection system for the Phoenix Helicopter Tracker database, specifically designed to protect valuable FlightRadar24 flight data that is expensive and critical for legal proceedings.

---

## Quick Reference

### Emergency Recovery
```bash
# If database is lost or corrupted:
./backend/scripts/restore_database.sh latest
```

### Create Immediate Backup
```bash
# Full database backup
./scripts/backup_database.sh

# Flight data only (quick)
./backend/scripts/backup_flight_data_hourly.sh
```

### Verify Data Integrity
```bash
cd backend && python3 scripts/verify_flight_data.py
```

---

## Automated Backup Schedule

| Frequency | Time | Script | Description |
|-----------|------|--------|-------------|
| **Hourly** | :00 | `backup_flight_data_hourly.sh` | Flight tables only (lightweight) |
| **Daily** | 2:00 AM | `backup_database.sh` | Full database backup |
| **Daily** | 3:00 AM | `verify_flight_data.py` | Data integrity check |
| **Weekly** | Sun 2:00 AM | `backup_database.sh` | Extended retention backup |

### Backup Locations
- **Main Backups**: `/home/phx/phx-helicopter-tracker/backups/`
- **Hourly Backups**: `/home/phx/phx-helicopter-tracker/backups/hourly/`
- **Safety Backups**: `/home/phx/phx-helicopter-tracker/backups/safety/`
- **Integrity Reports**: `/home/phx/phx-helicopter-tracker/backups/integrity_reports/`

### Retention Policy
- Hourly: 24 hours (24 backups)
- Daily: 30 days
- Weekly: 28 days
- Safety: Manual cleanup only

---

## Database Safety Wrapper

**⚠️ ALWAYS use for potentially destructive operations:**

```bash
# Use the safety wrapper for ANY risky database operation
./backend/scripts/safe_db_operation.sh "your command here"

# Examples:
./backend/scripts/safe_db_operation.sh "docker compose down -v"
./backend/scripts/safe_db_operation.sh "DROP TABLE flight_logs"
```

### What It Does:
1. Shows current database statistics
2. Detects dangerous operations
3. Requires typed confirmation for destructive commands
4. Creates automatic safety backup
5. Logs all operations

### Dangerous Operations Requiring Confirmation:
- `DROP DATABASE`
- `DROP TABLE flight*`
- `DELETE FROM flight*`
- `TRUNCATE flight*`
- `purge`
- `rm -rf` (on data directories)
- PostgreSQL data volume operations

---

## Data Integrity Verification

### Automatic Verification (Daily at 3 AM)
The system automatically:
- Calculates checksums for random flight samples
- Validates position sequences for impossible speeds/altitudes
- Detects mass deletions
- Checks for data gaps

### Manual Verification
```bash
# Run integrity check
cd backend && python3 scripts/verify_flight_data.py

# Check specific flight
docker compose exec backend python3 -c "
from app.services.data_integrity_service import data_integrity_service
from app.db.database import SessionLocal
db = SessionLocal()
valid, result = data_integrity_service.verify_flight_integrity(db, 'flight_id_here')
print(f'Valid: {valid}, Result: {result}')
"
```

### What's Checked:
- Position sequence consistency
- Speed validation (<200 knots for helicopters)
- Altitude validation (-500 to 20,000 ft)
- Time gap detection (>60 seconds)
- Checksum verification

---

## Restoration Procedures

### List Available Backups
```bash
./backend/scripts/restore_database.sh
```

### Restore Latest Backup
```bash
./backend/scripts/restore_database.sh latest
```

### Restore Specific Backup
```bash
./backend/scripts/restore_database.sh phx_helicopters_backup_20250927_155455.sql.gz
```

### Recovery Process:
1. Script shows current data statistics
2. Requires typed confirmation: "RESTORE and replace all data"
3. Creates safety backup automatically
4. Restores to temporary database
5. Verifies restoration
6. Swaps databases atomically
7. Keeps safety backup for rollback

### Recovery Time:
- Small backup (~3MB): <1 minute
- Large backup (~150MB): 2-5 minutes

---

## Protection Against Data Loss

### Multiple Protection Layers:

1. **Docker Volume**: Data persists in `phx-helicopter-tracker_postgres_data`
2. **WAL Configuration**: Write-ahead logging for crash recovery
3. **Hourly Snapshots**: Flight data backed up every hour
4. **Safety Backups**: Automatic before any risky operation
5. **Verification**: Daily integrity checks with alerts
6. **Audit Logging**: All operations logged with timestamps

### Before System Updates:
```bash
# ALWAYS run before updating Docker, PostgreSQL, or PostGIS:
./scripts/backup_database.sh
```

---

## Manual Operations

### Create Manual Backup
```bash
# Full backup with custom name
docker compose exec -T db pg_dump -U postgres phoenix_helicopters | \
    gzip > backups/manual_backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Test Backup Validity
```bash
# Verify backup can be read
gunzip -t backups/your_backup.sql.gz

# Check content
gunzip -c backups/your_backup.sql.gz | head -100
```

### Monitor Backup Sizes
```bash
# Check backup directory usage
du -sh backups/*

# List recent backups
ls -lht backups/*.gz | head -10
```

---

## Troubleshooting

### If Hourly Backup Fails:
1. Check Docker is running: `docker compose ps`
2. Check disk space: `df -h`
3. Check logs: `tail -50 backups/hourly.log`
4. Run manually: `./backend/scripts/backup_flight_data_hourly.sh`

### If Verification Fails:
1. Check error details: `tail -50 backups/verification.log`
2. Review report: `ls -lt backups/integrity_reports/`
3. Run manual check on specific flight

### If Restoration Fails:
1. Check safety backup was created
2. Verify backup file integrity: `gunzip -t backup.sql.gz`
3. Check Docker status
4. Use safety backup if needed

---

## Legal Compliance

### For Lawsuit Purposes:
- All backups include timestamps
- Checksums verify data hasn't been tampered with
- Operation logs provide audit trail
- Daily verification reports document integrity
- Safety backups preserve evidence

### Data Export for Legal Discovery:
```bash
# Export specific date range
docker compose exec db psql -U postgres phoenix_helicopters -c "
COPY (
    SELECT * FROM flight_positions
    WHERE timestamp BETWEEN '2025-09-01' AND '2025-09-30'
) TO STDOUT WITH CSV HEADER
" > flight_data_export.csv
```

---

## Contact & Alerts

### Check System Status:
```bash
# View cron jobs
crontab -l | grep phx-helicopter

# Check recent backups
ls -lht backups/*.gz | head -5

# View operation log
tail -20 backups/operations.log
```

### Critical Files:
- Safety wrapper: `backend/scripts/safe_db_operation.sh`
- Hourly backup: `backend/scripts/backup_flight_data_hourly.sh`
- Restore script: `backend/scripts/restore_database.sh`
- Verification: `backend/scripts/verify_flight_data.py`

---

## ⚠️ NEVER DO THIS:

1. **NEVER** run `docker compose down -v` without backup
2. **NEVER** delete `postgres_data` volume without backup
3. **NEVER** upgrade PostgreSQL without testing
4. **NEVER** purge packages with `apt purge postgresql*`
5. **NEVER** skip the safety wrapper for database operations

---

Last Updated: September 27, 2025
Database Status: Protected with multi-layer backup system