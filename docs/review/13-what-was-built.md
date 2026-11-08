# What was built in the review copy (Nov 8 2026)

The copy is `src/world-rev/`, built to `games/critter-roll-review/index.html`. The shipped game (`src/world/`, `games/critter-roll/`) is untouched.

## How it was built
Four builders worked in parallel from `12-build-plan.md`: sound (S), world and what is seen (W), mechanics and economy (M), the road, the ending and the day (R). All four were stopped twice by usage limits; their work was saved as it stood and merged in that order. Twenty-four conflicts were resolved by combining both sides, with the plan's ownership: M owns numbers, W layout, S sound, R the road and its words. Only S finished its notes (`changes-S.md`); W, M and R stopped before writing theirs. The words pass (package T, item 17/23) was not started.

## Verified by playing it (bots and probes, real time)
- The opening with real defaults: the critter by the door is fought, sits down at 0 HP, and is kept by standing beside it; the first keep at 31.6 s (it was 9.6 s with the orb). The bot then reaches Moss Forest, wakes the sparkling patch, and stands at Wren's door 25 s later. No page errors.
- Four seals and no lamp: the window at Home is dark (the night of darkness).
- The great lamp, with the three lamps below kept: no action label; standing still beside it, the glow rises over six seconds and the lamp is lit at 5.9 s; essence unchanged; no toast of its own; one line, "The glass is warm."
- The sound package's own probe (43 checks, `probe-S.py`, before the merge): halls play their city, leaders the trial track, silence on the title and before the great lamp, the lit arrangements by flag, Coral's five pitches.

## The full suite against the copy: 93 tests, 75 pass, 18 fail
None of the 18 shows a crash in the game (no page errors). Each fails because it asserts the old behaviour the review changed on purpose; each needs its check rewritten, not the game:
- No orbs for wild critters any more (keep by staying): `acttest4`, the old `openingtest` bot (fixed here: the bot now stays; its only remaining failure is Fern's new lines).
- Gates by seals instead of levels for new saves: `balancetest`, `p14`, `p15`, `slagtest` (they travel on levels).
- The bed tended by staying, no Tend button: `gymtest`. Blaze's fire lasts 18 s: `gymtest2` (its 15 s check).
- The great lamp is a stay (`GL`), the crown a stay, Wickling on the sill: `lamptest`, `wicktest`, `secrettest`.
- The window lit by staying after the lamp, no title toast: `keeptest`.
- The `#tip` removed from the first minute: `wplay`.
- The Watch's loss keeps the night (no "Rest outside" dialog): `acttest5`; the door opens for any save that has kept a night: `hallstest`.
- The Arena's day stamped on the win: `arenatest`. The verbs no longer block the slash: `verbtest`.
- A new save field (`act.tx`, trainer XP after the rolls): `roundtriptest` expects the field set as written.

## Not done
- The words pass (02's thirty lines, the widened `telltest`), and W's, M's and R's notes files.
- Rewriting the 18 tests above, and the sims for the leaders' new levels (Wren 6, Glacia 5, Blaze 11, Coral 12 are first guesses, not simmed).
- Everything only a phone can judge: every stay's length, the keep at 1.5 s mid-fight, the dark window reading as loss and not as a bug, the sound.
