# Next: a plan for the second project on the Critter Roll engine

Status: DRAFT for Dan's review (Nov 2026). Nothing in this plan has been built. Decisions already taken by Dan are marked **decided**; everything else is a proposal to accept, change or strike.

## 1. What Dan decided (Nov 2026)

- **decided** The current Critter Roll has reached its limit: the structure is confusing and the scope too large. Salvage the engine, keep the website approach, build a better editor.
- **decided** Same repository, new folders; the engine is shared, not copied.
- **decided** The old game is frozen and hidden: the site address shows the new project; the old build stays in the repository but is no longer served.
- **decided** The new game has no fighting and no critters.
- **decided** The editor creates maps, people and events. Events are authored as form-based steps (pick a step type, fill its fields), not typed syntax and not JavaScript.
- **decided** The meaning sentence of the new game is not written yet. By the standing rule nothing of the game itself (places, people, lines) is built before it exists. The engine and the editor can be built first because they are tools, not statements.
- Pending: the GitHub connector for the editor's Submit button (the page needs a `github` connector in Dan's claude.ai account; the coding session's GitHub access does not reach pages).

## 2. The engine boundary: what is salvaged, what is left behind

Measured on the current `src/world/` (lines; "uses" = which other modules it touches):

| Keep as engine | Lines | Why |
|---|---|---|
| `pixel.js` (PIX) | 124 | sprite rasteriser, no game knowledge |
| `pxworld.js` (PXW) | 410 | tile and building renderer, palettes, wind frames |
| `landmarks.js` (LAND) | 106 | reusable props |
| `weather.js`, `ambient.js` | 246 | weather, scenery critters (ambient only: birds, leaves) |
| `vfx.js` | 141 | particle effects; keep for scenes (fire, sparkle) even without combat |
| `music.js` (synth half) | ~120 | procedural tracks from a chord sheet; the Critter Roll track list goes |
| `cloud.js` | 234 | Supabase saves, lease, conflict dialog; parameterised by save key |
| `runtime.js` (TPL) | 97 | HTML templating used by the screens |
| the movement, camera, collision, eight facings, exits and interiors of `world.js` | ~450 of 1309 | the part that is not a map |
| the editor (`editor.js`, `editor.html`) | ~330 | reworked onto the new map format |

| Left behind (frozen with the old game) | Lines |
|---|---|
| the maps written as code inside `world.js` (Sproutvale, zones, routes, cities, dungeons, the Tower) | ~850 |
| `adventure.js` (clues, dungeon layouts), `flavor.js` | 636 |
| `action.js` (combat), `base.js`, `data.js`, `game.js`, `app.js` (critters, battles, quests, menus) | 3,700 |

The one risky cut is `world.js`: rendering and movement are interleaved with the map code. The plan is to extract the engine half into `engine/world.js` that takes maps as data, then make the OLD game load that same file with its maps converted to the data format by a script, and prove with the old test suite that nothing moved. That conversion is throwaway work whose only purpose is proof; the old game is then frozen.

## 3. Repository layout after the move

```
engine/            the modules above, each a plain script with one global (no build step needed to read them)
engine/format.md   the map, people and event formats, versioned (v1)
editor/            source of the editor page
next/              the new game: content/ (maps, people, events as JSON) + game.js (the little that is code) + index.html
legacy/            the frozen Critter Roll: its src/, tests, snapshots, handoff, built index.html; not served
site/              what GitHub Pages serves: built from next/ and editor/ (+ vendor/) by build.py
docs/              this plan, the archive, format notes
```
- `build.py` replaces `src/build2.py`: it assembles `site/index.html` (the new game), `site/editor.html` and copies `vendor/`. `pages.yml` deploys `site/`.
- The old `index.html` at the root is removed from the site once `next/` has a title screen; until then the root keeps serving the old game so the address is never blank.
- Saves: the new game uses `next:v1` keys locally and a new table (`saves_next`, same schema, new numbered `.sql`) in Supabase, so Critter Roll saves are untouched (standing rule 3).
- Tests: `legacy/` keeps its suite and snapshots, run once after the extraction and then only if `engine/` changes. `next/` gets its own small suite from the first map on, in the same style (`chk.py`, snapshots).

## 4. The formats (v1)

Everything the editor writes is JSON, one file per map, plus one for shared state names. No code in content.

### Map
```
{ "id": "harbor", "name": "The Harbor", "w": 40, "h": 30, "theme": "tide",
  "grid": ["TTTTT...", "T...~~..", ...],                   // one char per tile, the current letters (. , = W Z ~ T R F C X G O w d ...)
  "props": [ { "kind": "postlamp", "x": 12, "y": 7 } ],   // landmarks.js kinds
  "places": [ { "id": "inn", "name": "The Inn", "x": 5, "y": 4, "w": 7, "h": 5, "arch": "shell", "door": [8, 8], "to": "inn-room" } ],
  "exits": [ { "edge": "n", "a": 21, "b": 22, "to": "cliffs", "arrive": [21.9, 28.6] } ],
  "spawn": [8.9, 9.4],
  "people": [ { "id": "wren", "x": 10, "y": 12, "look": "elder", "facing": "down", "script": "wren-day", "when": "flag:met-wren == false" } ],
  "triggers": [ { "x": 20, "y": 3, "w": 2, "h": 1, "script": "gate-first-time", "once": true } ],
  "interior": false, "music": "harbor", "night": true }
```
Interiors are maps with `"interior": true` and a `style` (the current `mat`/`wall`/`floor`), drawn by the existing interior renderer.

