# 07 Pacing: the first minute, the distances, the gates, the day's lamp

Scope: `src/world-rev/` as built tonight. Everything below was measured with Playwright bots on the review build (`games/critter-roll-review/index.html`) with real defaults (test mode off, 20 rolls, no seed hook) unless marked "model". Scripts and logs: `/tmp/claude-0/-home-user-critter-roll/6af82fb3-3ee1-591e-8772-c856b5d98361/scratchpad/review-pacing/` (`botA.py` the timed opening and Wren's trial, `botA2.py` the new partner in town, `botB.py`/`botB2.py` tile distances over the real collision, `botC.py` one 20-minute day, `botD.py` the four trials with real walking, `xpmodel.py` days to each gate, `shots.py` phone-scale screenshots).

## For the directors

1. The first act of meaning is 6 s after Fern's last line: a wild critter waits 2 tiles from the door and the bot keeps it at 9.6 s from page load. A human reading Fern (606 characters, 8.5 s of typewriter) and the partner card gets there at about 30 to 45 s. The direction holds: the gate lamp is in view at spawn on a phone, the gate is 14 tiles, Moss Forest 31 more, Wren's door 22 more, and the bot stands in Wren's hall 2 minutes after load and has the vines back at 2 min 32 s.
2. The first minute is told more than played: a tip, the 'grass' hint (which is false in action mode: critters roam visibly, you do not "walk through grass to find one"), the 'party' menu lesson 0.7 s after the first keep, the partner card's type triangle and Power numbers, then 'zone' + 'weather' toasts on entering Moss and 'shop', 'online', 'evolve' within 90 s. Eight toasts of 3.8 s in two minutes (the day bot: seven hints in its first 62 s, then "Frost Peaks is now open!" at 67 s). Cut five of them (findings 5, 6, 10, 11, 12).
3. The day's lamp is not a lamp that burns down, it is a fuse: the day bot spent all 20 rolls in 90 s (10 keeps, 7 species, level 3) and then played 18 more minutes with trainer XP frozen at 208 and twelve "Let it go". A human is slower, perhaps 5 to 8 minutes, still a quarter of a 20-minute session. Sightings (40/day) are almost untouched (30 left). Finding 1.
4. Two of nine daily quest kinds ('roll', 'special') and one of three city quest kinds ('see') can never progress in action mode: 58% of days hand out a quest that cannot be done. Finding 2.
5. The gates are counts of species discovered (25 XP per new species is the only big XP source; keeps 3, wins 10, quests 30). "Prove you can carry it" is played as "collect"; the bump toast recites the number. Frost (3) opens on day 1 within two minutes of real play; Ember (6) day 2 to 4; Tide (9) day 5 to 16; the Ascent (11) day 7 to 25; the Descent (13) day 12 to 42 (model, 20 min/day). The late gates are walls of days with 70 to 150 XP a day. Findings 3 and 4.
6. The ending's act (the great lamp, level 11) is gated below the forge (13) and the Watch (four seals, after Coral at 9+): the road continues past its end. Swap the climb gates. Finding 4.
7. Wren's trial lands at 2 minutes, but behind it Wren asks for Ivy first ("prove yourself against Ivy") and fields a level-11 team against a level-1 to 6 partner: the act (tend, 27 s) and the fire (the seal) are days apart. Finding 9.
8. Three of the road's hints are gated by the real clock (the lantern road, the Reef's answering lamps, the camps' dark): a player who plays at lunch never meets them. Finding 14.
9. The three later trials: Glacia's pool is crossed in 6.6 s, Blaze's three fires in 10.1 s on the shortest order (the first fire at 0.44 when the third is fed), Coral's three rounds hold 12.6 s of calls plus about 40 s of walking (calculated, the bot run did not finish); the Watch's nights 29.6 s to 60 s, 15.6 minutes for all twenty in one sitting, a loss resets to night 1. Findings 16 to 19.
10. Not judgeable here: joystick feel at 4 tiles/s, whether 3.8 s toasts can be read while walking, the typewriter tempo, carrying a log on a phone, whether 30 to 60 s nights feel kept or endured, and sound.

## What the pace means now

The opening paces well: touch, two lines, a partner, two lines, a critter two tiles away, a lamp in view, a gate 14 tiles off, and the road to the first trial is 127 tiles and two and a half minutes with no empty screen. From the first keep on, though, the pace speaks another language than the sentence. The loop's verb is Keep, and the day's supply of it is spent in the first fraction of a session, after which the session is fighting things you must let go; the gates measure how many kinds you have collected; the hints explain menus during the first act; and the ending is not where the road ends. The clock inside each place (2.5 s a stage, 0.8 s a plate, 14 s a fire, 0.7 s a call, 30 s a night) is mostly right in proportion; the clock across the days is wrong in proportion.

## Measurements

| What | Measured | Source |
|---|---|---|
| Title visible / light touched / Fern line 1 | 0.7 s / 0.8 s / 1.5 s after load | botA |
| Fern + card text | 8 lines, 606 chars; typewriter 2 chars per 28 ms = 8.5 s of printing | botA, `showDialog` |
| First wild critter | 2.0 to 2.5 tiles from the door (`spawnOne(..., [6,10])`) | botA, A2 |
| First keep (bot, real attack) | 9.6 s after load, 6.5 s after Fern; XP 56, Lv 1, 19 rolls | botA |
| Walking speed | about 4.0 tiles/s (34 tiles in 8.4 s); follower 4.2 TS/s | botA |
| Home door to: west gate / Rowan / Lab / north gate / south / east / peak trail | 14 / 15 / 37 / 33 / 36 / 41 / 38 tiles | botB |
| Moss: in to patch / in to Mossbrook | 34 / 31 tiles; the patch stirs 2.2 s | botB, `stir` |
| Mossbrook: in to Wren's door / north exit / south exit | 22 / 14 / 23 | botB |
| Opening to Wren's door (bot, real walking) | 24.6 s after the first keep (openingtest); in the hall at 2 min 05 s, vines back 2 min 32 s (botA) | both |
| Tiles walked, load to Wren beaten-hall | 127 (town 17, Moss 49, Mossbrook 23, hall 38) | botA |
| Wren's trial | 4 beds x 2 stages x 2.5 s = 20 s tending; 27 s with walking | botA |
| Glacia's trial (real walking) | door to shore 0.9 s, pool crossed in 6.6 s (6 plates at 0.8 s); the icicle flag was not confirmed by the bot | botD |
| Blaze's trial (real walking, shortest order fire2, fire1, fire3) | 10.1 s; fire2 at 0.75 when fire1 is fed, 0.44 when fire3 is fed; slag wall opens | botD |
| Coral's trial | 12 calls x 0.7 s + 3 x 1.4 s = 12.6 s of calls; lamps 6 to 14 tiles apart, about 40 s of walking (calculated; the bot did not finish in time) | CORAL_SEQ, botB |
| Highland Gate / Pass / Fork / Frosthold to Glacia | 25 / 27 (arch at 15) / 31 / 22 tiles | botB |
| Town to Frost Peaks to Frosthold to Glacia | 33 + 25 + 18 tiles | botB |
| Cold Ascent / Cinder Descent | 149 / 157 tiles, 3 level-18 trainers each | botB |
| Lamp Tower: L1 / L2 / L3 / Maren / great lamp | 13 / 26 / 39 / 46 / 49 tiles; lamps take 2.4 s each | botB2, `CL_S` |
| Ashwood road Mossbrook to Blaze | 23 + 30 + 29 + 32 + 22 = 136 tiles | botB |
| Reef road Cinderport to Coral | 33 + 31 + 29 + 30 + 28 = 151 tiles | botB |
| Glacier road Frosthold to Coralbay | 33 + 34 + 26 + 37 + 22; two screens with nothing (shelf, landing) | botB, mapstats |
| Screens with no person and no object | route-fc-shelf, route-fc-landing (and route-mf-fork, lantern posts only) | mapstats |
| The Watch's nights | 28 + 1.6 n s (+10 on 5/10/15/20): 29.6 s to 60 s; all 20 = 936 s; 2 starts a day; loss = night 1 again | action.js:289, game.js:337 |
| One day, bot in Moss Forest | rolls 20 to 0 in 90 s (10 keeps); Lv 3 at 90 s; XP flat at 208 to 20 min; 12 let-go by 3.5 min; sightings 30/40 left; essence 31; partner Lv 6 at 3.5 min | botC |
| Days to Frost / Ember / Tide / Ascent / Descent (model, 20 min a day) | 1 / 2-4 / 5-16 / 7-25 / 12-42 | xpmodel |
| Steady day once species are known | 70 to 150 XP; Lv 9 to 11 = 840 XP = 6 to 12 days; 11 to 13 = 1000 XP = 7 to 14 days | xpmodel |
| Toast / hint spacing | 3.8 s visible, 4.6 s between hints; 8 toasts in the first 2 minutes | app.js:1292, 418 |
| Knocked out | 4 s down, recover at 50% in place; foes re-chase within 5 tiles; bot: 13 KOs in 90 s on the town road | action.js:225, 319, 348; botA |

## Findings

### BUG OF MEANING

**1. The day's lamp burns out in the first minutes; the rest of the session is "Let it go".** Where: `data.js` `KEEP_COST`, `base.js` `energy()` (20), `game.js` `actKeep`, `app.js` `#c-oil`. Now: 20 rolls buy about 10 keeps; the day bot spent them in 90 s and then fought for 18 minutes with trainer XP frozen (208) and twelve refusals ("Needs 1 rolls"). Sightings are nearly unused (30 of 40 left after a day: only a keep spends one). The sentence needs: a day that holds what it holds, spent across the day, the flame going down with the session. Change: either (a) `KEEP_COST` Common 1, Uncommon 1, Rare 2, Mythic 4 so 20 rolls are 15 to 20 keeps, or (b) keep the costs and let the lamp count the session: `energy()` 30; and in both, fold the dead sightings counter into the lamp (drop `FREE_SIGHTINGS` from `actKeepCost`). Verify: botC's 30-s rows: rolls should reach 0 after 10+ minutes of bot play, not 90 s.

**2. Quests the day cannot keep.** Where: `base.js` `makeQuests` pool `['roll','keep','win','adv','type','evolve','special','release','species']`; `data.js` `CITY_QUESTS` kind `see`. Now: no code fires `{t:'roll'}` except the gone roll screen (`base.js:1040`) and nothing fires `{t:'special'}`; `questTick('see')` is only called in `encounter()` (`app.js:47`), which action mode never reaches (`world.js:980` skips it while `ACT.active()`). 58% of days (1 minus C(7,3)/C(9,3)) show a quest that cannot progress; one city quest in three ("spot 5 wild critters") never ticks. Change: pool without 'roll' and 'special' (or fire 'special' from the verbs in `action.js`), and tick 'see' from `spawnOne`'s first sighting or from `kill`. Verify: botC's end print (`questsTotal` 0/5 for 'roll' after 23 kills) becomes a progress.

**3. The gates count what you collected, and say so.** Where: `data.js` `GATES`, `ROUTE_GATES`; `base.js` `applyEvents` XP (keep 3, species 25, win 10, quest 30, leader 100); `app.js:1473` `onLocked` ("Frost Peaks opens at trainer level 3. You are level 1."), `app.js:1301` sign suffix, `app.js:11` "is now open!". Now: 25 of every 28 XP of a keep is the new species, so a gate is "discover N kinds"; the toasts recite the number. The sentence needs: a keeper lets you go further once you have kept a fire. Change: gate by fires kept, not by level: town north opens at Wren's seal, south at Glacia's, east at Blaze's, `ascent` at 2 seals, `descent` at 3 (the leaders' teams already do the balance: 11 / 5 / 15 / 14); replace `onLocked`'s number with a gesture (the gate's lamp unlit, nothing said) and remove the level suffix on signs. If levels stay: drop "You are level N." Verify: `balancetest` pins the gates; a new check that a fresh save with one seal can enter Frost Peaks.

