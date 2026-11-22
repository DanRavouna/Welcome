package com.dan.spacecube

import android.app.AppOpsManager
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ActivityNotFoundException
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.graphics.Bitmap
import android.graphics.Canvas
import android.net.Uri
import android.os.Build
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.Settings
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayOutputStream

/**
 * Everything the 3D page can ask the phone for. In the page it's `window.Launcher`.
 * All methods are called from JavaScript on a background thread.
 */
class LauncherBridge(private val activity: MainActivity) {

    private val pm = activity.packageManager
    @Volatile private var cachedApps: String? = null

    fun invalidateCache() { cachedApps = null }

    /** Running inside the real phone (so the page stops using placeholder apps). */
    @JavascriptInterface
    fun isNative(): Boolean = true

    /**
     * Every app that has a home-screen icon, as JSON:
     * [{ "pkg", "activity", "name", "icon" (PNG data URL), "category" }, ...]
     */
    @JavascriptInterface
    fun getApps(): String {
        cachedApps?.let { return it }
        val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)
        val list = pm.queryIntentActivities(intent, 0)
        val out = JSONArray()
        val seen = HashSet<String>()
        for (ri in list) {
            val ai = ri.activityInfo ?: continue
            if (ai.packageName == activity.packageName) continue          // don't list ourselves
            val key = ai.packageName + "/" + ai.name
            if (!seen.add(key)) continue
            out.put(JSONObject().apply {
                put("pkg", ai.packageName)
                put("activity", ai.name)
                put("name", ri.loadLabel(pm).toString())
                put("icon", iconDataUrl(ri.loadIcon(pm)))
                put("category", categoryName(ai.applicationInfo))
            })
        }
        return out.toString().also { cachedApps = it }
    }

    /** Opens an app. Returns false if it couldn't be started (e.g. it was just uninstalled). */
    @JavascriptInterface
    fun launch(pkg: String, activityName: String?): Boolean {
        val intent = if (!activityName.isNullOrEmpty())
            Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER).setClassName(pkg, activityName)
        else pm.getLaunchIntentForPackage(pkg)
        intent ?: return false
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED)
        return try {
            activity.runOnUiThread { activity.startActivity(intent) }; true
        } catch (e: ActivityNotFoundException) { false }
    }

    /** Opens the system "App info" page for an app. */
    @JavascriptInterface
    fun appInfo(pkg: String) {
        val i = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:$pkg"))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.runOnUiThread { activity.startActivity(i) }
    }

    /** Asks the system to uninstall an app (the phone shows its own confirmation). */
    @JavascriptInterface
    fun uninstall(pkg: String) {
        val i = Intent(Intent.ACTION_DELETE, Uri.parse("package:$pkg")).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.runOnUiThread { activity.startActivity(i) }
    }

    /** The page's picture of the fly-in's first frame (JPEG data URL): becomes the cover, so they match. */
    @JavascriptInterface
    fun setCover(dataUrl: String) {
        val comma = dataUrl.indexOf(',')
        if (comma < 0) return
        val bytes = Base64.decode(dataUrl.substring(comma + 1), Base64.DEFAULT)
        val bmp = android.graphics.BitmapFactory.decodeByteArray(bytes, 0, bytes.size) ?: return
        activity.setCoverBitmap(bmp)
    }

    /** The page has drawn its first fly-in frame: fade out the native cover. */
    // ---- apps in use: Android's usage history (needs "Usage access", granted by the user in Settings) ----
    @JavascriptInterface
    fun hasUsageAccess(): Boolean {
        val ops = activity.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = if (Build.VERSION.SDK_INT >= 29)
            ops.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), activity.packageName)
        else @Suppress("DEPRECATION")
            ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, android.os.Process.myUid(), activity.packageName)
        return mode == AppOpsManager.MODE_ALLOWED
    }

    @JavascriptInterface
    fun openUsageAccess() {
        val i = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        activity.runOnUiThread { try { activity.startActivity(i) } catch (e: ActivityNotFoundException) { } }
    }

    /** Apps brought to the foreground since [sinceMs]: JSON [{pkg, t}], newest first, one entry per app. */
    @JavascriptInterface
    fun getRecentApps(sinceMs: Double): String {
        val out = JSONArray()
        if (!hasUsageAccess()) return out.toString()
        val usm = activity.getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val home = homePackages()
        val last = HashMap<String, Long>()
        val events = usm.queryEvents(sinceMs.toLong(), System.currentTimeMillis())
        val e = UsageEvents.Event()
        while (events.hasNextEvent()) {
            events.getNextEvent(e)
            if (e.eventType != UsageEvents.Event.MOVE_TO_FOREGROUND) continue   // = ACTIVITY_RESUMED (1)
            val p = e.packageName ?: continue
            if (p == activity.packageName || p in home) continue
            last[p] = maxOf(last[p] ?: 0L, e.timeStamp)
        }
        last.entries.sortedByDescending { it.value }.forEach {
            out.put(JSONObject().put("pkg", it.key).put("t", it.value))
        }
        return out.toString()
    }

    private fun homePackages(): Set<String> {
        val i = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
        return activity.packageManager.queryIntentActivities(i, 0).map { it.activityInfo.packageName }.toSet()
    }

    /** Sleep / wake-up checklist times from the page: {"sleep":{"on":true,"h":23,"m":0}, "wake":{...}} */
    @JavascriptInterface
    fun setRoutineAlarms(json: String) { RoutineAlarms.save(activity, json) }

    /** Ask once for permission to show notifications (Android 13+). */
    @JavascriptInterface
    fun askNotifications() {
        if (Build.VERSION.SDK_INT >= 33 &&
            activity.checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            activity.runOnUiThread { activity.requestPermissions(arrayOf(android.Manifest.permission.POST_NOTIFICATIONS), 7) }
        }
    }

    /** Open Android's live wallpaper preview for Space Cube (then "Set wallpaper" -> Home and lock screens). */
    @JavascriptInterface
    fun setLiveWallpaper() {
        activity.runOnUiThread {
            val i = Intent(android.app.WallpaperManager.ACTION_CHANGE_LIVE_WALLPAPER)
                .putExtra(android.app.WallpaperManager.EXTRA_LIVE_WALLPAPER_COMPONENT,
                    android.content.ComponentName(activity, SpaceWallpaper::class.java))
            try { activity.startActivity(i) }
            catch (e: Exception) {
                try { activity.startActivity(Intent(android.app.WallpaperManager.ACTION_LIVE_WALLPAPER_CHOOSER)) } catch (e2: Exception) { }
            }
        }
    }

    /** Is the Space Cube live wallpaper the current wallpaper? */
    @JavascriptInterface
    fun isLiveWallpaperOn(): Boolean {
        val info = android.app.WallpaperManager.getInstance(activity).wallpaperInfo ?: return false
        return info.packageName == activity.packageName
    }

    /** Triple-tap on the clock: fetch the newest screen from the website. */
    @JavascriptInterface
    fun reloadLive() { activity.runOnUiThread { activity.loadLive() } }

    /** App version, shown in Settings. */
    @JavascriptInterface
    fun appVersion(): String =
        try { activity.packageManager.getPackageInfo(activity.packageName, 0).versionName ?: "" } catch (e: Exception) { "" }

    @JavascriptInterface
    fun hideCover() { activity.hideCover() }

    /** Short haptic buzz (milliseconds). */
    @JavascriptInterface
    fun vibrate(ms: Int) {
        vibrator()?.vibrate(VibrationEffect.createOneShot(ms.toLong().coerceIn(1, 200), VibrationEffect.DEFAULT_AMPLITUDE))
    }

    @Suppress("DEPRECATION")
    private fun vibrator(): Vibrator? =
        if (Build.VERSION.SDK_INT >= 31)
            (activity.getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
        else
            activity.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    // ---- helpers ----

    private fun iconDataUrl(d: android.graphics.drawable.Drawable): String {
        val size = 128
        val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
        val c = Canvas(bmp)
        d.setBounds(0, 0, size, size)
        d.draw(c)
        val bytes = ByteArrayOutputStream().also { bmp.compress(Bitmap.CompressFormat.PNG, 100, it) }.toByteArray()
        bmp.recycle()
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    /** The app's own category (set by its developer), used to pre-sort apps on first launch. */
    private fun categoryName(ai: ApplicationInfo): String = when (ai.category) {
        ApplicationInfo.CATEGORY_GAME -> "game"
        ApplicationInfo.CATEGORY_AUDIO -> "audio"
        ApplicationInfo.CATEGORY_VIDEO -> "video"
        ApplicationInfo.CATEGORY_IMAGE -> "image"
        ApplicationInfo.CATEGORY_SOCIAL -> "social"
        ApplicationInfo.CATEGORY_NEWS -> "news"
        ApplicationInfo.CATEGORY_MAPS -> "maps"
        ApplicationInfo.CATEGORY_PRODUCTIVITY -> "productivity"
        else -> "other"
    }
}
