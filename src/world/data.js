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
