# US Cities Helicopter Comparison Project - CLAUDE.md

This file provides guidance to Claude Code when working on a multi-city helicopter tracking and comparison system.

## Project Overview

### Purpose
Track and compare police/government helicopter usage across multiple US cities to identify patterns, costs, and operational differences. Cities include:
- Phoenix, AZ
- Las Vegas, NV
- San Antonio, TX
- Tucson, AZ
- San Diego, CA

### Key Differences from Phoenix PD Project
**REMOVE these features:**
- Police radio transcription (Broadcastify integration)
- Live flight tracking (real-time updates)
- Legal document generation
- Constitutional analysis
- Privacy concern scoring
- Fourth Amendment violation detection

**KEEP these features:**
- FlightRadar24 API integration for historical data
- Flight pattern analysis and visualization
- Cost analysis and comparison
- Abnormal pattern detection
- Search and filtering capabilities
- Data export functionality
- Multi-city comparison dashboards

**NEW features to add:**
- City-to-city comparison metrics
- Population-normalized statistics
- Per-capita cost analysis
- Comparative visualization dashboards
- City ranking and benchmarking
- Temporal comparison across cities

## Technical Stack

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL with PostGIS for geographic data
- **Task Queue**: Celery with Redis
- **Data Source**: FlightRadar24 API (Essential or Business tier)

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Charts**: Recharts or Chart.js
- **3D Visualization**: Cesium.js (optional, can start with 2D maps)

### Infrastructure
- **Containerization**: Docker with docker-compose
- **Reverse Proxy**: Nginx (optional for production)

## Database Schema

### Core Tables

#### cities
```sql
- id (primary key)
- name (Phoenix, Las Vegas, etc.)
- state (AZ, NV, TX, CA)
- population (for per-capita calculations)
- area_sq_miles
- latitude (city center)
- longitude (city center)
- timezone
- active (boolean - whether to track this city)
- created_at
- updated_at
```

#### aircraft
```sql
- id (primary key)
- registration (N-number)
- icao_code (hex identifier)
- city_id (foreign key to cities)
- operator (police department name)
- make
- model
- year_manufactured
- is_active
- hourly_operating_cost (estimated)
- notes
- last_seen
- created_at
- updated_at
```

#### flight_logs
```sql
- id (primary key)
- aircraft_id (foreign key)
- city_id (foreign key)
- flight_id (FR24 flight ID)
- callsign
- departure_time
- arrival_time
- flight_duration_minutes
- departure_airport
- arrival_airport
- max_altitude_feet
- min_altitude_feet
- avg_altitude_feet
- estimated_cost
- fuel_consumed_gallons
- data_source (FR24, manual, etc.)
- raw_data (JSONB - full FR24 response)
- created_at
- updated_at
```

#### flight_positions
```sql
- id (primary key)
- flight_log_id (foreign key)
- aircraft_id (foreign key)
- city_id (foreign key)
- timestamp
- latitude
- longitude
- altitude_feet
- ground_speed_knots
- track_degrees
- vertical_rate
- position_accuracy_meters
- data_source
```

#### abnormal_patterns
```sql
- id (primary key)
- flight_log_id (foreign key)
- city_id (foreign key)
- pattern_type (hovering, circling, grid_search, etc.)
- confidence_score (0.0-1.0)
- detection_metadata (JSONB)
- detected_at
- reviewed (boolean)
- review_notes
- created_at
```

#### city_statistics
```sql
- id (primary key)
- city_id (foreign key)
- date
- total_flights
- total_flight_hours
- total_estimated_cost
- avg_flight_duration_minutes
- unique_aircraft_count
- hovering_events
- circling_events
- night_flights (10pm-6am)
- cost_per_capita (calculated)
- flights_per_capita (calculated)
- created_at
```

### Remove These Tables (from Phoenix PD project)
- radio_archives
- radio_transcriptions
- legal_documents
- legal_precedents
- constitutional_analyses
- privacy_assessments

