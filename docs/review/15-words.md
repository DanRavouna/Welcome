# 15. The words pass (package T, Nov 8 2026)

The review copy only: `src/world-rev/`, built to `games/critter-roll-review/index.html`. The shipped game (`src/world/`, `games/critter-roll/`) is untouched. Branch: `worktree-agent-a8f67f256a5b9b36e` (on top of `review-merge` b6febe6).

Meaning: hint and play, never explain. Every line the player reads either says what a person sees, names a place, or is gone; nobody explains the trial just played, recites a sign, gives a tip, prices the climax or asks for the last act.

Every change is data in `docs/review/words-edits.py` (file, old, new, finding; batch 1 = the findings both directors kept, batch 2 = the optional ones). The table in section 3 is generated from it.

## 1. The lint (`src/telltest.py`, widened per 02-F34)

On the shipped build (no `APP.build`) the test runs the old code path and prints exactly what it printed before: verified by running the old and the new `telltest.py` on the shipped build and diffing the output (identical, `lines read: 502` and the same three `ok` lines), and `run-tests.sh telltest.py` against `src/snap` says `snap=ok`.

On the review build (`APP.build === 'review'`) it reads:
- every string field of every person (`lines`, `intro`, `beatenLines`, `afterLines`, `winLine`, `ask`, `progress(g)` called with the game, `thanks`, `after`, `sealLine`, `notYet`, `tomorrow`, any other), every object's and prop's text, every `M.signs` text;
- `APP.words()` (new, review only): the `SCAFFOLD` and `LETGO` tables, the scripted scenes (`SAY`: Fern, the arch, the beacon door, the great lamp, the ninth seat, the window, the forge door, the furnace, the Watch's Keeper, the city favours, the sockets, the posts), `LIT_LINES` and `WATCH_LINES`;
- every prose string literal in the build's scripts (a small tokenizer that skips comments and regex literals) and every text node, `aria-label`, `title` and `placeholder` in the page.

Checks (review only):
1. nobody recites a sign: the old `TELL` plus `joins`, `They live`, `rarer? critters`, `Shinies are rare`, `opens at (trainer )?level`, `leader of`, `Five ledges`, `zig-zag`, `up the trail`, `climb the Tower`, `it sparkles`, `whole life`, `hit harder`, `Use it any time` (people and scenes; signs have their own check);
2. nobody hands out tips or orders: the old `TIP` plus a line opening with Go/Touch/Open/Climb/Take/Evolve/Keep/Pick (not "Go on", not "Take what"), `Do not touch`, `(then|and) come back`, `get ready`, `Here is your reward`, `must`, `Pick the`, `worth your while`;
3. nothing says the meaning: `because someone|what it is given|left a light on|knew where home was|lit by the one who|wants feeding|tended every fire|you can be trusted|until someone (proves|shows)` over people, scenes, script strings and page;
4. signs name places: no `critters)`, `hide in the tall grass`, `Sparkling grass`, `gym`, `opens at`, `level N`, `nights, one lamp`;
5. no leader or keeper (Wren, Glacia, Blaze, Coral, Maren, Hale, Orlen) has a sentence that starts with Go/Touch/Open/Climb/Take/Light in `winLine`, `afterLines`, `sealLine`, `lines`;
6. none of the retired words is left anywhere in the build (scripts and page): "Go and wake", "Touch the glass", "Show me.", "Prove you", "Somewhere a lever", "+N essence", "You earned N", "Far away, in the old arch", "camp rhyme", "must wake first", "belongs in one of", "refill at midnight", "used up for today", "Leader Seal(s)", "not yet beaten", "Same remedies/goods as", "Progress: ", "Ember beats Moss", type trivia ("Volt critters ride..."), "HP carries over", "Essence is paid", "It never was", "It only waited", "the whole country", "Its light reaches", "Gym"/"gym" in prose, "Enter the Tower";
7. no whole prose sentence has unbalanced parentheses (02-F24);
8. no trainer line is said by more than four people (02-F19);
9. no page errors.

Not added: a name-uniqueness check (02-F31), because the remaining collisions (Tam / Old Tam, Brandt / Brann / Brand, Hal / Hale) live in the protected interiors and the people 02-F39 names.

### Before (the review copy as merged, b6febe6, same lint)

`lines read: 615 | prose strings in the scripts: 1348 | page texts: 67`

| check | before | after |
|---|---|---|
| nobody recites a sign | FAIL 19 | ok 0 |
| no tips or orders | FAIL 26 | ok 0 |
| nothing says the meaning | FAIL 15 | ok 0 |
| signs name places | FAIL 30 | ok 0 |
| no leader or keeper asks for the next act | FAIL 3 | ok 0 |
| no retired words left | FAIL 39 | ok 0 |
| no unbalanced parentheses | ok 0 (package R had already fixed the spent-day toast) | ok 0 |
| no line on more than four trainers | FAIL 1 ("That was a good battle. Come back tomorrow for another." x19) | ok 0 |
| no page errors | ok | ok |

After: `lines read: 678 | prose strings in the scripts: 1326 | page texts: 67` (more lines read because `APP.words()` exists only after the pass).

Everything the lint found before the pass (as printed, cut at 200 characters):

```
tells | town/pip.lines: Did you know? Sparkling grass hides rarer critters.
tells | frost/sola.progress: Still no Stone critter? They live in the tall grass here in Frost Peaks.
tells | moss/oak.lines: Every critter has a nature. Brave ones hit harder but bruise easier.
tells | tide/nell.ask: The waves sometimes wash up rare critters.
tells | tide/nell.progress: Sparkling grass is the best place to find Rare critters.
tells | gym-wren/wren.intro: Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.
tells | gym-wren/wren.sealLine: The first fire is the easiest to keep. Frost Peaks opens at level 3.
tells | mossbrook/bryn.lines: My mom says you can go your whole life and not see one. I am still looking!
tells | frosthold/olaf.lines: They say a tower stands on Vigil Peak, up the trail north of Sproutvale’s plaza.
tells | cinderport/ruby.lines: The miners found a shiny rock critter last week! Shinies are rare, but they show up anywhere.
tells | coralbay/finn.lines: After her seal, climb the Tower. It is up the trail north of Sproutvale.
tells | gym-glacia/glacia.intro: Welcome to Frosthold. I am Glacia, leader of this gym.
tells | gym-blaze/blaze.sealLine: This one wants feeding every day. Tide Shore opens at level 9.
tells | gym-coral/coral.intro: Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.
tells | route-mf/edda.lines: Highland Pass joins Mossbrook and Frosthold. The arch is older than both.
tells | descent/mirel.lines: Welcome to the rim camp! The trail zig-zags down five ledges to the crater floor. The vents get hot, but the c
tells | ascent/ansel.lines: Welcome to base camp! Five ledges lead up to the summit, and the trail zig-zags so the wind cannot find you.
tells | ascent/ansel.lines: The climbers sit where they can see the trail. The snow moves when nobody is walking on it. Near the top, it s
tells | in-lab/remy.lines: The Dex terminal records every species you keep. Use it any time.
tips | town/fern.ask: Could you help my research? Discover 5 different species and come back. I will make it worth your while.
tips | town/fern.after: Keep exploring. The Species page in your Dex shows where each type lives.
tips | town/pip.lines: Trainers stand still and watch. If they see you, get ready to battle!
tips | town/rowan.winLine: Wow, you are good! Here is your reward.
tips | frost/sola.ask: Could you show me one? Keep a Stone critter and come back.
tips | frost/sola.thanks: Take these 6 essence, as thanks.
tips | ember/dax.progress: Evolve a critter in the Dex, then come back. Release extra critters to earn essence.
tips | moss/oak.lines: Pick the nature that fits how you like to battle.
tips | mossbrook/sorrel.winLine: Ha! You earned your welcome. Here is your reward.
tips | mossbrook/sorrel.beatenLines: Rest up and come back tomorrow. The berries will be ripe again.
tips | frosthold/pike.winLine: Brr, you are tough. Here is your reward.
tips | cinderport/cole.lines: Do not touch the lava pool. Ember critters swim in it. You cannot.
tips | coralbay/rafe.winLine: Blow me down! A fine battle. Here is your reward.
tips | route-mf/kai.winLine: You climbed right over me. Here is your reward.
tips | route-cm/elm.winLine: You chopped right through my team. Here is your reward.
tips | route-fc/signe.winLine: Hooked and landed. You win this one. Here is your reward.
tips | route-cc/mako.winLine: You out-swam me! Here is your reward.
tips | dg-forge/dross.winLine: Take the core. The forge chose you before I did.
tips | frost/sign:0.text: Frost Peaks: Frost and Stone critters hide in the tall grass. Sparkling grass hides rarer finds. The road cont
tips | ember/sign:0.text: Ember Fields: Ember and Volt critters hide in the tall grass. Sparkling grass hides rarer finds. The road cont
tips | moss/sign:0.text: Moss Forest: Moss and Bloom critters hide in the tall grass. Sparkling grass hides rarer finds. Mossbrook lies
tips | tide/sign:0.text: Tide Shore: Tide and Dusk critters hide in the tall grass. Sparkling grass hides rarer finds. A boardwalk lead
tips | route-mf/sign:0.text: Highland Pass: Moss and Frost critters hide in the tall grass. Sparkling grass hides rarer finds.
tips | route-cm/sign:0.text: Ashwood Trail: Ember and Moss critters hide in the tall grass. Sparkling grass hides rarer finds.
tips | route-fc/sign:0.text: Glacier Coast: Frost and Tide critters hide in the tall grass. Sparkling grass hides rarer finds.
tips | route-cc/sign:0.text: Reef Causeway: Tide and Ember critters hide in the tall grass. Sparkling grass hides rarer finds.
thesis | gym-glacia/glacia.winLine: The cold keeps what it is given. Take the Frost Seal. It will keep.
thesis | gym-blaze/blaze.sealLine: This one wants feeding every day. Tide Shore opens at level 9.
thesis | gym-coral/coral.intro: Win, and you will have tended every fire in the land.
thesis | gym-coral/coral.winLine: The sea gives back what it is given. The Tide Seal is yours.
thesis | gym-coral/coral.sealLine: Four fires. Someone left a light on for you. Perhaps they still do. The trail north of Sproutvale is open.
thesis | ascent/marta.lines: They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew
thesis | dg-arch/keeper.intro: Prove you can be trusted with the seat.
thesis | Four fires. Someone left a light on for you. Perhaps they still do. The trail north of Sproutvale is open.
thesis | Prove you can be trusted with the seat.
thesis | The cold keeps what it is given. Take the Frost Seal. It will keep.
thesis | The sea gives back what it is given. The Tide Seal is yours.
thesis | They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew
thesis | This one wants feeding every day. Tide Shore opens at level 9.
thesis | Win, and you will have tended every fire in the land.
thesis | You have tended every fire in the land. Nobody in Sproutvale has tended so many.
signs | town/sign:0.text: North: Frost Peaks (Frost and Stone critters). Beyond the peaks lies Frosthold, where Glacia keeps her gym.
signs | town/sign:1.text: South: Ember Fields (Ember and Volt critters). Past the fields, Blaze runs the forge gym of Cinderport.
signs | town/sign:2.text: West: Moss Forest (Moss and Bloom critters). Elder Wren waits in Mossbrook, on the far side of the forest.
signs | town/sign:3.text: East: Tide Shore (Tide and Dusk critters). Follow the boardwalk past the shore to reach Admiral Coral in Coral
signs | peak/sign:0.text: Vigil Peak. The Long Watch stands at the summit. Twenty nights, one lamp.
signs | mossbrook/sign:0.text: Mossbrook: a village under the old trees. Elder Wren's gym stands at the north end.
signs | mossbrook/sign:1.text: North: the Highland Pass (Moss and Frost critters), the road to Frosthold.
signs | mossbrook/sign:2.text: South: the Ashwood Trail (Ember and Moss critters), the road to Cinderport.
signs | frosthold/sign:0.text: Frosthold: the fort at the edge of the peaks. Glacia's gym stands behind the plaza.
signs | frosthold/sign:1.text: West: the Highland Pass (Moss and Frost critters), the road to Mossbrook.
signs | frosthold/sign:2.text: East: the Glacier Coast (Frost and Tide critters), the road to Coralbay.
signs | frosthold/sign:3.text: North: the Cold Ascent. A trail climbs into the peaks (Frost and Stone critters). Climbers should be at least 
signs | cinderport/sign:0.text: Cinderport: forge town of the south. Blaze's gym burns at the north end of the plaza.
signs | cinderport/sign:1.text: West: the Ashwood Trail (Ember and Moss critters), the road to Mossbrook.
signs | cinderport/sign:2.text: East: the Reef Causeway (Tide and Ember critters), the road to Coralbay.
signs | cinderport/sign:3.text: South: the Cinder Descent. A trail winds down into the volcano to an old forge (Ember and Stone critters). Cli
signs | coralbay/sign:0.text: Coralbay harbor. Admiral Coral's gym looks out over the plaza.
signs | coralbay/sign:1.text: North: the Glacier Coast (Frost and Tide critters), the road to Frosthold.
signs | coralbay/sign:2.text: South: the Reef Causeway (Tide and Ember critters), the road to Cinderport.
signs | frost/sign:0.text: Frost Peaks: Frost and Stone critters hide in the tall grass. Sparkling grass hides rarer finds. The road cont
signs | frost/sign:1.text: North: Frosthold, the fort town. Glacia's gym is there.
signs | ember/sign:0.text: Ember Fields: Ember and Volt critters hide in the tall grass. Sparkling grass hides rarer finds. The road cont
signs | ember/sign:1.text: South: Cinderport, the forge town. Blaze's gym is there.
signs | moss/sign:0.text: Moss Forest: Moss and Bloom critters hide in the tall grass. Sparkling grass hides rarer finds. Mossbrook lies
signs | tide/sign:0.text: Tide Shore: Tide and Dusk critters hide in the tall grass. Sparkling grass hides rarer finds. A boardwalk lead
signs | tide/sign:1.text: East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there.
signs | route-mf/sign:0.text: Highland Pass: Moss and Frost critters hide in the tall grass. Sparkling grass hides rarer finds.
signs | route-cm/sign:0.text: Ashwood Trail: Ember and Moss critters hide in the tall grass. Sparkling grass hides rarer finds.
signs | route-fc/sign:0.text: Glacier Coast: Frost and Tide critters hide in the tall grass. Sparkling grass hides rarer finds.
signs | route-cc/sign:0.text: Reef Causeway: Tide and Ember critters hide in the tall grass. Sparkling grass hides rarer finds.
orders | gym-glacia/glacia.winLine: The cold keeps what it is given. Take the Frost Seal. It will keep.
orders | gym-blaze/blaze.winLine: You did not put it out. You fed it. Take the Ember Seal.
orders | dg-arch/keeper.afterLines: The seat is quiet now. Go and see it.
retired | . It belongs in one of the side halls.
retired | : not yet beaten
retired | Admiral Coral’s gym
retired | Blaze's Forge Gym
retired | Cinderport: forge town of the south. Blaze's gym burns at the north end of the plaza.
retired | Coral's Harbor Gym
retired | Coralbay harbor. Admiral Coral's gym looks out over the plaza.
retired | Earn all 4 Leader Seals
retired | East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there.
retired | Elder Wren’s gym
retired | Enter the Tower
retired | Enter the gym
retired | Forge Market! Same remedies as Mirau2019s, kept warm by the furnace.
retired | Forge Market! Same remedies as Mira’s, kept warm by the furnace.
retired | Frost critters roam in the snow
retired | Frosthold: the fort at the edge of the peaks. Glacia's gym stands behind the plaza.
retired | Harbor Market! Same goods as Sproutvale, shipped in fresh.
retired | Leader seals
retired | Mossbrook: a village under the old trees. Elder Wren's gym stands at the north end.
retired | Night: Dusk critters roam every zone.
retired | North: Frost Peaks (Frost and Stone critters). Beyond the peaks lies Frosthold, where Glacia keeps her gym.
retired | North: Frosthold, the fort town. Glacia's gym is there.
retired | North: Vigil Peak. The trail opens to trainers holding all 4 Leader Seals.
retired | Only those with all four Leader Seals go up. They say every night up there, someone comes to the door.
retired | Prove you can be trusted with the seat.
retired | South: Cinderport, the forge town. Blaze's gym is there.
retired | South: Ember Fields (Ember and Volt critters). Past the fields, Blaze runs the forge gym of Cinderport.
retired | Supplies for the cold road. Same goods as Sproutvale, packed for the snow.
retired | The trail to Vigil Peak opens with all 4 Leader Seals. You hold
retired | They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew
retired | Tide critters come out in the rain
retired | Tint the world by your local time. Dusk critters come out at night.
retired | Volt critters ride the storm
retired | Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.
retired | Welcome to Cinderport. I am Blaze, and this forge is my gym.
retired | Welcome to Frosthold. I am Glacia, leader of this gym.
retired | Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.
retired | Welcome to the Herb Hut! Same remedies as Mira in Sproutvale, brewed with Mossbrook leaves.
retired | of 4 Leader Seals.
shared | That was a good battle. Come back tomorrow for another. (x19)
```

## 2. Checked, already done by packages R, M, S, W (not redone)

All pass the widened lint as they stand: Warden Maren (intro "You climbed the whole way." / "I used to stand here all night.", winLine "I think I will sit down.", no order; she sits beside the stair); Forgemaster Hale (02-F14 and F1 lines); Lampkeeper Bex (02-F4); the Lamp Tower gates ("An iron gate. Cold." / "Warm."), `tab1` gone (no "lit by the one who" anywhere in the build), no lever text; the forge gate "A slab of black iron."; the beacon door (02-F22, "The great door is not locked." / "The handle is worn bright."); the great lamp (02-F6: no toast, no essence, one line "The glass is warm."); the furnace (02-F6); the window ("Stay", which supersedes 02-F5 per 10 item 19); Fern's two opening lines (02-F9, 01-F22) and her body by the path; the starter blurb (02-F10) and the cards with name and picture (01-F23); the title caption fades (02-F29); the first-minute hints gone (02-F26); the spent-day toast (02-F24); the rite's fail toast (02-F21); the Watch's Keeper without numbers (02-F23); the zone gates' level toasts gone (02-F12 for the zones; the Peak's toast was still there and is now "Lashed shut."). Wren's win line "Four in bloom. I did not see you hurry." (package R) is kept as hers.

Moved into the `SAY` table with the same words (so the lint reads them): Fern, the arch, the beacon door, the great lamp, the ninth seat, the window, the forge door, the furnace, the Watch's lines.

## 3. Every line changed

Notes on choices made where the reports did not settle the exact words:
- **The leaders.** Seals now come from the trial (`gymDone`), so `justSealed` is never set and the old seal dialog (with "You now hold N of 4 Leader Seals" and "tended every fire") was dead code; its words are cut and the dead path says only `sealLine`. The leader's `winLine` is now 02-F3's observation of the trial; her `sealLine` (02-F3's second line) is said after it when you win the duel (`duelDone` appends `npc.sealLine` for leaders), and "You earned N essence." is no longer said after any duel (the counter moves). Intros are "I am Wren. This is my garden." and so on (02-F32); Wren's second line "The beds take their time." replaces "Show me that you and your critters grow together." (a thesis and a "Show me").
- **Coral's seal line** drops 02-F2's opening "Four." because an old save can keep her fire before the fourth (the level OR on gates).
- **Keeper Orlen** says "Eight seats are warm. One is not." in his intro (02-F14), "The fire has not moved. Everything else has." as his win line (02-F1), and "I am still here. So is the seat." after (02-F1 gave no after line that did not repeat the intro).
- **Signs.** The four plaza signs keep their description ("Mossbrook: a village under the old trees.") and lose only the gym, instead of 02-F11's bare "Mossbrook."; the climb signs name the Ascent and its ledges, not "the old beacon" (10/11 item 17 overrides 02-F11 there). The town's Vigil Peak sign, which 02-F11 said to keep, becomes "North: Vigil Peak.": it carried "all 4 Leader Seals" (02-F7) and the trail now opens by itself (02-F2).
- **Mira** "Potions and charms. Take what you need." (02-F20 said "tickets"; tickets left the shop in item 5). **Fern's after line** "The pages are filling up." (02-F17's "Keep going." is an order to the lint). **Nell's ask** loses "rare critters" ("something rare").
- **City favours** (02-F18, 04-W13): words only: "Today it is this: <the task>.", "Thank you." / "That is today's. Tomorrow there is another."; no progress counter or essence number spoken. 04-W13's mechanic (keep favours only) is package M's and is not done.
- **The post text** (02-F8) is read from its state in `objectUse`: "A lantern on a post. Cold." / "Lit before you got here." / "It stays lit." (an `own:` post you kept).
- **After the lamp** (02-F30): `LIT_LINES` for Juniper, Tove, Bea, Marina and Rowan, applied in `talk()` beside (not inside) the protected `LETGO` table.
- **The menu** scrolls to the renamed heading ("The four fires"), found by the lint; Smith Dross's win line "Take the core." became "The core is yours." (an order, found by the lint).

**Batch 1** (the findings both directors kept)

| # | file | finding | old | new |
|---|---|---|---|---|
| 1 | app.js | F34 (the table the lint reads), F30 | const sealCount = () => ((game.state.npc && game.state.npc.seals) \|\| []).length; | const sealCount = () => ((game.state.npc && game.state.npc.seals) \|\| []).length; // the scripted lines (review words pass): one table, so telltest reads every line a scene says (APP.words()) const SAY = { fern: ['Someone has the lamp on the west gate lit al... |
| 2 | app.js | F34: APP.words() for the lint (review build only) | return { build: 'review', homeLitNow | return { build: 'review', words: () => { const t = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[k] = [].concat(...o[k].map((x) => (Array.isArray(x) ? x.filter((y) => typeof y !== 'number') : (typeof x === 'string' ? [x] : [])))).flat(); }); retu... |
| 3 | app.js | F34 (moved to SAY) | showDialog('Professor Fern', ['Someone has the lamp on the west gate lit already. They do, most mornings.'], null, openStarter) | showDialog('Professor Fern', SAY.fern, null, openStarter) |
| 4 | app.js | F34 (moved to SAY) | showDialog('Professor Fern', ['Go on, then.'], null); | showDialog('Professor Fern', SAY.fernGo, null); |
| 5 | app.js | F1, F14, 01-F18 | ['You found your way in. Few remember the rhyme.', 'Eight critters were enough for the world, they said. The ninth was kept here, asleep.', 'Prove you can be trusted with the seat.'], 'The seat is yours to approach. It has waited a very long time.' | ['You found your way in. Few remember the rhyme.', 'Eight seats are warm. One is not.'], 'The fire has not moved. Everything else has.' |
| 6 | app.js | F1 | { boss: true, bonus: 10, afterLines: ['The seat is quiet now. Go and see it.'] } | { boss: true, bonus: 10, afterLines: ['I am still here. So is the seat.'] } |
| 7 | app.js | F3, F32, 01-F21 | intro: ['I am Glacia, leader of Frost Peaks.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The cold keeps what it is given. Take the Frost Seal. It will keep.', sealLine: 'The Frost Seal is quiet. Quiet fires last longest. Embe... | intro: ['I am Glacia. This is my pool.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The pool is still. It will stay that way now.', sealLine: 'Nothing up here has moved since you came in.' |
| 8 | app.js | F3, F32, 01-F21 | intro: ['So you made it to the heart of Ember Fields.', 'I am Blaze. My team burns at full power. Ready?'], winLine: 'You did not put it out. You fed it. Take the Ember Seal.', sealLine: 'This one wants feeding every day. Tide Shore opens at level 9.' | intro: ['I am Blaze. This is my hearth.', 'My team burns at full power. Ready?'], winLine: 'All three at once. The woodpile is lower than it was.', sealLine: 'Someone will stack it again tonight. It is never me.' |
| 9 | app.js | F3, F32, 01-F21 (Wren's win line was package R's; kept) | intro: ['Welcome, young trainer. I am Elder Wren, leader of Moss Forest.', 'Show me that you and your critters grow together.'], winLine: 'Four in bloom. I did not see you hurry.', sealLine: 'The first fire is the easiest to keep. Frost Peaks opens at level... | intro: ['I am Wren. This is my garden.', 'The beds take their time.'], winLine: 'Four in bloom. I did not see you hurry.', sealLine: 'The beds will want you back. They always want someone.' |
| 10 | app.js | F2, F3, F32, 01-F20 | intro: ['Admiral Coral, leader of Tide Shore. Five critters, every one a veteran of the storm.', 'Win, and you will have tended every fire in the land.'], winLine: 'The sea gives back what it is given. The Tide Seal is yours.', sealLine: 'Four fires. Someon... | intro: ['I am Coral. This is my lamp hall.', 'Five critters, every one of them came back from a storm.'], winLine: 'Every lamp answered. The chain is down.', sealLine: 'The harbour lamp was already lit when I came down this morning. Nobody here will say who.' |
| 11 | app.js | F32 | intro: ['Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.', 'Show me that you and your critters grow together.'] }); | intro: ['I am Wren. This is my garden.', 'The beds take their time.'] }); |
| 12 | app.js | F32 | city('frost', 'frosthold', 'glacia', 'Welcome to Frosthold. I am Glacia, leader of this gym.', [ | city('frost', 'frosthold', 'glacia', 'I am Glacia. This is my pool.', [ |
| 13 | app.js | F32 | city('ember', 'cinderport', 'blaze', 'Welcome to Cinderport. I am Blaze, and this forge is my gym.', [ | city('ember', 'cinderport', 'blaze', 'I am Blaze. This is my hearth.', [ |
| 14 | app.js | F32 | city('tide', 'coralbay', 'coral', 'Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.', [ | city('tide', 'coralbay', 'coral', 'I am Coral. This is my lamp hall.', [ |
| 15 | app.js | F2, 01-F20 | const ls = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.']; if (count === 4) ls.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.'); | const ls = [n.sealLine]; // the count is on the Seals card; nobody says it (02-F2, 01-F20) |
| 16 | app.js | F2, 01-F20 | const lines = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.']; if (count === 4) lines.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.'); | const lines = [n.sealLine]; |
| 17 | app.js | F7, F18, F3 | if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine, 'You earned ' + tr.reward + ' essence.'].filter((x) => x && !/^You earned 0 /.test(x))), 400); | if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine].concat(tr.leader && npc && npc.sealLine ? [npc.sealLine] : []).filter((x) => x)), 400); /* the essence is paid and the counter moves; nobody says the number (02-F7, F18); a leader's second line is... |
| 18 | app.js | F7, F25 | c.lines = [ZONE_TYPES[id].join(' and ') + ' critters', found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? ': seal earned' : ': not yet beaten')]; | c.lines = [found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? '’s fire: kept' : '’s fire: not yet kept')]; |
| 19 | app.js | F32, F33, F16 | mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Elder Wren’s gym'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s gym'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s gym'], coralbay: ['Coralbay', '... | mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Wren’s Garden'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s Pool'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s Hearth'], coralbay: ['Coralbay', ... |
| 20 | app.js | F25 | { night: 'Night: Dusk critters roam every zone.', dawn: 'Dawn', dusk: 'Dusk', day: 'Daytime' } | { night: 'Night.', dawn: 'Dawn.', dusk: 'Dusk.', day: 'Daytime.' } |
| 21 | app.js | F25 | function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label + (K.type ? ': more ' + K.type + ' critters' : '') : ''; } | function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label : ''; } // the weather is its name; what it brings out is met, not read (02-F25) |
| 22 | app.js | F7 | { id: 'seals', label: 'Seals', sub: ((st.npc && st.npc.seals) \|\| []).length + '/4 leaders', | { id: 'seals', label: 'Fires', sub: ((st.npc && st.npc.seals) \|\| []).length + '/4 kept', |
| 23 | app.js | F33 | tower: 'Enter the Tower', | tower: 'Go in', |
| 24 | app.js | F32 | ({ gym: 'Enter the gym', house: 'Go inside', shop: 'Browse' }) | ({ gym: 'Go in', house: 'Go inside', shop: 'Browse' }) |
| 25 | app.js | F12, 01-F24, F7 | if (e.to === 'peak') toast("The trail to Vigil Peak opens with all 4 Leader Seals. You hold " + ((game.state.npc && game.state.npc.seals) \|\| []).length + '.'); }, | if (e.to === 'peak') toast('Lashed shut.'); }, |
| 26 | app.js | F8 | if (o.kind === 'chamberlamp') { toast( | if (o.kind === 'postlamp' && !o.day) { const f = advOf().flags, mine = o.own \|\| (!o.wave && !o.always && !!f.lampLit); toast(mine && f['own:' + o.id] ? SAY.postMine : (lampK[o.id] \|\| 0) > 0.3 ? SAY.postAhead : SAY.postCold); return; } // the post says what ... |
| 27 | app.js | F18 | ask: ['Ah, a new trainer! I am Professor Fern. I study critters here at the Lab.', 'Could you help my research? Discover 5 different species and come back. I will make it worth your while.'], | ask: ['Ah, a new trainer. I am Professor Fern. I study critters here at the Lab.', 'Five kinds, and I will have a page to write.'], |
| 28 | app.js | F18 | progress: (g) => 'You have found ' + (g.state.seen \|\| []).length + ' of 5 species so far. The tall grass outside town is a good start.', | progress: (g) => 'The page has ' + (g.state.seen \|\| []).length + ' on it so far.', |
| 29 | app.js | F18 | thanks: ['Five species already? Wonderful work!', 'Here are 10 essence for your trouble.'], | thanks: ['Five already. I will start the page tonight.'], |
| 30 | app.js | F17 | after: ['Keep exploring. The Species page in your Dex shows where each type lives.'] }), | after: ['The pages are filling up.'] }), |
| 31 | app.js | F17 | lines: ['Did you know? Sparkling grass hides rarer critters.', 'Trainers stand still and watch. If they see you, get ready to battle!'] }, | lines: ['The patch past the gate sparkles in the morning. I have never caught it starting.', 'Rowan has stood in the same spot since breakfast.'] }, |
| 32 | app.js | F20 | lines: ['Welcome to my stall! Potions for battles, charms for rare finds, tickets for one more roll.'] }, | lines: ['Potions and charms. Take what you need.'] }, |
| 33 | app.js | F18 | ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'Could you show me one? Keep a Stone critter and come back.'], | ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'I draw them. The Stone ones never hold still long enough.'], |
| 34 | app.js | F17, F18 | progress: () => 'Still no Stone critter? They live in the tall grass here in Frost Peaks.', thanks: ['A Stone critter! It is even rockier than I imagined.', 'Take these 6 essence, as thanks.'], | progress: () => 'They do not come when called. They come when you stop.', thanks: ['A Stone critter! It is even rockier than I imagined.'], |
| 35 | app.js | F17, F18 | progress: () => 'Evolve a critter in the Dex, then come back. Release extra critters to earn essence.', thanks: ['Whoa, look at the size of it!', 'Here, 8 essence. Thanks for showing me.'], | progress: () => 'Pip grew a hand’s width over the summer and I did not notice until it had happened.', thanks: ['Whoa, look at the size of it!', 'Thanks for showing me.'], |
| 36 | app.js | F17 | lines: ['Every critter has a nature. Brave ones hit harder but bruise easier.', 'Pick the nature that fits how you like to battle.'] } | lines: ['The brave ones in this forest come home bruised.', 'They go out again first.'] } |
| 37 | app.js | F17 (the lint) | ask: ['The waves sometimes wash up rare critters.', 'Have you found a Rare one yet? I would love to see it.'], | ask: ['The waves sometimes wash up something rare.', 'Have you found a Rare one yet? I would love to see it.'], |
| 38 | app.js | F17, F18 | progress: () => 'Sparkling grass is the best place to find Rare critters.', thanks: ['A Rare critter! It practically glows.', 'Please, take 8 essence.'], | progress: () => 'Nothing rare in the row this morning. The sea takes its time.', thanks: ['A Rare critter! It practically glows.'], |
| 39 | app.js | F17 | 'Elder Wren says a critter that rests well battles well.' | 'Wren sleeps in the garden some nights. The beds do better for it.' |
| 40 | app.js | F17 | 'My mom says you can go your whole life and not see one. I am still looking!' | 'My dad keeps a jar for when I find one. Not if. When.' |
| 41 | app.js | F17 | lines: ['Do not touch the lava pool. Ember critters swim in it. You cannot.', 'Blaze says a burn wears down even the toughest critter.', | lines: ['The lava pool has a crust on it some mornings. Not today.', 'Blaze’s hall is the one chimney in town that never smokes. The fire is inside.', |
| 42 | app.js | F16, F17 | lines: ['The miners found a shiny rock critter last week! Shinies are rare, but they show up anywhere.', 'Admiral Coral’s harbor is east, past Tide Shore. The boardwalk starts by the water.'] } | lines: ['The miners found a shiny rock critter last week! Petra has not stopped talking.'] } |
| 43 | app.js | F17 | 'The Dex terminal records every species you keep. Use it any time.' | 'The terminal keeps every name. It has never lost one.' |
| 44 | app.js | F16 | 'Highland Pass joins Mossbrook and Frosthold. The arch is older than both.' | 'The arch is older than both towns. They grew at the two ends of its road.' |
| 45 | app.js | F16 | lines: ['They say a tower stands on Vigil Peak, up the trail north of Sproutvale’s plaza.', 'Only those with all four Leader Seals go up. They say every night up there, someone comes to the door.', 'Before first light | lines: ['Every night up on the Peak, they say, someone comes to the door.', 'Before first light |
| 46 | app.js | F16 | 'After her seal, climb the Tower. It is up the trail north of Sproutvale.' | 'Coral trims the harbour lamp herself. She says the one on the Peak is the only lamp she has never seen lit.' |
| 47 | app.js | F16 | lines: ['Welcome to the rim camp! The trail zig-zags down five ledges to the crater floor. The vents get hot, but the camp never does.', 'The climbers down there | lines: ['The climbers down there |
| 48 | app.js | F16 | lines: ['Welcome to base camp! Five ledges lead up to the summit, and the trail zig-zags so the wind cannot find you.', 'The climbers sit where they can see the trail. The snow moves when nobody is walking on it. Near the top, it sparkles.'] } | lines: ['The climbers sit where they can see the trail. The snow moves when nobody is walking on it.'] } |
| 49 | app.js | F15, 01-F19 | 'They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew where home was.' | 'They say the beacon above once lit every road in the land. My grandmother could see it from her kitchen. She never drew the curtain.' |
| 50 | app.js | F7 | 'Wow, you are good! Here is your reward.' | 'Wow, you are good!' |
| 51 | app.js | F7 | 'Ha! You earned your welcome. Here is your reward.' | 'Ha! You earned your welcome.' |
| 52 | app.js | F7 | 'Brr, you are tough. Here is your reward.' | 'Brr, you are tough.' |
| 53 | app.js | F7 | 'Blow me down! A fine battle. Here is your reward.' | 'Blow me down! A fine battle.' |
| 54 | app.js | F7 | 'You climbed right over me. Here is your reward.' | 'You climbed right over me.' |
| 55 | app.js | F7 | 'You chopped right through my team. Here is your reward.' | 'You chopped right through my team.' |
| 56 | app.js | F7 | 'Hooked and landed. You win this one. Here is your reward.' | 'Hooked and landed. You win this one.' |
| 57 | app.js | F7 | 'You out-swam me! Here is your reward.' | 'You out-swam me!' |
| 58 | app.js | F7 | 'Forged in fire! You earned this reward.' | 'Forged in fire!' |
| 59 | app.js | F18 (the lint: "and come back") | beatenLines: ['Rest up and come back tomorrow. The berries will be ripe again.'] }, | beatenLines: ['Tomorrow. The berries will be ripe again.'] }, |
| 60 | app.js | F20 | lines: ['Welcome to the Herb Hut! Same remedies as Mira in Sproutvale, brewed with Mossbrook leaves.'] }, | lines: ['The shelf is full again. It is, every morning.'] }, |
| 61 | app.js | F20 | lines: ['Supplies for the cold road. Same goods as Sproutvale, packed for the snow.'] }, | lines: ['Packed for the snow. Counted twice.'] }, |
| 62 | app.js | F20 | lines: ['Forge Market! Same remedies as Mira’s, kept warm by the furnace.'] }, | lines: ['Nothing on this shelf has ever gone cold.'] }, |
| 63 | app.js | F20 | lines: ['Harbor Market! Same goods as Sproutvale, shipped in fresh.'] }, | lines: ['The crate comes back half full with every tide. It always does.'] }, |
| 64 | app.js | F30 | const dk = darkLines(n), sc = letGoLines(n) \|\| dk \|\| scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after }); | const dk = darkLines(n), sc = letGoLines(n) \|\| dk \|\| scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after }); if (LIT_LINES[n.id] && advOf().flags.lampLit) { const L = L... |
| 65 | app.js | F18, 04-W13 | if (Q.claimed) { showDialog(n.name, n.lines.concat(['Thanks again for today! I will have a new favor tomorrow.'])); return; } if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, ['You did it! Thank you so much.', 'Here, take this... | if (Q.claimed) { showDialog(n.name, n.lines.concat([SAY.cityAgain])); return; } if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, SAY.cityDone); return; } // the essence and the experience are paid; the counters move (02-F18, 0... |
| 66 | app.js | F34 (moved to SAY) | showDialog('The old arch', ['Eight critters sit around one fire. A ninth seat is carved empty.', 'The stone stays cold.'], null, () => gainClue(ruin)); | showDialog('The old arch', SAY.archCold, null, () => gainClue(ruin)); |
| 67 | app.js | F21 | showDialog('The old arch', ['The carved flame between the pillars begins to glow...', 'A passage opens in the old arch.'], null, | showDialog('The old arch', SAY.archOpen, null, |
| 68 | app.js | F21 | (f.rubble ? 'the way north is clear.' : 'rubble blocks the way north. The empty seat, a fire bowl, a lamp and a hull lantern must mean something.') | (f.rubble ? 'the way north is clear.' : 'rubble blocks the way north.') |
| 69 | app.js | 04-W12, F21 | lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate opens when both hub sockets hold a core (' + ((f['sock:A'] ? 1 : 0) + (f['sock:B'] ? 1 : 0)) + '/2). One core lies in each side hall.')); } | lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate is shut.')); } |
| 70 | app.js | F21 | else if ((game.state.visited \|\| []).indexOf('ascent') !== -1) lines.push('The Cold Ascent climbs north from Frosthold.'); else if (have.length === ADV.CLUES.length) lines.push('You have every clue. The arch in Highland Pass should answer now.'); | else if ((game.state.visited \|\| []).indexOf('ascent') !== -1) lines.push('The Cold Ascent climbs north from Frosthold.'); |
| 71 | app.js | 04-W12 | toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands. Carry it to the hub.'); | toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands.'); |
| 72 | app.js | 04-W12 | if (f['sock:' + c]) { toast('The socket glows steadily.'); return; } if (!f['core:' + c]) { toast('A socket for the core of ' + CORE_NAME[c] + '. It belongs in one of the side halls.'); return; } | if (f['sock:' + c]) { toast(SAY.socketWarm); return; } if (!f['core:' + c]) { toast(SAY.socketCold); return; } |
| 73 | app.js | 04-W12 | toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket. One more.'); | toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket.'); |
| 74 | app.js | F22 (package R's words, checked; moved to SAY) | showDialog('The door', ['The great door is not locked.', 'The handle is worn bright.'], null, | showDialog('The door', SAY.door, null, |
| 75 | app.js | F6 (package R's words, checked; moved to SAY) | setTimeout(() => { if (!dlg) showDialog('The great lamp', ['The glass is warm.']); }, 700); | setTimeout(() => { if (!dlg) showDialog('The great lamp', SAY.greatLamp); }, 700); |
| 76 | app.js | F34 (moved to SAY) | showDialog('The ninth seat', ['Something that has been kept here a very long time opens its eyes.', 'It looks at the empty seat, and then it chooses you instead.'], null, | showDialog('The ninth seat', SAY.seat, null, |
| 77 | app.js | F34 (moved to SAY) | showDialog('The window', ['Something small is asleep on the sill, curled against the warm glass.', 'It opens one eye.'], null, | showDialog('The window', SAY.window, null, |
| 78 | app.js | F34 (moved to SAY) | showDialog('The forge door', ['A doorway of dry heat, cut into the crater wall.', 'The forge has been quiet for a long time. Something inside is still warm.'], null, | showDialog('The forge door', SAY.forgeDoor, null, |
| 79 | app.js | F34 (moved to SAY) | showDialog('The great furnace', ['A coal in the ash shifts and looks up.', 'It climbs out, small and heavy and warm, and settles against your boots.'], null, | showDialog('The great furnace', SAY.furnaceLit, null, |
| 80 | app.js | F6 (package R's words, checked; moved to SAY) | showDialog('The great furnace', ['You pull the soot-black door open. A single ember glows in the ash.', 'You blow on it. It brightens, then catches, then roars.'], null, | showDialog('The great furnace', SAY.furnace, null, |
| 81 | app.js | F23 (package R's words, checked; moved to SAY) | const intro = [lit ? 'They come most nights now. You are the one they come to.' : (t.best ? 'Back again.' : 'Someone comes to the door most nights.'), WATCH_LINES[tw.id] \|\| tw.name + '.']; if (!left) { showDialog(KEEPER, [intro[0], 'Enough for today. The be... | const intro = [lit ? SAY.watchLit : (t.best ? SAY.watchBack : SAY.watchFirst), WATCH_LINES[tw.id] \|\| tw.name + '.']; if (!left) { showDialog(KEEPER, [intro[0], SAY.watchEnough]); return; } |
| 82 | app.js | F34 (moved to SAY) | showDialog(KEEPER, ['Morning. You kept the whole watch.', res.first ? 'The lamp was yours all night.' : 'Kept to morning again.']) | showDialog(KEEPER, SAY.watchTop.concat([res.first ? SAY.watchTopFirst : SAY.watchTopAgain])) |
| 83 | app.js | F34 (moved to SAY) | 'The bench is there. The watch is still yours.']), 60); | SAY.watchLoss]), 60); |
| 84 | world.js | F11 | text: 'North: Frost Peaks (Frost and Stone critters). Beyond the peaks lies Frosthold, where Glacia keeps her gym.' | text: 'North: Frost Peaks, then Frosthold.' |
| 85 | world.js | F11 | text: 'South: Ember Fields (Ember and Volt critters). Past the fields, Blaze runs the forge gym of Cinderport.' | text: 'South: Ember Fields, then Cinderport.' |
| 86 | world.js | F11 | text: 'West: Moss Forest (Moss and Bloom critters). Elder Wren waits in Mossbrook, on the far side of the forest.' | text: 'West: Moss Forest, then Mossbrook.' |
| 87 | world.js | F11 | text: 'East: Tide Shore (Tide and Dusk critters). Follow the boardwalk past the shore to reach Admiral Coral in Coralbay.' | text: 'East: Tide Shore, then Coralbay.' |
| 88 | world.js | F11, F7, F2 (the trail opens by itself) | text: "North: Vigil Peak. The trail opens to trainers holding all 4 Leader Seals." | text: 'North: Vigil Peak.' |
| 89 | world.js | F11 (the zone and route signs: twelve) | text: z.name + ': ' + z.types.join(' and ') + ' critters hide in the tall grass. Sparkling grass hides rarer finds.' | text: z.name + '.' |
| 90 | world.js | 03-F8 | text: "Vigil Peak. The Long Watch stands at the summit. Twenty nights, one lamp." | text: 'Vigil Peak.' |
| 91 | world.js | F11 | text: "Mossbrook: a village under the old trees. Elder Wren's gym stands at the north end." | text: 'Mossbrook: a village under the old trees.' |
| 92 | world.js | F11 | text: "Frosthold: the fort at the edge of the peaks. Glacia's gym stands behind the plaza." | text: 'Frosthold: the fort at the edge of the peaks.' |
| 93 | world.js | F11 | text: "Cinderport: forge town of the south. Blaze's gym burns at the north end of the plaza." | text: 'Cinderport: forge town of the south.' |
| 94 | world.js | F11 | text: "Coralbay harbor. Admiral Coral's gym looks out over the plaza." | text: 'Coralbay harbor.' |
| 95 | world.js | F11 | text: 'West: Mossbrook village, home of Elder Wren.' | text: 'West: Mossbrook village.' |
| 96 | world.js | F11 | text: "North: Frosthold, the fort town. Glacia's gym is there." | text: 'North: Frosthold, the fort town.' |
| 97 | world.js | F11 | text: "South: Cinderport, the forge town. Blaze's gym is there." | text: 'South: Cinderport, the forge town.' |
| 98 | world.js | F11 | text: "East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there." | text: 'East, along the boardwalk: Coralbay harbor.' |
| 99 | world.js | F11 (city exits) | 'North: the Highland Pass (Moss and Frost critters), the road to Frosthold.' | 'North: Highland Pass, to Frosthold.' |
| 100 | world.js | F11 (city exits) | 'West: the Highland Pass (Moss and Frost critters), the road to Mossbrook.' | 'West: Highland Pass, to Mossbrook.' |
| 101 | world.js | F11 (city exits) | 'West: the Ashwood Trail (Ember and Moss critters), the road to Mossbrook.' | 'West: Ashwood Trail, to Mossbrook.' |
| 102 | world.js | F11 (city exits) | 'South: the Ashwood Trail (Ember and Moss critters), the road to Cinderport.' | 'South: Ashwood Trail, to Cinderport.' |
| 103 | world.js | F11 (city exits) | 'East: the Glacier Coast (Frost and Tide critters), the road to Coralbay.' | 'East: Glacier Coast, to Coralbay.' |
| 104 | world.js | F11 (city exits) | 'North: the Glacier Coast (Frost and Tide critters), the road to Frosthold.' | 'North: Glacier Coast, to Frosthold.' |
| 105 | world.js | F11 (city exits) | 'South: the Reef Causeway (Tide and Ember critters), the road to Cinderport.' | 'South: Reef Causeway, to Cinderport.' |
| 106 | world.js | F11 (city exits) | 'East: the Reef Causeway (Tide and Ember critters), the road to Coralbay.' | 'East: Reef Causeway, to Coralbay.' |
| 107 | world.js | F11, 01-F24 (the level sentence) | text: 'South: the Cinder Descent. A trail winds down into the volcano to an old forge (Ember and Stone critters). Climbers should be at least level 13.' | text: 'South: the Cinder Descent.' |
| 108 | world.js | F11 | text: 'The Cinder Descent. Five ledges down into the caldera. Wild Ember and Stone critters hide in the ash tufts. The heat is real, so do not hurry back up.' | text: 'The Cinder Descent. Five ledges down into the caldera.' |
| 109 | world.js | F11, 01-F24 (the level sentence) | text: 'North: the Cold Ascent. A trail climbs into the peaks (Frost and Stone critters). Climbers should be at least level 11.' | text: 'North: the Cold Ascent.' |
| 110 | world.js | F11 (the place, not a beacon: 10 item 17) | text: 'The Cold Ascent. Five ledges up into the peaks. Wild Frost and Stone critters hide in the snow tufts. Turn back if the weather turns.' | text: 'The Cold Ascent. Five ledges up into the peaks.' |
| 111 | world.js | F8 | { step: 18, start: 10, own: true, text: 'A lantern on a post. It is lit.' }); | { step: 18, start: 10, own: true, text: 'A lantern on a post.' }); |
| 112 | world.js | F28 | text: 'A lamp on a post by the gate. Lit, in daylight. Someone keeps it that way.' | text: 'A lamp on a post by the gate. Lit, in daylight.' |
| 113 | world.js | F28 | 'A well. The bucket is up, and full. Someone drew it before you came.' | 'A well. The bucket is up, and full.' |
| 114 | world.js | F32 | { id: 'gym-wren', name: "Wren's Gym", | { id: 'gym-wren', name: "Wren's Garden", |
| 115 | world.js | F32 | gymName: "Glacia's Gym" | gymName: "Glacia's Pool" |
| 116 | world.js | F32 | gymName: "Blaze's Forge Gym" | gymName: "Blaze's Hearth" |
| 117 | world.js | F32 | gymName: "Coral's Harbor Gym" | gymName: "Coral's Lamp Hall" |
| 118 | world.js | F27 | ascent: [['camp', [6, 57]], | ascent: [['camp', [6, 57], 'A traveller’s camp. The stew is still warm, but nobody is here. A note says: "Gone up. The stew is for whoever comes down."'], |
| 119 | world.js | F27 | descent: [['camp', [6, 7]], | descent: [['camp', [6, 7], 'A traveller’s camp. The stew is still warm, but nobody is here. A note says: "Gone down. Keep the stew warm."'], |
| 120 | adventure.js | F32 | name: 'Wren’s Gym' | name: 'Wren’s Garden' |
| 121 | adventure.js | F32 | name: 'Glacia’s Gym' | name: 'Glacia’s Pool' |
| 122 | adventure.js | F32 | name: 'Blaze’s Gym' | name: 'Blaze’s Hearth' |
| 123 | adventure.js | F32 | name: 'Coral’s Gym' | name: 'Coral’s Lamp Hall' |
| 124 | adventure.js | F8 | objects.push({ id: 'br' + (i + 1), kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }) | objects.push({ id: 'br' + (i + 1), kind: 'brazier', x: x, y: y, text: 'A brazier. No soot above it.' }) |
| 125 | adventure.js | F8 | objects.push({ id: 'blb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }) | objects.push({ id: 'blb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Ash a hand deep under it.' }) |
| 126 | adventure.js | F8 | objects.push({ id: 'clb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' }) | objects.push({ id: 'clb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Salt on the iron.' }) |
| 127 | adventure.js | F28 | text: 'A torch by the door. Someone lit it for whoever comes.' | text: 'A torch by the door, lit.' |
| 128 | adventure.js | F28 | text: 'Split logs, stacked by someone who stacks logs every day.' | text: 'Split logs, stacked. The bark is still wet.' |
| 129 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Bloom critters bask in the sun' } | } |
| 130 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Tide critters come out in the rain' } | } |
| 131 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Volt critters ride the storm' } | } |
| 132 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Frost critters roam in the snow' } | } |
| 133 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Dusk critters hide in the fog' } | } |
| 134 | weather.js | F25 (WEATHER.KINDS has no note) | , note: 'Stone critters dig out of the ash' } | } |
| 135 | base.js | F25 | 'Tint the world by your local time. Dusk critters come out at night.' | 'Tint the world by your local time.' |
| 136 | base.js | F25 | 'Rain, snow, fog and sun that change every 6 hours and bring out other critters.' | 'Rain, snow, fog and sun, changing through the day.' |
| 137 | game.js | F7 | status: got ? 'Seal earned' : (open ? 'Waiting in ' + mapName(npcHome(L.id) \|\| L.zone) : 'Behind a shut gate'), aria: L.name + ', ' + (got ? 'seal earned' : 'seal not earned') }; | status: got ? 'Kept' : (open ? 'Waiting in ' + mapName(npcHome(L.id) \|\| L.zone) : 'Behind a shut gate'), aria: L.name + ', ' + (got ? 'fire kept' : 'fire not yet kept') }; |
| 138 | screen.html | F7 | >Leader seals</span> | >The four fires</span> |
| 139 | screen.html | F7 | {{sealCount}}/4 earned</span> | {{sealCount}}/4 kept</span> |
| 140 | screen.html | F7 (one name for one state) | >Keeper of Four Fires</p> | >Fire-keeper</p> |
| 141 | data.js | F7 | { id: 'champion', name: 'Fire-keeper', desc: 'Earn all 4 Leader Seals', | { id: 'champion', name: 'Fire-keeper', desc: 'Keep all four fires', |
| 142 | app.js | F7 (the menu scrolls to the renamed heading) | seals: 'Leader seals' }[id] | seals: 'The four fires' }[id] |
| 143 | app.js | F34 (the lint: an order in a win line) | 'Take the core. The forge chose you before I did.' | 'The core is yours. The forge chose you before I did.' |

**Batch 2** (the optional findings: F19, F31, F35, F36)

| # | file | finding | old | new |
|---|---|---|---|---|
| 1 | app.js | F19 | Object.values(out).forEach((list) => list.forEach((n) => { if (n.trainer) | const RT_BEATEN = { 'route-mf': 'Tomorrow. The wind will have changed by then.', 'route-cm': 'Tomorrow. The embers will still be going.', 'route-fc': 'Tomorrow, with the tide.', 'route-cc': 'Tomorrow. The steam is the same every day; I am not.', ascent: 'To... |
| 2 | app.js | F19 | intro: ['Halt! Nobody enters Frosthold without a snowball fight.', 'Well, a critter battle. Same thing up here.'] | intro: ['I have been throwing snowballs at the gate since dawn. You are the first thing that threw back.', 'Well, a critter battle. Same thing up here.'] |
| 3 | app.js | F19 | intro: ['Ahoy! Nobody walks my pier without a battle.', 'Storm-tested critters, ready to sail.'] | intro: ['Ahoy! I have coiled this rope four times today. It keeps uncoiling.', 'Storm-tested critters, ready to sail.'] |
| 4 | app.js | F19 | ['The forge is just below. Nobody walks past my wagon without a battle.', 'I have been hauling slag all day and I need some fun.'] | ['The forge is just below. The wagon goes down full and comes up full.', 'I have been hauling slag all day and I need some fun.'] |
| 5 | app.js | F19 | ['The summit is right above us. Nobody passes the last ledge without a battle.', 'My critters have been waiting in the cold all day.'] | ['The summit is right above us. I have not been up it in years.', 'My critters have been waiting in the cold all day.'] |
| 6 | app.js | F19 | ['Halt. Nobody crosses the glowing moss without a battle.', 'The seat is kept. So are its rules.'] | ['The moss glows brighter where someone has walked. It is very bright tonight.', 'The seat is kept. So are its rules.'] |
| 7 | app.js | F19 ("climbed right over me" twice) | 'You climbed right over me.', { cap: true, c: '#4E8A3A' | 'The pass is yours, then.', { cap: true, c: '#4E8A3A' |
| 8 | app.js | F31 | rt('odo', 'Lampkeeper Odo', | rt('odo', 'Lampkeeper Una', |
| 9 | app.js | F31 | rt('pell', 'Delver Pell', | rt('pell', 'Delver Rook', |
| 10 | data.js | F35 | name: 'Critter Master', desc: 'Discover all 48 species' | name: 'Every Name', desc: 'Discover all 48 species' |
| 11 | data.js | F35 | name: 'Challenger', desc: 'Climb the first step of the Arena ladder' | name: 'First Step', desc: 'Climb the first step of the Arena ladder' |
| 12 | data.js | F35 | name: 'Ring Champion', desc: 'Climb all five steps of the Arena ladder' | name: 'Top of the Ladder', desc: 'Climb all five steps of the Arena ladder' |
| 13 | data.js | F35 | name: 'Tower Climber', desc: 'Clear floor 10 of the Tower' | name: 'Ten Nights', desc: 'Keep ten nights of the Long Watch' |
| 14 | data.js | F35 | name: 'Shiny Hunter', desc: 'Keep 3 shiny critters' | name: 'Three Sparks', desc: 'Keep 3 shiny critters' |
| 15 | app.js | F36 | Uses your turn. | (removed) |

## 4. Left alone, and why

- **Protected by both directors**: the interiors and their residents (so Old Tam, Guard Brann and Smith Hal keep their names, and 02-F31 is only half done), the cairns, the returned things (02-F28's "Someone straightened them." on Tide Shore's row stays, because the returned things are protected), the `SCAFFOLD` and `LETGO` tables (read by the lint, unchanged, and they pass it), the people 02-F39 names, the 370 observations.
- **Not in this pass's scope**: 02-F37 (play stats in the Save panel), F38 (dead text), F39 (Neri, Mae), F33 beyond the two labels (the Dex's four names, "Your home"); 04-W13's mechanic. 
- **Small things the reports did not name and that the lint does not flag**: Kai's "Prove yours are tougher." (trainer banter), the knockout toast "No penalty; you can try again.", "Oh, you do not have any critters yet! Find one in the tall grass first." (before the starter only), the Dex species page's "Appears more in rain." (a reference screen; 02-F25 named the weather hint, the map and the settings, all done).
- **A bug seen, not fixed (not words)**: `showDialog` over an open dialog does not clear the old typewriter interval, which then throws "Cannot read properties of null (reading 'shown')" every 28 ms after the dialog ends. My probe hit it by opening dialogs back to back; the pre-pass build gave the same errors (53 vs 56). A one-line fix (`if (dlg) clearInterval(dlg.timer);` at the top of `showDialog`) is for whoever owns `app.js`'s dialogue.

## 5. Tests

- Asked for: `telltest`, `flavortest`, `guidetest` on the review build with `SNAP_DIR=src/snap-rev`: all three pass. Snapshots rebuilt in `src/snap-rev` after reading the diffs: `telltest` (the widened lines), `guidetest` (Pip's new lines), `titletest` (the renamed titles). `flavortest` unchanged.
- The shipped build: `telltest` prints exactly what the old test printed; `@smoke` 33/33 pass on the shipped build; after the test-file edits below, `balancetest`, `ptest`, `openingtest` (failed once and passed on the retry: it is a real-time walking bot, and its only edit is the last label check), `telltest`, `titletest`, `hallstest` all pass with `snap=ok`.
- Tests made build-aware (the shipped path and its printed check names are unchanged): `titletest.py` (wears "Three Sparks" on the review copy), `hallstest.py` (the Watch's door label "Go in"), `balancetest.py` (the four leaders' win lines and Coral's seal line), `openingtest.py` (Wren's door label "Go in"), `ptest.py` (the card "The four fires", "4/4 kept").
- The review copy's `@smoke` (33 tests): 8 fail, all in the list of 13-what-was-built.md for reasons outside the words (gates by fires in `balancetest`, the Arena's day stamp, the `act.tx` field, the Watch's door rule, the window as a stay, the bed as a stay, the verbs, Fern's lines and the bot's timing in `openingtest`). The word changes no longer fail any check. Snapshot lines the merge will see change because of words, to accept after reading: `citytest` ("near gym label: Go in", Wren's intro), `maptest` (the card: no type line, "Glacia’s fire: not yet kept", "Blaze’s Hearth"), `balancetest` (the leaders' lines), `ptest`.
- Not run on the review copy: the rest of the full suite (the merge runs it). Nothing else in `src/*.py` asserts a changed line (searched).
- The shared test paths were relinked by another worktree twice during my runs; every result above was taken with `readlink` checked before and after the run.

## 6. What cannot be judged from here

Whether the new lines are read, and how they sound beside the music and in motion on a phone; whether "Lashed shut." at the Peak and a sign that says only "Vigil Peak." leave a player wanting to go up or only puzzled; whether the leaders' observations land as warmth or as nothing after a duel that was optional. Only a play-through with Dan says.
