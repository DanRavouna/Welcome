# The event editor (studio/events.js): a script of step cards made through the forms, reordered, edited and removed;
# the check catching a jump out of range; a trigger on the map running the script in play, over real time.
import os, sys, subprocess, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from chk import check, done
from playwright.sync_api import sync_playwright
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
PORT = 8799
srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(PORT), '--bind', '127.0.0.1', '-d', ROOT], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(0.8)
URL = 'http://127.0.0.1:%d/studio/index.html' % PORT
def add_step(pg, kind, fill=None, select=None):
    pg.click('#ev-add'); pg.wait_for_selector('#f-t'); pg.select_option('#f-t', kind); pg.click('#sh-ok')
    if kind == 'end': pg.wait_for_timeout(50); return
    pg.wait_for_selector('#sh-ok')
    for k, v in (fill or {}).items(): pg.fill('#f-' + k, str(v))
    for k, v in (select or {}).items(): pg.select_option('#f-' + k, str(v))
    pg.click('#sh-ok'); pg.wait_for_timeout(50)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); c = b.new_context(viewport={'width': 390, 'height': 760}); c.add_init_script('window.__studioTest = true;'); pg = c.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_selector('#n-go', timeout=5000); pg.fill('#n-name', 'Event Game'); pg.click('#n-go'); pg.wait_for_selector('#r-s')
        pg.click('#tabs button[data-t="events"]'); pg.wait_for_selector('#ev-new', timeout=5000)
        pg.click('#ev-new'); pg.wait_for_selector('#f-name'); pg.fill('#f-name', 'greet'); pg.click('#sh-ok'); pg.wait_for_selector('#ev-add')
        add_step(pg, 'say', fill={'who': 'Someone', 'text': 'The water moves.'})
        add_step(pg, 'set', fill={'flag': 'met', 'value': 'true'})
        add_step(pg, 'add', fill={'flag': 'count', 'n': '2'})
        add_step(pg, 'if', fill={'when': 'count >= 2', 'then': '6', 'else': '5'})
        add_step(pg, 'say', fill={'text': 'Not yet.'})
        add_step(pg, 'say', fill={'text': 'Enough.'})
        add_step(pg, 'choice', fill={'prompt': 'Stay?', 'o0': 'Yes', 'o1': 'No', 'o0to': '8', 'o1to': '9'})
        add_step(pg, 'wait', fill={'s': '0.4'})
        add_step(pg, 'end')
        st = pg.evaluate('STUDIO.game.scripts.greet.steps')
        check('nine steps were made through the forms', len(st) == 9 and [s['t'] for s in st] == ['say', 'set', 'add', 'if', 'say', 'say', 'choice', 'wait', 'end'], [s['t'] for s in st])
        check('set parses true, add keeps the number, if stores zero-based targets', st[1]['value'] is True and st[2]['n'] == 2 and st[3]['then'] == 5 and st[3]['else'] == 4, (st[1], st[2], st[3]))
        check('the choice holds two options with their targets', st[6]['options'] == [{'text': 'Yes', 'to': 7}, {'text': 'No', 'to': 8}], st[6])
        pg.click('#ev-steps button[data-dn="0"]'); pg.wait_for_timeout(50)
        check('a step can be moved down', pg.evaluate("STUDIO.game.scripts.greet.steps[1].t") == 'say')
        pg.click('#ev-steps button[data-up="1"]'); pg.wait_for_timeout(50)
        pg.click('#ev-steps button[data-ed="0"]'); pg.wait_for_selector('#f-text'); pg.fill('#f-text', 'The water moves on its own.'); pg.click('#sh-ok'); pg.wait_for_timeout(50)
        check('a step can be edited in place', pg.evaluate("STUDIO.game.scripts.greet.steps[0].text") == 'The water moves on its own.')
        pg.evaluate("STUDIO.game.scripts.greet.steps[3].then = 40")
        check('the check finds a jump out of range', any('does not exist' in i for i in pg.evaluate('STUDIO.allIssues()')), pg.evaluate('STUDIO.allIssues()'))
        pg.evaluate("STUDIO.game.scripts.greet.steps[3].then = 5")
        pg.click('#ev-steps button[data-rm="7"]'); pg.wait_for_timeout(50)
        check('a step can be removed', len(pg.evaluate('STUDIO.game.scripts.greet.steps')) == 8)
        # a trigger on the map runs it in play
        pg.evaluate("(() => { const m = STUDIO.game.maps.first; m.triggers = [{ x: 5, y: 2, w: 1, h: 1, script: 'greet', once: true, each: 0, when: '' }]; m.spawn = [2.5, 2.5]; STUDIO.markDirty(); })()")
        pg.click('#tabs button[data-t="play"]'); pg.wait_for_selector('#p-go'); pg.click('#p-go'); pg.wait_for_function('window.ENGINE && ENGINE.map()', timeout=5000); pg.wait_for_timeout(200)
        pg.evaluate('ENGINE.input(1,0)'); pg.wait_for_function("ENGINE.dialog() !== null", timeout=4000); pg.evaluate('ENGINE.input(0,0)')
        d = pg.evaluate('ENGINE.dialog()'); check('walking into the trigger runs the script: the first say shows', d and d['text'] == 'The water moves on its own.', d)
        pg.evaluate('ENGINE.advance()'); pg.wait_for_timeout(100); d = pg.evaluate('ENGINE.dialog()')
        check('set, add and if run silently and the if jumps to "Enough."', d and d['text'] == 'Enough.' and pg.evaluate('ENGINE.flags()').get('count') == 2, (d, pg.evaluate('ENGINE.flags()')))
        pg.evaluate('ENGINE.advance()'); pg.wait_for_timeout(100); d = pg.evaluate('ENGINE.dialog()')
        check('the choice shows its options', d and d['options'] == ['Yes', 'No'], d)
        pg.evaluate('ENGINE.advance(1)'); pg.wait_for_timeout(100)
        check('No jumps to the end and the script is over', pg.evaluate('ENGINE.script()') is None and pg.evaluate('ENGINE.dialog()') is None)
        check('no page errors through the run', not errs, errs)
        b.close()
finally:
    srv.terminate()
done()
