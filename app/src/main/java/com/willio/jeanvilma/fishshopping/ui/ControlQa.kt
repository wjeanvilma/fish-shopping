package com.willio.jeanvilma.fishshopping.ui

import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.ui.hud.TAP_ARRIVE_MM

/**
 * Phase 20 — touch & desktop control QA contracts (presentation-only).
 * Blueprint min touch target is 48dp; HUD owns essential copy (not world textures).
 */
object ControlQa {
    const val MIN_TOUCH_TARGET_DP = 48

    data class KeyboardShortcut(val keys: List<String>, val action: String)

    val KEYBOARD_SHORTCUTS: List<KeyboardShortcut> = listOf(
        KeyboardShortcut(listOf("W", "A", "S", "D"), "Move"),
        KeyboardShortcut(listOf("↑", "↓", "←", "→"), "Move"),
        KeyboardShortcut(listOf("F", "Space"), "Reel"),
        KeyboardShortcut(listOf("R"), "Cycle recipe"),
        KeyboardShortcut(listOf("P"), "Pause"),
        KeyboardShortcut(listOf("Esc", "Back"), "Close panel / pause"),
        KeyboardShortcut(listOf("M"), "Map"),
        KeyboardShortcut(listOf("U"), "Upgrades"),
        KeyboardShortcut(listOf("H"), "Staff"),
        KeyboardShortcut(listOf("G"), "Goals"),
        KeyboardShortcut(listOf("J"), "Jobs"),
        KeyboardShortcut(listOf("I"), "Warehouse"),
        KeyboardShortcut(listOf("Y"), "Dashboard"),
        KeyboardShortcut(listOf("B"), "Species book"),
    )

    /** Compact desktop pad copy — always HUD-backed, never a world texture. */
    fun desktopKeysHint(tapToMove: Boolean): String {
        val base = "Move WASD / arrows · Reel F · Pause P"
        return if (tapToMove) "$base · Tap harbor to walk" else base
    }

    /** Full settings-panel controls blurb. */
    fun controlsHelpLine(): String =
        "Move WASD / stick · Reel Space / F · Recipe R · Pause · Map · Warehouse · Goals · Jobs · Staff · Dash · Species book · Upgrades · Back closes panels"

    /** Short touch tip when tap-to-move is enabled (HUD overlay, not world text). */
    fun tapToMoveHint(): String = "Tap the harbor to walk"

    fun joystickDiameterDp(scale: Float): Float = GameSettings.BASE_DIAMETER_DP * scale

    /** Defaults expected after a fresh install / empty settings store. */
    fun controlDefaultsMatch(settings: GameSettings): Boolean =
        settings.joystickSide == JoystickSide.LEFT &&
            settings.joystickScale == 1f &&
            !settings.tapToMove

    fun assertControlQaInvariants(
        actionMinHeightDp: Int,
        joystickSide: JoystickSide,
        joystickScale: Float,
        tapArriveMm: Int = TAP_ARRIVE_MM,
    ): List<String> {
        val errors = mutableListOf<String>()
        if (actionMinHeightDp < MIN_TOUCH_TARGET_DP) {
            errors += "actionMinHeightDp $actionMinHeightDp < $MIN_TOUCH_TARGET_DP"
        }
        val diameter = joystickDiameterDp(joystickScale)
        if (diameter < MIN_TOUCH_TARGET_DP) {
            errors += "joystick diameter $diameter < $MIN_TOUCH_TARGET_DP"
        }
        if (joystickSide != JoystickSide.LEFT && joystickSide != JoystickSide.RIGHT) {
            errors += "invalid joystickSide $joystickSide"
        }
        if (tapArriveMm <= 0) errors += "tap arrive distance must be positive"
        return errors
    }

    /** True when a GLB node name is a socket/pad — not player-facing instructional copy. */
    fun isWorldSocketName(name: String): Boolean =
        name.startsWith("Zone_") ||
            name.startsWith("Footprint_") ||
            name.startsWith("In_") ||
            name.startsWith("Out_") ||
            name.startsWith("Stock_") ||
            name.startsWith("Decor_") ||
            name == "Player" ||
            name == "Pier" ||
            name.startsWith("Ground_") ||
            name == "Water"

    /** Rejects mesh names that look like sentences / tutorial copy baked into the world. */
    fun looksLikeEssentialWorldText(name: String): Boolean {
        if (isWorldSocketName(name)) return false
        if (name.contains(' ')) return true
        val lower = name.lowercase()
        return listOf("tap", "press", "walk", "reel", "buy", "sell", "hire", "upgrade", "tutorial", "hint")
            .any { lower.contains(it) }
    }

    val HUD_ESSENTIAL_COPY_KEYS: List<String> = listOf(
        "objective",
        "context",
        "coins",
        "station status",
        "tutorial / coaching",
    )
}
