# Phoenix Police Helicopter Surveillance Tracking System

## Overview
Comprehensive helicopter surveillance tracking system designed to document Phoenix Police Department helicopter operations for legal case preparation. This system collects, analyzes, and documents flight patterns to identify potential Fourth Amendment violations and support legal action against warrantless aerial surveillance.

## Current Features

### Data Collection & Integration
- **FlightRadar24 Integration**: Historical flight data import (KML/CSV) with Gold subscription access
- **Police Radio Archives**: Automated download and transcription of Phoenix PD radio communications
- **Aircraft Registry**: Complete Phoenix PD fleet tracking (N621FB through N625FB - Airbus H125 helicopters)
- **Multi-source Data Import**: Support for FR24, ADS-B, and manual data entry

### Analysis & Documentation
- **Flight Pattern Analysis**: Automated detection of:
  - Hovering events and duration
  - Low-altitude segments (privacy concerns)
  - Circling patterns over neighborhoods
  - Surveillance scoring (0-1 scale)
- **Privacy Impact Assessment**: 5-level concern rating for each flight
- **Cost Analysis**: Automated calculation at $2,160/hour operating cost
- **Legal Document Generation**: Export-ready reports for lawsuit preparation

### Radio Communications
- **Broadcastify Integration**: Automated archive downloading
- **AI Transcription**: OpenAI Whisper-based transcription (base model)
- **Searchable Archive**: Full-text search across all transcriptions
- **Audio Playback**: In-browser playback with synchronized transcripts

### Technical Infrastructure
- **Real-time WebSocket Support**: For live tracking capabilities
- **Background Task Processing**: Celery workers for automated data collection
- **Time-series Optimization**: TimescaleDB for efficient flight position storage
- **Database Migrations**: Alembic for version-controlled schema changes

## Tech Stack

### Backend
- **Framework**: FastAPI (Python 3.11) with async/await
- **Database**: PostgreSQL 15 with TimescaleDB
- **Task Queue**: Celery with Redis
- **Migrations**: Alembic for database versioning
- **API Integration**: FR24 official API & SDK

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **HTTP Client**: Axios

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **Task Monitoring**: Flower (Celery monitoring)
- **Development**: Hot-reload enabled

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local frontend development)
- Python 3.11+ (for local backend development)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd phx-pd-helicopter-tracker
```

2. **Start all services**
```bash
docker compose up -d
```

3. **Initialize the database**
```bash
docker exec phx-pd-helicopter-tracker-backend-1 python init_database.py
```

4. **Apply database migrations**
```bash
docker exec phx-pd-helicopter-tracker-backend-1 alembic upgrade head
```

## Service Endpoints

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8001
- **API Documentation**: http://localhost:8001/docs
- **Flower (Task Monitor)**: http://localhost:5556
- **Database**: localhost:5433
- **Redis**: localhost:6380

## Development

### Backend Development
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 9000
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations
```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### Running Tests
```bash
# Backend tests
cd backend && pytest

# Frontend tests
cd frontend && npm test
```

## Data Sources

### FlightRadar24
- Gold subscription required
- Up to 1 year of historical data
- KML and CSV export formats
- 500,000 monthly API credit limit

### Broadcastify
- Phoenix Police radio archives
- Feed ID: 12145
- Automated MP3 download
- AI transcription processing

### Public Records
- Arizona Open Records Law requests
- Flight logs and dispatch records
- Maintenance and operational data

## Project Structure

```
phx-pd-helicopter-tracker/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── models/       # SQLAlchemy models
│   │   ├── services/     # Business logic
│   │   └── workers/      # Celery tasks
│   ├── alembic/          # Database migrations
│   └── data/             # Local data storage
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   └── services/     # API clients
│   └── public/
├── data/
│   └── radio/
│       └── phoenix_pd/   # Radio archives
└── docker-compose.yml
```

## Key Features in Detail

### Flight Analysis
- Automatic pattern detection for surveillance activities
- Hover detection (> 2 minutes in same location)
- Low altitude tracking (< 1000ft over residential)
- Circling pattern identification
- Privacy impact scoring

### Radio Archive System
- Scheduled downloads every 4 hours (configurable)
- Whisper AI transcription
- Timestamped segments
- Full-text search capability
- Storage growth tracking

### Legal Documentation
- Constitutional analysis framework
- Case precedent tracking
- Evidence compilation
- Export formats for legal filing

## Configuration

### Environment Variables
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/phoenix_helicopters

# Redis
REDIS_URL=redis://redis:6379

# FlightRadar24 API
FR24_API_KEY_PRODUCTION=your_api_key
FR24_API_KEY_SANDBOX=your_sandbox_key  # optional
FR24_MONTHLY_CREDIT_LIMIT=500000

# Optional
GOOGLE_MAPS_API_KEY=your_key
```

### Scheduled Tasks
All scheduled tasks are currently disabled but can be enabled in `backend/app/workers/celery_app.py`:
- Radio archive downloads
- Transcription processing
- Flight pattern analysis
- Data cleanup

## Contributing

1. Create a feature branch
2. Make changes and test
3. Create database migration if needed
4. Update documentation
5. Submit pull request

## Legal Notice

This system is designed for lawful monitoring of publicly available information to document potential constitutional violations. All data collection complies with applicable laws and regulations.

## License

[License Type] - See LICENSE file for details

## Support

For issues or questions, please open a GitHub issue or contact the development team.

## Roadmap

- [ ] Real-time ADS-B integration
- [ ] Advanced pattern recognition ML models
- [ ] Mobile application
- [ ] Public dashboard for community access
- [ ] Integration with legal case management systems
