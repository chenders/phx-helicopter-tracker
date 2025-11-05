# Database Safety Guidelines

## ⚠️ CRITICAL WARNING ⚠️

**NEVER run the following commands or scripts without understanding the consequences:**

### 🚫 DESTRUCTIVE COMMANDS - WILL DELETE ALL DATA:

```bash
# ❌ NEVER RUN THESE WITHOUT CONFIRMATION:
docker compose down -v                    # Deletes ALL volumes including database
docker volume rm postgres_data            # Deletes entire database
./scripts/restore_database.sh            # Deletes volume and attempts restore
./scripts/restore_flight_data.sh         # Deletes all flight data
```

## ✅ Safe Operations

### View Database Status (Safe - Read-only)
```bash
# Check flight count
docker compose exec db psql -U postgres phoenix_helicopters -c "SELECT COUNT(*) FROM flight_logs;"

# Check all table counts
docker compose exec db psql -U postgres phoenix_helicopters -c "
SELECT
  'Flight Logs' as table_name, COUNT(*) as count FROM flight_logs
UNION ALL
SELECT 'Flight Positions', COUNT(*) FROM flight_positions
UNION ALL
SELECT 'Aircraft', COUNT(*) FROM aircraft
UNION ALL
SELECT 'Flight Discoveries', COUNT(*) FROM flight_discoveries;
"
```

### Create Backup (Safe - Does not modify data)
```bash
# Manual backup
./scripts/backup_database.sh

# Backups are stored in: /home/phx/phx-helicopter-tracker/backups/
```

### Stop/Start Services (Safe - Does not delete data)
```bash
# Stop services (data persists in volume)
docker compose down

# Start services
docker compose up -d

# Restart just one service
docker compose restart backend
```

## ⚠️ Potentially Dangerous Operations

### Database Restore
**Only use these if you NEED to restore from backup and accept that current data will be DELETED:**

```bash
# Script with safety guards (requires confirmation)
./scripts/restore_flight_data.sh /path/to/backup.sql.gz

# You will be prompted to type:
# "DELETE MY FLIGHT DATA AND RESTORE FROM BACKUP"
```

### Volume Recreation (EXTREMELY DANGEROUS)
**This deletes EVERYTHING. Only use in emergency:**

```bash
# Requires typing:
# "I UNDERSTAND THIS WILL DELETE ALL FLIGHT DATA"
./scripts/restore_database.sh
```

## 🔒 Safety Features Added

Both restore scripts now include:
- ✅ Large warning banners
- ✅ Display of current data that will be deleted
- ✅ Mandatory typed confirmation (must match exactly)
- ✅ 5-10 second countdown to allow cancellation (Ctrl+C)
- ✅ Clear success/failure messages

## 📊 What Data You Currently Have

Run this to check your current database status:

```bash
docker compose exec db psql -U postgres phoenix_helicopters -c "
SELECT
  (SELECT COUNT(*) FROM flight_logs) as flights,
  (SELECT COUNT(*) FROM flight_positions) as positions,
  (SELECT COUNT(*) FROM aircraft WHERE is_phoenix_pd = true) as aircraft,
  (SELECT COUNT(*) FROM flight_discoveries) as discoveries,
  (SELECT MIN(departure_time) FROM flight_logs) as earliest_flight,
  (SELECT MAX(departure_time) FROM flight_logs) as latest_flight;
"
```

## 🆘 If You Accidentally Delete Data

1. **STOP IMMEDIATELY** - Don't run any more commands
2. Check available backups:
   ```bash
   ls -lh /home/phx/phx-helicopter-tracker/backups/*.gz | tail -10
   ```
3. Find the most recent backup with substantial data (100MB+)
4. Contact the administrator before proceeding

## 📝 Automated Backups

Backups are created automatically:
- **Daily backups**: 2 AM via cron
- **Hourly flight data**: `/home/phx/phx-helicopter-tracker/backups/hourly/`
- **Retention**: 30 days

Check backup status:
```bash
ls -lh /home/phx/phx-helicopter-tracker/backups/ | tail -20
```

## 🛡️ Prevention

To prevent accidental data loss:
1. **Always create a manual backup before risky operations**
2. **Never use `docker compose down -v`** - use `docker compose down` instead
3. **Read all script warnings carefully**
4. **If unsure, ask first**
5. **Check data counts before and after operations**

## 🔧 Claude Code Integration

When using Claude Code (AI assistant):
- Claude will NEVER run destructive operations without your explicit permission
- Claude must show large warnings before any data deletion
- You must provide typed confirmation for dangerous operations
- Claude will notify you in large font about database deletion risks

## 📞 Emergency Contacts

If you lose data and need help:
1. Check this file: `/home/phx/phx-helicopter-tracker/scripts/DATABASE_SAFETY.md`
2. Review available backups in `/home/phx/phx-helicopter-tracker/backups/`
3. Check the git history for recent changes: `git log --oneline -20`
