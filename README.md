# Phoenix PD Helicopter Tracker 🚁

**Real-time tracking and analysis of Phoenix Police Department helicopter surveillance operations**

🔗 **Live Demo**: [https://helos.maxandbramble.org](https://helos:phx@helos.maxandbramble.org)  

## 🎯 Project Mission

This system documents Phoenix Police Department helicopter operations to support legal challenges against warrantless aerial surveillance. Following incidents like the ["Alex" skywriting stunt](https://www.phoenixnewtimes.com/news/phoenix-police-chopper-writes-name-alex-in-middle-of-night-22097889) that wasted 2 hours of taxpayer-funded flight time, this project provides comprehensive tracking and analysis tools for accountability.

## ✨ Key Features

### 🗺️ Live Flight Tracking
- **Real-time helicopter positions** from database (updated every 5 minutes)
- **2D Google Maps view** with flight paths, heatmaps, and zones
- **3D Cesium globe view** with photorealistic terrain and cinematic flight replay
- **Complete position tracking** - 100% of available flight positions captured
- **Smart API fallback** - Uses FR24 API only when database has no recent data
- **Cost calculator** tracking taxpayer expense at $2,160/hour
- **HUD display** showing speed, altitude, heading during 3D animations

### 📊 Comprehensive Dashboard
- **Fleet overview** of Phoenix PD helicopters:
  - **Active**: N621FB, N623FB, N624FB, N625FB (Airbus H125)
  - **Inactive**: N626FB, N627FB, N628FB
- **Current activity display** with live status updates
- **Flight statistics** including total hours, patterns, and costs
- **Privacy impact scores** rating surveillance intensity (1-5 scale)
- **Historical analysis** with complete flight position data

### 📻 Radio Communications Archive
- **Automated Broadcastify downloads** of Phoenix PD aviation feed (ID: 12145)
- **AI transcription** using OpenAI Whisper (base model)
- **Searchable database** of all radio communications
- **Time-synced playback** with click-to-play at specific timestamps
- **Archive management** with automatic file organization

### 📈 Advanced Analytics
- **Hover detection** identifying stationary surveillance (>2 minutes)
- **Low-altitude tracking** for privacy violations (<1000ft residential)
- **Circling pattern analysis** over neighborhoods
- **Surveillance scoring** (0-1 scale) for each flight
- **Fourth Amendment concern flagging**
- **Cost analysis** per flight and cumulative
- **Abnormal pattern detection** (skywriting, unusual paths)
- **Data quality monitoring** with missing position detection
- **Historical analysis** with trend visualization
- **Geographic heatmaps** showing surveillance concentration
- **Legal document management** for case preparation

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/yourusername/phx-helicopter-tracker.git
cd phx-helicopter-tracker

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your API keys

# Start all services
docker compose up -d

# Initialize database
docker exec phx-helicopter-tracker-backend-1 alembic upgrade head

# View logs
docker compose logs -f
```

### Access Points

- 🌐 **Frontend Application**: http://localhost:3000 (development)
- 🔒 **Production Access**: http://localhost:9080 (nginx proxy with auth)
- 📡 **Backend API**: http://localhost:8001 (internal: 9000)
- 📚 **API Documentation**: http://localhost:8001/docs
- 🌻 **Task Monitor (Flower)**: http://localhost:5555
- 🗄️ **Database (PostgreSQL 15 + PostGIS)**: localhost:5433
- 📦 **Redis**: localhost:6380

## 🛠️ Technology Stack

### Backend
- **FastAPI** (Python 3.11) - High-performance async API
- **PostgreSQL 15** with **PostGIS** - Spatial database with geographic queries
- **Celery** + **Redis** - Distributed task processing with beat scheduler
- **SQLAlchemy** 2.0 - Modern ORM with async support
- **Alembic** - Database migration management
- **FlightRadar24 API** - Official SDK for flight tracking data
- **Whisper AI** - Radio transcription (OpenAI)

### Frontend
- **React 18** with **TypeScript** - Type-safe UI
- **Vite** - Lightning-fast build tool with HMR
- **Tailwind CSS** - Utility-first styling with dark mode
- **React Query** - Server state management and caching
- **Google Maps API** - Interactive 2D mapping with heatmaps
- **Cesium** - Photorealistic 3D globe visualization with terrain
- **Recharts** - Data visualization and analytics charts
- **Leaflet** - Lightweight mapping library
- **Axios** - HTTP client with interceptors
- **Socket.io** - Real-time WebSocket communication

### Infrastructure
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy with basic auth
- **Flower** - Celery task monitoring UI
- **Playwright** - End-to-end testing framework

## 📊 Data Sources

### FlightRadar24 API (Primary)
- ✅ **Essential Account** with official SDK
- ✅ **Complete flight tracks** - 100% of positions after landing
- ✅ **Live monitoring** - Active flight detection every 5 minutes
- ✅ **666,000 monthly credit limit** with usage tracking
- ✅ **Intelligent caching** to minimize API calls
- ✅ **Rate limiting** protection (30 req/min, 3 second minimum delay)
- ✅ **Historical access** - 2 years (730 days) of flight data
- ✅ **Export formats** - CSV and KML support

### Broadcastify Radio Archives
- Phoenix PD aviation feed (Feed ID: 12145)
- Automated hourly downloads with retry logic
- MP3 audio files with metadata preservation
- Whisper AI transcription processing

### Public Records (Planned)
- Arizona Open Records Law requests
- Flight logs and dispatch records
- Maintenance and operational costs
- Standard Operating Procedures

## 🏗️ Architecture

```
phx-helicopter-tracker/
├── backend/
│   ├── app/
│   │   ├── api/endpoints/              # RESTful API endpoints
│   │   │   ├── aircraft.py            # Aircraft fleet management
│   │   │   ├── flights.py             # Flight search & detail
│   │   │   ├── flight_redownload.py   # Re-fetch flight data
│   │   │   ├── live_database.py       # Real-time tracking from DB
│   │   │   ├── tracking.py            # Flight tracking control
│   │   │   ├── radio.py               # Radio archive API
│   │   │   ├── analysis.py            # Flight analysis
│   │   │   ├── patterns.py            # Pattern detection
│   │   │   ├── legal.py               # Legal document management
│   │   │   ├── task_monitoring.py     # Task status & monitoring
│   │   │   ├── data_sources.py        # Data source info
│   │   │   ├── rate_limit_status.py   # FR24 API status
│   │   │   ├── logs.py                # System logs
│   │   │   └── config.py              # Configuration
│   │   ├── models/                    # SQLAlchemy ORM models
│   │   │   ├── flight_logs.py         # Flight records
│   │   │   ├── flight_positions.py    # GPS positions
│   │   │   ├── flight_discoveries.py  # FR24 discoveries
│   │   │   ├── aircraft.py            # Aircraft registry
│   │   │   ├── abnormal_patterns.py   # Pattern detections
│   │   │   ├── task_history.py        # Celery task tracking
│   │   │   └── legal.py               # Legal documents
│   │   ├── services/                  # Business logic layer
│   │   │   ├── flightradar24_api_service.py  # FR24 API wrapper
│   │   │   ├── fr24_rate_limiter.py          # Rate limit protection
│   │   │   ├── flight_tracker.py             # Complete tracking
│   │   │   ├── tracking_service.py           # Track coordination
│   │   │   ├── elevation_service.py          # Terrain elevation
│   │   │   ├── cache_service.py              # Redis caching
│   │   │   ├── websocket_manager.py          # Real-time updates
│   │   │   └── data_integrity_service.py     # Data validation
│   │   └── workers/                   # Celery background tasks
│   │       ├── celery_app.py                 # Celery + Beat scheduler
│   │       ├── flight_discovery_tasks.py     # Discover new flights
│   │       ├── flight_tracking_tasks.py      # Download tracks
│   │       ├── analysis_tasks.py             # Pattern analysis
│   │       ├── abnormal_pattern_tasks.py     # Detect anomalies
│   │       ├── radio_tasks.py                # Broadcastify sync
│   │       ├── legal_tasks.py                # Legal processing
│   │       ├── data_import_tasks.py          # Bulk imports
│   │       └── data_maintenance_tasks.py     # Cleanup & optimization
│   ├── alembic/                       # Database migrations
│   └── scripts/                       # Utility scripts
│       ├── backup_database.sh         # Database backups
│       └── redownload_flights.py      # Batch redownload
├── frontend/
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── FlightVisualization3DCesiumFixed.tsx  # 3D globe
│   │   │   ├── LiveMap.tsx                           # 2D tracking
│   │   │   └── [other components]
│   │   ├── pages/                     # Application pages
│   │   │   ├── HomePage.tsx                  # Dashboard
│   │   │   ├── LiveTrackingPage.tsx          # Real-time map
│   │   │   ├── FlightSearchPage.tsx          # Search flights
│   │   │   ├── FlightDetailPage.tsx          # Flight detail + 3D
│   │   │   ├── RadioPage.tsx                 # Radio archives
│   │   │   ├── PatternAnalysisPage.tsx       # Pattern detection
│   │   │   ├── AbnormalPatternsPage.tsx      # Anomalies
│   │   │   ├── CostAnalysisPage.tsx          # Cost tracking
│   │   │   ├── HistoricalAnalysisPage.tsx    # Trends
│   │   │   ├── LegalDocumentsPage.tsx        # Legal docs
│   │   │   ├── DataSourcesPage.tsx           # Source info
│   │   │   ├── DataQualityPage.tsx           # Quality metrics
│   │   │   ├── TaskMonitoringPage.tsx        # Task status
│   │   │   └── LogsPage.tsx                  # System logs
│   │   └── hooks/                     # Custom React hooks
│   └── public/                        # Static assets
├── docker-compose.yml                 # Container orchestration
├── scripts/                           # System scripts
│   ├── backup_database.sh             # Automated backups
│   └── monitor_backups.sh             # Backup monitoring
└── data/                              # Data storage (gitignored)
    ├── radio/                         # Radio recordings
    └── [other data files]
```

## 🔍 Complete Flight Tracking System

The system uses a sophisticated approach to capture 100% of available flight positions:

### Monitoring Strategy
1. **Active Flight Detection** (every 5 minutes)
   - Polls FR24 API for Phoenix area flights
   - Identifies new takeoffs and landings
   - Tracks Phoenix PD fleet specifically

2. **Complete Track Download** (on landing)
   - Downloads entire flight path when aircraft lands
   - Captures all available positions (5-15 second intervals)
   - Stores in TimescaleDB for efficient time-series queries

3. **Missed Flight Recovery** (daily)
   - Scans for any missed flights in last 24 hours
   - Downloads complete tracks retroactively
   - Ensures no data gaps in surveillance record

### Data Completeness
- **Before**: Sample-based tracking (12.5% of positions)
- **Now**: Complete tracking (100% of available positions)
- **Result**: Legally defensible surveillance evidence

## 📱 Key Pages

### Dashboard (`/`)
Overview of current activity, recent flights, fleet status, and key statistics with real-time updates.

### Live Tracking (`/live`)
Interactive 2D Google Maps display with real-time helicopter positions, flight paths, and surveillance zones.

### Flight Search (`/flights`)
Advanced search interface with filtering by date, aircraft, patterns, and surveillance indicators.

### Flight Detail (`/flights/:id`)
Comprehensive flight analysis with:
- **2D map view** - Traditional Google Maps with flight path
- **3D Cesium view** - Photorealistic globe with terrain and cinematic replay
- **HUD display** - Real-time speed, altitude, heading during animation
- Pattern analysis and surveillance scoring
- Position-by-position timeline
- Data quality indicators

### Radio Archive (`/radio`)
Searchable police radio communications with AI transcription, click-to-play, and audio downloads.

### Pattern Analysis (`/patterns`)
Detection and visualization of flight patterns including hover events, circling, and low-altitude segments.

### Abnormal Patterns (`/abnormal-patterns`)
Anomaly detection results showing unusual flight behaviors like skywriting or erratic paths.

### Cost Analysis (`/cost`)
Financial impact tracking with per-flight costs, cumulative expenses, and budget analysis.

### Historical Analysis (`/historical`)
Long-term trend visualization with charts, statistics, and pattern evolution over time.

### Legal Documents (`/legal`)
Case preparation tools with document storage, precedent references, and constitutional analysis.

### Data Sources (`/data-sources`)
Information about FlightRadar24 API, Broadcastify, and other data providers with usage statistics.

### Data Quality (`/data-quality`)
Monitoring dashboard showing data completeness, missing positions, and quality metrics.

### Task Monitoring (`/tasks`)
Celery task status, execution history, and background job monitoring via Flower integration.

### System Logs (`/logs`)
Real-time application logs with filtering and search capabilities.

## 🤝 Contributing

We welcome contributions! Areas of focus:

- 🔧 **Backend**: API endpoints, data processing, analysis algorithms
- 🎨 **Frontend**: UI components, visualizations, mobile responsiveness
- 📊 **Analytics**: Pattern detection, ML models, statistical analysis
- 📚 **Documentation**: Legal research, case studies, user guides

### Development Setup

```bash
# Backend development
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000

# Frontend development
cd frontend
npm install
npm run dev

# Run tests
pytest backend/
npm test frontend/
```

## 📜 Legal Framework

This project supports constitutional challenges based on:

- **Fourth Amendment** protections against warrantless surveillance
- **Leaders v. Baltimore PD** (2022) - Persistent aerial surveillance ruling
- **Carpenter v. United States** (2018) - Location privacy precedent
- **Kyllo v. United States** (2001) - Technology-enhanced surveillance
- **Florida v. Riley** (1989) - Helicopter surveillance limitations

## 🔒 Privacy & Security

- All data collection uses publicly available sources
- No personal information is stored or tracked
- HTTPS encryption with nginx proxy
- Basic authentication protects the application
- Environment-based configuration for sensitive data

## 🗺️ Roadmap

### Completed ✅
- [x] **Complete flight tracking** - 100% position capture
- [x] **3D Cesium visualization** - Photorealistic globe with terrain
- [x] **Radio transcription** - AI-powered audio-to-text
- [x] **Pattern detection** - Hover, circling, low-altitude
- [x] **Cost analysis** - Financial impact tracking
- [x] **Legal document management** - Case preparation tools
- [x] **Data quality monitoring** - Completeness tracking
- [x] **Task monitoring** - Background job visibility

### Near Term
- [ ] **Enhanced ML patterns** - Deep learning for anomaly detection
- [ ] **Public records integration** - Automated FOIA filing
- [ ] **Community reports** - Crowdsourced incident reporting
- [ ] **Mobile app** - iOS/Android native applications
- [ ] **Real-time alerts** - Push notifications for surveillance events
- [ ] **Export improvements** - PDF reports, KML exports

### Long Term
- [ ] **Multi-city support** - Expand beyond Phoenix
- [ ] **Public API** - Enable third-party integrations
- [ ] **Automated legal briefs** - AI-generated case documents
- [ ] **Neighborhood analytics** - Per-area surveillance metrics

## 📄 License

This project is open source to promote government transparency and accountability. See [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Phoenix residents documenting surveillance
- Civil liberties organizations providing legal guidance
- FlightRadar24 for comprehensive flight data access
- Open source community for tools and libraries
- Journalists exposing surveillance abuse

---

**Built for accountability. Powered by transparency. Fighting for privacy.**

*If you're experiencing helicopter surveillance in Phoenix, this tool helps document it for legal action.*