## FlightRadar24 API Integration

### Aircraft Discovery per City

Each city needs aircraft registration numbers (N-numbers) for their police helicopters. Research sources:

1. **FAA Aircraft Registry** (registry.faa.gov)
   - Search by owner: "[City] Police Department"
   - Example: "Phoenix Police Department", "Las Vegas Metropolitan Police"

2. **Local News Articles**
   - Search: "[City] police helicopter registration number"
   - Often mentioned in incident reports

3. **ADS-B Exchange** (adsbexchange.com)
   - Filter by location and look for government aircraft
   - Note registration numbers over city areas

4. **Freedom of Information Requests**
   - Request aircraft inventory from each police department

### Example Aircraft by City (to be verified)

**Phoenix PD:**
- N621FB, N623FB, N624FB, N625FB (Airbus H125)

**Las Vegas Metro PD:**
- N911WX, N119LV, N911LV (research needed)

**San Antonio PD:**
- Research needed

**Tucson PD:**
- Research needed

**San Diego PD:**
- Research needed

### FR24 API Configuration

Use the same wrapper pattern from Phoenix PD project:

```python
# backend/app/services/flightradar24_api_service.py
class FlightRadar24Service:
    def discover_flights_by_registration(
        self,
        registration: str,
        start_date: datetime,
        end_date: datetime,
        city_id: Optional[int] = None
    ) -> List[Dict]:
        """Discover flights for a specific aircraft"""

    def download_flight_track(
        self,
        flight_id: str,
        city_id: Optional[int] = None
    ) -> Dict:
        """Download complete position data for a flight"""
```

**Rate Limiting:**
- Essential Account: 666,000 credits/month
- 30 requests/minute strict limit
- 3 second minimum delay between requests
- Implement city-aware credit budgeting (divide by number of cities)

## Key Features to Implement

### 1. Multi-City Dashboard

**Components:**
- City selector/filter
- Side-by-side comparison view
- Normalized metrics (per capita, per square mile)
- Time range selector
- Export to CSV/PDF

**Metrics to Display:**
- Total flights (absolute and per capita)
- Total flight hours
- Total estimated costs
- Cost per capita
- Average flight duration
- Fleet size
- Most active hours/days
- Pattern frequencies (hovering, circling)

### 2. Comparative Visualizations

**Charts:**
- Bar charts: Compare cities on any metric
- Line charts: Temporal trends across cities
- Heat maps: Activity density per city
- Scatter plots: Cost vs. flights, population vs. usage

**Maps:**
- Multi-city overview map showing all activity
- Individual city detailed maps
- Comparative flight path overlays

### 3. Search and Filter

**Search across:**
- All cities or specific cities
- Date ranges
- Aircraft types
- Flight patterns (hover, circle, grid)
- Altitude ranges
- Time of day (day vs. night)

**Filter combinations:**
- City + Pattern + Date
- Cost threshold + Duration
- Multiple aircraft selection

### 4. Cost Analysis

**Calculations:**
- City-specific hourly rates (research per department)
- Annual cost projections
- Cost per capita comparisons
- Cost per flight hour
- Comparative efficiency metrics

**Visualizations:**
- Cost trends over time per city
- Cost breakdown by city
- Per-capita cost rankings
- Budget allocation comparisons

### 5. Pattern Detection

**Reuse from Phoenix PD project:**
- Hovering detection (low speed + low movement)
- Circling patterns (repeated turns in area)
- Grid search patterns (systematic coverage)
- Low altitude operations
- Night operations (10pm-6am)

**New comparative patterns:**
- Usage intensity differences
- Operational style differences (hover vs. patrol)
- Response pattern variations

### 6. Data Export

**Export formats:**
- CSV (flights, statistics, comparisons)
- JSON (API-compatible format)
- GeoJSON (for mapping applications)
- PDF reports with charts

**Export scopes:**
- Single city
- Multi-city comparison
- Date range filtered
- Pattern-specific data

## Project Structure

