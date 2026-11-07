package com.willio.jeanvilma.fishshopping.core.a11y

import kotlin.math.pow

/**
 * Phase 16 (post-1.0) — accessibility & controls sweep contracts from
 * `shared/a11y/accessibility-sweep.json`. Presentation-only.
 */
object AccessibilitySweep {
    const val PHASE = 16
    const val SCHEMA = "fish.a11y.accessibility_sweep.v1"
    const val CATALOG = "shared/a11y/accessibility-sweep.json"
    const val MIN_TOUCH_TARGET_DP = 48
    const val WCAG_NORMAL_TEXT = 4.5
    const val WCAG_LARGE_OR_UI = 3.0

    const val INK = "#153449"
    const val ACTION = "#008F95"
    const val REWARD = "#E8AF4A"
    const val SURFACE = "#FBF7EF"
    const val SURFACE_MUTED = "#EFE8DA"
    const val ON_ACTION = "#FFFFFF"
    const val DANGER = "#B3412E"

    const val JOYSTICK_CONTENT_DESCRIPTION = "Movement joystick"
    const val HARBOR_ARIA_LABEL = "Harbor"

    data class ContrastPair(
        val id: String,
        val fg: String,
        val bg: String,
        val minRatio: Double,
    )

    val CONTRAST_PAIRS: List<ContrastPair> = listOf(
        ContrastPair("ink_on_surface", INK, SURFACE, WCAG_NORMAL_TEXT),
        ContrastPair("ink_on_surface_muted", INK, SURFACE_MUTED, WCAG_NORMAL_TEXT),
        ContrastPair("danger_on_surface", DANGER, SURFACE, WCAG_NORMAL_TEXT),
        ContrastPair("on_action_on_action", ON_ACTION, ACTION, WCAG_LARGE_OR_UI),
        ContrastPair("ghost_ink_on_surface", INK, SURFACE, WCAG_NORMAL_TEXT),
        ContrastPair("reward_on_ink", REWARD, INK, WCAG_LARGE_OR_UI),
    )

    val REQUIRED_KEYBOARD_ACTIONS: List<String> = listOf(
        "Move",
        "Reel",
        "Pause",
        "Close panel / pause",
        "Map",
        "Upgrades",
        "Staff",
        "Goals",
        "Jobs",
        "Warehouse",
        "Dashboard",
        "Species book",
        "Cycle recipe",
    )

    fun relativeLuminance(hex: String): Double {
        val h = hex.trim().removePrefix("#")
        require(h.length == 6) { "bad hex $hex" }
        fun chan(i: Int): Double {
            val c = h.substring(i, i + 2).toInt(16) / 255.0
            return if (c <= 0.04045) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
        }
        val r = chan(0)
        val g = chan(2)
        val b = chan(4)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    fun contrastRatio(fgHex: String, bgHex: String): Double {
        val a = relativeLuminance(fgHex)
        val b = relativeLuminance(bgHex)
        val hi = maxOf(a, b)
        val lo = minOf(a, b)
        return (hi + 0.05) / (lo + 0.05)
    }

    fun pairPasses(pair: ContrastPair): Boolean =
        contrastRatio(pair.fg, pair.bg) + 1e-6 >= pair.minRatio

    fun failingPairs(): List<ContrastPair> = CONTRAST_PAIRS.filterNot { pairPasses(it) }
}
