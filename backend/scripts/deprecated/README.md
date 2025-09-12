# Deprecated Scripts

⚠️ **WARNING**: These scripts are deprecated and should not be used in production. They remain here for reference only.

## Why These Scripts Are Deprecated

These scripts use outdated methods that have been replaced by more efficient implementations:

1. **Inefficient API Usage**: These scripts made excessive API calls (sampling approach)
2. **Incomplete Data**: Only captured 12.5% of available flight positions
3. **Replaced by Better Methods**: New complete flight tracking system captures 100% of data

## Deprecated Scripts

### `import_fr24_positions.py`
**Status**: ❌ DEPRECATED  
**Replaced by**: `import_complete_flights.py`  
**Why deprecated**: 
- Used sampling approach (positions every 2 minutes)
- Only captured ~12.5% of available data
- Consumed excessive API credits (21,600/month per aircraft)
- New system captures 100% of positions with 90% fewer credits

### `test_fr24_api_simple.py`
**Status**: ❌ DEPRECATED  
**Replaced by**: `test_fr24_api.py`  
**Why deprecated**:
- Oversimplified testing that didn't cover edge cases
- Didn't test rate limiting or error handling
- More comprehensive test available

### `test_fr24_parse.py`
**Status**: ❌ DEPRECATED  
**Replaced by**: Built into main API service  
**Why deprecated**:
- Parsing logic now integrated into service layer
- Standalone parsing tests no longer needed
- Response formats have changed

### `test_fr24_raw_api.py`
**Status**: ❌ DEPRECATED  
**Replaced by**: `test_fr24_official.py`  
**Why deprecated**:
- Used undocumented endpoints
- No proper authentication handling
- Official API test is more reliable

### `test_download_final.py`
**Status**: ❌ DEPRECATED  
**Replaced by**: `test_complete_tracking.py`  
**Why deprecated**:
- Tested old download approach
- Didn't verify complete flight paths
- New test covers entire tracking system

## Migration Guide

If you were using these deprecated scripts, here's how to migrate:

| Old Script | New Alternative | Migration Notes |
|------------|----------------|-----------------|
| `import_fr24_positions.py` | `import_complete_flights.py` | New script captures 100% of positions |
| `test_fr24_api_simple.py` | `test_fr24_api.py` | Use comprehensive test suite |
| `test_fr24_parse.py` | N/A - Integrated | Parsing handled automatically |
| `test_fr24_raw_api.py` | `test_fr24_official.py` | Use official API endpoints |
| `test_download_final.py` | `test_complete_tracking.py` | Test complete system |

## Important Notes

- **DO NOT USE** these scripts for production data collection
- **DO NOT USE** for legal evidence gathering
- These scripts may fail with current API versions
- No support or maintenance will be provided

## If You Need These Functions

The functionality of these deprecated scripts has been incorporated into:

1. **Complete Flight Tracking System**: `app/services/flight_tracker.py`
2. **Celery Tasks**: `app/workers/flight_tracking_tasks.py`
3. **Modern Import Scripts**: `scripts/import_complete_flights.py`

## Removal Timeline

These scripts will be permanently deleted in a future update once all references have been removed from documentation and dependent systems.