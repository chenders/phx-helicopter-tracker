# Claude Code Agents — Setup & Calibration

This records the pre-PR review agents added for this repo, *why each checklist category
exists*, and how to keep them calibrated. Inspired by the AnxietyWatch `swift-pre-pr-reviewer`
(one calibrated gatekeeper that front-runs the Copilot review dance) rather than the
va-mobile-apps-analysis multi-persona audit fleet (right for a repeating security-audit
pipeline over many targets, overkill for a normal dev loop).

## What we added

| File | Type | Shared? | Purpose |
|------|------|---------|---------|
| `.claude/agents/backend-pre-pr-reviewer.md` | Agent (sonnet) | force-added | Pre-PR review of Python/Celery/SQLAlchemy diffs |
| `.claude/agents/frontend-pre-pr-reviewer.md` | Agent (sonnet) | force-added | Pre-PR review of React/TS diffs |
| `.claude/agents/bug-hunter.md` | Agent (opus) | force-added | Adversarial, tool-augmented bug hunt; evidence/data-integrity weighted |
| `.claude/commands/pre-pr-review.md` | Slash command | force-added | Scopes the diff, dispatches the right reviewer(s) |
| `.claude/commands/foia-request.md` | Slash command | force-added | Drafts Arizona public-records (A.R.S. § 39-121) requests |
| `.claude/hooks/pre-pr-reviewer-reminder.py` | PreToolUse hook | **local only** | Non-blocking reminder at `git push` time |
| `AGENTS.md` | Doc | committed | Workflow + agent roster + toolchain + pre-PR policy |
| `scripts/evidence_manifest.py` | Script | committed | Chain-of-custody SHA-256 manifest for evidence exports |
| `.python-version` | Pin | committed | Forces Python 3.12.3 (pyenv/uv/IDEs) — see below |
| `backend/pyproject.toml` (+lock) | Dev deps | committed | Adds `bandit`, `pip-audit` |
| `.claude/agents/*` (16 more) | Agents | force-added | Technical-review (`hud-ux-reviewer`, `db-migration-reviewer`, `fr24-api-cost-expert`, `fr24-api-capabilities-expert`, `claude-config-reviewer`), `project-expert`, + 10 domain/case personas — **the AGENTS.md roster is the canonical, complete list** |
| `.claude/commands/*` (6 more) | Slash commands | force-added | `tech-review`, `case-review`, `evidence-review`, `ui-ux-review`, `design-review`, `3d-view-review` |
| `.claude/hooks/data-safety-guard.py` | PreToolUse hook | **local only** | BLOCKS destructive DB/data commands (`down -v`, volume rm/prune, `DROP`/`TRUNCATE`, `rm -rf` of data/backups) |
| `scripts/check.sh` | Script | committed | One-command parallel quality gate (local + CI, single source of truth) |
| `scripts/setup_mcp_readonly_role.sql` | Script | committed | Creates the read-only Postgres role for the MCP |
| `.editorconfig` | Config | committed | Consistent indent/charset/EOL across editors |
| `.github/copilot-instructions.md` + `instructions/*` + `skills/code-review/SKILL.md` | Copilot config | committed | Make Copilot's own PR review project-aware |
| `.github/pull_request_template.md` | Template | committed | Pre-merge + data-safety checklist |

**Gitignore note:** all of `.claude/` is gitignored in this repo (`.gitignore` line `.claude`).
Shareable tooling (agents, commands) is committed with `git add -f`, following the existing
precedent (`respond-to-copilot.md` was force-added the same way). `.claude/hooks/` and
`.claude/settings.json` are *not* committable, so the push-reminder hook is set up locally and
its source is reproduced in `AGENTS.md` for anyone who wants it.

## Why the agents (the economics)

A pre-PR reviewer pays for itself when *each round of post-push review costs more than one
agent run*. We have that: PR #4 took 2 Copilot rounds over 2 substantive findings (a Celery
task-routing misroute and a comment that contradicted the code) — both of which a pre-PR pass
would have caught. The agent's job is to move that feedback to *before* the push.

## Calibration — why each backend category is on the list

Each checklist entry traces to a real or class-of-real bug, not generic advice:

- **Custom Celery task-name routing bypass** — *PR #4, comment 2.* A task registered with
  `@celery_app.task(name="import_transcriptions_from_json")` didn't match the
  `app.workers.radio_import_tasks.*` glob in `task_routes`, so it silently ran on the default
  `celery` queue instead of `data_import`. It only worked at all because the CPU worker also
  consumed `celery`. Class: name-vs-glob mismatch in routing config.
- **Comment contradicts code** — *PR #4, comment 1.* A docker-compose comment claimed
  faster-whisper "is not installed" when it's in `requirements.txt`; the real reason the CPU
  worker skips transcription is no CUDA. Class: stale/incorrect assertions in comments.
