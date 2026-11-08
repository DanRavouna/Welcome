# Hint, never tell (CLAUDE.md): no person in the world recites a sign (which types live where, what links what, where the gym is) or hands out tips. Signs may say those things; people say what they see.
# On the review copy (APP.build === 'review') the lint is the widened one of docs/review/02-words.md F34: every field a person speaks, every sign,
# the SCAFFOLD/LETGO tables and the scripted lines (APP.words()), every prose string in the build's scripts and every text in the page; on the shipped build
# it checks exactly what it always checked. TELL_DUMP=<file> writes every line read (review mode) as JSON, for the words report.
from playwright.sync_api import sync_playwright
from chk import check, done
import re, os, json
TELL=re.compile(r"critters (roam|live|hide|love|share|nest|bask|ride|prefer|are drawn|come out)|\blinks\b|runs between|(my|his|her|the) gym (is|stands|burns)", re.I)
TIP=re.compile(r"\btips?\b|\bodds\b|you should|\btry\b|remember to|make sure|be sure to|the trick|i recommend|rare ones|rarer finds|more often|one in two hundred", re.I)
ALLOW={'wren','glacia','blaze','coral'}   # the leaders' first line names the gym they keep: that is who they are, not a tip
errs=[]

# ---- the widened lint (review copy only) ----
TELL2=re.compile(TELL.pattern+r"|\bjoins\b|They live|rarer? critters|Shinies are rare|opens at (trainer )?level|leader of|Five ledges|zig-zag|up the trail|climb the Tower|it sparkles|whole life|hit harder|Use it any time", re.I)
# a line that opens with an order (Go, Touch, Open...) is a tip; "Go on" and "Take what you need" are a person letting you go, not an order
TIP2=re.compile(TIP.pattern+r"|^(Go|Touch|Open|Climb|Take|Evolve|Keep|Pick) (?!on\b|what\b)\w|Do not touch|then come back|and come back|get ready|Here is your reward|\bmust\b|Pick the|worth your while", re.I)
THESIS=re.compile(r"because someone|what it is given|left a light on|knew where home was|lit by the one who|wants feeding|tended every fire|you can be trusted|until someone (proves|shows)", re.I)
SIGN=re.compile(r"critters\)|hide in the tall grass|Sparkling grass|\bgym\b|opens at|level \d|at least level|nights, one lamp", re.I)
# words the review retired from the whole build (02 F1-F30, 01 F18-F24, 03 F6-F8, 04 W12/W13): a prose string anywhere in the scripts or the page
RETIRED=re.compile(r"Go and wake|Touch the glass|Show me\.|Prove you\b|Somewhere a lever|\+\d+ essence|You earned \d|Far away, in the old arch|camp rhyme|must wake first|belongs in one of|refill at midnight|used up for today|Leader Seals?|not yet beaten|Same (remedies|goods) as|Progress: |Ember beats Moss|(Volt|Dusk|Frost|Stone|Moss|Bloom|Tide|Ember) critters (ride|roam|come out)|HP carries over|Essence is paid|It never was|It only waited|the whole country|Its light reaches|Gym\b|\bgym\b|Enter the Tower", re.I)
LEADKEEP={'wren','glacia','blaze','coral','maren','hale','orlen','keeper'}
ORDER=re.compile(r"(^|[.!?] )(Go|Touch|Open|Climb|Take|Light)\b")   # any sentence of theirs that starts with an order

def literals(src):
  """Every string literal in a script (quotes and template text), skipping comments and regex literals."""
  out=[]; i=0; n=len(src); prev=''
  while i<n:
    c=src[i]
    if c=='/' and i+1<n and src[i+1]=='/': j=src.find('\n',i); i=n if j<0 else j; continue
    if c=='/' and i+1<n and src[i+1]=='*': j=src.find('*/',i+2); i=n if j<0 else j+2; continue
    if c in '\'"`':
      q=c; j=i+1; buf=[]
      while j<n and src[j]!=q:
        if src[j]=='\\': buf.append(src[j+1:j+2]); j+=2; continue
        if q=='`' and src[j]=='$' and j+1<n and src[j+1]=='{':
          d=1; j+=2
          while j<n and d: d+= (src[j]=='{') - (src[j]=='}'); j+=1
          buf.append(' '); continue
        if src[j]=='\n' and q!='`': break
        buf.append(src[j]); j+=1
      out.append(''.join(buf)); i=j+1; prev='a'; continue
    if c=='/' and (prev in '(,=:[!&|?{};+-*%<>~^' or prev==''):   # a regex literal
      j=i+1; cls=False
      while j<n and src[j]!='\n':
        if src[j]=='\\': j+=2; continue
        if src[j]=='[': cls=True
        elif src[j]==']': cls=False
        elif src[j]=='/' and not cls: break
        j+=1
      i=j+1; prev='a'; continue
    if not c.isspace(): prev=c if not (c.isalnum() or c in '_$)]') else 'a'
    if c.isalnum() or c in '_$': # keywords that may precede a regex
      m=re.match(r'[A-Za-z_$][\w$]*',src[i:])
      if m:
        w=m.group(0); i+=len(w); prev='(' if w in ('return','typeof','case','in','of','void','delete','new') else 'a'; continue
    i+=1
  return out

