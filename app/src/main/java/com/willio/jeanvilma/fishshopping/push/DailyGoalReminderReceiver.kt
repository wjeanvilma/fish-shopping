package com.willio.jeanvilma.fishshopping.push

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/**
 * Finish 3.0 Phase 18 — fires / reschedules local daily-goal reminders.
 * Handles both the scheduled alarm and BOOT_COMPLETED.
 */
class DailyGoalReminderReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        val action = intent?.action ?: return
        when (action) {
            Intent.ACTION_BOOT_COMPLETED,
            Intent.ACTION_MY_PACKAGE_REPLACED,
            -> {
                DailyGoalReminderScheduler.rescheduleFromPrefs(context)
            }
            DailyGoalReminderScheduler.ACTION_FIRE -> {
                val unclaimed = intent.getIntExtra(DailyGoalReminderScheduler.EXTRA_UNCLAIMED, 0)
                if (DailyGoalReminderScheduler.shouldDeliverNow(context)) {
                    DailyGoalReminderNotifier.show(context, unclaimed)
                    DailyGoalReminderScheduler.markShownToday(context)
                }
                DailyGoalReminderScheduler.rescheduleFromPrefs(context)
            }
        }
    }
}
