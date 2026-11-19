package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 15 — rivals/seasonal/baits/cosmetics growth
 * (mirrors shared/ship/rivals-seasonal-6.json).
 */
object RivalsSeasonal6 {
    const val PHASE = 15
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.rivals_seasonal_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val RIVALS_SEASONAL_6_MARKER = "authored-finish-6.0-phase-15"
    const val CATALOG = "shared/ship/rivals-seasonal-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-rivals-seasonal-6.json"
    const val RIVALS_MIN = 20
    const val SEASONAL_EVENTS_MIN = 20
    const val BAITS_MIN = 20
    const val COSMETICS_MIN = 30
    const val PERIOD_TICKS = 25_200
    const val SIM_HZ_INVARIANT = 20

    val NEW_RIVAL_IDS: List<String> = listOf(
        "rival.saffron_hawker",
        "rival.cobalt_trader",
        "rival.nest_roamer",
        "rival.covenant_syndicate",
    )

    val NEW_EVENT_IDS: List<String> = listOf(
        "event.saffron_quay_ember_fair",
        "event.cobalt_sound_rime_vigil",
        "event.roast_nest_week",
        "event.ferment_covenant_carnival",
    )

    val NEW_BAIT_IDS: List<String> = listOf(
        "bait.saffron_nibble",
        "bait.cobalt_flake",
        "bait.roast_paste",
        "bait.ferment_spark",
    )

    val NEW_COSMETIC_IDS: List<String> = listOf(
        "banner.iap_saffron_bunting",
        "banner.iap_cobalt_pennant",
        "banner.iap_quay_flag",
        "banner.iap_sound_streamer",
        "banner.iap_roast_ribbon",
        "banner.iap_ferment_crest",
    )
}
