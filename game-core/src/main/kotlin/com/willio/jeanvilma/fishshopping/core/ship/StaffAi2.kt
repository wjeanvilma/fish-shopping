package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 19 — staff/worker AI depth wave 2 ship contracts from
 * `shared/ship/staff-ai-2.json`.
 */
object StaffAi2 {
    const val PHASE = 19
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.staff_ai_2.v1"
    const val CATALOG = "shared/ship/staff-ai-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-staff-ai-2.json"
    const val MARKER = "authored-finish-4.0-phase-19"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25

    const val STAFF_TREES_CATALOG = "shared/ship/staff-trees.json"
    const val EXTENDS_WORKER_AI_DEPTH = "shared/ship/worker-ai-depth.json"
    const val VALIDATE_SCRIPT = "staffai2:validate"
    const val SOFT_WORKER_AI_VALIDATE = "workerai:validate"
    const val DEPTH_BEHAVIOR_COUNT = 5
    const val DEPTH_STAT_COUNT = 3
    const val DECISION_REASON_COUNT = 5

    val DEPTH_STATS: List<String> = listOf(
        "stat.fisher_trophy_casts",
        "stat.porter_relay_pickups",
        "stat.cashier_quick_tills",
    )

    val DEPTH_BRANCH_IDS: List<String> = listOf(
        "branch.fisher.trophy_cast",
        "branch.fisher.line_pro",
        "branch.porter.dock_relay",
        "branch.porter.cargo_sprint",
        "branch.cashier.quick_till",
    )

    val DECISION_REASONS: List<String> = listOf(
        "trophy_cast_bias",
        "line_pro_stock",
        "dock_relay",
        "cargo_sprint_urgency",
        "quick_till_queue",
    )

    val TS_MARKERS: List<String> = listOf(
        "trophy_cast",
        "trophy_cast_bias",
        "FISHER_TROPHY_CASTS",
        "TROPHY_CAST_RARE_WEIGHT_MAX",
        "line_pro",
        "line_pro_stock",
        "dock_relay",
        "PORTER_RELAY_PICKUPS",
        "cargo_sprint",
        "cargo_sprint_urgency",
        "quick_till",
        "quick_till_queue",
        "CASHIER_QUICK_TILLS",
    )

    val KOTLIN_MARKERS: List<String> = listOf(
        "trophy_cast",
        "trophy_cast_bias",
        "FISHER_TROPHY_CASTS",
        "TROPHY_CAST_RARE_WEIGHT_MAX",
        "line_pro",
        "line_pro_stock",
        "dock_relay",
        "PORTER_RELAY_PICKUPS",
        "cargo_sprint",
        "cargo_sprint_urgency",
        "quick_till",
        "quick_till_queue",
        "CASHIER_QUICK_TILLS",
    )
}
