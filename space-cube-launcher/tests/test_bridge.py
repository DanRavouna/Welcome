"""Every calendar method the page calls on the app exists in the app's bridge (LauncherBridge.kt), with a JavascriptInterface mark."""
import pathlib, re
from sc import check, done
R = pathlib.Path(__file__).resolve().parent.parent
js = (R / 'src/game.js').read_text(); kt = (R / 'app/src/main/java/com/dan/spacecube/LauncherBridge.kt').read_text()
used = set(re.findall(r"calCall\('(\w+)'", js)) | set(re.findall(r"\bsrc\.(cal\w+)", js)) | set(re.findall(r"s\.(cal\w+)", js))
bridged = set(re.findall(r"@JavascriptInterface\s+fun (cal\w+)\(", kt))
fake = set(re.findall(r"\b(cal\w+):", (R / 'tests/calsource.js').read_text()))
check('the page calls calendar methods', len(used) >= 6, sorted(used))
check('every one is in the app bridge', used <= bridged, sorted(used - bridged))
check('...and in the tests\' stand-in', used <= fake, sorted(used - fake))
check('the reminder JavaScript from a notification carries only numbers and a fixed word', 'kind !in listOf("30", "10", "0", "day")' in (R / 'app/src/main/java/com/dan/spacecube/Calendars.kt').read_text())
batused = set(re.findall(r"batCall\('(\w+)'", js)) | set(re.findall(r"src\.(bat\w+)\(", js))
batbridged = set(re.findall(r"@JavascriptInterface\s+fun (bat\w+)\(", kt))
batfake = set(re.findall(r"\b(bat\w+):", (R / 'tests/batsource.js').read_text()))
check('the page calls battery test methods', len(batused) >= 4, sorted(batused))
check('every one is in the app bridge', batused <= batbridged, sorted(batused - batbridged))
check('...and in the tests\' stand-in', batused <= batfake, sorted(batused - batfake))
done()
