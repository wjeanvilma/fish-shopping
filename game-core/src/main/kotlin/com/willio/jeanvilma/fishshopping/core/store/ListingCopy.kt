package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 11 (post-1.0) — frozen Play / web listing copy from
 * `shared/store/listing-copy.json` + `shared/store/locales/en.json`.
 */
object ListingCopy {
    const val PHASE = 11
    const val SCHEMA = "fish.store.listing_copy.v1"
    const val CATALOG = "shared/store/listing-copy.json"
    const val LOCALES_DIR = "shared/store/locales"
    const val DEFAULT_LOCALE = "en"
    const val EN_LOCALE_PATH = "shared/store/locales/en.json"
    const val ANDROID_STRINGS = "app/src/main/res/values/strings.xml"
    const val FROZEN = true

    const val TITLE_MAX = 50
    const val SHORT_DESCRIPTION_MAX = 80
    const val FULL_DESCRIPTION_MAX = 4000
    const val WHATS_NEW_MAX = 500

    const val TITLE = "Fish Shopping"
    const val SHORT_DESCRIPTION = "Catch, cut, and sell fish in a cozy 3D harbor market."
    const val FULL_DESCRIPTION =
        "Run your own waterfront fish market. Cast from the pier, process catches on the cutter, " +
            "stock the counter, and serve a growing crowd. Hire staff, unlock upgrades, take delivery " +
            "contracts, and expand to new harbors — all with a fixed 20 Hz simulation shared by Android and web.\n\n" +
            "First session loop: fish → cut → stock → sell.\n\n" +
            "Optional cloud sync and privacy-safe analytics are off until you opt in. One-time harbor unlock " +
            "and power-neutral cosmetics are available via in-app purchase; Restore purchases recovers " +
            "entitlements on a new device."
    const val WHATS_NEW =
        "1.0.1 balance pass — cheaper early bag upgrade and first hires, slightly better portion prices, " +
            "faster staff XP. Schema unchanged; 1.0.0 saves still load."
    const val WHATS_NEW_VERSION = "1.0.1"
    const val WEB_TAGLINE = "Catch, cut, sell — run your harbor market"

    val LOCALES: List<String> = listOf("en")

    fun withinPlayLimits(title: String, short: String, full: String, whatsNew: String): Boolean =
        title.length in 1..TITLE_MAX &&
            short.length in 1..SHORT_DESCRIPTION_MAX &&
            full.length in 1..FULL_DESCRIPTION_MAX &&
            whatsNew.length in 1..WHATS_NEW_MAX
}
