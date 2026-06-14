# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Important System Information

### Database Configuration
- **Database Name**: `phoenix_helicopters`
- **Connection**: PostgreSQL on port 5433 (host) / 5432 (container internal)
- **Access via psql**: `docker compose exec db psql -U postgres phoenix_helicopters`

### Database Management Commands
```bash
# Check if models are in sync with database
docker compose exec backend alembic check

# Generate new migration after model changes
docker compose exec backend alembic revision --autogenerate -m "Description of changes"

# Apply migrations
docker compose exec backend alembic upgrade head

# View migration history
docker compose exec backend alembic history

# Rollback one migration
docker compose exec backend alembic downgrade -1

# Show current migration version
docker compose exec backend alembic current
```

### SQLAlchemy Model Locations
- Models: `backend/app/models/`
- Database session: `backend/app/db/database.py`
- Migrations: `backend/alembic/versions/`
- Alembic config: `backend/alembic.ini`

### Database Schema Reference

#### flight_logs table (PRIMARY flight records)
Key columns: `id`, `aircraft_id`, `flight_id`, `callsign`, `departure_time`, `arrival_time`, `flight_duration_minutes`, `departure_airport`, `arrival_airport`, `max_altitude_feet`, `min_altitude_feet`, `avg_altitude_feet`, `estimated_cost`, `fuel_consumed_gallons`, `data_source`, `raw_data`, `area_coverage`, `hover_locations`, `low_altitude_segments`, `surveillance_types`, `pattern_notes`, `surveillance_likelihood`, `privacy_concern_level`, `legal_notes`, `created_at`, `updated_at`

#### flight_discoveries table (FR24 API discovery records)
Key columns: `id`, `fr24_id`, `registration`, `callsign`, `aircraft_type`, `hex_code`, `departure_time`, `arrival_time`, `origin_airport`, `destination_airport`, `flight_duration_minutes`, `first_seen`, `last_seen`, `discovered_at`, `track_downloaded`, `track_download_attempted_at`, `track_download_error`, `positions_count`, `created_at`, `updated_at`

#### flight_positions table (GPS position records)
Key columns: `id`, `flight_log_id`, `aircraft_id`, `timestamp`, `latitude`, `longitude`, `altitude_feet`, `ground_speed_knots`, `track_degrees`, `vertical_rate`, `is_hovering`, `hover_duration_seconds`, `is_circling`, `circle_radius_feet`, `neighborhood`, `address_nearby`, `land_use_type`, `over_private_property`, `altitude_privacy_concern`, `duration_at_location`, `position_accuracy_meters`, `data_source`

#### aircraft table (Fleet information)
Key columns: `id`, `registration`, `icao_code`, `make`, `model`, `year_manufactured`, `is_phoenix_pd`, `unit_designation`, `has_flir`, `has_spotlight`, `has_loudspeaker`, `max_flight_time_minutes`, `hourly_operating_cost`, `purchase_cost`, `annual_maintenance_cost`, `is_active`, `last_seen`, `created_at`, `updated_at`, `notes`, `operator`

#### abnormal_patterns table (Detected patterns)
Key columns: `id`, `flight_log_id`, `pattern_type`, `confidence_score`, `detection_metadata`, `detected_at`, `reviewed`, `review_notes`, `reviewed_by`, `reviewed_at`, `legal_relevance`, `potential_violation`, `created_at`, `updated_at`

#### Other tables
- `task_history` - Celery task execution history
- `task_events` - Task event logging
- `task_metrics` - Task performance metrics
- `constitutional_analyses` - Legal analysis records
- `legal_documents` - Legal document storage
- `legal_precedents` - Legal precedent references
- `alembic_version` - Database migration tracking

### Phoenix PD Helicopter Fleet
Active Aircraft:
- N621FB - Airbus H125 (active)
- N623FB - Airbus H125 (active)
- N624FB - Airbus H125 (active)
- N625FB - Airbus H125 (active)

Inactive/Former Aircraft:
- N626FB (inactive)
- N627FB (inactive)
- N628FB (inactive)

