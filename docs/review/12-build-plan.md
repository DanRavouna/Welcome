# Build plan for the review copy (reconciled from 10 and 11)

The two directors' merged lists (docs/review/10-creative-reply.md §4 and docs/review/11-gameplay-reply.md §4) are the same list in two orders. This file settles the few open points so the copy can be built, and hands the items out in packages. The item text, the exact changes and the tests are in 11 (numbers below are 11's; 10's numbers in brackets where they differ). Read the item in 11 and the matching one in 10 before building it; where they differ in a detail, 11 (the player's seat) wins for numbers and 10 (the sentence) wins for words and what is shown.

## Open points settled for this build (all reversible; Dan decides later)
- KEEP_COST 1/1/2/4, the sightings term dropped, 20 rolls kept, the first 15 kills a day after the rolls pay 1 trainer XP (11's position).
- The `open` window (1.5x on a held enemy) is built now, with 11's two sim lines as the target.
- `releaseGain` stays as it is; the returned pool is built (item 15); evolution prices untouched.
- Potions: used for you under 30% HP, no button (11's first offer, which 10 accepted as the first to try).
- `STILL_S` 1.2 with the frost drawn forming (both), the braziers still.
- Maren sits beside the stairs, challengeable like a trainer, never a gate (both).
- The Arena: the day stamped on the win, the rail marks per step; beaten rivals at the ring's edge only if it is cheap; Juno sits instead of saying the rule.
- The Watch's door: four seals (the fallback both accept), the Keeper's lines change at `lampLit`, the loss keeps the floor.
- The title caption fades after 5 s (10).
- Not built: the HUD CSS pass, the two hidden stations, layout rebuilds and Coralbay's sea, a knock-out walking home. Written up for Dan in the final report.

## Packages (built in parallel in separate worktrees, then merged in this order)

**S, sound** (music.js, base.js `sfx()`, the `musicTrack()` aliases and the sfx call sites): items 4, 26 [24]; the music parts of 17 (silence, `light`, `dg-lamp@lit` and `@1..@3`), 18 (`dg-forge@lit`), 19/22 (`town@dark`), 21 (`night`, `night@long`, `dawn`, `knock`), 27 (`<id>@dusk`). The 06 report has every note list and arrangement rule.

**W, world and what is seen** (world.js, landmarks.js, pxworld.js, ambient.js, adventure.js layouts and ART only): items 1, 6 [14] (the world.js half: lamps for locked exits, no barricade stripes), 10 [11], 11 [12], 12's drawing half (the frost forming, still braziers: the ART side), 19 (beams and halos over the tint, lighthouses only when the window is lit), 27 [22] (tints), 28 [22] (Peak palette, Watch dress, crabs off the Coast; NOT the HUD). The 03 and 05 reports have the cells and the values.

**M, mechanics and economy** (action.js, data.js, game.js, base.js quests; in app.js only the shop, items, quests, Arena and Watch run functions): items 7 [5, 6], 8 [9], 9 [15] (gates by fires with the level OR for old saves; leaders' levels as first guesses, simmed), 12's numbers (`STILL_S`, `BURN_S`), 13 [10] (vcd, open, slash unblocked), 14 [8] (potions used for you, prices by seals, the shelf), 15 (the returned pool), 20 [20] (Watch loss keeps the floor; Arena stamp on the win, rail marks), 22's behaviour half (Frost wild critters still, Stone near home), 29 [16] (keep by staying; build it, it is the loop's verb; mark it for the phone). Run the sims (duelsim.py, duelsim_lv.py if it exists, towersim.py, milesim.py) and record the lines.

**R, the road, the ending and the day** (app.js opening, trials, ending, daily; adventure.js texts and object use): items 2, 3, 5 [7] (Wren lv 6 and needs dropped on the four leaders, seal at `gymDone`, the bed as a stay), 16, 17 (everything but the music), 18's Forge half, 19 [22] (the window as a stay, the posts, the critter by the door on a lit day, Wickling on the sill), 20 [25] (the night of darkness), 21 [26] (a new day at Home), 23 [21] (the Watch's door at four seals, the Keeper's lines, the lobby), 24 (the Forge ends quietly), 25 (Juno sits).

**T, words** (last, after the merge): item 17 [23]: `telltest.py` widened per 02-F34 first, then the lines listed in 11's item 17 and 10's item 23, as written in 02.

## Rules for every package
- Work only in `src/world-rev/` (never `src/world/`), `src/*.py` tests you are told to adjust, and your package's notes file `docs/review/changes-<letter>.md`.
- Every new save field has a default and no field is dropped; old saves keep loading (the level gates stay as an OR).
- Build with `python3 src/build2.py games/critter-roll-review/index.html src/world-rev` and `node --check` every file you touched.
- Do not run `src/run-tests.sh` or `src/test-setup.sh` (they relink shared paths used by other packages). Verify with your own short Playwright probes loading your worktree's `games/critter-roll-review/index.html` by `file://` path, and with the sims. Log what each probe showed.
- In `changes-<letter>.md`: per item, DONE / PARTLY / NOT DONE with why, what was verified and how, and which existing tests in `src/*.py` will need their snapshots rebuilt or their checks changed (name the test and the line), so the merge can run the suite with eyes open.
- Report your worktree branch name at the end.
