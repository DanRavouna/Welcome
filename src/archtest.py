# Architecture per region: every city draws its houses and its gym in its own style (five styles, all different from each other), inside the building's footprint band, without errors; the door tile is unchanged.
from playwright.sync_api import sync_playwright
from chk import check, done
errs=[]
with sync_playwright() as p:
  b=p.chromium.launch(); pg=b.new_page(); pg.on('pageerror',lambda e:errs.append(str(e)))
  pg.goto('file:///mnt/user-data/outputs/critter-roll-world.html'); pg.wait_for_function("typeof APP!=='undefined' && APP.game")
  r=pg.evaluate("""()=>{const ids=['town','mossbrook','frosthold','cinderport','coralbay'];const out={};
    const sig=(t,pl)=>{const g=t.getContext('2d');const d=g.getImageData((pl.x-1)*16,(pl.y-3)*16,(pl.w+2)*16,(pl.h+4)*16).data;let h=0,n=0;for(let i=0;i<d.length;i+=4){h=(h*31+d[i]+d[i+1]*3+d[i+2]*7)|0;if(d[i+3])n++}return h};
    ids.forEach(id=>{const M=WORLD.MAPS[id];const t=PXW.terrain(M,id);const h=M.places.find(p=>p.open==='house'||p.id==='home');const gy=M.places.find(p=>p.kind==='gym');out[id]={arch:(PXW.PAL[id]||{}).arch||'cottage',house:sig(t,h),gym:gy?sig(t,gy):null,doorTile:h.door}});return out}""")
  styles=[v['arch'] for v in r.values()]
  check('five regions, five different architectures', len(set(styles))==5, styles)
  check('every region draws its house differently from the others', len(set(v['house'] for v in r.values()))==5)
  gyms=[v['gym'] for v in r.values() if v['gym']]
  check('the four gyms differ by region too', len(set(gyms))==4)
  doors=pg.evaluate("['mossbrook','frosthold','cinderport','coralbay'].map(c=>WORLD.MAPS[c].places.filter(p=>p.open==='house').map(p=>p.door.join(',')))")
  check('doors are where they always were (collision and entry unchanged)', doors==[['28,8','8,21','27,21'],['27,9','7,18','28,18'],['26,6','7,23','29,23'],['24,7','10,21','24,20']], doors)
  check('no page errors', not errs, errs); b.close()
done()
