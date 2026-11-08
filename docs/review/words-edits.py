# The words pass (package T): every line changed in src/world-rev/, as data. Each row is (file, old, new, finding[, count]).
# Run once from the repo root: python3 docs/review/words-edits.py   (it refuses to run twice: every old string must be found exactly `count` times)
# docs/review/15-words.md is the readable record of the same rows.
import sys, os
R = 'src/world-rev/'
E = []
def e(f, old, new, why, n=1): E.append((f, old, new, why, n))

# ---------- the scripted lines, as one table the lint can read (02-F34) ----------
e('app.js', "  const sealCount = () => ((game.state.npc && game.state.npc.seals) || []).length;\n",
  "  const sealCount = () => ((game.state.npc && game.state.npc.seals) || []).length;\n"
  "  // the scripted lines (review words pass): one table, so telltest reads every line a scene says (APP.words())\n"
  "  const SAY = {\n"
  "    fern: ['Someone has the lamp on the west gate lit already. They do, most mornings.'], fernGo: ['Go on, then.'],\n"
  "    archCold: ['Eight critters sit around one fire. A ninth seat is carved empty.', 'The stone stays cold.'], archOpen: ['The stone warms.'],\n"
  "    door: ['The great door is not locked.', 'The handle is worn bright.'], greatLamp: ['The glass is warm.'],\n"
  "    seat: ['Something that has been kept here a very long time opens its eyes.', 'It looks at the empty seat, and then it chooses you instead.'],\n"
  "    window: ['Something small is asleep on the sill, curled against the warm glass.', 'It opens one eye.'],\n"
  "    forgeDoor: ['A doorway of dry heat, cut into the crater wall.', 'The forge has been quiet for a long time. Something inside is still warm.'],\n"
  "    furnace: ['You pull the soot-black door open. A single ember glows in the ash.', 'You blow on it. It brightens, then catches, then roars.'], furnaceLit: ['A coal in the ash shifts and looks up.', 'It climbs out, small and heavy and warm, and settles against your boots.'],\n"
  "    watchLit: 'They come most nights now. You are the one they come to.', watchBack: 'Back again.', watchFirst: 'Someone comes to the door most nights.', watchEnough: 'Enough for today. The bench is yours until morning.',\n"
  "    watchTop: ['Morning. You kept the whole watch.'], watchTopFirst: 'The lamp was yours all night.', watchTopAgain: 'Kept to morning again.', watchLoss: 'The bench is there. The watch is still yours.',\n"
  "    cityDone: ['Thank you.', 'That is today\\u2019s. Tomorrow there is another.'], cityAgain: 'That was today\\u2019s. Tomorrow there is another.',\n"
  "    socketCold: 'A socket, cold.', socketWarm: 'A socket, warm.', postCold: 'A lantern on a post. Cold.', postAhead: 'Lit before you got here.', postMine: 'It stays lit.'\n"
  "  };\n"
  "  // after the great lamp, the four city shops and Rowan say one thing that has changed (02-F30); the LETGO table above them stays as it is\n"
  "  const LIT_LINES = { juniper: ['The lamp over the stall was on when I opened. I had not lit it.'], tove: ['The lamp over the stall was on when I opened. I had not lit it.'], bea: ['The lamp over the stall was on when I opened. I had not lit it.'], marina: ['The lamp over the stall was on when I opened. I had not lit it.'], rowan: ['I saw a light go over the roofs last night. I did not get up.'] };\n",
  'F34 (the table the lint reads), F30')
e('app.js', "  return { build: 'review', homeLitNow",
  "  return { build: 'review', words: () => { const t = (o) => { const r = {}; Object.keys(o).forEach((k) => { r[k] = [].concat(...o[k].map((x) => (Array.isArray(x) ? x.filter((y) => typeof y !== 'number') : (typeof x === 'string' ? [x] : [])))).flat(); }); return r; }; return { scaffold: t(SCAFFOLD), letgo: t(LETGO), say: SAY, lit: LIT_LINES, watch: WATCH_LINES }; }, homeLitNow",
  'F34: APP.words() for the lint (review build only)')
e('app.js', "showDialog('Professor Fern', ['Someone has the lamp on the west gate lit already. They do, most mornings.'], null, openStarter)", "showDialog('Professor Fern', SAY.fern, null, openStarter)", 'F34 (moved to SAY)')
e('app.js', "showDialog('Professor Fern', ['Go on, then.'], null);", "showDialog('Professor Fern', SAY.fernGo, null);", 'F34 (moved to SAY)')

# ---------- F1, F14, 01-F18: the Keeper of the arch (Maren and Hale were done by package R) ----------
e('app.js', "['You found your way in. Few remember the rhyme.', 'Eight critters were enough for the world, they said. The ninth was kept here, asleep.', 'Prove you can be trusted with the seat.'], 'The seat is yours to approach. It has waited a very long time.'",
  "['You found your way in. Few remember the rhyme.', 'Eight seats are warm. One is not.'], 'The fire has not moved. Everything else has.'", 'F1, F14, 01-F18')
