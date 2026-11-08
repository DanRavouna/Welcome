# 09. Gameplay director: the player's thumb

Read in full: the brief, `docs/process.md`, reports 01 to 07. Checked in `src/world-rev/` every constant and function cited below. Re-ran `duelsim.py` tonight on the review build (day one, mid game, the Watch) plus a variant that lowers one trainer's level (`scratchpad/review-gameplay/duelsim_lv.py`, outputs `duel-*.txt` beside it). Nothing in the repository was changed except this file. "Feels" below means "the numbers and the code say it would feel"; section 5 lists what only the phone can decide.

## For the directors

1. Day one is a good first minute and a broken first hour: a critter two tiles from the door and a trial at two minutes, then 20 rolls gone in 5 to 15 minutes, a leader (Wren, Lv 11) a day-one party beats 30% of the time, an errand to Ivy, and a session of "Let it go".
2. The game is played where it is slow (trials, lamps, the night) and told where it is fast (eight toasts, a Power card, a level toast in ten minutes). The thumb learns from toasts, not from the grass, and never learns to stay.
3. The verbs are not only losing (tonight, stage 2 Lv 12: Wren mash 90% / verbs 85%, Glacia 55 / 20, Kiki 65 / 10, Blaze 20 / 0) but slow: every verb fight takes two to three times longer (Wren 21 s vs 58 s). The one number in the seven reports that is also a feeling.
4. 04 and 07 are the player's seat. 01 is right about the ending and wrong about the player three times (fast travel, the beams, the Watch before the lamp). 02 is right line by line and should go last. 03, 05, 06 are mostly data changes that cost nothing to play.
5. The reports contradict each other on the order of the end (01-F14, 04-W8, 07-F4), Maren (01-F4 vs 04-M4), the window (04-M8 vs 01-F13/02-F5), the +30 (02-F6 vs 01-F2/04-M3), potions (01-F7 vs 04-M5), the Arena (04-W7 vs 07-F26) and the title caption. Section 2 settles each.
6. Three findings would make the game worse even if truer: 01-F12 (no fast travel after the beacon), 04-W6 (every night runs to dawn), 01-F14 option a (the lamp behind the twentieth dawn).
7. The two changes that move the first three days most: the day's lamp (`KEEP_COST` 1/1/2/4, the dead sightings counter folded in) and the first fire (seal at the trial, Wren at Lv 6: measured 60 to 85% for a day-one party against 30 to 35% today).
8. Potions: no fifth button. A Potion in the bag is used for you when your lead drops under 30%; free from two seals; gone at four with three on Home's shelf each morning. The help that leaves is felt in a duel, not read in a line.
9. Keep-by-staying (04-M1) is the right verb and the riskiest change on a phone (07: 13 knock-outs in 90 s for a bot that did not fight). It needs the down critter to calm the others, and Dan's thumb before it ships.
10. The end: Ascent at four seals (the lamp is the last gate), Descent at three, the Watch opens at three and continues after the lamp as the keeper's nights.
11. The Watch's reset (`towerAfter`: loss sets `run = null`) makes a 15-minute progress loop a lottery for a Lv 14 party; keep the floor. The Arena stamps the day at the start, win or lose (`startTrainer` line 1177); stamp on the win.
12. Leave alone: the opening's layout, the four trial verbs, the quick slash's feel, the Arch hall, the night bar, fast travel, the beams (draw them over the tint), the free knock-out before the beacon, release paying essence (until re-simmed as one change), Coralbay's sea and the Descent's shape (true, not felt one screen at a time).

## 1. The loop

### Day one

**0:00 to 0:45.** The title: one window, touch it. Fern, two lines (8.5 s of typewriter). The partner card: "Power 267 / 277 / 278", "Strong vs". You pick the biggest number because that is what the card asks. You stand at Home's door, the window lit above you, a critter two tiles away. The best 45 seconds of the game, and nothing in it is a sentence except Fern.

