package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 16 — seasonal→12, baits→12, mastery depth ship constants
 * (mirrors shared/ship/seasonal-bait-4.json).
 */
object SeasonalBait4 {
    const val PHASE = 16
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.seasonal_bait_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 24
    const val SEASONAL_BAIT_4_MARKER = "authored-finish-4.0-phase-16"
    const val CATALOG = "shared/ship/seasonal-bait-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-seasonal-bait-4.json"
    const val SEASONAL_EVENTS_MIN = 12
    const val BAITS_MIN = 12
    const val MASTERY_MAX_LEVEL = 7
    const val MASTERY_TECHNIQUES_MIN = 6
    const val MASTERY_COACHING_TIPS_MIN = 8
    const val SIM_HZ_INVARIANT = 20

    val NEW_EVENTS: List<String> = listOf(
        "event.mist_fog_festival",
        "event.prism_light_fair",
        "event.plaza_tuna_week",
        "event.rime_aurora_vigil",
    )

    val NEW_BAITS: List<String> = listOf(
        "bait.mist_morsel",
        "bait.prism_flake",
        "bait.plaza_cutlet",
        "bait.rime_crystal",
    )

    val NEW_TECHNIQUES: List<String> = listOf(
        "technique.pulse_jig",
        "technique.harbor_cast",
        "technique.legend_set",
    )

    val NEW_COACHING_TIPS: List<String> = listOf(
        "tip.mastery.pulse_jig",
        "tip.mastery.harbor_cast",
        "tip.mastery.legend_set",
    )
}
