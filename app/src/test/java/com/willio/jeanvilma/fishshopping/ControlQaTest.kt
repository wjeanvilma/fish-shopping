package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.ui.ControlQa
import com.willio.jeanvilma.fishshopping.ui.hud.TAP_ARRIVE_MM
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ControlQaTest {
    @Test
    fun touchTargetsMeetDesignToken() {
        assertEquals(48, ControlQa.MIN_TOUCH_TARGET_DP)
        assertTrue(
            ControlQa.assertControlQaInvariants(
                actionMinHeightDp = 48,
                joystickSide = JoystickSide.LEFT,
                joystickScale = 0.75f,
                tapArriveMm = TAP_ARRIVE_MM,
            ).isEmpty(),
        )
        assertTrue(ControlQa.joystickDiameterDp(0.75f) >= ControlQa.MIN_TOUCH_TARGET_DP)
        assertFalse(
            ControlQa.assertControlQaInvariants(
                actionMinHeightDp = 44,
                joystickSide = JoystickSide.LEFT,
                joystickScale = 1f,
            ).isEmpty(),
        )
    }

    @Test
    fun controlDefaultsMatchFreshSettings() {
        assertTrue(ControlQa.controlDefaultsMatch(GameSettings()))
        assertFalse(
            ControlQa.controlDefaultsMatch(
                GameSettings(joystickSide = JoystickSide.RIGHT),
            ),
        )
        assertFalse(ControlQa.controlDefaultsMatch(GameSettings(tapToMove = true)))
    }

    @Test
    fun keyboardHintsAreHudBacked() {
        assertTrue(ControlQa.KEYBOARD_SHORTCUTS.any { it.action == "Move" })
        assertTrue(ControlQa.KEYBOARD_SHORTCUTS.any { it.action == "Reel" })
        assertTrue(ControlQa.desktopKeysHint(tapToMove = false).contains("WASD"))
        assertTrue(ControlQa.desktopKeysHint(tapToMove = true).contains("Tap harbor"))
        assertTrue(ControlQa.tapToMoveHint().contains("Tap", ignoreCase = true))
        assertTrue(ControlQa.controlsHelpLine().contains("Back"))
        assertTrue(ControlQa.HUD_ESSENTIAL_COPY_KEYS.size >= 4)
    }

    @Test
    fun worldSocketsAreNotEssentialCopy() {
        assertTrue(ControlQa.isWorldSocketName("Zone_pier_end"))
        assertTrue(ControlQa.isWorldSocketName("Water"))
        assertFalse(ControlQa.looksLikeEssentialWorldText("Zone_pier_end"))
        assertTrue(ControlQa.looksLikeEssentialWorldText("Tap the harbor to walk"))
        assertTrue(ControlQa.looksLikeEssentialWorldText("Press_F_to_Reel"))
        assertFalse(ControlQa.looksLikeEssentialWorldText("Machine_cutter_01"))
    }
}
