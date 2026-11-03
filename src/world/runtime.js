// ---- Template runtime: renders the game's existing screen markup (sc-if / sc-for / dc-import / {{holes}}) ----
const TPL = (() => {
  function look(path, scope) {
    path = path.trim();
    if (path === 'true') return true; if (path === 'false') return false;
    const parts = path.split('.');
    for (let i = scope.length - 1; i >= 0; i--) {
      if (Object.prototype.hasOwnProperty.call(scope[i], parts[0])) {
        let v = scope[i][parts[0]];
        for (let j = 1; j < parts.length; j++) { if (v == null) return ''; v = v[parts[j]]; }
        return v;
      }
    }
    return '';
  }
  const HOLE = /\{\{([^}]*)\}\}/g;
  const ONLY = /^\s*\{\{([^}]*)\}\}\s*$/;
  function interp(str, scope) {
    return str.replace(HOLE, (_, p) => { const v = look(p, scope); return v == null ? '' : String(v); });
  }
  function build(node, scope, comps, out) {
    if (node.nodeType === 3) { out.push(document.createTextNode(interp(node.data, scope))); return; }
    if (node.nodeType !== 1) return;
    const tag = node.localName;
    if (tag === 'sc-if') {
      const m = ONLY.exec(node.getAttribute('value') || ''); const v = m ? look(m[1], scope) : false;
      if (v) node.childNodes.forEach((c) => build(c, scope, comps, out));
      return;
    }
    if (tag === 'sc-for') {
      const m = ONLY.exec(node.getAttribute('list') || ''); const list = m ? look(m[1], scope) : [];
      const as = node.getAttribute('as');
      (Array.isArray(list) ? list : []).forEach((item, i) => { const s = scope.concat([{ [as]: item, $index: i }]); node.childNodes.forEach((c) => build(c, s, comps, out)); });
      return;
    }
    if (tag === 'dc-import') {
      const comp = comps[node.getAttribute('name')];
      const m = ONLY.exec(node.getAttribute('critter') || '');
      if (comp) comp.root.forEach((c) => build(c, [{ k: m ? look(m[1], scope) : null }], comps, out));
      return;
    }
    const el = node.ownerDocument === document ? node.cloneNode(false) : document.importNode(node, false);
    el._h = {};
    for (const a of Array.from(node.attributes)) {
      const name = a.name;
      if (name.startsWith('on')) { el.removeAttribute(name); const m = ONLY.exec(a.value); if (m) { const fn = look(m[1], scope); if (typeof fn === 'function') el._h[name.slice(2).toLowerCase()] = fn; } continue; }
      if (name.startsWith('hint-')) { el.removeAttribute(name); continue; }
      if (name === 'disabled') { const m = ONLY.exec(a.value); el.removeAttribute('disabled'); if (m ? look(m[1], scope) : true) el.setAttribute('disabled', ''); continue; }
      if (name.startsWith('data-h-')) { el.removeAttribute(name); el.setAttribute(name.slice(7), interp(a.value, scope)); continue; }
    }
    const kids = [];
    node.childNodes.forEach((c) => build(c, scope, comps, kids));
    kids.forEach((k) => el.appendChild(k));
    out.push(el);
  }
  function syncAttrs(live, fresh) {
    for (const a of Array.from(live.attributes)) if (!fresh.hasAttribute(a.name)) live.removeAttribute(a.name);
    for (const a of Array.from(fresh.attributes)) if (live.getAttribute(a.name) !== a.value) live.setAttribute(a.name, a.value);
    live._h = fresh._h;
    if (live.localName === 'input' && document.activeElement !== live && live.value !== (fresh.getAttribute('value') || '')) live.value = fresh.getAttribute('value') || '';
    if (live.localName === 'button') live.disabled = fresh.hasAttribute('disabled');
  }
  function morph(liveParent, freshNodes) {
    const live = Array.from(liveParent.childNodes);
    freshNodes.forEach((f, i) => {
      const l = live[i];
      if (!l) { liveParent.appendChild(f); return; }
      if (l.nodeType !== f.nodeType || (l.nodeType === 1 && l.localName !== f.localName)) { liveParent.replaceChild(f, l); return; }
      if (l.nodeType === 3) { if (l.data !== f.data) l.data = f.data; return; }
      syncAttrs(l, f);
      morph(l, Array.from(f.childNodes));
    });
    for (let i = freshNodes.length; i < live.length; i++) liveParent.removeChild(live[i]);
  }
  function compile(markup) {
    const t = document.createElement('template'); t.innerHTML = markup;
    t.content.querySelectorAll('*').forEach((el) => {
      if (el.localName.startsWith('sc-') || el.localName === 'dc-import') return;
      Array.from(el.attributes).forEach((a) => { if (a.value.indexOf('{{') !== -1 && !a.name.startsWith('on') && a.name !== 'disabled') { el.removeAttribute(a.name); el.setAttribute('data-h-' + a.name, a.value); } });
    });
    return { root: Array.from(t.content.childNodes) };
  }
  function mount(container, tpl, comps, getVals) {
    const handle = (type) => (e) => {
      let el = e.target;
      while (el && el !== container) { if (el._h && el._h[type]) { el._h[type](e); return; } el = el.parentNode; }
    };
    container.addEventListener('click', handle('click'));
    container.addEventListener('input', handle('change'));
    return function render() {
      const vals = getVals(); const out = [];
      tpl.root.forEach((c) => build(c, [vals], comps, out));
      morph(container, out);
    };
  }
  return { compile, mount };
})();
