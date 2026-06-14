#!/usr/bin/env bash
# Unified local quality gate — run before pushing. Mirrors what CI enforces, in one command,
# so sticking to best practices is a single step. Read-only (no DB writes, no data mutation);
# --fix applies safe autofixes (black + ruff --fix). Exits non-zero if any gate fails.
#
# Usage:
#   scripts/check.sh                 # fast static gates: backend (ruff bug+async, black, bandit) + frontend (lint, tsc)
#   scripts/check.sh --tests         # also run backend pytest + frontend vitest
#   scripts/check.sh --audit         # also run pip-audit + npm audit (dependency CVEs)
#   scripts/check.sh --backend       # backend only        --frontend   frontend only
#   scripts/check.sh --fix           # apply black + ruff --fix, then re-check
set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

RUN_TESTS=0 RUN_AUDIT=0 DO_FIX=0 ONLY=""
for a in "$@"; do case "$a" in
  --tests) RUN_TESTS=1 ;; --audit) RUN_AUDIT=1 ;; --fix) DO_FIX=1 ;;
  --backend) ONLY=backend ;; --frontend) ONLY=frontend ;;
  -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
  *) echo "unknown arg: $a"; exit 2 ;;
esac; done

FAILED=()
section() { printf "\n\033[1m== %s ==\033[0m\n" "$1"; }
ok()   { printf "  \033[32m✓ %s\033[0m\n" "$1"; }
fail() { printf "  \033[31m✗ %s\033[0m\n" "$1"; FAILED+=("$1"); }
skip() { printf "  \033[33m- %s (skipped: %s)\033[0m\n" "$1" "$2"; }
# run a check: run <label> <command...>
run() { local label="$1"; shift; if "$@" >/tmp/check.out 2>&1; then ok "$label"; else fail "$label"; sed 's/^/    /' /tmp/check.out | tail -25; fi; }
# pick poetry-run if a poetry env exists, else the bare tool
py() { if command -v poetry >/dev/null && [ -f backend/pyproject.toml ]; then ( cd backend && poetry run "$@" ); else "$@"; fi; }

backend() {
  section "Backend (Python)"
  if [ "$DO_FIX" = 1 ]; then ( cd backend && py black . && py ruff check . --fix ) >/dev/null 2>&1 && ok "autofix applied"; fi
  run "ruff bug + async gate (F,ASYNC)" bash -c "cd backend && $(command -v poetry >/dev/null && echo 'poetry run ') ruff check . --select F,ASYNC --ignore F401,F841"
  run "black --check" bash -c "cd backend && $(command -v poetry >/dev/null && echo 'poetry run ') black --check ."
  if command -v bandit >/dev/null; then
    run "bandit (security, medium+)" bandit -r backend/app -ll -ii -q -x backend/app/tests,backend/tests
  else skip "bandit" "not installed (pipx install bandit)"; fi
  if [ "$RUN_AUDIT" = 1 ]; then
    if command -v pip-audit >/dev/null; then run "pip-audit (dep CVEs)" bash -c "cd backend && pip-audit"; else skip "pip-audit" "not installed"; fi
  fi
  if [ "$RUN_TESTS" = 1 ]; then run "pytest" bash -c "cd backend && $(command -v poetry >/dev/null && echo 'poetry run ') pytest -q"; fi
}

frontend() {
  section "Frontend (TS/React)"
  if [ ! -d frontend/node_modules ]; then skip "frontend checks" "run 'cd frontend && npm install' first"; return; fi
  run "eslint" bash -c "cd frontend && npm run lint --silent"
  run "tsc --noEmit" bash -c "cd frontend && npx tsc --noEmit"
  [ "$RUN_AUDIT" = 1 ] && run "npm audit (high+)" bash -c "cd frontend && npm audit --audit-level=high"
  [ "$RUN_TESTS" = 1 ] && run "vitest" bash -c "cd frontend && npm test --silent -- --run"
}

[ "$ONLY" != frontend ] && backend
[ "$ONLY" != backend ]  && frontend

section "Summary"
if [ ${#FAILED[@]} -eq 0 ]; then ok "all gates passed"; exit 0
else printf "  \033[31m%d gate(s) failed:\033[0m %s\n" "${#FAILED[@]}" "${FAILED[*]}"; exit 1; fi
