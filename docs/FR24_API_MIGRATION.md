# FlightRadar24 API Migration Documentation

## Overview

This document describes the migration from ADS-B Exchange to FlightRadar24's API for tracking Phoenix Police Department helicopters. The system is designed to work within the Explorer plan's 60,000 monthly credit limit while providing reliable real-time and historical flight data.

## Architecture

### Service Layers

1. **FlightRadar24 API Service** (`app/services/flightradar24_api_service.py`)
   - Primary data source for aircraft tracking
   - Credit management and monitoring
   - Intelligent caching with Redis
   - Sandbox/production environment switching

2. **Unified Tracking Service** (`app/services/tracking_service.py`)
   - Abstracts data source selection
   - Automatic fallback from FR24 to ADS-B Exchange
   - Consistent data format across sources

3. **Alert Service** (`app/services/alert_service.py`)
   - Credit usage monitoring
   - Surveillance pattern detection
   - Real-time notifications via WebSocket

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# FlightRadar24 API Configuration
FR24_API_ENVIRONMENT=sandbox  # or 'production'
FR24_API_KEY_SANDBOX=0198ea4a-3b3f-7058-a837-32dedeafde4a|xevJZrQpBR14umXZ3whpPja3vucKspevkBV4vOjme1e687ad
FR24_API_KEY_PRODUCTION=0198f8ec-7e4c-70e6-b98f-54d1704798b9|I3LmVyOqSVjc8Hsvw8bNkML5guofmFdvOD75YsOCbb1ab15b

# Credit Limits
FR24_MONTHLY_CREDIT_LIMIT=60000
FR24_DAILY_CREDIT_TARGET=2000

# Polling Configuration
FR24_POLL_INTERVAL_PEAK=30      # seconds during peak hours (6am-10pm)
FR24_POLL_INTERVAL_NIGHT=120    # seconds during night hours
FR24_POLL_INTERVAL_INACTIVE=300 # seconds when no aircraft active

# Redis Configuration (for caching)
REDIS_URL=redis://redis:6379/0
FR24_CACHE_TTL=60  # seconds

# Alert Configuration
ENABLE_REAL_TIME_ALERTS=true
ALERT_EMAIL=your-email@example.com
CREDIT_WARNING_THRESHOLD=70    # percentage
CREDIT_CRITICAL_THRESHOLD=90   # percentage
```

### Docker Compose

For development, environment variables are set in `docker-compose.dev.yml`:

```yaml
environment:
  - FR24_API_ENVIRONMENT=sandbox
  - FR24_API_KEY_SANDBOX=${FR24_API_KEY_SANDBOX}
  - FR24_MONTHLY_CREDIT_LIMIT=60000
```

## Credit Management

### Credit Usage Strategy

The system implements multiple strategies to stay within the 60,000 monthly credit limit:

1. **Intelligent Polling Intervals**
   - Peak hours (6am-10pm): 30-second intervals
   - Night hours: 2-minute intervals
   - No active aircraft: 5-minute intervals
   - Automatic throttling when credits run low

2. **Caching**
   - 60-second cache for live position data
   - 5-minute cache for aircraft lists
   - Redis-based distributed cache

3. **Credit Monitoring**
   - Real-time usage tracking
   - Projected monthly usage calculations
   - Automatic alert thresholds:
     - 70%: Warning
     - 90%: Critical (reduce polling)
     - 95%: Emergency (minimal polling)

### Credit Cost Reference

| Endpoint | Credits | Our Usage |
|----------|---------|-----------|
| Live positions | 1-5 | Every 30s-5min |
| Aircraft details | 10 | On demand |
| Historical data | 50-100 | Daily batch |
| Area search | 20 | Every 30s peak |

### Daily Budget

- Target: 2,000 credits/day
- Peak hours: ~1,440 credits (30s intervals)
- Night hours: ~360 credits (2min intervals)
- Buffer: 200 credits for on-demand requests

## API Endpoints

### New Endpoints

1. **Credit Usage**
   ```
   GET /api/v1/tracking/sources/fr24/credits
   ```
   Returns current credit usage statistics

2. **Live Tracking with Source Info**
   ```
   GET /api/v1/tracking/live
   ```
   Returns live aircraft positions with data source indicator

3. **Historical Import**
   ```
   POST /api/v1/tracking/import/fr24
   {
     "registration": "N624FB",
     "start_date": "2024-01-01",
     "end_date": "2024-01-31"
   }
   ```

## Frontend Components

### Credit Usage Widget

The `CreditUsageWidget.tsx` component displays:
- Current monthly usage with progress bar
- Color-coded alerts (green/yellow/red)
- Daily usage statistics
- Projected monthly total
- Automatic warnings when approaching limits

Usage:
```tsx
import CreditUsageWidget from '@/components/CreditUsageWidget';

