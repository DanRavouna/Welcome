# Hint, never tell (CLAUDE.md): no person in the world recites a sign (which types live where, what links what, where the gym is) or hands out tips. Signs may say those things; people say what they see.
from playwright.sync_api import sync_playwright
from chk import check, done
import re
TELL=re.compile(r"critters (roam|live|hide|love|share|nest|bask|ride|prefer|are drawn|come out)|\blinks\b|runs between|(my|his|her|the) gym (is|stands|burns)", re.I)
TIP=re.compile(r"\btips?\b|\bodds\b|you should|\btry\b|remember to|make sure|be sure to|the trick|i recommend|rare ones|rarer finds|more often|one in two hundred", re.I)
ALLOW={'wren','glacia','blaze','coral'}   # the leaders' first line names the gym they keep: that is who they are, not a tip
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  r=pg.evaluate("""()=>{const out=[];const all=WORLD.allNpcs();for(const m in all)all[m].forEach(n=>{['lines','intro','beatenLines','afterLines'].forEach(k=>(n[k]||[]).forEach(l=>out.push([m,n.id,l])));if(n.winLine)out.push([m,n.id,n.winLine]);});
    Object.values(WORLD.MAPS).forEach(M=>{(M.objects||[]).forEach(o=>{if(o.text)out.push([M.id,'obj:'+o.id,o.text])});(M.props||[]).forEach(o=>{if(o.text)out.push([M.id,'prop:'+o.id,o.text])})});return out}""")
  print('lines read:', len(r))
  tells=[(m,i,l[:90]) for m,i,l in r if i not in ALLOW and TELL.search(l)]
  tips=[(m,i,l[:90]) for m,i,l in r if TIP.search(l)]
  check('nobody recites a sign (types that live here, what links what, where the gym is)', not tells, tells[:6])
  check('nobody hands out tips', not tips, tips[:6])
  check('no page errors', not errs, errs); b.close()
done()
