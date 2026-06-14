---
applyTo: "backend/**/*.py"
---

# Python / backend review rules (phx-helicopter-tracker)

Path-scoped rules Copilot activates when reviewing `backend/**/*.py`. These mirror the checks the
project's review agents encode (`backend-pre-pr-reviewer`, `db-migration-reviewer`,
`fr24-api-cost-expert`, `fr24-api-capabilities-expert`, `bug-hunter`) and `CLAUDE.md` "Common
Pitfalls" — flag them in review. Cross-cutting priorities/philosophy live in
`.github/copilot-instructions.md`.

## Flag these (Python correctness)

- **Custom Celery task-name routing bypass.** A task with `@celery_app.task(name="foo")` has the
  name `foo`, which does NOT match a module glob like `app.workers.x.*` in `task_routes` — with no
  explicit `"foo": {"queue": ...}` entry it silently lands on the default `celery` queue. Flag any
  new custom-named task without an explicit route (or confirm `celery` is intended).
- **Beat-schedule task-name mismatch.** Each `beat_schedule` entry's `"task"` must match a
  registered task name exactly; a stale/typo'd name silently never runs.
- **Blocking I/O inside `async def`.** No bare `open`, `time.sleep`, `requests.*`, or sync DB calls
  in `async` functions — fails the ruff ASYNC gate and stalls the loop. Use async equivalents /
  `asyncio.to_thread` / Celery.
- **Unawaited coroutines** (an `async def` called without `await`); **naive datetimes** (use
  `datetime.now(timezone.utc)` — Celery runs `enable_utc=True`).
- **SQLAlchemy session/txn**: lazy-load after the session closes; session shared across tasks; commit
  per-row in a loop vs. one transaction; missing rollback on a partial multi-step write.

## Flag these (data integrity — irreplaceable evidence)

- **Non-idempotent ingestion** that duplicates/drops `flight_*` rows on retry (`acks_late` + no
  upsert/dedupe key).
- **Destructive migrations / "cleanup"** that drop/rename columns holding collected data, or add
  retention/purge of `flight_*`/radio history (the project keeps ALL history). Flag as blocking.
- **Lossy coercion** of lat/long/altitude/timestamps.

## Flag these (FR24 — credit budget & data coverage)

- **Wrapper bypass.** Direct FR24 calls outside `app/services/flightradar24_api_service.py` (bypass
  the rate limiter + credit accounting) — blocking. Also flag use of a non-canonical FR24 service
  (there are ~6 FR24 service files; new code should use the canonical wrapper).
- **Credit/rate cost.** Essential account = 666k credits/month, **30 req/min**, ≥3 s between calls.
  Flag tight loops / parallel fan-out / retries-without-backoff that could exceed the rate limit,
  and high-frequency polling or full re-pulls that would burn the monthly budget.
- **Redundant calls.** Re-discovering flights already in `flight_discoveries`, or re-downloading a
  track where `track_downloaded = true` — dedupe against stored data before spending a credit.
- **Government-aircraft coverage.** FR24 filters government aircraft, so the police tails
  (N621/623/624/625FB) may be missing/partial. Flag code that assumes FR24 returns them or treats
  "no FR24 data" as "didn't fly" — missing data should be handled/disclosed, not assumed away.

## Flag these (migrations & DB)

- **Model ↔ migration drift** — a `backend/app/models/**` change with no matching Alembic migration
  (`schema-check.yml` enforces `alembic check`). Confirm a correct `downgrade()` and a single head.
- **Online-migration safety on big tables** (`flight_positions`, radio): adding a non-NULL column
  with a volatile default, `CREATE INDEX` without `CONCURRENTLY`, `ALTER TYPE`, or table rewrites
  take long/exclusive locks. Prefer add-nullable → backfill in batches → set constraint, and
  `CREATE INDEX CONCURRENTLY`.
- **TimescaleDB / PostGIS**: flag any hypertable **retention or compression policy that could delete
  evidence** (project keeps ALL history) unless explicitly intended; spatial columns need GiST
  indexes and SARGable queries.
- **Unbounded queries** on `flight_positions`/radio tables (must filter + bound); N+1 in loops
  (use `selectinload`/`joinedload`); raw/string-built SQL where a model exists.

## Flag these (security)

- **XXE** — parsing untrusted FR24 KML/XML with `xml.etree.ElementTree` (or `lxml` without
  hardening); use `defusedxml`. (Bandit flags this; it exists in a FR24 service today.)
- **SSRF** — outbound requests to a user/data-controlled URL without validation.
- **Injection** — string-built SQL/shell; `subprocess(..., shell=True)` with interpolated input.
- **Secrets** — hardcoded keys/tokens; weak hashing (md5/sha1) for security purposes.

## Tests & secrets

- New behavior needs `pytest` coverage; external services (FR24/Broadcastify/Google) must be mocked.
- No secrets/PII in code or logs (even DEBUG); no `.env` committed.

## Don't flag

Style ruff/black own (import order, unused vars F401/F841, line length). The enforced ruff gate is
scoped to bugs (`F,ASYNC`) — don't hand-enumerate style.
