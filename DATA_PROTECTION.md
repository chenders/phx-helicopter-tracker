# DATA PROTECTION GUIDELINES

## ⚠️ CRITICAL: Preventing Data Loss

### Why Data Was Lost Previously

1. **Volume Mapping Mismatch**: The TimescaleDB-HA image stores data at `/home/postgres/pgdata/data` but the volume was mounted at `/var/lib/postgresql/data`
2. **Container Recreation**: Running `docker compose build` and `up` recreated containers, and since data wasn't in the persistent volume, it was lost

### Current Protection Measures

1. **PGDATA Environment Variable**: Now explicitly set to `/var/lib/postgresql/data/pgdata` to ensure data goes to the volume
2. **Volume Mount**: Properly mapped to `/var/lib/postgresql/data`
3. **Restart Policy**: Database set to `restart: unless-stopped`
4. **Backup Mount**: `/backups` directory mounted for easy restoration

## Safe Docker Commands

### ✅ SAFE Operations
```bash
docker compose stop         # Stops containers, preserves data
docker compose start        # Starts containers, preserves data
docker compose restart      # Restarts containers, preserves data
docker compose logs db      # View logs
docker compose build        # Rebuilds images, preserves volumes
```

### ⚠️ DANGEROUS Operations
```bash
docker compose down -v      # DELETES ALL DATA!
docker volume rm postgres_data  # DELETES ALL DATA!
```

### 🛡️ Use Safety Wrapper
```bash
# Use this instead of docker compose for safer operations:
./scripts/docker-compose-safe.sh up -d
./scripts/docker-compose-safe.sh down
```

## Backup and Recovery

### Automatic Backups
Backups run daily via cron. Check `/home/phx/phx-helicopter-tracker/backups/`

### Manual Backup
```bash
./scripts/backup_database.sh
```

### Restore from Backup
```bash
# Stop services
docker compose stop

# Restore latest backup
gunzip -c backups/phx_helicopters_backup_YYYYMMDD_HHMMSS.sql.gz | \
  docker compose exec -T db psql -U postgres phoenix_helicopters

# Verify
docker compose exec db psql -U postgres phoenix_helicopters -c \
  "SELECT COUNT(*) FROM flight_logs;"
```

## Verification Commands

### Check Database Status
```bash
# Is volume present?
docker volume ls | grep postgres_data

# Volume size
docker run --rm -v phx-helicopter-tracker_postgres_data:/data alpine du -sh /data

# Database record count
docker compose exec db psql -U postgres phoenix_helicopters -c \
  "SELECT
    (SELECT COUNT(*) FROM flight_logs) as flights,
    (SELECT COUNT(*) FROM flight_positions) as positions,
    (SELECT COUNT(*) FROM flight_discoveries) as discoveries;"
```

## Emergency Recovery

If data is lost:

1. Check for backups:
   ```bash
   ls -lh backups/*.sql.gz
   ```

2. Use restoration script:
   ```bash
   ./scripts/restore_database.sh
   ```

3. If no backups exist, check Docker volumes:
   ```bash
   docker volume ls
   docker volume inspect phx-helicopter-tracker_postgres_data
   ```

## Prevention Checklist

Before ANY Docker operations:
- [ ] Run a backup: `./scripts/backup_database.sh`
- [ ] Verify backup size is reasonable (not 0 bytes)
- [ ] Use safety wrapper: `./scripts/docker-compose-safe.sh`
- [ ] Never use `docker compose down -v`
- [ ] Never delete postgres_data volume

## Volume Configuration Reference

Current `docker-compose.yml` database configuration:
```yaml
db:
  image: timescale/timescaledb:latest-pg15
  environment:
    PGDATA: /var/lib/postgresql/data/pgdata  # CRITICAL!
  volumes:
    - postgres_data:/var/lib/postgresql/data  # CRITICAL!
```

This ensures data persists in the Docker volume, not in the ephemeral container.