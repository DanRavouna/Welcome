# Critter Roll: handoff for a new chat

Attach this file plus `critter-roll-growth-source.tar.gz` (latest source + tests) to the new chat, and say: "Continue Critter Roll from this handoff. Extract the archive first."

## Project
- Original creature-collector web game, built and played entirely from Dan's phone. Critters are original (no Pokémon assets); style inspired by GBA-era pixel art + glassy modern menus.
- Live: https://claude.ai/artifact/W9Ta3mH9hfZQixkzJkpfyD (republish to this URL; omit `capabilities` to keep them; they are `{db:{}, downloads:true, user:{}}`).
- Dan's working style: casual and direct, wants honesty and verified claims, trusts Claude to "make the best game", expects a self-review/test pass each phase and a backup before/after each phase.

## Architecture (single HTML, assembled from pieces in `world/`)
- `runtime.js` TPL: renders the screen markup (`sc-if`, `sc-for`, `dc-import`, `{{holes}}`) with DOM morphing; hole attributes renamed `data-h-*` at compile.
- `pixel.js` PIX: critter geometry → pixel sprites (`big` 0.25 scale, `icon` 0.075 shown 2x, `silhouette`), cached by seed:stage:mode.
- `pxworld.js` PXW: 16px pixel tiles per theme, buildings, player/NPC frames (`frames(pal)`).
- `world.js` WORLD: 5 maps (town 44x34 + 4 zones 34x28), movement, exits, locked-trail barricades, NPC sight lines, encounters, objective arrow, day/night tint, camera snapped to device pixels (no jitter).
- `cloud.js` CLOUD: cloud save to `data/users/{uid}/save`, lease (`acquire`, 4s) + re-check before every write, conflict dialog, local-first.
- `app.js`: `Base` → `Component` (game logic ported from the original canvas) → `Game` (overrides: make with levels, battleAction, party, trainers, encounters) → `APP` (HUD, menus, dialogue, people, map, backup, shop, party, bag, intro, hints, objective).
- `screen.html`: screen template (roll/dex/battle/trainer screens). Shell HTML holds HUD, overlays, CSS.
- Rebuild: `python3 build2.py` (JS order now runtime, pixel, pxworld, world, cloud, music, app) (self-contained: `world/shell.html` holds HUD/CSS/overlays with `/*@@JS@@*/` and `<!--@@SCREEN@@-->` placeholders; JS order runtime, pixel, pxworld, world, cloud, app). Output: /mnt/user-data/outputs/critter-roll-world.html. Buildings are drawn in `pxworld.js` `place()` (world.js `drawPlace` is dead code).

## Systems and key numbers
- Economy: 20 rolls/day. 40 free sightings/day in grass, then 1 roll each. Keep cost Common 1 / Uncommon 2 / Rare 4 / Mythic 8 (shrine too, plus 1 to roll). Arena wild battle 1 roll; trainers free.
- XP (trainer): keep 3, species 25, evolve 40, win 10, loss 3, leader 100, quest 30. Level n needs 80+40(n-1). Level-up +2 essence.
- Evolve 15 / 60 essence. Release Common 1, Uncommon 1, Rare 2, Mythic 4 (×stage).
- Critter levels 1–20, +3% stats/level; XP 5 participate, +10 win, +(8 + 2·foeLv + 5·foeStage) per KO; need 20+10(lv-1).
- Gates: Moss Lv1, Frost Lv3, Ember Lv6, Tide Lv9 (test mode bypasses).
- Trainers (size/stage/pick/level): Rowan 2/1/–/1, Ivy 3/2/0.3/4, Bram 4/2/0.5/9, Kiki 3/2/0.55/10, Marlo 4/3/0.4/19. Leaders: Wren 3/2/0.6/11, Glacia 4/2/0.75/5, Blaze 4/3/0.55/15, Coral 5/3/0.75/14. Leader first win 20/25/30/35 essence + seal; rematch 10.
- Simulated win rates vs expected party: Ivy 66, Wren 65, Bram 72, Glacia 42, Kiki 64, Blaze 46, Marlo 70, Coral 33.
- Encounters: 85% zone types, sparkling grass ~45% Rare+, night 25% Dusk anywhere. Shop: Potion 3, Super 7, Charm 10, Ticket 5.
- New players: Fern intro, starters (Ember/Tide/Moss), objective line + gold arrow, one-time hints. Test mode hidden (tap ID 5x in menu).

