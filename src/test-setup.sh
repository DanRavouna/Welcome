#!/usr/bin/env bash
# Prepares the paths the test scripts expect (they were written for the original chat sandbox).
# Run from anywhere: bash src/test-setup.sh   (then build with: python3 src/build2.py)
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SRC/.." && pwd)"
mkdir -p /mnt/user-data/outputs /tmp/cr
ln -sfn "$ROOT/index.html" /mnt/user-data/outputs/critter-roll-world.html
ln -sfn "$ROOT/vendor" /mnt/user-data/outputs/vendor
ln -sfn "$SRC/world" /tmp/cr/world
cp "$SRC/walk.js" /tmp/walk.js
# peaktest/towertest first compare town tiles against an old build that was NOT in the archive.
# Stand-in: the current build, so the rest of those tests runs. Their "tiles changed" line is then meaningless.
mkdir -p /tmp/cr/backups
[ -e /tmp/cr/backups/live-before-endgame.html ] || ln -s "$ROOT/index.html" /tmp/cr/backups/live-before-endgame.html
[ -d /tmp/node_modules/axe-core ] || (cd /tmp && npm i --silent axe-core)
echo "test paths ready"