**4. The ending comes before the road ends.** Where: `ROUTE_GATES` ascent 11, descent 13; the Watch at four seals. Now: the great lamp (the last act per the brief) is reachable at 11, the forge at 13 and the Watch after Coral (9+): two keepers and twenty nights come after "you no longer need someone to keep it". Change: `ascent: 13, descent: 11` (the weaker twin, work, before the light), and the Watch's door opens at 3 seals so the lamp is the last gate; or, under finding 3, ascent at 4 seals. Verify: `balancetest` gate line; a BFS that no station opens after the lamp.

**5. The first words of the game are wrong for the game.** Where: `shell.html:239` `#tip` ("Wild critters hide in tall grass, and the trails out of town lead to new zones."), `app.js:1478` `onGrass` hint ("Keep walking through it to find one.", shown at 5.7 s). Now: in action mode critters roam in the open and come to you; the first hint tells a mechanic that no longer exists, and recites what the first keep is about to play. Change: delete the 'grass' hint; `#tip` to "Walk with the joystick." or nothing (the critter by the door is the tip). Verify: botA's log shows no toast before the first keep.

**6. A menu lesson sits on the first act.** Where: `app.js:423` hint 'party', fired by `checkHints` at `caught.length >= 2`, 0.7 s after the first keep (botA 10.3 s). Now: the first thing the game says after you keep something is "Menu, then Party". Change: remove it (the kept critter sleeps in the Lab basket; the party is one critter for a long time) or fire it at the first knock-out with a second critter kept. Verify: botA's log between 'first keep' and 'Moss Forest' is empty.

