# Copilot Instructions for phx-helicopter-tracker

## Project Overview

A data-collection and analysis tool documenting Phoenix PD helicopter surveillance
to support a civil-rights lawsuit. It ingests FlightRadar24 flight logs, ADS-B
tracks, and Broadcastify radio archives; detects abnormal flight patterns; transcribes
radio traffic; and surfaces cost/route/surveillance analysis through a web UI.

Stack: **FastAPI (Python 3.12) + SQLAlchemy + Celery/Redis** backend, **PostgreSQL 15
(TimescaleDB + PostGIS)**, **React 18 + TypeScript (Vite, Tailwind)** frontend, Docker
Compose. See `CLAUDE.md` for the full architecture and the canonical convention list.

## Instruction File Layout

This file holds the **cross-cutting review standards**. It overlaps deliberately with
`CLAUDE.md` (developer-facing conventions) and `AGENTS.md` (agent workflow + pre-PR policy).
When a convention changes — queue routing, schema/migration sync, data-safety rules,
service-wrapper usage — update `CLAUDE.md`, `AGENTS.md`, **and** this file, plus the pre-PR
reviewer agents (`.claude/agents/*-pre-pr-reviewer.md`) that encode the same checklist. A
rule in one but not the others is a bug; flag it.

(If language-specific volume grows, split into path-scoped
`.github/instructions/*.instructions.md` files — e.g. `python` for `backend/**/*.py`,
`typescript` for `frontend/**`. Not split yet.)

## Review Priorities

When you have limited comments to spend, spend them in this order:

1. **Correctness bugs** — wrong output, off-by-one, missing state branches,
   unawaited coroutines, sync/blocking I/O inside `async def`, naive vs timezone-aware
   datetime mistakes, non-deterministic ordering that affects output.
2. **Celery / task-queue correctness** — task routed to a queue no worker consumes
   (silently never runs); custom task names that bypass `task_routes` module globs and
   fall through to the default `celery` queue; beat-schedule entries whose `task` name
   doesn't match a registered task; missing idempotency on retried tasks.
3. **Data integrity & safety** — anything that could delete or corrupt flight data
   without a backup/guard; raw SQL where a SQLAlchemy model exists; migrations that
   don't match model changes (`alembic check` drift).
4. **External-service misuse** — direct HTTP to FlightRadar24 instead of
   `flightradar24_api_service.py`; ignoring the 30 req/min / ≥3 s rate limit or credit
   accounting; unmocked external calls in tests.
5. **Performance footguns** — unbounded queries that filter in memory, N+1 queries,
   work repeated per-request that could be computed once, DoS-by-payload-size on endpoints.
6. **Source-of-truth drift** — hardcoded constants where a typed/config value exists,
   magic numbers duplicated across files, **comments/docstrings that contradict the code**
   (e.g. asserting a package isn't installed when it is), schema reference drift.
7. **Secrets / sensitive data** — credentials, tokens, or `.env` contents committed;
   secrets or PII written to logs.

**Skip or deprioritize:** formatting and import-order nits (Black/Ruff/ESLint own those),
naming bikesheds, unused-import/var noise. The enforced ruff gate is intentionally scoped
to bugs (`F,ASYNC`, excluding `F401`/`F841`) — don't hand-enumerate style CI already
handles. **This applies only to style.** Substantive issues in priorities 1–5 must be
flagged whether or not a linter catches them — most won't be lint-detectable at all.

## Review Philosophy

Only comment when you have **HIGH CONFIDENCE (>80%)** an issue exists. Prefer silence
over uncertainty. Avoid hedging ("consider", "maybe", "you might want to") — if a fix is
right, state it as a fix; if you're unsure, don't comment. Be concise: one sentence per
comment where possible.

**Watch for interaction bugs across fixes within one PR/branch.** When a diff combines a
bug fix with an optimization (or two fixes from different review rounds), check whether
the optimization preserves the invariants the fix established. Classic pattern: a fix
makes "always do X before Y" a correctness invariant; a later change skips X conditionally
but leaves Y unconditional — silently breaking it in a narrower window. Invisible per-commit,
obvious in the combined diff.

## CI Context

- **`lint.yml`** — Ruff bug+async gate (`ruff check . --select F,ASYNC --ignore F401,F841`),
  on all PRs. Blocks undefined names (F821), redefinitions (F811), duplicate dict keys
  (F601), and blocking I/O in async functions. **Don't flag style** this gate ignores
  (F401/F841/`E*`); **do flag** the bug classes it targets if you spot one it might miss.
- **`backend-ci.yml`** — black/ruff, pytest, type-check on `backend/**`.
- **`frontend-ci.yml`** — ESLint + `tsc` on `frontend/**`.
- **`schema-check.yml`** — `alembic check` when `backend/app/models/**` or
  `backend/alembic/versions/**` changes. Flag model edits with no matching migration.

## Git Workflow

- **Never push directly to `main`.** Feature branches target `dev`. Use descriptive
  names: `feat/...`, `fix/...`, `chore/...`, `docs/...`.
- **Stage files by name**, not `git add -A`/`git add .`, to avoid committing artifacts or secrets.
- Keep PRs scoped to one concern.

## Testing Requirements (cross-cutting)

- **New or changed behavior must come with tests.** Flag feature/bugfix PRs that add no
  corresponding coverage.
- **Mock external services** (FR24, Broadcastify, Google, transcription) in tests — never
  hit the network.
- **Fixing failing tests is always in scope.** If CI is red or a test near the change is
  failing, fixing it is part of the work — never "out of scope."
- Use timezone-aware UTC and fixed reference timestamps in assertions; avoid wall-clock
  `datetime.now()` in test expectations.

## Data Safety (this project handles irreplaceable evidence)

The flight/position/radio data backs a lawsuit and is expensive or impossible to
re-collect. In review, **flag**:

- Destructive DB operations without a backup or guard — `docker compose down -v`, dropping
  the `postgres_data` volume, `DROP`/`TRUNCATE`, or bulk `DELETE` without an explicit
  confirmation gate.
- Migrations that drop or rewrite columns holding collected data without a preservation path.
- Code that purges historical records "for cleanup" — this project intentionally **keeps all
  flight, position, and radio history**.

## What NOT to Do

- Don't add features or fix bugs without adding corresponding tests.
- Don't call external APIs directly when a service wrapper exists (esp. FlightRadar24).
- Don't introduce raw SQL where a SQLAlchemy model exists.
- Don't commit `.env` files, secrets, or credentials; don't log secrets or PII.
- Don't change a SQLAlchemy model without a matching Alembic migration.
