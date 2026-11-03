# Critter Roll: standing rules

These rules apply to every task in this repository.

1. **Read the handoff before changing anything.** Read `critter-roll-handoff.md` first. It covers the architecture, systems, balance numbers, tests and watch items.
2. **Test every change.** Run the full suite at the end of each phase.
3. **Keep old saves loading and never break existing progress.** Save keys such as `critter-roll:v2`, `critter-roll:world` and `critter-roll:id` must keep loading. New fields need safe defaults, and no change may drop existing fields.
4. **Never commit secrets.** The only Supabase values allowed in code are the Project URL and the publishable key below. Never add a secret or `service_role` key, a database password, or any personal access token.
5. **Commit and push tested changes directly to `main`** so GitHub Pages updates the site.
6. **Report in plain words** what changed, what is verified and what is not.

## Supabase (public values, safe in client code)
- Project URL: `https://xuawpknnmozcfzgnflel.supabase.co`
- Publishable key: `sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z`
- Online features have not started yet. Do not add them unless a task asks for them.

## Layout
- `index.html` is the built, self-contained game that GitHub Pages serves. Never edit it by hand.
- `src/world/` holds the source pieces (`shell.html`, `screen.html`, `runtime.js`, `pixel.js`, `pxworld.js`, `world.js`, `cloud.js`, `music.js`, `app.js`). `logic.js`, `critter.html`, `helmet.html`, `build.py` and `reassemble.py` are older leftovers that the current build does not use.
- `src/*.py` and `src/*.js` are the tests and balance sims from the handoff.

## Build
```bash
python3 src/build2.py            # writes index.html at the repo root
```

## Tests
```bash
pip install playwright==1.63.0   # matches the preinstalled Chromium; never run "playwright install"
bash src/test-setup.sh           # links the paths the tests expect (/mnt/user-data/outputs, /tmp/cr, /tmp/walk.js, axe-core)
bash src/run-tests.sh            # full suite, one line per test; logs go to /tmp/cr-test-logs/
bash src/run-tests.sh wplay.py   # one test
```
- `p17` runs without the `pwhook` seed hook, and every other suite runs with it. `run-tests.sh` handles both.
- A zero exit code is not proof of a pass. Most suites print numbers that must be read and compared with the handoff.
- `peaktest` and `towertest` compare against an old build (`live-before-endgame.html`) that is missing, so `test-setup.sh` uses the current build as a stand-in. Their "tiles changed" line proves nothing until a real old build is supplied.
- `wplay` uses real randomness, so repeat a flaky result before calling it a regression. Perf numbers vary between machines.

## Saves on the published site
- On GitHub Pages, `window.claude` does not exist, so `cloud.js` falls back to local-only saves (status `local`) in that browser's localStorage.
- Saves from the claude.ai artifact live on a different site and do not carry over by themselves. Move them with Menu → Backup (export the code there, import it here).
