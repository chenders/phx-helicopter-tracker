# Backend Scripts Directory

This directory contains utility scripts for testing, data import, and system maintenance. These scripts are used for development, debugging, and manual data collection operations.

## Script Categories

### 🚁 Flight Data Import Scripts

#### `import_complete_flights.py`
**Purpose**: Imports complete flight tracks with 100% position capture from FR24 API  
**Usage**: `python import_complete_flights.py`  
**Description**: Main production import script that fetches complete flight paths for Phoenix PD helicopters. Downloads positions every 2 minutes to build comprehensive flight tracks suitable for legal documentation.

#### `import_fr24_area_flights.py`
**Purpose**: Imports all flights within Phoenix area boundaries  
**Usage**: `python import_fr24_area_flights.py --hours 24 --interval 5`  
**Options**:
- `--hours`: Number of hours to look back (default: 24)
- `--interval`: Minutes between position checks (default: 5)
**Description**: Collects flight data for all aircraft in Phoenix area, useful for identifying non-PD surveillance aircraft.

#### `import_fr24_positions.py`
**Purpose**: Imports single position snapshots for active flights  
**Usage**: `python import_fr24_positions.py`  
**Description**: Legacy import script for position snapshots. Replaced by complete flight tracking.

#### `import_recent_flights.py`
**Purpose**: Imports recent flight history for specific aircraft  
**Usage**: `python import_recent_flights.py`  
**Description**: Fetches historical flight data for Phoenix PD helicopters over recent time periods.

#### `import_and_analyze.py`
**Purpose**: Combined import and analysis workflow  
**Usage**: `python import_and_analyze.py`  
**Description**: Imports flight data and immediately runs surveillance pattern analysis.

---

### 🧪 FlightRadar24 API Test Scripts

#### `test_complete_tracking.py`
**Purpose**: Tests the complete flight tracking system  
**Usage**: `python test_complete_tracking.py`  
**Description**: Verifies flight detection, complete track downloads, and credit usage calculations. Essential for confirming the system captures 100% of positions.

#### `test_fr24_flight_tracks.py`
**Purpose**: Tests FR24 flight track endpoint  
**Usage**: `python test_fr24_flight_tracks.py`  
**Description**: Verifies ability to download complete flight tracks with all position points.

#### `test_fr24_search_flights.py`
**Purpose**: Tests FR24 flight search capabilities  
**Usage**: `python test_fr24_search_flights.py`  
**Description**: Tests searching for flights by registration, area, or time period.

#### `test_fr24_api.py` / `test_fr24_api_simple.py`
**Purpose**: Basic FR24 API connectivity tests  
**Usage**: `python test_fr24_api.py`  
**Description**: Validates API authentication and basic endpoint access.

#### `test_fr24_sdk.py` / `test_fr24_sdk_direct.py`
**Purpose**: Tests FR24 SDK integration  
**Usage**: `python test_fr24_sdk.py`  
**Description**: Validates SDK-based data collection methods.

#### `test_fr24_official.py`
**Purpose**: Tests official FR24 API endpoints  
**Usage**: `python test_fr24_official.py`  
**Description**: Validates production API access and rate limiting.

#### `test_fr24_helicopter.py`
**Purpose**: Tests helicopter-specific tracking  
**Usage**: `python test_fr24_helicopter.py`  
**Description**: Focused testing for Phoenix PD helicopter tracking.

#### `test_live_phoenix_pd.py` / `test_live_n623fb.py`
**Purpose**: Live tracking tests for specific aircraft  
**Usage**: `python test_live_phoenix_pd.py`  
**Description**: Real-time tracking validation for Phoenix PD helicopters.

#### `test_fr24_direct.py` / `test_fr24_raw_api.py`
**Purpose**: Direct API endpoint testing  
**Usage**: `python test_fr24_direct.py`  
**Description**: Low-level API testing without SDK wrapper.

#### `test_fr24_parse.py`
**Purpose**: Tests FR24 data parsing logic  
**Usage**: `python test_fr24_parse.py`  
**Description**: Validates parsing of FR24 response formats.

