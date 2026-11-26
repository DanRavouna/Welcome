package com.dan.spacecube

import android.Manifest
import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.CalendarContract
import androidx.core.app.NotificationCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.Calendar
import java.util.TimeZone

/**
 * The phone's calendars, through Android's shared calendar store (Google Calendar, Samsung Calendar and any other
 * app that syncs there). Read for the calendar window, written when you add an event, and watched for reminders.
 * Everything goes to the page as JSON. Times are milliseconds; days are Julian day numbers (the store's own START_DAY / END_DAY).
 */
object PhoneCalendars {
    /** The last thing that went wrong reading or writing the store (shown in the calendar window, for diagnosis). */
    @Volatile var lastError: String = ""
    private fun fail(e: Exception) { lastError = (e.javaClass.simpleName + ": " + (e.message ?: "")).take(200) }

    fun canRead(ctx: Context) = ctx.checkSelfPermission(Manifest.permission.READ_CALENDAR) == PackageManager.PERMISSION_GRANTED
    fun canWrite(ctx: Context) = ctx.checkSelfPermission(Manifest.permission.WRITE_CALENDAR) == PackageManager.PERMISSION_GRANTED

    /** The calendars shown in the phone's calendar apps: [{id, name, account, color, write}] */
    fun calendars(ctx: Context): JSONArray {
        val out = JSONArray()
        if (!canRead(ctx)) return out
        val proj = arrayOf(CalendarContract.Calendars._ID, CalendarContract.Calendars.CALENDAR_DISPLAY_NAME,
            CalendarContract.Calendars.ACCOUNT_NAME, CalendarContract.Calendars.CALENDAR_COLOR,
            CalendarContract.Calendars.CALENDAR_ACCESS_LEVEL, CalendarContract.Calendars.VISIBLE)
        try {
            ctx.contentResolver.query(CalendarContract.Calendars.CONTENT_URI, proj, null, null, null)?.use { c ->
                while (c.moveToNext()) {
                    if (c.getInt(5) != 1) continue                       // hidden in the phone's calendar apps: hidden here too
                    out.put(JSONObject().put("id", c.getLong(0)).put("name", c.getString(1) ?: "")
                        .put("account", c.getString(2) ?: "").put("color", hex(c.getInt(3)))
                        .put("write", c.getInt(4) >= CalendarContract.Calendars.CAL_ACCESS_CONTRIBUTOR && canWrite(ctx)))
                }
            }
        } catch (e: Exception) { fail(e) }
        return out
    }

    private fun visibleIds(ctx: Context): Set<Long> {
        val ids = HashSet<Long>()
        val a = calendars(ctx)
        for (i in 0 until a.length()) ids.add(a.getJSONObject(i).getLong("id"))
        return ids
    }

    /** Every event happening between two moments, repeats included: [{id, begin, end, allDay, startDay, endDay, title, cal, color}] */
    fun events(ctx: Context, from: Long, to: Long): JSONArray {
        val out = JSONArray()
        if (!canRead(ctx)) return out
        val vis = visibleIds(ctx)
        val proj = arrayOf(CalendarContract.Instances.EVENT_ID, CalendarContract.Instances.BEGIN, CalendarContract.Instances.END,
            CalendarContract.Instances.ALL_DAY, CalendarContract.Instances.START_DAY, CalendarContract.Instances.END_DAY,
            CalendarContract.Instances.TITLE, CalendarContract.Instances.CALENDAR_ID, CalendarContract.Instances.DISPLAY_COLOR)
        try {
            CalendarContract.Instances.query(ctx.contentResolver, proj, from, to)?.use { c ->
                while (c.moveToNext()) {
                    if (c.getLong(7) !in vis) continue
                    out.put(JSONObject().put("id", c.getLong(0)).put("begin", c.getLong(1)).put("end", c.getLong(2))
                        .put("allDay", c.getInt(3) == 1).put("startDay", c.getInt(4)).put("endDay", c.getInt(5))
                        .put("title", c.getString(6) ?: "").put("cal", c.getLong(7)).put("color", hex(c.getInt(8))))
                }
            }
        } catch (e: Exception) { fail(e) }
        return out
    }

    /** One occurrence of an event (for a reminder), or null. */
    fun event(ctx: Context, id: Long, begin: Long): JSONObject? {
        val a = events(ctx, begin - 1, begin + 1)
        for (i in 0 until a.length()) { val o = a.getJSONObject(i); if (o.getLong("id") == id && o.getLong("begin") == begin) return o }
        return null
    }