**0:45 to 1:30.** Walk at it, tap. Three slashes, a burst, a glowing ball, a card: "Keep (1)" or "Let it go". 0.7 s later: "Put them in your party (Menu, then Party)". Then 'grass' ("Keep walking through it to find one", false: they roam). West to the lit gate; in the forest 'zone', 'weather', and a wild critter already chasing. Eight toasts in two minutes (07). The thumb is reading, not playing, exactly where Dan says players leave.

**1:30 to 15:00.** Fight, orb, card, keep. A new species pays 25 trainer XP (a keep 3, a win 10), so levels are kinds: Lv 3 in minutes and "Frost Peaks is now open!" by toast in the forest. The sparkling patch stirs 2.2 s if you stand in it; a Rare wakes, the one day-one moment that plays "the one who stays", and the card asks 4 of your 20 rolls for it. Twenty rolls are about ten keeps: the bot spent them in 90 s, a person in 5 to 15 minutes. After that every orb is a card to refuse ("Needs 1 rolls"). Essence from kills caps at 15 a day; trainer XP is frozen except wins and quests. You still fight because the critters chase you (07-F20), and your lead levels by kills, the one thing still moving.

**Mossbrook.** Wren's hall: press Tend, stay 2.5 s a stage, "You kneel by the bed", "It is in bloom", "The vines draw back". 27 s, the one place on day one where the thumb does the sentence. Then Wren: "Before you challenge me, prove yourself against Ivy." Back 22 tiles. Ivy Lv 4 stage 2: 60% for a sim party of three at Lv 4 (the real party is one starter and two Lv 1 commons, so worse). Then Wren Lv 11 stage 2: 30% at Lv 4, 35% at Lv 6 (tonight, mash; 0 to 20% with the verbs). The first fire is not kept on day one. The trial said staying is enough; the leader says come back when the number is bigger.

**The rest.** Mira: Potion 3 essence, "In battle"; no way to use it (`itemUsable` is called by nothing in `action.js`). Three daily quests; 58% of days one cannot progress ('roll', 'special'; 'see' never ticks in action mode). Dex, titles, "Let it go".

### Day three

Dan's own: level 6, two seals, 2.5 hours. Highland Pass (if found: 07-F19), the Arch's clues, Glacia's pool (stop 0.8 s, step, stop: 6.6 s across), her team Lv 5, Ember at 6, the Arena (Juno Lv 8, one fight a day, win or lose). Blaze Lv 15 stage 3: 20% at stage 2 Lv 12, a wall of days. The daily shape is set: rolls in the first quarter, then fights for critter XP, a quest, the rival, a leader you lose to. The flame is down by the first break and the session is three quarters refusal.

### The day the lamp is lit

Level 11 (model: day 7 to 25). The Ascent: 149 tiles, three Lv-18 trainers, posts that light as you pass (not by day). The Tower: three lamps, each a 2.4 s stay with no button, the gate opening: the thing learned at Wren's bed used again unasked. Then Maren, "Show me", a boss fight to the villain cue; then "Touch the glass", a button "Touch the great lamp", a tap, "+30 essence", the Mythic jingle, Wickling "joined you!" 1.8 s later. The beam goes out under the night tint, dimmer than a firefly (05-F7). The Forge (13), Coral (9+, 33%), the Watch and the Arena are still ahead. The lamp is the second of three dungeon finales, and the one that paid best.

### The day after

You load on a route. Nothing says the window is dark; by day it is, at night the generic glow lights it anyway (05-F1, 03-F1). If you walk home, the sill button reads "Examine": "You light the lamp in the window." The roof glows. The posts you pass stay lit for ever, so by the second week there is nothing to keep. The day is 20 rolls, three quests, one rival, two Watch starts; the lamp changed none of it.

### Played, told, and where the fun stops