```
helicopter-city-comparison/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints/
│   │   │       ├── cities.py          # City management
│   │   │       ├── aircraft.py        # Aircraft by city
│   │   │       ├── flights.py         # Flight data
│   │   │       ├── comparisons.py     # Cross-city comparisons
│   │   │       ├── patterns.py        # Pattern analysis
│   │   │       ├── statistics.py      # City statistics
│   │   │       └── export.py          # Data export
│   │   ├── models/
│   │   │   ├── city.py
│   │   │   ├── aircraft.py
│   │   │   ├── flight_log.py
│   │   │   ├── flight_position.py
│   │   │   ├── abnormal_pattern.py
│   │   │   └── city_statistics.py
│   │   ├── schemas/
│   │   │   ├── city.py
│   │   │   ├── flight.py
│   │   │   ├── comparison.py
│   │   │   └── statistics.py
│   │   ├── services/
│   │   │   ├── flightradar24_service.py
│   │   │   ├── pattern_detection_service.py
│   │   │   ├── comparison_service.py
│   │   │   └── statistics_service.py
│   │   ├── workers/
│   │   │   ├── celery_app.py
│   │   │   ├── discovery_tasks.py     # Discover flights per city
│   │   │   ├── download_tasks.py      # Download flight tracks
│   │   │   ├── analysis_tasks.py      # Pattern detection
│   │   │   └── statistics_tasks.py    # Generate city stats
│   │   └── core/
│   │       ├── config.py
│   │       └── city_configs.py        # City-specific settings
│   ├── alembic/
│   │   └── versions/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CitySelector.tsx
│   │   │   ├── ComparisonDashboard.tsx
│   │   │   ├── CityMetricsCard.tsx
│   │   │   ├── ComparisonChart.tsx
│   │   │   ├── MultiCityMap.tsx
│   │   │   └── FlightSearch.tsx
│   │   ├── pages/
│   │   │   ├── HomePage.tsx           # Multi-city overview
│   │   │   ├── CityDetailPage.tsx     # Single city deep dive
│   │   │   ├── ComparisonPage.tsx     # Side-by-side comparison
│   │   │   ├── SearchPage.tsx         # Search across cities
│   │   │   ├── PatternsPage.tsx       # Pattern analysis
│   │   │   ├── CostsPage.tsx          # Cost analysis
│   │   │   └── ExportPage.tsx         # Data export
│   │   ├── hooks/
│   │   │   ├── useCities.ts
│   │   │   ├── useFlights.ts
│   │   │   ├── useComparison.ts
│   │   │   └── useStatistics.ts
│   │   ├── types/
│   │   │   ├── city.ts
│   │   │   ├── flight.ts
│   │   │   └── comparison.ts
│   │   └── utils/
│   │       ├── cityColors.ts          # Consistent colors per city
│   │       ├── formatters.ts
│   │       └── calculations.ts
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md
```

## API Endpoints Structure

### Cities
- `GET /api/v1/cities` - List all cities
- `GET /api/v1/cities/{city_id}` - Get city details
- `POST /api/v1/cities` - Add new city (admin)
- `PUT /api/v1/cities/{city_id}` - Update city
- `GET /api/v1/cities/{city_id}/statistics` - City statistics

### Aircraft
- `GET /api/v1/aircraft` - List all aircraft (filterable by city)
- `GET /api/v1/aircraft/{aircraft_id}` - Aircraft details
- `POST /api/v1/aircraft` - Add aircraft
- `GET /api/v1/cities/{city_id}/aircraft` - City's fleet

### Flights
- `GET /api/v1/flights` - Search flights (multi-city capable)
- `GET /api/v1/flights/{flight_id}` - Flight details with track
- `GET /api/v1/cities/{city_id}/flights` - City's flights

### Comparisons
- `GET /api/v1/comparisons/metrics` - Compare cities on metrics
- `GET /api/v1/comparisons/timeline` - Temporal comparison
- `GET /api/v1/comparisons/costs` - Cost comparison
- `GET /api/v1/comparisons/patterns` - Pattern frequency comparison

