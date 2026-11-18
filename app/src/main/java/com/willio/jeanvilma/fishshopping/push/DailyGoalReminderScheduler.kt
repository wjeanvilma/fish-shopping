package com.willio.jeanvilma.fishshopping.push

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import com.willio.jeanvilma.fishshopping.core.push.LocalPushSchedule
import java.util.TimeZone

/**
 * Finish 3.0 Phase 18 — schedule / cancel local daily-goal reminder alarms.
 */
object DailyGoalReminderScheduler {
    const val ACTION_FIRE = "com.willio.jeanvilma.fishshopping.push.DAILY_GOAL_REMINDER"
    const val EXTRA_UNCLAIMED = "unclaimed"
    const val PREFS = "fish_shopping_daily_reminders"
    const val KEY_ENABLED = "enabled"
    const val KEY_UNCLAIMED = "unclaimed"
    const val KEY_LAST_DAY = "last_shown_day"

    fun timezoneOffsetMinutes(nowMs: Long = System.currentTimeMillis()): Int =
        TimeZone.getDefault().getOffset(nowMs) / LocalPushSchedule.MS_PER_MINUTE.toInt()

    fun sync(context: Context, enabled: Boolean, unclaimedCount: Int) {
        val app = context.applicationContext
        val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .putBoolean(KEY_ENABLED, enabled)
            .putInt(KEY_UNCLAIMED, unclaimedCount.coerceAtLeast(0))
            .apply()
        if (!enabled) {
            cancel(app)
            return
        }
        scheduleNext(app, unclaimedCount.coerceAtLeast(0))
    }

    fun rescheduleFromPrefs(context: Context) {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        if (!prefs.getBoolean(KEY_ENABLED, false)) {
            cancel(context)
            return
        }
        scheduleNext(context, prefs.getInt(KEY_UNCLAIMED, 0))
    }

    fun markShownToday(context: Context, nowMs: Long = System.currentTimeMillis()) {
        val day = LocalPushSchedule.localDayId(nowMs, timezoneOffsetMinutes(nowMs))
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_LAST_DAY, day)
            .apply()
    }

    fun lastShownDayId(context: Context): Int =
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getInt(KEY_LAST_DAY, -1)

    /** Update cached unclaimed count without touching the alarm (call from HUD publish). */
    fun updateUnclaimed(context: Context, unclaimedCount: Int) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putInt(KEY_UNCLAIMED, unclaimedCount.coerceAtLeast(0))
            .apply()
    }

    fun shouldDeliverNow(context: Context, nowMs: Long = System.currentTimeMillis()): Boolean {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val today = LocalPushSchedule.localDayId(nowMs, timezoneOffsetMinutes(nowMs))
        return LocalPushSchedule.shouldDeliver(
            enabled = prefs.getBoolean(KEY_ENABLED, false),
            unclaimedCount = prefs.getInt(KEY_UNCLAIMED, 0),
            lastShownDayId = prefs.getInt(KEY_LAST_DAY, -1),
            todayDayId = today,
        )
    }

    private fun scheduleNext(context: Context, unclaimedCount: Int) {
        val app = context.applicationContext
        val now = System.currentTimeMillis()
        val fireAt = LocalPushSchedule.nextFireEpochMs(
            nowMs = now,
            hour = LocalPushSchedule.DEFAULT_LOCAL_HOUR,
            minute = LocalPushSchedule.DEFAULT_LOCAL_MINUTE,
            offsetMinutes = timezoneOffsetMinutes(now),
        )
        val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        val pi = pendingIntent(app, unclaimedCount)
        // Inexact-while-idle avoids SCHEDULE_EXACT_ALARM permission; still fires near evening.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, fireAt, pi)
        } else {
            @Suppress("DEPRECATION")
            am.set(AlarmManager.RTC_WAKEUP, fireAt, pi)
        }
    }

    fun cancel(context: Context) {
        val app = context.applicationContext
        val am = app.getSystemService(Context.ALARM_SERVICE) as AlarmManager
        am.cancel(pendingIntent(app, 0))
    }

    private fun pendingIntent(context: Context, unclaimedCount: Int): PendingIntent {
        val intent = Intent(context, DailyGoalReminderReceiver::class.java).apply {
            action = ACTION_FIRE
            putExtra(EXTRA_UNCLAIMED, unclaimedCount)
        }
        val flags = PendingIntent.FLAG_UPDATE_CURRENT or
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0
        return PendingIntent.getBroadcast(
            context,
            LocalPushSchedule.Policy().requestCode,
            intent,
            flags,
        )
    }
}
