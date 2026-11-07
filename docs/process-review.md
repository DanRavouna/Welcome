# The process, as the record shows it: knowledge to review

Status: for Dan to read and correct (Nov 7 2026). This is not the process defined. It is what the record says actually happened when Critter Roll was made, stripped of the game, so that the process can be talked about on evidence. Dan's words are quoted exactly as typed. "Implied" marks a reading the record supports but nobody stated.

Sources, all read in full: the eight Claude Code sessions (Nov 3 to Nov 7), the handoff archive (the record of the claude.ai era before Nov 3, whose chats do not survive), the current handoff, the standing rules, the commit history, the code and the tests. The full extraction per source is in `docs/process-notes/` (five files, about 15,000 words); this document is the synthesis.

---

## 1. The record in one page

The game was made in three eras.

**Era 1, claude.ai (before Nov 3).** The game began as a canvas prototype, then a world of five generated maps. The first content was mechanics and numbers: rolls per day, keep costs, an XP table, gates, simulated win rates. Critters were generated from a seed; maps from configs; music from note strings. Then an endgame (a tower tuned by simulation, shinies, titles), then an expansion (four cities on one street plan, four routes on one recipe, interiors from three layouts). Story was a set of NPC lines and a conquest spine. There was no stated theme. The era ended "Waiting on Dan's phone playtest + stats" with a menu of candidate features.

**Era 2, Claude Code, Nov 3 to Nov 5 morning: accretion.** The AI proposed numbered lists, Dan said "y", "go", "whatever you think is best", one item was built, tested, pushed, reported, and the next proposed. Weather, abilities, landmarks, ambient life, dungeons, climbs, secret critters, dev tools, a real-time battle screen (thrown away), action mode in six phases, VFX, orbs, branching routes without an arrow, a painted map. Dan's input was selection, veto, taste feedback from the phone, and one-line steers. Meaning was absent or decorative. "Hint, never tell" existed as a tone rule and produced unexplained things with no payoff.

