# Space Cube: what Dan has decided

These came out of long back-and-forth. Do not reopen them without asking him. Quotes are his.

## Working with Dan
- He reads on a phone. Lead with the answer, keep it short, plain words. He often replies "Simpler".
- When you are unsure what he means, **ask before building**. ("So not really, ask questions", "I feel confusion ask questions".) A mockup first is welcome for anything visual.
- He answers "Y" to go ahead. "Dont start" means give ideas only.
- Never guess a number or a fact. If you do not know, say so. Real-world data must come from a reputable primary source, checked in the session (NASA, JPL, CDS).
- Never claim something was verified on the phone. You cannot see the phone.
- "When i say update a file, i mean i want you to output a file for me to integrate."
- Fix things for the whole game, never for one case. ("Are you hard fixing only the solar system or is this applying to the whole game ?")

## The game
- **Where you are** = a place (a star system or a landmark) + in a star system, the planet you are at, or the star itself. Home is Saturn in our system. Nothing else is special about it.
- **A jump to a star lands at the star**, for every star, ours included (2026-11-24: "when jumping to sol it should go to the sun not saturn", then "Y" to every star). From the star you jump on to its planets. The star is a body of its system like a planet: tagged, locked on and jumped to the same way.
- **Warp range**: you can jump to stars within 20 ly of where you are. Our own system and the landmarks can be reached from anywhere.
- Stars beyond 20 ly are plain dots: no tag, cannot be tapped. ("If the name tag is dimmer i can still see it !": a dimmed tag still counts as seen, so far stars get no tag at all.)
- **Sizes in the sky are real** ("Real sky sizes"), with a smallest dot of 9 px.
- **Sky scale (decided so far, 2026-11-24/25, paused by Dan)**: warpable stars can all be one size: they are far by concept. Showing distance through size is for flights only (bodies you fly to). Numbers agreed earlier, kept in `skyScale` in `tools/catalog-hand.json`: closest point 50 px at full brightness; star at 20 ly 5 px at 80%; between them a curve 70% straight line + 30% exponential. Not built.
- **The bodies of the system you're in** (planets) are the exception, chosen 2026-11-24 ("D"), because nearly all are far under a pixel and looked alike: their dot follows their real sky size compressed (6 to 84 px on a log scale, real order kept; real size beyond 84 px; calibrated so Jupiter seen from Saturn is about 74 px: "Jupiter size should be 5 times", "the user must really see it if it's that close"), and their brightness follows the light they really send you (star light, distance, size, albedo).
- Every star system shows its star and its planets on their orbits; you can see, lock on and jump between them. The same for our system and all others ("Uniformize all planets").
- **Warp visuals**: a route line is drawn, also for far jumps. Far jumps hold in hyperspace 2 to 4 s by distance ("to show we re traveling far"): dense blue-white streaks over a dark veil, a small glow where you're heading. No white light (2026-11-24: "it hurts the eyes"; his reference: a classic hyperspace star-streak picture). On arrival the target starts at the size it had on screen before the jump and only grows. The sky picture of a landmark cross-fades into its 3D close-up.
- Ships and squadrons are left behind when you warp. They steer around the whale and each other.

## The calendar (2026-11-26)
- Tap the clock to open it, tap again to close it; no close button. The screen reload is its own button in Settings.
- It lives in the wake-up / sleep window: the same window, the same opening (the ship's line, full width, then splitting and narrowing) and closing (folding into a line that leaves with sparks).
- Opens on Month at today, with the chosen day's events below. WEEK / MONTH / YEAR switch; the arrows move by month, week or year; in YEAR a month opens it.
- Google and Samsung calendars through Android's calendar store. The add form picks among the phone's calendars that take new events, by their own names and colours (no check on a name), the last used first.
- SEARCH by name through everything the calendars hold; coming up first, then the past. A result opens its day.
- Reminders: 30 min before, 10 min before and at the start. The phone vibrates and the event is drawn in like the wake-up window; if the launcher is not on screen, an Android notification (tapping it opens the reminder), like the checklists. All-day events: once, at the wake-up checklist's time.

## The star map
- "This is only a map not the game." It records and shows; the game is where things happen.
- A place appears on the map as **???** only once its **name tag was shown on screen** in the game (or you locked on to it). It is revealed (name, facts, picture) when you **visit** it. Never seen = not on the map at all. Landmarks follow the same rule.
- Our own system is known from the start.
- **JUMP** on the map works only for places you have visited, and for the planets of a star system you have visited. Never on ???.
- 3D, rotatable, pinch to zoom, more detail as you zoom in (his reference: the Metroid Prime map). Stars are sorted into categories, each with its own icon.
- "Current location" is shown by a small ship. There is no reset button (he asked to remove it).
