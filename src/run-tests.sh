#!/usr/bin/env bash
# Runs the browser test suites one by one and prints a pass/fail line per test.
# Usage: bash src/run-tests.sh [test.py ... | @group ...]   (default: every suite below; groups: @world @battle @saves @ui)
# A test "fails" here if it exits non-zero, times out, or prints a Traceback / page error.
# Most suites also print numbers to read by eye; see the handoff for what each checks.
SRC="$(cd "$(dirname "$0")" && pwd)"
LOG="${LOG_DIR:-/tmp/cr-test-logs}"; mkdir -p "$LOG"
HOOKED="hudcheck wplay p14 p15 p18r ctest ntest ptest ztest jitter perf peaktest citytest towertest shinytest titletest musictest fxtest statstest questtest itemtest hometest interiors aggrotest twisttest fishtest guidetest cities"
# Groups: bash src/run-tests.sh @world  (or @battle @saves @ui, several allowed; no argument = everything)
GROUP_world="forgetest slagtest wildtest maptest jittertest scaffoldtest letgotest lanternroadtest signaturetest zonespottest citiesclimbtest windtest gymtest winddrifttest windrhythmtest acttest acttest2 acttest3 acttest4 acttest5 leadtest duelflowtest descenttest walktest wicktest devtest lamptest ascenttest secrettest adventuretest transitiontest flavortest ambienttest landmarkstest wplay ztest jitter perf peaktest citytest cities interiors hometest guidetest fishtest weathertest"
GROUP_battle="abilitytest ntest ptest aggrotest fxtest towertest twisttest itemtest shinytest"
GROUP_saves="compattest menutest dextest p14 p15 p18r ctest statstest titletest questtest p17"
GROUP_ui="evotest a11ytest hudcheck musictest vfxtest"
expand() { for a in "$@"; do case "$a" in @*) v="GROUP_${a#@}"; for t in ${!v}; do echo $t.py; done;; *) echo "$a";; esac; done; }
# No argument = every test once (the default list plus all groups, duplicates removed; before, the default list and the groups overlapped and half of a "full run" was repeats). Several tests run side by side (JOBS, default 3 of the 4 cores); tests that measure real time or speed run alone first, so load does not skew them.
SERIAL=" perf.py windrhythmtest.py winddrifttest.py jitter.py "
dedupe() { awk '!seen[$0]++'; }
if [ $# -gt 0 ]; then TESTS="$(expand "$@" | dedupe)"; else TESTS="$( (for t in $HOOKED weathertest p17; do echo $t.py; done; expand @world @battle @saves @ui) | dedupe)"; fi
cd /tmp
run_one() {
  t="$1"; n="${t%.py}"
  if [ "$n" = p17 ] || [ "$n" = menutest ] || [ "$n" = transitiontest ] || [ "$n" = devtest ] || [ "$n" = compattest ]; then PP=""; else PP="$SRC/pwhook"; fi  # these run WITHOUT the seed hook (real defaults)
  start=$(date +%s)
  PYTHONPATH="$PP" timeout 600 python3 "$SRC/$n.py" > "$LOG/$n.log" 2>&1; rc=$?
  bad=$(grep -ciE "traceback|pageerror|uncaught|errors: \[['\"]" "$LOG/$n.log")
  echo "$n rc=$rc flagged_lines=$bad time=$(( $(date +%s)-start ))s"
}
export -f run_one; export SRC LOG
SER=""; PAR=""
for t in $TESTS; do case "$SERIAL" in *" $t "*) SER="$SER $t";; *) PAR="$PAR $t";; esac; done
for t in $SER; do run_one "$t"; done
[ -n "$PAR" ] && echo $PAR | tr ' ' '\n' | xargs -P "${JOBS:-3}" -I{} bash -c 'run_one {}'
true
