# 04. The mechanics: what the player does, and whether each act carries its meaning

Review of `src/world-rev/` (action.js, base.js, game.js, data.js, app.js, the trial and tower parts of adventure.js and world.js), the sims (`duelsim.py` re-run tonight, `towersim.py` read) and the tests named below. Review only; nothing in the repository was changed. The sim output is kept at `/tmp/claude-0/-home-user-critter-roll/6af82fb3-3ee1-591e-8772-c856b5d98361/scratchpad/review-mechanics/duelsim-leaders.txt`.

## For the directors

1. The loop's verb, Keep, is built as kill then loot: a wild critter is struck to 0 HP, bursts into particles (`kill()` in action.js), drops an orb, and the Keep button on the pouch card buys it back for rolls. Nothing in that chain is "being kept".
2. The four seals are still trophies: each trial only opens a gate; the seal is handed by `settleBattle()` when the leader's last critter is down, under a duel box that reads "2 of 3 down".
3. The last act is asked three times (Maren: "Go and wake it", "Touch the glass"; the action button: "Touch the great lamp"), paid (+30 essence toast) and rewarded with a secret critter. It is also a tap, where every lamp below it is kept by staying.
4. The help that leaves is a bug, not a feeling: Potion, Super Potion, Remedy, Ward and Whetstone are sold and shown "In battle", and there is no code path to use any of them in the live duels that replaced the battle screen. Mira says "Take what you need" at two seals and keeps charging.
5. Playing a type's verb loses. Tonight's `duelsim.py` (stage 2, Lv 12, 12 fights each): Wren 100% mash vs 42% verbs, Glacia 83 vs 25, Blaze 33 vs 8, Coral 0 vs 0. The game asks for the metaphor and punishes it with the shared cooldown.
6. The day's lamp is drawn as oil, and next to it a counter "17/20", an aria "17 of 20 rolls left today", a toast that explains the refill in brackets, a Roll Ticket that buys light back, and a tip that recites the price table.
7. Letting go is paid (Release +1 to +12 essence), asked for by a daily quest ("Release a critter"), and recommended by Dax; evolution is bought (-15, -60). Growth and parting are both shop transactions in a game whose growth is "someone stayed".
8. After the beacon the daily act is one button in one room (Examine the window, a told line) and nothing in the world depends on it; the kept road posts light once and never need keeping again. From day two, being the keeper costs nothing and changes nothing.
9. Frost and Stone wild critters do the opposite of their places (Frost kites and shoots from 3.8 tiles; Stone chases and slams), while the player's Frost and Stone verbs are stillness and a wall.
10. The Arena has play and no stated meaning; its rule is told by Juno ("One a day. That is the rule of the sand."); the rail of names never changes; nobody watches. Decide what it means or leave it off the road.

## 1. What the mechanics mean now

The game's one verb is "keep a light", and five acts really play it: stand still in Glacia's hall and ice forms under you; stay by a seedling in Wren's hall and it grows; carry logs to three fires that go out when you stop; stand beside a chamber lamp until it takes; last a night in the Watch's lobby until the dawn bar fills. The rare grass stirs for the one who stays, the first critter waits by your door, Deep Freeze and Root Bind ask you to stand and stay in a fight. Those are mechanic-borne metaphors and they agree with each other. The mechanics the player touches most still say something else: keeping is killing and buying, the seal is a knockout count, growth and letting go are priced in essence, the day is a counter, the ending is prompted, paid and rewarded. The daily loop after the beacon, which the sentence makes the whole point, is one Examine press with no consequence. The support that should be felt leaving partly leaves as words and partly as dead buttons. The eight type verbs are the best new thinking in the combat and, by the game's own sim, the worst thing a player can press.

## 2. Findings

Severity: BUG OF MEANING (says something else or nothing), WEAK (hinted only, or told), POLISH.

### Bugs of meaning

**M1. Keep is kill-and-loot.**
Where: `action.js` `kill()` (particles, `E.splice`, orb into `OFF`), `game.js` `actWorthy` / `actPouchAdd` / `actKeep`, the pouch card in `Game.renderVals` (`encounterNote`: "Dropped by a defeated wild critter (it joins at level 1)... It stays in your pouch until you decide."), `screen.html` line 113 ("Keep it, or let it go back into the grass.").
Now: a wild critter is struck to 0 HP, disappears, drops a glowing ball you walk over; later, in a card, you pay 1 to 8 rolls and it "joins". "Let it go" on that card drops a seed from a list; nothing goes back into any grass.
Needs: what you keep comes home with you because you stayed with it; the same verb as Wren's bed and the chamber lamps.
Change: at 0 HP a wild critter is not removed: it sits down where it is (`mode: 'down'`, drawn still, no attack) for 8 s. While your critter or you stand within 1.2 tiles a ring fills over 1.5 s (reuse `stir` drawing); when it fills the critter is kept (the existing `actKeep`, same roll price, same card afterwards for the stats). Walk away and it gets up and wanders off into the grass (`mode: 'idle'`, then despawn at the map edge). Remove `OFF` orbs and the pouch for wild critters (keep the pouch only as the list of critters kept today). The card's "Let it go back into the grass" becomes true.
Verify: rewrite `acttest4.py` (today it asserts the orb and the pouch); new check: a critter at 0 HP is still in `ACT.foes()` with `mode==='down'`, is kept after 1.5 s within reach, leaves after 8 s otherwise; `openingtest.py` keeps measuring the seconds to the first keep.
Severity: BUG OF MEANING.

