#!/usr/bin/env bash
# Runs the browser test suites one by one and prints a pass/fail line per test.
# Usage: bash src/run-tests.sh [test.py ... | @group ...]   (default: every suite below; groups: @world @battle @saves @ui)
# A test "fails" here if it exits non-zero, times out, or prints a Traceback / page error.
# Most suites also print numbers to read by eye; see the handoff for what each checks.
SRC="$(cd "$(dirname "$0")" && pwd)"
LOG="${LOG_DIR:-/tmp/cr-test-logs}"; mkdir -p "$LOG"
HOOKED="hudcheck wplay p14 p15 p18r ctest ntest ptest ztest jitter perf peaktest citytest towertest shinytest titletest musictest fxtest statstest questtest itemtest hometest interiors aggrotest twisttest fishtest guidetest cities"
# Groups: bash src/run-tests.sh @world  (or @battle @saves @ui, several allowed; no argument = everything)
GROUP_world="forgetest slagtest wildtest maptest jittertest scaffoldtest letgotest lanternroadtest signaturetest zonespottest citiesclimbtest windtest gymtest gymtest2 balancetest winddrifttest windrhythmtest acttest acttest2 acttest3 acttest4 acttest5 leadtest duelflowtest descenttest walktest wicktest devtest lamptest ascenttest secrettest adventuretest transitiontest flavortest ambienttest landmarkstest wplay ztest jitter perf peaktest citytest cities interiors hometest guidetest fishtest weathertest"
GROUP_battle="abilitytest ntest ptest aggrotest fxtest towertest twisttest itemtest shinytest"
GROUP_saves="resettest compattest menutest dextest p14 p15 p18r ctest statstest titletest questtest p17"
# @smoke: the quick broad set (about 30 s side by side) to run after EVERY change; the whole suite (no argument) once before pushing a batch
GROUP_smoke="balancetest resettest compattest jittertest maptest guidetest citytest hometest fxtest windtest gymtest zonespottest statstest flavortest landmarkstest evotest"
GROUP_ui="evotest a11ytest hudcheck musictest vfxtest"
expand() { for a in "$@"; do case "$a" in @*) v="GROUP_${a#@}"; for t in ${!v}; do echo $t.py; done;; *) echo "$a";; esac; done; }
# No argument = every test once (the default list plus all groups, duplicates removed; before, the default list and the groups overlapped and half of a "full run" was repeats). Six tests run side by side by default (JOBS): the suite is mostly sleeping (about 480 s of fixed waits in 1100 s of test time), so 6 jobs on 4 cores still leave the CPU half idle.
SERIAL="${SERIAL:- }"   # tests to run alone first, e.g. SERIAL=" perf.py " (none by default: the real-time tests held up under 6 parallel jobs)
dedupe() { awk '!seen[$0]++'; }
if [ $# -gt 0 ]; then TESTS="$(expand "$@" | dedupe)"; else TESTS="$( (for t in $HOOKED weathertest p17; do echo $t.py; done; expand @world @battle @saves @ui) | dedupe)"; fi
cd /tmp
run_one() {
  t="$1"; n="${t%.py}"
  if [ "$n" = p17 ] || [ "$n" = resettest ] || [ "$n" = menutest ] || [ "$n" = transitiontest ] || [ "$n" = devtest ] || [ "$n" = compattest ]; then PP=""; else PP="$SRC/pwhook"; fi  # these run WITHOUT the seed hook (real defaults)
  start=$(date +%s); flaky=""
  for attempt in 1 2; do
    PYTHONPATH="$PP" timeout 600 python3 "$SRC/$n.py" > "$LOG/$n.log" 2>&1; rc=$?
    bad=$(grep -ciE "traceback|pageerror|uncaught|errors: \[['\"]|^FAIL " "$LOG/$n.log")
    snap=$(python3 "$SRC/snapcmp.py" compare "$n" "$LOG/$n.log")
    # a run that is not clean is repeated once (tests that watch live timing sometimes miss under load); if the repeat is clean it is reported as flaky, never hidden
    clean=0; if [ "$rc" = 0 ] && [ "$bad" = 0 ]; then case "$snap" in snap=CHANGED*) ;; *) clean=1;; esac; fi
    if [ $clean = 1 ]; then if [ $attempt = 2 ]; then flaky=" FLAKY(passed on the second try)"; fi; break; fi
  done
  echo "$n rc=$rc flagged_lines=$bad time=$(( $(date +%s)-start ))s $snap$flaky"
}
export -f run_one; export SRC LOG
SER=""; PAR=""
for t in $TESTS; do case "$SERIAL" in *" $t "*) SER="$SER $t";; *) PAR="$PAR $t";; esac; done
rm -f "$LOG"/*.snapdiff; RES="$LOG/.results"; : > "$RES"
for t in $SER; do run_one "$t" | tee -a "$RES"; done
[ -n "$PAR" ] && echo $PAR | tr ' ' '\n' | xargs -P "${JOBS:-6}" -I{} bash -c 'run_one {}' | tee -a "$RES"
N=$(grep -c "rc=" "$RES"); F=$(grep "rc=" "$RES" | grep -vc "rc=0 flagged_lines=0"); C=$(grep -c "snap=CHANGED" "$RES")
for c in $(grep "snap=CHANGED" "$RES" | cut -d' ' -f1); do echo "  $c: these lines are no longer printed (accept an intended change with: bash src/snap-build.sh $c):"; head -6 "$LOG/$c.snapdiff" | cut -c1-200 | sed 's/^/    /'; done
K=$(grep -c "FLAKY" "$RES"); echo "SUMMARY: $N tests | $F failed | $C changed since the snapshot | $K flaky (passed only on retry)"
[ "$F" = 0 ] && [ "$C" = 0 ]
