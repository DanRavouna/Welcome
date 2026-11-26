"""The wake-up / sleep window: it opens from the ship's full-width line and narrows (the closing in reverse), then closes again."""
from sc import Game, check, done
with Game() as g:
    g.fresh()
    g.js("window.showRoutine('sleep')")
    W = g.js('innerWidth'); seen = []
    for i in range(60):
        g.wait(40)
        r = g.js("(() => { const f = document.getElementById('rFrame'), b = f.getBoundingClientRect(); return [getComputedStyle(f).opacity, b.left, b.height]; })()")
        if float(r[0]) > 0.5: seen.append(r)
    check('the window shows', len(seen) > 5, len(seen))
    check('it first appears at the line\'s full width', seen and seen[0][1] < 0.02 * W, seen[:3])
    check('...then narrows to its place (5% in from each side)', seen and abs(seen[-1][1] - 0.05 * W) < 2 and seen[-1][2] > 100, seen[-1:])
    check('it never jumps back wider while opening', all(b[1] >= a[1] - 0.5 for a, b in zip(seen, seen[1:])), [round(x[1], 1) for x in seen])
    g.pg.click('#rClose'); g.wait(2200)
    check('CLOSE folds it away', not g.js("document.getElementById('rWrap').classList.contains('live')"))
done()
