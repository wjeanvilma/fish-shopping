package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 29 — store listing + legal URL constants mirroring `shared/store/listing.json`.
 * Android Settings opens Privacy / Support; Play Console copy is validated in tests.
 */
object StoreListing {
    const val PHASE = 29
    const val SCHEMA = "fish.store.listing.v1"
    const val APP_NAME = "Fish Shopping"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val SHORT_DESCRIPTION = "Catch, cut, and sell fish in a cozy 3D harbor market."
    const val CANONICAL_HOST = "https://willio.github.io/FishShopping"
    const val SUPPORT_URL = "https://willio.github.io/FishShopping/support.html"
    const val PRIVACY_POLICY_URL = "https://willio.github.io/FishShopping/privacy.html"
    const val LICENSES_PATH = "shared/store/licenses.json"
    const val FEATURE_GRAPHIC_PNG = "shared/store/feature-graphic.png"
    const val WEB_LANDING_TAGLINE = "Catch, cut, sell — run your harbor market"

    val SCREENSHOT_IDS: List<String> = listOf(
        "title",
        "pier_cast",
        "cutter_transfers",
        "counter_service",
        "panels",
        "map_travel",
        "rush_hour",
    )

    fun isHttpsAbsoluteUrl(url: String): Boolean =
        url.trim().startsWith("https://") && url.trim().none { it.isWhitespace() }
}
