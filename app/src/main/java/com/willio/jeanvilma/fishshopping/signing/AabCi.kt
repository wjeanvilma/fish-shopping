package com.willio.jeanvilma.fishshopping.signing

/**
 * Phase 5 (post-1.0) — AAB CI artifact catalog
 * (mirrors shared/android/aab-ci.json).
 */
object AabCi {
    const val PHASE = 5
    const val SCHEMA = "fish.android.aab_ci.v1"
    const val RELEASE_PIN = "shared/fixtures/RELEASE_PIN.json"
    const val GRADLE_TASK = ":app:bundleRelease"
    const val FALLBACK_TASK = ":app:assembleDebug"
    const val AAB_PATH = "app/build/outputs/bundle/release/app-release.aab"
    const val MAPPING_PATH = "app/build/outputs/mapping/release/mapping.txt"
    const val ARTIFACT_UPLOAD_NAME = "android-release-aab"
    const val CI_JOB = "android-release"
    const val VERSION_NAME_FIELD = "versionName"
    const val VERSION_CODE_FIELD = "versionCode"
}