e('app.js', "{ boss: true, bonus: 10, afterLines: ['The seat is quiet now. Go and see it.'] }", "{ boss: true, bonus: 10, afterLines: ['I am still here. So is the seat.'] }", 'F1')

# ---------- F2, F3, 01-F20, 01-F21, F32: the four leaders ----------
e('app.js', "intro: ['I am Glacia, leader of Frost Peaks.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The cold keeps what it is given. Take the Frost Seal. It will keep.', sealLine: 'The Frost Seal is quiet. Quiet fires last longest. Ember Fields awaits at level 6.'",
  "intro: ['I am Glacia. This is my pool.', 'My critters were born in the snow. They do not melt easily.'], winLine: 'The pool is still. It will stay that way now.', sealLine: 'Nothing up here has moved since you came in.'", 'F3, F32, 01-F21')
e('app.js', "intro: ['So you made it to the heart of Ember Fields.', 'I am Blaze. My team burns at full power. Ready?'], winLine: 'You did not put it out. You fed it. Take the Ember Seal.', sealLine: 'This one wants feeding every day. Tide Shore opens at level 9.'",
  "intro: ['I am Blaze. This is my hearth.', 'My team burns at full power. Ready?'], winLine: 'All three at once. The woodpile is lower than it was.', sealLine: 'Someone will stack it again tonight. It is never me.'", 'F3, F32, 01-F21')
e('app.js', "intro: ['Welcome, young trainer. I am Elder Wren, leader of Moss Forest.', 'Show me that you and your critters grow together.'], winLine: 'Four in bloom. I did not see you hurry.', sealLine: 'The first fire is the easiest to keep. Frost Peaks opens at level 3.'",
  "intro: ['I am Wren. This is my garden.', 'The beds take their time.'], winLine: 'Four in bloom. I did not see you hurry.', sealLine: 'The beds will want you back. They always want someone.'", 'F3, F32, 01-F21 (Wren\'s win line was package R\'s; kept)')
e('app.js', "intro: ['Admiral Coral, leader of Tide Shore. Five critters, every one a veteran of the storm.', 'Win, and you will have tended every fire in the land.'], winLine: 'The sea gives back what it is given. The Tide Seal is yours.', sealLine: 'Four fires. Someone left a light on for you. Perhaps they still do. The trail north of Sproutvale is open.'",
  "intro: ['I am Coral. This is my lamp hall.', 'Five critters, every one of them came back from a storm.'], winLine: 'Every lamp answered. The chain is down.', sealLine: 'The harbour lamp was already lit when I came down this morning. Nobody here will say who.'", 'F2, F3, F32, 01-F20')
e('app.js', "intro: ['Welcome to Mossbrook, young trainer. I am Elder Wren, leader of this gym.', 'Show me that you and your critters grow together.'] });",
  "intro: ['I am Wren. This is my garden.', 'The beds take their time.'] });", 'F32')
e('app.js', "city('frost', 'frosthold', 'glacia', 'Welcome to Frosthold. I am Glacia, leader of this gym.', [", "city('frost', 'frosthold', 'glacia', 'I am Glacia. This is my pool.', [", 'F32')
e('app.js', "city('ember', 'cinderport', 'blaze', 'Welcome to Cinderport. I am Blaze, and this forge is my gym.', [", "city('ember', 'cinderport', 'blaze', 'I am Blaze. This is my hearth.', [", 'F32')
e('app.js', "city('tide', 'coralbay', 'coral', 'Welcome aboard in Coralbay. I am Admiral Coral, leader of this gym.', [", "city('tide', 'coralbay', 'coral', 'I am Coral. This is my lamp hall.', [", 'F32')
# the seal lines: the seal is given by the trial (gymDone), so the old justSealed path never runs; its words go, and the leader's second line is heard after the duel
e('app.js', "      const ls = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.'];\n      if (count === 4) ls.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.');\n",
  "      const ls = [n.sealLine];   // the count is on the Seals card; nobody says it (02-F2, 01-F20)\n", 'F2, 01-F20')
e('app.js', "      const lines = [n.sealLine, 'You now hold ' + count + ' of 4 Leader Seals.'];\n      if (count === 4) lines.push('You have tended every fire in the land. Nobody in Sproutvale has tended so many.');\n",
  "      const lines = [n.sealLine];\n", 'F2, 01-F20')
e('app.js', "    if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine, 'You earned ' + tr.reward + ' essence.'].filter((x) => x && !/^You earned 0 /.test(x))), 400);",
  "    if (won) { setTimeout(() => showDialog(tr.name, [tr.winLine].concat(tr.leader && npc && npc.sealLine ? [npc.sealLine] : []).filter((x) => x)), 400); /* the essence is paid and the counter moves; nobody says the number (02-F7, F18); a leader's second line is what she sees after the trial */",
  'F7, F18, F3')

# ---------- F4: the Lamp Tower (tab1, gates, Bex: done by package R; checked) ----------

