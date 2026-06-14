# AGENTS.md

How agents (and humans) should work in this repo. Companion to `CLAUDE.md` (project facts +
conventions) and `.github/copilot-instructions.md` (review standards). Keep all three — and the
pre-PR reviewer agents — in sync; a rule in one but not the others is a bug.

## Python version

This project targets **Python 3.12** (`backend/pyproject.toml`: `python = "^3.12"`; CI and the
Docker image use 3.12). A committed **`.python-version` (`3.12.3`)** pins the interpreter so
pyenv/uv/IDEs select it automatically, overriding any global pin. If `poetry add`/`poetry
install` fails building `asyncpg`, you're on the wrong interpreter — confirm `python3 --version`
is 3.12.x in the repo root, then `poetry env use 3.12.3 && poetry install`.

## Git workflow

- **Never commit/push to `main`.** Branch from `dev` (the integration branch): PRs target `dev`.
- Prefer `git pull --rebase`. **Stage files by name**, not `git add -A`/`.`, to keep tool
  artifacts and secrets out.
- Keep PRs scoped to one concern.
- `.claude/` is gitignored; shareable Claude tooling (commands, agents) is force-added
  (`git add -f`) following the `respond-to-copilot.md` precedent. `.claude/hooks/` and
  `.claude/settings.json` stay local (see Hooks below).

## Pre-PR review (run before `git push`)

Before any `git push` with substantive code (new behavior, tasks, migrations, endpoints,
components), run **`/pre-pr-review`** (or dispatch the relevant reviewer agent) on the diff and
resolve any **[Will Block]** findings. Address **[Should Address]** unless consciously deferred
with a recorded reason. Skip only for docs/config/comment-only pushes — when in doubt, run it.
The economics: each Copilot review round costs more than one agent run (PR #4 took 2 rounds).

A local `PreToolUse` hook surfaces a non-blocking reminder at push time (see Hooks).

## Agent roster

| Agent | Model | When |
|-------|-------|------|
| `backend-pre-pr-reviewer` | sonnet | Before pushing Python/Celery/SQLAlchemy/Alembic changes — checklist gate on the diff |
| `frontend-pre-pr-reviewer` | sonnet | Before pushing React/TS changes — tsc/ESLint + React Query v4 idioms |
| `bug-hunter` | opus | On demand — adversarial, tool-augmented hunt for bugs in a file/subsystem/tree (not just a diff); weighted to evidence/data-integrity defects |

Slash commands: **`/pre-pr-review`** (scopes the diff, dispatches reviewers), **`/respond-to-copilot`**
(works the Copilot review queue), **`/foia-request`** (drafts Arizona public-records requests).

## Static-analysis toolchain

Layered so each tool catches a bug class the others don't. The bug-hunter runs the relevant set
and triages the output; CI enforces the gates.

| Tool | Catches | Status |
|------|---------|--------|
| **ruff** `--select F,ASYNC` | undefined names, redefs, dup keys, blocking I/O in async | **Enforced** (CI `lint.yml` + pre-push) |
| **black** | formatting | Enforced (backend-ci) |
| **mypy** | type errors (None-misuse, bad signatures, missing awaits, SA 2.0 `Mapped[]`) | Present in backend-ci but **non-blocking** (`|| true`) — tighten on a scoped path (`app/services app/api`) when ready |
| **bandit** | Python security AST: hardcoded secrets, `shell=True`, weak crypto, **XXE**, unsafe yaml/pickle | **Installed** (dev dep). Run: `bandit -r backend/app -ll -ii -x backend/app/tests,backend/tests` |
| **pip-audit** | known CVEs in Python deps | **Installed** (dev dep). Run: `pip-audit` (or `-r <(poetry export --without-hashes)`) |
| **npm audit** | known CVEs in JS deps | Free; run `cd frontend && npm audit --audit-level=high` |
| **eslint + tsc** | JS/TS lint + types | Enforced (frontend-ci) |
| **semgrep** | dataflow/taint, FastAPI-specific (SSRF, SQLi, auth) | **Optional/trial** — not installed; `semgrep --config p/python --config p/fastapi`. Pin a ruleset; the `semgrep-rule-creator` skill is available |
| **pyright** | stricter/faster type checking | **Optional/trial** — alternative to mypy, not both |

Baseline note: a first `bandit` pass on `backend/app` flagged real issues (e.g. XXE via
`ET.parse` in a FR24 service; hardcoded `/tmp` in `legal_tasks`). See `docs/plans/claude-code-agents.md`.

## Project-purpose tooling

This repo collects evidence of police helicopter surveillance for a civil-rights lawsuit
(`docs/lawsuit-research.md`). Tooling specific to that mission:

- **`scripts/evidence_manifest.py`** — chain-of-custody for data exports. `generate` writes a
  SHA-256 + provenance manifest (git commit, host, timestamp) for a directory of exports;
  `verify` re-hashes later to prove the evidence is unchanged. Use when producing exhibits from
  CSV/KML/PDF/JSON exports. Never modifies the evidence.
- **`/foia-request`** — drafts Arizona Public Records Law (A.R.S. § 39-121) requests for a chosen
  record category, grounded in the contacts/incidents in `docs/lawsuit-research.md`.
- **Flight-data integrity is paramount.** It's irreplaceable evidence — the data-safety rules in
  `CLAUDE.md` (backup before destructive ops; no `down -v`; keep all history) are not optional,
  and the bug-hunter treats silent data corruption/loss as the highest-severity class.

## Testing

- New or changed behavior must come with `pytest` tests; mock external services (FR24,
  Broadcastify, Google). Fixing failing tests and new warnings is always in scope.
- `docker compose exec backend pytest` (or `pytest` in a 3.12 poetry env).

## Hooks (local-only)

`.claude/hooks/` and `.claude/settings.json` are gitignored, so hooks live on each machine, not
in the repo. The pre-push reminder is `.claude/hooks/pre-pr-reviewer-reminder.py`, wired in
`.claude/settings.json` under `hooks.PreToolUse` (matcher `Bash`); it injects a non-blocking
reminder when a command contains `git push`. To set it up on a new machine, recreate those two
files (source in this repo's history / `docs/plans/claude-code-agents.md`).

## What we deliberately did NOT add (and why)

- **Anthropic reference `server-postgres` MCP** — archived after a SQL-injection that bypassed
  its own read-only mode. Avoid.
- **`crystaldba/postgres-mcp`** — useful for spotting missing-index/bad-plan bugs, but it executes
  SQL against the DB. **Needs sign-off**: only with a dedicated read-only role, `--access-mode=
  restricted`, against a non-prod/replica DB — never the live flight-data volume.
- **`mcp-language-server`** — redundant with `serena` (already available).
- **vulture / sqlfluff / safety / radon** — low value or redundant for this stack (see calibration doc).
- **Multi-persona security-audit fleet** (the va-mobile-apps-analysis model) — overkill for a
  normal dev loop; we borrowed its principles (model tiering, scoped tools, verify-against-the-file),
  not its headcount.
