const ABILITIES = { // passive, one per type, both sides (numbers live in Component.hit/resolve)
  Ember: { name: 'Blaze', text: 'Deals 15% more damage while below half HP.' },
  Tide: { name: 'Drizzle', text: 'Heals 2% of its max HP at the end of every round.' },
  Moss: { name: 'Thick Bark', text: 'The first hit it takes each battle does 30% less.' },
  Volt: { name: 'Static', text: '20% chance to daze whoever hits it.' },
  Frost: { name: 'Numb', text: 'Takes 8% less damage from every hit.' },
  Dusk: { name: 'Veil', text: '5% chance to dodge a hit.' },
  Stone: { name: 'Sturdy', text: 'Once per battle, survives a knock-out with 1 HP if it started the hit above 60% HP.' },
  Bloom: { name: 'Regrow', text: 'Once per battle, heals 15% when it drops below 30% HP.' }
};

// ---- Evolution look: what a critter GROWS at stage 2 and 3 (parts layered behind / over the unchanged base body) ----
// A feature is a list of primitives [x, y, w, h, radius, rotation, colour] relative to an anchor; colour keys: f = the critter's own body fill, a / d / l = the type's accent / dark / light.
// Anchors: crest = (body centre, body top), tail = (right edge - 10, body bottom - 30), wing = right shoulder (mirrored for the left side). x, y are the top-left corner offsets.
// Stage 2 gets legs, arms, a tail and a small crest; stage 3 adds wings, a bigger crest and tail, and a chest gem. Body shape (0..5) sets the limb plan.
const EVO_COL = {
  Ember: { a: '#FFC24D', d: '#E8552A', l: '#FFE9A8' }, Tide: { a: '#9AD8FF', d: '#2A6FB0', l: '#E0F4FF' }, Moss: { a: '#7CCB5A', d: '#1F6A40', l: '#D4F2B8' },
  Volt: { a: '#FFF08A', d: '#C99A00', l: '#FFFBD0' }, Frost: { a: '#E8F8FF', d: '#6FB8D8', l: '#FFFFFF' }, Dusk: { a: '#5B3FB8', d: '#33226E', l: '#B9A6F0' },
  Stone: { a: '#C9BFB2', d: '#6E655A', l: '#EDE6DC' }, Bloom: { a: '#FFD1E8', d: '#D6568F', l: '#FFF0F7' }
};
const EVO_WING = { // shared wing shapes (right side)
  leaf: [[2, -32, 60, 26, '0 100% 0 100%', -34, 'a'], [4, -12, 50, 22, '0 100% 0 100%', -14, 'l'], [6, 6, 38, 18, '0 100% 0 100%', 4, 'a']],
  bat: [[4, -26, 52, 46, '30% 70% 30% 70%', -12, 'a'], [0, -40, 10, 52, '5px', -26, 'd'], [12, -36, 10, 50, '5px', -8, 'd'], [26, -26, 10, 42, '5px', 12, 'd']],
  fin: [[2, -30, 54, 42, '50% 50% 10% 90%', -22, 'a'], [8, -8, 42, 26, '50% 50% 10% 90%', -6, 'l']],
  flame: [[0, -38, 54, 28, '100% 0 100% 0', -40, 'a'], [2, -16, 50, 24, '100% 0 100% 0', -20, 'd'], [6, 4, 38, 18, '100% 0 100% 0', 0, 'a']],
  petal: [[2, -34, 36, 40, '50%', -30, 'a'], [20, -20, 36, 38, '50%', -12, 'l'], [8, -4, 34, 32, '50%', -8, 'a']],
  shard: [[4, -40, 16, 52, '50% 50% 4px 4px', -28, 'a'], [20, -34, 14, 46, '50% 50% 4px 4px', -8, 'l'], [34, -22, 12, 38, '50% 50% 4px 4px', 14, 'a']],
  slab: [[2, -22, 36, 40, '6px', -18, 'd'], [26, -14, 32, 32, '6px', 8, 'a']]
};
const EVO_FEAT = {
  Ember: { wing: 'flame',
    crest: [[-9, -36, 18, 38, '50% 0 50% 50%', -45, 'a'], [-28, -22, 16, 28, '50% 0 50% 50%', -70, 'f'], [12, -22, 16, 28, '50% 0 50% 50%', -20, 'f']],
    tail: [[0, 0, 34, 18, '50%', -60, 'f'], [8, -40, 22, 32, '50% 0 50% 50%', -15, 'a']] },
  Tide: { wing: 'fin',
    crest: [[-8, -36, 16, 46, '50% 50% 20% 20%', 0, 'a'], [-24, -24, 14, 34, '50% 50% 20% 20%', -22, 'f'], [10, -24, 14, 34, '50% 50% 20% 20%', 22, 'f']],
    tail: [[0, 0, 34, 16, '50%', -60, 'f'], [6, -42, 26, 36, '20% 60% 60% 20%', -10, 'a']] },
  Moss: { wing: 'leaf',
    crest: [[-8, -38, 16, 42, '0 100% 0 100%', 20, 'a'], [-28, -26, 16, 34, '100% 0 100% 0', -28, 'f'], [12, -26, 16, 34, '0 100% 0 100%', 28, 'f']],
    tail: [[0, 0, 32, 16, '50%', -60, 'f'], [8, -42, 20, 36, '0 100% 0 100%', 10, 'a']] },
  Volt: { wing: 'bat',
    crest: [[-6, -38, 12, 32, '50% 50% 0 0', 0, 'a'], [-24, -28, 10, 26, '50% 50% 0 0', -30, 'a'], [14, -28, 10, 26, '50% 50% 0 0', 30, 'a']],
    tail: [[2, -2, 20, 12, '3px', -70, 'a'], [12, -22, 20, 12, '3px', 20, 'a'], [6, -40, 20, 12, '3px', -60, 'a']] },
  Frost: { wing: 'shard',
    crest: [[-7, -42, 14, 44, '50% 50% 4px 4px', 0, 'a'], [-26, -28, 12, 32, '50% 50% 4px 4px', -26, 'l'], [14, -28, 12, 32, '50% 50% 4px 4px', 26, 'l']],
    tail: [[0, 0, 30, 14, '50%', -60, 'f'], [10, -42, 14, 34, '50% 50% 4px 4px', 10, 'a']] },
  Dusk: { wing: 'bat',
    crest: [[-34, -26, 16, 40, '60% 0 40% 0', -30, 'd'], [18, -26, 16, 40, '0 60% 0 40%', 30, 'd']],
    tail: [[0, 0, 30, 16, '50%', -60, 'd'], [10, -30, 24, 18, '50%', -30, 'a'], [14, -48, 14, 12, '50%', 0, 'l']] },
  Stone: { wing: 'slab',
    crest: [[-32, -24, 22, 32, '4px', -15, 'a'], [10, -24, 22, 32, '4px', 15, 'a'], [-10, -32, 20, 28, '4px', 0, 'd']],
    tail: [[0, 0, 30, 14, '50%', -60, 'f'], [8, -44, 26, 26, '40%', 0, 'd']] },
  Bloom: { wing: 'petal',
    crest: [[-10, -36, 20, 32, '50%', 0, 'a'], [-34, -26, 20, 32, '50%', -45, 'a'], [14, -26, 20, 32, '50%', 45, 'a'], [-40, -8, 20, 30, '50%', -80, 'l'], [20, -8, 20, 30, '50%', 80, 'l']],
    tail: [[0, 0, 30, 12, '50%', -60, 'f'], [8, -46, 26, 26, '50%', 0, 'a'], [14, -40, 14, 14, '50%', 0, 'd']] }
};
const EVO_PLAN = [ // by body shape: arm length / width / tilt / height on the body, leg width; Boxy has shoulder plates instead of arms
  { arm: 42, aw: 22, tilt: 24, at: 0.40, leg: 30 }, { arm: 30, aw: 24, tilt: 38, at: 0.50, leg: 36 }, { arm: 56, aw: 20, tilt: 14, at: 0.34, leg: 26 },
  { arm: 34, aw: 24, tilt: 50, at: 0.56, leg: 40 }, { arm: 46, aw: 22, tilt: 28, at: 0.46, leg: 32 }, { arm: 0, aw: 0, tilt: 0, at: 0.3, leg: 34, pads: true }
];
// ---- the secret critter of the Sealed Arch: a hand-designed single-form species (#49, outside the 48), reached only through the reserved seed ----
const SECRET_SEED = 1000001;   // normal seeds stop at 999999 (rolls, wild encounters, typed seeds), so this can never come up by chance
const SECRET = {
  name: 'Veilcrown', speciesNo: 49,
  ability: { name: 'Last Light', text: 'Once per battle, survives a knock-out with 1 HP, and its next hit lands 30% harder.' },
  flavor: 'Kept beneath the old arch since before the eight statues were carved. It wears the crown that nobody ever claimed.',
  stats: [['HP', 120], ['ATK', 110], ['DEF', 106], ['SPD', 100]],   // level 1 values (total 436, about what the best of ten kept stage-3 critters reaches); the usual +3% per level applies (160 / 146 / 141 / 133 at level 12)
  moves: [{ name: 'Crown Strike', power: 66 }, { name: 'Eclipse Wave', power: 92 }]
};
const FREE_SIGHTINGS = 40;
const KEEP_COST = { Common: 1, Uncommon: 2, Rare: 4, Mythic: 8 };
const GATES = { moss: 1, frost: 3, ember: 6, tide: 9 };
const ZONE_NAMES = { moss: 'Moss Forest', frost: 'Frost Peaks', ember: 'Ember Fields', tide: 'Tide Shore' };
// where an NPC stands now (leaders moved into city gyms) and that map's display name
const npcHome = (id) => { if (typeof WORLD === 'undefined') return null; const all = WORLD.allNpcs(); for (const k in all) if ((all[k] || []).some((n) => n.id === id)) return k; return null; };
const mapName = (id) => (typeof WORLD !== 'undefined' && WORLD.MAPS[id] ? WORLD.MAPS[id].name : (ZONE_NAMES[id] || id));
// routes open at the higher gate of the two places they join, so no route skips a gate
// daily city side quests: one per city per day, rotating among three kinds (reward kept small: XP is the point)
const CITY_QUESTS = {
  mossbrook: { giver: 'bryn', list: [{ k: 'see', map: 'moss', n: 5, txt: 'spot 5 wild critters in Moss Forest' }, { k: 'keep', types: ['Moss', 'Bloom'], n: 1, txt: 'keep a Moss or Bloom critter' }, { k: 'beat', id: 'sorrel', n: 1, txt: 'beat Forager Sorrel' }] },
  frosthold: { giver: 'olaf', list: [{ k: 'see', map: 'route-mf', n: 5, txt: 'spot 5 wild critters on Highland Pass' }, { k: 'keep', types: ['Frost', 'Stone'], n: 1, txt: 'keep a Frost or Stone critter' }, { k: 'beat', id: 'kai', n: 1, txt: 'beat Mountaineer Kai on Highland Pass' }] },
  cinderport: { giver: 'ruby', list: [{ k: 'see', map: 'route-cm', n: 5, txt: 'spot 5 wild critters on Ashwood Trail' }, { k: 'keep', types: ['Ember', 'Volt'], n: 1, txt: 'keep an Ember or Volt critter' }, { k: 'beat', id: 'elm', n: 1, txt: 'beat Woodcutter Elm on Ashwood Trail' }] },
  coralbay: { giver: 'pearl', list: [{ k: 'see', map: 'route-cc', n: 5, txt: 'spot 5 wild critters on Reef Causeway' }, { k: 'keep', types: ['Tide', 'Dusk'], n: 1, txt: 'keep a Tide or Dusk critter' }, { k: 'beat', id: 'mako', n: 1, txt: 'beat Diver Mako on Reef Causeway' }] }
};
const CQ_REWARD = 4;
const ROUTE_GATES = { 'route-mf': 3, 'route-cm': 6, 'route-fc': 9, 'route-cc': 9 };
const LEADERS = [
  { id: 'wren', zone: 'moss', name: 'Elder Wren', color: '#4FB06D' },
  { id: 'glacia', zone: 'frost', name: 'Glacia', color: '#8FD8EA' },
  { id: 'blaze', zone: 'ember', name: 'Blaze', color: '#FF7A45' },
  { id: 'coral', zone: 'tide', name: 'Admiral Coral', color: '#3E8EF7' }
];
const SHINY_ODDS = 200;
// city items (strengths tuned with itemsim.py so each is worth about a Super Potion)
const ITEM_FX = { herb: { heal: 0.4 }, ward: { hits: 5, mult: 0.35 }, whet: { mult: 1.7 } };
const BAG0 = { potion: 0, super: 0, charm: 0, ticket: 0, herb: 0, ward: 0, whet: 0, lure: 0 };
const CITY_ITEM = { mossbrook: 'herb', frosthold: 'ward', cinderport: 'whet', coralbay: 'lure' };
// titles stay earned once met; species milestones also pay essence (sized by milesim.py)
const TITLES = [
  { id: 'explorer', name: 'Explorer', desc: 'Discover 12 species', essence: 10, goal: 12, of: (s) => (s.seen || []).length },
  { id: 'collector', name: 'Collector', desc: 'Discover 24 species', essence: 15, goal: 24, of: (s) => (s.seen || []).length },
  { id: 'naturalist', name: 'Naturalist', desc: 'Discover 36 species', essence: 20, goal: 36, of: (s) => (s.seen || []).length },
  { id: 'master', name: 'Critter Master', desc: 'Discover all 48 species', essence: 40, goal: 48, of: (s) => (s.seen || []).length },
  { id: 'champion', name: 'Champion', desc: 'Earn all 4 Leader Seals', essence: 0, goal: 4, of: (s) => ((s.npc && s.npc.seals) || []).length },
  { id: 'climber', name: 'Tower Climber', desc: 'Clear floor 10 of the Tower', essence: 0, goal: 10, of: (s) => (s.tower && s.tower.best) || 0 },
  { id: 'summit', name: 'Summit Champion', desc: 'Clear all 20 Tower floors', essence: 0, goal: 20, of: (s) => (s.tower && s.tower.best) || 0 },
  { id: 'secret', name: 'The Ninth Seat', desc: 'Uncover a secret', essence: 20, goal: 1, of: (s) => ((s.caught || []).some((e) => e.seed === SECRET_SEED) ? 1 : 0) },
  { id: 'shiny', name: 'Shiny Hunter', desc: 'Keep 3 shiny critters', essence: 0, goal: 3, of: (s) => (s.shinies || []).length }
];
const TOWER = { floors: 20, runsPerDay: 2, heal: 0.3 };
// weekly Tower twist: one rule per week (multipliers tuned with towersim.py twist runs)
const TWISTS = [
  { id: 'surge', name: 'Surge Week', heal: 0.3, mult: 1, about: (t) => t + ' critters deal 30% more damage this week, yours and the Tower\u2019s alike.' },
  { id: 'iron', name: 'Iron Climb', heal: 0.15, mult: 1.5, about: () => 'Only a short rest between floors this week (15% instead of 30%), but new-best essence is worth 50% more.' },
  { id: 'wind', name: 'Second Wind', heal: 0.4, mult: 0.75, about: () => 'Your party rests 40% between floors this week (normally 30%). New-best essence is worth 25% less.' },
  { id: 'mono', name: 'One Element', heal: 0.3, mult: 1, about: () => 'Every floor fields a single type this week. Bring the right counters.' }
];
const TWIST_TYPES = ['Ember', 'Tide', 'Moss', 'Volt', 'Frost', 'Dusk', 'Stone', 'Bloom'];
const TOWER_NAMES = ['Pip the Squire', 'Juno', 'Ash', 'Vera', 'Warden Sable', 'Theo', 'Lark', 'Rhea', 'Quill', 'Warden Onyx', 'Mika', 'Dorian', 'Sage', 'Nell', 'Warden Aurora', 'Felix', 'Iris', 'Bastian', 'Selene', 'Sovereign Vale'];
// floor curve, tuned by towersim.py (see handoff); window.__towerCurve overrides it in simulations only
const TOWER_CURVE = { size: [3, 3, 3, 3, 4, 3, 4, 4, 4, 5, 4, 4, 4, 4, 5, 4, 5, 4, 5, 5], stage: [2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3], lv: [9, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 16, 17, 17, 18, 18, 19, 20], pick: [0.3, 0.35, 0.4, 0.3, 0.45, 0.4, 0.4, 0.45, 0.5, 0.55, 0.5, 0.55, 0.55, 0.6, 0.65, 0.55, 0.55, 0.6, 0.6, 0.7] };
const HABITAT = { Frost: 'Frost Peaks', Stone: 'Frost Peaks', Ember: 'Ember Fields', Volt: 'Ember Fields', Moss: 'Moss Forest', Bloom: 'Moss Forest', Tide: 'Tide Shore', Dusk: 'Tide Shore' };
const MAX_LV = 20;
const lvNeed = (lv) => 20 + 10 * (lv - 1);
