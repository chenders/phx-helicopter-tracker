# Celery Tasks Schedule

## Scheduled Tasks (via Celery Beat)

### Live Tracking (Every 30 seconds)
- **refresh-tracking-data**: `app.workers.tracking_tasks.refresh_adsb_data`
  - Fetches live aircraft positions from FlightRadar24 API and ADS-B Exchange
  - Updates database with current positions
  - Generates surveillance alerts

### Pattern Analysis (Every 5 minutes)
- **analyze-recent-patterns**: `app.workers.analysis_tasks.analyze_recent_patterns`
  - Analyzes recent flight patterns for surveillance behavior
  - Identifies hovering, circling, and low-altitude segments
  - Updates surveillance scores

### Incident Correlation (Every hour)
- **correlate-incidents**: `app.workers.analysis_tasks.correlate_incidents_with_flights`
  - Correlates reported incidents with flight patterns
  - Links community complaints to specific helicopter activities

### Credit Monitoring (Every hour)
- **monitor-credit-usage**: `app.workers.tracking_tasks.monitor_fr24_credits`
  - Monitors FlightRadar24 API credit usage
  - Sends alerts when credits are low
  - Adjusts polling frequency based on usage

### Historical Data Downloads (Every 2 hours)
- **schedule-fr24-downloads**: `app.workers.fr24_scheduler.schedule_fr24_downloads`
  - Dynamically schedules historical data downloads
  - Prioritizes recent data and important aircraft
  - Manages credit usage intelligently:
    - <60% credits: All aircraft, 14 days
    - 60-80% credits: Top 3 aircraft, 7 days
    - 80-90% credits: Top 2 aircraft, 3 days
    - 90-95% credits: Top aircraft only, 24 hours
    - ≥95% credits: No downloads

### Daily Cleanup Tasks
- **cleanup-old-imports**: `app.workers.data_import_tasks.cleanup_old_imports_task`
  - Removes import files older than 30 days
  - Cleans up temporary data

- **cleanup-old-positions**: `app.workers.tracking_tasks.cleanup_old_positions`
  - Removes position data older than 90 days
  - Maintains database performance

### Weekly Tasks
- **sync-aircraft-registry**: `app.workers.tracking_tasks.sync_aircraft_registry`
  - Syncs aircraft information with FAA registry
  - Updates aircraft metadata

- **generate-weekly-cost-analysis**: `app.workers.analysis_tasks.generate_cost_analysis`
  - Generates weekly cost analysis report
  - Calculates taxpayer costs for helicopter operations

## On-Demand Tasks (Called via API or other tasks)

### Data Import
- `import_flightradar24_file`: Import FR24 KML/CSV files
- `process_file_import_task`: Process uploaded flight data files
- `process_fr24_download_task`: Download data from FR24
- `import_fr24_historical_data`: Import historical flight data
- `backfill_historical_data`: Backfill months of historical data

### Analysis
- `analyze_flight_patterns`: Analyze specific flight patterns
- `generate_cost_analysis`: Generate cost analysis for date range

### Legal Documents
- `generate_legal_document`: Generate legal documents for lawsuit

## Task Priorities

1. **Critical**: Live tracking (refresh_adsb_data)
2. **High**: Credit monitoring, pattern analysis
3. **Medium**: Historical downloads, incident correlation
4. **Low**: Cleanup tasks, registry sync

## Credit Management Strategy

The system automatically adjusts based on FlightRadar24 credit usage:

1. **Normal Mode (<60% credits)**
   - Full tracking every 30 seconds
   - Historical downloads for all aircraft
   - 14 days of historical data

2. **Conservative Mode (60-80% credits)**
   - Tracking continues normally
   - Historical downloads limited to top 3 aircraft
   - 7 days of historical data

3. **Limited Mode (80-90% credits)**
   - Tracking continues normally
   - Historical downloads for top 2 aircraft only
   - 3 days of historical data

4. **Critical Mode (90-95% credits)**
   - Tracking reduced to every 2 minutes
   - Historical downloads for primary aircraft only
   - 24 hours of historical data

5. **Emergency Mode (≥95% credits)**
   - Tracking reduced to every 5 minutes
   - No historical downloads
   - Preserves credits for live tracking only

## Running Celery

### Start Celery Worker
```bash
celery -A app.workers.celery_app worker --loglevel=info
```

### Start Celery Beat Scheduler
```bash
celery -A app.workers.celery_app beat --loglevel=info
```

### Start Both with Single Command
```bash
celery -A app.workers.celery_app worker --beat --loglevel=info
```

### Monitor Tasks
```bash
celery -A app.workers.celery_app flower
```