    /** Events whose name contains the text, from every year the store holds: [{id, begin, end, allDay, title, cal, color, repeats}] */
    fun search(ctx: Context, q: String): JSONArray {
        val out = JSONArray()
        if (!canRead(ctx) || q.isBlank()) return out
        val vis = visibleIds(ctx)
        val proj = arrayOf(CalendarContract.Events._ID, CalendarContract.Events.DTSTART, CalendarContract.Events.DTEND,
            CalendarContract.Events.ALL_DAY, CalendarContract.Events.TITLE, CalendarContract.Events.CALENDAR_ID,
            CalendarContract.Events.DISPLAY_COLOR, CalendarContract.Events.RRULE)
        val like = "%" + q.trim().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        try {
            ctx.contentResolver.query(CalendarContract.Events.CONTENT_URI, proj,
                "${CalendarContract.Events.TITLE} LIKE ? ESCAPE '\\' AND ${CalendarContract.Events.DELETED} = 0", arrayOf(like),
                "${CalendarContract.Events.DTSTART} DESC")?.use { c ->
                while (c.moveToNext() && out.length() < 300) {
                    if (c.getLong(5) !in vis) continue
                    out.put(JSONObject().put("id", c.getLong(0)).put("begin", c.getLong(1)).put("end", c.getLong(2))
                        .put("allDay", c.getInt(3) == 1).put("title", c.getString(4) ?: "").put("cal", c.getLong(5))
                        .put("color", hex(c.getInt(6))).put("repeats", !c.getString(7).isNullOrEmpty()))
                }
            }
        } catch (e: Exception) { fail(e) }
        return out
    }

    /** Adds an event. All-day: begin and end are the first day and the day after the last one, at midnight UTC
     *  (the store's rule: all-day events use the UTC time zone and midnight boundaries). Returns the new id, or -1. */
    fun add(ctx: Context, cal: Long, title: String, begin: Long, end: Long, allDay: Boolean): Long {
        if (!canWrite(ctx)) return -1
        val v = ContentValues().apply {
            put(CalendarContract.Events.CALENDAR_ID, cal)
            put(CalendarContract.Events.TITLE, title)
            put(CalendarContract.Events.DTSTART, begin)
            put(CalendarContract.Events.DTEND, end)
            put(CalendarContract.Events.ALL_DAY, if (allDay) 1 else 0)
            put(CalendarContract.Events.EVENT_TIMEZONE, if (allDay) "UTC" else TimeZone.getDefault().id)
        }
        return try {
            val uri = ctx.contentResolver.insert(CalendarContract.Events.CONTENT_URI, v) ?: return -1
            EventReminders.schedule(ctx)
            uri.lastPathSegment?.toLongOrNull() ?: -1
        } catch (e: Exception) { fail(e); -1 }
    }

    private fun hex(c: Int) = String.format("#%06x", c and 0xffffff)
}

/**
 * Reminders for events: 30 and 10 minutes before and when they start; all-day events once, at the wake-up checklist's time.
 * One alarm at a time: the next reminder (or a check an hour from now, to pick up new events). When it rings, everything due
 * is shown: in the launcher if it is on screen, else as a notification, like the sleep / wake-up checklists.
 */
object EventReminders {
    private const val PREFS = "eventReminders"
    private const val FIRED = "fired"
    const val ACTION = "com.dan.spacecube.EVENT_REMINDER"
    const val CHANNEL = "events"
    private const val CODE = 9100
    private val BEFORE = listOf("30" to 30 * 60_000L, "10" to 10 * 60_000L, "0" to 0L)

    data class Due(val id: Long, val begin: Long, val kind: String, val at: Long, val title: String, val end: Long, val allDay: Boolean) {
        val key get() = "$id:$begin:$kind"
    }

    /** Every reminder for events in the next two days. */
    private fun upcoming(ctx: Context, now: Long): List<Due> {
        val list = ArrayList<Due>()
        val (wh, wm) = RoutineAlarms.wakeTime(ctx)
        val a = PhoneCalendars.events(ctx, now - 86_400_000L, now + 2 * 86_400_000L)
        for (i in 0 until a.length()) {
            val o = a.getJSONObject(i)
            val id = o.getLong("id"); val begin = o.getLong("begin"); val end = o.getLong("end"); val title = o.getString("title")
            if (o.getBoolean("allDay")) {                            // once, at the wake-up time of its first day (local)
                val jd = o.getInt("startDay")
                val c = Calendar.getInstance().apply { timeInMillis = (jd - 2440588L) * 86_400_000L }
                val day = Calendar.getInstance(TimeZone.getTimeZone("UTC")).apply { timeInMillis = (jd - 2440588L) * 86_400_000L }
                c.set(day.get(Calendar.YEAR), day.get(Calendar.MONTH), day.get(Calendar.DAY_OF_MONTH), wh, wm, 0); c.set(Calendar.MILLISECOND, 0)
                list.add(Due(id, begin, "day", c.timeInMillis, title, end, true))
            } else for ((k, d) in BEFORE) list.add(Due(id, begin, k, begin - d, title, end, false))
        }
        return list
    }