Played: the first keep, the rare stir, the four trials, the chamber lamps, the dawn bar, the window by day. Told: the partner, the economy, the gates, the leader's second lock, the seal ("N of 4"), the last act (three times), the daily act ("Examine"), the Watch's rule. Everything that takes seconds is played; everything that shapes the session is told.

The fun stops: (1) when the rolls are gone and the critters keep chasing; (2) at Wren's wall and errand; (3) under the first two minutes of toasts; (4) at the late gates (Tide 5 to 16 days, the Ascent 7 to 25: not pacing, weather); (5) in any fight where slot 4 is pressed; (6) at night 17 of the Watch; (7) when the Arena says "One a day" after a loss.

Meaning costing fun: Coral's call (12.6 s of calls, 40 s of walking, in the dark, no sound between lamps) is the one trial a player fails without knowing why; the day's lamp read as scarcity makes the session a refusal where the metaphor wanted a flame going down with the evening. Fun costing meaning: the kill is a burst and an orb (the most satisfying input in the game, and it says "hunt"); mashing wins; the lamp pays like a jackpot; Power on the card. Section 3 keeps the slash and changes what happens at 0 HP; the other three go.

## 2. The reviews

### Right from the player's seat

04-M5 (dead potions) is the clearest bug in the set: pay, get nothing, on day one, in the help meant to be felt leaving. 04-M10: right and understated. 07-F1, F2, F9 (now measured), F3/F4, F5/F6/F11/F12: right and cheap. 04-M2 (seal at the trial) makes Wren's wall survivable before his level moves. 04-M7/M8, 05-F1/03-F1, 06-F1 and F2 (the fix that makes Coral fair), 01-F1/F2/F4, 03-F3/F13 (move a cell), 07-F20: all right.

### Would make the game worse, even if truer

- **01-F12** (travel only on roads lit end to end). The climbs are 149 and 157 tiles with three Lv-18 duels each; forced re-walks are what travel exists to stop.
- **01-F3** (beams only on the night you pass). The beam is the ending's only spectacle; 05-F7 (draw it over the tint) is the fix.
- **04-W6** (the night always runs to dawn). The bar lets the weak party last; the KO lets the strong one win. Removing the second makes twenty nights a fixed 15.6 minutes.
- **01-F14 option a** (the lamp from the twentieth dawn). Floor 20 is 83% tonight for stage 3 Lv 18 mash, far lower for Lv 14, with a reset on a loss: a lottery as the ending.
- **04-W11** (a knock-out after the beacon walks you home). Felt, and a 150-tile walk back. Phone decision, with travel, not for the first three days.
- **04-M6 and M9 together** (release pays nothing; evolution earned by days led). Coherent and probably right, and a LARGE economy change: release and level-ups are the essence after the kill cap, evolve the sink. Re-sim (`milesim.py`) as one change, later.
- **02-F19 to F39 before the mechanics.** Rewriting Wren's win line before deciding where the seal is granted writes it twice.

### Contradictions, by report and number, settled from the thumb