# ---------- F7, F25, F32, F33: the map card, the menu, the action labels ----------
e('app.js', "c.lines = [ZONE_TYPES[id].join(' and ') + ' critters', found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? ': seal earned' : ': not yet beaten')];",
  "c.lines = [found + '/12 species found', L.name + (seals.indexOf(L.id) !== -1 ? '\\u2019s fire: kept' : '\\u2019s fire: not yet kept')];", 'F7, F25')
e('app.js', "mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Elder Wren’s gym'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s gym'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s gym'], coralbay: ['Coralbay', 'past Tide Shore, to the east', 'Admiral Coral’s gym'], peak: [\"Vigil Peak\", 'up the trail north of the plaza', 'The Tower']",
  "mossbrook: ['Mossbrook', 'past Moss Forest, to the west', 'Wren’s Garden'], frosthold: ['Frosthold', 'past Frost Peaks, to the north', 'Glacia’s Pool'], cinderport: ['Cinderport', 'past Ember Fields, to the south', 'Blaze’s Hearth'], coralbay: ['Coralbay', 'past Tide Shore, to the east', 'Coral’s Lamp Hall'], peak: [\"Vigil Peak\", 'north of the plaza', 'The Long Watch']",
  'F32, F33, F16')
e('app.js', "{ night: 'Night: Dusk critters roam every zone.', dawn: 'Dawn', dusk: 'Dusk', day: 'Daytime' }", "{ night: 'Night.', dawn: 'Dawn.', dusk: 'Dusk.', day: 'Daytime.' }", 'F25')
e('app.js', "function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label + (K.type ? ': more ' + K.type + ' critters' : '') : ''; }",
  "function weatherText(k) { const K = WEATHER.KINDS[k]; return K ? K.label : ''; }   // the weather is its name; what it brings out is met, not read (02-F25)", 'F25')
e('app.js', "{ id: 'seals', label: 'Seals', sub: ((st.npc && st.npc.seals) || []).length + '/4 leaders',", "{ id: 'seals', label: 'Fires', sub: ((st.npc && st.npc.seals) || []).length + '/4 kept',", 'F7')
e('app.js', "tower: 'Enter the Tower',", "tower: 'Go in',", 'F33')
e('app.js', "({ gym: 'Enter the gym', house: 'Go inside', shop: 'Browse' })", "({ gym: 'Go in', house: 'Go inside', shop: 'Browse' })", 'F32')
e('app.js', "if (e.to === 'peak') toast(\"The trail to Vigil Peak opens with all 4 Leader Seals. You hold \" + ((game.state.npc && game.state.npc.seals) || []).length + '.'); },",
  "if (e.to === 'peak') toast('Lashed shut.'); },", 'F12, 01-F24, F7')

# ---------- F8: the posts and braziers know their state ----------
e('app.js', "    if (o.kind === 'chamberlamp') { toast(",
  "    if (o.kind === 'postlamp' && !o.day) { const f = advOf().flags, mine = o.own || (!o.wave && !o.always && !!f.lampLit); toast(mine && f['own:' + o.id] ? SAY.postMine : (lampK[o.id] || 0) > 0.3 ? SAY.postAhead : SAY.postCold); return; }   // the post says what it is now (02-F8): cold, lit before you came, or kept by you\n"
  "    if (o.kind === 'chamberlamp') { toast(", 'F8')

# ---------- F9, F17, F18: Fern and the request-givers ----------
e('app.js', "ask: ['Ah, a new trainer! I am Professor Fern. I study critters here at the Lab.', 'Could you help my research? Discover 5 different species and come back. I will make it worth your while.'],",
  "ask: ['Ah, a new trainer. I am Professor Fern. I study critters here at the Lab.', 'Five kinds, and I will have a page to write.'],", 'F18')
e('app.js', "progress: (g) => 'You have found ' + (g.state.seen || []).length + ' of 5 species so far. The tall grass outside town is a good start.',",
  "progress: (g) => 'The page has ' + (g.state.seen || []).length + ' on it so far.',", 'F18')
e('app.js', "thanks: ['Five species already? Wonderful work!', 'Here are 10 essence for your trouble.'],", "thanks: ['Five already. I will start the page tonight.'],", 'F18')
e('app.js', "after: ['Keep exploring. The Species page in your Dex shows where each type lives.'] }),", "after: ['The pages are filling up.'] }),", 'F17')
e('app.js', "lines: ['Did you know? Sparkling grass hides rarer critters.', 'Trainers stand still and watch. If they see you, get ready to battle!'] },",
  "lines: ['The patch past the gate sparkles in the morning. I have never caught it starting.', 'Rowan has stood in the same spot since breakfast.'] },", 'F17')
e('app.js', "lines: ['Welcome to my stall! Potions for battles, charms for rare finds, tickets for one more roll.'] },", "lines: ['Potions and charms. Take what you need.'] },", 'F20')
e('app.js', "ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'Could you show me one? Keep a Stone critter and come back.'],",
  "ask: ['I collect pictures of Stone critters, but they hide so well up here.', 'I draw them. The Stone ones never hold still long enough.'],", 'F18')