    private fun prefs(ctx: Context) = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private fun fired(ctx: Context): MutableSet<String> = HashSet(prefs(ctx).getStringSet(FIRED, emptySet()) ?: emptySet())

    private fun alarm(ctx: Context): PendingIntent {
        val i = Intent(ctx, RoutineReceiver::class.java).setAction(ACTION)
        return PendingIntent.getBroadcast(ctx, CODE, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /** Sets the one alarm: the next reminder, or a check within the hour. */
    fun schedule(ctx: Context) {
        val am = ctx.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = alarm(ctx); am.cancel(pi)
        if (!PhoneCalendars.canRead(ctx)) return
        val now = System.currentTimeMillis(); val done = fired(ctx)
        val next = upcoming(ctx, now).filter { it.at > now && it.key !in done }.minByOrNull { it.at }
        val check = now + 3_600_000L
        if (next != null && next.at <= check) {
            val exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms()
            if (exact) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, next.at, pi)
            else am.setWindow(AlarmManager.RTC_WAKEUP, next.at, 60_000L, pi)
        } else am.setWindow(AlarmManager.RTC_WAKEUP, check, 10 * 60_000L, pi)
    }

    /** The alarm rang: show everything due now (nothing older than 15 minutes, nothing twice), then set the next one. */
    fun ring(ctx: Context) {
        if (PhoneCalendars.canRead(ctx)) {
            val now = System.currentTimeMillis(); val done = fired(ctx)
            val due = upcoming(ctx, now).filter { it.at <= now + 30_000L && it.at > now - 15 * 60_000L && it.key !in done }
            due.forEach { show(ctx, it); done.add(it.key) }
            done.removeAll { k -> (k.split(":").getOrNull(1)?.toLongOrNull() ?: 0L) < now - 3 * 86_400_000L }   // forget old ones
            prefs(ctx).edit().putStringSet(FIRED, done).apply()
        }
        schedule(ctx)
    }

    private fun show(ctx: Context, d: Due) {
        val act = MainActivity.onScreen
        if (act != null) {                                        // the launcher is on screen: the page draws it and buzzes
            act.js("window.showEventReminder && window.showEventReminder(${d.id}, ${d.begin}, '${d.kind}')")
            return
        }
        val nm = ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL) == null) {
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Event reminders", NotificationManager.IMPORTANCE_HIGH))
        }
        val open = Intent(ctx, MainActivity::class.java)
            .setData(Uri.parse("spacecube://event/${d.id}/${d.begin}/${d.kind}"))   // each reminder its own intent
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("eventId", d.id).putExtra("eventBegin", d.begin).putExtra("eventKind", d.kind)
        val pi = PendingIntent.getActivity(ctx, d.key.hashCode(), open, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        val fmt = java.text.DateFormat.getTimeInstance(java.text.DateFormat.SHORT)
        val text = when (d.kind) {
            "30" -> "In 30 min · " + fmt.format(d.begin)
            "10" -> "In 10 min · " + fmt.format(d.begin)
            "0" -> "Starting now · " + fmt.format(d.begin)
            else -> "Today · all day"
        }
        val n = NotificationCompat.Builder(ctx, CHANNEL)
            .setSmallIcon(R.drawable.ic_stat_routine)
            .setContentTitle(d.title.ifBlank { "Event" })
            .setContentText(text)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_EVENT)
            .setDefaults(NotificationCompat.DEFAULT_VIBRATE)
            .setContentIntent(pi)
            .setAutoCancel(true)
            .build()
        try { nm.notify(d.key.hashCode(), n) } catch (e: SecurityException) { }
    }

    /** The JavaScript that shows a reminder opened from its notification (numbers and a fixed word only). */
    fun jsFor(intent: Intent): String? {
        val id = intent.getLongExtra("eventId", -1L); val begin = intent.getLongExtra("eventBegin", -1L)
        val kind = intent.getStringExtra("eventKind")
        if (id < 0 || begin < 0 || kind == null || kind !in listOf("30", "10", "0", "day")) return null
        return "window.goHome && window.goHome(); window.showEventReminder && window.showEventReminder($id, $begin, '$kind')"
    }
}
