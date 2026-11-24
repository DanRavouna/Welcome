# Space Cube Launcher: handoff

Read this first. It is the short version; the three files in `docs/` hold the detail and are meant to be searched, not read whole.

| When you need | Read |
|---|---|
| What Dan has decided, and how to work with him | `docs/rules.md` |
| Where things are in the code, the test hooks, what runs every frame | `docs/architecture.md` |
| The data: shapes, sources, how to add a moon or a landmark | `docs/data.md` |
| Installing the Android app | `README.md` |

## What it is
An Android home screen. The phone app (`app/`, Kotlin) is a thin shell around one web page: a 3D view from a ship in space, with your apps as floating cubes. The page is also a small space game: you sit at a planet, see the real sky around you, fly to its moons and warp to other planets, stars and landmarks. A star map shows where you have been.

The phone loads the page live from GitHub Pages (`/space-cube/`), so pushing to `main` updates the phone. Triple-tap the clock to reload; Settings shows the build tag (`SCREEN 2026-11-24 · 56`).

## The one rule right now
**Uniformity.** Dan, 2026-11-23: "we cant have multiple parallel systems" and "uniformity is the main rule for now as this will be the base we ll be iterating from". Every place, planet, tag, save and rule goes through ONE path. Before adding anything, find the existing path and extend it. A check on a name (`if (name === 'SATURN')`) is a bug; the data gets a field instead.

## How it is built (one of everything)
- **One data file**: `tools/catalog.json`, made from `tools/nasa-snapshot.json` (NASA download) + `tools/catalog-hand.json` (everything written by hand).
- **One catalogue** (`src/catalogue.js`, `window.CAT`), shared by the game and the map. It owns: every place; the **one saved state** (`spaceCube.state.v1`); the **rules** (reach, known, fact text); the **time model** (where every orbiting body is today); the **pictures** of places.
- **One body scene** (`buildBody` in `src/game.js`): the planet you are at, at real scale, with rings and moons if its data has them, or the star itself when you are at a star. Home (Saturn) is just one more planet.
- **A jump to a star lands at the star** (every star, ours included). The star is one more body of its system (`LOCAL`, `local: true`): tagged, locked on and jumped to like a planet.
- **One name tag** (`makeTag` / `tagBox` / `drawTag`), for moons, planets, stars and landmarks.
- **Two ways to travel**, each used everywhere: *flights* inside a planet's system (planet and moons), *warps* between planets, stars and landmarks.
- **One build**: `python3 space-cube-launcher/tools/build.py` assembles `src/` + data into `app/src/main/assets/index.html`. Never edit that file by hand.

## Work loop
```bash
# 1. edit space-cube-launcher/src/*  (or tools/catalog-hand.json for data)
# 2. bump the build tag in src/game.js:  tag.textContent = 'SCREEN <date> · <n+1>'
bash space-cube-launcher/tests/run.sh test_travel.py   # while working: only the test of what you touched
bash space-cube-launcher/tests/run.sh          # once, before pushing: builds, then runs every test (about 3 minutes)
# 3. commit the sources AND the built app/src/main/assets/index.html together, push to main
gh run list --workflow pages.yml -L 1          # the deploy; if it failed start a FRESH run, do not re-run:
gh api -X POST repos/DanRavouna/Welcome/actions/workflows/pages.yml/dispatches -f ref=main
```
- To look at it in a browser: `python3 space-cube-launcher/tools/build.py --preview /tmp/space-cube.html` (loads three.js and the font from the web).
- Docs: update this file every time; `docs/rules.md` only when Dan decides something; `docs/architecture.md` / `docs/data.md` only when the structure or data shape changes.
- Old saves must keep loading: `tests/test_saves.py` plants every old form. Add a case there whenever the saved shape changes.
- Report to Dan in plain words: what changed, what is verified, what is not. **Headless tests cannot judge feel, speed or how motion looks on the phone. Say so every time.**