**7. The shut gates are roadworks.** Where: `world.js:1154` barricade drawing (brown posts, red and white stripes), screenshot `s5-north-barricade.png`. Now: three gates "shut behind barricades" read as construction, not as kept shut for you; the lamp lit by day on the open gate is the right sign, the stripes say something else. Change: draw the shut gates as the same post lamp unlit (a `postlamp` with `day: false` on each shut exit) and a plain closed gate; no stripes. Verify: `openingtest` lamp check extended to four lamps, one lit.

**8. A road opens by toast while you are elsewhere.** Where: `app.js:8-11` ("Frost Peaks is now open!"). Now: the level-up removes a barricade off screen and announces it in words. Change: light the gate's lamp when it opens (the same `gate-lamp` object per gate, `day` set by `exitLocked`), no toast. Verify: `lampLevels()` shows the new lamp at 1 after the level-up.

**9. The first trial's act and its fire are days apart.** Where: `app.js:612` Wren `lv: 11, size 3, stage 2, needs: 'ivy'`; `app.js:1143` "Before you challenge me, prove yourself against Ivy in Moss Forest." Now: the hall opens at 2 min 05 s and the vines draw back at 2 min 32 s with a level-1 partner (measured); the duel behind the vines is tuned for a party that takes days (the handoff's "about Lv5 at Wren" is a guess; `botC`'s partner reached Lv 6 in 3.5 min of bot fighting, a human maybe 15 to 25 min) and Wren first sends you back to Moss Forest for Ivy, a told detour. Change: drop `needs: 'ivy'` (the trial is the proof) and set Wren's team to `lv: 6` so the first fire is kept on the first day; keep 11/5/15/14 for the others. Verify: `duelsim.py` with a Lv 4-6 starter against Wren at 6; botA extended to the duel.

