#!/usr/bin/env bash
# Runs the browser test suites one by one and prints a pass/fail line per test.
# Usage: bash src/run-tests.sh [test.py ... | @group ...]   (default: every suite below; groups: @world @battle @saves @ui)
# A test "fails" here if it exits non-zero, times out, or prints a Traceback / page error.
# Most suites also print numbers to read by eye; see the handoff for what each checks.
SRC="$(cd "$(dirname "$0")" && pwd)"
LOG="${LOG_DIR:-/tmp/cr-test-logs}"; mkdir -p "$LOG"
HOOKED="hudcheck wplay p14 p15 p18r ctest ntest ptest ztest jitter perf peaktest citytest towertest shinytest titletest musictest fxtest statstest routes questtest itemtest hometest interiors aggrotest twisttest fishtest guidetest cities"
# Groups: bash src/run-tests.sh @world  (or @battle @saves @ui, several allowed; no argument = everything)
GROUP_world="forgetest slagtest acttest acttest2 acttest3 acttest4 acttest5 leadtest duelflowtest descenttest walktest wicktest devtest lamptest ascenttest secrettest adventuretest transitiontest flavortest ambienttest landmarkstest wplay ztest jitter perf peaktest citytest routes cities interiors hometest guidetest fishtest weathertest"
GROUP_battle="abilitytest rttest ntest ptest aggrotest fxtest towertest twisttest itemtest shinytest"
GROUP_saves="compattest menutest dextest p14 p15 p18r ctest statstest titletest questtest p17"
GROUP_ui="evotest a11ytest hudcheck musictest vfxtest"
expand() { for a in "$@"; do case "$a" in @*) v="GROUP_${a#@}"; for t in ${!v}; do echo $t.py; done;; *) echo "$a";; esac; done; }
if [ $# -gt 0 ]; then TESTS="$(expand "$@")"; else TESTS="$(for t in $HOOKED weathertest p17; do echo $t.py; done)"; fi
cd /tmp
for t in $TESTS; do
  n="${t%.py}"
  if [ "$n" = p17 ] || [ "$n" = menutest ] || [ "$n" = transitiontest ] || [ "$n" = devtest ] || [ "$n" = compattest ]; then PP=""; else PP="$SRC/pwhook"; fi  # these two run WITHOUT the seed hook (real defaults)
  start=$(date +%s)
  PYTHONPATH="$PP" timeout 600 python3 "$SRC/$n.py" > "$LOG/$n.log" 2>&1; rc=$?
  bad=$(grep -ciE "traceback|pageerror|uncaught|errors: \[['\"]" "$LOG/$n.log")
  echo "$n rc=$rc flagged_lines=$bad time=$(( $(date +%s)-start ))s"
done
