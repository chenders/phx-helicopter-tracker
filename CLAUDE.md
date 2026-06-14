# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repository.

## Project Overview

A data-collection and analysis tool documenting Phoenix PD helicopter surveillance
to support an upcoming civil-rights lawsuit. It ingests FlightRadar24 flight logs,
ADS-B tracks, and Broadcastify radio archives; detects abnormal flight patterns
(hovering, circling, low-altitude passes); transcribes radio traffic; and surfaces
cost, route, and surveillance-likelihood analysis through a web UI.

The full narrative background, data-source strategy, and legal-research brief live
in **[`docs/lawsuit-research.md`](docs/lawsuit-research.md)** — read that for the
"why", not this file.

## Tech Stack

- **Backend**: FastAPI (Python 3.12), SQLAlchemy, Alembic, Celery + Redis
- **Database**: PostgreSQL 15 with TimescaleDB + PostGIS (`timescale/timescaledb-ha:pg15`)
- **Frontend**: React 18 + TypeScript, Vite, Tailwind CSS, React Query, React Router
- **Infra**: Docker Compose; Nginx reverse proxy; Flower for Celery monitoring
- **External services**: FlightRadar24 API, Broadcastify, Google Maps/Tiles, faster-whisper (GPU transcription)

## Git Workflow

- **Never commit or push directly to `main`.** Branch from `dev` (the integration
  branch) for new work: `git checkout -b <type>/<short-desc> dev`. PRs target `dev`.
- Prefer `git pull --rebase`. Stage files by name rather than `git add -A`/`git add .`
  so tool artifacts and secrets don't sneak in.
- Keep PRs scoped to one concern — don't mix unrelated changes (e.g. docs + a worker fix).

## Important System Information

### Database
- **Name**: `phoenix_helicopters` · **User**: `postgres` · **Image**: `timescale/timescaledb-ha:pg15` (TimescaleDB + PostGIS)
- **psql access**: `docker compose exec db psql -U postgres phoenix_helicopters`
- **Model locations**: models `backend/app/models/`, session `backend/app/db/database.py`,
  migrations `backend/alembic/versions/`, config `backend/alembic.ini`

```bash
docker compose exec backend alembic check          # are models in sync with the DB?
docker compose exec backend alembic revision --autogenerate -m "Description"
docker compose exec backend alembic upgrade head    # apply migrations
docker compose exec backend alembic history         # migration history
docker compose exec backend alembic downgrade -1    # roll back one
docker compose exec backend alembic current         # current version
```

### Services and Ports (authoritative — host → container)

| Service | URL / host | Container port |
|---------|-----------|----------------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:8001 | 9000 |
| API docs | http://localhost:8001/docs | 9000 |
| Database | localhost:5433 | 5432 |
| Redis | localhost:6380 | 6379 |
| Flower (Celery) | http://localhost:5555 | 5555 |
| Nginx proxy | http://localhost:9080 | 80 |

### Database Schema Reference

- **`flight_logs`** (PRIMARY flight records): `id`, `aircraft_id`, `flight_id`, `callsign`, `departure_time`, `arrival_time`, `flight_duration_minutes`, `departure_airport`, `arrival_airport`, `max_altitude_feet`, `min_altitude_feet`, `avg_altitude_feet`, `estimated_cost`, `fuel_consumed_gallons`, `data_source`, `raw_data`, `area_coverage`, `hover_locations`, `low_altitude_segments`, `surveillance_types`, `pattern_notes`, `surveillance_likelihood`, `privacy_concern_level`, `legal_notes`, `created_at`, `updated_at`
- **`flight_discoveries`** (FR24 API discovery records): `id`, `fr24_id`, `registration`, `callsign`, `aircraft_type`, `hex_code`, `departure_time`, `arrival_time`, `origin_airport`, `destination_airport`, `flight_duration_minutes`, `first_seen`, `last_seen`, `discovered_at`, `track_downloaded`, `track_download_attempted_at`, `track_download_error`, `positions_count`, `created_at`, `updated_at`
- **`flight_positions`** (GPS position records): `id`, `flight_log_id`, `aircraft_id`, `timestamp`, `latitude`, `longitude`, `altitude_feet`, `ground_speed_knots`, `track_degrees`, `vertical_rate`, `is_hovering`, `hover_duration_seconds`, `is_circling`, `circle_radius_feet`, `neighborhood`, `address_nearby`, `land_use_type`, `over_private_property`, `altitude_privacy_concern`, `duration_at_location`, `position_accuracy_meters`, `data_source`
- **`aircraft`** (fleet): `id`, `registration`, `icao_code`, `make`, `model`, `year_manufactured`, `is_phoenix_pd`, `unit_designation`, `has_flir`, `has_spotlight`, `has_loudspeaker`, `max_flight_time_minutes`, `hourly_operating_cost`, `purchase_cost`, `annual_maintenance_cost`, `is_active`, `last_seen`, `created_at`, `updated_at`, `notes`, `operator`
- **`abnormal_patterns`** (detected patterns): `id`, `flight_log_id`, `pattern_type`, `confidence_score`, `detection_metadata`, `detected_at`, `reviewed`, `review_notes`, `reviewed_by`, `reviewed_at`, `legal_relevance`, `potential_violation`, `created_at`, `updated_at`
- **Other**: `task_history`, `task_events`, `task_metrics` (Celery), `constitutional_analyses`, `legal_documents`, `legal_precedents`, `alembic_version`

