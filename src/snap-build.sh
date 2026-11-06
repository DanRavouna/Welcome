#!/usr/bin/env bash
# Rebuilds the snapshots in src/snap from THREE fresh runs (lines that differ between them are left out).
#   bash src/snap-build.sh            all tests (about 15 minutes)
#   bash src/snap-build.sh name ...   only these tests (after an intended change)
# Run it on a build you have already checked by hand: whatever it prints now becomes the expected output.
SRC="$(cd "$(dirname "$0")" && pwd)"; T="$(mktemp -d)"
if [ $# -gt 0 ]; then ARGS="$(for a in "$@"; do echo "${a%.py}.py"; done)"; else ARGS=""; fi
LOG_DIR="$T/a" bash "$SRC/run-tests.sh" $ARGS > "$T/a.txt" 2>&1; LOG_DIR="$T/b" bash "$SRC/run-tests.sh" $ARGS > "$T/b.txt" 2>&1; LOG_DIR="$T/c" bash "$SRC/run-tests.sh" $ARGS > "$T/c.txt" 2>&1
grep -h "rc=" "$T/a.txt" "$T/b.txt" "$T/c.txt" | grep -v "rc=0 flagged_lines=0" && echo "some tests failed: fix them first, no snapshot was written for the failing ones."
for f in "$T"/a/*.log; do n="$(basename "$f" .log)"; ok=1; grep -q "^$n rc=0 flagged_lines=0" "$T/a.txt" && grep -q "^$n rc=0 flagged_lines=0" "$T/b.txt" && grep -q "^$n rc=0 flagged_lines=0" "$T/c.txt" || ok=0; [ $ok = 1 ] && python3 "$SRC/snapcmp.py" build "$n" "$T/a/$n.log" "$T/b/$n.log" "$T/c/$n.log"; done
rm -rf "$T"
