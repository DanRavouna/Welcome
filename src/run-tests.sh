#!/usr/bin/env bash
# Runs the browser test suites one by one and prints a pass/fail line per test.
# Usage: bash src/run-tests.sh [test.py ...]   (default: every suite below)
# A test "fails" here if it exits non-zero, times out, or prints a Traceback / page error.
# Most suites also print numbers to read by eye; see the handoff for what each checks.
SRC="$(cd "$(dirname "$0")" && pwd)"
LOG="${LOG_DIR:-/tmp/cr-test-logs}"; mkdir -p "$LOG"
HOOKED="hudcheck wplay p14 p15 p18r ctest ntest ptest ztest jitter perf peaktest citytest towertest shinytest titletest musictest fxtest statstest routes questtest itemtest hometest interiors aggrotest twisttest fishtest guidetest cities"
TESTS="${*:-$(for t in $HOOKED p17; do echo $t.py; done)}"
cd /tmp
for t in $TESTS; do
  n="${t%.py}"
  if [ "$n" = p17 ]; then PP=""; else PP="$SRC/pwhook"; fi
  start=$(date +%s)
  PYTHONPATH="$PP" timeout 600 python3 "$SRC/$n.py" > "$LOG/$n.log" 2>&1; rc=$?
  bad=$(grep -ciE "traceback|pageerror|uncaught|errors: \[['\"]" "$LOG/$n.log")
  echo "$n rc=$rc flagged_lines=$bad time=$(( $(date +%s)-start ))s"
done
