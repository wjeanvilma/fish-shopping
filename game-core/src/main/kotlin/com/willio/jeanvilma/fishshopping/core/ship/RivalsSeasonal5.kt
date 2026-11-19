package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 18 — rivals/seasonal/baits/cosmetics growth ship constants
 * (mirrors shared/ship/rivals-seasonal-5.json).
 */
object RivalsSeasonal5 {
    const val PHASE = 18
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.rivals_seasonal_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val RIVALS_SEASONAL_5_MARKER = "authored-finish-5.0-phase-18"
    const val CATALOG = "shared/ship/rivals-seasonal-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-rivals-seasonal-5.json"
    const val RIVALS_MIN = 16
    const val SEASONAL_EVENTS_MIN = 16
    const val BAITS_MIN = 16
    const val COSMETICS_MIN = 24
    const val PERIOD_TICKS = 21000
    const val SIM_HZ_INVARIANT = 20

    val NEW_RIVAL_IDS: List<String> = listOf(
        "rival.aurora_hawker",
        "rival.tideglass_trader",
        "rival.northern_roamer",
        "rival.glass_syndicate",
    )

    val NEW_EVENT_IDS: List<String> = listOf(
        "event.aurora_inlet_lights",
        "event.tideglass_mirror_fair",
        "event.poach_pantry_week",
        "event.can_circuit_carnival",
    )

    val NEW_BAIT_IDS: List<String> = listOf(
        "bait.aurora_nibble",
        "bait.tideglass_flake",
        "bait.poach_paste",
        "bait.can_spark",
    )

    val NEW_COSMETIC_IDS: List<String> = listOf(
        "banner.iap_aurora_bunting",
        "banner.iap_tideglass_pennant",
        "banner.iap_inlet_flag",
        "banner.iap_bay_streamer",
        "banner.iap_poach_ribbon",
        "banner.iap_can_crest",
    )
}
