package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 18 — cosmetics/IAP 12→18 power-neutral ship constants
 * (mirrors shared/ship/cosmetics-iap-4.json).
 */
object Cosmetics4 {
    const val PHASE = 18
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.cosmetics_iap_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val COSMETICS_4_MARKER = "authored-finish-4.0-phase-18"
    const val CATALOG = "shared/ship/cosmetics-iap-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-cosmetics-iap-4.json"
    const val COSMETICS_MIN = 18
    const val SIM_HZ_INVARIANT = 20

    val NEW_COSMETIC_IDS: List<String> = listOf(
        "banner.iap_mist_bunting",
        "banner.iap_prism_pennant",
        "banner.iap_plaza_flag",
        "banner.iap_rime_streamer",
        "banner.iap_brine_ribbon",
        "banner.iap_aurora_crest",
    )

    val NEW_SKUS: List<String> = listOf(
        "fish.cosmetic.mist_bunting",
        "fish.cosmetic.prism_pennant",
        "fish.cosmetic.plaza_flag",
        "fish.cosmetic.rime_streamer",
        "fish.cosmetic.brine_ribbon",
        "fish.cosmetic.aurora_crest",
    )
}
