# Writes games/demo/game.json: a demo that proves the engine and the studio and says nothing (no sentence, no act, no
# station of a real game). Two maps, one person, one exit each way, one trigger that counts while you stay, one
# drawn tile and one drawn sprite so art rendering is covered, everything else a placeholder.
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'games', 'demo', 'game.json')
PAL = ['#1b1b24', '#3a5f3a', '#6aa84f', '#b8c48a', '#8a6a4a', '#d9b26f', '#ffffff', '#e04a4a', '#4a7fe0', '#2e2e3e', '#7a7a8a', '#f0d070']
def rows(s): return [l for l in s.strip('\n').split('\n')]
GRASS = rows("""
1111111111111111
1121111111111111
1111111111112111
1111111111111111
1111211111111111
1111111111111111
1111111121111111
1111111111111111
1211111111111111
1111111112111111
1111111111111111
1111111111111121
1111121111111111
1111111111111111
1111111111112111
1111111111111111""")
WATER = [rows("""
8888888888888888
8888888888888888
8886888888888888
8888888888888888
8888888888888888
8888888888866888
8888888888888888
8888888888888888
8888888888888888
8866888888888888
8888888888888888
8888888888888888
8888888888888888
8888888888888668
8888888888888888
8888888888888888"""), rows("""
8888888888888888
8888888888888888
8888888888888888
8888688888888888
8888888888888888
8888888888888888
8888888888888668
8888888888888888
8888888888888888
8888888888888888
8888866888888888
8888888888888888
8888888888888888
8888888888888888
8888888888888888
8888888888888888""")]
def body(eyes, legs):
    # 16x24 stand-in body with eyes placed per facing, two leg poses
    b = [['.'] * 16 for _ in range(24)]
    for y in range(4, 12):
        for x in range(4, 12): b[y][x] = '5'
    for y in range(12, 21):
        for x in range(4, 12): b[y][x] = '7'
    for (x, y) in eyes: b[y][x] = '0'
    for (x, y) in legs: b[y][x] = '0'
    return [''.join(r) for r in b]
def frames(facing):
    eyes = {'down': [(6, 8), (9, 8)], 'up': [], 'left': [(5, 8)], 'right': [(10, 8)]}[facing]
    base = [(5, 21), (6, 21), (9, 21), (10, 21)]
    f1 = body(eyes, base); f2 = body(eyes, [(5, 21), (6, 21), (9, 22), (10, 22)]); f3 = body(eyes, [(5, 22), (6, 22), (9, 21), (10, 21)])
    return {'frames': [f1, f2, f3], 'fps': 6}
sprites = {'hero': {'w': 16, 'h': 24, 'anchor': [8, 23], 'anims': {}}}
for f in ['down', 'up', 'left', 'right']:
    sprites['hero']['anims']['walk-' + f] = frames(f)
    sprites['hero']['anims']['idle-' + f] = {'frames': [frames(f)['frames'][0]], 'fps': 1}
field = {
    'name': 'Field', 'w': 20, 'h': 14, 'tileset': ['grass', 'water', 'wall', 'path'],
    'ground': [], 'props': [{'sprite': 'post', 'x': 9, 'y': 4, 'solid': True, 'id': 'post'}],
    'people': [{'id': 'keeper', 'name': 'Someone', 'x': 12, 'y': 5, 'facing': 'left', 'lines': ['The water moves on its own.', 'The door east leads inside.'], 'when': ''},
               {'id': 'other', 'name': 'Another', 'x': 5, 'y': 9, 'facing': 'down', 'script': 'ask', 'when': 'met == true'}],
    'exits': [{'x': 19, 'y': 6, 'w': 1, 'h': 2, 'to': 'house', 'tx': 1, 'ty': 4, 'facing': 'right'}],
    'triggers': [{'x': 14, 'y': 10, 'w': 2, 'h': 2, 'script': 'stay', 'each': 0.5}, {'x': 3, 'y': 4, 'w': 1, 'h': 1, 'script': 'first', 'once': True}],
    'spawn': [3.5, 7.5], 'music': 'field', 'intent': 'Demo: a field with water, a person, a door east and a patch that counts while you stay.', 'station': ''
}
g = []
for y in range(14):
    r = ''
    for x in range(20):
        if x == 0 or y == 0 or x == 19 and not (6 <= y <= 7) or y == 13: r += '2'
        elif 2 <= x <= 5 and 1 <= y <= 3: r += '1'
        elif y == 7 and 1 <= x <= 18: r += '3'
        else: r += '0'
    g.append(r)
