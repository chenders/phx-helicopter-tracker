# FR24 API Credit Optimization

## Problem
The credit usage chart showed excessive API consumption, with over 1,000 requests per day at peak.

## Analysis
The high credit consumption was primarily from:
1. **Live flight monitoring** (`monitor-complete-flights`) - Every 5 minutes (288 calls/day)
2. **Track downloads** (`download-discovered-tracks`) - Every minute (1,440 calls/day)
3. **Pattern detection** - Does NOT use API credits (only analyzes database)

## Changes Made

### Disabled Tasks
- **monitor-complete-flights**: DISABLED completely
  - Was checking for active flights every 5 minutes
  - This was the main source of live tracking credits
  - 288 API calls/day eliminated

### Reduced Frequency
- **download-discovered-tracks**:
  - FROM: Every minute with 20 flights/batch
  - TO: Every hour with 5 flights/batch
  - Reduction: 1,440 → 24 calls/day (98% reduction)

### Kept As-Is
- **discover-phoenix-pd-flights**: Daily (important for tracking)
- **detect-abnormal-patterns**: Daily (no API credits used)

## Credit Usage Comparison

### Before Optimization
- Live monitoring: 288 calls/day × 10 credits = 2,880 credits
- Track downloads: 1,440 calls/day × 20 credits = 28,800 credits
- Flight discovery: 1 call/day × 50 credits = 50 credits
- **Total: ~31,730 credits/day**

### After Optimization
- Live monitoring: 0 (disabled)
- Track downloads: 24 calls/day × 20 credits = 480 credits
- Flight discovery: 1 call/day × 50 credits = 50 credits
- **Total: ~530 credits/day**

### Monthly Impact
- **Before**: ~951,900 credits/month (143% of limit - would exhaust)
- **After**: ~15,900 credits/month (2.4% of limit)
- **Savings**: 936,000 credits/month

## What Still Works
- Daily discovery of new Phoenix PD flights
- Hourly download of flight tracks for discovered flights
- All pattern analysis and reporting (uses local data)
- Historical data analysis
- Legal document generation

## What's Disabled
- Real-time/live flight tracking
- 5-minute flight status checks

## Re-enabling Live Tracking
If real-time tracking is needed for specific events, uncomment in `celery_app.py`:
```python
"monitor-complete-flights": {
    "task": "monitor_and_download_complete_flights",
    "schedule": 300.0,  # Every 5 minutes
}
```

## Monitoring Credit Usage
Check current usage:
```bash
docker compose exec backend python -c "
from app.services.flightradar24_api_service import FlightRadar24APIService
import asyncio
async def check():
    service = FlightRadar24APIService()
    await service.initialize()
    status = await service.get_service_status()
    print(status['credit_usage'])
    await service.cleanup()
asyncio.run(check())
"
```