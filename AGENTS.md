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

### Technical-review agents (reviewing code changes) — tag by area

| Agent | Model | Tag on changes to | Covers |
|-------|-------|-------------------|--------|
| `backend-pre-pr-reviewer` | sonnet | `backend/**/*.py` (logic, Celery, services, API) | Routing, async, model↔migration drift, wrapper bypass, data-safety, tests |
| `frontend-pre-pr-reviewer` | sonnet | `frontend/**` | React/TS correctness, hooks, React Query v4, tsc/ESLint gates |
| `hud-ux-reviewer` | sonnet | `frontend/**` map/visualization/dashboard UI | Legibility over imagery, info hierarchy, geospatial clarity, a11y, evidentiary honesty |
| `db-migration-reviewer` | sonnet | `backend/app/models/**`, `backend/alembic/versions/**`, query-heavy code | Migration/data-loss safety, online-migration locking, index/plan quality, TimescaleDB/PostGIS |
| `fr24-api-cost-expert` | sonnet | FR24 services/workers/schedulers, ingestion strategy | Credit-cost estimate, rate-limit (30/min) compliance, wrapper discipline, redundant-call/budget waste |
| `fr24-api-capabilities-expert` | sonnet | FR24 data-acquisition questions; missing/gov-filtered data | What FR24 can retrieve & how; alternative sources (ADS-B Exchange, FAA, public records) when it can't |
| `bug-hunter` | opus | on demand / `--deep` | Adversarial tool-augmented bug hunt; weights evidence/data-integrity defects highest |

Also available from installed plugins (situational): `pr-review-toolkit:silent-failure-hunter`,
`pr-review-toolkit:pr-test-analyzer`, `pr-review-toolkit:type-design-analyzer`,
`sharp-edges:sharp-edges-analyzer`, `supply-chain-risk-auditor`.

### Case / domain agents (the lawsuit mission) — assess evidence, not code

| Agent | Model | Role |
|-------|-------|------|
| `surveillance-pattern-analyst` | opus | Quantifies patterns in flight data (repeat overflights, hover clusters, low-altitude, timing) |
| `helicopter-ops-analyst` | opus | "The pilot" — is a flight an explained mission or anomalous/gratuitous? |
| `aviation-law-analyst` | opus | "The lawyer" — maps facts to 4th-Amendment/AZ-law theories with specific anchors |
| `adversarial-investigator` | opus | "The skeptic" — tries to DEFEAT a claim; rules on non-frivolous-filing bar |
| `evidence-forensics-analyst` | opus | Admissibility — provenance, chain of custody, gaps, reproducibility (FRE 901 / Daubert) |
| `privacy-harms-analyst` | opus | The *harm* — chilling effects, REP intrusion, disparate impact (DOJ angle); standing/damages |
| `quant-evidence-analyst` | opus | Statistical defensibility of every number — rates, baselines, bias, uncertainty |
| `acoustics-noise-analyst` | opus | Noise/downwash estimate for the *Riley* "undue noise, wind, dust" physical-intrusion theory |
| `investigative-narrative-writer` | opus | Turns VERIFIED findings into accurate, compelling narrative; finds "the moment" |
| `records-request-strategist` | sonnet | Plans/tracks the A.R.S. § 39-121 records campaign; complements `/foia-request` |

### Slash commands

| Command | Does |
|---------|------|
| `/tech-review` | Comprehensive code review — scopes the diff, dispatches the technical-review agents in parallel |
| `/pre-pr-review` | Fast pre-push subset (backend + frontend correctness gates) |
| `/evidence-review` | Data/evidence-integrity review for pipeline & migration changes |
| `/ui-ux-review`, `/design-review`, `/3d-view-review` | UI reviews — usability/a11y, visual design, and the 3D map view respectively |
| `/case-review` | Legal/operational assessment of a *flight or pattern* (the domain panel + adversarial verification) |
| `/foia-request` | Drafts an Arizona public-records (A.R.S. § 39-121) request |
| `/respond-to-copilot` | Works the Copilot review queue |
| `/security-review` (built-in) | Security pass on the branch's changes |

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
| **semgrep** | dataflow/taint, FastAPI-specific (SSRF, SQLi, auth) | **Installed** (pipx, tracks PyPI latest). `semgrep --config p/python --config p/fastapi backend/app`. Pin a ruleset for reproducibility; pairs with the `semgrep-rule-creator` skill |
| **pyright** | stricter/faster type checking | **Installed** (pipx). `pyright backend/app`. Trial it against mypy on a branch — pick one as the gate, don't stack both |
| **postgres-mcp** (read-only) | schema introspection, `EXPLAIN`/index/health for N+1 & bad-plan bugs | **Registered** (local MCP scope, `--access-mode restricted`, read-only role). Activation below; used by `db-migration-reviewer` |

Baseline note: a first `bandit` pass on `backend/app` flagged real issues (e.g. XXE via
`ET.parse` in a FR24 service; hardcoded `/tmp` in `legal_tasks`). See `docs/plans/claude-code-agents.md`.

### Postgres MCP (read-only) — activation

Registered at **local** MCP scope (private, not committed), `--access-mode restricted`, connecting
as a **read-only role** (`mcp_readonly`) — defense-in-depth so an agent can introspect the schema
and run `EXPLAIN` but can never modify or delete the irreplaceable flight data. It's wired to the
local dev DB and stays "Failed to connect" until you create the role:

```bash
docker compose up -d db
# password = the one in your local MCP config (claude mcp get postgres-readonly)
docker compose exec -T db psql -U postgres -d phoenix_helicopters \
  -v mcp_pw="'<that-password>'" -f - < scripts/setup_mcp_readonly_role.sql
```

Only ever point it at a **local/dev** database, never production. To inspect/remove:
`claude mcp get postgres-readonly` / `claude mcp remove postgres-readonly -s local`.

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
  its own read-only mode. Avoid. (We use `crystaldba/postgres-mcp` instead — see Postgres MCP below.)
- **`mcp-language-server`** — redundant with `serena` (already available).
- **vulture / sqlfluff / safety / radon** — low value or redundant for this stack (see calibration doc).
- **Multi-persona security-audit fleet** (the va-mobile-apps-analysis model) — overkill for a
  normal dev loop; we borrowed its principles (model tiering, scoped tools, verify-against-the-file),
  not its headcount.
