package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures
 * (mirrors shared/ship/staff-ai-4.json).
 */
object StaffAi4 {
    const val PHASE = 16
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.staff_ai_4.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val STAFF_AI_4_MARKER = "authored-finish-6.0-phase-16"
    const val CATALOG = "shared/ship/staff-ai-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-staff-ai-4.json"
    const val DECISION_TRACE_FIXTURE = "shared/fixtures/decision-traces-staff-ai-4.json"
    const val EXTENDS_STAFF_AI_3 = "shared/ship/staff-ai-3.json"
    const val VALIDATE_SCRIPT = "staffai4:validate"
    const val SOFT_STAFF_AI_3_VALIDATE = "staffai3:validate"
    const val SOFT_STAFF_TREES_VALIDATE = "stafftrees:validate"
    const val BRANCHES_MIN = 16
    const val SCHEDULES_MIN = 4
    const val DEPTH_BEHAVIOR_COUNT = 5
    const val DEPTH_STAT_COUNT = 5
    const val DECISION_REASON_COUNT = 5
    const val CLOSES_GAP = "staffAi4Incomplete"

    val DEPTH_STATS: List<String> = listOf(
        "stat.ice_runner_nest_chills",
        "stat.greeter_nest_hosts",
        "stat.porter_nest_hauls",
        "stat.schedule_task_boosts",
        "stat.worker_failure_recoveries",
    )

    val NEW_BRANCH_IDS: List<String> = listOf(
        "branch.ice_runner.nest_chill",
        "branch.greeter.nest_host",
        "branch.porter.nest_haul",
    )

    val NEW_SCHEDULE_IDS: List<String> = listOf(
        "schedule.nest_ember",
    )

    val DECISION_REASONS: List<String> = listOf(
        "nest_chill_chain",
        "nest_host_welcome",
        "nest_haul_urgency",
        "schedule_nest_ember_boost",
        "nest_decision_fixture",
    )
}