e('app.js', "progress: () => 'Still no Stone critter? They live in the tall grass here in Frost Peaks.', thanks: ['A Stone critter! It is even rockier than I imagined.', 'Take these 6 essence, as thanks.'],",
  "progress: () => 'They do not come when called. They come when you stop.', thanks: ['A Stone critter! It is even rockier than I imagined.'],", 'F17, F18')
e('app.js', "progress: () => 'Evolve a critter in the Dex, then come back. Release extra critters to earn essence.', thanks: ['Whoa, look at the size of it!', 'Here, 8 essence. Thanks for showing me.'],",
  "progress: () => 'Pip grew a hand\\u2019s width over the summer and I did not notice until it had happened.', thanks: ['Whoa, look at the size of it!', 'Thanks for showing me.'],", 'F17, F18')
e('app.js', "lines: ['Every critter has a nature. Brave ones hit harder but bruise easier.', 'Pick the nature that fits how you like to battle.'] }",
  "lines: ['The brave ones in this forest come home bruised.', 'They go out again first.'] }", 'F17')
e('app.js', "ask: ['The waves sometimes wash up rare critters.', 'Have you found a Rare one yet? I would love to see it.'],",
  "ask: ['The waves sometimes wash up something rare.', 'Have you found a Rare one yet? I would love to see it.'],", 'F17 (the lint)')
e('app.js', "progress: () => 'Sparkling grass is the best place to find Rare critters.', thanks: ['A Rare critter! It practically glows.', 'Please, take 8 essence.'],",
  "progress: () => 'Nothing rare in the row this morning. The sea takes its time.', thanks: ['A Rare critter! It practically glows.'],", 'F17, F18')
e('app.js', "'Elder Wren says a critter that rests well battles well.'", "'Wren sleeps in the garden some nights. The beds do better for it.'", 'F17')
e('app.js', "'My mom says you can go your whole life and not see one. I am still looking!'", "'My dad keeps a jar for when I find one. Not if. When.'", 'F17')
e('app.js', "lines: ['Do not touch the lava pool. Ember critters swim in it. You cannot.', 'Blaze says a burn wears down even the toughest critter.',",
  "lines: ['The lava pool has a crust on it some mornings. Not today.', 'Blaze\\u2019s hall is the one chimney in town that never smokes. The fire is inside.',", 'F17')
e('app.js', "lines: ['The miners found a shiny rock critter last week! Shinies are rare, but they show up anywhere.', 'Admiral Coral\\u2019s harbor is east, past Tide Shore. The boardwalk starts by the water.'] }",
  "lines: ['The miners found a shiny rock critter last week! Petra has not stopped talking.'] }", 'F16, F17')
e('app.js', "'The Dex terminal records every species you keep. Use it any time.'", "'The terminal keeps every name. It has never lost one.'", 'F17')

# ---------- F16: the clue-givers and city talkers ----------
e('app.js', "'Highland Pass joins Mossbrook and Frosthold. The arch is older than both.'", "'The arch is older than both towns. They grew at the two ends of its road.'", 'F16')
e('app.js', "lines: ['They say a tower stands on Vigil Peak, up the trail north of Sproutvale\\u2019s plaza.', 'Only those with all four Leader Seals go up. They say every night up there, someone comes to the door.', 'Before first light",
  "lines: ['Every night up on the Peak, they say, someone comes to the door.', 'Before first light", 'F16')
e('app.js', "'After her seal, climb the Tower. It is up the trail north of Sproutvale.'", "'Coral trims the harbour lamp herself. She says the one on the Peak is the only lamp she has never seen lit.'", 'F16')
e('app.js', "lines: ['Welcome to the rim camp! The trail zig-zags down five ledges to the crater floor. The vents get hot, but the camp never does.', 'The climbers down there",
  "lines: ['The climbers down there", 'F16')
e('app.js', "lines: ['Welcome to base camp! Five ledges lead up to the summit, and the trail zig-zags so the wind cannot find you.', 'The climbers sit where they can see the trail. The snow moves when nobody is walking on it. Near the top, it sparkles.'] }",
  "lines: ['The climbers sit where they can see the trail. The snow moves when nobody is walking on it.'] }", 'F16')
e('app.js', "'They say the beacon above once lit every road in the land. Four fires and one lamp, and the whole country knew where home was.'",
  "'They say the beacon above once lit every road in the land. My grandmother could see it from her kitchen. She never drew the curtain.'", 'F15, 01-F19')

# ---------- F7, F19 (part): "Here is your reward." off every win line ----------
for old, new in [("'Wow, you are good! Here is your reward.'", "'Wow, you are good!'"), ("'Ha! You earned your welcome. Here is your reward.'", "'Ha! You earned your welcome.'"),
                 ("'Brr, you are tough. Here is your reward.'", "'Brr, you are tough.'"), ("'Blow me down! A fine battle. Here is your reward.'", "'Blow me down! A fine battle.'"),
                 ("'You climbed right over me. Here is your reward.'", "'You climbed right over me.'"), ("'You chopped right through my team. Here is your reward.'", "'You chopped right through my team.'"),
                 ("'Hooked and landed. You win this one. Here is your reward.'", "'Hooked and landed. You win this one.'"), ("'You out-swam me! Here is your reward.'", "'You out-swam me!'"),
                 ("'Forged in fire! You earned this reward.'", "'Forged in fire!'")]:
    e('app.js', old, new, 'F7')
