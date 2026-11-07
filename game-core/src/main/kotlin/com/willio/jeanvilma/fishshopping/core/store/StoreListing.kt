package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 29 listing + Phase 7 (post-1.0) published GitHub Pages legal URLs.
 * Mirrors `shared/store/listing.json`. Android Settings opens Privacy / Support.
 */
object StoreListing {
    const val PHASE = 29
    const val SCHEMA = "fish.store.listing.v1"
    const val LEGAL_PAGES_PHASE = 7
    const val APP_NAME = "Fish Shopping"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val SHORT_DESCRIPTION = "Catch, cut, and sell fish in a cozy 3D harbor market."
    const val CANONICAL_HOST = "https://wjeanvilma.github.io/fish-shopping"
    const val LANDING_URL = "https://wjeanvilma.github.io/fish-shopping/"
    const val SUPPORT_URL = "https://wjeanvilma.github.io/fish-shopping/support.html"
    const val PRIVACY_POLICY_URL = "https://wjeanvilma.github.io/fish-shopping/privacy.html"
    const val LICENSES_PATH = "shared/store/licenses.json"
    const val FEATURE_GRAPHIC_PNG = "shared/store/feature-graphic.png"
    const val WEB_LANDING_TAGLINE = "Catch, cut, sell — run your harbor market"
    const val LEGAL_PAGES_CATALOG = "shared/store/legal-pages.json"

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
