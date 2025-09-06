# Phoenix PD Helicopter Tracker - API Endpoints Documentation

## Base URL
- Development: `http://localhost:8001/api`
- Production: TBD

## Authentication
- Currently no authentication required (development mode)
- Future: JWT token-based authentication

## API Router Structure

The main API router (`/api`) includes 8 sub-routers:
- `/api/aircraft` - Aircraft management
- `/api/flights` - Flight data and positions  
- `/api/tracking` - Live tracking and alerts
- `/api/analysis` - Pattern and cost analysis
- `/api/legal` - Legal documents and constitutional analysis
- `/api/data-sources` - Data import and source management
- `/api/historical` - Historical data import from FlightRadar24
- `/api/tasks` - Celery task monitoring

---

## 🚁 Aircraft Management (`/api/aircraft`)

### Base Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get list of aircraft with filtering (pagination, Phoenix PD only, active only, search) |
| POST | `/` | Create new aircraft record |
| GET | `/{aircraft_id}` | Get specific aircraft by ID |
| PUT | `/{aircraft_id}` | Update aircraft information |
| DELETE | `/{aircraft_id}` | Delete aircraft record |

### Lookup Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/registration/{registration}` | Get aircraft by registration number |
| GET | `/icao/{icao_code}` | Get aircraft by ICAO code |
| GET | `/phoenix-pd/active` | Get all active Phoenix PD aircraft |

### Advanced Filtering
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/capabilities/filter` | Filter aircraft by capabilities (FLIR, spotlight, loudspeaker) |
| POST | `/{aircraft_id}/update-last-seen` | Update aircraft last seen timestamp |

---

## ✈️ Flight Data Management (`/api/flights`)

### Flight Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/logs` | Get flight logs with filtering (date range, aircraft, surveillance score) |
| POST | `/logs` | Create new flight log |
| GET | `/logs/{flight_id}` | Get specific flight log by ID |
| GET | `/logs/flight-id/{flight_id_str}` | Get flight log by flight ID string |
| PUT | `/logs/{flight_id}` | Update flight log |
| DELETE | `/logs/{flight_id}` | Delete flight log |
| GET | `/logs/recent/{hours}` | Get recent flights within specified hours |
| GET | `/logs/{flight_id}/with-positions` | Get flight log with all position data |
| GET | `/logs/surveillance/high-risk` | Get high surveillance likelihood flights |

### Flight Positions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/positions` | Get flight positions with filtering |
| POST | `/positions` | Create new flight position |
| POST | `/positions/bulk` | Create multiple flight positions (max 10,000) |
| GET | `/positions/area` | Get positions within geographic area (radius search) |
| GET | `/positions/hovering` | Get positions where aircraft was hovering |
| GET | `/positions/low-altitude` | Get low altitude positions (with residential filter) |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/analysis/cost-summary` | Get cost summary for flights |

---

## 📡 Live Tracking (`/api/tracking`)

### Live Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/live` | Get current live tracking data from FlightRadar24 API |
| GET | `/live/{registration}` | Get live data for specific aircraft |
| POST | `/live/refresh` | Manually refresh tracking data |

### Alerts Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts` | Get tracking alerts with filtering |
| POST | `/alerts/{alert_id}/acknowledge` | Acknowledge alert |
| POST | `/alerts/{alert_id}/resolve` | Mark alert as resolved |

### Subscriptions
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/subscriptions` | Get tracking subscriptions |
| POST | `/subscriptions` | Create tracking subscription |
| DELETE | `/subscriptions/{subscription_id}` | Delete subscription |

### Status & Configuration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get aircraft tracking status |
| GET | `/status/{registration}` | Get specific aircraft status |
| GET | `/stats` | Get tracking system statistics |
| GET | `/history/{registration}` | Get aircraft tracking history |
| GET | `/config` | Get tracking configuration |
| POST | `/config/update` | Update tracking configuration |

### Data Sources
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/sources/flightradar24/import` | Import FlightRadar24 data |
| GET | `/sources/status` | Get data sources status |
| GET | `/sources/fr24/credits` | Get FlightRadar24 API credit usage |