### Statistics
- `GET /api/v1/statistics/summary` - Overall summary across cities
- `GET /api/v1/statistics/rankings` - Rank cities by metric
- `GET /api/v1/statistics/trends` - Trend analysis

### Patterns
- `GET /api/v1/patterns` - Search patterns (filterable by city)
- `GET /api/v1/patterns/analysis` - Pattern analysis per city

### Export
- `GET /api/v1/export/flights` - Export flight data
- `GET /api/v1/export/comparison` - Export comparison report
- `GET /api/v1/export/statistics` - Export statistics

## Celery Tasks Schedule

```python
beat_schedule = {
    # Discover flights for each city (staggered to distribute API load)
    "discover-phoenix-flights": {
        "task": "discover_city_flights",
        "schedule": 14400.0,  # Every 4 hours
        "kwargs": {"city_id": 1}  # Phoenix
    },
    "discover-vegas-flights": {
        "task": "discover_city_flights",
        "schedule": 14400.0,
        "kwargs": {"city_id": 2},  # Las Vegas
        "options": {"countdown": 1800}  # Offset by 30 min
    },
    "discover-sanantonio-flights": {
        "task": "discover_city_flights",
        "schedule": 14400.0,
        "kwargs": {"city_id": 3},  # San Antonio
        "options": {"countdown": 3600}  # Offset by 1 hour
    },
    # ... more cities

    # Download discovered tracks (shared across cities)
    "download-discovered-tracks": {
        "task": "download_tracks_for_discovered_flights",
        "schedule": 900.0,  # Every 15 minutes
        "kwargs": {"batch_size": 10}  # Across all cities
    },

    # Pattern detection per city
    "detect-patterns-all-cities": {
        "task": "detect_abnormal_patterns_all_cities",
        "schedule": 86400.0,  # Daily
        "kwargs": {"batch_size": 50}
    },

    # Generate daily statistics per city
    "generate-city-statistics": {
        "task": "generate_daily_city_statistics",
        "schedule": 86400.0,  # Daily at midnight
    },

    # Update comparison metrics
    "update-comparison-metrics": {
        "task": "update_city_comparison_metrics",
        "schedule": 3600.0,  # Hourly
    },
}
```

## Frontend Pages Design

### 1. Home Page - Multi-City Overview
**Layout:**
- Header with city selector (multi-select)
- Key metrics cards (total flights, costs, hours) with sparklines
- Map showing all selected cities with activity heat
- Quick comparison bar charts
- Recent activity feed

### 2. Comparison Page
**Layout:**
- City selector (2-5 cities)
- Metric selector (flights, costs, hours, patterns)
- Time range picker
- Side-by-side metric cards
- Comparison charts (bar, line, radar)
- Normalized vs. absolute toggle
- Export button

### 3. City Detail Page
**Layout:**
- City header with key stats
- Fleet information
- Activity timeline
- Flight map for city
- Pattern breakdown
- Cost breakdown
- Similar to existing Phoenix PD dashboard but city-scoped

### 4. Search Page
**Layout:**
- Advanced search form:
  - City multi-select
  - Date range
  - Pattern type
  - Aircraft type
  - Altitude range
  - Time of day
- Results table with sorting/filtering
- Result count and pagination
- Map view toggle
- Export results button

### 5. Costs Page
**Layout:**
- City selector
- Cost summary cards
- Cost trends chart
- Per-capita comparison
- Cost breakdown by city
- Efficiency metrics
- Annual projection

### 6. Patterns Page
**Layout:**
- City selector
- Pattern type tabs (hover, circle, grid, etc.)
- Frequency comparison across cities
- Pattern map overlay
- Pattern timeline
- Detection confidence scores

## Development Workflow

### Initial Setup

