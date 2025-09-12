# Phoenix PD Helicopter Tracker 🚁

**Real-time tracking and analysis of Phoenix Police Department helicopter surveillance operations**

🔗 **Live Demo**: [https://helos.maxandbramble.org](https://helos:phx@helos.maxandbramble.org)  
📍 **Live Tracking**: [https://helos.maxandbramble.org/live](https://helos:phx@helos.maxandbramble.org/live)  
🔑 **Access**: Username: `helos` | Password: `phx`

## 🎯 Project Mission

This system documents Phoenix Police Department helicopter operations to support legal challenges against warrantless aerial surveillance. Following incidents like the ["Alex" skywriting stunt](https://www.phoenixnewtimes.com/news/phoenix-police-chopper-writes-name-alex-in-middle-of-night-22097889) that wasted 2 hours of taxpayer-funded flight time, this project provides comprehensive tracking and analysis tools for accountability.

## ✨ Key Features

### 🗺️ Live Flight Tracking
- **Real-time helicopter positions** from database (updated every 5 minutes)
- **Google Maps integration** showing current and historical flight paths
- **Complete position tracking** - 100% of available flight positions captured
- **Smart API fallback** - Uses FR24 API only when database has no recent data
- **Cost calculator** tracking taxpayer expense at $2,160/hour

### 📊 Comprehensive Dashboard
- **Fleet overview** of all Phoenix PD helicopters (N621FB - N625FB)
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

- 🌐 **Main Application**: http://localhost:9080 (nginx proxy with auth)
- 📡 **Backend API**: http://localhost:8001
- 📚 **API Documentation**: http://localhost:8001/docs
- 🌻 **Task Monitor (Flower)**: http://localhost:5555
- 🗄️ **Database (PostgreSQL/TimescaleDB)**: localhost:5433
- 📦 **Redis**: localhost:6380

## 🛠️ Technology Stack

### Backend
- **FastAPI** (Python 3.11) - High-performance async API
- **PostgreSQL 15** with **TimescaleDB** - Time-series optimized database
- **Celery** + **Redis** - Distributed task processing with beat scheduler
- **SQLAlchemy** 2.0 - Modern ORM with async support
- **Alembic** - Database migration management

### Frontend
- **React 18** with **TypeScript** - Type-safe UI
- **Vite** - Lightning-fast build tool with HMR
- **Tailwind CSS** - Utility-first styling with dark mode
- **React Query** - Server state management and caching
- **Google Maps API** - Interactive mapping with heatmaps
- **Axios** - HTTP client with interceptors

### Infrastructure
- **Docker Compose** - Multi-container orchestration
- **Nginx** - Reverse proxy with basic auth
- **Flower** - Celery task monitoring UI

## 📊 Data Sources

### FlightRadar24 API (Primary)
- ✅ **Production API** with official SDK
- ✅ **Complete flight tracks** - 100% of positions after landing
- ✅ **Live monitoring** - Active flight detection every 5 minutes
- ✅ **666,000 monthly credit limit** with usage tracking
- ✅ **Intelligent caching** to minimize API calls
- ✅ **Rate limiting** protection (60 req/min, 500 req/hour)

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
│   │   ├── api/          # RESTful endpoints
│   │   │   └── endpoints/
│   │   │       ├── live_database.py    # Live tracking from DB
│   │   │       ├── manual_fr24.py      # FR24 import tools
│   │   │       ├── radio.py            # Radio archive API
│   │   │       └── analysis.py         # Pattern analysis
│   │   ├── models/       # SQLAlchemy ORM models
│   │   │   ├── flight_logs.py         # Flight & position data
│   │   │   ├── aircraft.py            # Aircraft registry
│   │   │   └── task_history.py        # Task tracking
│   │   ├── services/     # Business logic
│   │   │   ├── flightradar24_api_service.py  # FR24 integration
│   │   │   ├── flight_tracker.py             # Complete tracking
│   │   │   └── fr24_rate_limiter.py          # API protection
│   │   └── workers/      # Celery background tasks
│   │       ├── flight_tracking_tasks.py  # Monitor & download
│   │       ├── analysis_tasks.py         # Pattern detection
│   │       ├── radio_tasks.py            # Broadcastify sync
│   │       └── celery_app.py            # Beat scheduler
│   └── alembic/          # Database migrations
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Application pages
│   │   │   ├── HomePage.tsx           # Dashboard
│   │   │   ├── LiveTrackingPage.tsx   # Real-time map
│   │   │   ├── RadioPage.tsx          # Radio archives
│   │   │   └── FlightsPage.tsx        # Flight history
│   │   └── hooks/        # Custom React hooks
│   │       └── useRealtimeFlightsDB.ts  # Live data hook
│   └── public/           # Static assets
└── docker-compose.yml    # Container orchestration
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
Overview of current activity, recent flights, fleet status, and key statistics. Shows active helicopters with real-time position updates from the database.

### Live Tracking (`/live`)
Interactive Google Maps display with:
- Real-time helicopter positions
- Flight paths (last 50 positions)
- Hover indicators and surveillance zones
- Cost accumulator
- Smart data source (DB primary, FR24 fallback)

### Radio Archive (`/radio`)
Searchable police radio communications with:
- Transcription search
- Click-to-play at specific timestamps
- Navigation to full recordings
- Download capabilities

### Flight History (`/flights`)
Complete flight log database with:
- Filtering by date, aircraft, patterns
- Detailed flight analysis
- Export capabilities

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

### Near Term
- [ ] **Pattern Recognition ML** - Advanced surveillance detection
- [ ] **Public Records Integration** - Automated FOIA filing
- [ ] **Community Reports** - Crowdsourced incident reporting
- [ ] **Mobile App** - iOS/Android native applications

### Long Term
- [ ] **Multi-city Support** - Expand beyond Phoenix
- [ ] **Legal Document Generator** - Automated case preparation
- [ ] **Public API** - Enable third-party integrations
- [ ] **Real-time Alerts** - Surveillance notification system

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