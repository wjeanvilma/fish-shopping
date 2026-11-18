package com.willio.jeanvilma.fishshopping.push

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.willio.jeanvilma.fishshopping.MainActivity
import com.willio.jeanvilma.fishshopping.R
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.core.push.LocalPushSchedule

/**
 * Finish 3.0 Phase 18 — present the daily-goal local notification.
 */
object DailyGoalReminderNotifier {
    fun ensureChannel(context: Context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val mgr = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        val existing = mgr.getNotificationChannel(LocalPushSchedule.Policy().channelId)
        if (existing != null) return
        val channel = NotificationChannel(
            LocalPushSchedule.Policy().channelId,
            "Daily goals",
            NotificationManager.IMPORTANCE_DEFAULT,
        ).apply {
            description = "Local reminders for unclaimed daily goals"
        }
        mgr.createNotificationChannel(channel)
    }

    fun show(context: Context, unclaimedCount: Int) {
        ensureChannel(context)
        val title = UiStrings.t(LocalPushSchedule.Policy().titleKey)
        val body = UiStrings.t(
            LocalPushSchedule.Policy().bodyKey,
            mapOf("count" to unclaimedCount.coerceAtLeast(0)),
        )
        val launch = PendingIntent.getActivity(
            context,
            0,
            Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            },
            PendingIntent.FLAG_UPDATE_CURRENT or
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) PendingIntent.FLAG_IMMUTABLE else 0,
        )
        val notification = NotificationCompat.Builder(context, LocalPushSchedule.Policy().channelId)
            .setSmallIcon(R.mipmap.ic_launcher)
            .setContentTitle(title)
            .setContentText(body)
            .setStyle(NotificationCompat.BigTextStyle().bigText(body))
            .setContentIntent(launch)
            .setAutoCancel(true)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .build()
        try {
            NotificationManagerCompat.from(context)
                .notify(LocalPushSchedule.Policy().notificationId, notification)
        } catch (_: SecurityException) {
            // POST_NOTIFICATIONS denied — soft fail; schedule still advances.
        }
    }
}
