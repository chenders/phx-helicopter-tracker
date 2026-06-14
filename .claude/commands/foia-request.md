# Draft a Public-Records (FOIA) Request

Draft an Arizona Public Records Law (A.R.S. § 39-121) request to the City of Phoenix /
Phoenix PD for a chosen category of helicopter-operations records, ready to paste into the
Phoenix Police Public Records Portal or send by email. This supports the lawsuit's
evidence-collection phase — see `docs/lawsuit-research.md` for the full strategy, contacts,
and legal background.

## Arguments

- `$ARGUMENTS` — the record category and any specifics, e.g.
  `flight logs N624FB 2024-2025`, `CAD dispatch records Maryvale July 2025`,
  `Air Support Unit SOPs`, `maintenance logs`, `budget Air Support Unit`,
  `Alex incident July 10 2025`. If omitted, ask which category, then proceed.

## Instructions

1. **Read `docs/lawsuit-research.md`** for the canonical facts, contacts, and known incidents
   (don't invent any). Key grounding (verify against that doc; re-confirm before sending):
   - Submission: **Phoenix Police Public Records Portal** (phxpublicsafety.phoenix.gov), ~$5
     convenience fee, typical 5–10 business-day response for simple requests.
   - Contacts: Phoenix Police Public Records Unit, (602) 534-1127,
     policepublicrecords@phoenix.gov. Disputes: Arizona Ombudsman-Citizens' Aide.
   - Concrete anchors to reference where relevant: registration **N624FB**; the **July 10,
     2025 "Alex" skywriting incident** over Maryvale; the **Air Support Unit** at
     Phoenix-Deer Valley Airport.
   - Legal basis to cite: **A.R.S. § 39-121** et seq. (Arizona Public Records Law).

2. **Determine the category** from `$ARGUMENTS`. Map common asks to the right record types:
   - *Flight logs* → daily operations logs: aircraft ID/registration, date/time, flight
     duration, general area of operation, mission/call type.
   - *CAD records* → Computer-Aided Dispatch entries: incident location, type, times, units
     assigned (request air-unit-tagged entries for the period).
   - *SOPs / policies* → Air Support Unit Standard Operating Procedures, deployment criteria,
     altitude/notification policies, FLIR/spotlight usage policy.
   - *Maintenance* → per-tail maintenance logs and airworthiness records.
   - *Budget* → Air Support Unit allocation, flight-hour cost basis, acquisition records
     (City Council/Legistar references).
   - *Personnel/training* → pilot/TFO certifications and training materials (deployment
     decision-making).

3. **Draft the request** with this structure:
   - Addressee + date + the requester's contact block (leave clear `[PLACEHOLDER]` fields for
     name/address/email — never invent personal identifiers).
   - A one-sentence statement that this is a request under **A.R.S. § 39-121**.
   - A **numbered, specific list** of records sought, with an explicit **date range** and
     **geographic/aircraft scope** (specificity speeds fulfillment and narrows denials).
   - **Format preference**: electronic (CSV/PDF/native) where available; for flight tracks,
     KML/CSV.
   - A **fee provision**: agree to fees up to a stated cap (e.g. `[$X]`) and ask to be
     contacted before fees exceed it; note any public-interest fee-waiver basis if applicable.
   - A request for **rolling production** and for a **written basis for any withholding /
     redaction**, citing the specific exemption claimed (preserves appeal grounds).
   - A closing with response-time expectation and the disputes contact.

4. **Output**: the ready-to-send request as a clean block the user can copy, plus a short
   checklist of `[PLACEHOLDER]`s to fill and a one-line note on where to submit it.

5. **Logging (optional but recommended)**: offer to append a tracking row to a
   `docs/records-requests-log.md` (date submitted, category, scope, channel, status, request
   ID) so requests and their responses stay organized for the case.

## Guardrails

- **Facts only.** Use figures/contacts/incidents from `docs/lawsuit-research.md`; flag
  anything that should be re-verified before sending (contacts and fees can change).
- **No invented personal data** — leave requester identity as placeholders.
- This drafts a request; it does **not** submit anything. The user reviews and sends.
- This is records-request drafting assistance, not legal advice; suggest the user's attorney
  review before filing.
