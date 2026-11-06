# Snapshot helper for run-tests.sh. Most tests only PRINT numbers, so a pass used to mean "did not crash". Now each test has a snapshot in src/snap/<test>.txt:
# the lines a clean run prints every time (lines that differ between two runs, such as times and random numbers, are left out). A later run must still print every one of them,
# otherwise it is reported as CHANGED and the missing lines are shown. An intended change is accepted by rebuilding (bash src/snap-build.sh).
#   python3 snapcmp.py compare NAME LOGFILE        -> prints "snap=ok", "snap=none" or "snap=CHANGED(n)" (missing lines go to <LOG_DIR>/NAME.snapdiff)
#   python3 snapcmp.py build NAME LOG1 LOG2 [...]  -> writes src/snap/NAME.txt from the lines every log has
import os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); SNAP = os.path.join(HERE, 'snap')
# Numbers are masked as # in both the snapshot and the run (many tests print live timing: duels, animation, pixels, positions), so a True/False flip, changed words or a missing line fail but timing noise does not; the few tests listed in src/snap/exact.txt have been steady across many runs and keep exact numbers.
def volatile(name):   # masked by default; only the tests listed in src/snap/exact.txt (steady across many runs) keep exact numbers
    try: return name not in [l.strip() for l in open(os.path.join(SNAP, 'exact.txt'))]
    except Exception: return True
MASK = re.compile(r'-?\d+(?:\.\d+)?')
LISTS = re.compile(r'\[(?:#, )*#\]')   # a list of numbers whose length depends on timing
# the game's weather and the date follow the real clock, so lines that print them differ from day to day: they are normalised for every test (snapshot and run alike)
DATE = re.compile(r'\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{2} \d{4}\b|\b\d{4}-\d{2}-\d{2}\b')
WEATHER = re.compile(r'\b(?:Clear|Sunny|Rain|Thunderstorm|Snow|Fog|Ashfall)\b(?:: more \w+ critters)?')
OWN = re.compile(r'"own:[\w-]+":(?:true|false),?')   # which lanterns on a climb you happened to pass
QUEST = re.compile(r'\{"k":"(?:see|keep|beat)"[^}]*\}')   # which of the three daily city quests is on offer rotates by date
HINT = re.compile(r'You have more than one critter now[^|]*|Mira near your home sells[^|]*|You have enough essence to evolve a critter\. Open it in the Dex\.|Tip: sign in[^|]*')   # one-time tips land on a toast at a moment that depends on timing
NIGHT = re.compile(r'@night\b')   # the place themes have night versions chosen by the real clock
def norm(l): return NIGHT.sub('', HINT.sub('<tip>', OWN.sub('', QUEST.sub('<quest>', WEATHER.sub('<weather>', DATE.sub('<date>', l))))))
def lines(path, mask=False):
    try: raw = open(path, errors='replace').read().split('\n')
    except Exception: return []
    out = [norm(l.strip()) for l in raw if l.strip()]
    return [re.sub(r'\s+', ' ', LISTS.sub('[#...]', MASK.sub('#', l))) for l in out] if mask else out   # runs of spaces collapse too: a %3d column pads 2-digit numbers and not 3-digit ones
mode, name = sys.argv[1], sys.argv[2]
if mode == 'build':
    mk = volatile(name)
    sets = [set(lines(p, mk)) for p in sys.argv[3:]]; common = set.intersection(*sets) if sets else set()
    first = [l for l in lines(sys.argv[3], mk) if l in common]; seen = set(); out = []
    for l in first:
        if l not in seen: seen.add(l); out.append(l)
    os.makedirs(SNAP, exist_ok=True)
    open(os.path.join(SNAP, name + '.txt'), 'w').write('\n'.join(out) + ('\n' if out else ''))
    print(name, len(out), 'stable lines of', len(set(lines(sys.argv[3], mk))))
else:
    path = os.path.join(SNAP, name + '.txt')
    if not os.path.exists(path): print('snap=none'); sys.exit(0)
    mk = volatile(name); want = lines(path, mk); have = set(lines(sys.argv[3], mk)); missing = [l for l in want if l not in have]
    if missing:
        open(sys.argv[3].replace('.log', '.snapdiff'), 'w').write('\n'.join(missing) + '\n'); print('snap=CHANGED(%d)' % len(missing))
    else:
        print('snap=ok')
