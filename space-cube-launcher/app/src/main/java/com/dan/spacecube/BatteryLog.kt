package com.dan.spacecube

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.os.BatteryManager
import android.os.Build
import org.json.JSONArray
import org.json.JSONObject

/**
 * The battery test (Settings > Battery test): from Start to Stop, a reading every minute while Space Cube is on screen,
 * every 5 minutes otherwise (Android may space those out further while the phone sleeps), and one at every change between
 * the two. Each reading: { t (ms), level (%), charge (µAh, the battery's charge counter; 0 if the phone doesn't report it),
 * now (the phone's own "current now" number, kept raw: its unit and sign differ between phones), plugged, on (Space Cube on screen) }.
 * The page draws the results; drain in mA is worked out from the charge counter, not from "current now".
 */
object BatteryLog {
    private const val PREFS = "batteryTest"
    const val ACTION = "com.dan.spacecube.BATTERY_TEST"
    private const val CODE = 9200
    private const val MAX = 3000                      // readings kept (a little over two days of minutes)

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    fun running(ctx: Context) = prefs(ctx).getBoolean("running", false)

    /** One reading, now. */
    fun reading(ctx: Context): JSONObject {
        val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        val sticky = ctx.registerReceiver(null, IntentFilter(Intent.ACTION_BATTERY_CHANGED))
        val lvl = sticky?.getIntExtra(BatteryManager.EXTRA_LEVEL, -1) ?: -1
        val scale = sticky?.getIntExtra(BatteryManager.EXTRA_SCALE, -1) ?: -1
        val level = if (lvl >= 0 && scale > 0) lvl * 100.0 / scale else bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY).toDouble()
        val charge = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CHARGE_COUNTER).let { if (it == Int.MIN_VALUE || it <= 0) 0 else it }
        val now = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CURRENT_NOW).let { if (it == Int.MIN_VALUE) 0 else it }
        val plugged = (sticky?.getIntExtra(BatteryManager.EXTRA_PLUGGED, 0) ?: 0) != 0
        return JSONObject().put("t", System.currentTimeMillis()).put("level", level).put("charge", charge).put("now", now)
            .put("plugged", plugged).put("on", MainActivity.onScreen != null)
    }

    private fun samples(ctx: Context): JSONArray = try { JSONArray(prefs(ctx).getString("samples", "[]")) } catch (e: Exception) { JSONArray() }

    @Synchronized fun record(ctx: Context) {
        if (!running(ctx)) return
        val a = samples(ctx)
        a.put(reading(ctx))
        val out = if (a.length() > MAX) JSONArray().also { n -> for (i in a.length() - MAX until a.length()) n.put(a.get(i)) } else a
        prefs(ctx).edit().putString("samples", out.toString()).apply()
    }

    fun start(ctx: Context) {
        prefs(ctx).edit().putBoolean("running", true).putLong("start", System.currentTimeMillis()).putLong("stop", 0L).putString("samples", "[]").commit()
        record(ctx); schedule(ctx)
    }

    fun stop(ctx: Context) {
        if (running(ctx)) record(ctx)
        prefs(ctx).edit().putBoolean("running", false).putLong("stop", System.currentTimeMillis()).apply()
        (ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager).cancel(alarm(ctx))
    }

    /** {running, start, stop, samples:[...]} */
    fun status(ctx: Context): String = JSONObject().put("running", running(ctx)).put("start", prefs(ctx).getLong("start", 0L))
        .put("stop", prefs(ctx).getLong("stop", 0L)).put("samples", samples(ctx)).toString()

    private fun alarm(ctx: Context): PendingIntent =
        PendingIntent.getBroadcast(ctx, CODE, Intent(ctx, RoutineReceiver::class.java).setAction(ACTION),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)

    /** The next reading: in a minute while Space Cube is on screen, else in 5 minutes. */
    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = alarm(ctx); am.cancel(pi)
        if (!running(ctx)) return
        val at = System.currentTimeMillis() + if (MainActivity.onScreen != null) 60_000L else 5 * 60_000L
        val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
        if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi) else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, pi)
    }

    /** The alarm rang. */
    fun ring(ctx: Context) { record(ctx); schedule(ctx) }

    /** Space Cube came on screen or left it: a reading at the change, and the next one at the new pace. */
    fun changed(ctx: Context) { if (running(ctx)) { record(ctx); schedule(ctx) } }
}