e('app.js', "beatenLines: ['Rest up and come back tomorrow. The berries will be ripe again.'] },", "beatenLines: ['Tomorrow. The berries will be ripe again.'] },", 'F18 (the lint: "and come back")')

# ---------- F20: the shops ----------
e('app.js', "lines: ['Welcome to the Herb Hut! Same remedies as Mira in Sproutvale, brewed with Mossbrook leaves.'] },", "lines: ['The shelf is full again. It is, every morning.'] },", 'F20')
e('app.js', "lines: ['Supplies for the cold road. Same goods as Sproutvale, packed for the snow.'] },", "lines: ['Packed for the snow. Counted twice.'] },", 'F20')
e('app.js', "lines: ['Forge Market! Same remedies as Mira\\u2019s, kept warm by the furnace.'] },", "lines: ['Nothing on this shelf has ever gone cold.'] },", 'F20')
e('app.js', "lines: ['Harbor Market! Same goods as Sproutvale, shipped in fresh.'] },", "lines: ['The crate comes back half full with every tide. It always does.'] },", 'F20')

# ---------- F30: after the lamp, the shops and Rowan ----------
e('app.js', "    const dk = darkLines(n), sc = letGoLines(n) || dk || scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after });\n",
  "    const dk = darkLines(n), sc = letGoLines(n) || dk || scaffoldLines(n); if (sc) n = Object.assign({}, n, { lines: sc, afterLines: letGoLines(n) ? sc : n.afterLines, after: n.after ? sc : n.after });\n"
  "    if (LIT_LINES[n.id] && advOf().flags.lampLit) { const L = LIT_LINES[n.id]; n = Object.assign({}, n, n.trainer ? { intro: L.concat(n.intro.slice(1)), beatenLines: L, afterLines: L } : { lines: L }); }   // after the lamp (02-F30)\n",
  'F30')

# ---------- F18, 04-W13: the city favours ----------
e('app.js', "      if (Q.claimed) { showDialog(n.name, n.lines.concat(['Thanks again for today! I will have a new favor tomorrow.'])); return; }\n      if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, ['You did it! Thank you so much.', 'Here, take this: +' + CQ_REWARD + ' essence and some trainer experience.']); return; }\n      showDialog(n.name, [n.lines[0], 'Could you do me a favor today? Please ' + Q.q.txt + '.', 'Progress: ' + Q.n + '/' + Q.q.n + '. Come back to me when it is done. I have a new favor every day.']); return;\n",
  "      if (Q.claimed) { showDialog(n.name, n.lines.concat([SAY.cityAgain])); return; }\n      if (Q.done) { game.claimCityQuest(qcity); game.sfx('claim'); showDialog(n.name, SAY.cityDone); return; }   // the essence and the experience are paid; the counters move (02-F18, 04-W13)\n      showDialog(n.name, [n.lines[0], 'Today it is this: ' + Q.q.txt + '.']); return;   // the progress is on the Quests card, not in her mouth\n",
  'F18, 04-W13')

# ---------- F21, 04-W12: the arch, the journal, the forge sockets ----------
e('app.js', "showDialog('The old arch', ['Eight critters sit around one fire. A ninth seat is carved empty.', 'The stone stays cold.'], null, () => gainClue(ruin));", "showDialog('The old arch', SAY.archCold, null, () => gainClue(ruin));", 'F34 (moved to SAY)')
e('app.js', "showDialog('The old arch', ['The carved flame between the pillars begins to glow...', 'A passage opens in the old arch.'], null,", "showDialog('The old arch', SAY.archOpen, null,", 'F21')
e('app.js', "(f.rubble ? 'the way north is clear.' : 'rubble blocks the way north. The empty seat, a fire bowl, a lamp and a hull lantern must mean something.')", "(f.rubble ? 'the way north is clear.' : 'rubble blocks the way north.')", 'F21')
e('app.js', "lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate opens when both hub sockets hold a core (' + ((f['sock:A'] ? 1 : 0) + (f['sock:B'] ? 1 : 0)) + '/2). One core lies in each side hall.')); }",
  "lines.push('The Forge Below: ' + (f.forgeLit ? 'the great furnace is lit.' : 'the north gate is shut.')); }", '04-W12, F21')
e('app.js', " else if ((game.state.visited || []).indexOf('ascent') !== -1) lines.push('The Cold Ascent climbs north from Frosthold.'); else if (have.length === ADV.CLUES.length) lines.push('You have every clue. The arch in Highland Pass should answer now.');",
  " else if ((game.state.visited || []).indexOf('ascent') !== -1) lines.push('The Cold Ascent climbs north from Frosthold.');", 'F21')
