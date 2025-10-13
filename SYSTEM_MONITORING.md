# System Error Monitoring

Automated system that detects, tracks, and reports errors across the application.

## Overview

The system monitoring feature automatically:
- Detects errors from Celery task failures
- Groups similar errors to avoid duplicates
- Tracks occurrence counts and timestamps
- Assigns priority levels (critical, high, medium, low)
- Auto-resolves issues not seen in 24 hours
- Provides API endpoints for viewing and managing issues

## How It Works

### 1. Error Detection
Every hour, the `monitor_system_errors` task:
- Checks the `task_history` table for failed tasks in the last hour
- Extracts error information (exception type, message, stack trace)
- Determines which component failed (transcription, fr24_api, database, etc.)
- Generates a unique signature to group similar errors

### 2. Issue Tracking
Each detected error is stored in the `system_issues` table with:
- **Error details**: Type, message, stack trace, context
- **Tracking data**: First seen, last seen, occurrence count
- **Priority**: Auto-calculated based on error type and frequency
- **Resolution status**: Active or resolved

### 3. Prioritization
Errors are automatically prioritized:
- **Critical**: Database errors, connection errors, system errors (immediate attention)
- **High**: Frequent errors (>10 for critical components, >50 overall)
- **Medium**: Moderate frequency (5-10 for critical components, 20-50 overall)
- **Low**: Infrequent errors

### 4. Auto-Resolution
Issues are automatically marked as resolved if:
- Not seen in the last 24 hours (configurable)
- Resolution is recorded with timestamp and reason

## API Endpoints

All endpoints are at `/api/v1/system-health`:

### Get System Health Report
```bash
GET /api/v1/system-health/health-report
```
Returns overall health score (0-100) and issue breakdown.

### Get System Statistics
```bash
GET /api/v1/system-health/stats
```
Returns counts of issues by status and priority.

### List Issues
```bash
GET /api/v1/system-health/issues
GET /api/v1/system-health/issues?resolved=false
GET /api/v1/system-health/issues?priority=critical
GET /api/v1/system-health/issues?component=transcription
GET /api/v1/system-health/issues?limit=50
```
Returns list of detected issues with optional filters.

### Get Issue Details
```bash
GET /api/v1/system-health/issues/{issue_id}
```
Returns full details including stack trace and context.

### Resolve Issue
```bash
POST /api/v1/system-health/issues/{issue_id}/resolve
```
Body (optional):
```json
{
  "resolution_notes": "Fixed by upgrading package X"
}
```

### Reopen Issue
```bash
POST /api/v1/system-health/issues/{issue_id}/reopen
```

### Group by Component
```bash
GET /api/v1/system-health/issues/by-component
GET /api/v1/system-health/issues/by-component?resolved=false
```
Returns issue counts grouped by component.

### Manually Trigger Monitoring
```bash
POST /api/v1/system-health/monitor-now
```
Manually run error monitoring (runs automatically every hour).

## Usage Examples

### Check Current System Health
```bash
curl http://localhost:8001/api/v1/system-health/health-report
```

Example response:
```json
{
  "timestamp": "2025-10-13T00:15:00Z",
  "health_score": 85,
  "health_status": "healthy",
  "issues_by_priority": {
    "critical": 0,
    "high": 1,
    "medium": 2,
    "low": 3
  },
  "issues_by_component": {
    "transcription": {
      "count": 2,
      "total_occurrences": 15,
      "issues": [...]
    },
    "fr24_api": {
      "count": 1,
      "total_occurrences": 5,
      "issues": [...]
    }
  },
  "total_active_issues": 6,
  "total_resolved_today": 2
}
```

### View Active Critical Issues
```bash
curl "http://localhost:8001/api/v1/system-health/issues?resolved=false&priority=critical"
```

### View All Transcription Issues
```bash
curl "http://localhost:8001/api/v1/system-health/issues?component=transcription&limit=100"
```

### Check Statistics
```bash
curl http://localhost:8001/api/v1/system-health/stats
```

Example response:
```json
{
  "total_issues": 45,
  "active_issues": 12,
  "resolved_issues": 33,
  "new_in_last_24h": 5,
  "resolved_in_last_24h": 8,
  "by_priority": {
    "critical": 0,
    "high": 2,
    "medium": 5,
    "low": 5
  }
}
```

### Resolve an Issue
```bash
curl -X POST http://localhost:8001/api/v1/system-health/issues/123/resolve \
  -H "Content-Type: application/json" \
  -d '{"resolution_notes": "Fixed by upgrading faster-whisper to 1.0.0"}'
```

