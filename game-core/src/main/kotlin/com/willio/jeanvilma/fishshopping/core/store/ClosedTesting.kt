package com.willio.jeanvilma.fishshopping.core.store

/**
 * Phase 17 (post-1.0) — Play closed/internal testing track contracts from
 * `shared/android/closed-testing.json`. Upload is manual via Play Console;
 * CI produces the AAB + mapping artifacts.
 */
object ClosedTesting {
    const val PHASE = 17
    const val SCHEMA = "fish.android.closed_testing.v1"
    const val CATALOG = "shared/android/closed-testing.json"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"

    const val PRIMARY_TRACK = "internal"
    const val SECONDARY_TRACK = "closed"
    const val CRASH_PROVIDER = "play_console_android_vitals"
    const val SIGNOFF_STATUS = "ready_for_upload"
    const val CI_JOB = "android-release"
    const val CI_ARTIFACT = "android-release-aab"

    val PREFLIGHT_GATES: List<String> = listOf(
        "shared/android/aab-ci.json",
        "shared/android/release-signing.json",
        "shared/fixtures/RELEASE_PIN.json",
        "shared/store/listing-copy.json",
        "shared/store/data-safety.json",
        "shared/store/licenses.json",
        "shared/billing/play-console-products.json",
        "shared/lifecycle/android-device-matrix.json",
        "shared/a11y/accessibility-sweep.json",
        "shared/perf/budget-gate.json",
    )

    val SIGNOFF_STATUS_VALUES: List<String> = listOf(
        "ready_for_upload",
        "uploaded_internal",
        "testers_invited",
        "vitals_triaged",
        "signed_off",
    )

    fun isKnownSignoffStatus(status: String): Boolean = status in SIGNOFF_STATUS_VALUES
}