## Champion's Tower (done)
- Lives in its own zone, Champion's Peak (`buildPeak()`, map id `peak`, 26x24, no wild critters, PXW palette `peak`, music track `peak`). Tower 6x6 at (10,3), door (12,8). Reached by a trail stamped after the seeded scatter at Sproutvale x26-27 (north exit `to:'peak'`, sign at 28,10, `arriveFrom.peak`); the barricade needs 4 seals (test mode bypasses). Keeper dialog via `towerLobby()`.
- 20 floors, 2 climbs/day, party locked at start, HP carries over, +30% max HP between floors (revives fainted). Pause mid-battle keeps HP but resets the floor's team. Essence only above best: 4+floor, +5 on warden floors 5/10/15/20 (310 total). Trainer + critter XP every floor.
- State `tower: {best, day, runs, clears, run:{floor, party, hp}}` saved in critter-roll:v2.
- Curve `TOWER_CURVE` tuned with `towersim.py` (no potions, random parties, so pessimistic): fresh Lv14 median 6 floors, Lv17 median 8, maxed Lv20 median 11-12 with ~21% reaching 15 and ~4-6% the summit. Floors 1-4 are warm-ups (~100%).
- Fixed: fighter pick after a win re-opened the same floor (double first-clear essence); `enter()` now resets the nearby-place memory.

## Shiny variants (done)
- `Game.shinyHash(seed)`: independent integer hash, 1 in `SHINY_ODDS` (200). Measured 0.503% over 200k seeds; no correlation with rarity/type beyond sampling noise. Starters are not shiny; 1 of 112 trainer/Tower critters is (fixed easter egg).
- `shinify()` in `Game.make`: hue +140..220° (seed-based) on body, gradient, outline, accent parts, cheeks; type colors/eyes/mouth unchanged. Name gets " ★" (badge everywhere names appear). Reveal card: "★ Shiny" ribbon + sparkle burst (`shiny-burst`, then `shiny-still`; off in calm mode / reduced motion). Sound + vibration on reveal via `Game.update` hook (covers Shrine and grass).
- Shinies are free to keep (so one found with 0 rolls is never lost). Pacing: ~1 per 4 days for an engaged player (~60 seen/day), ~1 per 8-9 days casual (~25/day).
- Test: `shinytest.py`.

## Milestones and titles (done)
- `TITLES` in app.js: Explorer 12 / Collector 24 / Naturalist 36 / Critter Master 48 species (+10/+15/+20/+40 essence), Champion (4 seals), Tower Climber (floor 10), Summit Champion (floor 20), Shiny Hunter (3 shinies ever kept, tracked in `shinies`). Earned once, never revoked; checked in `Game.titleGains()` on every update (also on load, so old saves get them retroactively, once). Toast on unlock.
- Worn title: `state.title` (default shows "Rookie"); Titles grid on the Trainer screen (tap earned to wear/remove), shown in the menu header (`#m-title`; wraps on <=360px).
- Pacing from `milesim.py` (optimistic: ignores zone level gates): 12/24/36/48 species at ~2/3/4/7 days engaged, 48 at ~9 days casual.
- Test: `titletest.py`. Perf note: the test machine varies ±40%; compare against the previous build in the same session before calling a regression.