with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  review = pg.evaluate("APP.build||''")=='review'
  r=pg.evaluate("""()=>{const out=[];const all=WORLD.allNpcs();for(const m in all)all[m].forEach(n=>{['lines','intro','beatenLines','afterLines'].forEach(k=>(n[k]||[]).forEach(l=>out.push([m,n.id,l])));if(n.winLine)out.push([m,n.id,n.winLine]);});
    Object.values(WORLD.MAPS).forEach(M=>{(M.objects||[]).forEach(o=>{if(o.text)out.push([M.id,'obj:'+o.id,o.text])});(M.props||[]).forEach(o=>{if(o.text)out.push([M.id,'prop:'+o.id,o.text])})});return out}""")
  if not review:
    print('lines read:', len(r))
    tells=[(m,i,l[:90]) for m,i,l in r if i not in ALLOW and TELL.search(l)]
    tips=[(m,i,l[:90]) for m,i,l in r if TIP.search(l)]
    check('nobody recites a sign (types that live here, what links what, where the gym is)', not tells, tells[:6])
    check('nobody hands out tips', not tips, tips[:6])
    check('no page errors', not errs, errs); b.close()
  else:
    # every field a person or a thing says: [map, id, field, line]
    w=pg.evaluate("""()=>{const out=[], g=APP.game, SKIP={id:1,name:1,kind:1,at:1,zoneId:1,dir:1,need:1,types:1,pal:1,to:1,gate:1,v:1,map:1,sprite:1,art:1,theme:1};
      const take=(m,id,k,v)=>{ if(typeof v==='function'){ try{ v=v(g); }catch(e){ return; } } if(typeof v==='string'){ if(v.indexOf(' ')!==-1) out.push([m,id,k,v]); } else if(Array.isArray(v)) v.forEach(x=>typeof x==='string'&&x.indexOf(' ')!==-1&&out.push([m,id,k,x])); };
      const all=WORLD.allNpcs(); for(const m in all) all[m].forEach(n=>{ for(const k in n) if(!SKIP[k]) take(m,n.id,k,n[k]); });
      Object.values(WORLD.MAPS).forEach(M=>{ (M.objects||[]).forEach(o=>{ for(const k in o) if(!SKIP[k]&&k!=='id') take(M.id,'obj:'+o.id,k,o[k]); }); (M.props||[]).forEach(o=>{ if(o.text) take(M.id,'prop:'+o.id,'text',o.text); }); (M.signs||[]).forEach((s,i)=>{ if(s.text) take(M.id,'sign:'+i,'text',s.text); }); });
      const W=APP.words?APP.words():{}; for(const t in W) for(const id in W[t]) take('words',t+':'+id,t,W[t][id]);
      return out; }""")
    srcs=pg.evaluate("()=>[...document.scripts].map(s=>s.textContent)")
    dom=pg.evaluate("""()=>{const out=[]; const tw=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT); let t; while((t=tw.nextNode())){ const p=t.parentElement; if(p&&/^(SCRIPT|STYLE)$/.test(p.tagName)) continue; const s=t.textContent.replace(/\\s+/g,' ').trim(); if(s.indexOf(' ')!==-1) out.push(s); }
      document.querySelectorAll('[aria-label],[title],[placeholder]').forEach(e=>['aria-label','title','placeholder'].forEach(a=>{ const s=e.getAttribute(a); if(s&&s.indexOf(' ')!==-1) out.push(s); })); return out; }""")
    lits=sorted({s.strip() for src in srcs for s in literals(src) if ' ' in s.strip() and re.search(r'[A-Za-z]{3,} [A-Za-z]',s) and not re.search(r'=>|function\b|[{}]', s)})
    if os.environ.get('TELL_DUMP'): json.dump({'world':w,'literals':lits,'dom':dom}, open(os.environ['TELL_DUMP'],'w'), indent=0)
    print('lines read:', len(w), '| prose strings in the scripts:', len(lits), '| page texts:', len(dom))
    say=lambda m,i,k,l: f"{m}/{i}.{k}: {l[:110]}"
    tells=[say(*x) for x in w if not x[1].startswith('sign:') and TELL2.search(x[3])]   # signs may name a climb's ledges; they have their own check
    tips=[say(*x) for x in w if TIP2.search(x[3])]
    thesis=[say(*x) for x in w if THESIS.search(x[3])]+[l[:110] for l in lits+dom if THESIS.search(l)]
    signs=[say(*x) for x in w if x[1].startswith('sign:') and SIGN.search(x[3])]
    orders=[say(*x) for x in w if x[1] in LEADKEEP and x[2] in ('winLine','afterLines','sealLine','lines') and ORDER.search(x[3])]
    retired=sorted({l[:110] for l in lits+dom+[x[3] for x in w] if RETIRED.search(l)})
    from collections import Counter   # 02-F19: no trainer line is said by more than four people
    tl=Counter((k,x) for (m,i,k,x) in w if k in ('winLine','beatenLines','intro','afterLines') and not i.startswith(('obj:','sign:','words')))
    shared=sorted({x[:80]+' (x%d)'%c for (k,x),c in tl.items() if c>4})
    parens=sorted({l[:110] for l in lits+[x[3] for x in w] if l.count('(')!=l.count(')') and re.match(r'[A-Z]',l) and re.search(r'[.!?]$',l)})   # whole sentences only (a fragment joined to a number is not a slip)
    for name,lst in (('tells',tells),('tips',tips),('thesis',thesis),('signs',signs),('orders',orders),('retired',retired),('parens',parens),('shared',shared)):
      for l in lst: print('  '+name+' | '+l)
    check('nobody recites a sign (types that live here, what links what, where the gym is, how to climb)', not tells, len(tells))
    check('nobody hands out tips or orders the player about', not tips, len(tips))
    check('nothing says the meaning out loud', not thesis, len(thesis))
    check('signs name places, not types, gyms, levels or counts', not signs, len(signs))
    check('no leader or keeper asks for the next act', not orders, len(orders))
    check('none of the retired words is left anywhere in the build', not retired, len(retired))
    check('no prose string has unbalanced parentheses', not parens, len(parens))
    check('no trainer line is said by more than four people', not shared, len(shared))
    check('no page errors', not errs, errs); b.close()
done()