### WEAK

**10. The partner card is a spreadsheet.** Where: `app.js` `openStarter` ("Ember beats Moss, Moss beats Tide, and Tide beats Ember. There is no wrong choice", "Strong vs", "Power 267 / 277 / 278"), screenshot `s2-partner.png`. Now: the gift is chosen by number in the first 15 s and the triangle is recited. Change: name, type, one line of character; no Power, no triangle sentence. Verify: `openingtest` text guard.

**11. Two toasts at the forest door tell the patch.** Where: 'zone' hint ("The sparkling patch is rare grass with better odds", botA 103.1 s) and 'weather' (`app.js:162`, 107.7 s, "Weather changes every 6 hours, and the Map shows each area's sky"). Now: 9.2 s of text on entering the first zone, the first saying "odds" where the mechanic says "stays". Change: delete 'zone'; 'weather' only from the Map screen. Verify: botA's log on 'map moss'.

**12. The late help arrives in the first 90 s.** Where: `checkHints` 'shop' (3 essence), 'online' (3 critters), 'evolve' (15 essence). Now: all three fired in botC's first 90 s (essence 13 at 60 s, 7 critters at 60 s). The "help that leaves" at one seal has no time to be felt before it leaves. Change: thresholds by day, not by count: 'shop' on day 2, 'evolve' at 60 essence (the second evolve), 'online' at the second day's first load. Verify: botC's toast list.

