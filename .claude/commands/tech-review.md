# Technical Review

Run a comprehensive technical review of code changes by scoping the diff and dispatching the
relevant reviewer agents in parallel, then consolidating their findings by severity. Broader
than `/pre-pr-review` (the fast pre-push gate): adds UI/UX/HUD, database/migration, and an
optional deep bug hunt.

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`) and/or flags:
  `--deep` (also run `bug-hunter`), `--security` (remind to run the built-in `/security-review`),
  `--staged` (review staged changes).

## Instructions

1. **Resolve the range.** Default `git diff dev...HEAD` (fetch `origin/dev` first). Honor
   `--staged`/an explicit SHA range.

2. **Scope the diff and pick reviewers:**
   ```bash
   git diff <range> --stat
   ```
   | Changed paths | Dispatch (parallel) |
   |---|---|
   | `backend/**/*.py` (logic, Celery, services, API) | `backend-pre-pr-reviewer` |
   | `backend/app/models/**`, `backend/alembic/versions/**`, query-heavy code | `db-migration-reviewer` |
   | `frontend/**` (React/TS correctness) | `frontend-pre-pr-reviewer` |
   | `frontend/**` map/visualization/dashboard UI | `hud-ux-reviewer` |
   | data-pipeline / ingestion / export / migration changes | suggest `/evidence-review` |
   | `--deep` flag, or high-risk change | `bug-hunter` (adversarial) |

   Dispatch the selected agents **in parallel** (one message, multiple `Task` calls) with the
   resolved range in each prompt. Docs/config-only diffs: say a full review isn't needed.

3. **Consolidate** all returned findings into one report grouped by severity:
   **[Will Block]** → **[Should Address]** → **[Nit]**, de-duplicated, each tagged with which
   reviewer raised it. Note cross-cutting patterns once.

4. **Recommend next steps.** List `[Will Block]` items as a fix-first checklist. If the change
   touches security-sensitive code or `--security` is set, remind the user to also run the
   built-in **`/security-review`**. If the diff is unusually broad, suggest splitting the PR.

This command **reports**; it does not auto-fix. The author decides what to change (use
`/code-review --fix` or ask explicitly to apply fixes).

## Related review commands
- `/pre-pr-review` — the fast pre-push subset (backend + frontend correctness gates).
- `/evidence-review` — data/evidence-integrity review for pipeline & migration changes.
- `/security-review` (built-in) — security pass on the branch's changes.
- `/case-review` — NOT a code review; legal/operational assessment of a *flight or pattern*.
