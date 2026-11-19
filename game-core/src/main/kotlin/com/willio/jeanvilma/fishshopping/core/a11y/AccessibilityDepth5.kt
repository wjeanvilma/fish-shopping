package com.willio.jeanvilma.fishshopping.core.a11y

/**
 * Finish 6.0 Phase 22 — accessibility depth 5 screen / live-region IDs
 * (mirrors shared/a11y/accessibility-depth-5.json).
 */
object AccessibilityDepth5 {
    const val PHASE = 22
    const val SCHEMA = "fish.a11y.accessibility_depth_5.v1"
    const val SCREEN_SURFACE_MIN = 6
    const val CONTRAST_PAIR_MIN = 3
    const val LIVE_REGION_MIN = 3

    val SCREEN_IDS = listOf(
        "nest_treasury",
        "nest_conflict",
        "nest_loans",
        "offline_nest_journal",
        "staff_branch_schedule",
        "roast_friction",
    )

    val LIVE_REGIONS = listOf(
        "nest_conflict",
        "offline_nest_journal",
        "roast_friction",
    )

    val CONTRAST_PAIR_IDS = listOf(
        "nest_ember_on_surface",
        "saffron_on_surface",
        "deep_ink_on_nest_fog",
    )
}
