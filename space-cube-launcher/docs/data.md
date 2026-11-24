# Space Cube: the data

## Pipeline
```
tools/fetch_sky.py  ->  tools/nasa-snapshot.json      NASA Exoplanet Archive (pscomppars), 1000 nearest planets; landmark positions from CDS Sesame
tools/catalog-hand.json                               everything written by hand
tools/build_catalog.py: both of the above  ->  tools/catalog.json   (run by tools/build.py)
tools/build.py: catalog.json + src/  ->  app/src/main/assets/index.html
```
- `fetch_sky.py` needs the open internet. It runs in the GitHub workflow "Space Cube sky data" (`sky-data.yml`, started by hand, commits nothing) and prints the data to the run log as gzip+base64, because a cloud session can neither reach NASA nor download run artifacts. Decode the log into `nasa-snapshot.json`. Last fetched 2026-11-23; last test run of the workflow 2026-11-24 (success).
- NASA's TAP service ignores `order by` together with `top`: the script downloads all rows and sorts them itself.

## `catalog-hand.json`
Keys starting with `_` are notes for people; the build drops them.
- `warpLy`: the warp range.
- `sol`: our system. `planets[]`, each with:
  - `name`, `au`, `diamKm`, `rgb` (dot colour), `look` (which painted surface: `saturn`, `jupiter`, `earth`, `mars`, `venus`, `cratered`, `uranus`, `neptune`), `side` (which way its name tag points: `[1 right / -1 left, 1 down / -1 up]`)
  - `orbit`: 12 numbers from JPL "Approximate Positions of the Planets", Table 1: a, e, I, L, long.peri, long.node, then their rates per century. Earth uses the Earth-Moon barycentre row.
  - optional: `albedo` (geometric albedo, NASA; exoplanets have none and are drawn with 0.3, an assumption), `home` (the home planet), `major`, `tag` (a word shown before its class), `cls` (class, when size alone gives the wrong one), `eqRKm`, `polRKm`, `tiltDeg`, `rings` (`C0` inner edge, `C1`, `B1`, `A0` boundaries, `A1` outer edge, km from the centre), `moons[]`
  - a moon: `name`, `aKm` (orbit radius), `rKm` (body radius), `perDays`, `col` (0..1), `look` (`cratered`, `ice`, `haze`, `twotone`, `bigcrater`, `wisps`, `canyon`), `side`, optional `haze`, `major` (the main moon: bigger tag)
- `landmarks[]`: `id`, `name`, `kind` (`blackhole`, `nebula`, `galaxy`, `cluster`), `ly`, `diamLy`, `type`, `note`, `mass`, `pal` (colours), `always`, `look` (flags for the close-up: `jet`, `companion`, `crowd`, `ring`, `pulsar`, `dim`, `irregular`, `tilt`, `squash`), `query` (the name asked of CDS Sesame).
- `starCats`: the star categories (`name`, `note`, `size` of the map icon).

### To add a moon
Add an entry to the planet's `moons` in `catalog-hand.json` with numbers from the NASA NSSDC satellite fact sheet for that planet, run the tests, done. No code. A planet with no `eqRKm` uses `diamKm / 2`.

### To add a landmark
Add it to `landmarks` with a `query`, then the position has to be fetched (workflow above) or it will have no `ra`/`dec`. Its sky picture and close-up come from `kind` and `look`.

## What the page sees: `window.CAT`
One shape for every star system, ours included.
- system `{ id ('sol' or 'sys:<host name>'), name (upper case), ra, dec, ly, teff, strad, spec, cat, ecliptic, always, home, planets[] }`
- planet `{ id ('pl:<name>'), sys (its system's id), name, cls, au, aue (orbit size estimated from the year), ph (angle on its orbit today, deg), auNow (real distance today, ours only), phReal, per, re, me, eqt, year, how, diamKm, + the hand fields above }`, sorted by `au`
- landmark: as in the hand file, plus `ra`, `dec`
- `byId` finds any of them. Units: light-years between stars, AU inside a system, km for bodies.

## The time model (`catalogue.js`, "THE TIME MODEL")
Worked out once when the page loads, for today's date:
- our planets: Kepler's equation on `orbit` gives the real longitude and distance. `ph` is counted the way planets move, from the line Sun to home planet (so the home planet is always 0).
- moons and other stars' planets: `start + 360 x days since J2000 / period`. The period is real; `start` is INVENTED (a hash of the name for moons; fixed by `build_catalog.py` for exoplanets). No period: it stays at `start`.
- The game turns the whole sky from the home planet's real longitude (`CAT.homeLon`), so the Sun sits where it really is against the stars.
- Checked 2026-11-23: Jupiter 135.45 deg here, 135.42 deg in JPL Horizons. `tests/test_time.py` keeps that check.

## The saved state (`spaceCube.state.v1`)
`{ sys, planet, dir, q, nav, limit, visited[], scanned[], seen[] }`
- `sys` + `planet`: where you are. In a star system `planet: null` means at the star (screen 55); older save forms with no planet are read as the home or largest planet, where they really were. `dir`: the way you arrived (ship to body). `q`: which way you were facing.
- `nav`: `{ target, offset }` when you have flown to a body in the planet's system, else null.
- `limit`: how far out star dots are drawn (the Deep Sky setting, never below `warpLy`).
- `visited`: places you have been. `scanned`: planets you have been to. `seen`: places whose tag you saw but have not visited.
- Older keys, converted on load by `load()` in the catalogue and never written again: `spaceCubeDeep.v1` (`at: null | 'sys:..' | landmark id | 'sp:PLANET'`, later `sys`/`planet`), `spaceCubeMap.v1` (`visited`, `here`, `planets`, `seen2`), `spaceCubeNav.v1` (`target`, `offset`, `q`).
- The launcher's own settings (app groups, favourites, routines) are saved under other keys by `game.js` and are not part of this.

## Sources
- NASA Exoplanet Archive, table `pscomppars` (exoplanets and their stars)
- CDS Sesame (landmark positions)
- JPL Solar System Dynamics, "Approximate Positions of the Planets", Table 1 (our planets' orbits); JPL Horizons (the check)
- NASA NSSDC planetary fact sheets: the Sun, Saturn, Jupiter, Earth, Mars, Uranus, Neptune, the Moon, Saturnian, Jovian, Uranian and Neptunian satellites. The cloud session cannot reach NASA: `fetch_sky.py` (sky-data workflow) prints every sheet as plain text at the END of its run log; read it with the GitHub job-log tool (tail) and copy the numbers by hand, naming the page.
- PDS Ring-Moon Systems Node (Saturn's ring edges)
- HyperPhysics (temperature ranges of the star classes)