e('app.js', "toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands. Carry it to the hub.');", "toast('You lift the core of ' + CORE_NAME[o.core] + '. It is warm in your hands.');", '04-W12')
e('app.js', "    if (f['sock:' + c]) { toast('The socket glows steadily.'); return; }\n    if (!f['core:' + c]) { toast('A socket for the core of ' + CORE_NAME[c] + '. It belongs in one of the side halls.'); return; }",
  "    if (f['sock:' + c]) { toast(SAY.socketWarm); return; }\n    if (!f['core:' + c]) { toast(SAY.socketCold); return; }", '04-W12')
e('app.js', "toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket. One more.');",
  "toast(both ? 'Both sockets wake. Far to the north, a slab of black iron grinds aside.' : 'The core of ' + CORE_NAME[c] + ' settles into its socket.');", '04-W12')

# ---------- the other scenes into SAY (same words) ----------
e('app.js', "showDialog('The door', ['The great door is not locked.', 'The handle is worn bright.'], null,", "showDialog('The door', SAY.door, null,", 'F22 (package R\'s words, checked; moved to SAY)')
e('app.js', "setTimeout(() => { if (!dlg) showDialog('The great lamp', ['The glass is warm.']); }, 700);", "setTimeout(() => { if (!dlg) showDialog('The great lamp', SAY.greatLamp); }, 700);", 'F6 (package R\'s words, checked; moved to SAY)')
e('app.js', "showDialog('The ninth seat', ['Something that has been kept here a very long time opens its eyes.', 'It looks at the empty seat, and then it chooses you instead.'], null,", "showDialog('The ninth seat', SAY.seat, null,", 'F34 (moved to SAY)')
e('app.js', "showDialog('The window', ['Something small is asleep on the sill, curled against the warm glass.', 'It opens one eye.'], null,", "showDialog('The window', SAY.window, null,", 'F34 (moved to SAY)')
e('app.js', "showDialog('The forge door', ['A doorway of dry heat, cut into the crater wall.', 'The forge has been quiet for a long time. Something inside is still warm.'], null,", "showDialog('The forge door', SAY.forgeDoor, null,", 'F34 (moved to SAY)')
e('app.js', "showDialog('The great furnace', ['A coal in the ash shifts and looks up.', 'It climbs out, small and heavy and warm, and settles against your boots.'], null,", "showDialog('The great furnace', SAY.furnaceLit, null,", 'F34 (moved to SAY)')
e('app.js', "showDialog('The great furnace', ['You pull the soot-black door open. A single ember glows in the ash.', 'You blow on it. It brightens, then catches, then roars.'], null,", "showDialog('The great furnace', SAY.furnace, null,", 'F6 (package R\'s words, checked; moved to SAY)')
e('app.js', "const intro = [lit ? 'They come most nights now. You are the one they come to.' : (t.best ? 'Back again.' : 'Someone comes to the door most nights.'), WATCH_LINES[tw.id] || tw.name + '.'];\n    if (!left) { showDialog(KEEPER, [intro[0], 'Enough for today. The bench is yours until morning.']); return; }",
  "const intro = [lit ? SAY.watchLit : (t.best ? SAY.watchBack : SAY.watchFirst), WATCH_LINES[tw.id] || tw.name + '.'];\n    if (!left) { showDialog(KEEPER, [intro[0], SAY.watchEnough]); return; }", 'F23 (package R\'s words, checked; moved to SAY)')
e('app.js', "showDialog(KEEPER, ['Morning. You kept the whole watch.', res.first ? 'The lamp was yours all night.' : 'Kept to morning again.'])", "showDialog(KEEPER, SAY.watchTop.concat([res.first ? SAY.watchTopFirst : SAY.watchTopAgain]))", 'F34 (moved to SAY)')
e('app.js', "'The bench is there. The watch is still yours.']), 60);", "SAY.watchLoss]), 60);", 'F34 (moved to SAY)')