### Phoenix PD Helicopter Fleet
- **Active**: N621FB, N623FB, N624FB, N625FB — all Airbus H125
- **Inactive/former**: N626FB, N627FB, N628FB

### FR24 API Configuration
- Essential account · 666,000 credits/month · **30 requests/minute (strict)** · ≥3 s between requests
- Historical access: 2 years (730 days) · Export: CSV, KML
- **Service wrapper** (use this, never direct calls): `backend/app/services/flightradar24_api_service.py`

## Service Architecture Map

```
External services
├── FlightRadar24 → flightradar24_api_service.py  (USE THIS — never direct HTTP; rate-limited + credit-managed)
├── Broadcastify  → radio_service.py / radio_tasks.py
├── Google Maps   → direct calls OK (no rate limit)
└── Database      → SQLAlchemy models only, never raw SQL

Internal layout
├── Background tasks → Celery (app/workers/, celery_app.py)
├── API endpoints    → FastAPI routers in app/api/
├── Data models      → SQLAlchemy in app/models/
├── Schemas          → Pydantic in app/schemas/
└── Business logic    → services in app/services/
```

### Celery queues & workers
Tasks are routed by queue (see `task_routes` in `app/workers/celery_app.py`):
`tracking`, `analysis`, `legal`, `data_import`, `radio`, `scheduler`, `transcription`.
**Transcription runs on dedicated GPU workers** (faster-whisper on CUDA) — the main
worker's `--queues` list governs what it actually consumes. See Common Pitfalls below.

## Development Commands

### Backend
Dev uses **Poetry** on **Python 3.12** (pinned by the repo `.python-version` = `3.12.3`; the
Docker build uses `requirements.txt`). If `poetry install` fails building `asyncpg`, you're on
the wrong interpreter — confirm `python3 --version` is 3.12.x, then `poetry env use 3.12.3`.

```bash
cd backend
poetry install                                             # dev deps (pip install -r requirements.txt is the Docker path)
poetry run uvicorn app.main:app --reload --host 0.0.0.0 --port 9000   # dev server (container port)
poetry run pytest                                          # tests
poetry run black .                                         # format
poetry run ruff check .                                    # lint (ruff 0.1.5; config in backend/pyproject.toml)
poetry run ruff check . --select F,ASYNC --ignore F401,F841   # the enforced bug+async gate (see below)
poetry run bandit -r app -ll -ii -x app/tests,tests        # security SAST (bandit; see Common Pitfalls / AGENTS.md)
poetry run pip-audit                                       # dependency CVE scan
```

### Frontend
```bash
cd frontend
npm install
npm run dev          # dev server
npm run build        # production build
npm test             # Vitest
npm run lint         # ESLint
```

### Tests (via Docker)
```bash
docker compose exec backend pytest                          # all backend tests
docker compose exec backend pytest tests/test_x.py          # one file
docker compose exec backend pytest --cov=app --cov-report=term-missing
docker compose exec backend pytest -k "pattern"             # by name
cd frontend && npm test -- --coverage                       # frontend coverage
```
- Backend tests: `backend/tests/` (fixtures in `backend/tests/fixtures/`)
- Frontend tests: `frontend/src/__tests__/` or `*.test.tsx` alongside components
- **Always mock external services** (FR24, Broadcastify, etc.) in tests.

### Docker
```bash
docker compose -f docker-compose.dev.yml up -d   # dev (hot reload)
docker compose up -d                             # full stack
docker compose logs -f [service]
docker compose build --no-cache
```

## Architecture

**Backend** (`backend/app/`): `main.py` (FastAPI entry + CORS), `core/config.py`
(pydantic-settings), `db/database.py` (SQLAlchemy session), `api/` (routers),
`models/` (ORM), `schemas/` (Pydantic), `services/` (business logic / external
wrappers), `workers/` (Celery tasks + `celery_app.py`).

**Frontend** (`frontend/src/`): `main.tsx` (React Query + Router providers),
`App.tsx` (routing), `components/`, `pages/`, `hooks/`, `types/`, `utils/`.