1. **Create Project Structure**
```bash
mkdir helicopter-city-comparison
cd helicopter-city-comparison
mkdir -p backend/app/{api/endpoints,models,schemas,services,workers,core}
mkdir -p frontend/src/{components,pages,hooks,types,utils}
```

2. **Initialize Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install fastapi sqlalchemy alembic psycopg2-binary celery redis requests
pip freeze > requirements.txt
```

3. **Initialize Frontend**
```bash
cd frontend
npm create vite@latest . -- --template react-ts
npm install react-router-dom @tanstack/react-query axios recharts
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

4. **Setup Database**
```bash
# Create PostgreSQL database
docker run -d --name helicopter-cities-db \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=helicopter_cities \
  -p 5432:5432 \
  postgis/postgis:15-3.3
```

5. **Create Initial Migration**
```bash
cd backend
alembic init alembic
# Edit alembic.ini and alembic/env.py
alembic revision --autogenerate -m "Initial schema"
alembic upgrade head
```

### Data Population

1. **Add Cities**
```python
# Create script: backend/scripts/seed_cities.py
cities = [
    {"name": "Phoenix", "state": "AZ", "population": 1600000, ...},
    {"name": "Las Vegas", "state": "NV", "population": 650000, ...},
    {"name": "San Antonio", "state": "TX", "population": 1500000, ...},
    {"name": "Tucson", "state": "AZ", "population": 550000, ...},
    {"name": "San Diego", "state": "CA", "population": 1400000, ...},
]
```

2. **Research and Add Aircraft**
```python
# backend/scripts/seed_aircraft.py
# Research each city's police helicopter fleet
# Add N-numbers and aircraft details
```

3. **Trigger Initial Discovery**
```bash
# Use FR24 API to discover historical flights
# Start with 30-day lookback
curl -X POST http://localhost:8000/api/v1/tasks/discover-all-cities?days_back=30
```

### Reusable Components from Phoenix PD Project

**Copy and adapt these files:**
- `FlightRadar24Service` - FR24 API wrapper
- Pattern detection algorithms (hovering, circling)
- Cost calculation utilities
- Database models (adapt for multi-city)
- Flight visualization components
- Search and filter logic

**Skip these files:**
- Radio transcription (radio_tasks.py, radio_service.py)
- Legal document generation (legal_tasks.py)
- Constitutional analysis (constitutional_analysis.py)
- Privacy scoring logic
- Live tracking (live_tracking_tasks.py)

## Configuration Management

### City-Specific Settings

```python
# backend/app/core/city_configs.py
CITY_CONFIGS = {
    "phoenix": {
        "name": "Phoenix",
        "timezone": "America/Phoenix",
        "hourly_rate": 2160,  # Estimated cost per hour
        "primary_airport": "DVT",  # Deer Valley
        "coverage_area_radius_miles": 30,
    },
    "las_vegas": {
        "name": "Las Vegas",
        "timezone": "America/Los_Angeles",
        "hourly_rate": 2000,  # Research needed
        "primary_airport": "LAS",
        "coverage_area_radius_miles": 25,
    },
    # ... more cities
}
```

### Environment Variables

```bash
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/helicopter_cities
REDIS_URL=redis://localhost:6379/0
FR24_API_TOKEN=your_token_here
FR24_MONTHLY_CREDIT_LIMIT=666000
SECRET_KEY=your_secret_key

# City-specific (if needed)
PHOENIX_PD_AIRCRAFT=N621FB,N623FB,N624FB,N625FB
VEGAS_PD_AIRCRAFT=N911WX,N119LV,N911LV
# ... more cities
```

## Testing Strategy

### Backend Tests
```python
# tests/test_comparisons.py
def test_compare_cities_metrics():
    """Test city comparison calculations"""

def test_per_capita_normalization():
    """Test population-normalized metrics"""

def test_city_ranking():
    """Test ranking cities by various metrics"""

# tests/test_multi_city_discovery.py
def test_discover_flights_all_cities():
    """Test FR24 discovery across multiple cities"""

def test_credit_allocation():
    """Test fair credit distribution across cities"""
```

