package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 14 — harbors 11–12 contracts from
 * `shared/ship/harbors-11-12.json`.
 */
object Harbors1112 {
    const val PHASE = 14
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.harbors_11_12.v1"
    const val CATALOG = "shared/ship/harbors-11-12.json"
    const val HARBOR_COUNT = 12
    const val NEW_HARBOR_COUNT = 2
    const val TRAVEL_FIXTURE = "shared/fixtures/parity-harbors-11-12.json"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 25
    const val MARKER = "authored-finish-5.0-phase-14"
    const val VALIDATE_SCRIPT = "harbors1112:validate"

    val NEW_HARBOR_IDS: List<String> = listOf(
        "harbor.aurora_inlet",
        "harbor.tideglass_bay",
    )

    val CIRCUIT_PRESTIGE: List<String> = listOf(
        "prestige.eleven_harbors",
        "prestige.twelve_harbors",
    )

    val LANDING_QUESTS: List<String> = listOf(
        "quest.aurora_inlet_landing",
        "quest.tideglass_bay_landing",
    )

    fun harborsEnough(count: Int, target: Int = HARBOR_COUNT): Boolean = count >= target
}