**Patterns**: FastAPI async/await endpoints; SQLAlchemy 2.0; dependency-injected DB
sessions (`get_db()`); env-based config; React Query for server state; Tailwind utilities.

## Code Quality & Lint Gate

- **Backend**: Black (format), Ruff (lint), pytest. **Frontend**: ESLint, tsc, Vitest.

A scoped ruff gate runs in **CI** (`.github/workflows/lint.yml`) and at **pre-push**
(`.pre-commit-config.yaml`):

```bash
ruff check . --select F,ASYNC --ignore F401,F841
```

It blocks **real bugs** — undefined names (F821), redefinitions (F811), duplicate
dict keys (F601), and sync/async mismatches (ASYNC, e.g. blocking `open`/`sleep` in
`async` functions) — without nagging about unused imports/vars or style. Config in
`backend/pyproject.toml`. Activate locally once: `pip install pre-commit && pre-commit install`.

## CI/CD

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `backend-ci.yml` | push/PR to `main`/`dev`, paths `backend/**` | `lint-and-format` (black/ruff) · `test` (pytest) · `type-check` |
| `frontend-ci.yml` | push/PR to `main`/`dev`, paths `frontend/**` | ESLint + TypeScript type-check |
| `lint.yml` | push to `main`/`dev`/`develop`, all PRs | Ruff bug + async gate (`F,ASYNC`) |
| `schema-check.yml` | PR touching `backend/app/models/**` or `backend/alembic/versions/**`; push to `main`/`dev` | `alembic check` — models vs migrations |

All gates must be green before merge.

## Common Pitfalls

Repo-specific gotchas drawn from real bugs. Check a diff against these before opening a PR.

- **Custom Celery task names bypass `task_routes` module globs.** A task registered
  with `@celery_app.task(name="foo_bar")` has the name `foo_bar`, which does **not**
  match a glob like `app.workers.radio_import_tasks.*`. With no explicit route it
  falls through to the default `celery` queue. Add an explicit `task_routes` entry
  (`"foo_bar": {"queue": "data_import"}`) — that fixes every dispatch path (beat +
  `.delay()`), not just the beat entry.
- **A worker only runs tasks for queues in its `--queues` list.** If a task routes to
  a queue no running worker consumes, it silently never executes. Conversely,
  `transcription` is GPU-only — the main CPU worker should not be relied on for it.
- **Comments that assert runtime facts must match reality.** (e.g. don't say
  "faster-whisper is not installed" when it's in `requirements.txt`; the real reason
  a CPU worker skips transcription is no CUDA, not a missing package.) Wrong comments
  mislead the next reader.
- **Blocking I/O in `async` functions.** No bare `open`/`time.sleep`/`requests` inside
  `async def` — the ASYNC gate fails the build. Use async equivalents or run blocking
  work in a thread/Celery task.
- **Model ↔ migration drift.** Any change under `app/models/` needs a matching Alembic
  migration; `schema-check.yml` runs `alembic check` and will fail otherwise.
- **Bypassing service wrappers.** Never call FlightRadar24 directly — always go through
  `flightradar24_api_service.py` (rate limiting + credit accounting live there).
- **Naive datetimes.** Use timezone-aware UTC (`datetime.now(timezone.utc)`), matching
  the existing worker code; Celery runs with `enable_utc=True`.

## Core Rules

1. **Use existing service wrappers** for external APIs — never direct HTTP calls (esp. FR24).
2. **Keep SQLAlchemy models and Alembic migrations in sync.** Update models → autogenerate
   + run a migration; verify with `alembic check`.
3. **Update tests when you change code.** New features need coverage before "done"; mock
   external services. A green suite is a prerequisite, not a nicety.
4. **Protect flight data.** Back up before any destructive DB operation
   (`scripts/backup_database.sh`; wrapper `backend/scripts/safe_db_operation.sh`).
   **Never** run `docker compose down -v`, drop the `postgres_data` volume, or
   uninstall PostgreSQL/PostGIS without explicit user confirmation. If an operation
   might delete flight data, require the user to type:
   `I understand this may DELETE flight data`.
5. **Keep instruction files in sync.** This file, [`AGENTS.md`](AGENTS.md), and
   [`.github/copilot-instructions.md`](.github/copilot-instructions.md) cover overlapping
   ground (conventions, queue routing, schema sync, data safety, the pre-PR review
   checklist). Change a rule in one → apply the equivalent change in the others. A rule in
   one but not the others is a bug. The pre-PR reviewer agents
   (`.claude/agents/*-pre-pr-reviewer.md`) encode the same checklist — update them too.

## Environment Setup

Copy `backend/.env.example` to `backend/.env` and configure: `DATABASE_URL`,
`SECRET_KEY`, `BACKEND_CORS_ORIGINS`, plus FR24 / Broadcastify / Google credentials.
