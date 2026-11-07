package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 15 — staff specialization trees ship constants
 * (mirrors shared/ship/staff-trees.json).
 */
object StaffTrees {
    const val PHASE = 15
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.staff_trees.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val BRANCH_COUNT = 5
    const val SCHEDULE_COUNT = 2
    const val ROOT_BRANCH_COUNT = 3
    const val PARITY_FIXTURE = "shared/fixtures/parity-staff-trees.json"
    const val CATALOG = "shared/ship/staff-trees.json"

    val BRANCH_IDS = listOf(
        "branch.fisher.line_pro",
        "branch.fisher.trophy_cast",
        "branch.porter.cargo_sprint",
        "branch.porter.dock_relay",
        "branch.cashier.quick_till",
    )

    val SCHEDULE_IDS = listOf(
        "schedule.dawn_crew",
        "schedule.night_watch",
    )
}
