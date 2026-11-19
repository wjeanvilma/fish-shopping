package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 20 — staff/worker AI depth wave 3 ship constants
 * (mirrors shared/ship/staff-ai-3.json).
 */
object StaffAi3 {
    const val PHASE = 20
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.staff_ai_3.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val STAFF_AI_3_MARKER = "authored-finish-5.0-phase-20"
    const val CATALOG = "shared/ship/staff-ai-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-staff-ai-3.json"
    const val EXTENDS_STAFF_AI_2 = "shared/ship/staff-ai-2.json"
    const val EXTENDS_WORKER_AI_DEPTH = "shared/ship/worker-ai-depth.json"
    const val VALIDATE_SCRIPT = "staffai3:validate"
    const val SOFT_STAFF_AI_2_VALIDATE = "staffai2:validate"
    const val SOFT_WORKER_AI_VALIDATE = "workerai:validate"
    const val BRANCHES_MIN = 13
    const val SCHEDULES_MIN = 3
    const val DEPTH_BEHAVIOR_COUNT = 5
    const val DEPTH_STAT_COUNT = 5
    const val DECISION_REASON_COUNT = 5
    const val CLOSES_GAP = "staffAi3Incomplete"

    val DEPTH_STATS: List<String> = listOf(
        "stat.supervisor_rush_marshals",
        "stat.operator_circuit_links",
        "stat.smoker_queue_feeds",
        "stat.schedule_task_boosts",
        "stat.worker_failure_recoveries",
    )

    val NEW_BRANCH_IDS: List<String> = listOf(
        "branch.supervisor.rush_marshal",
        "branch.operator.circuit_boss",
        "branch.smoker_specialist.smoke_queue",
    )

    val NEW_SCHEDULE_IDS: List<String> = listOf(
        "schedule.peak_tide",
    )

    val DECISION_REASONS: List<String> = listOf(
        "rush_marshal_patrol",
        "circuit_boss_link",
        "smoke_queue_feed",
        "schedule_daypart_boost",
        "failure_recover",
    )
}
