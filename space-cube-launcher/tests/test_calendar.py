"""The calendar (tap the clock) and event reminders, against a stand-in for the app's calendar bridge (tests/calsource.js)."""
import pathlib, datetime
from sc import Game, check, done
SRC = (pathlib.Path(__file__).parent / 'calsource.js').read_text()
D = lambda g: g.js('window.__calDebug()')
def settle(g, ms=1700): g.wait(ms)
today = datetime.date.today()
with Game(init=SRC) as g:
    g.fresh()
    g.pg.click('#clock', force=True); settle(g)
    d = D(g); check('tap the clock: the calendar opens', d['holo'] == 'calendar' and not d['busy'], d)
    check('...on Month, today selected', d['view'] == 'month' and d['sel'] == f'{today.year}-{today.month - 1}-{today.day}', d)
    clock_b = g.js("document.getElementById('clock').getBoundingClientRect().bottom")
    check('the window sits below the clock', d['frame'][1] > clock_b, (d['frame'], clock_b))
    ev = g.js("document.getElementById('calEvents').innerText")
    check("today's events are listed, by time", 'Dentist' in ev and ev.index('15:00') < ev.index('18:00'), ev)
    check('an event title made of markup shows as text and never runs', '<img' in ev and g.js('window.__pwned') is None, ev)
    check('a bad colour from the calendar is not used', 'red;x' not in g.js("document.getElementById('calEvents').innerHTML"))
    check('the calendar name shows under the event', 'PERSONAL' in ev, ev)
    # the views and the arrows
    lbl = D(g)['label']; g.pg.click('#calNext'); g.wait(200)
    check('the arrow moves a month', D(g)['label'] != lbl, (lbl, D(g)['label']))
    g.pg.click('#calTabs [data-v=week]'); g.wait(200); check('WEEK', D(g)['view'] == 'week' and '–' in D(g)['label'], D(g)['label'])
    g.pg.click('#calTabs [data-v=year]'); g.wait(200); check('YEAR', D(g)['view'] == 'year' and D(g)['label'].isdigit(), D(g)['label'])
    g.pg.click('.calYear button[data-m="0"]'); g.wait(200); check('in YEAR, a month opens it', D(g)['view'] == 'month' and D(g)['label'].startswith('JAN'), D(g)['label'])
    # tomorrow's all-day event (stored at midnight UTC) is on tomorrow
    tm = today + datetime.timedelta(days=1)
    g.js("window.toggleCalendar()"); settle(g); g.js("window.toggleCalendar()"); settle(g)
    g.pg.click('#calTabs [data-v=week]'); g.wait(200)
    wk = g.js("[...document.querySelectorAll('.calWeek button')].map(b => b.innerText.replace(/\\s+/g, ' '))")
    row = [r for r in wk if f' {tm.day} ' in f' {r} ' and 'Car service' in r]
    check('an all-day event is on its own day', len(row) == 1 or tm.isocalendar()[1] != today.isocalendar()[1], wk)
    # search
    g.pg.click('#calTabs [data-v=month]'); g.pg.click('#calSearchBtn'); g.pg.fill('#calQ', 'dent'); g.wait(200)
    res = g.js("[...document.querySelectorAll('#calResults button')].map(b => b.innerText)")
    check('search finds events by name, coming up first, then the past', len(res) == 2 and 'Dentist' in res[0] and '(old)' in res[1], res)
    g.pg.click('#calResults button >> nth=1'); g.wait(200)
    old = today - datetime.timedelta(days=40)
    check('a result opens its day', D(g)['part'] == 'calMain' and D(g)['sel'] == f'{old.year}-{old.month - 1}-{old.day}', D(g))
    # adding events
    g.pg.click('#calAddBtn'); g.wait(200)
    picks = g.js("[...document.querySelectorAll('#calPick button')].map(b => b.innerText)")
    check('the picker lists the calendars that take new events, by their own names', picks == ['PERSONAL', 'MY CALENDAR'], picks)
    g.pg.fill('#calTitle', 'Haircut'); g.pg.fill('#calStart', '11:00'); g.pg.fill('#calEnd', '10:00'); g.pg.click('#calSave'); g.wait(100)
    check('the end must be after the start', 'end must be after' in g.js("document.getElementById('calAddMsg').textContent"))
    g.pg.fill('#calEnd', '12:00'); g.pg.click('#calPick button >> nth=1'); g.pg.click('#calSave'); g.wait(300)
    a = g.js('window.__calState.added')
    check('SAVE adds it to the chosen calendar', len(a) == 1 and a[0]['title'] == 'Haircut' and a[0]['cal'] == 2 and not a[0]['allDay'] and a[0]['end'] - a[0]['begin'] == 3600000, a)
    check('...and it shows on its day', 'Haircut' in g.js("document.getElementById('calEvents').innerText"))
    g.pg.click('#calAddBtn'); g.wait(200)
    check('the last calendar used is picked next time', g.js("document.querySelector('#calPick button.on').innerText") == 'MY CALENDAR')
    g.pg.fill('#calTitle', 'Holiday'); g.pg.click('#calAllDay'); g.pg.click('#calSave'); g.wait(300)
    a = g.js('window.__calState.added')[-1]
    check('an all-day event is stored from midnight UTC to the next', a['allDay'] and a['begin'] % 86400000 == 0 and a['end'] - a['begin'] == 86400000, a)
    # closing
    g.pg.click('#clock', force=True); settle(g); check('tap the clock again: it closes', D(g)['holo'] is None, D(g))
    g.pg.click('#clock', force=True); settle(g); g.js('window.handleBack()'); settle(g); check('Back closes it too', D(g)['holo'] is None, D(g))
    # reminders
    ev1 = g.js("JSON.parse(window.__calSource.calEvent(1, window.__calState.events[0].begin))")
    g.pg.evaluate('b => window.showEventReminder(1, b, "10")', ev1['begin']); settle(g)
    d = D(g); check('a reminder draws the event in the window', d['holo'] == 'reminder' and g.js("document.getElementById('remTitle').textContent") == 'Dentist'
                    and g.js("document.getElementById('remWhen').textContent") == 'IN 10 MIN', d)
    g.pg.click('#remOk'); settle(g); check('GOT IT folds it away', D(g)['holo'] is None)
    g.pg.click('#clock', force=True); settle(g)
    g.pg.evaluate('b => window.showEventReminder(1, b, "0")', ev1['begin']); settle(g, 3600)
    check('a reminder while the calendar is open: the calendar closes, the reminder shows', D(g)['holo'] == 'reminder'
          and g.js("document.getElementById('remWhen').textContent") == 'STARTING NOW', D(g))
    g.pg.click('#remOpen'); settle(g, 3600)
    check('OPEN DAY opens the calendar on that day', D(g)['holo'] == 'calendar' and D(g)['sel'] == f'{today.year}-{today.month - 1}-{today.day}', D(g))
    g.js("window.showRoutine('wake')"); g.wait(300)
    check('a checklist that comes while the calendar is open waits', D(g)['holo'] == 'calendar')
    g.pg.click('#clock', force=True); settle(g, 3800)
    check('...and shows once it has closed', D(g)['holo'] == 'routine', D(g))
    g.pg.click('#rClose'); settle(g)
    g.pg.evaluate('b => window.showEventReminder(1, b, "bogus")', ev1['begin']); g.pg.evaluate('() => window.showEventReminder(999, 5, "10")'); settle(g)
    check('an unknown reminder or event shows nothing', D(g)['holo'] is None)
    # the Settings Reload button
    g.js("document.getElementById('cfgBtn').click()"); g.wait(600)
    check('Settings has its own Reload button', g.js("!!document.getElementById('reloadBtn')"))
    g.js('window.__beforeReload = 1'); g.js("document.getElementById('reloadBtn').click()"); g.wait(4500)
    check('...and it reloads the screen', g.js('window.__beforeReload') is None)
# no access yet: ask, then show
with Game(init='window.__calNoAccess = true;\n' + SRC) as g:
    g.fresh(); g.pg.click('#clock', force=True); settle(g)
    check('no calendar access: it says so and offers ALLOW', 'access' in g.js("document.getElementById('calNoteText').textContent") and g.js("!document.getElementById('calAllow').hidden"))
    g.pg.click('#calAllow'); g.wait(500)
    check('ALLOW asks the phone, then the month shows', g.js('window.__calState.asked') == 1 and D(g)['part'] == 'calMain', D(g))
# a browser with no calendar at all (and an app older than 1.5 works the same way)
with Game() as g:
    g.fresh(); g.pg.click('#clock', force=True); settle(g)
    check('no calendar here: it says where they show', 'on the phone' in g.js("document.getElementById('calNoteText').textContent"))
done()