## Scheduled Tasks

The monitoring task runs automatically:
- **Schedule**: Every hour (on the hour)
- **Task name**: `monitor_system_errors`
- **Duration**: Typically completes in <1 second
- **What it checks**: Last 1 hour of task failures
- **Auto-resolution**: Issues not seen in 24 hours

You can view scheduled tasks in Flower: http://localhost:5555

## Component Categories

Errors are categorized by component:
- **transcription**: Audio transcription tasks (Whisper, faster-whisper)
- **fr24_api**: FlightRadar24 API calls and rate limiting
- **download**: File download tasks (radio, flight tracks)
- **database**: Database connection and query errors
- **radio**: Radio archive and transcription tasks
- **celery**: General Celery worker errors

## Database Schema

The `system_issues` table stores:
```sql
CREATE TABLE system_issues (
    id SERIAL PRIMARY KEY,
    issue_type VARCHAR(50),           -- error, warning, critical
    component VARCHAR(100),            -- transcription, fr24_api, etc.
    error_name VARCHAR(200),           -- Exception class name
    error_message TEXT,                -- Human-readable message
    stack_trace TEXT,                  -- Full stack trace
    context JSON,                      -- Additional details (task_id, file, line, etc.)
    first_seen TIMESTAMP,              -- When first detected
    last_seen TIMESTAMP,               -- Last occurrence
    occurrence_count INT,              -- Number of times seen
    is_resolved BOOLEAN,               -- Resolution status
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(100),
    resolution_notes TEXT,
    priority VARCHAR(20),              -- critical, high, medium, low
    tags JSON,                         -- For categorization
    error_signature VARCHAR(64) UNIQUE -- Deduplication key
);
```

## Integration with Existing Systems

The monitoring system integrates with:
- **task_history**: Reads failed task records
- **Celery Beat**: Scheduled hourly monitoring
- **Flower**: View task execution in real-time
- **FastAPI**: RESTful API for issue management

## Troubleshooting

### No Issues Detected
If the system shows 0 issues but you know there are errors:
1. Check that tasks are actually failing in `task_history` table
2. Manually trigger monitoring: `POST /api/v1/system-health/monitor-now`
3. Check Celery logs for the monitoring task execution
4. Verify `system_issues` table exists: `docker compose exec db psql -U postgres phoenix_helicopters -c "\dt system_issues"`

### Issues Not Being Created
1. Check that `system_monitoring_tasks.py` is loaded by Celery
2. Verify imports in celery_app.py
3. Check for errors in the monitoring task itself (check Celery logs)
4. Ensure database migration was applied: `docker compose exec backend alembic current`

### Auto-Resolution Not Working
1. Check the `auto_resolve_age_hours` parameter (default: 24 hours)
2. Verify the monitoring task is running hourly (check Celery Beat schedule)
3. Look at `last_seen` timestamps for unresolved issues

## Configuration

You can adjust monitoring behavior in `celery_app.py`:

```python
"monitor-system-errors": {
    "task": "monitor_system_errors",
    "schedule": 3600.0,  # Run every hour (in seconds)
    "kwargs": {
        "hours_back": 1,                  # Check last N hours
        "auto_resolve_age_hours": 24      # Auto-resolve after N hours
    }
}
```

To change monitoring frequency:
- More frequent: `"schedule": 1800.0` (every 30 minutes)
- Less frequent: `"schedule": 7200.0` (every 2 hours)

To adjust auto-resolution:
- Never auto-resolve: `"auto_resolve_age_hours": 0`
- Longer retention: `"auto_resolve_age_hours": 168` (1 week)

After configuration changes:
```bash
docker compose restart celery flower
```

## Monitoring Best Practices

1. **Check health report daily**: Review the health score and critical issues
2. **Investigate high-occurrence errors**: If an error has >10 occurrences, it's systemic
3. **Resolve issues with notes**: Document what fixed the issue for future reference
4. **Monitor component trends**: If one component has many issues, it needs attention
5. **Don't ignore low-priority issues**: They may indicate underlying problems

## Future Enhancements

Potential improvements:
- Email/Slack notifications for critical issues
- GitHub issue integration (auto-create issues from critical errors)
- Trend analysis (error rate over time)
- Performance metrics (task duration, memory usage)
- Custom error patterns and alerts
- Frontend dashboard for visualization

---

**Status**: ✅ Active and monitoring
**Last Updated**: October 13, 2025
**Schedule**: Runs automatically every hour