---

## 📊 Pattern & Cost Analysis (`/api/analysis`)

### Pattern Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/patterns` | Analyze flight patterns for surveillance detection |
| GET | `/patterns/{analysis_id}` | Get completed pattern analysis results |
| GET | `/patterns` | Get pattern analysis for time range (7d, 30d, 90d) |
| GET | `/hotspots` | Get surveillance hotspots |
| GET | `/patterns/list` | List all saved pattern analyses |

### Cost Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/costs` | Analyze flight costs and operational efficiency |
| GET | `/costs` | Get cost analysis for time range |
| GET | `/costs/summary` | Get quick cost summary |

### Surveillance Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/surveillance` | Analyze surveillance patterns for constitutional violations |

### Geographic & Temporal Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/areas` | Analyze helicopter activity in specific geographic area |
| GET | `/time-patterns` | Analyze temporal patterns (hourly/daily/weekly/monthly) |

### Real-time Monitoring
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/alerts/active` | Get active surveillance alerts |
| POST | `/alerts/test` | Create test surveillance alert |

### Historical Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/historical` | Get comprehensive historical flight analysis |

### Comparative Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/compare` | Compare helicopter activity between two time periods |
| POST | `/export/{analysis_type}` | Export analysis results (JSON/CSV/PDF) |

---

## ⚖️ Legal Support (`/api/legal`)

### Document Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/documents` | Get legal documents with filtering |
| POST | `/documents` | Create new legal document for generation |
| GET | `/documents/{document_id}` | Get specific legal document |
| POST | `/documents/{document_id}/generate` | Generate legal document (async) |
| GET | `/documents/{document_id}/status` | Get document generation status |
| GET | `/documents/{document_id}/download` | Download generated document |
| DELETE | `/documents/{document_id}` | Delete legal document |

### Document Types & Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/document-types` | Get available document types (flight analysis, surveillance reports, etc.) |
| GET | `/templates/public-records-request` | Get public records request template |

### Constitutional Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/constitutional-analyses` | Get constitutional analyses |
| POST | `/constitutional-analyses` | Create new constitutional analysis |
| GET | `/constitutional-analyses/summary` | Get analysis summary statistics |

### Legal Research
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/precedents` | Get legal precedents with filtering |
| POST | `/precedents/{precedent_id}/cite` | Record citation of legal precedent |
| GET | `/strategies/fourth-amendment` | Get Fourth Amendment legal strategies |
| GET | `/strategies/injunctive-relief` | Get injunctive relief strategies |

### Export & Packaging
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/export/case-package` | Export comprehensive legal case package |

---

## 🗄️ Data Sources (`/api/data-sources`)

### General Status
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status` | Get overall data sources status |
| GET | `/integration/status` | Get data integration status |

### File Import
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/import` | Import multiple files (CSV, KML, JSON) with background processing |
| GET | `/import/{import_id}/status` | Get import task status |

### FlightRadar24 Integration
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/flightradar24/status` | Get FR24 integration status |
| POST | `/flightradar24/download` | Download historical data directly from FR24 |
| POST | `/flightradar24/download-multiple` | Download data for multiple aircraft |
| POST | `/flightradar24/import` | Import FR24 data from uploaded file |
| GET | `/flightradar24/imports` | Get FR24 import history |
| GET | `/flightradar24/export/{aircraft_registration}` | Export flight data in FR24 format |

### Phoenix PD Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/phoenix-pd/status` | Get Phoenix PD records integration status |
| POST | `/phoenix-pd/request` | Submit public records request |
| GET | `/phoenix-pd/requests` | Get submitted requests status |

### FAA Records
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/faa/status` | Get FAA records status |
| GET | `/faa/aircraft/{registration}` | Lookup aircraft in FAA registry |
| POST | `/faa/foia-request` | Submit FAA FOIA request |

### Community Data
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/community/status` | Get community data status |
| POST | `/community/contribute` | Submit community-contributed data |

