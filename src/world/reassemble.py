p='/mnt/user-data/outputs/critter-roll-world.html'
h=open(p).read()
js=open('runtime.js').read()+'\n'+open('world.js').read()+'\n'+open('app.js').read()
a=h.index('<script>\n')+len('<script>\n'); b=h.rindex('\n</script>')
h=h[:a]+js+h[b:]
old="#tip{position:absolute;left:12px;right:12px;top:calc(60px + env(safe-area-inset-top,0px));max-width:300px;"
if old in h: h=h.replace(old,"#tip{position:absolute;left:12px;right:88px;top:calc(60px + env(safe-area-inset-top,0px));max-width:300px;")
old2="#screen[hidden],#toast[hidden],#tip[hidden]{display:none}"
if old2 in h: h=h.replace(old2,"#screen[hidden],#toast[hidden],#tip[hidden],#hud[hidden],.dot[hidden]{display:none}")
open(p,'w').write(h); print('reassembled', len(h)//1024,'KB')
