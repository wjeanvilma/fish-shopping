package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ComposeE2e6
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 24 — Compose E2E ≥20 + nest tags. */
class ComposeE2e6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ComposeE2e6.CATALOG).isFile }

    @Test
    fun locksPhase24CatalogFloors() {
        assertEquals(24, ComposeE2e6.PHASE)
        assertEquals(27, ComposeE2e6.SCHEMA_VERSION)
        assertEquals(ComposeE2e6.COMPOSE_E2E_6_MARKER, "authored-finish-6.0-phase-24")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(ComposeE2e6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(ComposeE2e6.SCENARIO_FLOOR >= 20)
        assertTrue(File(repoRoot(), ComposeE2e6.CATALOG).isFile)
        assertTrue(File(repoRoot(), ComposeE2e6.PARITY_FIXTURE).isFile)
        val tags = File(
            repoRoot(),
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt",
        ).readText()
        assertTrue(tags.contains("\"nest.treasury\""))
        assertTrue(tags.contains("\"nest.loans\""))
        assertTrue(tags.contains("\"bag.panel\""))
    }
}
