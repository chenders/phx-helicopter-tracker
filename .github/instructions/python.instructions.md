---
applyTo: "backend/**/*.py"
---

# Python / backend review rules (phx-helicopter-tracker)

Path-scoped rules Copilot activates when reviewing `backend/**/*.py`. These are the same recurring
bug classes the `backend-pre-pr-reviewer` agent and `CLAUDE.md` "Common Pitfalls" track — flag them
in review. The cross-cutting priorities/philosophy live in `.github/copilot-instructions.md`.

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

## Flag these (external services & DB)

- **Direct FR24 calls** outside `app/services/flightradar24_api_service.py` (bypasses rate limiter +
  credit accounting) — blocking. Also flag use of a non-canonical FR24 service (there are several).
- **Model ↔ migration drift** — a `backend/app/models/**` change with no matching Alembic migration
  (`schema-check.yml` enforces `alembic check`).
- **Unbounded queries** on `flight_positions`/radio tables (must filter + bound); N+1 in loops
  (use `selectinload`/`joinedload`); raw/string-built SQL where a model exists.

## Tests & secrets

- New behavior needs `pytest` coverage; external services (FR24/Broadcastify/Google) must be mocked.
- No secrets/PII in code or logs (even DEBUG); no `.env` committed.

## Don't flag

Style ruff/black own (import order, unused vars F401/F841, line length). The enforced ruff gate is
scoped to bugs (`F,ASYNC`) — don't hand-enumerate style.
