package com.willio.jeanvilma.fishshopping.core.lifecycle

/**
 * Phase 14 (post-1.0) — browser QA matrix (Chrome / Safari / Firefox) mirroring
 * `shared/lifecycle/browser-matrix.json`. Web host implements the gates; Kotlin
 * keeps the shared contract for CI parity.
 */
object BrowserMatrix {
    const val PHASE = 14
    const val SCHEMA = "fish.lifecycle.browser_matrix.v1"
    const val CATALOG = "shared/lifecycle/browser-matrix.json"
    const val PHASE28_CATALOG = "shared/lifecycle/browser-lifecycle.json"

    val BROWSER_IDS: List<String> = listOf("chrome", "firefox", "safari")

    val SCENARIO_IDS: List<String> = listOf(
        "webgl2_gate",
        "context_loss",
        "storage_quota",
        "audio_unlock",
    )

    val AUDIO_UNLOCK_EVENTS: List<String> = listOf("pointerdown", "keydown", "touchstart")

    const val WEBGL2_REQUIRED = true
    const val STORAGE_FALLBACK = "memory"

    val QUOTA_ERROR_NAMES: List<String> = listOf(
        "QuotaExceededError",
        "NS_ERROR_DOM_QUOTA_REACHED",
    )

    fun isQuotaErrorName(name: String?): Boolean =
        name != null && name in QUOTA_ERROR_NAMES
}
