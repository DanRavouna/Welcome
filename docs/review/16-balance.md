# 16. Balance: the four keepers' duels, the verbs, the day's lamp

Scope: the review copy only (`src/world-rev/`, built to `games/critter-roll-review/index.html`). `src/world/` and the shipped game are untouched. Read first: 09 (its duelsim runs and the plausible party at each seal), 11 §4 items 9 and 13 and the unresolved list, 07 (the levels a player has at each leader), the sims' headers.

**Meaning.** A keeper's duel is the smaller second half of keeping a fire: once the seal is given for the trial, the duel should be won by the party a player has when they finish that trial, so the fire is kept the day the trial is done and not after days of grinding.

## For the directors

1. Set: Wren 6 to **5**, Glacia 5 to **1**, Blaze 11 to **5**, Coral 12 to **8** (`app.js` `npcList()`, the `lv` field only). Nothing else in the game changed. No verb number changed.
2. With the party 09 and 07 describe, the mash bot now wins: Wren 59 to 67%, Blaze 53 to 65%, Coral 62% (stage 3 lead, stage 2 bench), Glacia 46 to 57% (stage 2 Lv 7 to 9). 400 fights per row. Before: Wren 53 to 65, Glacia 18 to 20, Blaze 22 to 33, Coral 40.
3. Glacia cannot reach 55 to 70% by level alone for a stage 2 Lv 7 to 8 party: Lv 1 is the floor and gives 42 to 49%. Her `pick` 0.75 to 0.5 at Lv 5 gives 66 to 68% (measured, sim only). That changes which critters she fields, so it is Dan's call; Lv 1 is set meanwhile.
4. The verbs pass both of 11's lines (win within 10 of mash, time within 1.3x) for every leader and both trainers, with a bot that reads the verb's own cooldown apart from the slash's: `smart2` and `wheel` win as much as mash against Wren (99 to 100% for all three) and 6 to 27 points MORE against the other five, at 1.04 to 1.18x its time.
5. The old `smart` bot still fails both lines everywhere (6 to 43 points behind, 1.4 to 2.1x the time). That is not the verb numbers: it reads `ACT.cdFrac()`, which shows the verb's cooldown while the button sits on the verb, so it throws nothing until the verb is ready again, and it does not slash from inside its own ring. A phone player whose button stays on the verb plays exactly like it.
6. Halving or quartering every verb cooldown, or `OPEN_MUL` 2.0, does not fix the old bot's time (still 1.3 to 2.5x) and starts to break Coral's line for the other bots. So `vcd` and `OPEN_MUL` 1.5 stay. The fix is the button, not a number: after a verb, the attack button returns to the quick slash (or a tap while the verb cools throws the quick). Not built (outside this task); measured as `smart2`.
7. The day's lamp at 1/1/2/4 and 20 rolls: about 16.5 keeps a day if a player keeps everything (11.5 at the shipped 1/2/4/8). The rolls last to minute 11 to 13 of a 20-minute day at 1.5 downs a minute, to minute 6 to 7 at 3 a minute. So "about ten keeps" holds and is passed; "across the session" holds only for a slow, choosing player.
8. A collector who keeps only new kinds keeps 16 on day one and about one a day by day seven in the sim (it meets every kind fast; zones slow that in the game). The lamp is then barely spent: a second-week question, not a balance one.
9. The sims now take `SIM_HTML` (any build), and `duelsim.py` takes `LV`, `BOTS` (`smart2`, `wheel`), `PARTY`, `TEAM`, `WHEEL`; `milesim.py` takes `ACT=1`. Defaults and default output are unchanged.
10. Only a phone can say whether a thumb switches back to the quick slash after a verb, whether people dodge Glacia's shots (the bots never dodge), and what a real day-one party is (the "starter plus two fresh keeps" party wins 32% against Wren 5).

## How it was measured

