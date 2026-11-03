import re
SRC='/mnt/user-data/outputs/artifacts/26432ea7-e3ab-4387-ba4c-fd4e431c95a2/project/'
main=open(SRC+'Main.dc.html').read(); crit=open(SRC+'Critter.dc.html').read()
helmet=main.split('<helmet>')[1].split('</helmet>')[0]
markup=main.split('<x-dc>')[1].split('</x-dc>')[0]
markup=markup.split('</helmet>')[1]
code=main.split('data-dc-script')[1].split('>',1)[1].split('</script>')[0]
cmark=crit.split('<x-dc>')[1].split('</x-dc>')[0].split('</helmet>')[1]

def rep(s,old,new,n=1):
    assert s.count(old)==n,(s.count(old),old[:100]); return s.replace(old,new)

# ---------- markup: full-screen, no painted backdrop, world nav ----------
m=markup
m=re.sub(r'position: relative; width: 390px; height: 844px; overflow: hidden; color: #FFFFFF; (font-family:[^;]*;) background: linear-gradient\([^"]*\)"',
         r'position: relative; width: 100%; height: 100%; overflow: hidden; color: #FFFFFF; \1 background: rgba(8,16,40,0.38)"', m, count=1)
assert 'width: 100%; height: 100%; overflow: hidden; color: #FFFFFF' in m
a=m.index('  <div aria-hidden="true" style="position: absolute; left: 0; top: 0; width: 390px; height: 844px">')
b=m.index('  </div>\n', m.index('border-radius: 50% 50% 0 0 / 70px 70px 0 0', a))+len('  </div>\n')
m=m[:a]+m[b:]
m=rep(m,'style="position: absolute; left: 0; top: 0; width: 390px; height: 844px; background: linear-gradient(160deg','style="position: absolute; left: 0; top: 0; width: 100%; height: 100%; background: linear-gradient(160deg')
m=rep(m,'<div style="position: relative; height: 844px; box-sizing: border-box; padding: 18px 16px 20px;','<div style="position: relative; height: 100%; max-width: 520px; margin: 0 auto; box-sizing: border-box; padding: calc(14px + env(safe-area-inset-top, 0px)) 16px calc(16px + env(safe-area-inset-bottom, 0px));')
a=m.index('<nav aria-label="Main"'); b=m.index('</nav>',a)+len('</nav>')
m=m[:a]+'''<nav aria-label="Screen" style="display: flex; align-items: center; gap: 10px; padding: 5px 14px 5px 5px; border-radius: 999px; background: rgba(226,236,252,0.92); border: 1.5px solid rgba(255,255,255,0.95); box-shadow: 0 6px 18px rgba(20,40,100,0.18)">
      <button id="close-screen" onClick="{{closeScreen}}" style="height: 44px; padding: 0 16px 0 10px; display: inline-flex; align-items: center; gap: 6px; border: 0; border-radius: 999px; background: #1E2A4A; color: #FFFFFF; font-family: inherit; font-size: 14px; font-weight: 800; cursor: pointer">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg>
        Back to town
      </button>
      <span style="font-size: 16px; font-weight: 900; color: #1E2A4A">{{screenTitle}}</span>
    </nav>'''+m[b:]
open('screen.html','w').write(m); open('critter.html','w').write(cmark)

# ---------- logic ----------
c=code
c=rep(c,'class Component extends DCLogic {','class Component extends Base {')
c=rep(c,"settings: { sound: true, vibrate: true, calm: false }","settings: { sound: true, vibrate: true, calm: false, test: true }")
c=rep(c,"{ sound: d.settings.sound !== false, vibrate: d.settings.vibrate !== false, calm: d.settings.calm === true } : { sound: true, vibrate: true, calm: false },","{ sound: d.settings.sound !== false, vibrate: d.settings.vibrate !== false, calm: d.settings.calm === true, test: d.settings.test !== false } : { sound: true, vibrate: true, calm: false, test: true },")
c=rep(c,"        ['calm', 'Reduce motion', 'Skip the roll reveal and hit shakes.']","        ['calm', 'Reduce motion', 'Skip the roll reveal and hit shakes.'],\n        ['test', 'Test mode', 'Unlimited rolls while you try things out.']")
c=rep(c,"Test mode is on: rolls are unlimited. Turn it off in Tweaks for real play.","x",0) if False else c
m2=open('screen.html').read()
m2=rep(m2,"Test mode is on: rolls are unlimited. Turn it off in Tweaks for real play.","Test mode is on, so rolls are unlimited. Turn it off in Settings above for real play.")
open('screen.html','w').write(m2)
open('logic.js','w').write(c)
open('helmet.html','w').write(helmet)
print('extracted', len(m2), len(c))
