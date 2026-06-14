<!-- Target `dev` (not `main`). Keep PRs scoped to one concern. -->

## Summary

<!-- What changed and why. -->

## Type of change
- [ ] Bug fix
- [ ] Feature
- [ ] Data pipeline / ingestion / migration
- [ ] Frontend / UI / visualization
- [ ] Docs / tooling / config

## Pre-merge checklist
- [ ] Ran the local gate (`scripts/check.sh`) — ruff bug+async gate, black, tests pass.
- [ ] Ran a pre-PR review on the diff (`/pre-pr-review` or `/tech-review`); resolved all **[Will Block]** findings.
- [ ] New/changed behavior has tests; external services (FR24/Broadcastify/Google) are mocked.
- [ ] Touched a SQLAlchemy model? Added a matching Alembic migration (`alembic check` clean).
- [ ] Touched FR24 code? Used the canonical wrapper; considered credit/rate-limit cost.
- [ ] Touched UI? Attached a **browser screenshot/GIF** of the rendered change (not just code).

## Data-safety (irreplaceable lawsuit evidence)
- [ ] No destructive DB operation without a backup + explicit intent (no `docker compose down -v`,
      no volume/`flight_*` drop/truncate, no history-purging "cleanup").
- [ ] If a migration drops/rewrites a column holding collected data, a preservation/backfill path is included.

## Screenshots / evidence
<!-- UI: before/after screenshots or a GIF. Data/analysis: a manifest or query output if relevant. -->

## Notes for reviewers
<!-- Anything specific to look at; deferred items with reasons. -->
