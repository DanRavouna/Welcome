# Space Cube: where things are in the code

Find a section by searching for its title (the words in capitals); line numbers move.

## Files
| File | What it is |
|---|---|
| `src/page.html` | Markup and styles. Four markers (`{{catalog.json}}`, `{{catalogue.js}}`, `{{game.js}}`, `{{map.js}}`) are filled by the build. Order on the page: data, catalogue, three.js, game, map. |
| `src/catalogue.js` (200 lines) | `window.CAT`. No three.js. Sections: star categories and colours, reading the data, THE TIME MODEL, distances, THE STATE, THE RULES, THE PICTURES. |
| `src/game.js` (4,100 lines) | The home screen. One script, one scope. Sections below. |
| `src/map.js` (300 lines) | The star map, `window.SpaceMap`. Its own three.js scene on its own canvas. |
| `tools/build.py` | The build. Also runs `build_catalog.py` and syntax-checks each script with node. |
| `tests/` | `run.sh` builds and runs everything; `sc.py` is the shared helper. |
| `app/` | The Android shell (Kotlin): `MainActivity.kt` hosts the page, `LauncherBridge.kt` is `window.Launcher`, `Routines.kt` (checklist alarms, and the one receiver for all alarms), `Calendars.kt` (`PhoneCalendars`: Android's calendar store; `EventReminders`: one alarm for the next reminder, notification or page), `SpaceWallpaper.kt`. See `README.md`. |

## `game.js`, in order
| Section title | What is in it |
|---|---|
| TUNABLE VALUES | `CFG`, the clock |
| ROTATING SPACE BACKGROUND | The three scenes and rigs (below), the star backdrop |
| NEAR SPACE | The flying dots around the cubes |
| A STAR SYSTEM, AS SEEN FROM A SHIP... | Constants (`KM_SCENE`, `PARK_RADII`, `k`), the frame of our system (`N` ecliptic north, `S` the Sun seen from the home planet, `T`, `side`), painted textures (`saturnTexture`, `ringTexture`, `moonTexture`), `updateMoons`, `orbitPlane`, `orbitPos` |
| THE PLANET YOU'RE AT | `BODY`, `bodyFrame`, `parkDir`, `clearBody`, **`buildBody(sys, q, dir)`**: body, rings, moons, their tags (`HUD_TARGETS`) and flight targets (`NAV`) |
| TEXTURES, RECENT APPS, NAVIGATION, SETTINGS | The launcher: cubes, groups, recents, settings screens |
| HUD NAME TAGS | `makeTag`, `setTagText`, `tagBox`, `drawTag`, `updateHud` (tags of the planet and moons) |
| PASSING SHIPS, THE SPACE WHALE, SQUADRONS, LEFT BEHIND, FLIGHT PATHS | Ambient traffic and how it avoids things |
| FLIGHTS | `navTap` (every tap on space lands here), `lockOn`, `engage`, `planRoute`, `navUpdate`, `navHud` (lock brackets, arrival facts), occluders, warp streaks |
| DEEP SKY | Everything about the sky and warps (below) |
| SEARCH, FAVOURITES IN THE EGGS | The launcher again |
| (main loop) | `animate`: search for `renderer.autoClear = false` |
| PHONE HOOKS | What the Android app calls: `handleBack`, `goHome`, `setInsets`, `onScreenOff`, `onUnlock`, `setPaused`, `onAppsChanged` |

### The three scenes (drawn in this order every frame)
1. `skyScene` / `skyRig`: the backdrop: star dots (one `Points` cloud, `sysPoints`), landmark and planet pictures (sprites), the Milky Way.
2. `sysScene` / `sysRig`: the far things at real scale. `sysWorld` holds the planet scene (`BODY.group`) and moves opposite to the ship (`shipPos`). Also `destGroup` (a landmark's close-up), `destStar` (the glow of the star you are near), the route dots, the arrival beacon and picture.
3. `scene` / `spaceRig`: dots, ships, whale (hidden behind planets by invisible stand-ins, `occluders` and `nearOcc`), then your cubes on top with a level camera.
`skyRig` and `sysRig` copy `spaceRig` every frame (`syncSysRig`). Turning the view means turning `spaceRig`.

### DEEP SKY section
- **State**: `deep` is `CAT.state` plus `deep.here` (where you are among the stars, ly) and the getters `atHome` / `at`.
- **Objects**: `SOL`, `SYSTEMS` (642), `LANDMARKS`, `ALL_DEEP`, `PLACE` (id to object). `LOCAL`: the other bodies of the system you are in, each marked `local: true` with `dirLocal`, `distKm` and `q` (its planet, or null for the star, `kind: 'star'`, id `star:<system id>`, no sprite: its glow is `destStar`), rebuilt by `setupLocal()`. Every rule about "a body of this system" checks `o.local`, never a kind. `ACTIVE` / `SPRITED`: the short lists checked every frame, rebuilt by `refreshMarkers()`.
- **Rules of the sky**: `inRange(o)`, `deepVis(o)` (how visible a marker is), `relDir(o)`, `sizeMarkers()` (true angular size, 9 px floor).
- **Arriving**: `arriveAt(o, dir, planetName)` = `CAT.arrive` + `setupLocal` + `buildDest` + `refreshMarkers`. `buildDest` either draws the star's glow and calls `buildBody` (a planet), calls `buildBody` with the star as the body (`q.star`: drawn by `starMesh`, radius `strad` x the Sun's, no planet name), or builds a landmark close-up by `kind` and `look` in `destGroup`. `dest.group` / `dest.D` say what rushes in on arrival and how far it ends up.
- **Warping**: `deepGo(o, planetName)` starts it; `deepJumpUpdate(dt)` runs it: turn, charge, warp, white hold, the swap (`arriveAt`) in the middle of the white, then the growth from the size it had before the jump. At the swap a planet's direction becomes `parkDir(...)` and the view snaps to face it.
- **Tags of sky places**: `deepLabels()` (a pool of 6, `DLABELS`); it also tags the star you are near and reports "seen" to the catalogue.
- `deepUpdate(dt)` is the per-frame entry. `window.SpaceJump(id, planetName)` is what the map calls.
- "back where you left off" (end of the section): the first `arriveAt` of the page, then the saved flight spot.

### THE WINDOW and THE CALENDAR (after the checklists)
- One hologram window (`rWrap` / `rFrame` / `rInner`) for three things: a checklist (`rRoutine`), the calendar (`rCal`), an event reminder (`rRemind`). `holo` = what it shows, `holoBusy` while it opens or closes, `holoNext` = what opens once it has closed. `openHolo(who)`, `closeHolo()`, `holoRefit()` (content changed size), `closeWindow()` (a checklist also records it was closed). It fits its content and sits below the clock.
- Only one at a time: a checklist or reminder that comes while something else shows waits (`routineBlocked`, `checkRoutines` every 15 s and when the window closes); a reminder closes the calendar to show itself.
- Calendar data: `calCall(name, ...)` on `window.Launcher` (app 1.5+) or `window.__calSource`. No source, or no access: a note in the window (with ALLOW). Event titles only ever go in as text (`calEl`, `textContent`); colours are checked (`safeColor`).

### Every frame (`animate`)
`updateField`, `updateShips`, `updateDash`, `navUpdate` (flights, `sysWorld` position, near plane), star light and ring uniforms, `updateMoons`, sky drift, cubes, `updateHud`, `navHud`, `syncSysRig`, `updateOccluders`, `deepUpdate`, `updateStreaks`, `updateRoute`, then the render passes.

## The catalogue's API (`window.CAT`)
`systems, sol, landmarks, byId, starCats, warpLy, planetCount, KM_AU, fmtLy, starRGB, starCat, planetClass, CLASS_NAME, CLASS_LONG` (data and helpers);
`now, homeLon, helio` (time model); `picture(o)` (a canvas);
`state, save, arrive(sysId, planetName), saw(id), hereId(), atHome(), homePlanet` (state);
`dist(a, b), inReach(o), known(o), placeFacts(o), planetFacts(q), mainPlanet, defaultPlanet, planetOf` (rules). `planetOf(o, name)` is the named planet or null (the star); `defaultPlanet` is only for converting old saves.

## The map (`window.SpaceMap`)
`open, close, isOpen (a getter), back, debug(), groups(), selectId(id), card()`. It keeps its own copies of the places with map positions (distance squeezed: `18 x log10(1 + ly)`), reads `CAT.state` directly and calls `window.SpaceJump` to jump. It never writes where you are.

## Test hooks (in the shipped page; harmless)
| Hook | Does |
|---|---|
| `__deepDebug()` | `{ sys, planet, jumping, scale, local, active, all, ... }` |
| `__deepGo(id)` | warp to a place (`'sol'`, `'sys:Proxima Cen'`, `'m42'`) or a sibling planet (`'pl:MARS'`) |
| `__deepFace(id)`, `__deepScr(id)` | turn to face it; where it is on screen `[x, y, ...]` (to click it) |
| `__face('body' \| 'star')` | face the planet you are at, or its star (at a planet only; at a star use `__deepFace('star:<id>')` from a planet) |
| `__navList()`, `__navGo(NAME)`, `__navDebug()` | flight targets; fly to one; `{ target, travel, ship }` |
| `SpaceJump(id, planetName)` | the map's jump |
| `__calDebug()` | the window and the calendar: `{ holo, busy, view, sel, part, label, pending, frame }` |
| `window.__calSource` | set before the page loads (tests): a stand-in for the app's calendar bridge, same method names and JSON (`tests/calsource.js`) |
| `toggleCalendar()`, `showEventReminder(id, begin, kind)`, `showRoutine(kind)` | what the clock, the app (reminders) and the checklist notification call |

## Other saved keys (the launcher's, untouched by the space work)
`spaceCubeGroups.v2` / `spaceCubeGroups.phone.v1` (app groups), `spaceCubeRecents.v2` / `.phone.v2`, `spaceCubeRoutines.v1`, `spaceCubeRoutineState.v1`, `spaceCubeCalendar.v1` (`{ lastCal }`: the calendar new events go into by default).

## What the tests cover, and what they do not
- `test_saves.py`: every old save form. `test_travel.py`: taps, warps, the planet scene, flights, landmarks, reloads. `test_map.py`: the ??? rules, cards, jumping from the map. `test_time.py`: the time model against JPL Horizons. `test_routines.py`: the window opening over real time. `test_calendar.py`: the calendar, search, adding, reminders and what waits for what, against `calsource.js`. `test_bridge.py`: every `cal*` method the page calls exists in `LauncherBridge.kt` and in the stand-in.
- Not covered: how anything looks, feel and tempo, speed on a phone, the launcher part (cubes, groups, search), the Android shell (it is only compiled, by the "Build Space Cube APK" workflow: real calendars, permissions, alarms and notifications are only seen on the phone). For animation, log a value against the clock over real time (for an arrival: `__deepDebug().scale` sampled every 100 ms must only grow) and still say that feel cannot be judged from a headless browser.
