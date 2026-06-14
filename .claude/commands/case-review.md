# Case Review

Assess whether a flight (or pattern) supports a reasonable, factual claim worth putting in the
lawsuit — by running the domain analysts as a panel with adversarial verification. This is NOT a
code review (see `/tech-review`); it reasons about the surveillance *evidence*.

## Arguments

- `$ARGUMENTS` — what to assess: a flight id, an aircraft + date (`N624FB 2025-07-10`), an
  address/neighborhood + window, or a described pattern. If omitted, ask for the target.

## Instructions

Run as a pipeline (mirrors the project's data → claim → verification flow). Dispatch via the
`Task` tool with the matching `subagent_type`.

1. **Facts first.** Dispatch `surveillance-pattern-analyst` to quantify what the data actually
   shows for the target (altitudes, hovers, repeat passes, timing, gaps), with row citations.

2. **Two independent reads, in parallel** (single message, two `Task` calls):
   - `helicopter-ops-analyst` — is the behavior operationally explained (legitimate mission) or
     anomalous?
   - `aviation-law-analyst` — which legal theory(ies) the facts support, with specific anchors
     and a strength rating.

3. **Adversarial verification, in parallel** (after step 2):
   - `adversarial-investigator` — try to DEFEAT the claim (innocent explanation, evidence
     attacks, doctrinal wall); rule SURVIVES / WEAK / DEFEATED.
   - `evidence-forensics-analyst` — would the underlying data survive an authenticity/reliability
     challenge; what foundation is missing.

4. **Synthesize** a single balanced assessment:
   - What the data shows (with uncertainty).
   - Operational read + strongest legal theory + its anchor.
   - The adversarial bottom line: does it clear the **non-frivolous-filing** bar, only-with-X, or
     not yet?
   - The 2–3 highest-leverage things to develop next (often a specific records request → hand to
     `records-request-strategist` / `/foia-request`, or a data fix).

   Present it as: **FILING-READY / NEEDS DEVELOPMENT (list what) / NOT SUPPORTED**, with the
   single best supporting fact and the single biggest weakness.

## Rules
- Honor each analyst's calibration — concede explained flights, disclose gaps, don't overstate.
  A credible "not yet" is more valuable than an inflated claim that collapses in court.
- **Advisory only — not legal advice.** Output informs the litigation team; a licensed Arizona
  attorney decides what to file.
