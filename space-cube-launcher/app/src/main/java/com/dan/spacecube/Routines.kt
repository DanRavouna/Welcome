package com.dan.spacecube

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.json.JSONObject
import java.util.Calendar

/**
 * Sleep / wake-up checklists: the page saves the times here, and Android rings at those times
 * even when Space Cube isn't on screen. Tapping the notification opens Space Cube, which draws the checklist.
 */
object RoutineAlarms {
    private const val PREFS = "routines"
    private const val KEY = "json"          // {"sleep":{"on":true,"h":23,"m":0}, "wake":{...}}
    const val ACTION = "com.dan.spacecube.ROUTINE"
    const val CHANNEL = "routines"
    val KINDS = listOf("sleep", "wake")

    /** The wake-up checklist's time (also when it is switched off): all-day events remind at this time. 07:00 until one is set. */
    fun wakeTime(ctx: Context): Pair<Int, Int> {
        val w = try { JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "{}") ?: "{}").optJSONObject("wake") } catch (e: Exception) { null }
        return Pair(w?.optInt("h", 7) ?: 7, w?.optInt("m", 0) ?: 0)
    }

    fun save(ctx: Context, json: String) {
        ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString(KEY, json).apply()
        scheduleAll(ctx)
        EventReminders.schedule(ctx)                     // all-day reminders follow the wake-up time
    }

    private fun pending(ctx: Context, kind: String): PendingIntent {
        val i = Intent(ctx, RoutineReceiver::class.java).setAction(ACTION).putExtra("kind", kind)
        return PendingIntent.getBroadcast(ctx, kind.hashCode(), i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /** (Re)set the next alarm for each checklist that is switched on. */
    fun scheduleAll(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val all = try {
            JSONObject(ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, "{}") ?: "{}")
        } catch (e: Exception) { JSONObject() }
        for (kind in KINDS) {
            val pi = pending(ctx, kind)
            am.cancel(pi)
            val r = all.optJSONObject(kind) ?: continue
            if (!r.optBoolean("on", false)) continue
            val c = Calendar.getInstance().apply {
                set(Calendar.HOUR_OF_DAY, r.optInt("h", 23)); set(Calendar.MINUTE, r.optInt("m", 0))
                set(Calendar.SECOND, 0); set(Calendar.MILLISECOND, 0)
                if (timeInMillis <= System.currentTimeMillis() + 1000) add(Calendar.DAY_OF_YEAR, 1)
            }
            val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, c.timeInMillis, pi)
            else am.setWindow(AlarmManager.RTC_WAKEUP, c.timeInMillis, 5 * 60_000L, pi)   // within 5 minutes
        }
    }

    fun notify(ctx: Context, kind: String) {
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Sleep & wake checklists", NotificationManager.IMPORTANCE_HIGH))
        }
        val open = Intent(ctx, MainActivity::class.java)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("routine", kind)
        val pi = PendingIntent.getActivity(ctx, 100 + kind.hashCode(), open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_routine)
            .setContentTitle(if (kind == "sleep") "Sleep sequence" else "Wake-up sequence")
            .setContentText("Tap to open your checklist")
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        try { nm.notify(kind.hashCode(), n) } catch (e: SecurityException) { }   // notifications not allowed
    }
}

/** Rings at the checklist times and for event reminders; also re-arms both after a reboot, an update or a clock change. */
class RoutineReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action == EventReminders.ACTION) { EventReminders.ring(ctx); return }
        if (intent.action == RoutineAlarms.ACTION) {
            intent.getStringExtra("kind")?.let { RoutineAlarms.notify(ctx, it) }
        }
        RoutineAlarms.scheduleAll(ctx)   // next day's alarm (and after boot / time changes)
        if (intent.action != RoutineAlarms.ACTION) EventReminders.schedule(ctx)
    }
}