function Dashboard() {
  return <CreditUsageWidget />;
}
```

## Testing

### Test Script

Run the comprehensive test script:

```bash
docker compose exec backend python test_fr24_api.py
```

This tests:
1. Service initialization
2. Credit manager
3. Phoenix PD aircraft tracking
4. Intelligent polling
5. Area search
6. Historical data (uses significant credits)
7. Caching effectiveness

### Sandbox vs Production

Always test in sandbox first:

```python
# Force sandbox for testing
os.environ['FR24_API_ENVIRONMENT'] = 'sandbox'
```

## Monitoring

### Celery Beat Tasks

Monitor credit usage via Celery beat:

```python
# app/workers/celery_app.py
"monitor-fr24-credits": {
    "task": "app.workers.tracking_tasks.monitor_fr24_credits",
    "schedule": 300.0,  # Every 5 minutes
}
```

### Alert Channels

Alerts are sent through:
1. WebSocket (real-time UI updates)
2. Database logging
3. Email notifications (when configured)
4. Application logs

### Logs

Monitor credit usage in logs:

```bash
docker compose logs backend -f | grep "FR24 Credit"
```

## Troubleshooting

### Common Issues

1. **"Credit limit exceeded" errors**
   - Check current usage: `/api/v1/tracking/sources/fr24/credits`
   - Verify monthly limit configuration
   - Check if automatic throttling is working
   - Consider increasing cache TTL

2. **No data showing**
   - Verify API keys are correct
   - Check environment (sandbox vs production)
   - Ensure Redis is running for cache
   - Check fallback to ADS-B Exchange

3. **Environment variables not loading**
   - Ensure .env file is in backend directory
   - Restart Docker containers after changes
   - Check docker-compose.yml overrides

4. **Cache not working**
   - Verify Redis connection: `docker compose exec redis redis-cli ping`
   - Check REDIS_URL configuration
   - Monitor cache hit rates in logs

### Debug Mode

Enable detailed logging:

```python
# app/services/flightradar24_api_service.py
logger.setLevel(logging.DEBUG)
```

## Performance Optimization

### Batch Operations

Use batch endpoints when possible:

```python
# Good - single API call
positions = await fr24_api_service.get_phoenix_pd_aircraft()

# Bad - multiple API calls
for reg in registrations:
    position = await fr24_api_service.get_aircraft_position(reg)
```

### Historical Data Import

Schedule during low-usage periods:

```python
# Run at 3 AM when few aircraft are active
@celery_app.task
def import_historical_batch():
    # Import yesterday's data
    pass
```

### Cache Warming

Pre-populate cache during quiet periods:

```python
async def warm_cache():
    """Pre-fetch common queries"""
    await fr24_api_service.get_phoenix_pd_aircraft()
    await fr24_api_service.get_service_status()
```

## Migration Checklist

- [x] Configure FR24 API credentials
- [x] Set up Redis for caching
- [x] Update Docker Compose with environment variables
- [x] Deploy credit monitoring alerts
- [x] Test in sandbox environment
- [x] Implement fallback to ADS-B Exchange
- [x] Add frontend credit usage display
- [x] Configure Celery beat schedules
- [x] Set up alert notifications
- [ ] Switch to production when ready
- [ ] Monitor first week of usage
- [ ] Adjust polling intervals based on actual usage

## Support

### FR24 API Documentation
- [Explorer API Guide](https://www.flightradar24.com/terms-and-conditions/api-explorer)
- [Python SDK](https://github.com/flightradar24/fr24-api-sdk-python)

### Internal Documentation
- Service implementation: `/backend/app/services/flightradar24_api_service.py`
- Credit manager: `/backend/app/services/credit_manager.py`
- Alert configuration: `/backend/app/services/alert_service.py`

### Monitoring Dashboard
- Credit usage: http://localhost:3000/dashboard
- API status: http://localhost:9000/api/v1/tracking/sources/status
- Celery tasks: http://localhost:5555 (Flower, if configured)

## Security Considerations

1. **API Keys**
   - Never commit API keys to version control
   - Use environment variables or secrets management
   - Rotate keys periodically

2. **Rate Limiting**
   - Respect FR24 rate limits
   - Implement exponential backoff
   - Monitor for 429 responses

3. **Data Privacy**
   - Cache only non-sensitive data
   - Clear cache on errors
   - Log minimal personal information

## Future Enhancements

1. **Advanced Credit Optimization**
   - Machine learning for usage prediction
   - Dynamic interval adjustment based on patterns
   - Multi-tier caching strategy

2. **Enhanced Monitoring**
   - Grafana dashboard for credit usage
   - Predictive alerts before limits
   - Cost-per-operation tracking

3. **Data Source Optimization**
   - Intelligent source selection by data type
   - Parallel queries to multiple sources
   - Historical data compression

## Conclusion

The FR24 API migration provides more reliable and comprehensive flight data while managing costs through intelligent credit management. The system automatically adapts to usage patterns and provides clear visibility into credit consumption, ensuring sustainable operation within the Explorer plan limits.
