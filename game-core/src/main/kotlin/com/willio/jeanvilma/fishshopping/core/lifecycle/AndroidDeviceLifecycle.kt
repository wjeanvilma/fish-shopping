package com.willio.jeanvilma.fishshopping.core.lifecycle

/**
 * Phase 13 (post-1.0) — Android device lifecycle QA matrix against Phase 28 catalog.
 * Mirrors `shared/lifecycle/android-device-matrix.json`.
 */
object AndroidDeviceLifecycle {
    const val PHASE = 13
    const val SCHEMA = "fish.lifecycle.android_device_matrix.v1"
    const val CATALOG = "shared/lifecycle/android-device-matrix.json"
    const val PHASE28_CATALOG = "shared/lifecycle/browser-lifecycle.json"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val ACTIVITY = "com.willio.jeanvilma.fishshopping.MainActivity"

    /** ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW == 10 */
    const val TRIM_MEMORY_CHECKPOINT_FROM = 10

    val DEVICE_CLASS_IDS: List<String> = listOf("phone", "tablet7", "tablet10")

    val SCENARIO_IDS: List<String> = listOf(
        "background",
        "resume",
        "rotate",
        "process_death",
        "low_memory",
    )

    val RESTORE_SLOTS: List<String> = listOf(
        "harbor_save_latest.json",
        "harbor_save_previous.json",
    )

    fun shouldCheckpointForTrimLevel(level: Int): Boolean =
        level >= TRIM_MEMORY_CHECKPOINT_FROM

    fun deviceClassForWidthDp(widthDp: Int): String = when {
        widthDp < 600 -> "phone"
        widthDp < 840 -> "tablet7"
        else -> "tablet10"
    }
}