**M2. The seal is still a knockout count.**
Where: `game.js` `settleBattle()` (`if (tr.leader && seals.indexOf(tr.id) === -1) npc.seals.push`), `app.js` `gymDone()` (only sets `gym:<id>` and opens the gate), the duel box in `app.js` line 1448 (`defeated + ' of ' + total + ' down'`), `duelDone()` ("You now hold N of 4 Leader Seals.").
Now: the trial (stay, stand still, feed, answer) opens the gate; the seal is given when the leader's last critter is down. The handoff says "the four seals are four fires you are trusted to tend (not trophies)"; the mechanic that grants them is a body count under a counter.
Needs: the fire you tended is the seal; the leader's words after it are letting go.
Change: grant the seal in `gymDone(id)` (move the `npc.seals` push and `justSealed` there; `settleBattle` keeps the essence and XP). The leader stays a duel for XP and essence (first win 20/25/30/35 as now) but the duel box for a leader shows the fire you lit (the brazier/bed/pool/lamps state), not "n of m down". Old saves: `gymOpen()` already treats a held seal as a done trial, so nothing breaks.
Verify: `gymtest.py` / `gymtest2.py`: after the fourth bed blooms, `state.npc.seals` contains `wren` before any duel; `balancetest.py` keeps its seal-wording checks; `ptest.py` adjusts the "seal after leader" expectation.
Severity: BUG OF MEANING.

**M3. The last act is asked, paid and rewarded.**
Where: `app.js` `npcList()` Maren (`winLine: 'The light knows you. Go and wake it.'`, `afterLines: ['The lamp is yours to wake. Touch the glass.']`), `setNear()` label `greatlamp: 'Touch the great lamp'`, `greatLampUse()` (`toast('The beacon is lit! +30 essence.')`, `grantSecret(SECRET2_SEED)` 1.8 s later), `journal()` ("You have every clue. The arch in Highland Pass should answer now."), Olaf and Finn lines pointing at the Tower.
Now: the player is told to touch the glass by the Warden twice and by the button, then paid 30 essence and given Wickling. The process says the last act must be done unasked.
Needs: nothing tells; the road has made them want to; no price tag on the moment.
Change: Maren's `winLine` becomes her LETGO line ("I used to stand here all night. I think I will sit down.") and she sits (move her to the bench spot); delete `afterLines`; the great lamp has no action label and no Examine (it is `inert`); remove the +30 essence and its toast (essence 0; the Lamplighter title stays); Wickling comes later, unasked, the first time the player lights the window at Home (see M8). Keep the dialog about the beam, it is the consequence, not the instruction.
Verify: `lamptest.py` (today checks the touch and the reward) is rewritten to check that no NPC line on `dg-lamp` contains "wake it", "touch", "the glass"; `telltest.py` adds `(go and )?wake it|touch the (glass|lamp)` to its TELL regex.
Severity: BUG OF MEANING.

**M4. The great lamp is lit by a tap, the three below it by staying.**
Where: `app.js` `chamberlampState()` (`CL_S` 2.4 s, `near && !WORLD.moving()`, fades at 0.8/s) versus `greatLampUse()` (a button press and a dialog).
Now: the player learns in three chambers that a lamp takes while you stay beside it; the one that matters is pressed.
Needs: the same verb, longer: the great lamp takes because you stayed.
Change: make `greatlamp` a `chamberlamp` with `id: 'GL'`, reach 1.9, `CL_S` 6 s (not 2.4: the longest stay of the game), lit only when `L1..L3` are kept (`lampKept` check inside `chamberlampState` for `GL`); when `k >= 1` run the beam dialog and set `lampLit`. The Warden fight stays a fight in the way, but the lamp itself is kept, not touched.
Verify: `lamptest.py` times the stay over real time like `gymtest.py` does for the bed (log `APP.lampLevels().GL` against the clock, at least 5.5 s to 1.0; a step at 3 s makes it fall).
Severity: BUG OF MEANING.