**13. The hints the clock hides.** Where: `app.js` `lampState` (`dark = night || dusk` for the trail posts, `always`, `wave`), `camp` dark, `harborlamp`, `moored`. Now: the lantern road (station 5's only hint), the Reef's answering lamps (Coral's introduction) and the camps light only between 18:00 and 05:00 local. Change: the post ahead lit by day at `k` 0.5 (dim, but ahead of you), the Reef wave by day at 0.5; or give the Pass its own dusk (`THEMES['route-mf'].tod = 'dusk'`), like the cold has its own stillness. Verify: `lanternroadtest` with `window.__tod='day'`.

**14. Two empty screens on the way to the last fire.** Where: `route-fc-shelf` (0 objects, 0 people, 34 tiles) and `route-fc-landing` (0, 0, 37 tiles); `NETS` 'route-fc'. Now: the Glacier road's five screens hold their one sign of tending on one screen only. Change: a returned thing on the shelf and a kept lamp on the landing (`props` entries in the net). Verify: `wildtest` reachability plus a mapstats count of objects per route map >= 1.

**15. Blaze's fires against the clock.** Where: `BURN_S = 14`, woodpile (10,15), braziers (4,10), (11,8), (17,10): round trips 16, 22 and 24 tiles. Measured: 10.1 s on the shortest order with the first fire at 0.44 (6 s of margin) when the third is fed; a wrong order (fire1 first, fire3 last) leaves about 2 s. The margin is one hesitation; on a phone joystick the trial is a timing puzzle, which says "hurry", not "feed". Change: `BURN_S` 20, or the woodpile at (10,11) between the fires. Verify: botD's Blaze log; `gymtest2` real-walk variant.

**16. Glacia's wait is a blink.** Where: `STILL_S = 0.8`, pool rows 9 to 14. Measured: 6.6 s to cross six rows. The meaning is waiting kept cold; the pace is a stutter-step. Change: `STILL_S` 1.6 and the pool two rows deeper (`pool` [3, 7, 18, 14]). Verify: botD's Glacia log.

**17. Coral's call.** Where: `CORAL_SEQ`, `CALL_STEP = 0.7`, lamps 6 to 14 tiles apart. Calculated: 12.6 s of calls plus about 40 s of walking, the longest trial. Fine in proportion if it lands; the 9-s idle replay is the only mercy and it is not hinted. Change: on a wrong answer, replay at 1.0 s per step (slower the second time). Verify: `gymtest2` wrong-answer branch timing.

**18. The Watch in one sitting.** Where: `action.js:289` night length, `game.js:337` `towerAfter` (a loss clears `run`), `TOWER.runsPerDay 2`. Now: all twenty nights are 15.6 minutes of continuous duels; a loss on night 17 is night 1 tomorrow. The long watch is the right meaning, the reset says "beaten", not "kept". Change: a loss keeps the run at `floor` with HP at 30% (the night was not kept, the watch goes on), `best` unchanged. Verify: `nighttest` loss branch.

**19. The Highland Pass can be skipped.** Where: `GATES.frost 3` and `ROUTE_GATES['route-mf'] 3` open together; from Mossbrook the Gate is 14 tiles, from town the Peaks 33. Now: a player who returns to town goes north and never sees the arch, the lantern road or Edda. Change: under finding 3 the north gate opens at Wren's seal, after which the pass is the nearer road; or make the Peaks the road that opens second (`frost 6`), the pass first. Verify: a BFS over exits from Mossbrook with the gates as data.

**20. Knocked out among the same foes.** Where: `action.js:225` (`st.down = 4; st.calm = 4`), `:319` (recover at 50% in place), `:348` (re-chase within 5 tiles). Now: a bot that did not fight back took 13 knock-outs in 90 s on the town road. Change: on recovery, foes within 6 tiles go `idle` with `calmT` 6 s, or recover at the last path tile. Verify: botA2 'walk' mode with attacks disabled: KOs in 45 s <= 2.

### POLISH

**21. Two symbols for one lamp.** Where: `screen.html:15` (a lightning bolt before `{{energyText}}`), `shell.html:232` (the lamp with `#c-oil`), screenshot `s11-pouch0.png`. Change: the lamp in both.

**22. "Needs 1 rolls", and the day's light is never said spent in action mode.** Where: `game.js:371` (`'Needs ' + cost + ' rolls'`), `app.js:32` (the "day's light is spent" line, grass path only). Change: pluralise; show the line once from `actKeep`'s `why: 'rolls'` refusal.

**23. Fern's request is 37 tiles the wrong way.** Where: `app.js:541` Fern at (37,11) by the Lab, "Discover 5 different species and come back". A told goal at the far end of town. Change: none needed for pacing if findings 3 and 5 land; otherwise move Fern to the road at (9,13).

**24. The hall's "You kneel by the bed" / "It is in bloom" toasts pace the trial in words.** Where: `app.js:985-987`. Change: the kneel pose and the bloom are enough; keep only "The vines draw back."

**25. Screens are brisk, climbs are long.** 25 to 37 tiles a screen (7 to 10 s), the two climbs 149 and 157 tiles plus three level-18 duels each. Nothing to cut; note that the climb's posts lighting as you pass (`own`) is the only thing that keeps those 40 s from being a corridor, and by day they do not light (finding 13).

**26. The Arena's five days.** One rival a day, five steps: a fixed five-day road at level 6 regardless of play. Fits "a road of its own"; say so with the rail ("names") already there. No change.

## What I could not judge from here

Feel at 4 tiles/s on a joystick; whether a 3.8-s toast can be read while walking; the typewriter at 71 characters per second; carrying a log on a phone within 14 s; whether 30 to 60 s nights feel kept or endured; whether 2.5 s a stage reads as staying or as a loading bar; sound and music against any of these; and the real level of a human partner at Wren's door, which the handoff estimates and no bot has played (the partner levels only by kills, and a human fights slower than the bot). The days-to-gate numbers are a model from the XP table with stated assumptions, not a play log; Dan's three days (level 6, two seals, 2.5 h) sit near model B.