1. **The order of the end.** 01-F14 (lamp from the Watch, or the Watch after the lamp), 04-W8 (Watch at four seals unchanged), 07-F4 (swap 13/11, or ascent at four seals, Watch at three). Settled in 3.7: Ascent at four, Descent at three, Watch at three and continuing.
2. **Maren.** 01-F4 not fought; 04-M4 "stays a fight in the way"; 02-F1/F14 fought, reworded. Keep her as a fight that is not the key: `greatLampUse` checks the lamps first; her duel is offered, not required.
3. **The window.** 04-M8 a 2.4 s stay; 01-F13 and 02-F5 a button "Light the lamp". The stay: every lamp on the road is a stay; the label reads "Stay" in reach (as 04-W3/01-F31 want for beds and chamber lamps).
4. **The +30.** 02-F6 grant silently; 01-F2, 04-M3 none. None: thirty essence is two potions, and a silent grant still moves the counter the player watches.
5. **Potions.** 01-F7 shut the stall on alternate days or one free a day; 04-M5 an item slot or remove, free at two seals, gone at four. 3.3 takes 04's prices and neither's button.
6. **The Arena.** 04-W7 decide or remove; 07-F26 no change; 03-F26 move the door. Keep it (the mid-game's daily rival), fix the rule (3.10), add the rail marks.
7. **The title caption.** 01-F36 cut; 02-F29 fade at 5 s; 05-F11 show after 8 s. 05's: only the player who stalls gets a word.
8. **The Ivy errand.** 02-F13 keeps `needs` with a better line; 07-F9 and 04-W8 drop it. Drop it.
9. **Keep's sound.** 06-F23 assumes orbs stay; 04-M1 removes them. If 3.1 lands, the `keep` sound plays at the ring's fill.
10. **The day post.** 03-F14 0.35, 07-F13 0.5, 01-F10 "fainter", 05-F15 a halo on every post. Same direction; the phone picks the number.
11. **Glacia.** 04-W4 and 07-F16 both say `STILL_S` 1.6; but the blink is also a drawing (the plate appears in one frame). Draw the frost forming; try 1.2 before 1.6.
12. **The chip.** 04-M7 drops the number; 05-F27 keeps "20" and drops "/20". 05's: a number with no denominator is a flame with a size.

### Numbers mistaken for feelings

02's 20 / 19 / 61% buckets count strings, not what is read; a 3.8 s toast of 120 characters is not read in motion, so both the harm and the good are smaller than the counts. 06's tempo-as-mood is a table; nothing was heard. 03's "twenty boxes, one recipe" is a contact sheet; a player sees one box for ten seconds (the felt version is 07-F14's two empty screens). 07's days-to-gate is a model; the finding is that the late gates have no act in them. 04-M10's "verbs lose" comes from a bot that does not move; what survives the bot is the fight time, 2 to 3x longer in every row tonight. 07-F1's "90 s" is the bot's; a human's is 5 to 15 minutes, still the first quarter of a session. 01-F9 and 03/05-F1 on the window are right from code; neither can say whether one dark window of two is noticed from the road at night.

## 3. The mechanics that must change

Each: the rule, the number, the risk to balance and saves, the test. No field is dropped anywhere; every new field defaults; `critter-roll:v2`, `critter-roll:world`, `critter-roll:id` load unchanged.

