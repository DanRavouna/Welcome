# Test-only: start older suites as an existing player (intro done, test mode on). Never shipped.
SEED = """(() => { try { if (sessionStorage.getItem("seeded")) return; sessionStorage.setItem("seeded", "1"); if (!localStorage.getItem('critter-roll:v2')) localStorage.setItem('critter-roll:v2', JSON.stringify({caught:[],essence:0,wins:0,intro:true,settings:{sound:true,vibrate:true,calm:false,test:true,daynight:true,track:true}})); } catch (e) {} })();"""
import os
if os.environ.get('CR_WEATHER'):  # optional: force a weather kind in every test page (e.g. CR_WEATHER=storm bash src/run-tests.sh @world)
    SEED += "\nwindow.__weather = %r;" % os.environ['CR_WEATHER']
try:
    from playwright.sync_api._generated import Browser
    _nc = Browser.new_context
    def new_context(self, *a, **k):
        ctx = _nc(self, *a, **k); ctx.add_init_script(SEED); return ctx
    Browser.new_context = new_context
    def new_page(self, *a, **k):
        return self.new_context(*a, **k).new_page()
    Browser.new_page = new_page
except Exception:
    pass
