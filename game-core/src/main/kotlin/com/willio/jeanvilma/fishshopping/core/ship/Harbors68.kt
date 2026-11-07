package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 8 — harbors 6–8 contracts from
 * `shared/ship/harbors-6-8.json`.
 */
object Harbors68 {
    const val PHASE = 8
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.harbors_6_8.v1"
    const val CATALOG = "shared/ship/harbors-6-8.json"
    const val HARBOR_COUNT = 8
    const val TRAVEL_FIXTURE = "shared/fixtures/parity-harbors-6-8.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21

    val NEW_HARBOR_IDS: List<String> = listOf(
        "harbor.coral_lagoon",
        "harbor.storm_quay",
        "harbor.ember_wharf",
    )

    val CIRCUIT_PRESTIGE: List<String> = listOf(
        "prestige.six_harbors",
        "prestige.seven_harbors",
        "prestige.eight_harbors",
    )

    val LANDING_QUESTS: List<String> = listOf(
        "quest.coral_lagoon_landing",
        "quest.storm_quay_landing",
        "quest.ember_wharf_landing",
    )
}
