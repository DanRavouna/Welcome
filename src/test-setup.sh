#!/usr/bin/env bash
# Prepares the paths the test scripts expect (they were written for the original chat sandbox).
# Run from anywhere: bash src/test-setup.sh   (then build with: python3 src/build2.py)
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SRC/.." && pwd)"
mkdir -p /mnt/user-data/outputs /tmp/cr
# CR_BUILD=games/critter-roll-review/index.html bash src/test-setup.sh   points the suite at another build (the review copy)
ln -sfn "$ROOT/${CR_BUILD:-games/critter-roll/index.html}" /mnt/user-data/outputs/critter-roll-world.html
ln -sfn "$ROOT/index.html" /mnt/user-data/outputs/shelf.html
ln -sfn "$ROOT/games" /mnt/user-data/outputs/games
ln -sfn "$ROOT/vendor" /mnt/user-data/outputs/vendor
ln -sfn "$SRC/${CR_WORLD:-world}" /tmp/cr/world
cp "$SRC/walk.js" /tmp/walk.js
[ -d /tmp/node_modules/axe-core ] || (cd /tmp && npm i --silent axe-core)
echo "test paths ready"
