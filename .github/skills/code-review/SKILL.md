---
name: code-review
description: How to review pull requests for phx-helicopter-tracker — a tool that collects court-admissible evidence of police helicopter surveillance. Applies this project's specific review priorities and bug classes (Celery queue routing, FR24 credit/wrapper discipline, SQLAlchemy/Alembic data-loss safety, and above all the EVIDENTIARY INTEGRITY of the flight/radio data and its visualization). Use when reviewing any pull request in this repository.
---

# Code Review skill — phx-helicopter-tracker

> Public-preview GitHub feature (agent skills in Copilot code review). This `SKILL.md` lives at
> `.github/skills/code-review/` so the Copilot reviewer loads it. It complements — and stays in
> sync with — `.github/copilot-instructions.md` and the path-scoped
> `.github/instructions/*.instructions.md`. Keep all three (and `CLAUDE.md`/`AGENTS.md`) aligned.

This repository builds a defensible factual record for a civil-rights lawsuit over Phoenix PD
helicopter surveillance. The flight/position/radio data is **irreplaceable evidence**. Review with
that mission in mind: the worst defects here are ones that **corrupt, lose, or misrepresent the
evidence** — including in the UI.

## Review priorities (spend comment budget in this order)

1. **Evidentiary integrity (highest).** Anything that makes the system store, compute, or *display*
   a fact that differs from the recorded data:
   - **Timestamps** — naive vs tz-aware, any silent date/time transform in display or storage. (A UI
     that shows a 2025 flight as 2024 is catastrophic.)
   - **Visualization honesty** — a flight path drawn solid across a data gap; animation/speed/dwell
     derived from a uniform synthetic cadence instead of real sample timestamps; a viz implying
     altitude/position precision the data lacks. Gaps must read as gaps.
   - **Fabricated fallbacks** — code that, on a failed fetch, returns hardcoded numbers presented as
     real metrics, or `|| <constant>` filling of missing evidentiary fields.
   - **Lossy coercion** of lat/long/altitude/timestamps; non-idempotent ingestion duplicating/
     dropping rows.
2. **Data-loss safety.** Destructive migrations or "cleanup" that drop columns/tables holding
   collected data or add retention/purge of `flight_*`/radio history (the project keeps ALL
   history); `docker compose down -v` / volume teardown in scripts. Flag as blocking.
3. **Correctness bugs.** Celery custom task-name routing that bypasses `task_routes` (lands on the
   default `celery` queue); beat-schedule task-name mismatches; blocking I/O in `async`; unawaited
   coroutines; React hooks (missing deps → stale closures, `queryKey` missing variables); unhandled
   `isLoading`/`isError`; socket/WebGL/listener leaks (effects without cleanup).
4. **External-service discipline.** FR24 only via `app/services/flightradar24_api_service.py` (rate
   limit 30/min, ≥3 s, 666k-credit/month budget; don't re-download tracks already in
   `flight_discoveries`); FR24 filters government aircraft, so don't assume the police tails are
   returned.
5. **Security.** XXE (untrusted KML/XML without `defusedxml`), SSRF, injection, secrets/tokens
   committed in source (e.g. a Cesium Ion token in a component), PII in logs.
6. **Schema sync.** Model changes need a matching Alembic migration; online-migration safety on
   large tables.

## How to review

- Reason about whether each change preserves the chain from **recorded data → computed value →
  what the user/court sees**. Flag any link that distorts it.
- Only raise **high-confidence** issues; prefer silence over noise. State fixes as fixes, not
  "consider".
- For deeper, project-specific checks, the same rules are enumerated in
  `.github/instructions/python.instructions.md` (backend) and `typescript.instructions.md`
  (frontend/UI). The repo's local reviewer agents (`.claude/agents/`) and `scripts/check.sh`
  encode the same checklist for developers.

## Do not flag

Style that Ruff/Black/ESLint/Prettier own; the enforced bug gate is scoped (`ruff --select
F,ASYNC`). Don't re-derive style by hand.