### People
A person is a sprite (`look`: one of a small set of body shapes and palettes rendered by the existing trainer sprite with eight facings), a position, a facing, an optional wander area, and a script to run when spoken to. `when` is a condition on flags; several entries with the same `id` and different `when` give one person different states (a lamp-keeper who is at the window at night and on the road by day).

### Events, form-based
A script is a list of steps. Each step is one form with fixed fields; the editor never shows syntax. Step types for v1 (enough for scenes, doors, small quests):

| Step | Fields |
|---|---|
| Say | who (person or narrator), text, (optional) face |
| Choice | prompt, 2 to 4 options, each with the step to jump to |
| Set flag | name, value (true/false/number) |
| If | condition (flag compared to a value), then-step, else-step |
| Jump | step |
| Teleport | map, x, y, facing |
| Move person | person, path of tiles or "to x,y", walk/run |
| Face | person, direction |
| Wait | seconds |
| Open/close | place or door id |
| Show/hide | prop, person or object id |
| Set tile | map, x, y, letter (the gate that opens, the bridge that appears) |
| Music | track, or stop |
| Time | set day/night, or let the clock run |
| Sound | one of the engine's sounds |
| End | |

Conditions are one comparison (`flag` `==` `value`), combinable with "all of / any of" in the form. No loops, no arithmetic beyond `add 1 to flag`. That is deliberately small; it covers "stay beside the fire until it takes" (a trigger that runs each second while you stand there and adds to a flag) and "the window is dark until you light it each day" (Time + Set tile + flag with the day's date).

The interpreter is one small module (`engine/script.js`): it runs steps, pauses on Say/Choice/Wait/Move, resumes, and keeps flags in the save. Every step type has a test.

## 5. The editor, screens

Built from the current editor (touch-first, tile art, undo, outline of edits, walkability check), re-pointed at the JSON map format so that it edits the whole map, not a patch over generated code.

1. **Map**: paint tiles; place props, buildings (with door and interior), exits (drag a door onto the edge), spawn; the walkability check as now.
2. **People**: tap a tile → add a person: look, facing, name, script, condition. Drag to move.
3. **Events**: list of scripts; a script is a list of step cards; "+" picks a step type and shows its form; steps can be reordered; a "jump to" field shows the target card's number.
4. **Play**: the engine runs inside the editor on the current map (the engine is already loaded for drawing), so a scene can be tested from the tile you tap without leaving the editor.
5. **Save/Submit**: the editor writes `next/content/<map>.json` files. Local use: files download. Hosted on claude.ai: Submit pushes them through a GitHub connector (the pending item in §1), and a workflow builds and deploys as today.

## 6. Milestones, each tested and pushed before the next

| # | Deliverable | Proof |
|---|---|---|
| 1 | `engine/` extracted; `engine/world.js` loads maps as data; the OLD game runs on it with its maps converted | the full legacy suite: 0 failed, 0 changed |
| 2 | `legacy/` moved and frozen; `next/` with a title screen and one demo map you can walk; `site/` built and deployed; old game hidden | a new `walktest`: spawn, walk, exit, interior, back |
| 3 | formats v1 written in `engine/format.md`; the editor edits full maps, props, places, exits and saves JSON | editor tests: paint, place, export, re-import identical |
| 4 | people: sprites with eight facings, placement, talking | test: a person says a line |
| 5 | events: the interpreter with every v1 step; the editor's step forms | one test per step type, over real time for Wait/Move |
| 6 | Play inside the editor; Submit through the connector and the build workflow | a scene authored on the phone, played, submitted, live |

Milestone 1 is the long one (the `world.js` cut). Milestones 3 to 5 are where Dan starts authoring. The game's content waits for the meaning sentence; the demo map of milestone 2 is a placeholder with no lines, no names and no place in a quest.

## 7. Risks and limits, said plainly

- The `world.js` cut can break subtle things (camera snapping, exit arrival spots, interior doors). The legacy suite is the only safety net; some of its tests are flaky, so "0 failed on retry" will have to be read with care.
- Form-based events are easy to author and hard to make expressive. If scenes need loops or arithmetic later, the format gets a v2; the interpreter is built so that steps are added, not rewritten.
- People need sprites. The current trainer sprite gives one body; a few looks (hair, clothes colours, age) are drawing work, not engineering, and will look like placeholders until someone draws them.
- Nothing about feel, tempo or touch can be judged from this environment; every milestone that has motion is tested over real time and then handed to Dan to try.
- The pages that run the editor on claude.ai cannot reach GitHub until a `github` connector exists in Dan's account.

## 8. Open questions for Dan (answer when ready; none blocks milestone 1)

1. The meaning sentence of the new game. (Blocks all content, not the tools.)
2. The new game's name and the save key prefix (`next` is a placeholder).
3. Whether the old game's handoff (`critter-roll-handoff.md`) and `CLAUDE.md` move under `legacy/` with a new short `CLAUDE.md` at the root for the new project, or stay and gain a "legacy" section. Proposal: move; the standing rules (meaning first, test everything, never break saves, no secrets, plain reports) carry over word for word.
