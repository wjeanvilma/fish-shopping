package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 7 — harbors 13–14 contracts from
 * `shared/ship/harbors-13-14.json`.
 */
object Harbors1314 {
    const val PHASE = 7
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.harbors_13_14.v1"
    const val CATALOG = "shared/ship/harbors-13-14.json"
    const val HARBOR_COUNT = 14
    const val NEW_HARBOR_COUNT = 2
    const val TRAVEL_FIXTURE = "shared/fixtures/parity-harbors-13-14.json"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 26
    const val MARKER = "authored-finish-6.0-phase-7"
    const val VALIDATE_SCRIPT = "harbors1314:validate"

    val NEW_HARBOR_IDS: List<String> = listOf(
        "harbor.saffron_quay",
        "harbor.cobalt_sound",
    )

    val CIRCUIT_PRESTIGE: List<String> = listOf(
        "prestige.thirteen_harbors",
        "prestige.fourteen_harbors",
    )

    val LANDING_QUESTS: List<String> = listOf(
        "quest.saffron_quay_landing",
        "quest.cobalt_sound_landing",
    )

    fun harborsEnough(count: Int, target: Int = HARBOR_COUNT): Boolean = count >= target
}