## Music (done)
- `music.js` MUSIC: 7 original 8-bar chiptune loops (town, moss, frost, ember, tide, battle, boss) written as note strings, synthesized live (pulse/triangle lead, triangle bass, noise drums). No audio files (+9 KB).
- Starts on first tap (autoplay rule), crossfades on change, pauses when hidden, Settings "Music" toggle (`settings.music`, default on, independent of sound effects). Track chosen every 400 ms by `musicTrack()`: battle screen -> 'battle' (leaders/Tower -> 'boss'), else map id.
- Levels from offline renders: peak 0.04-0.06 vs sound effects 0.1, no clipping. `MUSIC._render(id, loops)` is a test helper.
- Test: `musictest.py` (also writes a WAV preview). Not yet heard by Dan; the tunes may need taste tweaks.

## Battle effects (done, designed without a reference video)
- `Game.hit()` records `D.fxHits` (multiplier, blocked, attacker type color); status moves set `D.fxSt`; `Game.fxSides(nb, hp0)` turns a round into per-side effects in `battle.fx.side`.
- Per card (CSS only, in the sprite box): type-colored square sparks (bigger for strong, small gray for weak), white core flash, sprite white-blink (`fx-flash-a/b`), floating number (-dmg white, gold on strong, green +heal), label (Strong!/Weak/Blocked/Burned/Weakened/Dazed/Drained), colored ring for status/block, "KO!" stamp. Every keyframe exists twice (A/B) and the layer class flips by round parity so consecutive hits replay.
- Calm mode / reduced motion: numbers and labels only, no motion.
- Tests: `fxtest.py`, `fxperf.py` (action ~1 ms; headless frame timing is noisy and equal to the previous build; real-phone smoothness unverified). The full suite takes longer than 5 min in one command: run it in chunks.

## Play stats log (done)
- `state.stats = {v, ess, days: {'YYYY-MM-DD': {min, earn, spend, ev:{keep,species,win,loss,evolve,release,leader,roll,special}, tower:{runs,best,top}, end:{lv,species,caught,party,ess,rolls,sight,seals,towerBest,titles,shinies}}}}`, last 60 days, written by `Game.recordStats()` inside normal updates (play minutes counted in memory every 30 s and folded into the next save, so no extra cloud writes). Essence deltas catch level-up bonuses one update late.
- Export: Backup panel, "Copy play stats" / "Download play stats" (`Game.statsExport()`: readable table + RAW json). When Dan sends it, compare against the sims (towersim, milesim, lbal4, rollsim2) and retune.
- Test: `statstest.py`.

## Aggro music (done)
- `opts.onAlert` fires when a trainer's sight line triggers; `musicTrack()` plays `spotted` during the alert and challenge dialog, then `battle` if accepted. Bugs fixed with it: exit-name labels crashed for non-zone maps (now use `MAPS[e.to].name`), and the barricade toast picked the wrong exit when two share an edge.

