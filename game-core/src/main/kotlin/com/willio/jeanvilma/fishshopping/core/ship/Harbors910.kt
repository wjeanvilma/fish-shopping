package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 12 — harbors 9–10 contracts from
 * `shared/ship/harbors-9-10.json`.
 */
object Harbors910 {
    const val PHASE = 12
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.harbors_9_10.v1"
    const val CATALOG = "shared/ship/harbors-9-10.json"
    const val HARBOR_COUNT = 10
    const val NEW_HARBOR_COUNT = 2
    const val TRAVEL_FIXTURE = "shared/fixtures/parity-harbors-9-10.json"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24
    const val MARKER = "authored-finish-4.0-phase-12"
    const val VALIDATE_SCRIPT = "harbors910:validate"

    val NEW_HARBOR_IDS: List<String> = listOf(
        "harbor.mist_cove",
        "harbor.prism_reach",
    )

    val CIRCUIT_PRESTIGE: List<String> = listOf(
        "prestige.nine_harbors",
        "prestige.ten_harbors",
    )

    val LANDING_QUESTS: List<String> = listOf(
        "quest.mist_cove_landing",
        "quest.prism_reach_landing",
    )

    fun harborsEnough(count: Int, target: Int = HARBOR_COUNT): Boolean = count >= target
}