- Build: `python3 src/build2.py games/critter-roll-review/index.html src/world-rev` in this worktree. Every run loaded that file by `SIM_HTML` (the shared `/mnt/user-data/outputs/critter-roll-world.html` currently points at another worktree's build, so it was never used). Seed hook on (`PYTHONPATH=src/pwhook`), as the archive says for `duelsim.py`.
- `duelsim.py` drives the real `ACT` duel code in an open arena (no walls, no dodging, one duel from full HP, no items: the bag is not bound, so the potions used for you under 30% HP never fire; the real game is a little easier).
- The bots. `mash`: walk to the foe, quick slash whenever ready. `smart`: the bot as written before tonight (the type's verb at its moment, at most every 4 s; the fed heavy a third of the time in reach; waits on `ACT.cdFrac()`; does not slash inside its own ring or petals). `smart2`: the same moments, but the verb waits only for `ACT.vcd()` and the blows only for `ACT.cd()`, and it slashes from inside a standing ring; changing slot is free. `wheel`: a thumb on the game's one attack button: the verb at the same moments, the quick slash between, no heavy, and every change of slot costs 0.6 s with no blow (hold 0.26 s for the wheel, drag, let go). `smart2` and `wheel` bracket a person who uses the verbs; `smart` is a person who leaves the button on the verb.
- The party. Default (as in 09 and every earlier run): the best 3 of 10 random critters at one stage and level. `PARTY=` gives a fixed shape: `1:2` a random critter, `1:2x5` the best of five (what you would pick from five keeps), `s1:5` one of the game's three starters. Mixed parties list the lead first.
- The plausible party at each leader (09 §3.5, 07): Wren on day one, stage 1 Lv 4 (Lv 5 and 6 as the range); Glacia after one seal, not given by 09 or 07: interpolated as stage 2 (the first evolve is 15 essence, a day of kills) Lv 7 to 8, with Lv 9 to 10 as the range; Blaze stage 2 Lv 9 to 11; Coral "stage 2 to 3 Lv 12", modelled as a stage 3 lead with two stage 2 (all Lv 12, each the best of 10), with all-stage-2 and all-stage-3 as the range.
- 200 to 400 fights per bot per row (400 for every decision). At 400 fights a win rate is good to about 2.5 points (one standard error), at 200 to about 3.5. Mean time is over all fights, won and lost (a lost fight ends when the party is down).
- The levels were tried with `LV=id:n` (the sim overrides the team level for that run only), then written into `app.js`, the copy rebuilt, and the after tables run on the rebuilt file with no override.

## The chosen numbers and why

| keeper | lv before | lv after | plausible party | mash before | mash after | verbs after (smart2 / wheel) | mean time mash / wheel |
|---|---|---|---|---|---|---|---|
| Wren | 6 | 5 | stage 1 Lv 4 / 5 / 6 | 53 / 63 / 65 | 59 / 64 / 67 | 73-81 / 71-82 | 25 s / 27-29 s |
| Glacia | 5 | 1 | stage 2 Lv 7 / 8 (9 / 10) | 18 / 20 (- / 34) | 46 / 49 (57 / 67) | 64-78 / 70-80 | 33 s / 35-36 s |
| Blaze | 11 | 5 | stage 2 Lv 9 / 10 / 11 | 22 / 29 / 33 | 53 / 62 / 65 | 77-86 / 76-83 | 36 s / 39-40 s |
| Coral | 12 | 8 | stage 3 lead + two stage 2, Lv 12 | 40 | 62 | 68 / 72 | 39 s / 42 s |

Before columns: Wren, Glacia and Coral from the 400-fight scans at the old level, Blaze from the 200-fight baseline (Blaze at 11 was not re-run at 400; it is 20 to 30 points under the band either way). After: 400 fights on the rebuilt copy.

- **Wren 5.** The day-one party (stage 1 Lv 4) is the one that matters; Wren 5 puts it at 59 to 63% across two runs (58 at 200 fights), the middle of the band, and Lv 5 to 6 parties at 64 to 71%. Wren 6 put the Lv 4 party at 53% (400 fights) and 54% (200), under the band; Wren 4 put the Lv 5 and 6 parties at 70 to 75%, over it. A real day-one party is weaker than the sim's (a starter at Lv 5 and two fresh keeps wins 32% against Wren 5, 26% against Wren 6, 50% even against Wren 1), so the lower of the two in-band levels is the kinder one.
- **Glacia 1.** See the next section: no level puts a stage 2 Lv 7 to 8 party in the band. Lv 1 is the closest (46 to 49%; 57 to 67% at Lv 9 to 10), and with the verbs she is already in the band (64 to 80%). Levels are not shown in a duel, so the number is not read; it costs the party critter XP (a knock-out pays 8 + 2 x level + 5 x stage: 20 instead of 28).
- **Blaze 5.** Stage 2 Lv 9 to 11 at Blaze 5: 53 to 65% (two runs: 60 to 65 and 53 to 65). Blaze 6 was 45 to 59, Blaze 4 was 63 to 69. Blaze is stage 3 with a 0.55 pick, so he stays a stage-3 team; his level only trims 3% of stats a level.
- **Coral 8.** The mixed party (stage 3 lead) is 62 to 65% at Coral 8 (two runs), 57% at 9, 66% at 7; an all-stage-3 party 67 to 69%. An all-stage-2 party is 18 to 21% at Coral 8 and never above 34% at any level tried (5 to 12): Coral asks for a stage 3 lead (60 essence) whatever her level. Her `DUEL_TUNE` hp 1.35 stays and is in every number above.
- The order this gives by difficulty against the plausible party: Wren and Blaze about 60%, Coral about 62%, Glacia about 48% for the mash bot, about 70% for a player who uses the verbs. Glacia is still the hardest fire for someone who only slashes, as she was in the handoff's runs (50% at stage 2 Lv 12).

## Glacia: why the level is not enough

Her team is stage 2, four critters, picked at the 75th percentile of Frost and Stone; a level is 3% of stats, so Lv 5 to Lv 1 is 12%. Frost and Stone shoot and charge, and the bots never dodge, so the mash floor is lowest here of any keeper. Measured (400 fights, sim only, nothing in the game changed):

| Glacia team | stage 2 Lv 7 | stage 2 Lv 8 | stage 2 Lv 9 | stage 2 Lv 10 |
|---|---|---|---|---|
| Lv 5 (before) | 18 | 20 | - | 34 |
| Lv 3 | 29 | 31 | 39 | 41 |
| Lv 2 | 35 | 46 | 51 | 53 |
| Lv 1 (set) | 42 / 46 | 48 / 49 | 56 / 57 | 62 / 67 |
| Lv 5, size 3 | 42 | 40 | | |
| Lv 5, pick 0.5 | 66 | 68 | | |
| Lv 7, pick 0.5 | 46 | 51 | | |
| Lv 5, size 3, pick 0.5 | 76 | 80 | | |
| Lv 7, size 3, pick 0.5 | 63 | 67 | | |

(mash win %; two numbers where two runs were made.) For Dan: `pick: 0.5` at `lv: 5` puts the mash bot at 66 to 68% and the verbs at 70 to 78% (full rows in the appendix); it also changes the species she fields, so it is a content change, not a number. If he takes it, set her `lv` back to 5.

## The verbs: 11 item 13's two lines

The line: `duelsim.py 2 12 N wren glacia bram kiki blaze coral` (the stage 2 Lv 12 party). Pass = verbs win at least mash minus 10 AND the verbs' mean fight time is at most 1.3x mash's. Each cell: verbs' win minus mash's, verbs' time over mash's.

Before (first-guess levels, current verb numbers, 200 fights):

| | mash win (s) | smart | smart2 | wheel |
|---|---|---|---|---|
| Wren | 99 (19) | -6, 2.26x FAIL | +0, 1.11x pass | +0, 1.11x pass |
| Glacia | 48 (34) | -11, 1.91x FAIL | +22, 1.09x pass | +20, 1.12x pass |
| Bram | 76 (39) | -21, 1.59x FAIL | +13, 1.10x pass | +10, 1.08x pass |
| Kiki | 64 (27) | -36, 1.81x FAIL | +14, 1.04x pass | +16, 1.07x pass |
| Blaze | 41 (38) | -34, 1.66x FAIL | +23, 1.13x pass | +23, 1.16x pass |
| Coral | 8 (35) | -7, 1.34x FAIL | +29, 1.29x pass | +31, 1.26x pass |

After (chosen levels, same verb numbers, 400 fights):

| | mash win (s) | smart | smart2 | wheel |
|---|---|---|---|---|
| Wren | 100 (19) | -6, 2.11x FAIL | -1, 1.11x pass | -1, 1.05x pass |
| Glacia | 77 (32) | -26, 2.00x FAIL | +6, 1.12x pass | +10, 1.06x pass |
| Bram | 74 (39) | -21, 1.59x FAIL | +12, 1.08x pass | +16, 1.05x pass |
| Kiki | 69 (26) | -43, 2.00x FAIL | +13, 1.04x pass | +11, 1.15x pass |
| Blaze | 72 (35) | -43, 2.00x FAIL | +12, 1.06x pass | +8, 1.09x pass |
| Coral | 21 (38) | -16, 1.37x FAIL | +24, 1.16x pass | +27, 1.18x pass |

For comparison, 09's run tonight on the copy before package M (shared cooldown, no `open`, 20 fights): Wren 90 / 85, Glacia 55 / 20, Kiki 65 / 10, Blaze 20 / 0 (mash / smart), every verb fight 2 to 3x longer. The separate cooldown and `open` are what moved the verbs from 20 to 45 points behind to 8 to 30 points ahead; the old bot cannot see it.

Could verb numbers make the old `smart` bot pass? Throwaway builds (scratchpad only, first-guess levels, 200 fights; every `vset()` scaled, or `OPEN_MUL` changed):

| variant | smart passes win line | smart passes time line | smart2 / wheel still pass |
|---|---|---|---|
| as built (vcd x1, open 1.5) | 2 of 6 (Wren -6, Coral -7) | 0 of 6 (1.34-2.26x) | 6 / 6 |
| every vcd x0.5 | 5 of 6 (Bram -13) | 0 of 6 (1.61-2.32x) | Coral fails both (1.31x, 1.43x) |
| OPEN_MUL 2.0 | 2 of 6 (Wren -8, Coral -6) | 0 of 6 (1.31-2.47x) | 6 / 6 |
| vcd x0.5 and OPEN_MUL 2.0 | 5 of 6 | 0 of 6 (1.58-2.31x) | 6 / 6 |
| every vcd x0.25 | 6 of 6 | 0 of 6 (1.35-1.69x) | wheel Coral fails (1.33x) |

The old bot's time is set by standing in its own ring (up to 3.2 s) and petals (2.4 s) without slashing and by waiting out the cooldown with the button on the verb; only a quarter of every cooldown gets its wins level, never its time, and that makes the verb nearly free for anyone who switches. Decision: no verb number changed (`OPEN_S` 1.5, `OPEN_MUL` 1.5, Frost 1.5 / 1.2, Ember 0.8 + 0.8 per charge, Tide 2.0 / 1.2, Moss 2.0 / 1.2, Volt 1.4, Dusk 0.5 then 2.5, Stone 3.0 / 0.8, Bloom 3.5). Proposed instead, for Dan and the phone: the button returns to the quick slash after a verb fires (or a tap during the verb's cooldown throws the quick). Not built.

## The Watch, for the record (unchanged by this task)

`duelsim.py` floors, 100 fights, stage 3 party (the Watch opens at four seals in the copy):

| night | Lv 14: mash / smart / smart2 / wheel | Lv 18: mash / smart / smart2 / wheel |
|---|---|---|
| 5 | 99 / 94 / 100 / 96 | 99 / 98 / 100 / 98 |
| 10 | 89 / 92 / 95 / 96 | 98 / 100 / 95 / 98 |
| 15 | 90 / 99 / 98 / 98 | 96 / 99 / 97 / 100 |
| 20 | 30 / 52 / 62 / 74 | 57 / 54 / 71 / 84 |

`towersim.py` (the turn-based fallback, 200 runs; 09 says not to cite it for the live game): Lv 14 median 6 floors, Lv 17 median 9, Lv 20 median 13, all twenty 0 / 1 / 9%. Same as the handoff archive; the leaders' levels do not enter it.

## The day's lamp (`milesim.py`)

`milesim.py` as written hard-codes the old prices (1/2/4/8) and the old roll-to-meet economy, so on any build it prints the same: 12 / 24 / 36 / 48 kinds in a median 1 / 3 / 4 / 6 days engaged, 2 / 3 / 4 / 9 casual. Recorded, not evidence. Added `ACT=1`: the action-mode day, which reads the build's own `KEEP_COST` (meeting and downing a critter is free; a keep costs its price from 20 rolls; no sightings term; rare grass and quests not modelled; every kind equally likely, so kinds are met faster than in zones). 300 simulated players, 400 days:

| build, keeper, downs a day (per minute over 20 min) | keeps day 1 / 3 / 7 | rolls gone at, day 1 | 12 / 24 / 36 / 48 kinds, median days |
|---|---|---|---|
| copy 1/1/2/4, keeps all, 30 (1.5) | 16.5 / 16.5 / 16.5 | minute 11.3 | 1 / 2 / 4 / 13 |
| copy, keeps all, 60 (3) | 16.5 / 16.6 / 16.6 | minute 5.7 | 1 / 2 / 4 / 13 |
| copy, keeps all, 120 (6, the day bot) | 16.9 / 16.7 / 16.8 | minute 2.8 | 1 / 2 / 4 / 13 |
| copy, collector, 30 (1.5) | 16.4 / 8.2 / 0.9 | minute 13.3 (99% of days) | 1 / 2 / 3 / 8 |
| copy, collector, 60 (3) | 16.5 / 10.7 / 0.9 | minute 6.7 | 1 / 2 / 3 / 5 |
| copy, collector, 120 (6) | 16.6 / 13.2 / 1.0 | minute 3.3 | 1 / 2 / 3 / 4 |
| shipped 1/2/4/8, keeps all, 30 (1.5) | 11.5 / 11.4 / 11.4 | minute 8.0 | 2 / 3 / 6 / 18 |
| shipped, keeps all, 60 (3) | 11.6 / 11.3 / 11.4 | minute 4.0 | 2 / 3 / 6 / 18 |
| shipped, collector, 30 (1.5) | 11.3 / 10.1 / 1.2 | minute 8.7 | 2 / 3 / 4 / 9 |
| shipped, collector, 60 (3) | 11.4 / 11.1 / 0.9 | minute 4.7 | 2 / 3 / 4 / 6 |

Reading: at 1/1/2/4 a 20-minute day keeps about 16 critters, not ten, and the lamp burns about 1.4x longer per critter downed than at 1/2/4/8. Whether it lasts "across the session" depends only on how fast a person downs critters: to minute 11 to 13 at 1.5 a minute, to minute 6 to 7 at 3. 07 and 09 estimate (not measure) a human at 5 to 15 minutes for ten keeps under the old prices; scaled to 16.5 keeps that is about 8 to 25 minutes, so a person who keeps what they meet would see the flame go down through most of a session, a fast fighter in its first third. The day bot (6 a minute) spends it in 3 minutes either way. A collector keeps one or two a day once every kind is met (day 7 here; later in zones), so for them the lamp is a first-week shape. Nothing in the economy was changed.

## What tests will need (not edited; the full suite was not run, per 12's rule for the copy)

- `balancetest.py`: 'zone level gates 1/3/6/9' reads `GATES`, which in the copy is seals (`moss 0, frost 2, ember 2, tide 3`); the level gates are `GATES_LV`. Same for 'route gates' (`ROUTE_GATES` is seals `1/1/1, 2/2/2, 3 x6, ascent 4, descent 3`; the levels are `ROUTE_GATES_LV`). Both checks fail on the copy before this task and still do. Add: the four leaders' `lv` 5 / 1 / 5 / 8 (11 item 9 asks for it; read with `WORLD.allNpcs()` as the seal-line check already does); `KEEP_COST` 1/1/2/4 and `ACT_TXP_CAP` 15. `DUEL_TUNE` (coral hp 1.35) and the duel multipliers are unchanged and still pass.
- The verb numbers (`OPEN_S`, `OPEN_MUL`, each `vset()`) live inside `ACT`'s closure, so `balancetest` cannot read them; pinning them (09 §3.2) needs a read-only `ACT.tune` or a timed check in `verbtest.py`.
- Possibly moved by the levels and not run here: any test that fights a leader through the real duel (`acttest5`, `gymtest`, `ptest`'s settle path is level-independent) and prints a time or a critter XP (KO XP falls with the leader's level). Their numbers are masked in the snapshots except for the tests in `src/snap/exact.txt`; `ptest` is in that list but its XP line is the trainer's 100 + 10, which does not read the level.
- Verified here: the rebuilt copy loads with no page errors and the four leaders read 5 / 1 / 5 / 8 (Playwright probe, with and without the seed hook); every sim ran on that file.

## What only a human on a phone can judge

- Whether a thumb switches the button back to the quick slash after a verb. The gap between `smart` (never switches) and `wheel` (switches in 0.6 s) is 30 to 50 points: the whole verdict on the verbs turns on this, and on whether 0.6 s per switch is right.
- Dodging. No bot dodges; Glacia's Frost shots and Coral's Tide shots are where a person who moves gains most, so the mash floor is most pessimistic for those two.
- The real party at each fire. The sim's party is the best three of ten; the "starter and two fresh keeps" party wins 32% against Wren 5 with the mash bot, 43 to 48% with the verbs. Whether Dan's own day one looks like that, or like the sim's, decides whether Wren wants 5 or lower.
- How fast a person downs critters, which alone decides when the day's lamp goes out (minute 6 to 13 in the model).
- Whether 25 to 40 s duels feel like a fire kept or a chore, the potions used for you under 30% (not in the sim), and all sound, tempo and feel. None of it can be judged from here.

## How to re-run

```bash
python3 src/build2.py games/critter-roll-review/index.html src/world-rev
SIM_HTML=games/critter-roll-review/index.html BOTS=mash,smart,smart2,wheel PYTHONPATH=src/pwhook python3 src/duelsim.py 1 4 400 wren
SIM_HTML=games/critter-roll-review/index.html BOTS=mash,smart,smart2,wheel PYTHONPATH=src/pwhook python3 src/duelsim.py 2 12 400 wren glacia bram kiki blaze coral
SIM_HTML=games/critter-roll-review/index.html PARTY=3:12x10,2:12x10,2:12x10 BOTS=mash,smart2,wheel PYTHONPATH=src/pwhook python3 src/duelsim.py 1 1 400 coral
SIM_HTML=games/critter-roll-review/index.html LV=glacia:5 TEAM=pick:0.5 BOTS=mash,wheel PYTHONPATH=src/pwhook python3 src/duelsim.py 2 8 400 glacia
SIM_HTML=games/critter-roll-review/index.html ACT=1 DOWNS=30,60,120 PYTHONPATH=src/pwhook python3 src/milesim.py
SIM_HTML=games/critter-roll-review/index.html PYTHONPATH=src/pwhook python3 src/towersim.py '{"n":200}'
```

## Appendix: every run

Each row: the leader, the party (in BEFORE, the `party` rows are random members with no best-of or starter; later rows use `x5` / `x10` / `s` as written) ("stage s Lv l" = the best 3 of 10 at that stage and level; "party ..." = the PARTY shape; "team Lv" = the level tried with `LV`, absent = the level in that build), fights per bot, then win % and mean fight seconds for each bot.

### A1. Before: the copy as merged (Wren 6, Glacia 5, Blaze 11, Coral 12), 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| wren | stage 1 Lv 4 | 200 | 54 (26) | 21 (57) | 70 (28) | 75 (28) |
| wren | stage 1 Lv 5 | 200 | 62 (25) | 21 (52) | 77 (28) | 73 (28) |
| wren | stage 1 Lv 6 | 200 | 63 (26) | 23 (54) | 75 (28) | 81 (26) |
| wren | party 2:5,1:2,1:1 | 200 | 30 (22) | 8 (43) | 43 (27) | 48 (26) |
| glacia | stage 1 Lv 6 | 200 | 0 (22) | 2 (35) | 4 (29) | 18 (32) |
| glacia | stage 1 Lv 8 | 200 | 1 (24) | 4 (40) | 11 (33) | 22 (33) |
| glacia | stage 2 Lv 6 | 200 | 14 (31) | 13 (49) | 39 (37) | 42 (38) |
| glacia | stage 2 Lv 8 | 200 | 18 (31) | 24 (56) | 47 (38) | 56 (38) |
| glacia | party 2:7,1:5,1:4 | 200 | 1 (19) | 1 (27) | 3 (24) | 5 (26) |
| blaze | stage 2 Lv 9 | 200 | 22 (37) | 4 (53) | 54 (43) | 57 (45) |
| blaze | stage 2 Lv 10 | 200 | 29 (38) | 6 (62) | 45 (46) | 59 (45) |
| blaze | stage 2 Lv 11 | 200 | 33 (37) | 12 (56) | 61 (43) | 63 (46) |
| blaze | party 2:10,2:8,1:8 | 200 | 4 (26) | 0 (30) | 20 (36) | 23 (38) |
| coral | stage 2 Lv 12 | 200 | 10 (36) | 1 (48) | 32 (41) | 41 (45) |
| coral | stage 3 Lv 12 | 200 | 53 (39) | 11 (65) | 54 (44) | 74 (45) |
| coral | party 3:12,2:12,2:10 | 200 | 1 (29) | 0 (40) | 17 (35) | 21 (39) |
| wren | stage 2 Lv 12 | 200 | 99 (19) | 93 (43) | 99 (21) | 99 (21) |
| glacia | stage 2 Lv 12 | 200 | 48 (34) | 37 (65) | 70 (37) | 68 (38) |
| bram | stage 2 Lv 12 | 200 | 76 (39) | 55 (62) | 89 (43) | 86 (42) |
| kiki | stage 2 Lv 12 | 200 | 64 (27) | 28 (49) | 78 (28) | 80 (29) |
| blaze | stage 2 Lv 12 | 200 | 41 (38) | 7 (63) | 64 (43) | 64 (44) |
| coral | stage 2 Lv 12 | 200 | 8 (35) | 1 (47) | 37 (45) | 39 (44) |

### A2. First level scan, 200 fights (bots mash, smart2, wheel)

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| wren | stage 1 Lv 4 (team Lv 4) | 200 | 64 (26) | - | 74 (27) | 73 (28) |
| wren | stage 1 Lv 5 (team Lv 4) | 200 | 71 (24) | - | 84 (27) | 82 (27) |
| wren | stage 1 Lv 6 (team Lv 4) | 200 | 70 (25) | - | 80 (27) | 84 (28) |
| wren | stage 1 Lv 4 (team Lv 5) | 200 | 58 (25) | - | 73 (28) | 71 (27) |
| wren | stage 1 Lv 5 (team Lv 5) | 200 | 67 (25) | - | 73 (27) | 78 (27) |
| wren | stage 1 Lv 6 (team Lv 5) | 200 | 71 (26) | - | 80 (26) | 82 (27) |
| glacia | stage 2 Lv 6 (team Lv 1) | 200 | 37 (32) | - | 57 (37) | 65 (37) |
| glacia | stage 2 Lv 7 (team Lv 1) | 200 | 31 (33) | - | 64 (36) | 69 (36) |
| glacia | stage 2 Lv 8 (team Lv 1) | 200 | 46 (33) | - | 72 (37) | 77 (36) |
| glacia | stage 2 Lv 6 (team Lv 3) | 200 | 22 (31) | - | 45 (37) | 57 (37) |
| glacia | stage 2 Lv 7 (team Lv 3) | 200 | 32 (32) | - | 58 (38) | 64 (37) |
| glacia | stage 2 Lv 8 (team Lv 3) | 200 | 33 (33) | - | 57 (38) | 65 (38) |
| blaze | stage 2 Lv 9 (team Lv 5) | 200 | 55 (37) | - | 79 (41) | 79 (41) |
| blaze | stage 2 Lv 10 (team Lv 5) | 200 | 64 (36) | - | 75 (39) | 76 (41) |
| blaze | stage 2 Lv 11 (team Lv 5) | 200 | 59 (37) | - | 83 (37) | 87 (39) |
| blaze | stage 2 Lv 9 (team Lv 8) | 200 | 38 (39) | - | 54 (43) | 60 (42) |
| blaze | stage 2 Lv 10 (team Lv 8) | 200 | 49 (37) | - | 67 (40) | 76 (41) |
| blaze | stage 2 Lv 11 (team Lv 8) | 200 | 49 (38) | - | 65 (41) | 74 (41) |
| coral | stage 2 Lv 12 (team Lv 6) | 200 | 34 (39) | - | 46 (42) | 60 (44) |
| coral | stage 3 Lv 12 (team Lv 6) | 200 | 79 (38) | - | 82 (39) | 85 (39) |
| coral | stage 2 Lv 12 (team Lv 9) | 200 | 22 (37) | - | 36 (44) | 41 (44) |
| coral | stage 3 Lv 12 (team Lv 9) | 200 | 60 (40) | - | 76 (43) | 79 (43) |

### A3. Level scan, 400 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| wren | stage 1 Lv 4 (team Lv 4) | 400 | 66 (25) | 28 (56) | 80 (27) | 77 (29) |
| wren | stage 1 Lv 5 (team Lv 4) | 400 | 72 (25) | 28 (56) | 77 (27) | 80 (28) |
| wren | stage 1 Lv 6 (team Lv 4) | 400 | 75 (25) | 39 (59) | 80 (27) | 80 (27) |
| wren | party s1:5,1:2x5,1:2x5 (team Lv 4) | 400 | 35 (22) | 8 (35) | 46 (25) | 46 (25) |
| wren | stage 1 Lv 4 (team Lv 5) | 400 | 63 (25) | 22 (58) | 71 (29) | 75 (28) |
| wren | stage 1 Lv 5 (team Lv 5) | 400 | 66 (25) | 29 (51) | 74 (28) | 78 (28) |
| wren | stage 1 Lv 6 (team Lv 5) | 400 | 71 (25) | 29 (61) | 78 (28) | 80 (27) |
| wren | party s1:5,1:2x5,1:2x5 (team Lv 5) | 400 | 32 (22) | 7 (35) | 45 (24) | 44 (26) |
| wren | stage 1 Lv 4 (team Lv 6) | 400 | 53 (26) | 19 (56) | 70 (29) | 68 (29) |
| wren | stage 1 Lv 5 (team Lv 6) | 400 | 63 (26) | 23 (52) | 73 (28) | 72 (29) |
| wren | stage 1 Lv 6 (team Lv 6) | 400 | 65 (26) | 31 (59) | 78 (27) | 78 (28) |
| blaze | stage 2 Lv 9 (team Lv 4) | 400 | 63 (36) | 20 (65) | 84 (38) | 78 (40) |
| blaze | stage 2 Lv 10 (team Lv 4) | 400 | 68 (36) | 27 (70) | 81 (38) | 83 (38) |
| blaze | stage 2 Lv 11 (team Lv 4) | 400 | 69 (35) | 30 (66) | 87 (38) | 87 (39) |
| blaze | stage 2 Lv 9 (team Lv 5) | 400 | 60 (37) | 20 (66) | 75 (39) | 74 (41) |
| blaze | stage 2 Lv 10 (team Lv 5) | 400 | 61 (37) | 22 (69) | 77 (39) | 80 (40) |
| blaze | stage 2 Lv 11 (team Lv 5) | 400 | 65 (36) | 29 (68) | 81 (38) | 82 (39) |
| blaze | stage 2 Lv 9 (team Lv 6) | 400 | 45 (38) | 15 (61) | 72 (41) | 74 (41) |
| blaze | stage 2 Lv 10 (team Lv 6) | 400 | 54 (38) | 19 (69) | 73 (40) | 76 (40) |
| blaze | stage 2 Lv 11 (team Lv 6) | 400 | 59 (37) | 20 (67) | 78 (38) | 83 (40) |
| blaze | stage 2 Lv 9 (team Lv 7) | 400 | 46 (38) | 9 (62) | 69 (42) | 69 (41) |
| blaze | stage 2 Lv 10 (team Lv 7) | 400 | 50 (37) | 15 (64) | 72 (41) | 72 (41) |
| blaze | stage 2 Lv 11 (team Lv 7) | 400 | 49 (38) | 21 (66) | 77 (39) | 75 (42) |
| coral | stage 2 Lv 12 (team Lv 5) | 400 | 34 (39) | 7 (59) | 58 (43) | 67 (43) |
| coral | stage 3 Lv 12 (team Lv 5) | 400 | 81 (36) | 44 (68) | 81 (40) | 87 (39) |
| coral | party 3:12x10,2:12x10,2:12x10 (team Lv 5) | 400 | 80 (37) | 44 (74) | 76 (41) | 83 (41) |
| coral | stage 2 Lv 12 (team Lv 7) | 400 | 25 (38) | 6 (55) | 47 (44) | 56 (44) |
| coral | stage 3 Lv 12 (team Lv 7) | 400 | 71 (38) | 35 (70) | 78 (40) | 85 (40) |
| coral | party 3:12x10,2:12x10,2:12x10 (team Lv 7) | 400 | 66 (38) | 28 (68) | 75 (40) | 82 (41) |
| coral | stage 2 Lv 12 (team Lv 9) | 400 | 19 (38) | 3 (53) | 41 (42) | 47 (45) |
| coral | stage 3 Lv 12 (team Lv 9) | 400 | 59 (39) | 26 (62) | 74 (42) | 78 (43) |
| coral | party 3:12x10,2:12x10,2:12x10 (team Lv 9) | 400 | 57 (40) | 18 (68) | 67 (42) | 76 (42) |
| coral | party 3:12x10,2:12x10,2:12x10 (team Lv 12) | 400 | 40 (40) | 9 (63) | 55 (42) | 68 (45) |

### A4. Wren against the day-one shape (a starter and two keeps), 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| wren | party s1:5,1:2x5,1:2x5 (team Lv 1) | 200 | 50 (22) | 18 (44) | 63 (25) | 56 (26) |
| wren | party s1:5,1:2x5,1:2x5 (team Lv 3) | 200 | 43 (22) | 12 (37) | 59 (26) | 54 (26) |
| wren | party s1:5,1:2x5,1:2x5 (team Lv 5) | 200 | 30 (21) | 5 (38) | 46 (26) | 44 (25) |
| wren | party s1:5,1:2x5,1:2x5 (team Lv 6) | 200 | 26 (22) | 4 (34) | 36 (24) | 41 (25) |
| wren | party s1:6,1:3x5,1:2x5 (team Lv 6) | 200 | 33 (22) | 5 (33) | 42 (24) | 42 (26) |
| wren | party s2:5,1:2x5,1:2x5 (team Lv 6) | 200 | 42 (22) | 5 (38) | 53 (26) | 47 (25) |
| wren | party s1:4 (team Lv 6) | 200 | 0 (5) | 0 (5) | 0 (5) | 0 (5) |
| wren | party s1:6 (team Lv 6) | 200 | 0 (5) | 0 (5) | 0 (5) | 0 (5) |

(The two single-member rows end at 5 s with 0%: the sim needs a bench; they are a sim limit, not a result.)

### A5. Glacia by level, 400 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| glacia | stage 2 Lv 7 (team Lv 1) | 400 | 42 (33) | 31 (61) | 63 (36) | 70 (36) |
| glacia | stage 2 Lv 8 (team Lv 1) | 400 | 48 (32) | 36 (61) | 67 (35) | 68 (37) |
| glacia | party 2:8x10,1:8x10,1:8x10 (team Lv 1) | 400 | 41 (33) | 32 (55) | 59 (37) | 67 (36) |
| glacia | stage 2 Lv 7 (team Lv 3) | 400 | 29 (33) | 28 (55) | 54 (37) | 57 (37) |
| glacia | stage 2 Lv 8 (team Lv 3) | 400 | 31 (33) | 28 (60) | 54 (38) | 66 (36) |
| glacia | party 2:8x10,1:8x10,1:8x10 (team Lv 3) | 400 | 17 (32) | 24 (56) | 51 (38) | 58 (37) |
| glacia | stage 2 Lv 7 (team Lv 5) | 400 | 18 (31) | 23 (54) | 42 (37) | 50 (37) |
| glacia | stage 2 Lv 8 (team Lv 5) | 400 | 20 (32) | 26 (60) | 44 (38) | 52 (37) |
| glacia | stage 2 Lv 10 (team Lv 5) | 400 | 34 (33) | 24 (58) | 54 (38) | 64 (38) |
| glacia | party 2:8x10,1:8x10,1:8x10 (team Lv 5) | 400 | 12 (30) | 17 (53) | 35 (37) | 46 (37) |
| coral | party 3:12x10,2:12x10,2:12x10 (team Lv 8) | 400 | 65 (39) | 24 (71) | 72 (42) | 78 (43) |
| coral | stage 3 Lv 12 (team Lv 8) | 400 | 69 (39) | 32 (70) | 75 (42) | 78 (42) |
| coral | stage 2 Lv 12 (team Lv 8) | 400 | 18 (38) | 4 (55) | 47 (42) | 58 (46) |

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| glacia | stage 2 Lv 9 (team Lv 1) | 400 | 56 (32) | 47 (59) | 70 (36) | 80 (36) |
| glacia | stage 2 Lv 10 (team Lv 1) | 400 | 62 (33) | 45 (63) | 79 (36) | 78 (36) |
| glacia | stage 2 Lv 7 (team Lv 2) | 400 | 35 (33) | 29 (60) | 54 (37) | 64 (36) |
| glacia | stage 2 Lv 8 (team Lv 2) | 400 | 46 (33) | 32 (59) | 63 (37) | 67 (36) |
| glacia | stage 2 Lv 9 (team Lv 2) | 400 | 51 (32) | 36 (59) | 63 (37) | 72 (36) |
| glacia | stage 2 Lv 10 (team Lv 2) | 400 | 53 (33) | 44 (64) | 72 (37) | 74 (36) |
| glacia | stage 2 Lv 9 (team Lv 3) | 400 | 39 (34) | 29 (58) | 59 (38) | 70 (36) |
| glacia | stage 2 Lv 10 (team Lv 3) | 400 | 41 (33) | 42 (59) | 62 (38) | 73 (36) |

### A6. Glacia team shapes (sim only, `TEAM=`), 400 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| glacia | stage 2 Lv 7 (team Lv 5) (team size:3) | 400 | 42 (28) | 29 (47) | 61 (32) | 66 (31) |
| glacia | stage 2 Lv 8 (team Lv 5) (team size:3) | 400 | 40 (28) | 35 (52) | 63 (33) | 67 (32) |
| glacia | stage 2 Lv 7 (team Lv 7) (team size:3) | 400 | 22 (27) | 24 (48) | 45 (33) | 58 (32) |
| glacia | stage 2 Lv 8 (team Lv 7) (team size:3) | 400 | 32 (28) | 25 (50) | 51 (33) | 63 (33) |
| glacia | stage 2 Lv 7 (team Lv 5) (team pick:0.5) | 400 | 66 (30) | 39 (62) | 70 (34) | 74 (32) |
| glacia | stage 2 Lv 8 (team Lv 5) (team pick:0.5) | 400 | 68 (30) | 40 (64) | 78 (33) | 76 (33) |
| glacia | stage 2 Lv 7 (team Lv 7) (team pick:0.5) | 400 | 46 (32) | 30 (61) | 61 (35) | 64 (33) |
| glacia | stage 2 Lv 8 (team Lv 7) (team pick:0.5) | 400 | 51 (31) | 34 (64) | 71 (34) | 71 (33) |
| glacia | stage 2 Lv 7 (team Lv 5) (team size:3,pick:0.5) | 400 | 76 (25) | 48 (58) | 84 (27) | 82 (27) |
| glacia | stage 2 Lv 8 (team Lv 5) (team size:3,pick:0.5) | 400 | 80 (25) | 53 (55) | 87 (25) | 87 (26) |
| glacia | stage 2 Lv 7 (team Lv 7) (team size:3,pick:0.5) | 400 | 63 (26) | 41 (58) | 72 (29) | 77 (28) |
| glacia | stage 2 Lv 8 (team Lv 7) (team size:3,pick:0.5) | 400 | 67 (26) | 44 (58) | 83 (27) | 80 (28) |

### A7. After: the rebuilt copy (Wren 5, Glacia 1, Blaze 5, Coral 8), no override, 400 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| wren | stage 1 Lv 4 | 400 | 59 (25) | 24 (53) | 73 (28) | 71 (28) |
| wren | stage 1 Lv 5 | 400 | 64 (25) | 29 (52) | 75 (28) | 77 (29) |
| wren | stage 1 Lv 6 | 400 | 67 (24) | 30 (57) | 81 (28) | 82 (27) |
| wren | party s1:5,1:2x5,1:2x5 | 400 | 32 (22) | 7 (36) | 48 (25) | 43 (25) |
| glacia | stage 2 Lv 7 | 400 | 46 (33) | 34 (61) | 64 (37) | 71 (36) |
| glacia | stage 2 Lv 8 | 400 | 49 (33) | 39 (60) | 68 (37) | 70 (36) |
| glacia | stage 2 Lv 9 | 400 | 57 (33) | 41 (56) | 72 (37) | 77 (35) |
| glacia | stage 2 Lv 10 | 400 | 67 (32) | 44 (59) | 78 (34) | 80 (35) |
| glacia | party 2:8x10,1:8x10,1:8x10 | 400 | 39 (33) | 31 (57) | 58 (37) | 70 (35) |
| blaze | stage 2 Lv 9 | 400 | 53 (36) | 20 (68) | 77 (39) | 76 (40) |
| blaze | stage 2 Lv 10 | 400 | 62 (36) | 22 (67) | 78 (38) | 81 (39) |
| blaze | stage 2 Lv 11 | 400 | 65 (37) | 32 (67) | 86 (37) | 83 (40) |
| coral | party 3:12x10,2:12x10,2:12x10 | 400 | 62 (39) | 27 (67) | 68 (43) | 72 (42) |
| coral | stage 3 Lv 12 | 400 | 67 (38) | 31 (67) | 77 (41) | 77 (41) |
| coral | stage 2 Lv 12 | 400 | 18 (38) | 5 (55) | 41 (42) | 48 (45) |
| wren | stage 2 Lv 12 | 400 | 100 (19) | 94 (40) | 99 (21) | 99 (20) |
| glacia | stage 2 Lv 12 | 400 | 77 (32) | 51 (64) | 83 (36) | 87 (34) |
| bram | stage 2 Lv 12 | 400 | 74 (39) | 53 (62) | 86 (42) | 90 (41) |
| kiki | stage 2 Lv 12 | 400 | 69 (26) | 26 (52) | 82 (27) | 80 (30) |
| blaze | stage 2 Lv 12 | 400 | 72 (35) | 29 (70) | 84 (37) | 80 (38) |
| coral | stage 2 Lv 12 | 400 | 21 (38) | 5 (52) | 45 (44) | 48 (45) |

### A8. Verb variant (throwaway build, first-guess levels): every vcd x0.5, 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) | smart: win-mash, time/mash | smart2 | wheel |
|---|---|---|---|---|---|---|---|---|---|
| wren | stage 2 Lv 12 | 200 | 99 (18) | 98 (29) | 97 (21) | 100 (21) | -1, 1.61x FAIL | -2, 1.17x pass | +1, 1.17x pass |
| glacia | stage 2 Lv 12 | 200 | 46 (33) | 52 (74) | 68 (40) | 78 (39) | +6, 2.24x FAIL | +22, 1.21x pass | +32, 1.18x pass |
| bram | stage 2 Lv 12 | 200 | 82 (39) | 69 (70) | 86 (42) | 91 (44) | -13, 1.79x FAIL | +4, 1.08x pass | +9, 1.13x pass |
| kiki | stage 2 Lv 12 | 200 | 69 (25) | 63 (58) | 87 (27) | 77 (29) | -6, 2.32x FAIL | +18, 1.08x pass | +8, 1.16x pass |
| blaze | stage 2 Lv 12 | 200 | 32 (38) | 38 (71) | 67 (42) | 60 (44) | +6, 1.87x FAIL | +35, 1.11x pass | +28, 1.16x pass |
| coral | stage 2 Lv 12 | 200 | 9 (35) | 9 (77) | 45 (46) | 43 (50) | +0, 2.20x FAIL | +36, 1.31x FAIL | +34, 1.43x FAIL |

### A8. Verb variant (throwaway build, first-guess levels): OPEN_MUL 2.0, 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) | smart: win-mash, time/mash | smart2 | wheel |
|---|---|---|---|---|---|---|---|---|---|
| wren | stage 2 Lv 12 | 200 | 98 (19) | 90 (47) | 99 (21) | 99 (20) | -8, 2.47x FAIL | +1, 1.11x pass | +1, 1.05x pass |
| glacia | stage 2 Lv 12 | 200 | 51 (33) | 34 (63) | 77 (37) | 71 (35) | -17, 1.91x FAIL | +26, 1.12x pass | +20, 1.06x pass |
| bram | stage 2 Lv 12 | 200 | 70 (40) | 53 (57) | 90 (40) | 91 (39) | -17, 1.43x FAIL | +20, 1.00x pass | +21, 0.97x pass |
| kiki | stage 2 Lv 12 | 200 | 68 (27) | 26 (51) | 79 (27) | 86 (28) | -42, 1.89x FAIL | +11, 1.00x pass | +18, 1.04x pass |
| blaze | stage 2 Lv 12 | 200 | 42 (38) | 6 (60) | 65 (40) | 66 (40) | -36, 1.58x FAIL | +23, 1.05x pass | +24, 1.05x pass |
| coral | stage 2 Lv 12 | 200 | 7 (35) | 1 (46) | 40 (41) | 44 (42) | -6, 1.31x FAIL | +33, 1.17x pass | +37, 1.20x pass |

### A8. Verb variant (throwaway build, first-guess levels): every vcd x0.5 and OPEN_MUL 2.0, 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) | smart: win-mash, time/mash | smart2 | wheel |
|---|---|---|---|---|---|---|---|---|---|
| wren | stage 2 Lv 12 | 200 | 99 (19) | 97 (30) | 98 (20) | 100 (21) | -2, 1.58x FAIL | -1, 1.05x pass | +1, 1.11x pass |
| glacia | stage 2 Lv 12 | 200 | 35 (34) | 49 (69) | 78 (36) | 79 (34) | +14, 2.03x FAIL | +43, 1.06x pass | +44, 1.00x pass |
| bram | stage 2 Lv 12 | 200 | 79 (38) | 67 (73) | 91 (40) | 93 (42) | -12, 1.92x FAIL | +12, 1.05x pass | +14, 1.11x pass |
| kiki | stage 2 Lv 12 | 200 | 69 (26) | 64 (58) | 86 (25) | 82 (27) | -5, 2.23x FAIL | +17, 0.96x pass | +13, 1.04x pass |
| blaze | stage 2 Lv 12 | 200 | 38 (38) | 42 (70) | 64 (41) | 76 (41) | +4, 1.84x FAIL | +26, 1.08x pass | +38, 1.08x pass |
| coral | stage 2 Lv 12 | 200 | 5 (35) | 12 (81) | 40 (42) | 52 (44) | +7, 2.31x FAIL | +35, 1.20x pass | +47, 1.26x pass |

### A8. Verb variant (throwaway build, first-guess levels): every vcd x0.25, 200 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) | smart: win-mash, time/mash | smart2 | wheel |
|---|---|---|---|---|---|---|---|---|---|
| wren | stage 2 Lv 12 | 200 | 98 (20) | 97 (27) | 99 (21) | 99 (22) | -1, 1.35x FAIL | +1, 1.05x pass | +1, 1.10x pass |
| glacia | stage 2 Lv 12 | 200 | 45 (34) | 63 (56) | 71 (39) | 77 (40) | +18, 1.65x FAIL | +26, 1.15x pass | +32, 1.18x pass |
| bram | stage 2 Lv 12 | 200 | 75 (40) | 83 (60) | 88 (44) | 90 (42) | +8, 1.50x FAIL | +13, 1.10x pass | +15, 1.05x pass |
| kiki | stage 2 Lv 12 | 200 | 68 (26) | 79 (42) | 87 (28) | 79 (32) | +11, 1.62x FAIL | +19, 1.08x pass | +11, 1.23x pass |
| blaze | stage 2 Lv 12 | 200 | 40 (38) | 59 (64) | 68 (43) | 69 (44) | +19, 1.68x FAIL | +28, 1.13x pass | +29, 1.16x pass |
| coral | stage 2 Lv 12 | 200 | 8 (36) | 24 (61) | 47 (46) | 48 (48) | +16, 1.69x FAIL | +39, 1.28x pass | +40, 1.33x FAIL |

### A9. The Watch, 100 fights

| leader | party (and team) | fights per bot | mash win % (mean s) | smart win % (mean s) | smart2 win % (mean s) | wheel win % (mean s) |
|---|---|---|---|---|---|---|
| floor:5 | stage 3 Lv 14 | 100 | 99 (28) | 94 (35) | 100 (31) | 96 (31) |
| floor:10 | stage 3 Lv 14 | 100 | 89 (39) | 92 (44) | 95 (38) | 96 (39) |
| floor:15 | stage 3 Lv 14 | 100 | 90 (45) | 99 (53) | 98 (47) | 98 (46) |
| floor:20 | stage 3 Lv 14 | 100 | 30 (45) | 52 (49) | 62 (54) | 74 (54) |
| floor:5 | stage 3 Lv 18 | 100 | 99 (27) | 98 (35) | 100 (30) | 98 (29) |
| floor:10 | stage 3 Lv 18 | 100 | 98 (36) | 100 (44) | 95 (37) | 98 (37) |
| floor:15 | stage 3 Lv 18 | 100 | 96 (42) | 99 (52) | 97 (43) | 100 (42) |
| floor:20 | stage 3 Lv 18 | 100 | 57 (51) | 54 (50) | 71 (54) | 84 (52) |
