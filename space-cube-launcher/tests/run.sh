#!/usr/bin/env bash
# Space Cube: build, then run every test against the built page. From anywhere:  bash space-cube-launcher/tests/run.sh
# One test: bash space-cube-launcher/tests/run.sh test_travel.py      Needs: pip install playwright==1.63.0 (and node, for the syntax check in the build)
cd "$(dirname "$0")" || exit 1
python3 ../tools/build.py || { echo "BUILD FAILED"; exit 1; }
fail=0
for t in ${@:-test_saves.py test_travel.py test_map.py test_time.py}; do
  echo "=== $t"; python3 "$t" > "/tmp/sc-$t.log" 2>&1; rc=$?
  grep -E "^(FAIL|FAILED|all ok|Traceback)" "/tmp/sc-$t.log" || tail -3 "/tmp/sc-$t.log"
  [ $rc -ne 0 ] && { fail=1; echo "    full log: /tmp/sc-$t.log"; }
done
git -C .. diff --quiet -- app/src/main/assets/index.html || echo "NOTE: the built page differs from the committed one (commit it with the sources)"
[ $fail -eq 0 ] && echo "SUMMARY: all passed" || { echo "SUMMARY: FAILURES"; exit 1; }
