# Phoenix Helicopter Tracker - Backend

FastAPI backend service for tracking and analyzing Phoenix Police Department helicopter operations.

## 🏗️ Architecture

### Core Components

- **FastAPI Application** (`app/main.py`) - REST API with WebSocket support
- **PostgreSQL 15 + PostGIS** - Spatial database for flight data
- **Celery + Redis** - Distributed task queue for background jobs
- **SQLAlchemy 2.0** - ORM with async support
- **Alembic** - Database migration management

### API Endpoints

Organized in `app/api/endpoints/`:
- `aircraft.py` - Fleet management
- `flights.py` - Flight search and detail
- `flight_redownload.py` - Re-fetch flight data
- `live_database.py` - Real-time tracking
- `tracking.py` - Flight tracking control
- `radio.py` - Radio archive API
- `analysis.py` - Flight analysis
- `patterns.py` - Pattern detection
- `legal.py` - Legal documents
- `task_monitoring.py` - Task status
- `data_sources.py` - Data source info
- `rate_limit_status.py` - FR24 API status
- `logs.py` - System logs
- `config.py` - Configuration

### Background Tasks

Celery workers in `app/workers/`:
- `celery_app.py` - Main Celery app with beat scheduler
- `flight_discovery_tasks.py` - Discover new flights (every 5 min)
- `flight_tracking_tasks.py` - Download complete tracks
- `analysis_tasks.py` - Pattern analysis
- `abnormal_pattern_tasks.py` - Anomaly detection
- `radio_tasks.py` - Broadcastify downloads
- `legal_tasks.py` - Legal document processing
- `data_import_tasks.py` - Bulk data imports
- `data_maintenance_tasks.py` - Database cleanup

### Services Layer

Business logic in `app/services/`:
- `flightradar24_api_service.py` - FR24 API wrapper (USE THIS)
- `fr24_rate_limiter.py` - Rate limit protection
- `flight_tracker.py` - Complete flight tracking
- `tracking_service.py` - Track coordination
- `elevation_service.py` - Terrain elevation
- `cache_service.py` - Redis caching
- `websocket_manager.py` - Real-time updates
- `data_integrity_service.py` - Data validation

## 📦 Database Schema

Key tables (see `app/models/`):
- `flight_logs` - Primary flight records
- `flight_positions` - GPS position points
- `flight_discoveries` - FR24 discovery records
- `aircraft` - Fleet registry
- `abnormal_patterns` - Pattern detections
- `task_history` - Celery task tracking

## 🛠️ Utility Scripts

### Flight Data Management

#### `redownload_flights.py`
**Purpose**: Re-fetch flight data from FR24 API
**Usage**: `docker compose exec backend python scripts/redownload_flights.py`
**Description**: Re-downloads complete flight tracks for flights with missing or incomplete position data. Useful for data quality improvements.

#### `download_historical_flights.py`
**Purpose**: Download historical flight data
**Usage**: `docker compose exec backend python scripts/download_historical_flights.py`
**Description**: Fetches historical flight records for Phoenix PD helicopters within FR24's 2-year retention period.

#### `trigger_full_historical_download.py`
**Purpose**: Initiate comprehensive historical data retrieval
**Usage**: `docker compose exec backend python scripts/trigger_full_historical_download.py`
**Description**: Triggers bulk download of all available historical flight data.

#### `continue_track_downloads.py`
**Purpose**: Resume incomplete track downloads
**Usage**: `docker compose exec backend python scripts/continue_track_downloads.py`
**Description**: Continues downloading tracks for flights where the download was interrupted.

#### `import_demo_flights.py`
**Purpose**: Import demonstration flight data
**Usage**: `docker compose exec backend python scripts/import_demo_flights.py`
**Description**: Loads sample flight data for testing and demonstration purposes.

### Aircraft Monitoring

#### `check_aircraft_activity.py`
**Purpose**: Monitor aircraft activity status
**Usage**: `docker compose exec backend python scripts/check_aircraft_activity.py`
**Description**: Checks current and recent activity for Phoenix PD helicopter fleet.

#### `check_aircraft_activity_summary.py`
**Purpose**: Generate aircraft activity summary
**Usage**: `docker compose exec backend python scripts/check_aircraft_activity_summary.py`
**Description**: Produces summary report of fleet activity patterns and statistics.

