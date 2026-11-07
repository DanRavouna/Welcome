# Game format v1 (what `games/<id>/game.json` holds)

One JSON file per game. No code anywhere in it: every value is a string, number, boolean, list or object, and the whole file survives `JSON.parse(JSON.stringify(game))` unchanged (`ENGINE.roundTrip`). Pixels are rows of characters: each character is an index into the game's palette (`0-9` then `a-z`, up to 36 colours), `.` is transparent.

```
{
  "v": 1, "id": "demo", "name": "Demo", "year": 2026,
  "tile": 16,                 // tile size in pixels; set per game
  "view": 11,                 // how many tiles fit across the shorter side of the screen
  "start": "field",           // the first map
  "player": { "sprite": "hero", "speed": 4 },     // speed in tiles per second
  "palette": ["#1b1b24", "..."],
  "tiles":   { "grass": { "solid": false, "frames": [[ "16 rows of 16 chars" ]], "fps": 0 } },
  "sprites": { "hero": { "w": 16, "h": 24, "anchor": [8, 23],         // anchor = the feet, in sprite pixels
                         "anims": { "walk-down": { "frames": [[rows], ...], "fps": 6 }, "idle-down": {...},
                                    "walk-up": ..., "walk-left": ..., "walk-right": ... } } },
  "sounds":  { "tap": { "wave": "square", "notes": [[880, 0.05], [1320, 0.08]] } },   // [hz, seconds]
  "tracks":  { "field": { "bpm": 96, "stepsPerBeat": 2,
                          "channels": [ { "wave": "square", "vol": 0.15, "notes": "C4 - E4 - G4 ..." } ] } },
                                      // one token per step: a note (C4, F#3), "-" holds the previous note, "." rests
  "scripts": { "first": { "steps": [ ...step cards... ] } },
  "maps":    { "field": { ...map... } },
  "road":    { "sentence": "", "act": "", "stations": [ { "id": "", "name": "", "meaning": "", "hint": "", "act": "" } ] }
}
```

## A map
```
{ "name": "Field", "w": 20, "h": 14,
  "tileset": ["grass", "water", "wall", "path"],       // the tiles this map uses; ground chars index into it
  "ground": ["22222...", ...],                          // h rows of w chars
  "props":    [ { "id": "post", "sprite": "post", "x": 9, "y": 4, "solid": true } ],
  "people":   [ { "id": "keeper", "name": "Someone", "x": 12, "y": 5, "sprite": "person", "facing": "left",
                  "lines": ["..."], "script": "", "when": "met == true" } ],
  "exits":    [ { "x": 19, "y": 6, "w": 1, "h": 2, "to": "house", "tx": 1, "ty": 4, "facing": "right" } ],
  "triggers": [ { "x": 14, "y": 10, "w": 2, "h": 2, "script": "stay", "each": 0.5, "once": false, "when": "" } ],
  "spawn": [3.5, 7],              // in tiles, the feet point
  "music": "field", "intent": "what this place is for, in Dan's words", "station": "" }
```
Positions of people, props, exits and triggers are tile cells (integers). A person with `when` exists only while the condition holds. A trigger runs its script when the player's feet enter its cells; `once` remembers it in the save; `each` re-runs it every so many seconds while the player stays (the "stay beside it" mechanic).

## Conditions
A string `"flag op value"` (`==`, `!=`, `>`, `<`, `>=`, `<=`; `true`, `false`, numbers and words), a bare flag name (true when set), or `{ "all": [...] }` / `{ "any": [...] }`. Unset flags read as `false`, `0` or `""` depending on what they are compared with.

## Step cards
| t | fields |
|---|---|
| say | who, text |
| choice | who, prompt, options: [{ text, to }] (to = step index) |
| set | flag, value |
| add | flag, n |
| if | when (a condition), then, else (step indexes) |
| jump | to |
| teleport | map, x, y, facing |
| move | who (a person id, or "player"), x, y, speed |
| face | who, dir |
| wait | s |
| show / hide | id (a person or prop id) |
| tile | map, x, y, tile (a tile id; remembered in the save) |
| music | track (empty stops) |
| sound | id |
| end | |

One script runs at a time; `say` and `choice` wait for the player, `wait` for the clock, `move` for the person to arrive.

## The save
`{ v, game, map, x, y, facing, flags, tiles, hidden, stations, played, t }`, kept under `localStorage["shelf:<id>:save"]` and, when signed in, in the cloud. `stations` lists the stations whose maps the player has entered; the shelf shows their count as the record.
