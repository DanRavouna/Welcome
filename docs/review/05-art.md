# 05. What is seen: colours, tiles, buildings, marks, critters, props, effects, weather and light

Reviewed from `src/world-rev/` and from Playwright captures of the review build at phone size (390 x 844, 2x), the hour pinned with `window.__tod`, the weather with `window.__weather`. Captures, scripts and the contact sheets (`mapsheet-*.png`, `vfx-sheet.png`) are in `/tmp/claude-0/-home-user-critter-roll/6af82fb3-3ee1-591e-8772-c856b5d98361/scratchpad/review-art/`. Nothing in the repository was changed except this file.

## For the directors

1. The world's own drawing carries most of the meaning already: the cold is still (no wind, straight snow, flags that hang), Cinderport feeds its fires (chimneys, lit windows, embers), the Lamp Tower is a real dark climb with two torches left "for whoever comes", the Arch is eight at a fire with a gap. The architecture per region (`drawHouse`) is the strongest art in the game.
2. The one light the whole game hangs on is broken at night. The generic "windows glow after dark" pass in `world.js draw()` lights BOTH of Home's windows (and the Lab's) whatever the kept state, so after the beacon the window the player is meant to light each day is already lit every night. Fix this first; it undoes the ending.
3. Inside and outside disagree in the opening: the window glows by day from the road (`homeLitNow`) while the lamp on the sill inside is dark (`objState` for `windowlamp`).
4. Dusk and dawn are invisible (tints of 0.14 and 0.12) although the game gates its quietest signs to those hours (the returned things, the skiff, the stakes, the lantern road). The player cannot see the hour change, so the hour cannot be a hint.
5. Two fires say the wrong thing: Glacia's hall of stillness is lit by four flickering braziers whose own text says "thin and straight"; the Forge Below burns eight fires by itself before anyone feeds it.
6. Everything that glows (beams, lantern halos, the great lamp's answer across the land) is drawn under the night wash; fireflies are drawn over it. At night the land's answer to the beacon is a smear and a firefly outshines a lighthouse.
7. Four pictures say something else: the ninth seat reads as a ninth statue; the title house is not Home; the Long Watch is dressed as a keep to conquer (gold battlements, red banners); Vigil Peak is a flowered picnic meadow in the one region that is meant to be still and cold.
8. The HUD and menus speak a second language (rounded glass pills, Nunito, soft drop shadows, blur) against the plank sign and the pixel dialogue box. A concrete CSS pass on `shell.html` is given below; Dan's "basic mobile app" is right and it is fixable without redrawing anything.
9. Small things dilute the signs: a white cup on every table in every house (so "two cups" means nothing), a computer terminal in Home, a shop mark too small to read on a phone, unlit lantern posts that vanish at dusk, fog drawn as hard grey bars.
10. What needs a phone: the pulse of the window, the six wind poses and the flags over real time, the beam's breathing, the feel of the HUD under a thumb. Everything here is judged from still captures and from the code.

## 1. What this element means now

The look is in two halves. The world (`pxworld.js`, `landmarks.js`, `adventure.js ART`, `weather.js`, `ambient.js`) was rebuilt with the sentence in mind and it shows: each region's architecture is a statement (log walls and a living roof in Mossbrook, a snow-capped gable with a lantern by the door in Frosthold, brick and riveted iron with a smoking chimney in Cinderport, whitewash and a blue dome with a lamp left on in Coralbay), the wind blows only where things change and never in the cold (`WINDS`), the dark places are darkness with a few kept lights (`drawDark`, `LIGHT`), and every route holds a sign of tending. The critters are soft, round, big-eyed things that walk ahead of their person: kept, not caught. The second half, the light rules and the interface, was not rebuilt with the same care. The light rules are special cases laid on top of each other (a day-lit kept window, a generic night glow, painted lamps that never change, glows drawn under the tint) and where they overlap they contradict the sentence at the moment it is played. The HUD, menus and toasts are a stock mobile skin. The picture says "a hand-made land where lights are kept"; the frame says "an app"; and at night the land forgets which light is the kept one.

## 2. Findings

### BUG OF MEANING

**F1. Home's kept window is lit every night by a generic rule.**
Where: `src/world-rev/world.js` `draw()`, the block `if (tod === 'night' || tod === 'dusk') M.places.forEach((p) => { if (p.kind) return; ...` which paints `#FFD86B` over both window rects of every place with no `kind` (Home and the Lab) plus a radial halo; it runs after the night tint. The kept-window block (`if (M.id === 'town' && opts.homeLit && opts.homeLit())`) runs before the tint.
What it says now: after the beacon, with `adv.flags.lampLit` and `homeLit` not today, the window is correctly dark by day (capture `96-home-after-day.png`) and lit at night with its twin and the Lab's two windows (`97-home-after-night.png`). Before the beacon the same: one kept window by day, two generic ones at night (`03-home-night.png`), so the kept window is never singular after dark.
What the sentence needs: one window at Home, lit for you until you become the keeper, then dark until you light it, by night above all.
Change: in the night pass skip `p.id === 'home'` (and give the Lab one window only, the right one, so the two buildings do not match); move the `homeLit` block after the tint so the kept window and its halo (radius 38) are the brightest thing in the village at night; leave the second window of Home painted glass in every state.
Verify: new check in `nighttest.py` or a new `homelighttest.py`: with `adv:{flags:{lampLit:true}}`, `homeLit` unset and `__tod='night'`, sample the canvas at Home's left window (`hp.x*32+16+14, hp.y*32+roofH+8+10` minus the camera) and assert it is not `#FFD86B`; with `homeLit` = today assert it is.

**F2. Inside and outside disagree about the lamp in the window.**
Where: `src/world-rev/app.js` `homeLitNow()` (outside: lit when `caught.length <= 1`, or three seals, or lit today after the beacon) against `objState()` for `o.kind === 'windowlamp'` (inside: lit when three seals, or dusk/night, or lit today).
What it says now: in the opening by day the window glows from the road (`02-home-day.png`) and the lamp on the sill inside is grey (`40-in-in-home.png`, right wall). Verified: `APP.homeLitNow()` is `true` and the `windowlamp` state is unlit at `__tod='day'` with one critter.
Needs: the same lamp seen from both sides.
Change: `windowlamp` lit = `homeLitNow() || (!flags.lampLit && (t === 'night' || t === 'dusk'))`.
Verify: one line in `openingtest.py`: `APP.homeLitNow() === objState(windowlamp).lit` at `__tod='day'`.

**F3. Fire that flickers in the hall of stillness.**
Where: `src/world-rev/adventure.js` `glaciaHall()` places four `kind: 'brazier'` objects ("A brazier. The flame is thin and straight."); `ART.brazier` calls the shared `flame()` (line 180) whose height is `sin(t*9)` and which throws a spark every half second. Capture `28-gym-glacia.png`: two fires dance beside Glacia on the still shelf; the zone's own sign is the `icelamp`, "a flame held in ice: it does not flicker".
Needs: the trial plays "ice forms only while you stand still"; the fires in the room must be as still as the pool.
Change: add `still: true` to the four objects and make `brazier()` (or a new `stillbrazier` art) draw a fixed `h1`, no spark, in the icelamp's three colours (`#FFA03A`, `#FFD27A`, `#FFF6D0`); leave Wren's and Blaze's braziers as they are.
Verify: a `windrhythmtest.py`-style check: sample the flame's top pixel in `gym-glacia` every 100 ms for 2 s; the row must not change.

**F4. The Forge burns eight fires on its own.**
Where: `src/world-rev/adventure.js` `forgeBelow()`: eight `brazier` objects "of hot coals" (`LIGHT.brazier = 2.4` tiles each) before the furnace is lit; compare `lampTower()`, where only the two door torches are lit "for whoever comes" and the rest you light. Capture `27-forge.png`: four fires already burning at the door.
Needs: the fire that has to be fed; the work. A hall already warm with eight untended fires says the opposite.
Change: before `flags.forgeLit` draw `fr0..fr7` with the `coals` art (dim, `LIGHT` 0.8) except the two by the entrance (`fr6`, `fr7` at 6,21 and 23,21 become the kept pair, drawn as braziers); after the furnace is relit all eight burn.
Verify: new one-liner: in `dg-forge` before `forgeLit`, count objects whose `LIGHT` returns more than 1 tile = 3 (two braziers and the furnace at 2).

**F5. Frosthold's and Cinderport's "lit from inside" goes out at night.**
Where: `src/world-rev/pxworld.js` `drawHouse()`: the longhouse windows (`#FFE08A`) and door lantern (`#FFD27A`), the forge windows (`#FF9A3A`), the shell house's "lamp left on", the cottages' windows are all painted into the still terrain; the night pass in `world.js` skips every place with a `kind` (`if (p.kind) return;`) so houses get no glow; the 0.42 night wash dulls the paint. Captures `12-frosthold-night.png`, `73-frosthold-house-night.png`, `74-cinderport-night.png`, `92-cottages-night.png` (Mira's window pale blue at night).
Needs: the warmth the walls state by day should be truest at night; the two Sproutvale cottages should be warm too, and Home's one window still the brightest.
Change: in the night pass, for every `kind === 'house'` and the gym halls, redraw the window rects after the tint without a halo (longhouse: `X+10, Y+roofH+6, 8x8` and `X+Wd-18`; forge: `X+8, Y+roofH+5, 12x9`; cottage: `X+8, Y+roofH+4, 14x10` and `X+Wd-22`; shell: the two 8x8 at `Y+roofH+6`) in a dimmer `#E0B860`, plus the door lanterns (`lx = doorX+18`) with a 9 px halo. Home alone keeps `#FFD86B` and the 38 px halo (F1). The light rule in one line: warm inside everywhere; one light kept for you.
Verify: pixel sample at night at a Frosthold house window: must be warmer than the wall.

**F6. Dusk and dawn cannot be seen.**
Where: `src/world-rev/world.js` `draw()`, the tint table `{ night: 'rgba(14,24,70,0.42)', dusk: 'rgba(255,110,50,0.14)', dawn: 'rgba(255,190,140,0.12)' }`.
What it says now: `07-routemf-dusk.png` and `17-coralbay-dusk.png` are indistinguishable from day except that a lamp is on; `32-routefc-dawn.png` is day. Yet the game gates its quietest signs to these hours: the returned things and the skiff (`gate: 'dawn'`), the stakes (`gate: 'dusk'`), the harbour lamp, the moored skiff and the lantern road (dusk and night). A hint that lands at an hour the player cannot see is not a hint.
Change: dusk `rgba(255,120,60,0.24)` plus a second fill, a vertical gradient from transparent at the top to `rgba(30,30,90,0.22)` at the bottom (the ground cools first); dawn `rgba(255,205,160,0.2)` plus `rgba(120,140,200,0.16)` from the bottom; night unchanged. Keep both under 0.3 so the pixels stay readable.
Verify: new check: mean canvas colour at the four hours on `route-mf`; dusk and dawn must each differ from day by more than 12 in the red or blue channel; `nighttest`/`transitiontest` snapshots re-read.

**F7. Every glow is under the night, fireflies are over it.**
Where: `src/world-rev/world.js` `draw()` order: objects with their halos (`postlamp`, `harborlamp`, `moored`, `camp`, `chamberlamp`), then `drawBeam` for the beacon and the lighthouses, then weather, then the tint, then `AMBIENT 'glow'` (fireflies, embers) and `drawDark`.
What it says now: `98-ascent-after-night.png` and `99-routefc-after-night.png` with the great lamp lit: the beacon's beam is a faint column, the lighthouse beam a pale smear, both darkened by 42 percent; the fireflies beside them are full white. The land's answer to the last act is the dimmest thing on screen at the hour it should own.
Change: draw sprites before the tint, halos and beams after it (collect `drawBeam` calls and lamp glows and flush them where `AMBIENT.draw(ctx, 'glow', ...)` runs).
Verify: pixel sample on the beam's axis above the beacon at night with `lampLit`: brightness above the sky's; before `lampLit`: equal to the sky.

**F8. The ninth seat reads as a ninth statue.**
Where: `src/world-rev/adventure.js` `ART.seat` (an 8x8 dark block on the statues' plinth with a gold shimmer at 0.25 to 0.65 alpha) beside `ART.statue`; the seat has no `LIGHT` entry, so in the hall's dark it is as dim as the ring. Capture `22-arch.png`: the top of the ring is a grey lump like the eight others.
Needs: the one left out must be the first thing the eye finds: an empty place, not a smaller figure.
Change: the plinth with nothing on it, the shimmer enlarged to a 14 px radial halo (as `walllamp`) at 0.35 to 0.6, `LIGHT.seat = 1.4` so it is the one lit stone besides the fire, and the small crown carved above it as 4 gold pixels (the text already says it is there).
Verify: in `dg-arch`, mean brightness of the seat's 32x32 patch above the mean of a statue's patch.

**F9. The HUD and menus are a second visual language.**
Where: `src/world-rev/shell.html`. World language: the `.plank` sign (wood, `Pixelify Sans`, hard edges), `#dlg-box` (`#F8F8F8`, 4 px `#1E2A4A` border, inset `#8FA3C8`), the exit tags. App language: `.chip` (999 px pills, `var(--ink)`, Nunito 800, `box-shadow 0 4px 12px`), `.mbtn`, `#act .ring`, `#atk .ring`, `#pouch` (circles with `radial-gradient` and `0 6px 18px` shadows), `#toast`, `#tip`, `#act-label` (`var(--glass)` with `backdrop-filter: blur(10px)`), the menu's `.tile`, `.mgroup`, `.prof`, `.rail` (glass, blur, 16 to 18 px radii). Captures `02-home-day.png`, `60-menu.png`, `61-party.png`.
What it says now: a template app over a hand-made land.
Change, the minimal pass: (a) `.chip`: `border-radius:0; background:#F8F8F8; border:3px solid #1E2A4A; box-shadow:inset 0 0 0 2px #8FA3C8; color:#1E2A4A; font-family:'Pixelify Sans'`; (b) `.mbtn`, `#act .ring`, `#atk .ring`, `#pouch`: `border-radius:8px`, `border:3px solid #1E2A4A`, flat fills (`#FFC94D`, `#FF7A5A`, `#F8F8F8`), shadow `0 4px 0 rgba(0,0,0,.25)` like the plank, no `radial-gradient`; (c) `#toast`, `#tip`, `#act-label`, `#atk-label`, `#duel`: the `#dlg-box` recipe, no blur; (d) `.tile`, `.mgroup`, `.prof`, `.wm-panel`: `border-radius:6px`, 3 px navy borders, no `backdrop-filter`; (e) keep `#stick` round (a thumb needs a circle) with a flat cream `#knob` and a 2 px navy ring. `Pixelify Sans` for labels, Nunito only for body text.
Verify: `bash src/run-tests.sh @ui` (`menutest`, `transitiontest`, `hubtest` with axe for contrast), then re-snapshot after reading the diffs.

### WEAK

**F10. The title house is not Home.**
Where: `src/world-rev/shell.html` `<svg class="title-house">`: a gable roof (`#4A2A3A`) with a chimney at the right and a window at the left. Home in the world (`pxworld.js drawHouse`, cottage branch): a round shingled dome in `#D8574A`, cream timber-framed wall, chimney at `X+Wd-16`, the kept window at `X+8` (left). Captures `01-title.png`, `02-home-day.png`.
Says now: the introduction and the thing introduced are two houses.
Change: redraw the SVG as Home's silhouette at night: a half-ellipse roof in `#5A2A2E`, wall `#2A2838`, chimney right, the lit window left at the same proportion (14 x 10 of a 7-tile wall), the glow kept. When the title fades, the player then stands under the house they touched.
Verify: eyes; `openingtest.py` still passes.

**F11. "Touch the light" tells what the glow already says.**
Where: `shell.html` `.title-cap`. The pulse (`tglow` 2.6 s) and the button over the window already ask. Change: remove the caption, or show it only after 8 s without a touch (`setTimeout` in `showTitle`). Keep the `aria-label`.
Verify: `openingtest.py` (it clicks `#title-light`, not the text).

**F12. The title glow is a brown sticker.**
Where: `shell.html` `<circle class="title-glow" r="9" fill="#FFD27A" opacity="0.28"/>` on `#0B1026`: a flat disc reads as a muddy circle, not light (`01-title.png`). Change: a `<radialGradient>` (`#FFD27A` at 0.55 to 0 at r 14), pulsed; the first light should look like light.

**F13. The Long Watch is dressed as a keep to take.**
Where: `pxworld.js place()` `p.kind === 'tower'`: three lilac tiers with gold battlement rows (`#F5C542` / `#C9962A`), two red banners (`#D8574A`), a purple cap, a gold finial; six windows lit by day. Capture `25-peak.png`.
Says now: a castle; floors to climb; a trophy. The meaning is a long watch: nights kept.
Change: replace the two banners with two hanging lanterns (the `walllamp` art, lit), the gold battlement rows with the tier's dark stone (`#6E6A94`), keep the lit windows (the lobby's lamps that do not go out) and the pennant (it hangs still on the Peak, which is right).
Verify: eyes; `towertest` tiles-changed line.

**F14. Vigil Peak is a flowered meadow in the still cold.**
Where: `pxworld.js PAL.peak` (`g '#8DB07A'`, `fl` white/violet/gold), `world.js THEMES.peak` (`bg '#4E5E7A'`), `ambient BY_REGION.peak` (birds), `buildPeak` scatter (`v < 0.2` flowers). `WINDS.peak = { base: 0 }`: the Peak is one of the three still places. Capture `25-peak.png`: green grass, flowers everywhere, a tarn, birds hopping.
Says now: a pleasant alpine picnic. The Peak is the long watch and the still cold.
Change: ground above the tree line in the Ascent's palette (`g '#E8F0F8'`, `gd '#FFFFFF'`, `gt '#B9CCE0'`) with the lilac path kept, `fl ['#FFFFFF']`, `THEMES.peak.bg '#9FB4D0'`, `BY_REGION.peak` glints only. The Peak and the Cold Ascent then read as the same cold the Lamp Tower sits in.
Verify: `mapsheet.py peak`; `peaktest` tiles-changed line (it compares against a stand-in build, so only eyes count).

**F15. The lantern road is one dot, not a road.**
Where: `adventure.js ART.postlamp`: the lantern is 8 x 11 art px (16 x 22 screen px on a phone), unlit glass `#3A3340` on a `#5A4A38` post. Capture `07-routemf-dusk.png`: the unlit post is a dark stroke, the lit one ahead a small glow; the road "kept by people you never meet" does not read as a line of posts.
Change: unlit glass `#6A6478` (the arch lamp's cold grey); at dusk and night a faint 0.12 halo (radius 14) on every post and the full halo on the lit one, a dotted line with one bright bead; after the beacon the faint halos stay off until you pass.
Verify: count visible posts in a dusk capture of `route-mf` (should be 3 to 4 on a phone screen).

**F16. After the beacon the gate lamp keeps being kept by someone else.**
Where: `world.js buildTown` `gate-lamp` with `day: true`; `app.js lampState`: `if (o.day) want = 1`. Capture `96-home-after-day.png`: the window at Home is dark, the gate lamp glows as before. The one lamp whose text is "Someone keeps it that way" is still kept for you after you became the keeper, while every other post waits for you.
Change: after `flags.lampLit`, the gate lamp is lit only when `homeLit` is today (you keep the gate as you keep the window), easing like the others.
Verify: `APP.lampLevels()['gate-lamp'] === 0` with `lampLit` and `homeLit` not today; 1 after lighting the window.

**F17. Two cups on every table in every house.**
Where: `pxworld.js interior()` tile `t`: a table with a white 4 x 3 square on it; every interior layout in `world.js` (`'house-pip'`, `'fh-a'`, `'cp-a'`, `'in-home'`, the Lab, the Watch lobby) places two `t` tiles. Captures `40-in-in-home.png`, `40-in-in-cp-a.png` (the Smithy has two tables with cups beside the anvil).
Says now: nothing, because it is everywhere; so the signs that mean something (`cups` at Hermit's Cliff "Two cups", the `kettle` "two cups" in Frosthold, Home's `twochairs`) are background.
Change: make `t` a bare table (remove `R(X + 6, Y + 2, 4, 3, '#FFFFFF')`) and keep cups only on the objects that mean them (`cups`, `kettle`, `bowls`).
Verify: eyes; `housetest`-type snapshots if any read the interior canvas (none do by pixel).

**F18. A computer in the kept home.**
Where: the `in-home` layout uses the `m` tile (a terminal with a cyan screen and a green LED, the same machine as the Lab's four). Capture `40-in-in-home.png`, right wall. In a room made of a lamp, a stove, a photo and two chairs, a terminal says "save point", nothing.
Change: in the home layout swap `m` for a second `h` (hearth) or nothing; keep the terminals in the Lab, where "being studied" is the point.
Verify: eyes.

**F19. The shop mark is a pink blob at phone size.**
Where: `pxworld.js MARK.shop` 12 x 10 art px (24 x 20 screen px on a phone), a flask on a cream board hung flat on the wall over the door. Captures `73-frosthold-house-night.png` (3x zoom, readable), `11-frosthold.png` (1x, a pink square). The other open kinds read from their shape; the shop alone depends on a mark, and the mark is the smallest drawing in the game.
Change: a 16 x 14 board hung on a bracket at right angles to the wall (the real-shop convention reads at small sizes), the flask 8 px tall with a 1 px white rim and a dark cork, and the bracket's shadow on the wall.
Verify: a 1x capture of each city's shop; the flask must be identifiable at 390 px.

**F20. The exit tags are the one word left over the world.**
Where: `world.js draw()` `drawTag('To ' + name, ...)` at every gap, after Dan's rule took the names off the buildings. Captures: "To Moss Forest" sits beside the lamp-lit gate in the opening (`05-town-day-gate.png`). The lamp and the barricades already say which way is open.
Change: show a tag only within 3 tiles of its gap (the way a place's name comes at the door), or drop them and let the plank read the name on arrival.
Verify: `openingtest.py` measures the gate by flood fill, not by the tag; `walktest.py` still finds exits.

**F21. The zone and weather tips cover the picture that was the hint.**
Where: `app.js onMap` `hint('zone', 'Each zone has its own two types. The sparkling patch is rare grass with better odds.')` 0.9 s after arrival, and `renderWeather()`'s `hint('weather', ...)`: navy text boxes across the middle of the screen (captures `07`, `09`, `11`, `13`). Words are another brief, but what they do to the picture is mine: the first ten seconds in every new place are a wall of text where the place should be the statement.
Change: drop the zone tip (the sparkle is the hint), fold the weather note into a tap on the plank's weather icon.
Verify: `telltest` lints the world text; add the tips' strings to its list.

**F22. Door lamps "left on" are three pixels.**
Where: `pxworld.js drawHouse` shell and longhouse branches: a 3 x 4 px `#FFD27A` rect painted into the terrain, never changing. Capture `16-coralbay.png`: not findable at 1x. "A lamp left on beside the door" (Coralbay: the road home) is the most important detail of that architecture and the least visible.
Change: an object per house (`kind: 'doorlamp'`, the `harborlamp` art with a halo at dusk and night), placed by `buildCity`.
Verify: a dusk capture of Coralbay; each house shows a halo by its door.

**F23. The leaders stand on a podium.**
Where: `world.js draw()` "stone platform under leaders": a raised slab with four gold studs under every leader (captures `28`, `29`, `31`, `78`). A podium says boss; the trials are letting go.
Change: drop the slab; draw what each keeper keeps at their feet (Wren a planter, Glacia the pool's edge, Blaze a woodpile, Coral a lamp) with the existing `ART` kinds.

### POLISH

**F24. Fog is drawn as hard bars.**
Where: `weather.js` fog branch: 7 rects 160 to 380 px wide, 18 to 42 px tall, 0.16 to 0.24 alpha, square-edged. Captures `19-moss.png`, `20-mossbrook.png`, `25-peak.png`: pale stripes that read as a rendering fault.
Change: three stacked rects per bank at decreasing width and alpha (0.2 / 0.12 / 0.06) with 8 px steps, or dither the edges with the `BAY` matrix already in `vfx.js`; bias fog to the frost climate and to dawn (`CLIMATE`).

**F25. Interiors never see night.**
Where: `world.js draw()` `tod = (M.interior || M.cave) ? 'day'`; `pxworld.js interior()` paints the back-wall windows daylight blue (`#9CD3F5`). At night the rooms show noon through the glass.
Change: overlay the window rects (`y === 1 && x % 4 === 1`) in `#1E2A4A` with one `#FFFFFF` star pixel when `timeOfDay()` is night, drawn in `draw()` for interiors.

**F26. The still coast scuttles.**
Where: `ambient.js MAP_LIST['route-fc']` gives Glacier Coast 3 crabs and 2 birds while `WINDS['route-fc'] = { base: 0 }` makes it a still place (`32-routefc-dawn.png`: red crabs on the snow).
Change: `'route-fc': [['glint', 8]]`; crabs stay on the Tide maps.

**F27. The rolls lamp tells the number twice.**
Where: `shell.html` the rolls chip: a 14 px lamp whose flame shrinks (`#c-oil`) beside "20/20". The lamp is the one HUD element that plays the day's light being spent, and it is the smallest thing on the screen while the number says it again.
Change: lamp at 22 px, show the count only (`20`), drop the `/20`; the flame height is the fraction.
Verify: `dailytest`/`menutest` snapshots read the text; re-snapshot.

**F28. Frost's particles sway in the still cold.**
Where: `vfx.js PSTYLE.Frost = [30, 0.7, 0.8, 2, 1, 1]`, the last 1 is drift (`sin(p.t*7)` sideways). Snow in the weather falls dead straight where the wind is zero; the Frost critters' hit particles should fall straight too.
Change: drift 0 for Frost.

**F29. The beacon's cage and the lighthouse lamp never light.**
Where: `landmarks.js beacon` (dark glass `#3A4468`/`#5A6896`) and `lighthouse` (`#FFE9A0`, always); only the beam changes (F7). With F7 done, also repaint the cage glass warm and the lighthouse lamp from grey to warm when `opts.relit()`; `terrain()` is static, so draw the 12 x 8 glass rect in the object pass.

**F30. The kept critter has no mark of being kept.**
Where: `world.js drawCritterAt`: the follower uses the same icon sprite as the wild ones roaming in action mode (`09-frost-day.png`, `18-tide.png`); the only difference is that it walks ahead of you. The sprites are right to be the same (kept is not owned). One small sign could be played: a 2 px band in the keeper's gold (`#FFD86B`) on the one that walks with you and the one asleep in the Lab basket. Optional, and it may read as a collar, the wrong word. Dan's call.

**F31. The plaza basin says nothing.**
Where: `pxworld.js terrain()` `if (M.id === 'town')`: a 32 px square of `#5AA8F0` with a grey rim at 21,19 (`92-cottages-night.png`, centre). The village's "bucket up and full" is the `well` prop by Mira's; the basin is a second water thing from before the revamp.
Change: remove it or make it the well.

**F32. The Watch's locked-exit barricade appears inside dungeons.**
Where: `world.js draw()` "barricades on locked trails" draws the red-and-white road barrier at any locked exit, including the Lamp Tower's and the Forge's doors when the player is under the climb's level (`21-lamptower.png`, dev-teleported). A road barrier inside a stone tower is a wrong picture when it shows.
Change: skip it when `M.cave`.

## 3. What could not be judged from here

- Tempo and feel: the window's pulse, the six wind poses (`V6`, one gust as a band passing), the flags, the leaning smoke, the beam's breathing. The code is right on paper (rest for four of six poses; only the outer pixels move); whether it feels like wind on a phone needs a hand and a clock, the way `windrhythmtest.py` logs poses against time. I did not run it against the review build.
- The HUD under a thumb: targets are 44 px or more; whether the pixel language proposed in F9 reads at arm's length is a phone question.
- Colour on real screens: the dusk and dawn values in F6 are a starting point; the 0.42 night wash may be too light on an OLED outdoors.
- Sound was not listened to; where a finding asks an element to change (the still fires, the beam at night), the matching sound is someone else's check.
- Weather and the fog and snow were seen as still frames only; their drift is unjudged.
- `peaktest` and `towertest` compare against a stand-in build, so their "tiles changed" lines prove nothing here; eyes and the pixel samples named in F1, F5, F7 and F8 are the verification.
