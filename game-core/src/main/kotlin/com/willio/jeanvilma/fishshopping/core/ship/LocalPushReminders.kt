package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 18 — local daily-goal push reminders
 * (mirrors shared/ship/local-push-reminders.json).
 */
object LocalPushReminders {
    const val PHASE = 18
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.local_push_reminders.v1"
    const val CATALOG = "shared/ship/local-push-reminders.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-local-push-reminders.json"
    const val POLICY_CATALOG = "shared/push/local-daily-goal-reminders.json"
    const val MARKER = "authored-finish-3.0-phase-18"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CLOSES_GAP = "pushRemindersMissing"
    const val VALIDATE_SCRIPT = "npm run localpush:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val DEFAULT_LOCAL_HOUR = 18
    const val DEFAULT_LOCAL_MINUTE = 0
}
