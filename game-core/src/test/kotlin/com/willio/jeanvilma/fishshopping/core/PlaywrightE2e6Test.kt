package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.PlaywrightE2e6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 23 — Playwright E2E ≥24 + nest deep-links. */
class PlaywrightE2e6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, PlaywrightE2e6.CATALOG).isFile }

    @Test
    fun locksPhase23CatalogFloors() {
        assertEquals(23, PlaywrightE2e6.PHASE)
        assertEquals(27, PlaywrightE2e6.SCHEMA_VERSION)
        assertEquals(PlaywrightE2e6.PLAYWRIGHT_E2E_6_MARKER, "authored-finish-6.0-phase-23")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(PlaywrightE2e6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(PlaywrightE2e6.SCENARIO_FLOOR >= 24)
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("nesttreasury"))
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("nestloans"))
        assertTrue(DeepLinkRoutes.PANEL_ALIASES.containsKey("nestconflict"))
        assertTrue(File(repoRoot(), PlaywrightE2e6.CATALOG).isFile)
        assertTrue(File(repoRoot(), PlaywrightE2e6.PARITY_FIXTURE).isFile)
    }
}
