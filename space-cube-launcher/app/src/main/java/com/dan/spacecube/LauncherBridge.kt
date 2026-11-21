package com.dan.spacecube

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

    /** The page has drawn its first fly-in frame: fade out the native cover. */
    @JavascriptInterface
    fun hideCover() = activity.hideCover()

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