### Services and Ports
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001 (internal port 9000)
- API Docs: http://localhost:8001/docs
- Database: localhost:5433 (mapped from container's 5432)
- Redis: localhost:6380 (mapped from container's 6379)
- Flower (Celery monitoring): http://localhost:5555
- Nginx proxy: http://localhost:9080

### FR24 API Configuration
- Account Type: Essential Account
- Monthly credit limit: 666,000 credits
- Rate limit: 30 requests/minute (strict)
- Minimum delay between requests: 3 seconds
- Historical data access: 2 years (730 days)
- Export formats: CSV, KML
- API service wrapper: `backend/app/services/flightradar24_api_service.py`

## MANDATORY AUTOMATED PRE-FLIGHT CHECKLIST

**IMPORTANT: Before making ANY code changes or fixing ANY bugs, Claude MUST automatically run this checklist without being prompted. This is not optional.**

### Step 1: Architecture Discovery (ALWAYS DO FIRST)
```bash
# Run these commands AUTOMATICALLY before any debugging:
echo "=== AUTOMATED PRE-FLIGHT CHECKLIST STARTING ==="

# 1. Find all service wrappers and abstractions
echo "Checking for service wrappers..."
find backend -name "*service*.py" -o -name "*wrapper*.py" -o -name "*client*.py" | head -20

# 2. Check for direct API calls that might bypass wrappers
echo "Checking for direct API calls..."
grep -r "requests\.(get|post|put|delete)" backend --include="*.py" | grep -v "test" | head -10

# 3. Find hardcoded URLs and credentials
echo "Checking for hardcoded API URLs..."
grep -r "https://.*api" backend --include="*.py" | grep -v "test" | head -10

# 4. Identify rate limiters and middleware
echo "Checking for rate limiters..."
find backend -name "*rate*limit*.py" -o -name "*throttle*.py"

# 5. Check for existing error patterns
echo "Checking how similar errors are handled..."
grep -r "try:" backend --include="*.py" -A 5 | grep -E "(404|rate|limit|retry)" | head -10
```

### Step 2: Pattern Analysis (BEFORE FIXING ANYTHING)
When encountering an error or bug:
1. **DON'T fix the immediate error first**
2. **DO search for ALL instances of the pattern**
3. **DO check if there's an existing abstraction that should be used**
4. **DO verify other parts of the code handle this correctly**

### Step 3: Root Cause Questions (ASK AUTOMATICALLY)
Before implementing any fix, Claude must answer these internally:
- [ ] Is this a symptom or the root cause?
- [ ] Are there other instances of this same pattern?
- [ ] Is there an existing service/wrapper/abstraction I should use?
- [ ] Will my fix be consistent with the rest of the codebase?
- [ ] Have I checked CLAUDE.md for project-specific patterns?

### Step 4: Systematic Search Commands (RUN AUTOMATICALLY)
```bash
# For any external API issue:
grep -r "SERVICE_NAME" backend --include="*.py" | grep -v test

# For any database issue:
grep -r "model_name\|table_name" backend --include="*.py"

# For any import/module issue:
find backend -name "*.py" -exec grep -l "problematic_import" {} \;
```

### Step 5: Service Architecture Map (BUILD AUTOMATICALLY)
Before making changes, Claude must identify:
```
External Services:
├── FlightRadar24 → flightradar24_api_service.py (USE THIS, NEVER DIRECT CALLS)
│   ├── Rate Limiter: fr24_rate_limiter.py
│   ├── Credit Manager: Built into service
│   └── Auth: Bearer token in service
├── Broadcastify → radio_service.py / radio_tasks.py
├── Google Maps → Direct calls OK (no rate limit)
└── Database → Always use SQLAlchemy models, never raw SQL

Internal Patterns:
├── Background Tasks → Always use Celery (celery_app.py)
├── API Endpoints → FastAPI routers in /api/endpoints/
├── Data Models → SQLAlchemy models in /models/
├── Business Logic → Service files in /services/
└── Async Operations → Always use asyncio with proper context
```

### Step 6: Implementation Checklist (FOLLOW AUTOMATICALLY)
- [ ] Run architecture discovery first
- [ ] Find ALL instances of the pattern/error
- [ ] Check for existing abstractions
- [ ] Use TodoWrite to plan the complete fix
- [ ] Fix ALL instances, not just the reported error
- [ ] Remove any duplicate/redundant code
- [ ] Test the fix comprehensively

### Step 7: Common Pitfalls to Check (AUTOMATICALLY)
- **Multiple implementations of the same service?** → Use the canonical one
- **Direct API calls instead of service wrappers?** → Always use wrappers
- **Hardcoded credentials or URLs?** → Use environment variables
- **Missing error handling?** → Check how similar code handles errors
- **Inconsistent patterns?** → Follow existing patterns in the codebase

## ENFORCEMENT RULES

1. **Claude MUST run the architecture discovery commands at the start of EVERY debugging session**
2. **Claude MUST use TodoWrite to create a systematic plan BEFORE making changes**
3. **Claude MUST search for ALL instances of a pattern, not just fix the visible error**
4. **Claude MUST use existing service wrappers and NEVER make direct API calls to external services**
5. **Claude MUST check for similar implementations before creating new code**
6. **Claude MUST keep SQLAlchemy models in sync with database schema changes**
   - When modifying database schema, ALWAYS update corresponding SQLAlchemy models in `backend/app/models/`
   - When updating SQLAlchemy models, ALWAYS create and run Alembic migrations
   - Verify model-database sync with: `alembic check` and model imports
7. **Claude MUST update tests when modifying related code**
   - When changing any function/endpoint, update its corresponding tests
   - When adding new features, add comprehensive test coverage
   - Run tests after changes: `pytest backend/tests/` or `docker compose exec backend pytest`
   - Ensure all tests pass before considering a task complete
8. **Claude MUST protect flight data from accidental deletion**
   - ALWAYS create a backup before ANY database operation: `/home/phx/phx-helicopter-tracker/scripts/backup_database.sh`
   - Use safety wrapper for dangerous operations: `./backend/scripts/safe_db_operation.sh "command"`
   - NEVER run `docker compose down -v` or delete postgres_data volume without explicit user confirmation
   - NEVER uninstall/purge PostgreSQL packages
   - Before any PostGIS/PostgreSQL updates, create safety backup first
   - If operation might delete flight data, require user to type: "I understand this may DELETE flight data"

## Project Overview

# Background

My brother lives in Phoenix, AZ and spends a lot of time in his backyard. For years now, he has noticed that police
helicopters regularly, without any seeming emergency or reason, fly over his neighborhood (including his yard) in what
appears to be purely surveillance. Last night, he was in his backyard and the helicopter stopped and shined a
light on him, then moved on.

My brother is also a lawyer, and that seems to have been his tipping point for filing a lawsuit against the city in an
attempt to get them to stop surveilling all Phoenix residents for no good reason. In addition, the police have done
things like this, which shows a blatant disregard for professionalism of any
kind: https://www.phoenixnewtimes.com/news/phoenix-police-chopper-writes-name-alex-in-middle-of-night-22097889. That
article says it took about 2 hours to "write" alex with their movements. It seems impossible that in a city the size of
Phoenix, there weren't calls from police requesting assistance from that helicopter that were denied due to this stunt.

# The issue we're trying to solve

To jump start the information collecting process for this upcoming lawsuit, he will need as much data as he can get
about records of the police department helicopters, their routes, their communications, the cost per flight, how they
determine where to go, etc. This will all theoretically be attainable via discovery during the lawsuit, but it would be
ideal if he could find as much of it as possible beforehand from public sources.

I previously asked claude.ai: "Can you suggest information that may be helpful for this kind of lawsuit, using your
knowledge of the kind of data available (public or attainable through discovery)? Please include links or information
about how to get this information in your answer if possible."

# Claude's response

# Challenging Phoenix Police Helicopter Surveillance: A Comprehensive Legal Research Guide

A lawsuit challenging warrantless helicopter surveillance by Phoenix Police Department could set important precedents
for privacy rights and government accountability. Recent events like the unexplained "Alex" skywriting incident over
Maryvale demonstrate the need for oversight of the Phoenix PD's **28-pilot Air Support Unit** operating **5 Airbus H125
helicopters** with advanced surveillance capabilities. This research provides actionable intelligence for mounting an
effective legal challenge.

## Phoenix police helicopter operations: data sources and public records strategy

Phoenix Police Department maintains extensive helicopter operations records that are legally obtainable through
Arizona's robust Open Records Law (A.R.S. § 39-121). The department's **Air Support Unit operates from Phoenix-Deer
Valley Airport**, flying approximately **8,000 hours annually** with 24/7 coverage. Through the Phoenix Police Public
Records Portal (phxpublicsafety.phoenix.gov), you can request flight logs, dispatch records, maintenance logs, pilot
certifications, and Standard Operating Procedures. The portal charges a $5 convenience fee, with typical response times
of 5-10 business days for simple requests.

The most strategic approach involves submitting targeted requests for specific data categories. Flight operations
records should include daily logs showing aircraft identification, flight duration, and general area of operation. *
*Computer Aided Dispatch (CAD) records** reveal response locations and incident types. Budget documents accessible
through Phoenix.gov/budget show the Air Support Unit's annual allocation within the police department's *
*$1.027+ billion budget**. Phoenix City Council meeting minutes, searchable at phoenix.legistar.com, contain discussions about helicopter purchases including the recent **$
18 million fleet modernization** replacing older AS350B3s with new H125 helicopters.

For maximum effectiveness, craft requests that reference known incidents and specific aircraft registration numbers. The
confirmed registration **N624FB** was involved in the July 10, 2025 "Alex" skywriting incident over Maryvale, providing
a concrete starting point for records requests. Contact the Phoenix Police Public Records Unit at (602) 534-1127 or
policepublicrecords@phoenix.gov, with the Arizona Ombudsman-Citizens' Aide available for assistance with disputes.

## Legal precedents create openings for constitutional challenges

The Supreme Court's aerial surveillance framework from California v. Ciraolo (1986) and Florida v. Riley (1989) permits
warrantless observation from navigable airspace, but recent developments offer promising avenues for challenges. The *
*Fourth Circuit's 2022 decision in Leaders of a Beautiful Struggle v. Baltimore Police Department** ruled that
persistent aerial surveillance violates the Fourth Amendment, applying Carpenter v. United States principles to extended
location tracking. This precedent directly supports challenging systematic helicopter patrol patterns over Phoenix
neighborhoods.

Florida v. Riley specifically noted that helicopter surveillance causing **"undue noise, wind, dust, or threat of
injury"** could violate the Fourth Amendment. The New Mexico Supreme Court in State v. Davis (2015) found that
helicopter surveillance at 50 feet violated constitutional rights due to physical intrusiveness. Justice O'Connor's
Riley concurrence emphasized that surveillance below 400 feet might violate reasonable expectations of privacy if such
flights are "sufficiently rare."

Technology enhancement provides another constitutional hook. Kyllo v. United States established that using technology "
not in general public use" to observe home details constitutes a search. Phoenix PD's H125 helicopters equipped with *
*FLIR cameras, digital mapping platforms, and 17-inch touchscreens** for tactical officers exceed naked-eye observation
capabilities, potentially triggering Kyllo protections. The combination of extended hovering, low-altitude operations,
technological enhancement, and pattern surveillance creates multiple Fourth Amendment arguments unavailable in earlier
cases.

## Phoenix Air Support Unit structure reveals accountability gaps

Phoenix PD operates one of the nation's most sophisticated air units with **5 Airbus H125 helicopters, 1 Agusta A109E
twin-engine, and multiple fixed-wing aircraft** including Pilatus PC-12NG surveillance planes. The unit's 28 pilots and
tactical flight officers respond to 12,000+ calls annually, assisting with 2,500 arrests and 400 vehicle pursuits in
2024. Operating costs reach
approximately **$2,160 per flight hour** based on media estimates, with the fleet accumulating $33 million in costs over
recent decades.

The July 10, 2025 "Alex" skywriting incident exemplifies accountability concerns. Helicopter N624FB departed Deer Valley
Airport at 11:30 PM, spent 45 minutes spelling "ALEX" over the predominantly Hispanic Maryvale neighborhood below 2,000
feet, then landed at 1:17 AM after a **1 hour 48-minute flight costing an estimated $2,160**. Phoenix PD never responded
to media inquiries, announced no disciplinary action, and implemented no policy changes following the incident.

Department oversight mechanisms include the Professional Standards Bureau for complaints and a 2021-created Compliance
and Oversight Bureau. However, a June 2024 Department of Justice investigation found patterns of excessive force and
discrimination against communities of color. A city audit recommended fleet reduction to save $3.3 million annually.
Despite transparency portals showing crime statistics and officer-involved shootings, **specific aerial surveillance
policies remain unavailable**, with no community notification requirements for routine helicopter operations.

## Aviation tracking tools provide real-time surveillance documentation

Multiple platforms enable tracking Phoenix police helicopters, with ADS-B Exchange (globe.adsbexchange.com) offering the
most comprehensive coverage. Unlike FlightRadar24 or FlightAware which filter government aircraft, **ADS-B Exchange
provides unfiltered tracking** of all transponder-equipped aircraft. Click the "U" button to display only
military/government traffic, then focus on Phoenix-Deer Valley Airport where police helicopters are based.

Federal Aviation Administration resources supplement real-time tracking. The FAA Aircraft Registry (
registry.faa.gov/aircraftinquiry) provides registration details for all Phoenix PD aircraft. Submit FOIA requests
through faa.gov/foia/foia_request for historical flight records, though processing may take weeks. LiveATC.net streams
Phoenix area air traffic control communications, with helicopter air-to-air frequencies at **123.0250 MHz** for
situational awareness.

Building your own ADS-B receiver for approximately $150-200 using a Raspberry Pi and RTL-SDR dongle provides continuous
monitoring capability and premium access to tracking platforms. Document all observations with timestamps for legal
purposes. Note that police can legally disable ADS-B transponders under 14 CFR 91.225(f)(1) for law enforcement
purposes, making multiple tracking methods essential.

## Civil liberties organizations offer litigation expertise and resources

The **ACLU of Arizona** (602-650-1854) brings direct experience challenging aerial surveillance, having investigated
police drone use statewide and documented Border Patrol helicopter harassment. Legal Director Jared G. Keenan oversees
litigation with four staff attorneys. Their intake process through acluaz.org prioritizes cases with statewide
constitutional impact. The national ACLU successfully challenged Baltimore's aerial surveillance program, with Senior
Policy Analyst Jay Stanley and Senior Staff Attorney Ashley Gorski providing aerial surveillance expertise.

The **Electronic Frontier Foundation** (legal-intake@eff.org) maintains the Atlas of Surveillance database tracking
1,172+ police departments using drones nationwide. Their Street Level Surveillance Hub provides comprehensive
surveillance technology analysis. EFF accepts cases involving novel surveillance technologies with broad constitutional
implications. Senior Policy Analyst Matthew Guariglia specializes in drone surveillance issues.

Arizona-specific resources include the **Arizona Center for Law in the Public Interest** (602-258-8850), with 50+ years
of precedent-setting litigation entirely donor-funded without client fees. ASU's Sandra Day O'Connor College of Law
First Amendment Clinic, directed by Professor James Weinstein with an advisory board including ACLU Arizona's Legal
Director, provides student representation under faculty supervision. The clinic's focus on First Amendment issues aligns
with challenging surveillance's chilling effects on protected activities.

For government accountability support, **Common Cause Arizona** advocates for transparency measures and has fought
attempts to destroy public records. Arizona PIRG focuses on government accountability through grassroots organizing. The
Electronic Privacy Information Center (202-483-1140) filed the first drone surveillance opposition and supports Fourth
Amendment protections through amicus briefs and FOIA litigation.

## Strategic roadmap for mounting the legal challenge

Begin immediately with comprehensive public records requests to Phoenix PD, the City of Phoenix, and Maricopa County
Sheriff using the provided templates. Request flight logs for the past two years, focusing on specific neighborhoods
experiencing heavy surveillance. Include requests for the July 10, 2025 "Alex" incident investigation records.
Simultaneously, set up ADS-B Exchange monitoring to document current flight patterns, preserving all data with
timestamps.

Contact ACLU of Arizona for case intake, emphasizing the statewide constitutional implications and patterns of
discriminatory surveillance in communities of color. Submit parallel intake requests to EFF for technology expertise and
ASU's First Amendment Clinic for local academic support. Build a coalition similar to Baltimore's successful challenge,
identifying affected community members willing to serve as plaintiffs who can demonstrate concrete surveillance harms.

Develop legal arguments extending Carpenter location privacy protections to systematic aerial surveillance, emphasizing
the qualitative difference between occasional overflights and persistent pattern surveillance. Document First Amendment
harms to protest activities and community organizing, particularly in light of DOJ findings about discriminatory
policing. Research Arizona constitutional provisions that may provide stronger privacy protections than federal law.

Focus discovery on obtaining Air Support Unit policies, training materials, and decision-making processes for
deployment. Request data on flight patterns by neighborhood demographics to establish discriminatory impact. Document
physical intrusion effects including noise levels, wind disturbance, and community fear. Gather evidence of technology
capabilities beyond naked-eye observation.

Success requires combining traditional Fourth Amendment arguments with modern privacy frameworks recognizing aggregate
surveillance harms. The Baltimore precedent provides a roadmap, but Phoenix's specific circumstances - including the
unexplained "Alex" incident, DOJ discrimination findings, and sophisticated surveillance fleet - create unique
opportunities for expanding privacy protections. With strategic coordination between civil liberties organizations,
affected communities, and systematic documentation of surveillance practices, this challenge could establish important
precedents limiting warrantless aerial surveillance nationwide.

# End of Claude's response

I have a Gold subscription to https://www.flightradar24.com/. It appears that I have access to up to a year of flight logs for any aircraft, in KML or CSV format. There might also be more useful information they provide. If it appears useful for the purpose of this lawsuit, please try to include it as part of the website.
Please also assume that we obtain everything listed as possible to get under Arizona's Open Records Law.

Assuming that 
- **Backend**: FastAPI (Python 3.12) with PostgreSQL database
- **Frontend**: React 18 with TypeScript, Vite, and Tailwind CSS
- **Infrastructure**: Docker containers with docker compose orchestration

## Development Commands

### Backend Development

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run tests
pytest

# Format code
black .

# Lint code (ruff 0.1.5; config in backend/pyproject.toml [tool.ruff])
ruff check .

# Bug-class gate — logic + async bugs only (F821 undefined names, F811
# redefinitions, F601 dup keys, ASYNC blocking-I/O). Enforced by CI and the
# pre-push hook; must stay green. Does NOT enforce F401/F841/E* (style/noise).
ruff check . --select F,ASYNC --ignore F401,F841
```

### Frontend Development

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint code
npm run lint
```

### Testing Guidelines

#### Backend Testing
```bash
# Run all backend tests
docker compose exec backend pytest

# Run specific test file
docker compose exec backend pytest tests/test_filename.py

# Run with coverage
docker compose exec backend pytest --cov=app --cov-report=term-missing

# Run tests with verbose output
docker compose exec backend pytest -v

# Run only tests matching a pattern
docker compose exec backend pytest -k "test_pattern"
```

#### Frontend Testing
```bash
# Run frontend tests
cd frontend && npm test

# Run with watch mode
cd frontend && npm test -- --watch

# Run with coverage
cd frontend && npm test -- --coverage
```

#### Test Organization
- Backend tests: `backend/tests/`
- Frontend tests: `frontend/src/__tests__/` or alongside components as `.test.tsx` files
- Test fixtures: `backend/tests/fixtures/`
- Test utilities: `backend/tests/utils/`

#### Test Requirements
- ALWAYS update tests when changing code functionality
- Add tests for new features BEFORE marking task complete
- Ensure all tests pass: both existing and new
- Use descriptive test names that explain what is being tested
- Mock external services (FR24 API, etc.) in tests

### Docker Development

```bash
# Start development environment with hot reload
docker compose -f docker-compose.dev.yml up -d

# Start production environment
docker compose up -d

# View logs
docker compose logs -f [service-name]

# Rebuild containers
docker compose build --no-cache
```

## Architecture

### Backend Structure

- `app/main.py` - FastAPI application entry point with CORS middleware
- `app/core/config.py` - Pydantic settings management with environment variable support
- `app/db/database.py` - SQLAlchemy database connection and session management
- `app/api/` - API route modules organized by feature
- `app/models/` - SQLAlchemy ORM models
- `app/schemas/` - Pydantic models for request/response validation
- `app/crud/` - Database operation functions

### Frontend Structure

- `src/main.tsx` - Application entry point with React Query and Router providers
- `src/App.tsx` - Main application component with routing
- `src/components/` - Reusable UI components
- `src/pages/` - Page-level components
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

### Database

PostgreSQL database with initial schema:

- `helicopters` - Fleet information
- `flight_logs` - Operation records
- `maintenance_records` - Maintenance history

Database initialization handled by `init.sql` script.

## Key Technologies and Patterns

### Backend Patterns

- FastAPI async/await patterns for all endpoints
- Pydantic models for data validation and serialization
- SQLAlchemy 2.0 async patterns for database operations
- Dependency injection for database sessions (`get_db()`)
- Environment-based configuration with pydantic-settings

### Frontend Patterns

- React Query for server state management and caching
- React Router for client-side routing
- Custom hooks for business logic abstraction
- Tailwind CSS utility classes for styling
- TypeScript for type safety

### Code Quality Tools

- **Backend**: Black (formatting), Ruff (linting), pytest (testing)
- **Frontend**: ESLint (linting), TypeScript (type checking), Vitest (testing)

#### Lint gate (logic + async bugs)

A scoped ruff gate runs in CI (`.github/workflows/lint.yml`) and at **pre-push**
(`.pre-commit-config.yaml`): `ruff check . --select F,ASYNC --ignore F401,F841`.
It blocks real bugs — undefined names (F821), redefinitions (F811), duplicate
dict keys (F601), and sync/async mismatches (ASYNC, e.g. blocking `open`/`sleep`
in `async` functions) — without nagging about unused imports/vars or style.
Ruff config lives in `backend/pyproject.toml`. Activate locally once with:
`pip install pre-commit && pre-commit install`.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and configure:

- `DATABASE_URL` - PostgreSQL connection string
- `SECRET_KEY` - JWT authentication secret
- `BACKEND_CORS_ORIGINS` - Allowed frontend origins

## Services and Ports

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Database: localhost:5432

## Development Workflow

1. Use docker compose -f docker-compose.dev.yml for development with hot reload
2. Backend changes auto-reload via uvicorn --reload
3. Frontend changes auto-reload via Vite HMR
4. Database persists via Docker volume between restarts

Background:

My brother lives in Phoenix, AZ and spends a lot of time in his backyard. For years now, he has noticed that police
helicopters regularly, without any seeming emergency or reason, fly over his neighborhood (including his yard) in what
appears to be purely surveillance. Last night, he was in his backyard peeing and the helicopter stopped and shined a
light on him, then moved on.

My brother is also a lawyer, and that seems to have been his tipping point for filing a lawsuit against the city in an
attempt to get them to stop surveilling all Phoenix residents for no good reason. In addition, the police have done
things like this, which shows a blatant disregard for professionalism of any
kind: https://www.phoenixnewtimes.com/news/phoenix-police-chopper-writes-name-alex-in-middle-of-night-22097889. That
article says it took about 2 hours to "write" alex with their movements. It seems impossible that in a city the size of
Phoenix, there weren't calls from police requesting assistance from that helicopter that were denied due to this stunt.

The issue we're trying to solve:
To jump start the information collecting process for this upcoming lawsuit, he will need as much data as he can get
about records of the police department helicopters, their routes, their communications, the cost per flight, how they
deteremine where to go, etc. This will all theoretically be attainable via discovery during the lawsuit, but it would be
ideal if he could find as much of it as possible beforehand from public sources. 
