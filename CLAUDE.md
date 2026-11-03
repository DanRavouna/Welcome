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
- **Cloud saves are live** (email + password accounts). Schema and security rules: `supabase/001_saves.sql` (table `saves`, one row per player, row level security owner-only; `save_leases` + `acquire_save_lease()` = one writer at a time). Any schema change goes in a new numbered `.sql` file, applied through the Supabase Management API.
- The Supabase JS library is vendored at `vendor/supabase-2.118.0.js` (from npm, pinned) and loaded next to `index.html`. If it fails to load, the game falls back to local saves.
- Admin/secret keys are only ever fetched into memory for tests (`SB_SECRET`), never printed, never written to a file, never committed.

## Layout
- `index.html` is the built game that GitHub Pages serves (plus `vendor/`). Never edit it by hand.
- `src/world/` holds the source pieces (`shell.html`, `screen.html`, `runtime.js`, `pixel.js`, `pxworld.js`, `landmarks.js` (reusable props), `adventure.js` (clues, dungeon layouts, object art), `world.js`, `weather.js`, `ambient.js` (scenery critters), `cloud.js`, `music.js`, `flavor.js` (townsfolk remarks), then `base.js` (Base + Component), `data.js` (constants), `game.js` (Game class) and `app.js` (APP: HUD, menus, screens)). `logic.js`, `critter.html`, `helmet.html`, `build.py` and `reassemble.py` are older leftovers that the current build does not use.
- `src/*.py` and `src/*.js` are the tests and balance sims from the handoff.
- Run tests by group: `bash src/run-tests.sh @world` (also `@battle`, `@saves`, `@ui`); no argument runs everything.

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
- `supatest.py` tests real cloud saves against the live Supabase project (two throwaway accounts, created and deleted by the test). It is not part of `run-tests.sh`. Run it whenever `cloud.js`, the account panel or the schema changes:
  ```bash
  python3 -m http.server 8766 --bind 127.0.0.1 -d . &   # from the repo root
  SB_SECRET="$(curl -s 'https://api.supabase.com/v1/projects/xuawpknnmozcfzgnflel/api-keys?reveal=true' | python3 -c "import json,sys; print([k['api_key'] for k in json.load(sys.stdin) if k.get('type')=='secret'][0])")" python3 src/supatest.py
  ```
- `wplay` uses real randomness, so repeat a flaky result before calling it a regression. Perf numbers vary between machines.

## Saves on the published site
- On GitHub Pages `cloud.js` runs in Supabase mode: signed out = local save only (status `signin`); signed in = same sync logic as the claude.ai version (local-first, debounced push, lease, conflict dialog). On claude.ai it still uses the Claude account and the sign-in form is hidden.
- Sign in / create account / forgot password / sign out live in Menu → Save. Signing out first makes sure the progress is online, then clears this device's save (the account keeps it).
- Saves from the claude.ai artifact live on a different site and do not carry over by themselves. Move them with Menu → Save (copy the code there, restore it here).
