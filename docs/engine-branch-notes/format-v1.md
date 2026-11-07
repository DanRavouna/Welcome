# Engine content format

## v1: what the editor writes and the game reads (Nov 2026, milestone 3)

Content is a set of JSON files in `next/content/`: `index.json` = `{ "format": 1, "start": "<map id>", "maps": ["<id>", ...] }` and one `<id>.json`
per map. The editor exports them as one bundle, `content.json` = `{ "format": 1, "start", "maps": { "<id>": <map>, ... } }`; `python3 next/content/unpack.py content.json`
splits it into the files. `build.py` inlines the files into the game and the editor as `CONTENT`. In files a grid is `H` strings of `W` letters;
the game turns them into arrays before `WORLD.load()`.

A map (`*` = written by the editor from what you placed; you never edit these by hand):

| field | meaning |
|---|---|
| `id`, `name` | the key (file name) and the name shown on exit tags and the plank |
| `W`, `H`, `grid` | size and the tiles. Outdoors: `.` ground `,` flowers `=` path `W` tall grass `Z` rare grass `~` water `T` tree `R` rock `F` fence `C` cave wall; `*` `X` footprint of a building or prop, `G` sign, `O` object. Rooms: `w` wall `f` floor `r` rug `d` door mat, furniture `b` bed `s` shelf `t` table `p` plant `k` stove `h` chest `m` machine `a` altar `x` stair `n` post |
| `pal` | palette name for the terrain (`PXW.PAL`): town, moss, frost, ember, tide, peak, mossbrook, frosthold, cinderport, coralbay, ascent, descent, dg-arch, dg-lamp, dg-forge |
| `theme` | the engine's theme object for that palette (`bg` outside the map, `flowers`, `lava`/`ice`/`cave` flags); the editor copies it from `editor/presets.js` |
| `places` | buildings: `{ id, name, x, y, w, h, roof, door: [x, y], enter?, kind? }`. `enter` names the room map you go into. `*` the footprint is `X`, the two tiles under the door `=` |
| `props` | landmarks: `{ id: <landmarks.js kind>, x, y, w, h }`. `*` the footprint from `LAND.foot` |
| `exits` | `{ edge: n/s/w/e, a, b, to }`: tiles `a..b` on that edge lead to map `to`. `*` the gap in the border is `=` |
| `arrive` | `{ n/s/w/e: [x, y] }` where you stand after coming in through that edge. `*` filled when an exit is added: n `[a+0.9, 1.4]`, s `[a+0.9, H-1.4]`, w `[1.4, a+1.2]`, e `[W-1.4, a+1.2]` |
| `arriveFrom` | `{ mapId: [x, y] }`: where you stand after coming from that map; takes precedence. `*` for a room: below its building's door `[door.x+0.9, door.y+1.5]` |
| `spawn` | `[x, y]` where you start when nothing else says (the Spawn tool) |
| `interior`, `parent`, `style`, `rug` | a room: `style: { floor, wall, rug, bed, mat: timber/log/stone/brick/shell }`; `*` `rug` is the box around the `r` tiles; `*` `parent` and the room's south exit point at the building's map |
| `signs`, `objects`, `types`, `rate` | kept for the engine (`[]`, `[]`, `[]`, `0` in the new game; see v0 below) |
| `people` | `{ id, name, x, y, look, facing: down/up/left/right, still?, lines?: [..] }`: a person standing on tile `x, y` (made walkable), drawn with the trainer sprite in the palette named by `look` (`next/content/looks.json`, carried in the bundle as `looks`), facing that way; `still` people keep their facing instead of looking around; talking to them shows `lines` one at a time (milestone 5 replaces `lines` with a script) |
| `triggers` | reserved for milestone 5: `[]` today |

A room is a map like any other with `interior: true`; new rooms get walls on the top two rows and the sides, a two-tile door mat at the bottom,
a south exit back to the building's map. Palettes and themes are the old game's regions for now; a new region is a new `PXW.PAL` entry plus a preset.

## v0: what `WORLD.load()` takes (the old game's maps, as `legacy/src/world/maps.js` builds them)

Same fields as above with the old game's extras the engine still reads: `types`/`rate` (wild encounters, passed to `onEncounter`), `signs` `{ x, y, text, to? }`,
`objects` `{ id, kind, x, y, reach?, text?, hidden?, gate?, portal?, beam?, day? }` (art and light per `kind` come from the game through `objArt`/`objLight`),
`cave`, `dark: { r }`, `hall`, `rare`, `noWind`. Every old map survives `JSON.parse(JSON.stringify(map))` with nothing lost (`legacy/src/mapdatatest.py`).

Hooks a game passes to `WORLD.init(canvas, opts)`: `act` (an action layer with `step/items/drawFx/active/veilAlpha`), `objLight(o, state)`,
`objArt(kind)`, `drawUnder(env)` / `drawOver(env)`, `onInteract`, `onNear`, `onEncounter`, `onGrass`, `onMap`, `onAlert`, `onSpotted`,
`canChallenge`, `exitLocked`, `onLocked`, `objState`, `tint`, `weather`, `still`, `ambient`, `carry`, `relit`, `follower`, `critterLead`,
`npcs`, `pos`, `map`, `random`. `WORLD.setWinds({ region: { base, calm } })` gives each region its wind character.
