package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 18 (post-1.0) — public Play production + web 1.0 release contracts from
 * `shared/ship/public-ship.json`. Promote/tag/deploy stay manual; CI builds AAB + web dist.
 */
object PublicShip {
    const val PHASE = 18
    const val SCHEMA = "fish.ship.public_ship.v1"
    const val CATALOG = "shared/ship/public-ship.json"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val RELEASE_TAG = "v1.0.0-store"
    const val ANDROID_TRACK = "production"
    const val PROMOTE_FROM = "closed"
    const val WEB_CI_JOB = "web-release"
    const val WEB_CI_ARTIFACT = "web-release-dist"
    const val ANDROID_CI_JOB = "android-release"
    const val HASH_ALGORITHM = "sha256"
    const val SIGNOFF_STATUS = "ready_for_production"
    const val CONTENT_VERSION = "1.0.0"
    const val SCHEMA_VERSION = 20

    val PREFLIGHT_GATES: List<String> = listOf(
        "shared/android/closed-testing.json",
        "shared/android/aab-ci.json",
        "shared/android/release-signing.json",
        "shared/fixtures/RELEASE_PIN.json",
        "shared/store/listing.json",
        "shared/store/listing-copy.json",
        "shared/store/data-safety.json",
        "shared/store/legal-pages.json",
        "shared/store/licenses.json",
        "shared/store/icon-pack.json",
        "shared/store/screenshot-capture.json",
        "shared/billing/play-console-products.json",
        "shared/lifecycle/android-device-matrix.json",
        "shared/a11y/accessibility-sweep.json",
        "shared/perf/budget-gate.json",
        "shared/ship/definition-of-done.json",
    )

    val HASH_INPUT_FILES: List<String> = listOf(
        "shared/billing/entitlements.json",
        "shared/store/listing.json",
        "shared/store/listing-copy.json",
        "shared/store/data-safety.json",
        "shared/store/legal-pages.json",
        "shared/android/closed-testing.json",
        "shared/android/aab-ci.json",
        "shared/android/release-signing.json",
        "shared/ship/public-ship.json",
        "shared/ship/definition-of-done.json",
    )

    val SIGNOFF_STATUS_VALUES: List<String> = listOf(
        "ready_for_production",
        "aab_promoted",
        "web_built",
        "tag_cut",
        "live",
    )

    fun isKnownSignoffStatus(status: String): Boolean = status in SIGNOFF_STATUS_VALUES
}