# ---------- world.js: the thirty signs (F11, F12, 01-F24, 03-F8) and the observations (F28) ----------
e('world.js', "text: 'North: Frost Peaks (Frost and Stone critters). Beyond the peaks lies Frosthold, where Glacia keeps her gym.'", "text: 'North: Frost Peaks, then Frosthold.'", 'F11')
e('world.js', "text: 'South: Ember Fields (Ember and Volt critters). Past the fields, Blaze runs the forge gym of Cinderport.'", "text: 'South: Ember Fields, then Cinderport.'", 'F11')
e('world.js', "text: 'West: Moss Forest (Moss and Bloom critters). Elder Wren waits in Mossbrook, on the far side of the forest.'", "text: 'West: Moss Forest, then Mossbrook.'", 'F11')
e('world.js', "text: 'East: Tide Shore (Tide and Dusk critters). Follow the boardwalk past the shore to reach Admiral Coral in Coralbay.'", "text: 'East: Tide Shore, then Coralbay.'", 'F11')
e('world.js', "text: \"North: Vigil Peak. The trail opens to trainers holding all 4 Leader Seals.\"", "text: 'North: Vigil Peak.'", 'F11, F7, F2 (the trail opens by itself)')
e('world.js', "text: z.name + ': ' + z.types.join(' and ') + ' critters hide in the tall grass. Sparkling grass hides rarer finds.'", "text: z.name + '.'", 'F11 (the zone and route signs: twelve)')
e('world.js', "text: \"Vigil Peak. The Long Watch stands at the summit. Twenty nights, one lamp.\"", "text: 'Vigil Peak.'", '03-F8')
e('world.js', "text: \"Mossbrook: a village under the old trees. Elder Wren's gym stands at the north end.\"", "text: 'Mossbrook: a village under the old trees.'", 'F11')
e('world.js', "text: \"Frosthold: the fort at the edge of the peaks. Glacia's gym stands behind the plaza.\"", "text: 'Frosthold: the fort at the edge of the peaks.'", 'F11')
e('world.js', "text: \"Cinderport: forge town of the south. Blaze's gym burns at the north end of the plaza.\"", "text: 'Cinderport: forge town of the south.'", 'F11')
e('world.js', "text: \"Coralbay harbor. Admiral Coral's gym looks out over the plaza.\"", "text: 'Coralbay harbor.'", 'F11')
e('world.js', "text: 'West: Mossbrook village, home of Elder Wren.'", "text: 'West: Mossbrook village.'", 'F11')
e('world.js', "text: \"North: Frosthold, the fort town. Glacia's gym is there.\"", "text: 'North: Frosthold, the fort town.'", 'F11')
e('world.js', "text: \"South: Cinderport, the forge town. Blaze's gym is there.\"", "text: 'South: Cinderport, the forge town.'", 'F11')
e('world.js', "text: \"East, along the boardwalk: Coralbay harbor. Admiral Coral's gym is there.\"", "text: 'East, along the boardwalk: Coralbay harbor.'", 'F11')
for a, b in [("'North: the Highland Pass (Moss and Frost critters), the road to Frosthold.'", "'North: Highland Pass, to Frosthold.'"), ("'West: the Highland Pass (Moss and Frost critters), the road to Mossbrook.'", "'West: Highland Pass, to Mossbrook.'"),
             ("'West: the Ashwood Trail (Ember and Moss critters), the road to Mossbrook.'", "'West: Ashwood Trail, to Mossbrook.'"), ("'South: the Ashwood Trail (Ember and Moss critters), the road to Cinderport.'", "'South: Ashwood Trail, to Cinderport.'"),
             ("'East: the Glacier Coast (Frost and Tide critters), the road to Coralbay.'", "'East: Glacier Coast, to Coralbay.'"), ("'North: the Glacier Coast (Frost and Tide critters), the road to Frosthold.'", "'North: Glacier Coast, to Frosthold.'"),
             ("'South: the Reef Causeway (Tide and Ember critters), the road to Cinderport.'", "'South: Reef Causeway, to Cinderport.'"), ("'East: the Reef Causeway (Tide and Ember critters), the road to Coralbay.'", "'East: Reef Causeway, to Coralbay.'")]:
    e('world.js', a, b, 'F11 (city exits)')
e('world.js', "text: 'South: the Cinder Descent. A trail winds down into the volcano to an old forge (Ember and Stone critters). Climbers should be at least level 13.'", "text: 'South: the Cinder Descent.'", 'F11, 01-F24 (the level sentence)')
e('world.js', "text: 'The Cinder Descent. Five ledges down into the caldera. Wild Ember and Stone critters hide in the ash tufts. The heat is real, so do not hurry back up.'", "text: 'The Cinder Descent. Five ledges down into the caldera.'", 'F11')
e('world.js', "text: 'North: the Cold Ascent. A trail climbs into the peaks (Frost and Stone critters). Climbers should be at least level 11.'", "text: 'North: the Cold Ascent.'", 'F11, 01-F24 (the level sentence)')
e('world.js', "text: 'The Cold Ascent. Five ledges up into the peaks. Wild Frost and Stone critters hide in the snow tufts. Turn back if the weather turns.'", "text: 'The Cold Ascent. Five ledges up into the peaks.'", 'F11 (the place, not a beacon: 10 item 17)')
e('world.js', "{ step: 18, start: 10, own: true, text: 'A lantern on a post. It is lit.' });", "{ step: 18, start: 10, own: true, text: 'A lantern on a post.' });", 'F8', 2)
e('world.js', "text: 'A lamp on a post by the gate. Lit, in daylight. Someone keeps it that way.'", "text: 'A lamp on a post by the gate. Lit, in daylight.'", 'F28')
e('world.js', "'A well. The bucket is up, and full. Someone drew it before you came.'", "'A well. The bucket is up, and full.'", 'F28')
e('world.js', "{ id: 'gym-wren', name: \"Wren's Gym\",", "{ id: 'gym-wren', name: \"Wren's Garden\",", 'F32')
e('world.js', "gymName: \"Glacia's Gym\"", "gymName: \"Glacia's Pool\"", 'F32')
e('world.js', "gymName: \"Blaze's Forge Gym\"", "gymName: \"Blaze's Hearth\"", 'F32')
e('world.js', "gymName: \"Coral's Harbor Gym\"", "gymName: \"Coral's Lamp Hall\"", 'F32')
e('world.js', "    ascent: [['camp', [6, 57]],", "    ascent: [['camp', [6, 57], 'A traveller\\u2019s camp. The stew is still warm, but nobody is here. A note says: \"Gone up. The stew is for whoever comes down.\"'],", 'F27')
e('world.js', "    descent: [['camp', [6, 7]],", "    descent: [['camp', [6, 7], 'A traveller\\u2019s camp. The stew is still warm, but nobody is here. A note says: \"Gone down. Keep the stew warm.\"'],", 'F27')

