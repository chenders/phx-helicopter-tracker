# Logging System Documentation

## Overview
The Phoenix Helicopter Tracker uses a comprehensive logging system to track application events, errors, and performance metrics.

## Configuration

### Environment Variables
- `LOG_LEVEL`: Set the logging level (DEBUG, INFO, WARNING, ERROR, CRITICAL). Default: INFO

### Log Files Location
All logs are stored in `/app/logs/` within the Docker container.

## Log Files

| File | Purpose | Rotation |
|------|---------|----------|
| `app.log` | Main application logs | 10MB, 5 backups |
| `error.log` | Error-level logs only | 10MB, 5 backups |
| `fr24_api.log` | FlightRadar24 API interactions | 5MB, 3 backups |
| `celery_tasks.log` | Background task execution | 10MB, 3 backups |
| `database.log` | Database operations | 5MB, 3 backups |
| `api.log` | API endpoint requests/responses | 10MB, 3 backups |

## Log Retention Policy

- **Active Logs**: 30 days
- **Compressed Logs**: After 7 days (gzip compression)
- **Archived Logs**: After 90 days (moved to `/app/logs/archive/`)
- **Deletion**: After 30 days (configurable)

## Manual Operations

### View Logs
```bash
# View recent application logs
docker compose exec backend tail -f /app/logs/app.log

# View error logs
docker compose exec backend tail -f /app/logs/error.log

# View FR24 API logs
docker compose exec backend tail -f /app/logs/fr24_api.log
```

### Log Statistics
```bash
docker compose exec backend python /app/scripts/cleanup_logs.py --stats-only
```

### Manual Cleanup
```bash
# Dry run (see what would be deleted)
docker compose exec backend python /app/scripts/cleanup_logs.py --dry-run

# Actual cleanup with default settings
docker compose exec backend python /app/scripts/cleanup_logs.py

# Custom retention period
docker compose exec backend python /app/scripts/cleanup_logs.py --retention-days 15
```

### Set Up Automated Cleanup
```bash
docker compose exec backend /app/scripts/setup_log_cleanup_cron.sh
```

## Logging in Code

### Basic Usage
```python
import logging
logger = logging.getLogger(__name__)

# Log messages at different levels
logger.debug("Detailed debug information")
logger.info("General information")
logger.warning("Warning message")
logger.error("Error occurred")
logger.critical("Critical error")
```

### With Context
```python
from app.core.logging_config import log_with_context

log_with_context(
    logger, "INFO", "Flight tracked",
    flight_id="N623FB",
    duration=120,
    positions=50
)
```

## Monitoring

### Check Log Sizes
```bash
docker compose exec backend ls -lh /app/logs/
```

### Search Logs
```bash
# Search for specific errors
docker compose exec backend grep -r "ERROR" /app/logs/

# Search for specific flight
docker compose exec backend grep "N623FB" /app/logs/app.log

# Count errors in last 100 lines
docker compose exec backend tail -n 100 /app/logs/error.log | grep -c "ERROR"
```

## Troubleshooting

### Logs Not Appearing
1. Check LOG_LEVEL environment variable
2. Verify logging configuration is loaded: `docker compose logs backend | grep "Logging initialized"`
3. Check disk space: `docker compose exec backend df -h /app/logs`

### Too Many Logs
1. Adjust LOG_LEVEL to WARNING or ERROR
2. Run manual cleanup: `docker compose exec backend python /app/scripts/cleanup_logs.py`
3. Reduce retention period in cleanup script

### Missing Log Files
Log files are created on first write. If a file doesn't exist, the service hasn't logged anything yet.

## Performance Impact
- Logging adds minimal overhead (~1-2ms per log entry)
- Rotation happens automatically when size limits are reached
- Compression reduces storage by ~90% for text logs

## Security Considerations
- Logs may contain sensitive data (flight IDs, registration numbers)
- Never log passwords, API keys, or personal information
- Logs are stored within Docker container, not exposed to host by default
- Consider encrypting archived logs for long-term storage