field['ground'] = g
house = {
    'name': 'House', 'w': 8, 'h': 6, 'tileset': ['floor', 'wall'],
    'ground': ['11111111', '10000001', '10000001', '10000001', '00000001', '11111111'],
    'props': [], 'people': [{'id': 'inside', 'name': 'Inside', 'x': 5, 'y': 2, 'facing': 'down', 'lines': ['It is quiet in here.']}],
    'exits': [{'x': 0, 'y': 4, 'w': 1, 'h': 1, 'to': 'field', 'tx': 17, 'ty': 6, 'facing': 'left'}],
    'triggers': [], 'spawn': [3.5, 4.5], 'music': '', 'intent': 'Demo: a room with one person and the way back.', 'station': ''
}
scripts = {
    'first': {'steps': [{'t': 'say', 'who': '', 'text': 'Water, this way.'}, {'t': 'set', 'flag': 'met', 'value': True}, {'t': 'sound', 'id': 'tap'}, {'t': 'end'}]},
    'stay': {'steps': [{'t': 'add', 'flag': 'stayed', 'n': 1}, {'t': 'if', 'when': 'stayed >= 4', 'then': 2, 'else': 4}, {'t': 'tile', 'map': 'field', 'x': 9, 'y': 4, 'tile': 'path'}, {'t': 'hide', 'id': 'post'}, {'t': 'end'}]},
    'ask': {'steps': [{'t': 'choice', 'who': 'Another', 'prompt': 'Stay a while?', 'options': [{'text': 'Yes', 'to': 1}, {'text': 'No', 'to': 3}]}, {'t': 'say', 'who': 'Another', 'text': 'Then stay.'}, {'t': 'move', 'who': 'other', 'x': 5, 'y': 11}, {'t': 'face', 'who': 'other', 'dir': 'up'}, {'t': 'wait', 's': 0.3}, {'t': 'end'}]}
}
game = {
    'v': 1, 'id': 'demo', 'name': 'Demo', 'year': 2026, 'tile': 16, 'view': 11, 'start': 'field',
    'player': {'sprite': 'hero', 'speed': 4},
    'palette': PAL,
    'tiles': {'grass': {'solid': False, 'frames': [GRASS], 'fps': 0}, 'water': {'solid': True, 'frames': WATER, 'fps': 2}, 'wall': {'solid': True, 'frames': [], 'fps': 0}, 'path': {'solid': False, 'frames': [], 'fps': 0}, 'floor': {'solid': False, 'frames': [], 'fps': 0}},
    'sprites': sprites,
    'sounds': {'tap': {'wave': 'square', 'notes': [[880, 0.05], [1320, 0.08]]}},
    'tracks': {'field': {'bpm': 96, 'stepsPerBeat': 2, 'channels': [{'wave': 'square', 'vol': 0.15, 'notes': 'C4 - E4 - G4 - E4 - A4 - G4 - E4 - D4 -'}, {'wave': 'triangle', 'vol': 0.22, 'notes': 'C2 - - - F2 - - - G2 - - - C2 - - -'}]}},
    'scripts': scripts,
    'maps': {'field': field, 'house': house},
    'road': {'sentence': '', 'act': '', 'stations': []}
}
os.makedirs(os.path.dirname(OUT), exist_ok=True)
open(OUT, 'w').write(json.dumps(game, separators=(',', ':')))
print('wrote', os.path.normpath(OUT), len(json.dumps(game)) // 1024, 'KB')