# ---------- adventure.js: the halls' names, the braziers, the torch, the woodpile ----------
for who, new in [('Wren', 'Garden'), ('Glacia', 'Pool'), ('Blaze', 'Hearth'), ('Coral', 'Lamp Hall')]:
    e('adventure.js', "name: '%s\\u2019s Gym'" % who, "name: '%s\\u2019s %s'" % (who, new), 'F32')
e('adventure.js', "objects.push({ id: 'br' + (i + 1), kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' })", "objects.push({ id: 'br' + (i + 1), kind: 'brazier', x: x, y: y, text: 'A brazier. No soot above it.' })", 'F8')
e('adventure.js', "objects.push({ id: 'blb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' })", "objects.push({ id: 'blb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Ash a hand deep under it.' })", 'F8')
e('adventure.js', "objects.push({ id: 'clb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Somebody keeps it lit.' })", "objects.push({ id: 'clb' + i, kind: 'brazier', x: x, y: y, text: 'A brazier. Salt on the iron.' })", 'F8')
e('adventure.js', "text: 'A torch by the door. Someone lit it for whoever comes.'", "text: 'A torch by the door, lit.'", 'F28')
e('adventure.js', "text: 'Split logs, stacked by someone who stacks logs every day.'", "text: 'Split logs, stacked. The bark is still wet.'", 'F28')

# ---------- weather.js, base.js, game.js, data.js, screen.html: the UI ----------
for k, lab, note in [('sun', 'Sunny', 'Bloom critters bask in the sun'), ('rain', 'Rain', 'Tide critters come out in the rain'), ('storm', 'Thunderstorm', 'Volt critters ride the storm'),
                     ('snow', 'Snow', 'Frost critters roam in the snow'), ('fog', 'Fog', 'Dusk critters hide in the fog'), ('ash', 'Ashfall', 'Stone critters dig out of the ash')]:
    e('weather.js', ", note: '%s' }" % note, " }", 'F25 (WEATHER.KINDS has no note)')
e('base.js', "'Tint the world by your local time. Dusk critters come out at night.'", "'Tint the world by your local time.'", 'F25')
e('base.js', "'Rain, snow, fog and sun that change every 6 hours and bring out other critters.'", "'Rain, snow, fog and sun, changing through the day.'", 'F25')
e('game.js', "status: got ? 'Seal earned' : (open ? 'Waiting in ' + mapName(npcHome(L.id) || L.zone) : 'Behind a shut gate'), aria: L.name + ', ' + (got ? 'seal earned' : 'seal not earned') };",
  "status: got ? 'Kept' : (open ? 'Waiting in ' + mapName(npcHome(L.id) || L.zone) : 'Behind a shut gate'), aria: L.name + ', ' + (got ? 'fire kept' : 'fire not yet kept') };", 'F7')
e('screen.html', '>Leader seals</span>', '>The four fires</span>', 'F7')
e('screen.html', '{{sealCount}}/4 earned</span>', '{{sealCount}}/4 kept</span>', 'F7')
e('screen.html', '>Keeper of Four Fires</p>', '>Fire-keeper</p>', 'F7 (one name for one state)')
e('data.js', "{ id: 'champion', name: 'Fire-keeper', desc: 'Earn all 4 Leader Seals',", "{ id: 'champion', name: 'Fire-keeper', desc: 'Keep all four fires',", 'F7')

# ---------- found by the widened lint after the first pass ----------
e('app.js', "seals: 'Leader seals' }[id]", "seals: 'The four fires' }[id]", 'F7 (the menu scrolls to the renamed heading)')
e('app.js', "'Take the core. The forge chose you before I did.'", "'The core is yours. The forge chose you before I did.'", 'F34 (the lint: an order in a win line)')

if __name__ == '__main__':
    texts = {}
    for f, old, new, why, n in E:
        p = R + f; t = texts.get(p) or open(p, encoding='utf-8').read()
        c = t.count(old)
        if c != n: sys.exit('%s: expected %d of %r, found %d (%s)' % (f, n, old[:90], c, why))
        texts[p] = t.replace(old, new)
    for p, t in texts.items(): open(p, 'w', encoding='utf-8').write(t)
    print('applied', len(E), 'edits to', len(texts), 'files')