#### `test_complete_fr24_integration.py`
**Purpose**: End-to-end FR24 integration test  
**Usage**: `python test_complete_fr24_integration.py`  
**Description**: Full system test including data collection, storage, and analysis.

---

### 📻 Radio Archive Scripts

#### `test_broadcastify_login.py`
**Purpose**: Tests Broadcastify authentication  
**Usage**: `python test_broadcastify_login.py`  
**Description**: Validates login credentials and session management.

#### `test_broadcastify_detailed.py`
**Purpose**: Detailed Broadcastify API testing  
**Usage**: `python test_broadcastify_detailed.py`  
**Description**: Comprehensive tests for archive access and download.

#### `test_broadcastify_advanced.py`
**Purpose**: Advanced Broadcastify features  
**Usage**: `python test_broadcastify_advanced.py`  
**Description**: Tests complex archive queries and bulk downloads.

#### `test_broadcastify_ajax.py`
**Purpose**: Tests AJAX-based Broadcastify endpoints  
**Usage**: `python test_broadcastify_ajax.py`  
**Description**: Validates dynamic content loading from Broadcastify.

#### `test_radio_download.py`
**Purpose**: Tests radio archive download functionality  
**Usage**: `python test_radio_download.py`  
**Description**: End-to-end test of radio archive retrieval.

#### `test_radio_tasks.py`
**Purpose**: Tests Celery tasks for radio processing  
**Usage**: `python test_radio_tasks.py`  
**Description**: Validates background task execution for radio archives.

#### `test_transcribe_new.py` / `test_transcription_only.py`
**Purpose**: Tests audio transcription pipeline  
**Usage**: `python test_transcribe_new.py`  
**Description**: Validates Whisper-based transcription of radio communications.

---

### 🔧 Utility Scripts

#### `show_api_request.py`
**Purpose**: Display formatted API requests for debugging  
**Usage**: `python show_api_request.py`  
**Description**: Shows exact API calls being made, useful for troubleshooting.

#### `test_config.py`
**Purpose**: Validates system configuration  
**Usage**: `python test_config.py`  
**Description**: Checks environment variables, API keys, and database connections.

#### `test_live_api.py`
**Purpose**: Tests live tracking API endpoints  
**Usage**: `python test_live_api.py`  
**Description**: Validates the live tracking system end-to-end.

#### `test_premium_verify.py` / `test_premium_download.py`
**Purpose**: Tests premium FR24 features  
**Usage**: `python test_premium_verify.py`  
**Description**: Validates access to premium API endpoints and data.

#### `test_download_final.py`
**Purpose**: Final download verification  
**Usage**: `python test_download_final.py`  
**Description**: Comprehensive test of all download capabilities.

---

## Environment Setup

Before running any scripts, ensure:

1. **Environment variables are set**:
   ```bash
   export FR24_API_KEY_PRODUCTION="your_api_key"
   export DATABASE_URL="postgresql://user:pass@localhost/dbname"
   ```

2. **Python dependencies are installed**:
   ```bash
   pip install -r ../requirements.txt
   ```

3. **Database is accessible**:
   ```bash
   docker compose up -d db
   ```

## Running Scripts in Docker

Most scripts can be run inside the Docker container:

```bash
# Run a script in the backend container
docker compose exec backend python scripts/test_complete_tracking.py

# Run import script with parameters
docker compose exec backend python scripts/import_fr24_area_flights.py --hours 6
```

## Important Notes

- **API Credits**: Import scripts consume FR24 API credits. Monitor usage with `test_fr24_official.py`
- **Rate Limiting**: Scripts respect rate limits. Don't run multiple import scripts simultaneously
- **Database Impact**: Import scripts write directly to the database. Test in development first
- **Legal Data**: Scripts marked for "legal documentation" ensure data integrity for court proceedings

## Script Status

- ✅ **Production Ready**: `import_complete_flights.py`, `test_complete_tracking.py`
- ⚠️ **Legacy/Deprecated**: `import_fr24_positions.py` (replaced by complete tracking)
- 🧪 **Testing Only**: All `test_*.py` scripts are for development/debugging

## Support

For issues or questions about these scripts, check:
- Script comments and docstrings
- Backend logs: `docker compose logs backend`
- Database state: `docker compose exec backend python scripts/test_config.py`