### Integration Management
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/integration/sync-all` | Sync all data sources |
| GET | `/integration/conflicts` | Get data conflicts needing resolution |
| POST | `/integration/resolve-conflict/{conflict_id}` | Resolve data conflict |

---

## 📅 Historical Data Import (`/api/historical`)

### Import Operations
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/import/historical` | Import historical FlightRadar24 data (async) |
| GET | `/import/status/{task_id}` | Get import task status |
| POST | `/import/recent-flights` | Import recent flights for Phoenix PD aircraft |
| DELETE | `/import/cancel/{task_id}` | Cancel running import task |
| GET | `/import/active` | Get all active import tasks |

---

## 📈 Task Monitoring (`/api/tasks`)

### Dashboard & Overview
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/dashboard` | Get complete monitoring dashboard |
| GET | `/history` | Get task execution history |
| GET | `/history/{task_id}` | Get specific task details |

### Events & Metrics
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/events` | Get task events and notable occurrences |
| POST | `/events` | Create manual task event |
| GET | `/metrics` | Get aggregated task metrics |
| GET | `/metrics/{task_name}` | Get metrics for specific task |

### Status & Control
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/status/summary` | Get task status summary |
| GET | `/active` | Get currently active/running tasks |
| GET | `/scheduled` | Get scheduled tasks from Celery beat |
| GET | `/queues` | Get Celery queue information |
| POST | `/retry/{task_id}` | Retry failed task |

### Maintenance
| Method | Endpoint | Description |
|--------|----------|-------------|
| DELETE | `/purge` | Purge old task history records |

---

## 🔑 Response Formats

### Success Response
```json
{
  "status": "success",
  "data": {
    // Response data
  },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional additional error details
  }
}
```

### Pagination Response
```json
{
  "status": "success",
  "data": {
    "items": [],
    "total": 100,
    "page": 1,
    "per_page": 20,
    "pages": 5
  }
}
```

---

## 📋 Common Query Parameters

### Pagination
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)

### Date Filtering
- `start_date` (ISO 8601): Start date for filtering
- `end_date` (ISO 8601): End date for filtering
- `days` (int): Number of days to look back

### Sorting
- `sort_by` (string): Field to sort by
- `sort_order` (string): "asc" or "desc"

### Filtering
- `search` (string): General search term
- `filters` (JSON): Complex filter object

---

## 🚀 WebSocket Endpoints

### Live Tracking Updates
- URL: `ws://localhost:8001/ws/tracking`
- Subscribe to real-time aircraft position updates

### Alert Notifications
- URL: `ws://localhost:8001/ws/alerts`
- Receive real-time surveillance alerts

---

## 📊 Rate Limiting

### FlightRadar24 API
- Monthly credit limit: 60,000 credits
- Rate limit: 10 requests per second
- Credit costs vary by endpoint

### Local API
- No rate limiting in development
- Production: TBD

---

## 🔧 Development Tools

### API Documentation
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

### Health Check
- GET `/health` - Service health status
- GET `/ready` - Service readiness check

---

## 📝 Notes

1. All timestamps are in UTC unless otherwise specified
2. Geographic coordinates use WGS84 (latitude, longitude)
3. Altitudes are in feet above sea level
4. Speeds are in knots
5. Distances are in nautical miles unless specified
6. Costs are in USD

---

## 🎯 Key Features Summary

### Data Sources Supported
- FlightRadar24 Gold subscription (API & manual import)
- Phoenix PD public records requests
- FAA aircraft registry & FOIA requests
- Community-contributed data

### Analysis Capabilities
- Flight pattern detection (surveillance, hovering, circling)
- Cost analysis with public benefit assessment
- Geographic hotspot identification
- Constitutional violation detection
- Temporal pattern analysis
- Comparative period analysis

### Legal Support
- Automated legal document generation
- Constitutional analysis reports
- Legal precedent research
- Public records request templates
- Case package exports

### Real-time Features
- Live aircraft tracking via FlightRadar24 API
- Surveillance alerts and notifications
- Background task monitoring
- Data integration from multiple sources

---

This comprehensive API supports the legal case against Phoenix PD helicopter surveillance by providing data collection, analysis, and legal document generation capabilities specifically designed for Fourth Amendment litigation.