**3.1 Keep as kill-then-loot (04-M1).** Rule: at 0 HP a wild critter is not removed: `mode: 'down'`, sitting where it fell, 8 s. While you or your follower are within 1.2 tiles a ring fills over 1.5 s (the `stir` drawing); at 1.0 the keep card opens (`actKeep`, same price). Walk away and it gets up and wanders. While it is down, wild critters within 5 tiles get `calmT` 2 s refreshed each frame you are in reach (Bloom's calm already exists), so the stay is possible on a phone. No `OFF` orbs for wild critters; the trainer path and the quick slash unchanged. Risk: 1.5 s per keep; grass slightly safer. Saves: `pouch` stays; seeds in it still open. Test: `acttest4.py` rewritten: a foe at 0 HP stays in `ACT.foes()` with `mode === 'down'`, keeps after 1.5 s in reach, leaves after 8 s; `openingtest.py` keeps its 60 s first-keep line. Phone before shipping.

**3.2 Verbs losing to mashing (04-M10).** Rule: (a) verbs get their own cooldown `st.vcd`; no verb sets `st.cd`; (b) `frozen`, `rooted`, `pull`, `daze`, `calmT` set `m.open = 1.5` and `strike()` multiplies by 1.5 while `m.open > 0`; (c) Frost's ring and Bloom's petals no longer block the quick slash (the stand is the stillness; the slash is the critter's). Target, two lines: `duelsim.py 2 12 40 wren glacia bram kiki`, smart within 10 points of mash AND smart fight time within 1.3x of mash. Risk: leaders easier for verb players; the mash baseline does not move. Saves: none. Test: the sim; `verbtest.py` adds `open`; `balancetest.py` pins `vcd`.

**3.3 The shop potions that cannot be used (04-M5, 01-F7).** Rule: no new button. In a duel, when the lead drops under 30% and the bag holds a Potion (Super first), it is used for you: HP up, a number, the item gone, no toast; Remedy clears burn/sap/weak the same way; Ward and Whetstone apply at duel start if held (`hero.ward`, `hero.boost` are already read by `Game.hit`). Mira's prices 0 from two seals ("Take what you need" becomes true); from four her stall is shut and Home's shelf holds three Potions each morning (`items.potion = max(current, 3)` on the day's first load). Risk: early duels easier (Wren and Glacia are walls); the sim bot carries no items, so the floor stands. Saves: `items` unchanged. Test: new `itemtest` line (a duel with one Potion, lead at 25%: `items.potion` one lower, HP higher); `scaffoldtest.py` asserts price 0 at two seals, the stall absent and `items.potion >= 3` at four. Alternative if Dan wants no automation: remove the five from shop and bag, refund held ones; weaker, because then the help never arrives.

**3.4 The day's lamp as a fuse (07-F1, 04-M7).** Rule: `KEEP_COST` Common 1, Uncommon 1, Rare 2, Mythic 4; a critter that woke in the rare patch (`woke`) keeps at 1 (04-W5); `actKeepCost` drops the sightings term (40 free sightings is a dead counter: 30 of 40 left after a full bot day); 20 rolls stay 20 so the flame still goes down in one session; the chip shows the lamp and "N"; the spent-day toast is "The grass rustles. The day's light is spent." once, from `actKeep`'s refusal; the Roll Ticket leaves the shop and `chestUse`, held tickets still work. After the rolls, the first 15 kills a day pay 1 trainer XP each (the essence cap already exists) so the second half of a session still moves the level. Risk: 15 to 18 keeps a day instead of 10, so species and levels come faster (good); release essence rises with keeps if release stays paid. Saves: `used`, `sight`, `items.ticket` stay. Test: `p18r.py` re-snapshotted after reading the diff; `hudcheck.py`; 07's `botC` with rolls > 0 at 10 minutes; `telltest.py` adds "refill at midnight|used up for today".

**3.5 Gates as species counts (07-F3, 04-W8, 04-M2).** Rule: (a) the seal is granted when the trial is done: move the `npc.seals` push and `justSealed` from `settleBattle` into `gymDone(id)`; the leader's duel stays for XP and essence; `gymOpen()` already reads seals. Drop `needs` on all four leaders. (b) Zones open by fires: Frost at one seal, Ember at two, Tide at three, the Watch at four; an opening gate lights its lamp by day (`gate-lamp` per gate) and says nothing; signs lose the level sentence. Saves made before this build keep `lvNow >= GATES[z]` as an OR, so nobody loses a zone. Then the leaders do the pacing the level gates did, so their teams must match the party a player has when the previous fire is kept: Wren Lv 6 (tonight: 60% for stage 1 Lv 4, 85% at Lv 6, mash; Lv 8 is still 35 / 55), Glacia Lv 5 as is, Blaze from 15 to about 11 (20% at stage 2 Lv 12 today), Coral from 14 to about 12 (3% in the handoff's run). Blaze and Coral are first guesses: sim them with the plausible party (stage 2 Lv 9 to 11 at Blaze; stage 2 to 3 Lv 12 at Coral). Risk: the biggest balance move in the list; the hidden tutor goes and a mis-set Blaze is a wall of days. Saves: `npc.seals`, `npc.cleared`, `adv.flags['gym:*']` unchanged. Test: `gymtest.py`/`gymtest2.py` (seal held before any duel), `ptest.py` ("seal after leader" adjusted), `walktest.py`, `openingtest.py`, a fresh save with one seal at Lv 1 enters Frost Peaks, `duelsim_lv.py` Wren at 6 >= 55% for stage 1 Lv 4, `balancetest.py` pins gates and leader levels.

**3.6 The quests that cannot progress (07-F2).** Rule: pool without 'roll' and 'special' (or 'special' fires from `stepVerb` when a verb lands, the only honest meaning left); `questTick('see', mapId)` from `spawnOne`'s first sighting of a species on a map today and from `kill`, so the city 'see' favour ticks. On load, if a quest's kind is no longer in the pool, regenerate with `salt + 1` (`newQuests` exists); done quests keep `done`. Risk: none. Saves: `quests` unchanged. Test: `questtest.py` over 60 days, no dead kind; `cityquesttest` 'see' ticks after one kill.

**3.7 The ending in the middle (07-F4, 01-F14, 04-W8).** Rule: `ROUTE_GATES.ascent` at four seals (the lamp is the last gate), `descent` at three (work before light), the Watch's door at three seals and continuing after the lamp as the keeper's nights (04-M12's lobby lines fit that), the Arena continuing; the Forge ends quietly (no +30, no `mythic`; Slagback stays, it is not the last act). `visited` includes `ascent` is an OR on the gate, so nobody loses the climb. Order: Wren, Glacia, Blaze, Forge, Coral, the Watch begins, the lamp. Risk: the Ascent's Lv-18 trainers meet a party that has beaten Coral, which is what they were tuned for; the Watch at three seals meets a weaker party on nights 1 to 5 (run the Lv 14 row). Saves: `lampLit`, `open.lamp`, `visited` unchanged. Test: `balancetest.py`; a road test that asserts the open exits per seal count; `lamptest.py` with four seals and no level.

**3.8 The trials' durations (04-W3/W4, 07-F15/F16/F17).** Wren: `BED_STAGE_S` 2.5 kept; the Tend press and the kneel and bloom toasts go (the bed starts after 0.6 s in reach, like the chamber lamps). Glacia: draw the frost forming across `stillT / STILL_S`, then `STILL_S` 1.2; 1.6 only if the phone says 1.2 still stutters. Blaze: `BURN_S` 18 and the woodpile at (10,11) between the fires, so the worst order has about 6 s of margin instead of 2 (07: 6 s best, 2 s worst at 14); feed, not hurry. Coral: `CALL_STEP` 0.7 kept; a wrong answer replays at 1.0 s a step; 06-F2's five pitches so the call is heard, which is what makes three rounds learnable. Lamps: `CL_S` 2.4 kept; the great lamp a 6 s stay (04-M4). Risk: none to balance; Blaze a little easier, as it should be. Saves: none. Test: `gymtest.py` (press becomes stay), `gymtest2.py` logs `APP.ice().length` against the clock (0 before 1.1 s, 8 at 1.3 s), 07's `botD` Blaze worst order >= 5 s margin, `gymtest2.py` with the sfx spy: five `lamp` entries in `CORAL_SEQ` order.

**3.9 The Watch's reset (07-F18).** Rule: in `towerAfter`, a loss keeps `run.floor`, sets the party's HP to 30% of max (the night was not kept; the watch goes on), `best` and `runsPerDay` unchanged; the night still ends at dawn or when all visitors are down (both ends stay). Risk: the top becomes reachable by persistence for a Lv 14 party instead of a per-run lottery (tonight floor 20 is 83% mash / 75% verbs at Lv 18 stage 3; the chain of twenty is about 0.75 a run, far less for a weaker party). Saves: `tower.run` unchanged. Test: `nighttest.py` loss branch (`run.floor` kept, `hp` at 30%); `duelsim.py 3 14 20 floor:15 floor:20`; `towersim.py` models the turn-based fallback and should not be cited.

**3.10 The Arena's rule (04-W7, 07-F26).** Rule: the day stamp moves from the start of the ladder fight (`startTrainer` line 1177) to the win (where `arena.step` rises in `settleBattle`), so a lost ladder fight can be retried today and a won one closes the day; the rail gains one mark per step (`objState names: { n: step }`); beaten rivals stand at the ring's edge during your duel (`placeRivals` while `ACT.dueling()`); Juno's "rule of the sand" line becomes a gesture (she sits by the fire). Meaning (04-W7's offer): being counted in front of others. Risk: none to the economy; five days to Kindlemane at best, unchanged. Saves: `arena.step`, `arena.day` stay; `day` now means "won", which can only open a door. Test: `arenatest.py`: loss then same-day retry allowed; win then a second ladder fight refused; rail count equals step.

## 4. The list

In the order that most improves the first three days. SMALL: an hour or data. MEDIUM: a session with a sim or a rewritten test. LARGE: a balance pass.

1. **Cut the first-minute toasts** (07-F5/F6/F11/F12, 04-W9, 02-F26, 05-F21): 'grass', 'party', 'zone', 'battle', 'keep' deleted; 'weather' only from the Map; 'shop' and 'evolve' by day; the partner card without Power or the triangle (07-F10, 01-F23). SMALL. Verify: `openingtest.py` asserts no toast in the first 20 s.
2. **The day's lamp** (3.4). SMALL. Verify: `p18r.py`, `hudcheck.py`, `botC`.
3. **The first fire on day one** (3.5a, Wren at Lv 6, `needs` dropped). SMALL in code, MEDIUM with the sim. Verify: `gymtest.py`, `duelsim_lv.py`.
4. **Dead quests** (3.6). SMALL. Verify: `questtest.py`.
5. **Potions that work and leave** (3.3). MEDIUM. Verify: `itemtest`, `scaffoldtest.py`.
6. **The halls' music and the one `light` sound** (06-F1, F8, F2, F9): `gym-*` aliases; `light` at the title, the lamps, the window, the rite; Coral's pitches; the title's silence held. SMALL, data. Verify: `musictest` in `gym-coral`; `openingtest` with the sfx spy.
7. **Home's window at night and inside** (05-F1, 05-F2, 03-F1, 05-F16): skip Home in the night pass; the sill lamp agrees with the road; the gate lamp after the beacon follows the window. SMALL. Verify: 05-F1's pixel check in `keeptest.py`.
8. **The verbs** (3.2). MEDIUM. Verify: `duelsim.py`, two lines.
9. **Knocked out among the same foes** (07-F20): on recovery, foes within 6 tiles idle 6 s. SMALL. Verify: `botA2` walk mode, KOs in 45 s <= 2.
10. **The hint on the way** (03-F3, F13, F16, F9): the zone's and city's things beside the road, the arch in the arrival view, Fern on the path during her lines. SMALL (cells). Verify: `zonespottest.py` BFS <= 3; `openingtest.py` Fern in view.
11. **The lantern road by day** (03-F14, 07-F13, 05-F15): the post ahead at 0.35 to 0.5 by day; `step` 5; a faint halo on every post at dusk. SMALL. Verify: `lanternroadtest.py` with `__tod='day'`.
12. **Keep by staying** (3.1). MEDIUM, and the phone before it ships. Verify: `acttest4.py` rewritten; `openingtest.py` unchanged.
13. **The trials' numbers and drawings** (3.8). SMALL each. Verify: the real-time logs named there.
14. **Gates by fires with the leaders retuned** (3.5b). LARGE. Verify: `balancetest.py`, per-leader sims with the plausible party, `walktest.py`, the fresh-save check.
15. **The last act unasked and unpaid** (01-F1/F2/F4, 04-M3/M4, 02-F1/F6/F22, 06-F3, 05-F7): Maren's after-line gone and her fight optional; no `???` Dex rows before found; no +30, no `mythic`; the lamp a 6 s stay; silence, then `light`, then the lit tower theme; Wickling the first evening the window is lit; the beam over the tint. MEDIUM. Verify: `lamptest.py` rewritten (the stay timed over real time; no "wake it|touch the glass"; essence unchanged); `wicktest.py` moved to the window.
16. **The order of the end** (3.7). SMALL in code, LARGE in balance. Verify: the road test and a Lv 14 Watch row.
17. **The window as the daily act** (04-M8, 01-F13): lit by staying; today's window lights the `own:` posts; a wild critter waits by the door on a lit day. MEDIUM. Verify: `keeptest.py` rewritten.
18. **The Watch's reset and the Arena's rule** (3.9, 3.10). SMALL each. Verify: `nighttest.py`, `arenatest.py`.
19. **The Watch's lobby and sound** (04-M12, 06-F5, 06-F24, 03-F19 for the room): rules out of the Keeper's mouth, the knock, the `night` track, dawn's notes, the longer room. SMALL to MEDIUM. Verify: `nighttest.py`, `acttest5` with the spy.
20. **The words pass** (02 entire, 01-F18 to F24, 04-W12/W13, 03-F6/F7/F8): after the mechanics, in one batch, `telltest.py` widened first (02-F34). MEDIUM. Verify: the widened test fails today and passes after.
21. **Frost and Stone wild behaviour** (04-M11), still braziers (05-F3), the Forge's fires (05-F4), the HUD (05-F9), the podium (05-F23), visible dusk and dawn (05-F6), interiors at night (05-F25). SMALL to MEDIUM each, phone-judged. Verify: 05's pixel samples; `@ui`.
22. **Layout rebuilds** (03-F2, F5, F12, F22). LARGE. After everything above; met one screen at a time.

## 5. What to leave alone, and what only a phone can decide

### Leave alone

- The opening's layout: the title window, the door, the grass, the lit gate, the critter by the door (04-P6 names them; so do I).
- The four trial verbs and the chamber lamps; numbers may move, the acts are right.
- The quick slash's instant feel; 3.1 changes 0 HP, not the input.
- The night with a dawn bar and the KO ending both alive (reject 04-W6).
- Fast travel (reject 01-F12). The beams (reject 01-F3; do 05-F7).
- The free knock-out before the beacon (04-W11 only after, only with travel, only if the phone says so).
- Release paying essence and evolution costing it (04-M6/M9) until re-simmed as one change on top of 3.4.
- The Arena on the map and its five-day ladder (reject 04-W7's removal; do 3.10).
- 03's keep list (the Arch hall, the Ascent's posts, Frosthold's avenue, Cinderport's workbench) and 06's.
- Coralbay's sea, the Descent's mirror, the route recipes, the city plans: true, not felt in three days (item 22).
- "Gym" to "Garden/Pool/Hearth/Lamp Hall" (02-F32): fine, a word; rides with item 20.

### Only a phone can decide

- Every stay: `STILL_S` 0.8 / 1.2 / 1.6, `BED_STAGE_S` 2.5, `CL_S` 2.4, the great lamp at 6 s, the keep-by-staying 1.5 s mid-fight; staying or a loading bar.
- `BURN_S` 14 or 18 with a joystick and a log in hand.
- Whether 3.8 s toasts and the typewriter are read while walking; whether Fern is read.
- Whether a dim post ahead by day is noticed; whether one dark window of two is noticed from the road at night.
- Whether a moving person wins with the verbs today, or feels the slowness the bot measures (the sim is a floor).
- Whether 30 to 60 s nights feel kept or endured; whether 83% at night 20 is fair or a coin.
- Whether Coral's five pitches are learnable in three rounds by ear.
- 4 tiles/s on a joystick; the 150-tile climbs; 44 px targets; the HUD's pixel language at arm's length.
- All of sound, all of tempo, and whether the hints are noticed before their acts: the one thing no bot reports.
