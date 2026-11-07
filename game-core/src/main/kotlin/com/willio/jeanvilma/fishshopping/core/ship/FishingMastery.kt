package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 14 — fishing mastery ship constants
 * (mirrors shared/ship/fishing-mastery.json).
 */
object FishingMastery {
    const val PHASE = 14
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.fishing_mastery.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 22
    const val MAX_LEVEL = 5
    const val TECHNIQUE_COUNT = 3
    const val COACHING_TIP_COUNT = 5
    const val PARITY_FIXTURE = "shared/fixtures/parity-fishing-mastery.json"
    const val CATALOG = "shared/ship/fishing-mastery.json"

    val TECHNIQUE_IDS = listOf(
        "technique.steady_reel",
        "technique.power_set",
        "technique.patient_drift",
    )

    val COACHING_TIP_IDS = listOf(
        "tip.mastery.first_catch",
        "tip.mastery.level_one",
        "tip.mastery.power_set",
        "tip.mastery.journal",
        "tip.mastery.patient_drift",
    )
}
