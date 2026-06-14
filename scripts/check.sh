#!/usr/bin/env bash
# Unified quality gate — runs the same checks CI enforces, in parallel after ONE setup, so
# local self-check and CI share one definition (no drift, no per-check setup tax). Read-only
# (no DB writes / data mutation); --fix applies safe autofixes. Exits non-zero iff a BLOCKING
# check fails; advisory checks (mypy/bandit/audits/vitest) are reported but never block.
#
# Tools must be runnable in the current shell. Locally: `poetry run bash scripts/check.sh ...`
# (or an activated venv) for the backend; CI installs them globally before calling this.
#
# Usage:
#   scripts/check.sh                 # static gates: backend (ruff, black, mypy*, bandit*) + frontend (eslint, tsc)
#   scripts/check.sh --tests         # also pytest (backend) + vitest* (frontend)
#   scripts/check.sh --audit         # also pip-audit* + npm-audit*
#   scripts/check.sh --backend       # backend only      --frontend  frontend only
#   scripts/check.sh --jobs N        # max parallel checks (default: CPU count)
#   scripts/check.sh --fix           # apply black + ruff --fix first      (* = advisory)
set -uo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"; cd "$ROOT"

RUN_TESTS=0 RUN_AUDIT=0 DO_FIX=0 ONLY=""
JOBS="$( (nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4) | tr -d ' ' )"
for a in "$@"; do case "$a" in
  --tests) RUN_TESTS=1 ;; --audit) RUN_AUDIT=1 ;; --fix) DO_FIX=1 ;;
  --backend) ONLY=backend ;; --frontend) ONLY=frontend ;;
  --jobs=*) JOBS="${a#*=}" ;; --jobs) ;; # value handled below
  -h|--help) sed -n '2,21p' "$0"; exit 0 ;;
  *) [ "${PREV:-}" = "--jobs" ] && JOBS="$a" || { echo "unknown arg: $a"; exit 2; } ;;
esac; PREV="$a"; done
GH="${GITHUB_ACTIONS:-}"

c_ok=$'\033[32m'; c_bad=$'\033[31m'; c_warn=$'\033[33m'; c_b=$'\033[1m'; c_z=$'\033[0m'
section() { printf "\n%s== %s ==%s\n" "$c_b" "$1" "$c_z"; }
ok()   { printf "  %s✓ %s%s\n" "$c_ok"  "$1" "$c_z"; }
fail() { printf "  %s✗ %s%s\n" "$c_bad" "$1" "$c_z"; }
warn() { printf "  %s! %s%s\n" "$c_warn" "$1" "$c_z"; }
skip() { printf "  %s- %s%s\n" "$c_warn" "$1" "$c_z"; }

# Parallel-array task list: NAMES / BLOCK(1=blocking,0=advisory) / CMDS. Add longest-first.
NAMES=(); BLOCK=(); CMDS=()
add() { NAMES+=("$1"); BLOCK+=("$2"); CMDS+=("$3"); }
have() { command -v "$1" >/dev/null 2>&1; }

build_backend() {
  [ "$RUN_TESTS" = 1 ] && add "pytest" 1 "cd backend && pytest tests/ -q --cov=app --cov-report=xml --cov-report=term-missing"
  add "mypy"  0 "cd backend && mypy app --ignore-missing-imports"          # advisory (matches CI's `|| true`)
  add "ruff"  1 "cd backend && ruff check ."                               # blocking (full ruleset)
  add "black" 1 "cd backend && black --check ."                            # blocking
  have bandit && add "bandit" 0 "cd backend && bandit -r app -ll -ii -q -x app/tests,tests"  # advisory
  { [ "$RUN_AUDIT" = 1 ] && have pip-audit; } && add "pip-audit" 0 "cd backend && pip-audit" # advisory
}
build_frontend() {
  if [ ! -d frontend/node_modules ]; then skip "frontend (run 'cd frontend && npm install' first)"; return; fi
  [ "$RUN_TESTS" = 1 ] && add "vitest" 0 "cd frontend && npm test --silent -- --run"          # advisory (CI is continue-on-error)
  add "tsc"    1 "cd frontend && (npm run type-check || npx tsc --noEmit)"  # blocking
  add "eslint" 1 "cd frontend && npm run lint --silent"                     # blocking
  { [ "$RUN_AUDIT" = 1 ]; } && add "npm-audit" 0 "cd frontend && npm audit --audit-level=high"  # advisory
}

run_all() {  # launch tasks with a concurrency cap, time each, report; return 1 if a blocking task failed
  local n=${#NAMES[@]} tmp i rc dur failed=0
  [ "$n" -eq 0 ] && { skip "no checks selected"; return 0; }
  tmp="$(mktemp -d)"
  for ((i=0; i<n; i++)); do
    while [ "$(jobs -rp 2>/dev/null | wc -l | tr -d ' ')" -ge "$JOBS" ]; do wait -n 2>/dev/null || sleep 0.3; done
    {
      s="$(date +%s)"
      if bash -c "${CMDS[$i]}" >"$tmp/$i.out" 2>&1; then r=0; else r=$?; fi
      echo "$r" >"$tmp/$i.rc"; echo "$(( $(date +%s) - s ))" >"$tmp/$i.dur"
    } &
  done
  wait
  for ((i=0; i<n; i++)); do
    rc="$(cat "$tmp/$i.rc" 2>/dev/null || echo 1)"; dur="$(cat "$tmp/$i.dur" 2>/dev/null || echo 0)"
    if [ "$rc" = 0 ]; then ok "${NAMES[$i]} (${dur}s)"
    elif [ "${BLOCK[$i]}" = 1 ]; then
      fail "${NAMES[$i]} (${dur}s)"; failed=1
      [ -n "$GH" ] && echo "::error title=check.sh::${NAMES[$i]} failed"
      [ -n "$GH" ] && echo "::group::${NAMES[$i]} output"
      sed 's/^/    /' "$tmp/$i.out" | tail -40
      [ -n "$GH" ] && echo "::endgroup::"
    else
      warn "${NAMES[$i]} (${dur}s, advisory — not blocking)"
      [ -n "$GH" ] && echo "::warning title=check.sh::${NAMES[$i]} advisory finding (see logs)"
    fi
  done
  rm -rf "$tmp"
  return $failed
}

OVERALL=0
if [ "$ONLY" != frontend ]; then
  section "Backend (Python)  [jobs=$JOBS]"
  [ "$DO_FIX" = 1 ] && ( cd backend && black . && ruff check . --fix ) >/dev/null 2>&1 && ok "autofix applied"
  NAMES=(); BLOCK=(); CMDS=(); build_backend; run_all || OVERALL=1
fi
if [ "$ONLY" != backend ]; then
  section "Frontend (TS/React)  [jobs=$JOBS]"
  NAMES=(); BLOCK=(); CMDS=(); build_frontend; run_all || OVERALL=1
fi

section "Summary"
[ "$OVERALL" = 0 ] && { ok "all blocking gates passed"; exit 0; } || { fail "a blocking gate failed (see above)"; exit 1; }