## Cities
- All four done: **Mossbrook** (west of Moss Forest, `buildMossbrook()`), **Frosthold** (north of Frost Peaks, palisade), **Cinderport** (south of Ember Fields, lava pool, entry road from the north-east), **Coralbay** (east of Tide Shore via a boardwalk over the shallows, sea + pier). The last three use `buildCity(CITY_CFG[id])` (same street plan as Mossbrook; layouts are recognisably related, a future pass could vary them). Leaders live in their city gyms (`city()` in `npcList()`); zone trainers (Ivy, Bram, Kiki, Marlo) stay in the zones and remain the leader prerequisite.
- City trainers (sim via `lbal5.py`, same model as the zone trainer): Sorrel 62% (Ivy 72%, stage-1 Lv5 party), Pike size4 Lv8 pick .6 -> 73% (Bram 78%, stage-2 Lv7), Tamsin size4 Lv12 pick .5 -> 77% (Kiki 63%, stage-2 Lv9), Rafe size4 stage3 Lv15 pick .55 -> 68% (Marlo 74%, stage-3 Lv13). That model reproduces the handoff's Bram/Kiki/Marlo/Glacia/Coral; Blaze's 46% came from a stronger model.
- Travel map: cities + Peak appear once visited (`state.visited`, set in `onMap`), shown as "Undiscovered, somewhere past X" until then.
- City recipe (`buildMossbrook()` as template): 36x28, `city: true`, `rate: 0`, places of kind `gym` (pxworld draws a timber hall with `color` emblem/banners and `roof`), `house` (any `roof`/`wall` color; door action `open: 'house'` shows `text`), herb/shop house (`open: 'shop'` talks to the map's `kind: 'shop'` NPC). South-facing doors: route paths around to the door row. Link with `linkEdge(zoneMap, edge, a, cityId, arriveXY)` after the zone build (keeps the zone's seeded tiles). Add PAL + THEMES entry, a music track named after the map id, NPCs in `npcList()` before the trainer-reward line, and move the leader with `Object.assign(leader, {x, y, dir, city})`.
- `npcHome(id)` / `mapName(id)` give leader locations for objectives, seal status and prerequisite lines; `WORLD.nextHop(from, to)` routes the objective arrow across maps.
- Mossbrook: Elder Wren's gym (door or NPC starts her challenge; she still needs Ivy in Moss Forest), Herbalist Juniper (same shop stock as Mira, flavor only for now), trainer Forager Sorrel (Bloom/Volt, size 3, stage 2, pick 0.5, Lv3: sim 62% vs stage-1 Lv5 party, Ivy 72% same model), Fennel and Bryn (talk), 3 cottages.
- Sim note: `lbal5.py` = lbal4 with a `keys` list. The early-game model that reproduces the handoff's Ivy 66% is a stage-1 party; team composition (`pick`) moves win rate more than level, so tune level with pick fixed.

