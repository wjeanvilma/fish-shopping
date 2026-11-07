package com.willio.jeanvilma.fishshopping.core.a11y

import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth

/**
 * Finish 2.0 Phase 24 — accessibility depth constants
 * (mirrors shared/a11y/accessibility-depth.json screen + live region ids).
 */
object AccessibilityDepth {
    const val PHASE = A11yDepth.PHASE
    const val SCHEMA = "fish.a11y.accessibility_depth.v1"
    const val CATALOG = A11yDepth.DEPTH_CATALOG
    const val EXTENDS_CATALOG = A11yDepth.EXTENDS_CATALOG
    const val SIM_HZ_INVARIANT = A11yDepth.SIM_HZ_INVARIANT

    val SCREEN_IDS = listOf(
        "achievements",
        "species_journal",
        "species_detail",
        "goals_daily_festival",
        "contracts_jobs",
        "staff_branches",
        "bag_mastery",
        "settings_language",
        "hud_weather_tide",
    )

    val LIVE_REGIONS = listOf(
        "achievement_toast",
        "weather_tide",
        "festival_hud",
    )

    val CONTRAST_PAIR_IDS = listOf(
        "seasonal_banner_text",
        "balance_strip_text",
        "muted_ink_on_surface",
        "reward_text_on_surface",
        "action_eyebrow_on_surface",
    )
}