**Era 3, Nov 5 11:31 onward: meaning, then propagation, then "play".** After rejecting a terrain-noise pass ("you are following them but do not grasp the spirit behind them"), Dan wrote the metaphor message. The AI read every line of text already in the game, found a theme in it, Dan confirmed and sharpened it in one sentence, and the rule went into the standing rules before any code. Propagation ran cheap to expensive: words, then light and placement, then motion (wind), then sound, then mechanics (gyms as trials, lamps you keep, the ending as a daily act, one verb per type), then sequence (the player's road, fourteen stations, the opening rebuilt). On Nov 6 Dan tightened the rule to "hint and play the metaphore, dont tell it", which sent the AI back to audit everything built under the looser rule. Nov 7 morning: Arena rebuilt four times in seventy minutes, Dan "frustrated", method changed to one question at a time. Nov 7 14:03, Dan: "this project has reached his limit, the structure is too confusing and the scope too large".

---

## 2. Dan's principles, in the order they were set

These are the statements that changed how the work was done. Each is quoted exactly.

1. **Trust and scope, Nov 3 to 4.** "Dont worry i trust you, give me a plan for the next steps, we should aim at having an adventure!" / "Creation starts where expectation ends" / "keep in mind that we re gonna do more cities and routes in the future so it s nice to think of environnments as building blocks reusable".
2. **Trust the player, Nov 4.** "No objective arrow, the player will explore on it s own, we must trust our players to be intelligent persons !"
3. **Mystery as hinting, Nov 4.** "Try to be not straightforward sense of mystery is based on hinting but never telling so that the player can project himself".
4. **Spirit over instruction, Nov 5.** "I feel i ve given you too many instructions for the level design, hence you are following them but do not grasp the spirit behind them, keep it as is but review it and fix the issues you find as you see fit".
5. **Metaphor, Nov 5 (the turning point).** "Humans functions in metaphores, symbolics / Meaning that each level has to mean something and that the game itself has a greater meaning / The game is the greater meaning, the quest under it a meaning included in the greater and each level it s own meaning included in the quest".
6. **The ending sharpened, Nov 5.** "I think you become the one who keeps it means that you dont need someone to keep it for you anymore".
7. **Symbol per place, Nov 5.** "keep the symbolic theme of each place, the winds symbolize change for example, but they dont fit in the cold where it symbolises stillness".
8. **Trials, not locks, Nov 5.** "the gyms should be a trial, with a puzzle themed to the path of the player aka the theme, and the meaning of the type of the gym".
9. **Play, not tell, Nov 6.** "I d like to change a key concept, it s not hint dont tell / It s hint and play, dont tell / And in a wider sense / Hint and play the metaphore, dont tell it".
10. **The whole, Nov 6.** "play doesnt apply only to the mechanic it applies to every element, the level design, the colors, the sounds, a game is a whole and playing it means experimenting all of it s elements at once, and they must convey a similar intent".
11. **The hint introduces, Nov 6.** "each metaphor must be introduced first, for example a title screen is the introduction to the experience as a whole, a hint is used so that where the player is encountering the metaphore he somewhat already encountered it before, ambiance can be a hint before a key moment".
12. **Define the path first, Nov 6.** "the player path must be defined before going forward in order to structure the experience".
13. **The first minute, Nov 6.** "rn most players loose interest after a minute of playing, the initial direction is difficult to feel".
14. **Show, don't label, Nov 7.** "remove all of the words above the buildings and replace them with symbolic marks ... no need to tell what it is".
15. **The limit, Nov 7.** "this project has reached his limit, the structure is too confusing and the scope too large, however we should salvage as much as the engine as possible, through this process i understood that the websitr approach is great, also we need a better engine editor".
16. **Today, Nov 7.** "making art is made for the purpose of showing ... the purpose of that expression was absurd, and to show the disconnection between our understanding and what llms can ouput" / "we have something, not the game itself but the process" / "meaning should be defined first, this is one of our mistakes, this is why we couldnt go forward" / "we should start w defining the ending first then figuring out how we get there" / "what we stated today is just a theory".

Two other statements of principle sit outside the main line and are worth keeping: Dan wrote one meaning sentence himself, for a multiplayer feature that does not exist ("even if we carry our own light, we all look for it at the same time"), and let it stand in tension with his taste for ambushes. And on tests: "the tests take like 10 mins so we re still missing some issues", reading a slow suite as a coverage gap rather than a cost.

---

## 3. Creation: how things came into being

**The pattern across all three eras.** Input was almost always a one-line wish or a pick from an AI-written list. The AI measured first (read the code, ran a sim, counted tiles), proposed a plan with numbers, built, tested, pushed, and reported with a "not verified" list. Dan judged the result on his phone. The order of parts inside a thing was nearly always: data rule or numbers, then mechanism, then art, then words, then tests. Meaning, when it existed, came last or not at all until Era 3; after Era 3 it came first as one sentence in the handoff before any code, by rule.

**Generated by rule versus designed by hand.** Rule: all 48 critters, their evolutions and eight facings, every map's terrain, three of four cities on one plan, four routes on one recipe, interiors from three layouts, music from note strings with night versions derived, VFX frames, props placed by nearest legal spot. Hand: three dungeon layouts, the secret critters, the twelve city rooms (Nov 6), the gym trials, the signature objects, the NPC lines. The hand-made share rose sharply only after meaning entered. The level-design review admitted why: "every side map was the same recipe, an open meadow with one wandering trail", and terrain noise varied "the look but not the meaning".

**What generation bought and what it cost.** It let one intent apply to a whole world at once, and it meant art never gated a build. It also meant every picture, map and critter was a program, so every visual change was a code change, two palette tables grew, and the content could not be handed to anyone. The engine survey counts the seams: the only true data file today is the map-edits patch, which is empty. The formats are right (character grids, specs, note strings, NPC literals); they just live inside the code.

---

## 4. Iteration: what triggered revision

In order of frequency, implied from the record:

1. **Dan playing on the phone and naming a sensation, not a cause.** "every entity started shaking uncontrolably", "the trees go really fast then slow down", "the animations moves too much", "it makes it diffcult to aim", "Unusable the map covers almost the whole screen". Every one of these was on something the AI had already reported as done.
2. **Dan's verdict on a screenshot or against a reference.** The overview map rejected on sight ("the whole map should be obvious in less than a second"); evolutions "just bigger versions"; the Lab "looks like theres a face stuck to it".
3. **The AI's own tests and bots.** A forced path over glowing moss, the wrong object under the action button, a bed placed in the only clearing, a name collision that silently turned off the lantern road, untuned bosses the bot beat every time, a wind pose that jumped.
4. **A principle applied backwards.** The tell lint found people reciting signs; the road audit found the opening and ending "told"; "hint and play" sent the first gym back.
5. **Snapshot diffs read before acceptance.**

**Things that took several passes.** Wind, six passes in one evening, each from a phone observation, each only visible in motion. The first gym, twice in five hours ("It was a lock, not a trial"). The Lamp Tower, twice (a lever puzzle with a proof of solvability, replaced by lamps you stay beside). The Arena, four times in seventy minutes, ending in "I am frustrated" and "Ask one question at a time". Combat, four systems over the project. Guidance, three times (arrow, words, nothing). Tests, five rounds.

**The recurring "not verified".** Nearly every report ended with the same list: feel on a phone, tempo, whether a hint is noticed, whether a puzzle is fun, whether melodies are good, balance against real play. The AI's admissions are explicit: "Only screenshots, enlarged sprite strips and numbers. I can't watch video or judge how motion feels"; "I'd be inventing the theme if I named it". Dan's play lagged far behind the build: his first three days were about 2.5 hours, level 6, two seals, no tower, no secrets, against a world of three dungeons, two climbs, a tower and four routes. Nobody has yet played the revamp through.

---

## 5. Meaning: when it entered, how it travelled, what resisted

**Entry.** Nov 5, 11:31. The meaning was recovered from what already existed, not set. The AI read the text already in the game (an empty ninth seat, lamps kept dark "until someone proves they can carry its light", a second cup, a new rope) and proposed "home is something someone keeps lit for you, and the journey ends when you become the one who keeps it". Dan sharpened it to independence. The handoff records it plainly: "Dan confirmed this reading of the existing text (he did not write the theme himself)".

**Propagation, cheap to expensive.** Words with mechanics frozen ("Words and tips only: no price, reward, rule or balance changed"). Then one signature object per place. Then ambiance: wind per region, the cold at zero, snow straight, smoke where a fire is kept. Then sound: an audit of tempo per region, night arrangements, a silent title "so the first sound of the game is one you caused". Then mechanics, only after "hint and play": a seedling that grows while you stay, ice that forms while you stand still, lamps you keep, nights you last, a rare thing that comes to the one who stays, a verb per type from the place's own metaphor. Then sequence: the player's road, fourteen stations each marked told, hinted, played or introduced and played, and the opening rebuilt so the first minute plays being kept.

**What resisted.** Pure counters and pure text (the tower as floors, weather trivia, clue-givers as exposition, two of these still open). Generated sameness, until hand features were added. Scaffolding that had to be withdrawn without looking like a bug. The daily loop, which had no sentence until late and was left alone by rule. Balance: verbs that control space broke the duel tuning and the bot "can't value it". A sharpened theme invalidated an earlier correct metaphor (posts that lit ahead of you became posts you light).

**Testing Dan's two conclusions against the record.**

(a) "meaning should be defined first, this is one of our mistakes, this is why we couldnt go forward". The first half is supported plainly: meaning entered after the whole content base, as a reading of it, and the cost is the list in section 6. The second half needs a sharper wording. The record does not show the project stalling after meaning entered; the 48 hours after it are the densest in the history and thirteen of fourteen stations reached "introduced and played". What the record shows is that before meaning nothing could be judged (feature accretion steered by play complaints), and that the structure built before meaning (content as code, generated sameness, four combat systems behind switches) is what Dan named on Nov 7 as "too confusing and the scope too large". Implied: late meaning did not stop the work; it made the work that came before it unjudgeable and the structure that carried it unsalvageable except as an engine.

(b) "we should start w defining the ending first then figuring out how we get there". Supported, with one qualification. The ending was the last place to get meaning: the tower was built as a conquest ladder tuned by simulation, the first meaning draft listed it "unresolved", and the ending station was built only on Nov 6. The rule "the hint introduces" is structurally backwards: the road's "introduced by" column can only be filled once the later station is known, which is why several stations were "no intro" until something was added before them. The qualification: the first thing that failed with real players was the opening ("most players loose interest after a minute"), and it was fixed last. Implied: both ends needed defining before the middle. The ending gives the metaphor its answer; the opening gives the player a reason to walk toward it; the stations between are placed relative to both.

---

## 6. Dead ends and what each taught

- **Real-time battles on a separate screen.** Built from "is it hard?" and "Go for it !"; Dan meant something else. A yes to a question is not a specification.
- **Overview map v1.** Rejected against a reference. A reference image is a better brief than a paragraph.
- **Terrain noise as level design.** Varied the look, not the meaning. Generation cannot supply what no one has said.
- **"Hint, never tell" as a tone rule.** Produced oddities with no payoff; superseded by meaning, then by "hint and play". A rule about tone is not a rule about what the player does.
- **The first gym and the lever puzzle.** Correct, solvable, themed, and meaningless. The proof of solvability was spent on the wrong design. The act must be the meaning.
- **Posts lit ahead of you.** Right under one reading of the theme, wrong once the ending was sharpened. The ending decides the metaphor's direction.
- **Three wind mistakes**, each invisible in stills. Anything animated must be judged in motion, and feel still needs a human.
- **The Arena, three wrong versions from one-line briefs.** The AI: "I kept guessing from one line and rebuilding". The fix was a question at a time before building.
- **Switches, toggles, scaffolding** (experimental modes, the follow setting, the shrine, daily quests, badges, the turn-based screen). A switch exists to make a decision and should go when it is made. Three combat systems coexisted behind switches until Dan called one definitive.
- **Print-only tests.** 69 of 72 could not fail. A pass must mean something; proven afterwards by injecting bugs and seeing what stayed green.
- **RPG Maker.** An editor bought at the price of the game. Ask what is wanted from the tool before weighing the tool.
- **Patching generated maps.** The editor "only works because it paints the grids that file generates". An authoring tool over generated content exposes the code as the real problem.
- **Submit from a hosted page.** Three layers of plumbing, the last unfixable. Verify the account side before building a one-button publish.
- **The editor "never on main".** Rebase conflicts within the hour. Separation by branch is costly when both sides move.

---

## 7. What the tools made possible

From the engine survey, the parts that were load-bearing for the way the game got made, and that any future engine should design in rather than grow by accident:

- **A test API the bots drive.** Input as a vector plus a step function, position, solidity, nearest object, a pose number per animated thing, a dialogue advance. Without these no bot, no rhythm test and no first-minute measurement exists. They grew as ad-hoc globals and shipped to players.
- **Snapshots with masked numbers, one retry with a flaky label, explicit checks, and the habit of breaking things on purpose.** Cheap, generic, and the only reason the AI could change thousands of lines a day without a human playing.
- **Everything as data in the end.** Character grids with places, objects, signs and exits; dungeon rows; specs; constants; note strings; NPC literals. The formats are right; reading them from files is the small step not taken.
- **The meaning lint** and the "Meaning:" comment on 43 places in the source. Make it a first-class field of content, not a comment.
- **Local-first saves with a field-preserving merge and a cloud lease.** The rule "never break existing progress" held because of this.
- **The single file, the committed build, and the "data change triggers rebuild, smoke test, deploy" loop.** This is the shape a designer-assets workflow needs, generalised from one file to a folder.
- **Balance simulators that run the real code.** Every number was tuned before anyone played, and designs that were trivially winnable or strictly worse were caught.

Accidents not to carry over: procedural art and maps as the source of truth; critters as geometry rendered twice; the UI file holding menus, trial state machines and NPC content together; the world file holding engine and content together; a hand-maintained save field list; test hooks in the shipped game.

---

## 8. What a designer hands over

This morning's session already wrote a first answer, as format v1 on the editor branch. It is a draft, not a decision, and it was written before today's conversation.

- **Maps**: one JSON file per map. Size, a grid of single letters, a palette and theme, buildings with a door and the room they enter, props by name, edge exits with arrival spots, a spawn. Rooms are maps with an interior flag.
- **People**: id, position, look (a palette over one body), facing, lines, and a condition on flags so one person can have several states.
- **Events** (planned, not built): a list of step cards with fixed fields and no syntax: say, choice, set flag, if, jump, teleport, move, face, wait, open, show, set tile, music, time, sound, end. Dan chose form-based steps over typed commands.
- **The test of data-ness**: every map survives a JSON round trip and holds no functions.
- **What stays code**: the hooks the game passes into the engine (combat, object art and light, drawing layers); a new region is a palette entry plus a preset; a new look is drawing work.

What format v1 does not have, and today's conversation says it must: a place for the meaning sentence, the ending, and the road. Today the meaning lives in a handoff section and a comment convention. If the road is "the structure every change hangs on", the engine should hold it as data too: the sentence, the ending, the stations, and for each station what it means, what introduces it, and what the player does that carries it. Then the lint, the tests and the editor can all read it.

---

## 9. Where the repository stands tonight

Two lines of work now diverge and one decision is needed before either goes further.

- **main** has the shelf: the root page lists the games as cartridges, Critter Roll is the first box, the built game lives under `games/critter-roll/` with its vendored library, the full suite passes (88 tests), and the Pages deploy succeeded. The label art is a placeholder until Dan draws one.
- **Branch `ccr-ba942712-iblggt`** (this morning's session) has the engine cut out of the game into `engine/`, the old game frozen under `legacy/`, an empty `next/` game with placeholder maps, a whole-map editor, format v1, a plan at `docs/next-plan.md`, milestones 1 to 4 of 6 done and proven against the old suite. It also carries Dan's decision from this morning to "Freeze and hide" the old game and to put the editor on its own branch, both of which today's conversation changed (Critter Roll is now shown in a box, not hidden).

The two cannot both be true of the site. The reconciliation is not large but it is a decision: most likely the shelf stays at the root, the engine, editor and `next/` come to main under their folders, and `legacy/` becomes `games/critter-roll/` so the first cartridge keeps playing. Nothing of that is done yet.

---

## 10. Questions for the process conversation

These are the places where the record does not settle what the process should be. They are listed, not answered.

1. **Who writes the sentence.** In Critter Roll the AI found the theme and Dan confirmed it. Today Dan said meaning comes first. Does the designer write the sentence and the ending alone, or is reading-back-and-sharpening part of the method?
2. **What "the ending first" means in practice.** A sentence about what the player has become, a last act the player performs, a last image, or all three? And is the opening defined at the same time, since it was the first thing to fail?
3. **How a station is specified before it is built.** The road table used meaning, introduced by, status. Is that the unit of design, and does the designer fill it or the implementer?
4. **Where generation belongs now.** With Dan making the assets, generators become validators and placement helpers. Is any generation still wanted (wind, weather, music variations) and under what rule?
5. **How feel gets judged.** The AI cannot, and Dan's play lagged the build by days. Is a play session per milestone part of the process, and what does the AI measure in its place (the bot's first minute, real-time logs)?
6. **What a revision costs.** The Arena took four tries from one-line briefs; the wind six from phone observations. Is "one question at a time before building" the default, or only after a miss?
7. **What is a dead end worth.** Several things were built correctly and thrown away for carrying nothing. Is building-to-find-out part of the method, or a failure of the method?
8. **The shelf.** It is the showing. What does a cartridge need to carry (a record, a year, a sentence?) for the showing to be honest about what each game was?

---

## 11. Dan's answers (Nov 7, evening, one question at a time)

Recorded as given. They are inputs to the process conversation, not the process.

1. **Who writes the meaning and the ending:** Dan writes the first version; I read it back in my words and propose sharpenings; Dan decides.
2. **What "the ending first" contains:** the last act only, what the player does at the end. The opening is worked out afterwards as the road is built backwards.
3. **The unit of design:** the station (meaning, hint, the act the player performs). Dan fills it, and will ask me questions as he goes.
4. **Generation:** I generate placeholders; Dan replaces them with his assets.
5. **Feel:** Dan plays in batches; corrections come back together.
6. **How a revision starts:** I ask questions until I can say back what he wants; no rebuild before he confirms.
7. **Building to find out:** part of the method for placeholders only; nothing finished is built before its station is filled.
8. **The engine branch from this morning:** dropped. Its plan and format v1 are kept under `docs/engine-branch-notes/`; the branch tip is kept as the tag `archive/engine-cut-nov7`. The engine starts fresh later, after the process is defined.
9. **The shelf:** a cartridge carries number, name, year and record, as now. The game speaks for itself once opened.
