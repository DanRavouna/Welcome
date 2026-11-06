# Critter Roll: standing rules

These rules apply to every task in this repository.

## Meaning comes first (Dan, Nov 2026: "humans function in metaphors and symbolics")
The game has a greater meaning, the quest sits inside it, and every place sits inside the quest. Nothing is built, changed or reviewed as a map with props: it is built as a statement of its piece of the meaning, expressed by layout, what it lets you see, what it hides and what it asks of you, never by text that explains it (hint, never tell).
- Before building or changing any level, zone, route, NPC line, quest or reward, write ONE sentence in the handoff's "Meaning" section saying what it means inside the quest. If you cannot, do not build it yet.
- Every review of existing content starts with "what does this mean?" before layout, balance or polish.
- The working theme, quest and the draft meaning of each place are the first section of `critter-roll-handoff.md`. Dan confirmed the theme; the per-place meanings are drafts to refine with him.

1. **Read the handoff before changing anything.** Read `critter-roll-handoff.md` first (short: meaning, architecture, key numbers, what the revamp built, how tests work, watch items). The full per-phase history is `docs/handoff-archive.md`: never read it whole, search it by section title when a task touches that system. When you add a new system, put 3 to 5 lines in the core and the long notes in the archive.
2. **Test every change.** After each change run `bash src/run-tests.sh @smoke` (about 30 s) plus the tests of what you touched; run the whole suite (`bash src/run-tests.sh`, about 8.5 min) once before pushing a batch, and never push when its SUMMARY says anything failed or changed unexpectedly. Tests are snapshotted (see Tests below): accept an intended change with `bash src/snap-build.sh <test>` only after reading the diff.
3. **Keep old saves loading and never break existing progress.** Save keys such as `critter-roll:v2`, `critter-roll:world` and `critter-roll:id` must keep loading. New fields need safe defaults, and no change may drop existing fields.
4. **Never commit secrets.** The only Supabase values allowed in code are the Project URL and the publishable key below. Never add a secret or `service_role` key, a database password, or any personal access token.
5. **Commit and push tested changes directly to `main`** so GitHub Pages updates the site.
6. **Report in plain words** what changed, what is verified and what is not.

## Supabase (public values, safe in client code)
- Project URL: `https://xuawpknnmozcfzgnflel.supabase.co`
- Publishable key: `sb_publishable_iLcZK_HKfm1inXYG5MPxnQ_3ut-Hq7Z`
- **Cloud saves are live** (email + password accounts). Schema and security rules: `supabase/001_saves.sql` (table `saves`, one row per player, row level security owner-only; `save_leases` + `acquire_save_lease()` = one writer at a time). Any schema change goes in a new numbered `.sql` file, applied through the Supabase Management API.
- The Supabase JS library is vendored at `vendor/supabase-2.118.0.js` (from npm, pinned) and loaded next to `index.html`. If it fails to load, the game falls back to local saves.
- Admin/secret keys are only ever fetched into memory for tests (`SB_SECRET`), never printed, never written to a file, never committed.

## Layout
- `index.html` is the built game that GitHub Pages serves (plus `vendor/`). Never edit it by hand.
- `src/world/` holds the source pieces (`shell.html`, `screen.html`, `runtime.js`, `pixel.js`, `pxworld.js`, `landmarks.js` (reusable props), `adventure.js` (clues, dungeon layouts, object art), `world.js`, `weather.js`, `ambient.js` (scenery critters), `vfx.js` (attack visual effects), `action.js` (action mode), `cloud.js`, `music.js`, `flavor.js` (townsfolk remarks), then `base.js` (Base + Component), `data.js` (constants), `game.js` (Game class) and `app.js` (APP: HUD, menus, screens)). `logic.js`, `critter.html`, `helmet.html`, `build.py` and `reassemble.py` are older leftovers that the current build does not use.
- `src/*.py` and `src/*.js` are the tests and balance sims from the handoff.
- Developer tools: tap the ID in the menu 5 times, then Menu > Game > Dev tools (teleport, ignore level requirements, adventure shortcuts). See the handoff.
- Run tests by group (`@smoke` is the quick set for after every change): `bash src/run-tests.sh @world` (also `@battle`, `@saves`, `@ui`); no argument runs EVERYTHING ONCE (about 71 tests, about 8.5 minutes on 4 cores: a few run side by side, `JOBS=n` changes how many, and the real-time ones run alone first). Do NOT also run the groups afterwards: they are already included (that mistake made a full run take 23 minutes).

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
- `p17`, `menutest`, `transitiontest` and `devtest` run without the `pwhook` seed hook (real defaults); every other suite runs with it. `run-tests.sh` handles both.
- Most suites only print numbers, so each has a snapshot in `src/snap/` (the lines a clean run always prints); the runner reports CHANGED when one goes missing and exits non-zero (dates, real-clock weather and the daily quest are normalised; numbers are masked in the comparison except for the tests in `src/snap/exact.txt`; a non-clean test is retried once and shown as FLAKY if the retry passes). New tests should assert with `from chk import check, done`.
- `peaktest` and `towertest` compare against an old build (`live-before-endgame.html`) that is missing, so `test-setup.sh` uses the current build as a stand-in. Their "tiles changed" line proves nothing until a real old build is supplied.
- `supatest.py` tests real cloud saves against the live Supabase project (two throwaway accounts, created and deleted by the test). It is not part of `run-tests.sh`. Run it whenever `cloud.js`, the account panel or the schema changes:
  ```bash
  python3 -m http.server 8766 --bind 127.0.0.1 -d . &   # from the repo root
  SB_SECRET="$(curl -s 'https://api.supabase.com/v1/projects/xuawpknnmozcfzgnflel/api-keys?reveal=true' | python3 -c "import json,sys; print([k['api_key'] for k in json.load(sys.stdin) if k.get('type')=='secret'][0])")" python3 src/supatest.py
  ```
- Anything animated is also tested OVER REAL TIME (log the frame or pose number against the clock, as `windrhythmtest.py` does): still screenshots and per-frame checks hide rhythm bugs (speed-ups, jumps, stalls). Say plainly in the report that feel, tempo and video cannot be judged from here.
- `wplay` uses real randomness, so repeat a flaky result before calling it a regression. Perf numbers vary between machines.

## Saves on the published site
- On GitHub Pages `cloud.js` runs in Supabase mode: signed out = local save only (status `signin`); signed in = same sync logic as the claude.ai version (local-first, debounced push, lease, conflict dialog). On claude.ai it still uses the Claude account and the sign-in form is hidden.
- Sign in / create account / forgot password / sign out live in Menu → Save. Signing out first makes sure the progress is online, then clears this device's save (the account keeps it).
- Saves from the claude.ai artifact live on a different site and do not carry over by themselves. Move them with Menu → Save (copy the code there, restore it here).
