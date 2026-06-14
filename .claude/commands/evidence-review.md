# Evidence-Integrity Review

Review code changes that touch the data pipeline (ingestion, transformation, migrations, exports)
for their impact on the **integrity and admissibility of the flight/radio evidence**. This
project's data is irreplaceable lawsuit evidence, so a change that silently corrupts, duplicates,
loses, or mis-timestamps it is the worst defect class. Use on any diff touching how evidence is
collected, stored, transformed, or exported.

## Arguments

- `$ARGUMENTS` — optional diff range (default `dev...HEAD`) or a path/subsystem to focus on.

## Instructions

1. **Scope.** Identify pipeline-relevant changes in the diff: FR24/ADS-B ingestion, radio import/
   transcription, `flight_logs`/`flight_positions`/`flight_discoveries` writes, Alembic migrations,
   export/report generation, anything under `backend/app/workers` or `backend/app/services` that
   reads/writes evidence. If none, say so and stop.

2. **Dispatch in parallel** (one message, multiple `Task` calls):
   - `bug-hunter` — focused on its **evidence/data-integrity** class: non-idempotent ingestion
     (duplicate/lost rows on retry), partial writes / missing transactions, timestamp corruption,
     lossy coercion, silent "cleanup" purges.
   - `evidence-forensics-analyst` — provenance, chain of custody, completeness/gaps, and whether
     the change preserves reproducibility and authenticity of the resulting data.
   - `db-migration-reviewer` — *if* the diff includes migrations or model changes (data-loss
     safety, online-migration safety on large tables).

3. **Consolidate** findings by severity, leading with anything that could corrupt or lose
   evidence (`[Critical]`/`[Will Block]`). For each, give the concrete fix and whether a backup
   should be taken before the change ships (per `CLAUDE.md` data-safety rules).

4. **Recommend**: fix-first list; whether to generate/refresh a `scripts/evidence_manifest.py`
   manifest for any affected exports; and any disclosure note needed if a gap is introduced.

This command **reports**; it does not modify data or code.

## Related
- `/tech-review` — general technical review of code changes.
- `/case-review` — legal/operational assessment of a flight or pattern (not code).
