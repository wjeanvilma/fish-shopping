package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.ui.StatusShape
import com.willio.jeanvilma.fishshopping.ui.applyAccessibilityPreset
import com.willio.jeanvilma.fishshopping.ui.clampHudTextScale
import com.willio.jeanvilma.fishshopping.ui.statusShapeFor
import com.willio.jeanvilma.fishshopping.ui.statusShapeGlyph
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AccessibilityTest {
    @Test
    fun statusShapesAreNonColour() {
        assertEquals(StatusShape.TRIANGLE, statusShapeFor(MachineStatus.PROCESSING))
        assertEquals(StatusShape.SQUARE, statusShapeFor(MachineStatus.PAUSED))
        assertEquals(StatusShape.DIAMOND, statusShapeFor(MachineStatus.NEEDS_REPAIR))
        assertEquals("▶", statusShapeGlyph(StatusShape.TRIANGLE))
    }

    @Test
    fun hudTextScaleSnaps() {
        assertEquals(1.15f, clampHudTextScale(1.1f), 1e-6f)
        assertEquals(1.3f, clampHudTextScale(1.4f), 1e-6f)
    }

    @Test
    fun accessibilityPresetEnablesPhase19Bundle() {
        val next = applyAccessibilityPreset(GameSettings())
        assertTrue(next.reducedMotion)
        assertTrue(next.captionsEnabled)
        assertEquals(1.15f, next.hudTextScale, 1e-6f)
        assertTrue(next.shapeCues)
        assertTrue(next.timingAssist)
    }
}