## Key numbers
| | |
|---|---|
| Warp range for ordinary stars | 20 ly (`warpLy` in the data). Our system and the landmarks are always reachable (`always`). |
| Where you park at a planet | 25 of its radii out (`PARK_RADII`), drawn 400 scene units away (`KM_SCENE`), 50° off its star so it is mostly lit (`parkDir`) |
| Smallest dot in the sky | 9 px (`MIN_PX`). Everything else is its true angular size. |
| Sky shells (scene units) | star dots 950, pictures 980 (`SHELL`, `MARK_R`) |
| Warp timing | turn 1.0 s, warp 2.6 s, arrive 3.0 s (0.5 / 1.6 / 2.2 inside one system); far jumps hold in hyperspace (dark veil, dense streaks: `warpVeil`, `warpDeep`, `veilScene`) 2 to 4 s |
| Catalogue size | 642 other star systems, 1000 exoplanets, 8 planets of ours, 12 landmarks |

## What is real and what is not
- **Real**: star positions and distances, planet sizes/orbits/temperatures (NASA Exoplanet Archive); landmark positions (CDS Sesame); where our 8 planets are today (JPL elements, checked against JPL Horizons); sizes of Saturn, Jupiter, Earth and their moons, moon orbit sizes and periods (NASA fact sheets).
- **Invented, and marked so in the data**: where a moon or an exoplanet starts on its orbit; the tilt of other stars' orbit planes; every surface picture and landmark close-up (artist's impressions); moon colours; the look of a star up close (disk and glow; its colour comes from its real temperature, its size from its real radius). 9 of the 643 stars have no radius in the catalogue and are drawn at the Sun's.
- Not checked against a source in this session: the Sun's radius in the code (696,000 km in `SUN_R_KM`, 1,392,700 km across in `SUN_DIAM_LY`). The NASA fact sheet site was not reachable from the cloud session.
- Planet spin axes lean by the real amount but around an arbitrary line, not toward the real pole.

## Open items (nothing here is started)
Done in screen 56: every body of a system is measured from where the ship is parked (`localShip`), not from the body's centre, so at a star the close planets point the right way; the white warp flash is replaced by hyperspace.
Done in screen 55: the star's tag can be tapped and locked on; the map's JUMP to the star you are in works (it lands at the star); Saturn's `YOUR SHIP` tag is gone.
1. **Sky scale.** Dan, 2026-11-23: nearby planets look the same size as far objects. Cause: nearly everything is under 1 px, so the 9 px floor catches it all. Options given to him: brightness by real apparent brightness (my pick), a compressed size scale, both, or true size only when locked on. He answered "for now none".
2. Moons exist only for Earth, Jupiter and Saturn. Adding more is data only (`docs/data.md`).
3. Moon starting points are invented. Real ones need satellite elements and the planet's real pole.
4. Never checked on the phone since screen 47: speed, the arrival in motion, and Dan's real save converting. Also new and unseen on the phone (screen 55): parking at a star.
5. An old stand-alone star map artifact from the mockup phase still exists in Dan's Claude artifacts, stale. He has not asked to delete it.
6. The two Sun sizes in the code (see "What is real") should become one constant, checked against NASA.
7. From Saturn the Sun and the inner planets sit within a few pixels of each other, so which one a tap picks there cannot be judged from here.

## Watch items
- `clearBody()` resets the flight state (`nav`, `shipPos`, `travel`). Anything that rebuilds the scene loses the parking spot unless it is restored afterwards (see the block "back where you left off").
- `k` (km to scene units) changes with the planet you are at. Never cache something multiplied by `k` across a rebuild.
- A `const` used inside `buildBody`/`clearBody` must be declared before the first build at the bottom of the DEEP SKY section, or the page dies on load (temporal dead zone). `node --check` does not catch this; the tests do.
- The sky jumps while the warp's veil is up, because you come out at the parking spot facing the planet. The veil is about 93% opaque, so the jump may show faintly.
- `git pull --rebase` refuses with unstaged files: commit first.
