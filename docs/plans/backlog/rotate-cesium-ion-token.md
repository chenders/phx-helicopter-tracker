# Rotate Cesium Ion token and remove the hardcoded fallback

## Problem
`frontend/src/components/FlightVisualization3DCesiumFixed.tsx` reads the Cesium
Ion access token from `import.meta.env.VITE_CESIUM_API_KEY` but falls back to a
hardcoded JWT when the env var is unset. That token is readable by anyone who
clones the repo and is **already present in git history**, so it must be treated
as compromised. An attacker could exhaust the Cesium Ion quota (denial of
service for the 3D viewer) or associate API usage with this project.

## Source
GitHub Copilot review on PR #12 (comment id 3409866524), file
`frontend/src/components/FlightVisualization3DCesiumFixed.tsx:427`.

## Why not fixed in PR #12
The env-var-first read was added in PR #12, but fully removing the in-source
fallback requires operational steps that are out of that PR's scope and can't be
done from the codebase alone:

1. **Rotate** the token in the Cesium Ion account (generate a new one; the old
   one stays leaked in git history regardless of source changes).
2. **Set** `VITE_CESIUM_API_KEY` (new token) in every build/deploy environment
   (local `.env`, CI, prod). The frontend bakes this at build time.
3. Only then remove the hardcoded fallback so deploys that miss the env var fail
   loudly instead of silently using the compromised token.

Removing the fallback before steps 1–2 would break the 3D viewer in any
environment that hasn't set the env var (cannot be verified from here).

## Acceptance
- New Ion token issued; old token revoked in the Cesium account.
- `VITE_CESIUM_API_KEY` set in all environments.
- Hardcoded fallback removed from `FlightVisualization3DCesiumFixed.tsx`.
