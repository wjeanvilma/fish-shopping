package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.a11y.AccessibilityDepth5
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth5
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.I18nGrowth6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 22 — a11y depth 5 + i18n ≥400. */
class A11yI18n6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, A11yDepth5.CATALOG).isFile }

    @Test
    fun locksPhase22CatalogFloors() {
        assertEquals(22, A11yDepth5.PHASE)
        assertEquals(22, I18nGrowth6.PHASE)
        assertEquals(27, A11yDepth5.SCHEMA_VERSION)
        assertEquals(A11yDepth5.A11Y_DEPTH_5_MARKER, "authored-finish-6.0-phase-22")
        assertEquals(I18nGrowth6.I18N_GROWTH_6_MARKER, "authored-finish-6.0-phase-22")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(A11yDepth5.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(AccessibilityDepth5.SCREEN_IDS.size >= A11yDepth5.SCREEN_SURFACE_MIN)
        assertTrue(AccessibilityDepth5.SCREEN_IDS.contains("nest_treasury"))
        assertTrue(AccessibilityDepth5.LIVE_REGIONS.contains("nest_conflict"))
        assertTrue(UiStrings.keyCount() >= I18nGrowth6.UI_STRING_KEY_MIN)
        assertTrue(File(repoRoot(), A11yDepth5.CATALOG).isFile)
        assertTrue(File(repoRoot(), I18nGrowth6.CATALOG).isFile)
        assertTrue(File(repoRoot(), A11yDepth5.DEPTH_CATALOG).isFile)
    }
}