### Frontend Tests
```typescript
// src/__tests__/CityComparison.test.tsx
describe('CityComparison', () => {
  it('displays metrics for all selected cities', () => {})
  it('normalizes data when per-capita is selected', () => {})
  it('exports comparison data correctly', () => {})
})
```

## Performance Considerations

### Database Optimization
- Index on `city_id` for all multi-city queries
- Partition `flight_positions` by city if data volume is high
- Materialized views for city statistics
- Caching layer (Redis) for comparison metrics

### API Optimization
- Pagination for all list endpoints
- Field selection (sparse fieldsets)
- Batch endpoints for multi-city queries
- Response compression
- CDN for static assets

### FR24 API Credit Management
- Track credit usage per city
- Dynamic rate limiting based on available credits
- Priority system (primary cities get more credits)
- Alert system for low credits

## Deployment

### Docker Compose Production Setup

```yaml
version: '3.8'
services:
  db:
    image: postgis/postgis:15-3.3
    environment:
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: helicopter_cities
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

  backend:
    build: ./backend
    environment:
      DATABASE_URL: ${DATABASE_URL}
      FR24_API_TOKEN: ${FR24_API_TOKEN}
    depends_on:
      - db
      - redis

  celery:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    depends_on:
      - redis
      - db

  celery-beat:
    build: ./backend
    command: celery -A app.workers.celery_app beat --loglevel=info
    depends_on:
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

volumes:
  postgres_data:
```

## Monitoring and Maintenance

### Key Metrics to Track
- FR24 API credit usage per city
- Database size per city
- Query performance
- Task success rates
- Data freshness (last flight per city)

### Maintenance Tasks
- Weekly: Review FR24 credit usage and adjust rates
- Monthly: Verify aircraft registrations are current
- Quarterly: Update city populations and statistics
- Annually: Review and update hourly cost estimates

## Future Enhancements

### Phase 2 Features
- Add more cities (expand to 10-15 major US cities)
- Weather correlation (flight activity vs. weather)
- Event correlation (sporting events, protests, etc.)
- Predictive analytics (forecast flight patterns)
- Public API for researchers
- Mobile app for iOS/Android

### Advanced Analytics
- Machine learning for pattern classification
- Anomaly detection across cities
- Cost optimization recommendations
- Operational efficiency scoring
- Comparative best practices identification

## Resources and References

### Research Starting Points
- FAA Aircraft Registry: https://registry.faa.gov/aircraftinquiry
- ADS-B Exchange: https://globe.adsbexchange.com
- FlightRadar24 API Docs: https://www.flightradar24.com/premium/api
- Police Department Transparency Portals (per city)
- City Budget Documents (for cost verification)
- Local News Archives (for aircraft information)

### Similar Projects
- Phoenix PD Helicopter Tracker (this project)
- FlightAware Police Aviation Tracking
- ADS-B Exchange Government Aircraft Tracking

## Getting Started Checklist

- [ ] Set up development environment
- [ ] Create database schema
- [ ] Research and document aircraft for each city
- [ ] Set up FR24 API access
- [ ] Implement city management endpoints
- [ ] Implement aircraft management
- [ ] Adapt flight discovery tasks for multi-city
- [ ] Create comparison service
- [ ] Build frontend city selector
- [ ] Build comparison dashboard
- [ ] Implement search across cities
- [ ] Add pattern detection
- [ ] Create cost analysis features
- [ ] Build export functionality
- [ ] Write tests
- [ ] Deploy to production
- [ ] Begin data collection
- [ ] Create documentation
- [ ] Share with stakeholders

## Notes

This project focuses on **comparative analysis** rather than legal advocacy. The goal is to provide transparent, data-driven insights into helicopter operations across different cities to inform public discourse and policy decisions.

Unlike the Phoenix PD project which has a specific legal/privacy focus, this project should maintain a neutral, analytical tone focused on operational efficiency, cost-effectiveness, and comparative patterns.
