package com.willio.jeanvilma.fishshopping.core.a11y

/**
 * Finish 5.0 Phase 24 — accessibility depth 4 screen / live-region IDs
 * (mirrors shared/a11y/accessibility-depth-4.json).
 */
object AccessibilityDepth4 {
    const val PHASE = 24
    const val SCHEMA = "fish.a11y.accessibility_depth_4.v1"
    const val SCREEN_SURFACE_MIN = 5
    const val CONTRAST_PAIR_MIN = 2
    const val LIVE_REGION_MIN = 2

    val SCREEN_IDS = listOf(
        "goals_weekly",
        "goals_endgame",
        "dashboard_ledger",
        "warehouse_stock",
        "tutorial_friction",
    )

    val LIVE_REGIONS = listOf("tutorial_friction", "goals_weekly")

    val CONTRAST_PAIR_IDS = listOf("deep_ink_on_surface", "action_ink_on_surface")
}