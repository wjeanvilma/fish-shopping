package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 11 — worker AI depth ship contracts from
 * `shared/ship/worker-ai-depth.json`.
 */
object WorkerAiDepth {
    const val PHASE = 11
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.worker_ai_depth.v1"
    const val CATALOG = "shared/ship/worker-ai-depth.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-worker-ai-depth.json"
    const val MARKER = "authored-finish-3.0-phase-11"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 23

    const val STAFF_UNLOCK_CATALOG = "shared/ship/staff-unlock.json"
    const val STAFF_TREES_CATALOG = "shared/ship/staff-trees.json"
    const val VALIDATE_SCRIPT = "workerai:validate"
    const val DEPTH_BEHAVIOR_COUNT = 5
    const val DEPTH_STAT_COUNT = 3

    val DEPTH_STATS: List<String> = listOf(
        "stat.supervisor_patrols",
        "stat.greeter_welcomes",
        "stat.ice_runner_multi_pickups",
    )

    val DEPTH_BRANCH_IDS: List<String> = listOf(
        "branch.supervisor.floor_lead",
        "branch.greeter.welcome_desk",
        "branch.ice_runner.chill_haul",
        "branch.smoker_specialist.kiln_focus",
        "branch.operator.pad_link",
    )

    val TS_MARKERS: List<String> = listOf(
        "supervisorPatrol",
        "bestSupervisorPost",
        "greeterWelcomePulse",
        "pickupIceRunner",
        "kilnFocus",
        "pad_link",
        "SUPERVISOR_PATROLS",
        "GREETER_WELCOMES",
        "ICE_RUNNER_MULTI_PICKUPS",
    )

    val KOTLIN_MARKERS: List<String> = listOf(
        "supervisorPatrol",
        "bestSupervisorPost",
        "greeterWelcomePulse",
        "pickupIceRunner",
        "kilnFocus",
        "pad_link",
        "SUPERVISOR_PATROLS",
        "GREETER_WELCOMES",
        "ICE_RUNNER_MULTI_PICKUPS",
    )
}