**M5. The withdrawn help is a dead button.**
Where: `app.js` `ITEMS` (potion, super, herb, ward, whet: "Uses your turn"), `renderBag()` shows "In battle" for them, `renderShop()` sells them, `checkHints()` `hint('shop', 'Mira near your home sells potions and charms for essence.')`; `game.js` `itemUsable()` exists but nothing calls it from `action.js` (no item path in the live duel: grep `potion|itemUsable|boost` in action.js finds nothing), and the battle screen that used them is unreachable (`__noFollower` is a test hook only).
Now: a player buys a Potion for 3 essence and can never use it. Mira's potions were meant to be the help that is withdrawn as you grow; they are withdrawn on day one by accident, which is the guard rail broken: "withdrawn support must be felt, not look like a bug".
Needs: help that works while you are kept, and leaves visibly.
Change: either (a) an item slot on the wheel (slot 5: the bag's first healing item; `hero.hp` += 40% / full / cure, `hero.ward`, `hero.boost` are already read by `Game.hit`), or (b) remove the five battle items from the shop and bag and keep charm, ticket (see M7), lure. Whichever: Mira's SCAFFOLD line at two seals ("Take what you need.") must be true: set her prices to 0 from two seals, and at four seals the stall is gone (she sits on the step; the shelf at Home holds three potions, refilled daily, which is "a shelf kept full").
Verify: `itemtest.py` today tests the turn-based path; a new check buys a Potion and uses it in a duel (hero HP rises) or asserts the item is no longer sold; `scaffoldtest.py` asserts `ITEMS[x].price === 0` when `sealCount() >= 2`.
Severity: BUG OF MEANING.

**M6. Letting go is paid, asked for daily, and recommended.**
Where: `base.js` `renderVals` (`releaseGain = rel[c.rarity] * entry.stage`, label `'Release (+' + releaseGain + ')'`), `questDefs()` `release: { text: 'Release a critter', ess: 2 }`, `makeQuests` pool; `app.js` Dax `progress: 'Release extra critters to earn essence.'`.
Now: the game pays you to abandon what you kept and sets it as a daily chore. The handoff claims "letting go costs nothing"; in the code it earns.
Needs: what you keep comes home with you; letting go is return (Tide's meaning), not a sale.
Change: `releaseGain = 0`; remove `release` from the quest pool; Dax's line becomes "Show me one at stage 2 or higher." A released critter's seed goes to `state.returned` (new field, default `[]`); `H.foe()` on its home zone draws from `returned` first (one in three spawns) so a critter you let go can be met again on its own shore; fishing (W10) draws from `returned` too. Old saves load (`returned` defaults).
Verify: `questtest.py` asserts no `release` quest is ever generated (run `makeQuests` for 60 days); `dextest.py` asserts the Release button adds no essence; new check in `fishtest.py` that a released seed can be met.
Severity: BUG OF MEANING.

**M7. The day's lamp is also a counter, and the spent day is explained in brackets.**
Where: `app.js` `paint()` (`$('c-rolls').textContent = en.left + '/20'`, `#c-oil` height), aria "17 of 20 rolls left today", `encounter()` toast: "The grass rustles. The day's light is spent; tomorrow brings more. (Your free sightings and rolls are used up for today. Both refill at midnight." (the bracket never closes), `hint('keep', 'Seeing critters is free (40 per day). Keeping one costs rolls: 1 for Common, 2 Uncommon, 4 Rare, 8 Mythic.')`, `ITEMS.ticket` ("Gives back 1 roll today. Up to 3 per day.") and `useItem('ticket')`.
Now: the lamp is a hint (the oil goes down) stapled to a counter and three sentences of rules; a Roll Ticket buys the day's light back for 5 essence, which says a day does not hold what it holds.
Needs: a day holds what it holds; the lamp is the day.
Change: drop the number from the chip (keep the aria for screen readers, phrased "the day's lamp is a third down"); the Keep button already prices the keep, so delete the `keep` hint; the spent-day toast keeps only "The grass rustles. The day's light is spent."; remove the Roll Ticket from the shop and from the chest rewards (`chestUse`), leaving tickets already in bags usable until gone. If a top-up must exist, make it the window at Home: lighting it (station 13) is what gives the day's 20, so the keeper's act and the day's light are one thing (see M8).
Verify: `hudcheck.py` (chip width without the number), `p18r.py` (sightings and keep costs unchanged), `telltest.py` with "refill at midnight|used up for today" added to TELL.
Severity: BUG OF MEANING.

**M8. After the beacon, keeping is one button and nothing depends on it.**
Where: `app.js` `objectUse()` for `windowlamp` (an Examine press, then `showDialog('The window', ['You light the lamp in the window. It faces the road.'])`), `homeLitNow()`, `lampState()` (`own:` posts: once `flags['own:<id>']` is set a post stays lit for ever), `world.js` line 1221 (the only consumer of `homeLit`: a glow on the roof).
Now: the daily act is a button in the bedroom, confirmed by a sentence that tells; it changes a pixel glow and nothing else; the road posts you "keep" are kept once and never again. By the second week every post is lit and the keeper has nothing to keep.
Needs: being the keeper is a small daily act with a consequence felt by the world and by the player.
Change: (1) the window lights by staying beside it (same `chamberlampState` rule, 2.4 s), no dialog; (2) `homeLit` for today is what lights the `own:` posts: a post you have passed draws lit only while the window is lit today (`lampState`: `want = flags[key] && homeLitNow() ? 1 : 0`); on a day you did not light the window the roads you keep are dark and you see it from the first route; (3) the window lit today is what refills the day's lamp (M7): until it is lit, `energy().left` is yesterday's remainder (cap at 20, never below 5 so nobody is locked out); (4) Wickling arrives the first evening the window is lit after the beacon (replacing the reward in M3). Mom's LETGO line already fits.
Verify: `keeptest.py` (today asserts the Examine label and the told line) rewritten to time the stay and to assert that `own:` posts are dark on a day without `homeLit`; `lanternroadtest.py` adds the day-after case.
Severity: BUG OF MEANING.

**M9. Growth is bought.**
Where: `base.js` `renderVals` (`evolveCost = stage === 1 ? 15 : 60`, label `'Evolve (−' + evolveCost + ')'`), `checkHints()` `hint('evolve', 'You have enough essence to evolve a critter. Open it in the Dex.')`, badges `growth` / `apex`.
Now: a critter changes shape when you pay essence in a menu. Levels are earned by fighting beside you (`actKill` XP), which is right; the visible growth is a purchase.
Needs: "you grew because someone stayed with you" (Wren) must be true of your own critters.
Change: evolution is earned by walking with you: stage 2 when the critter has been the lead for 3 different days and is Lv 6 or more, stage 3 at 6 days and Lv 12 (add `days: []` per caught entry, pushed in `mkHero()` once a day; old saves default to today). The Dex button becomes "Grown" when due (a press to see it change, no essence); essence keeps its other uses (shop, titles pay it). Numbers are a first guess; the point is that staying, not paying, is the rule.
Verify: `evotest.py` adds the day counter; `dextest.py` asserts no essence is deducted; `milesim.py` re-run for title pacing.
Severity: BUG OF MEANING.

**M10. Playing the verb loses.**
Where: `action.js` (every verb sets `st.cd` on the one shared cooldown: Tide 2.0, Moss 2.0, Volt 1.4, Dusk 2.5 after the veil, Stone 3.0, Bloom 3.5, Frost 1.2 to 1.5, Ember 0.8 to 1.6), `duelsim.py` smart bot, re-run tonight at stage 2 Lv 12, 12 fights each: Wren mash 100% / verbs 42%, Glacia 83 / 25, Blaze 33 / 8, Coral 0 / 0 (the handoff's Nov 7 run with 40 fights agrees: wren 98 / 75, glacia 50 / 8, blaze 23 / 0).
Now: the verbs are the metaphors (stillness, feeding, return, tending, wind, dark, wall, giving) and each costs the player the quick slashes it displaces. The handoff reads this as a limit of the bot; it is also a rule: a verb that controls an enemy earns nothing because a controlled enemy is still only hurt by the quick slash. The cost punishes the act the game asks for.
Needs: a verb at its moment is at least as good as mashing; a human who uses one to avoid a hit should also be rewarded for having stayed, pulled, rooted.
Change: (1) give the verbs their own cooldown (`st.vcd`), so the quick slash is never taken away by playing the metaphor; (2) a held enemy takes more: `frozen`, `rooted`, `calmT`, `pull`, `daze` set `m.open = 1.5` (seconds) and `strike()` multiplies power by 1.5 while `m.open > 0` ("Open!" instead of "Strong!"); (3) keep DUEL_* as they are and re-run `duelsim.py` for both bots until the verb bot is within 10 points of mash against the route trainers and ahead against the long nights. A person moves; the sim is the floor.
Verify: `duelsim.py 2 12 40 wren glacia bram kiki` after the change (smart >= mash - 10); `verbtest.py` adds the `open` multiplier check; `balancetest.py` pins the new cooldown constants.
Severity: BUG OF MEANING (a number contradicting the meaning).

**M11. Frost and Stone wild critters play the opposite of their places.**
Where: `action.js` `BEH`: `Frost: { atk: 'shoot', spd: 44, keep: 3.8, ps: 150 }` ("fast ice shards from far away"), `Stone: { atk: 'aoe', spd: 30, rad: 1.9 }` and the chase in `think()`.
Now: the cold is stillness everywhere else (wind 0, straight snow, Glacia's pool, Deep Freeze); a wild Frost critter kites and shoots. Stone's verb is a wall that stays; a wild Stone critter walks at you and slams.
Needs: every element of a place conveys the same intent; the critters of a place behave like the place.
Change: Frost `BEH`: `spd: 0` while the player is more than 2 tiles away (it does not come to you; you go to it), `atk: 'aoe'` with `rad: 1.6` that leaves the ring frozen (`frozen` tiles the player cannot cross for 2 s): you wait for the cold to pass, then step in. Stone `BEH`: `spd: 12`, never chases past 3 tiles from `hx, hy` (it keeps its ground), `tele: 1.0`, and it takes 50% less knockback. Tide keeps its distance already (the sea), fine; Volt's hit-and-run is the wind; Dusk blinks; Bloom heals; Ember charges; Moss rings. Only these two disagree.
Verify: `acttest3.py` (enemy variety) updated: a Frost foe's position does not change while the hero stands 4 tiles away for 3 s; a Stone foe never leaves a 3-tile radius of its home.
Severity: BUG OF MEANING.

**M12. The Watch's weather is told as percentages, and the Watch is a high score.**
Where: `data.js` `TWISTS[*].about` ("Little rest between nights this week (15% instead of 30%), and a new longest watch is worth 50% more essence."), `app.js` `towerLobby()` intro ("Your party answers every night in a row. HP carries over between nights. Essence is paid only for nights past your longest watch." and "Watches left today: 2"), `towerAfterClose()` ("Longest watch: N nights of 20"), `TITLES` `summit` / `climber`, `TOWER.runsPerDay`.
Now: the night is kept by lasting it (good, built), framed by a lobby speech of rules and numbers and an essence ladder paid only above `best`. The `in-tower` room already has the right object: a logbook, "one line a night. The last line is from last night."
Needs: the long watch is a thing you do, not a record you beat; the week's weather is seen, not stated.
Change: the Keeper says one observational line per twist ("The wind is on the door tonight." / "Cold one. The blanket is thin." / "A mild week. The lamps hardly flicker." / "They are all of a kind this week."), numbers out; the weekly rule shows as weather in the room (`WEATHER` snow or storm drawn past the door, the storm type's colour on the wall lamps); the logbook object shows your nights (`objectUse`: "Your name, N nights. Last night's line is yours."); the lobby intro loses the two rule sentences and the counter ("Two watches in a day is enough for anyone." when none are left). Essence stays as is; it is not shown as "for a longest watch".
Verify: `towertest.py` / `twisttest.py` assert no `%` in any Keeper line; `telltest.py` adds "carries over|paid only" to TELL.
Severity: BUG OF MEANING.

**M13. The Lamp Tower tells its own rule on a tablet, and its gates speak of levers that no longer exist.**
Where: `adventure.js` `lampTower()`: `tab1` "Carved in the stone: 'The way up is lit by the one who climbs it.'", gates `text: 'An iron gate. Somewhere a lever works it.'`; the handoff header above `applyLamp` in app.js still says "levers flip gates".
Now: a plaque states the station's meaning in one sentence before the first lamp; the gate text is stale from the lever version.
Needs: no text explains the meaning; the gate says what it is.
Change: remove `tab1` (the two torches by the door, "Someone lit it for whoever comes", are the hint and are enough); gate text "An iron gate. Cold." which goes to "An iron gate. Warm." once its lamp is kept (`objState` gives `kept`).
Verify: `lamptest.py` asserts no object on `dg-lamp` contains "lever" or "lit by the one who".
Severity: BUG OF MEANING (small, and a stale text).

### Weak

**W1. A starter's verb is played hours before its hint.**
Where: `action.js` `VERBS`, `verbOf()` (slot 4 is the type's verb from the first fight); starters are Ember, Tide, Moss (`Game.starters()`); the hints are Blaze's logs (level 6), the returned things on Tide Shore (level 9), the sprouts and Wren's bed (level 1).
Now: a Tide starter has Undertow in the first minute; "what comes back" is met on the shore at level 9. The rule says the hint comes first in any order.
Change: slot 4 is the old status special until the type's habitat has been visited (`state.visited` includes `HABITAT[type]`'s map id, or the city gym is done); on the first visit the wheel slot wakes with the verb's name (a toast-free change: the slot label changes, `buzz([12])`). The verb then belongs to the place that taught it.
Verify: `verbtest.py` adds "slot 4 is `status` before `visited` has `moss`, `moss` verb after".
Severity: WEAK (NO INTRO for three of eight, in the first minute).

**W2. The heavy blow is fed like Ember's flame, so feeding is nobody's.**
Where: `action.js` `chargeStart/End` (`verb.kind === 'heavy'` uses the same hold as `'ember'`), handoff "The heavy blow, every type: fed, not rolled."
Now: every type holds to feed; Ember's Scorch is the same gesture with a cone. Ember's metaphor is diluted on the first fight of any type.
Change: the heavy is a committed wind-up, not a feed: a tap starts 0.5 s during which the critter plants itself (cannot move, `GH` afterimage stops), then it lands at 2x and never misses; no hold. "Fed" stays Ember's word alone.
Verify: `verbtest.py`: the heavy's charge is gone (`ACT.verb()` never returns `kind: 'heavy'`), the blow lands 0.5 s after the tap at 2x.
Severity: WEAK.

**W3. Wren's trial needs a Tend button.**
Where: `app.js` `gbedUse()` (`tending = o.id; toast('You kneel by the bed.')`), `setNear` label `gbed: 'Tend'`, `BED_STAGE_S` 2.5 s, `BED_REACH` 1.9.
Now: the act is staying, but it starts with a press and three toasts ("You kneel by the bed.", "It is in bloom.", "The vines draw back." said twice). The chamber lamps, built later, got it right: no button.
Change: `bedState()` starts growth when the player has been within `BED_REACH` for 0.6 s without moving (`!WORLD.moving()`), like `chamberlampState`; remove the `Tend` label (the bed is `inert`); drop the "kneel" toast; keep the vines drawing back as the only announcement. 2.5 s a stage feels short on paper (10 s per bed, 20 s for four is right in total); leave the number to Dan.
Verify: `gymtest.py` already times the growth over real time; change its press to a stay.
Severity: WEAK.

**W4. Glacia's stillness is a pause, and the ice appears rather than forms.**
Where: `app.js` `STILL_S = 0.8`, the 3x3 plate set in one `setTiles` call.
Now: stop 0.8 s, step, stop 0.8 s: a rhythm, not a wait. Nothing is seen forming during the 0.8 s.
Change: `STILL_S` 1.6 s, and the plate grows outward while you keep standing (a second ring at 3.5 s), so waiting longer buys a longer walk: what is kept by being kept cold, rewarded with reach. Draw the forming as a frost edge on the water cells at `stillT / STILL_S` (`objState` for a `~` cell near the player).
Verify: `gymtest2.py` logs `APP.ice().length` against the clock: 0 before 1.5 s, 8 at 1.7 s, 16 or more at 3.7 s.
Severity: WEAK (a number that makes the act too short to be staying).

**W5. The rare thing that comes to the one who stays is then priced highest.**
Where: `action.js` stir (`rare: true, woke: true`), `data.js` `KEEP_COST` (Rare 4, Mythic 8), `game.js` `actKeepCost`.
Now: the player stays 2.2 s, the grass answers with a Rare, and keeping it costs four to eight of the day's twenty. The act of staying is followed by the game's steepest price.
Change: a critter that woke for you (`woke`) keeps at the Common price (carry `woke` on the orb / the sitting critter into `actKeepCost(k, woke)`).
Verify: `raregrasstest.py` asserts the price of a woken Rare is 1 (or 2 without free sightings).
Severity: WEAK.

**W6. The Watch's night still ends by killing, and the visitors "are sent out".**
Where: `action.js` `kill()` (`if (duel.down >= duel.queue.length) endDuel(true)`), `spawnDuelFoe` (`num(... d.tr.name + ' sent out ' + k.name + '!')`), `koXp` per KO.
Now: dawn is the fallback; the fast way through a night is to knock out everyone who came to the door. The verb at the door is conquest with a timer behind it.
Change: a visitor at 0 HP does not die: it sits by the wall lamp (`mode: 'rest'`, no attack, drawn still) and the next one comes in; the night always runs to dawn (`endDuel(true)` only from `duel.night`); XP for the night is paid per night kept (`8 + 2 * lv + 5 * stage` once), not per KO; the "sent out" number line becomes nothing (the door opening is enough).
Verify: `nighttest.py` asserts `duel.dawn` is true on every kept night and that a night cannot end before `night.len`.
Severity: WEAK.

**W7. The Arena: play without a meaning, its rule told, its rail unchanged.**
Where: `world.js` `buildArena()` (comment: "a road of its own; five rivals climbed one a day, in front of others"; objects `names` "None is crossed out.", `bench` "worn in two places", `pail`), `app.js` `npcList().arena` (Juno `tomorrow: ['One a day. That is the rule of the sand.']`, `notYet: ['Not you. Not yet.']`), `placeRivals()`, `objectUse` (`names` only changes once the ladder is done), `settleBattle` (step and Kindlemane).
Now: five duels in a fixed order, one a day, with a secret critter at the top. Juno's line "I'm the only one who remembers them all" and the rail of names point at "being counted" (the seat's meaning), but nothing is played: the rail does not gain your name per step, the beaten rivals do not watch, the rule is stated.
Change: decide the meaning with Dan. If it is "being counted in front of others": each climbed step scratches one more mark on the rail (`objState names: { n: step }`, drawn), the beaten rivals stand at the ring's edge during your duel (`placeRivals` moves `ladder < step + 1` to the stand cells while `ACT.dueling()`), and Juno's refusal is a gesture (she sits down by the fire) instead of "the rule of the sand". If no meaning is found, take the Arena off the painted map (`MAP_LAYOUT`) and leave it as a place found on foot.
Verify: `arenatest.py` adds the rail count and the rivals' positions during a duel.
Severity: WEAK (PLAY, NO INTRO, meaning unstated).

**W8. The gates are level counters told on signs, and the leaders add a second lock.**
Where: `data.js` `GATES` / `ROUTE_GATES`, `app.js` `interact()` for signs (`' Opens at trainer level ' + GATES[to] + '.'`), `paint()` toast ("Frost Peaks is now open!"), `talk()` for leaders (`'Before you challenge me, prove yourself against ' + name + ' in ' + place`), `needs: 'ivy'` etc.
Now: the road "kept walkable by people you never meet" opens when a number reaches 3, 6, 9, announced by a toast and a sign; the fire you tended opens nothing. Then each leader refuses until a route trainer is beaten, in words.
Change: gates open by fires: `frost` at 1 seal, `ember` at 2, `tide` at 3, the climbs at the Lamp/Forge clues as now, the Watch at 4 (already). The sign loses its level sentence; the barricade is simply there, and on the morning after a seal it is gone (the people who keep the road moved it: a new rope, a lantern on the opened gate by day like Sproutvale's `gate-lamp`). Drop `needs`: the leader waits behind the trial; the route trainer stays a trainer. Trainer level keeps its uses (XP, titles). Old saves: seals already held open what levels did; a save at Lv 6 with one seal would lose Ember until the second seal, so keep `lvNow >= GATES[z]` as an alternative condition for saves older than this build (`state.v2gates` flag).
Verify: `ptest.py` (gates), `walktest.py`, `openingtest.py`; `telltest.py` adds "opens at (trainer )?level".
Severity: WEAK (told, and a counter where an act should open the road).

**W9. The tips recite rules, and one describes a screen that is gone.**
Where: `app.js` `hint()` calls: `keep` (the price table), `zone` ("Each zone has its own two types. The sparkling patch is rare grass with better odds."), `grass`, `party`, `shop`, `evolve`, `weather` ("Weather changes every 6 hours..."), `battle` ("Pick a move each turn. Special moves are limited, Guard blocks the next hit, and Switch or Bag use your turn.", fired by `openScreen('battle')`, which no player reaches).
Now: until the first seal, eight toasts explain. "Hint first" means a smaller encounter, not a sentence. The `battle` tip is dead text.
Change: delete `battle`, `keep`, `zone`, `weather`, `evolve`; keep `online` (an account is not a metaphor) and turn `party` and `shop` into one-time pointers on the menu dot, no text.
Verify: `guidetest.py` extends its "no guidance" checks to `APP.game.state.hints` never containing those ids; `telltest.py` covers the strings.
Severity: WEAK (told).

**W10. Fishing is a wait with nothing returned.**
Where: `app.js` `fish()` (0.9 to 2.4 s, toasts "You cast your line...", "Something bit!", "No sightings or rolls left today. Fishing uses them too."), 70% Tide.
Now: a small act of waiting, fine as a hint of patience; it means nothing on Tide Shore's own road ("what the sea gives back").
Change: with M6, the water gives back what you let go: a cast on any shore draws first from `state.returned` (the critter comes back at the level it had); the toasts become one ("The line goes taut."). The spent-day refusal uses the same words as the grass.
Verify: `fishtest.py` adds a returned seed and asserts it is the catch within three casts.
Severity: WEAK.

**W11. A knockout has no consequence, at any point of the road.**
Where: `action.js` `koHero()` (`st.down = 4`, then every side to 50% HP; toasts "Your party is knocked out. They recover in a moment.", "No penalty; you can try again." in `duelDone`).
Now: early, being picked up after a fall is right (you are kept). It never changes, so independence is never felt here.
Change: before the beacon as now (and without the toast: the 4 s on the ground says it). After the beacon a knocked-out party walks home: fade to Home's door with the party at 50% (`WORLD.go('town')`), and the window is dark if you had not lit it. Withdrawn support, felt.
Verify: `acttest2.py` adds the post-beacon case (`flags.lampLit`, all down, map is `town` within 5 s).
Severity: WEAK.

**W12. The forge and the arch tell their rules in object text and toasts.**
Where: `adventure.js` `forgeBelow()` gate text "A slab of black iron seals the way north. Two sockets in the hub must wake first."; `app.js` `socketUse` ("It belongs in one of the side halls."), `riteUse` wrong order: "The lights gutter out. The camp rhyme: fire first, then lamp, then hull."
Now: the mechanic (carry two cores; light three things in order) is explained by the thing itself. The Lamp Tower was rebuilt without this; its twins were not.
Change: gate text "A slab of black iron. Two sockets stand empty behind you."; socket text "A socket, cold." / "A socket, warm."; the wrong-order toast is only "The lights gutter out." (the rhyme is on the hearthstone for those who looked).
Verify: `forgetest.py`, `archtest.py` wording guards; `telltest.py` adds "must wake first|belongs in".
Severity: WEAK (told).

**W13. City favours are counters.**
Where: `data.js` `CITY_QUESTS` ("spot 5 wild critters on Highland Pass"), `app.js` `talk()` ("Could you do me a favor today? Please ... Progress: 0/5. Come back to me when it is done. I have a new favor every day.").
Now: four people a day read a progress bar aloud. Meaning: none.
Change: each favour is a thing to bring back from the road (a keep of the city's two types, already in the list; drop `see` and `beat`), asked in one line ("Bring me something from the Pass, if one will come with you.") and thanked without the number.
Verify: `questtest.py` / `citytest.py` wording guard: no "Progress:" in any dialog.
Severity: WEAK.

**W14. Rare grass stirs once per visit, silently.**
Where: `action.js` `stirSpent`.
Now: the second time the player stays in the same patch nothing happens and nothing shows; the rule is invisible, so staying again looks broken.
Change: after a wake the patch stops sparkling for the visit (`M.rareSpent` read by the tile painter) so the player sees it has given what it had.
Verify: `raregrasstest.py` asserts the `Z` cells draw plain after the wake.
Severity: WEAK.

### Polish

**P1. The pouch card tells.** `Game.renderVals` pouch `encounterNote` ("Dropped by a defeated wild critter (it joins at level 1). Keeping uses one of today's free sightings... It stays in your pouch until you decide."). With M1 the card shows the critter and the price only. Verify: `acttest4.py` wording.

**P2. The Watch's door recites the lock.** `interact()` and `towerLobby()`: "The Long Watch is for those who hold all 4 Leader Seals. You hold N." A shut door and the Keeper's "Not yet. Four fires first." say the same without the count. Verify: `towertest.py`.

**P3. Titles that tell.** `TITLES` `secret` "Uncover a secret" announces a secret; `shiny` "Keep 3 shiny critters" is fine. Rename `secret` to "The Ninth Seat: a seat answered" with `desc` "Sit where nobody sat." Verify: `titletest.py`.

**P4. The Dex tells habitats and the empty Dex tells the loop.** `renderVals` `spd.line + ' · lives in ' + HABITAT[...]`, `screen.html` line 232 "Critters live in the tall grass. Keep the ones you like and they'll line up here." The species page may show the zone's colour instead of the sentence; the empty Dex can show the basket. Verify: `dextest.py`, `telltest.py` ("lives in").

**P5. The world map explains the night.** `app.js` line 200: "Night: Dusk critters roam every zone." Observation instead: "Night."

**P6. The first critter by the door, the title's window and the guard stance** are right as built (`reset()` in action.js spawns one wild critter at `[6, 10]` on a new game; a tapped guard leaves 1.3 s, a held one breaks at 2.5 s). Named so that none of the above "fixes" them.

## 3. What I could not judge from here

- Feel and tempo of every stay: `BED_STAGE_S` 2.5, `STILL_S` 0.8, `BURN_S` 14, `CL_S` 2.4, the 28 s night, the 2.2 s stir. My numbers in W3, W4 and M4 are directions, not measurements; only Dan's thumb says whether 1.6 s is waiting or boredom.
- Whether a person, unlike the bot, wins with the verbs. `duelsim.py` never dodges; M10 is a floor, and the real fix may be smaller than written. I did not write a moving bot.
- Whether the Keep-by-staying of M1 is reachable on a phone in the middle of a fight (three other critters chasing while you stand by the one that sat down); it needs the real device.
- The Watch over twenty nights in a row (sixteen minutes at least); `towersim.py` models the turn-based fallback only, as the handoff says.
- Sound and music against these acts (the `claim` sfx on every keep, the `tap` on every ice plate, the Watch track) belong to the sound review.
- Whether Coral's call is learnable without a word: `gymtest2.py` proves it is solvable, not that a first player understands that touching answers.
