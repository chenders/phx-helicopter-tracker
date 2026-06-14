# Pre-PR Review

Run a calibrated pre-PR review of the current branch's changes before pushing, to catch
recurring bug categories before they reach `frontend-ci`/`backend-ci` or Copilot review.

## Arguments

- `$ARGUMENTS` — optional diff range (e.g. `dev...HEAD`, a base SHA, or `--staged`).
  Defaults to `git diff dev...HEAD` (this repo's PRs target `dev`).

## Instructions

1. **Determine the diff range.** If `$ARGUMENTS` names a range/SHA, use it. If it's
   `--staged`/`--cached`, review staged changes. Otherwise default to `dev...HEAD`
   (fetch `origin/dev` first so the base is current: `git fetch origin dev`).

2. **Scope the diff** to decide which reviewer(s) to dispatch:
   ```bash
   git diff <range> --stat
   ```
   - Backend Python / Celery / Alembic / docker-compose changes → dispatch
     **`backend-pre-pr-reviewer`**.
   - `frontend/**` changes → dispatch **`frontend-pre-pr-reviewer`**.
   - Claude/Copilot config — `.claude/agents/**`, `.claude/commands/**`, `CLAUDE.md`, `AGENTS.md`,
     `.github/copilot-instructions.md`, `.github/instructions/**`, `.github/skills/**`,
     `docs/plans/claude-code-agents.md` → dispatch **`claude-config-reviewer`**.
   - Standalone scripts (`scripts/**`) with real logic, not covered by the above → dispatch
     **`bug-hunter`** scoped to those files.
   - Multiple buckets → dispatch the relevant agents **in parallel** (single message, multiple
     `Task` calls).
   - Pure docs/prose with no config or code → say so; a full review isn't needed.

3. **Dispatch** the relevant agent(s) via the `Task` tool with the resolved range in the
   prompt, e.g.:
   ```
   Task(subagent_type="backend-pre-pr-reviewer",
        prompt="Review the diff range <range> for this branch. Output findings per your checklist.")
   ```

4. **Consolidate** the returned findings into one report grouped by severity:
   **Will Block** (fix before pushing) → **Should Address** (fix or consciously defer) →
   **Nit** (optional). Note cross-file patterns once.

5. **Recommend next steps.** If there are `Will Block` findings, list them as a fix-first
   checklist. If the diff is unusually broad, suggest splitting the PR.

Do **not** auto-fix — this command reports. The author decides what to change. (Use
`/code-review --fix` or ask explicitly if you want fixes applied.)