## Routes: the city loop (done)
- Four routes built with `buildZone` (configs in `ZONES` with `route: true`; `from` = side opposite the back edge) and linked by `ROUTE_LINKS` in world.js: Highland Pass `route-mf` (Mossbrook N <-> Frosthold W, Moss+Frost), Ashwood Trail `route-cm` (Cinderport W <-> Mossbrook S, Ember+Moss), Glacier Coast `route-fc` (Frosthold E <-> Coralbay N, Frost+Tide), Reef Causeway `route-cc` (Coralbay S <-> Cinderport E, Tide+Ember). World is now 14 maps and the cities form a loop.
- `ROUTE_GATES` (app.js): 3 / 6 / 9 / 9 = the higher gate of the two ends, so no route bypasses a zone gate; enforced on any map's exit into a route, with its own toast. Music: routes reuse peak / moss / frost / tide tracks.
- Signposts (`post()` in the link loop) sit on the border beside every new door: "North: Highland Pass (Moss and Frost critters), the road to Frosthold."
- Route trainers (lbal5, gate's party model): Kai Lv11 66% (stage-2 Lv7), Elm Lv11 64% (stage-2 Lv9), Signe Lv18 71% and Mako Lv18 73% (stage-3 Lv13). All stand at (16,7) facing up onto the route path.
- Test: `routes.py`. Note: `wplay` uses real randomness, so its battle can occasionally lose; repeat before calling it a regression.

## City items, side quests, economy (done)
- `ITEMS` + `CITY_ITEM`: each city shop adds one local item (other shops never list it; bag shows owned ones). Effects in `ITEM_FX`, applied in `Game.battleAction` (item branch) and `Game.hit()` (`A.boost`, `D.ward`); `itemUsable()` gates use. Mossleaf Remedy (Mossbrook, 4): heal 40% + cure status. Frost Ward (Frosthold, 5): next 5 hits x0.35. Whetstone (Cinderport, 5): x1.7 damage this battle. Tide Lure (Coralbay, 12): next wild critter is an unkept species of the area (`state.lure`, consumed in `Game.encounter` only when used; night Dusk override skips lured encounters).
- `itemsim.py` (one item, vs Glacia stage-2 Lv7 and Coral stage-3 Lv13 models, n=800): win-rate gain Potion +16/+12, Super +24/+24, Ward +17/+11, Whetstone +19/+14, Remedy +8/+3 (Remedy = Potion's heal + cure; lower number only because the sim uses it earlier on status).
- Trainer rematches pay half (`startTrainer`, `Math.ceil(reward/2)` once `cleared`); first wins and leaders unchanged. Daily essence ceiling: old world 97, new world at full rematch pay 205, now 145 incl. city quests.
- City side quests: `CITY_QUESTS` (givers Bryn, Old Olaf, Ruby, Pearl), one per city per day picked by a day+city hash among see / keep / beat. Progress via `Game.questTick()` (see: grass encounter on the named map; keep: only with a real `keep` event, so cloud sync/loads never count; beat: trainer win). Claim by talking to the giver: +4 essence + 30 XP (`quest: 30` added to the XP table). State `cq` saved.
- Tests: `questtest.py`, `itemtest.py`.

## City layouts + house interiors (done)
- `buildCity` takes `layout` (paths, shop/houses positions, `after` connector paths, `rocks`, `piers`, `northRoadTo`); without it the original Mossbrook-style plan is used. Frosthold: avenue + two terraces split by a rock ledge. Cinderport: big market square, lava pool west. Coralbay: shore boardwalk (x28-29) with two piers; its route doors moved to the boardwalk ends (x28). Rafe moved to (27,6) facing the boardwalk.
- Safety: on load, a saved position inside a solid tile moves to the map's spawn (needed whenever a layout changes).
- Interiors: every city `house` gets `MAPS['in-' + place.id]` from `buildInterior()` (12x9, tiles w wall, f floor, r rug, d doormat, furniture b bed / s shelf / t table / p plant / k stove / h chest, all solid except floor/rug/mat). Three furniture layouts (`ROOM_LAYOUTS`) x per-city colours (`ROOM_STYLE`); drawn by `PXW.interior()`. Door: place `enter` -> `WORLD.enter(id)`; exit through the bottom returns to the doorstep (`arriveFrom`). No night tint indoors; music = parent city. One resident each (`RES` in `npcList()`, at 7,3) with lines and accurate local hints.
- Sproutvale: `in-home` (Mom; desk device 'Trainer records' -> badges screen) and `in-lab` (14x10, Lab Aide Remy; 'Dex terminal' -> dex). `buildInterior(id, place, parent, i, {W, H, style, layout, places})`; door centred at floor(W/2)-1. Interactive objects are places of kind `device` on an `m` (machine) tile; pxworld skips drawing them. Town home/lab doors now enter the rooms (the screens stay in the menu). Professor Fern stays outside the Lab on purpose (new-player intro). Rugs run under furniture (`M.rug` rect).
- Test: `hometest.py`.
- Test: `interiors.py` (all 12 houses: label, enter, resident reachable, exit to the doorstep, music).

## Trainer sight rules (Dan's request, done)
- A trainer spots you once per visit: `n.declined = true` the moment the alert fires (reset in `enter()`), so leaving a battle or losing never re-triggers until you leave and re-enter the map.
- Trainers you have beaten (`npc.cleared`) never sight-challenge again (`canChallenge`). Talking to them shows post-defeat lines (`n.afterLines` or a default) with Rematch! / Not now; rematches stay once per day and pay half. Leaders are unchanged.
- Test: `aggrotest.py`.

## Weekly Tower twist (done)
- `TWISTS` + `Game.towerTwist()`: one per week (weeks start Monday), rotating Surge Week (type from `TWIST_TYPES`, +30% damage for that type on both sides, Tower battles only, via `this._surge` around `resolve`), Iron Climb (15% rest, essence x1.5), Second Wind (40% rest, essence x0.75), One Element (each floor one type, team cache keyed by week). Keeper's lobby and the pre-battle note announce it.
- `towersim.py` with `twist` (B Lv17 / C Lv20 medians; normal week 9 / 10, summit 4%): Surge 9/10 (same), Iron 7/9 (harder), Second Wind 9/14 with summit 17% (easier, the good week), One Element 9/12 (slightly easier; sim does not counter-pick). First tries (no rest; 60% rest) were far off (median 5-6; summit 46%) and were softened.
- Test: `twisttest.py`.

## Follower critter + fishing (done)
- Follower: world keeps a breadcrumb `trail` of player positions; `FOL` eases to the point ~1.05 tiles back along it (visual only, no collision), drawn in the y-sorted NPC list with a small hop, shadow, and a twinkle for shinies. Reset on `enter()`. App `opts.follower()` returns the lead (fighter if owned, else first party / first caught) as a cached `PIX.sprite(k, 'icon')` image. Setting `follow` (default on) in Settings.
- Fishing: `nearest()` returns `{kind:'water', x, y}` when nothing else is close and a `~` tile is adjacent (not on lava maps: `theme.lava` on ember/cinderport; not indoors). Button "Fish" -> `fish()` in app: pauses, bobber (`WORLD.setFish`), bite after 0.9-2.4 s, then the normal `encounter()` with types 70% ['Tide'] else the area's own types; uses a sighting/roll like grass, so the daily cap, charm, lure, night Dusk and city 'see' quests all apply. Measured catch mix in Moss Forest: ~62% Tide (pickSeed adds its usual off-type share).
- Bug fixed with it: the world's near-key assumed a sign for anything that was not a place/NPC and crashed the loop beside water.
- Test: `fishtest.py`. Test note: after `WORLD.setPos` the camera eases over slowly in headless runs; walk in or pixel-search instead of fixed crops.

## Guidance without arrow (Dan: arrow + quest marker were too guided)
- The world's `objective` hook returns null: no arrow, no marker. The HUD goal line stays as a journal note; tapping it shows `wayHint()` (directions in words). Pip in Sproutvale gives the same directions. Town trail signs name the city beyond each zone; each zone has a signpost at its far exit; city townsfolk mention other places (the Peak, Coralbay). The old `settings.track` toggle is unused.
- Test: `guidetest.py`; all-city checks in `cities.py` (reachability, NPCs not on solid tiles, zone links, leader homes, routing, trainer sight lines not blocked, walk-in, music).

## World expansion notes
- Each zone becomes a route leading to a new city beyond its far edge; the Peak stays off Sproutvale's north. Build one city at a time with the same pattern (stamp-after-scatter, `arriveFrom`, `MAPS[...]` names, a test per city).
- Every exit/name/objective lookup must go through `MAPS`, never `ZONES`/`ZONE_NAMES` (only true zones have those).
- Tests: `peaktest.py` (town tiles unchanged, Peak connectivity, barricade, arrivals, aggro + Peak music), `citytest.py` (Mossbrook reachability, Moss link, Wren location, routing, doors, music). `ptest.py` now challenges Wren in Mossbrook.

## Tests (in archive; run from /tmp)
- Setup: `cp walk.js /tmp/`, `cd /tmp && npm i axe-core` (ctest needs it). New: `towertest.py` (lock, lobby, run, reward, reload, pause, replay exploit), `towersim.py` (calibration).
- Hook `pwhook/sitecustomize.py` (PYTHONPATH) seeds an existing player on FIRST load only; never write storage on reload (that caused a false save-loss scare).
- Suites: `hudcheck.py` (overlaps, 6 widths × 3 value sizes), `wplay` (play-through + reload), `p14` (map/day-night/backup), `p15` (party/bag/shop), `p17` (new player, run WITHOUT hook), `p18r` (sightings/keep costs), `ctest` (two-device cloud sync, mock server), `ntest` (NPCs/trainers), `ptest` (gates/leaders/seals), `ztest` (trails/encounters), `jitter`, `perf`, `lbal4.py` (trainer balance with levels), `rollsim2.js` (roll economy).
- Lessons: verify with numbers, not screenshots alone; test with large values (the Menu overlap only showed with big numbers); repeat flaky tests before trusting them.

## Watch items
- Tower titles (floors 10/20) not yet shown anywhere; do it with the titles step. Old cached copies of the page on another device would drop the `tower` save key if they write.
- Not yet verified on a real phone: touch feel, sound, vibration, Pixelify Sans font, real cloud sync.
- Early essence may feel slow after the roll rework. Leveling pace assumptions (≈Lv5 at Wren, ≈Lv13 at Coral) are estimates.

## GitHub Pages + online saves (done, Nov 2026)
- Repo `DanRavouna/critter-roll`; GitHub Pages serves `index.html` from `main` at https://danravouna.github.io/critter-roll/. Source lives in `src/` (this archive's contents); `python3 src/build2.py` writes `index.html`. Standing rules in `CLAUDE.md`.
- Online saves via Supabase (project `xuawpknnmozcfzgnflel`): email + password accounts, Menu → Save (the old Backup tile, renamed). `cloud.js` keeps the claude.ai path unchanged and adds a Supabase path behind the same `ref` interface (`get` / `set` / `acquire`), so all the sync/conflict logic is shared. Schema in `supabase/001_saves.sql`.
- Bug fixed in the shared sync logic (affected claude.ai too): after a device downloaded the account save, its meta lost the save hash, so the reload's identical re-save looked like local progress and the next change elsewhere raised a false conflict. `adopt()` now keeps the hash.
- One-time hint `online` for signed-out players with 3+ critters.
- Test: `supatest.py` (real project; see `CLAUDE.md`). Note: its seed uses a localStorage marker; a sessionStorage-based seed re-seeded mid-test under file:// and looked like data loss.

## Weather + abilities (done, Nov 2026)
- Weather (`weather.js`, `WEATHER`): kind per area from local date + 6-hour block (nothing saved). Rain/storm/snow/fog/sun/ash drawn in `world.js` `draw()` under the day/night tint; HUD icon (`#loc-wx`), forecast on the world map, Settings toggle `settings.weather` (default on), reduced motion = colour wash only. Encounter tilt: 20% chance of the weather's type (`WEATHER.tilt`, applied after the night Dusk rule). Climate weights are first guesses. Test: `weathertest.py`.
- Abilities (one passive per type, both sides; code in `Component.hit` / `resolve` in `base.js`, text in `ABILITIES` in `data.js`, shown on Dex card, battle card and species detail): Ember Blaze +15% dmg below half HP, Tide Drizzle +2% max HP per round, Moss Thick Bark first hit -30%, Volt Static 20% daze on the attacker, Frost Numb -8% damage taken, Dusk Veil 5% dodge, Stone Sturdy survive one KO at 1 HP (needs >=60% HP), Bloom Regrow +15% once below 30%. `window.__noAb = true` switches them off (test hook). First versions of Drizzle (4%) and Veil (10%) made Tide/Dusk trainers 10-19 points harder and were halved.
- Balance check (`lbalab.py`, `towersimab.py`, same models as lbal5 / towersim; abilities off vs on, n=800 / 400): trainer win rate mean -1.6 points (worst Pike -7, Mako -6, most within noise of +-4); Tower median floors Lv14 6->6, Lv17 8->9, Lv20 12->13 (slightly easier). Not tuned against real play. Test: `abilitytest.py`.

## Landmarks: reusable environment blocks (done, Nov 2026)
- `landmarks.js` (`LAND`): registry of props. A def is `{w, h, foot, draw(g, X, Y, P, k), text}`: size in tiles, footprint rows (`X` solid, `.` walkable; default all solid), pixel art at 16 px/tile (P = map palette, so moss colours follow the zone), optional lore line. Current defs: ruin 4x3, camp 3x2, lighthouse 2x4, wreck 4x2, cairn 1x1, well 2x2.
- Props are NOT in `M.places` (those need a door; `nearest()` reads `p.door`). They live in `M.props` and are drawn by `PXW.terrain()` after places. Footprint tiles are `X` in the grid (solid, path edges ignore them).
- Placement: `WORLD.addProp(map, id, [x, y], text?, reserved?)` finds the nearest legal spot to the hint (clear ground, off paths / grass / water / borders / the reserved rectangle), stamps the footprint and puts a signpost with the lore line just below it. `PROPS` in world.js lists them per map: **to dress a new route or city, add rows there and (for a new look) one def in landmarks.js**. `PROP_RESERVED` protects the route trainer's stand and sight line (13..19, 3..11); pass a different reserved list for maps with other NPC spots.
- Current: Highland Pass ruin + 2 cairns; Ashwood Trail camp, well, cairn; Glacier Coast lighthouse + cairn; Reef Causeway wreck + cairn. Test: `landmarkstest.py` (all defs draw, footprints solid, placements); `cities.py` / `routes.py` still prove reachability and sight lines.

## Living world: ambient scenery + weather details (done, Nov 2026)
- `ambient.js` (`AMBIENT`): registry of tiny scenery critters (pure visuals, nothing saved). A def: `{layer, tile(ch), when(tod, weather), make(rand), step(a, dt, env), draw(g, a, x, y, t)}`; layers `ground` (under people), `air` (over people, under the day/night tint), `glow` (over the tint, for lights). Current defs: butterfly (day, clear/sun), firefly (dusk/night, glow layer), bird (hops, flies off when the player is within ~2 tiles, hidden in rain/storm/night), crab (sand tiles only, hidden in storms), glint (ice sparkle).
- Who gets what: `MAP_LIST[mapId]` if present, else `BY_REGION[WEATHER.region(mapId)]` (cities follow their zone, so **a new city or route gets sensible critters by climate with no extra work**; add a `MAP_LIST` row only to customise). Spawn spots are deterministic per map; fading in/out follows time of day and weather (1.2 s). Reduce motion or the Settings toggle `settings.ambient` ("Wildlife", default on) = nothing drawn.
- Weather details in `world.js`: `waterFx` (rain ripples on `~` tiles, storm whitecaps), `snowCaps` (white scalloped cap on the top third of ordinary building roofs while it snows; skips board/device/shrine). All drawn before the entities; interiors get none.
- Test: `ambienttest.py` (per-map counts, none indoors, bird flees, crabs on sand, day/night/rain visibility, screenshots to /tmp/amb-*.png). Perf: perf.py world_frame_avg 0.6 -> 0.9 ms headless (machine noise is +-40%, but the new drawing does cost something; compare on a real phone).

## Housekeeping (done)
- `app.js` is now four files in build order: `base.js` (Base + Component), `data.js` (constants), `game.js` (Game), `app.js` (APP). Pure split: built output is identical apart from one comment. `weather.js` was added (see weather section below in git history). Tests run by group: `bash src/run-tests.sh @world|@battle|@saves|@ui`.

## Next step
Endgame phase is complete (Tower, shinies, milestones/titles all live).
Cities + route loop are live. Dan declined dailies and the rival for now. Next ideas: real-phone playtest + stats (the cities already have distinct layouts; only the four routes share the zone builder's structure). Waiting on Dan's phone playtest + stats. Candidate features: weekly Tower twist, daily challenge battle, Tower leaderboard (only if friends play). Housekeeping: split the test run, split app.js, and keep balance checks per change. Real-phone check of Tower, shiny sparkle/vibration and titles still pending.

