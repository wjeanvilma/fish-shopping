package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 10 — staff unlock ship contracts from
 * `shared/ship/staff-unlock.json`.
 */
object StaffUnlock {
    const val PHASE = 10
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.staff_unlock.v1"
    const val CATALOG = "shared/ship/staff-unlock.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-staff-unlock.json"
    const val MARKER = "authored-finish-3.0-phase-10"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val STAFF_TREES_CATALOG = "shared/ship/staff-trees.json"
    const val HIREABLE_ROLE_COUNT = 8
    const val STAFF_BRANCH_TARGET = 10
    const val GAP_FLAG_CLOSED = "staffComingSoonPresent"
    const val GAP_COMING_SOON_REASONS = 0
    const val VALIDATE_SCRIPT = "staffunlock:validate"

    val NEW_BRANCH_IDS: List<String> = listOf(
        "branch.operator.pad_link",
        "branch.supervisor.floor_lead",
        "branch.ice_runner.chill_haul",
        "branch.smoker_specialist.kiln_focus",
        "branch.greeter.welcome_desk",
    )

    val HIREABLE_ROLES: List<String> = listOf(
        "fisher",
        "porter",
        "operator",
        "cashier",
        "supervisor",
        "ice_runner",
        "smoker_specialist",
        "greeter",
    )
}