### Data Quality & Maintenance

#### `verify_flight_data.py`
**Purpose**: Validate flight data integrity
**Usage**: `docker compose exec backend python scripts/verify_flight_data.py`
**Description**: Checks flight records for completeness, consistency, and accuracy.

#### `update_ground_elevation.py`
**Purpose**: Update terrain elevation data
**Usage**: `docker compose exec backend python scripts/update_ground_elevation.py`
**Description**: Fetches and updates ground elevation data for flight positions using terrain APIs.

#### `download_summary.py`
**Purpose**: Generate download statistics
**Usage**: `docker compose exec backend python scripts/download_summary.py`
**Description**: Creates summary of FR24 API download activity and credit usage.

#### `cleanup_logs.py`
**Purpose**: Clean old log files
**Usage**: `docker compose exec backend python scripts/cleanup_logs.py`
**Description**: Removes outdated log files to free disk space.

---

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Start all services
docker compose up -d

# Check service status
docker compose ps

# View logs
docker compose logs -f backend

# Run database migrations
docker compose exec backend alembic upgrade head

# Access PostgreSQL
docker compose exec db psql -U postgres phoenix_helicopters
```

### Environment Variables

Required environment variables in `backend/.env`:

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/phoenix_helicopters

# Redis
REDIS_URL=redis://redis:6379

# FlightRadar24 API
FR24_API_KEY_PRODUCTION=your_production_api_key
FR24_API_ENVIRONMENT=production
FR24_MONTHLY_CREDIT_LIMIT=666000

# Broadcastify (for radio archives)
BROADCASTIFY_USERNAME=your_username
BROADCASTIFY_PASSWORD=your_password

# Google Maps (for elevation data)
GOOGLE_MAPS_API_KEY=your_google_api_key

# Security
SECRET_KEY=your_secret_key_here
```

## 🗄️ Database Management

### Alembic Migrations

```bash
# Check if models are in sync
docker compose exec backend alembic check

# Generate new migration
docker compose exec backend alembic revision --autogenerate -m "Description"

# Apply migrations
docker compose exec backend alembic upgrade head

# View migration history
docker compose exec backend alembic history

# Rollback one migration
docker compose exec backend alembic downgrade -1
```

### Database Access

```bash
# PostgreSQL shell
docker compose exec db psql -U postgres phoenix_helicopters

# Run SQL query
docker compose exec db psql -U postgres phoenix_helicopters -c "SELECT COUNT(*) FROM flight_logs;"
```

## 🔧 Development

### Running the Backend Locally

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000

# Run tests
pytest

# Format code
black .

# Lint code
ruff .
```

### Running Scripts

```bash
# Run script in Docker
docker compose exec backend python scripts/verify_flight_data.py

# Run script locally
cd backend
python scripts/verify_flight_data.py
```

## 📊 Monitoring

### Task Monitoring with Flower

Access Flower UI at http://localhost:5555 to monitor:
- Active Celery tasks
- Task execution history
- Worker status
- Task metrics

### API Documentation

Interactive API docs available at:
- Swagger UI: http://localhost:8001/docs
- ReDoc: http://localhost:8001/redoc

### System Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Celery worker
docker compose logs -f celery

# Database
docker compose logs -f db
```

## ⚠️ Important Notes

### API Credits & Rate Limiting
- **FR24 API**: 666,000 monthly credits, 30 requests/minute
- **Minimum delay**: 3 seconds between requests
- Monitor usage via `/api/rate-limit-status` endpoint
- Scripts automatically respect rate limits

### Data Integrity
- Always backup before database operations: `/home/phx/phx-helicopter-tracker/scripts/backup_database.sh`
- Flight position data is critical for legal proceedings
- Verify data quality with `verify_flight_data.py`

### Background Tasks
- Flight discovery runs every 5 minutes
- Track downloads trigger on flight completion
- Radio downloads run hourly
- Pattern analysis runs after track download

## 🔒 Security

- Never commit `.env` files to git
- Use environment variables for all secrets
- API keys should have minimal required permissions
- Database backups are stored in `/backups` directory

## 📚 Additional Resources

- Main README: `/home/phx/phx-helicopter-tracker/README.md`
- CLAUDE.md: Project-specific AI assistant instructions
- API Documentation: http://localhost:8001/docs
- Task Monitor: http://localhost:5555