- **Blocking I/O in `async`** — enforced by the ruff `ASYNC` gate (`lint.yml`); listing it
  lets the reviewer explain the fix faster than the CI message.
- **Model ↔ migration drift** — enforced by `schema-check.yml` (`alembic check`); a model
  edit with no migration is a guaranteed red CI.
- **Flight-data safety** — project-specific: the flight/position/radio data backs a lawsuit
  and is expensive or impossible to re-collect. Destructive migrations or "cleanup" purges
  are the highest-consequence class here, so they're `[Will Block]`.
- **FR24 service-wrapper bypass** — a `CLAUDE.md` Core Rule; the wrapper owns rate limiting
  (30 req/min) and credit accounting, so a direct call risks burning the monthly credit cap.

## Calibration — frontend

`frontend-ci` was red for months: a missing ESLint config plus ~180 `tsc` errors from a React
Query v3→v4 migration. So the frontend reviewer's highest-value checks are the **CI gates
themselves** (run `tsc --noEmit` and `npm run lint` locally on changed files) and **React
Query v4 idioms**. Heuristics are secondary to a green local gate.

## Static-analysis tooling — research & decisions (2026-06-14)

Two background research agents evaluated Claude-ecosystem add-ons and Linux/CLI static-analysis
tools against a "reasonably safe" matrix: **provenance** (official vendor/foundation > named team >
anonymous), **adoption** (stars/downloads), **maintenance recency**, **license** (permissive),
and **blast radius** (read-only/local > scoped writes > arbitrary code/DB exec). Hard gates: not
archived, real license, least-privilege mode if it touches the DB or shell.

**Installed now** (official maintainers, local-only, no DB/network code-exec):
- **bandit** (PyCQA, Apache-2.0, ~8k★, ~5–10M/mo) — Python security AST. First baseline on
  `backend/app` (medium+ sev/conf) flagged real issues: XXE via `xml.etree.ElementTree.parse`
  on FR24 KML/XML (`flightradar24_service.py:93`), hardcoded `/tmp` path (`legal_tasks.py:85`),
  plus 2 High / 21 Low. These are bug-hunter starting points.
- **pip-audit** (PyPA + Trail of Bits, Apache-2.0) — Python dependency CVE scanner.
- (free) **npm audit** — frontend dependency CVEs; wire `--audit-level=high`.

**Already present, worth tightening:** the backend-ci `type-check` job runs
`mypy app --ignore-missing-imports || true` — non-blocking and error-swallowing, i.e. a no-op.
Cheapest win available: drop `|| true` on a scoped path (`app/services app/api`) once existing
errors are triaged. (Deferred — tightening could turn CI red on pre-existing issues; do it in a
focused PR.)

