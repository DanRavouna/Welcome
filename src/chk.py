# For NEW tests: check('what must be true', condition, detail) prints "ok" or "FAIL" and done() exits non-zero if anything failed, so the runner fails the test by itself.
import sys
_failed = []
def check(name, cond, detail=''):
    print(('ok   ' if cond else 'FAIL ') + name + (' | ' + str(detail) if detail != '' else ''))
    if not cond: _failed.append(name)
    return cond
def done():
    if _failed: print('FAILED:', _failed); sys.exit(1)
