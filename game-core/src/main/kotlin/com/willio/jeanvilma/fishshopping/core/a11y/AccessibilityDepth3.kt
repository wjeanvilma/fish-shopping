package com.willio.jeanvilma.fishshopping.core.a11y

/**
 * Finish 4.0 Phase 24 — accessibility depth 3 screen / live-region IDs
 * (mirrors shared/a11y/accessibility-depth-3.json).
 */
object AccessibilityDepth3 {
    const val PHASE = 24
    const val SCHEMA = "fish.a11y.accessibility_depth_3.v1"
    const val SCREEN_SURFACE_MIN = 5
    const val CONTRAST_PAIR_MIN = 2
    const val LIVE_REGION_MIN = 2

    val SCREEN_IDS = listOf(
        "offline_summary",
        "upgrades_panel",
        "settings_licenses",
        "cloud_conflict",
        "staff_training",
    )

    val LIVE_REGIONS = listOf("offline_summary", "cloud_conflict")

    val CONTRAST_PAIR_IDS = listOf("light_ink_on_surface", "light_focus_on_surface")
}
