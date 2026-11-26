// A stand-in for the app's calendar bridge (window.Launcher.cal*, app 1.5+): same method names, same JSON strings.
// Two calendars; today a timed event, tomorrow an all-day one (midnight UTC, as the store keeps them), and an event
// whose title is markup (titles come from anyone who sends an invite: it must show as text and never run).
(() => {
  const now = new Date(), y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  const at = (dd, h, mi) => new Date(y, m, dd, h, mi).getTime();
  const S = window.__calState = { access: !window.__calNoAccess, added: [], asked: 0, events: [
    { id: 1, begin: at(d, 15, 0), end: at(d, 16, 0), allDay: false, title: 'Dentist', cal: 1, color: '#4c8dff' },
    { id: 2, begin: Date.UTC(y, m, d + 1), end: Date.UTC(y, m, d + 2), allDay: true, title: 'Car service', cal: 2, color: '#ff9b5a' },
    { id: 3, begin: at(d, 18, 0), end: at(d, 19, 0), allDay: false, title: '<img src=x onerror="window.__pwned=1">Party', cal: 1, color: 'red;x' },
    { id: 4, begin: at(d - 40, 9, 0), end: at(d - 40, 10, 0), allDay: false, title: 'Dentist (old)', cal: 1, color: '#4c8dff' } ] };
  if (window.__calBusyDay) for (let i = 0; i < 12; i++) S.events.push({ id: 200 + i, begin: at(d, 7 + i, 0), end: at(d, 7 + i, 30), allDay: false, title: 'Busy ' + i, cal: 1, color: '#4c8dff' });
  const J = o => JSON.stringify(o);
  window.__calSource = {
    calAccess: () => J({ read: S.access, write: S.access }),
    calStatus: () => J({ calendars: S.access ? 3 : 0, error: '' }),
    calAsk: () => { S.asked++; S.access = true; setTimeout(() => window.calendarAccessChanged && window.calendarAccessChanged(), 50); },
    calCalendars: () => J(S.access ? [{ id: 1, name: 'Personal', account: 'me@example.com', color: '#4c8dff', write: true },
                                       { id: 2, name: 'My calendar', account: 'Samsung', color: '#ff9b5a', write: true },
                                       { id: 3, name: 'Holidays', account: 'holidays', color: '#7dffc6', write: false }] : []),
    calEvents: (from, to) => J(S.access ? S.events.filter(e => e.end > from && e.begin < to) : []),
    calEvent: (id, begin) => { const e = S.events.find(x => x.id === id && x.begin === begin); return e ? J(e) : ''; },
    calSearch: q => J(S.events.filter(e => e.title.toLowerCase().includes(q.toLowerCase())).map(e => Object.assign({ repeats: false }, e))),
    calAdd: (cal, title, begin, end, allDay) => { const e = { id: 100 + S.added.length, begin, end, allDay, title, cal, color: '#4c8dff' };
      S.added.push(e); S.events.push(e); return e.id; },
  };
})();
