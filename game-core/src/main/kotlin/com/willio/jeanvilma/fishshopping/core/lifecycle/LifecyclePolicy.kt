package com.willio.jeanvilma.fishshopping.core.lifecycle

/**
 * Phase 28 — browser / Android lifecycle policy constants mirroring
 * `shared/lifecycle/browser-lifecycle.json`. Hosts wire these; sim stays 20 Hz.
 */
object LifecyclePolicy {
    const val PHASE = 28
    const val SCHEMA = "fish.lifecycle.browser_android.v1"
    const val CURRENT_SCHEMA = 20
    const val MIGRATE_THROUGH_SCHEMA = 19

    val LEGACY_FIXTURE_VERSIONS: IntArray = intArrayOf(1, 12, 13, 14, 15, 16, 17, 18, 19)

    const val WEBGL2_GATE_COPY =
        "Fish Shopping needs a browser with WebGL 2. Try a current version of Chrome, Firefox, Edge or Safari, and make sure hardware acceleration is turned on."

    const val CONTEXT_LOSS_BANNER = "Graphics context lost — recovering scene…"

    const val STORAGE_UNAVAILABLE_TOAST = "Saving is unavailable in this browser window"

    const val STORAGE_UNAVAILABLE_SETTINGS = "Memory-only (storage unavailable)."

    fun shouldPauseForVisibility(hidden: Boolean): Boolean = hidden

    fun shouldCheckpointOnPageHide(): Boolean = true

    fun shouldSuspendAudioWhenHidden(hidden: Boolean): Boolean = hidden

    val ANDROID_CONFIG_CHANGES: List<String> = listOf(
        "orientation",
        "screenSize",
        "screenLayout",
        "smallestScreenSize",
        "keyboardHidden",
    )

    const val ANDROID_SCREEN_ORIENTATION = "fullSensor"

    const val AUDIO_FOCUS_USAGE = "USAGE_GAME"
    const val AUDIO_FOCUS_GAIN = "AUDIOFOCUS_GAIN"
}