**Installed locally (pipx), trial as gates** (high value, need noise-tuning before becoming
blocking CI gates; the bug-hunter uses them *if present*): **semgrep** (Semgrep Inc, LGPL engine;
registry rules now restricted-license but fine for internal CI; pairs with the
`semgrep-rule-creator` skill) and **pyright** (Microsoft, MIT; alternative to mypy — pick one,
don't stack) are both installed via pipx (`~/.local/bin`) but are NOT wired into CI as gates yet.

**Needs human sign-off:** **`crystaldba/postgres-mcp`** — genuinely useful for catching
missing-index / bad-plan / N+1 bugs in the TimescaleDB/PostGIS queries, but it executes SQL.
Only adopt with a dedicated **read-only Postgres role**, `--access-mode=restricted`, against a
**non-prod/replica** DB — never the live `phoenix_helicopters` volume.

**Avoided:** the Anthropic reference `server-postgres` MCP (archived after a SQLi that bypassed
its own read-only mode — still ~98k npm installs/wk from people who missed the memo);
`mcp-language-server` (redundant with `serena`); vulture (260 FPs on Flask-style code — Celery
tasks / FastAPI `Depends` / Pydantic validators all look "dead"); sqlfluff (tiny SQL surface —
the project uses SQLAlchemy ORM, not `.sql` files); safety (redundant with pip-audit, now needs
an account for CI); ty/pyrefly (too immature mid-2026 for a gate); radon/refurb/pyupgrade (not
bug finders; ruff's `C901`/`FURB`/`UP` cover them if ever wanted).

## Python version pin

Local `poetry add`/`install` failed building `asyncpg` because the dev machine's global
`~/.python-version` pinned 3.13, and `^3.12` *allows* 3.13 (asyncpg 0.29 doesn't compile there).
Fix: a committed **`.python-version` = `3.12.3`** (pyenv already had 3.12.3) — the widely-adopted,
tool-agnostic interpreter pin that pyenv/uv/IDEs respect and that overrides the global pin. The
dev deps were added via `poetry add --group dev --lock` (metadata-only, no venv build) so the
lock is correct for CI even when a local venv can't build. Optional hardening: tighten
`python = "^3.12"` → `>=3.12,<3.13` to *reject* 3.13 (forces a re-lock).

## The bug-hunter persona

Distinct from the pre-PR reviewers (checklist gates on a diff), `bug-hunter` is an adversarial,
on-demand hunter that runs against any scope (file/subsystem/tree). It (1) harvests tool signal
(ruff/bandit/pip-audit/mypy/semgrep, or tsc/eslint/npm-audit), (2) triages false positives,
(3) does a deep manual pass for what tools miss — Celery/async correctness, SQLAlchemy
session/txn bugs, and **evidence/data-integrity defects** (non-idempotent ingestion → duplicate/
lost evidence, partial writes, timestamp corruption, silent purges) which are weighted highest
because the data is irreplaceable lawsuit evidence — and (4) verifies every finding against bytes
on disk before reporting (borrowed from the va-mobile-apps citation-integrity discipline). Model:
opus, because subtle-bug synthesis is the high-cognition case.

## Domain persona agents + review commands

Beyond the dev-tooling reviewers, a roster of **domain persona agents** serves the project's
actual mission (building a defensible record of helicopter surveillance for a lawsuit). These
apply the va-mobile-apps-analysis insight — *diverse perspectives + adversarial verification before
a claim is trusted* — to the legal domain rather than security audits:

- **Generators:** `surveillance-pattern-analyst` (quantifies patterns in the data),
  `helicopter-ops-analyst` ("the pilot" — explained vs anomalous), `aviation-law-analyst`
  ("the lawyer" — facts → 4th-Amendment/AZ-law theories with specific anchors).
- **Adversarial verifiers (the wall):** `adversarial-investigator` ("the skeptic" — tries to
  *defeat* a claim and rule on the non-frivolous-filing bar) and `evidence-forensics-analyst`
  (admissibility / chain of custody / FRE 901 / Daubert). Default-skeptical, like va's verifier
  wall — better to kill a weak claim here than in front of a judge.
- **Support:** `records-request-strategist` (FOIA campaign), plus the `/foia-request` and
  `scripts/evidence_manifest.py` tooling.

`/case-review` orchestrates them as a pipeline: facts → independent ops+legal reads →
adversarial verification → a balanced FILING-READY / NEEDS-DEVELOPMENT / NOT-SUPPORTED verdict.

Review commands (the `/` entry points): `/tech-review` (umbrella code review → dispatches the
technical-review agents by area), `/pre-pr-review` (fast pre-push subset), `/evidence-review`
(data-integrity for pipeline/migration changes), `/ui-ux-review` · `/design-review` ·
`/3d-view-review` (UI/HUD), `/case-review` (legal/operational, not code). Model tiering follows
the va lesson: opus for synthesis/judgment (the bug-hunter and most personas), sonnet for the
checklist reviewers.

Later additions (now built): `privacy-harms-analyst` (chilling-effects / disparate-impact, DOJ
angle), `quant-evidence-analyst` (statistical defensibility of rate/baseline claims),
`acoustics-noise-analyst` (the *Riley* "undue noise/wind" physical-intrusion theory),
`investigative-narrative-writer` ("the moment" / accurate persuasive framing of verified findings),
and `fr24-api-cost-expert` (FR24 credit-cost / rate-limit / wrapper-discipline review). The UI
review path (`hud-ux-reviewer` + `/ui-ux-review`, `/design-review`, `/3d-view-review`) requires a
**real browser screenshot/GIF** of the change, not just the code — most UI defects are invisible
in source and obvious on screen.

## Keeping it calibrated

When a Copilot review (or a production incident) surfaces a bug class the reviewer *didn't*
catch, add a checklist entry for it — in the agent file, in `CLAUDE.md` "Common Pitfalls", and
in `.github/copilot-instructions.md` (keep the three in sync; see the sync rule in `CLAUDE.md`).
That's how the list compounds: every real bug becomes a one-line entry that prevents its own
recurrence. Conversely, prune entries that only ever produce false positives.

## Deliberately not done

- **No multi-persona verifier wall** (the va-mobile-apps-analysis model). That system exists to
  run a fixed multi-stage security audit across a catalog of apps with adversarial citation
  verification. We have no such repeating pipeline; one calibrated reviewer per language is the
  right size. We borrowed its *principles* — lean agent files, model tiering by cognitive load,
  scoped tools, verify-against-the-file-not-memory — not its headcount.
- **No standing security-audit agent.** The `/security-review` and `/code-review` skills cover
  occasional deep passes.

## Possible follow-ups

- A `/pre-pr-review` invocation could be auto-suggested by the push-reminder hook (already
  wired locally). Promote the hook to committed config only if `.claude/` un-ignoring is
  desired repo-wide.
- If backend review volume grows, consider splitting the backend checklist into path-scoped
  `.github/instructions/*.instructions.md` files (as AnxietyWatch does for Swift/Python) so
  Copilot activates the right rules per changed path.
