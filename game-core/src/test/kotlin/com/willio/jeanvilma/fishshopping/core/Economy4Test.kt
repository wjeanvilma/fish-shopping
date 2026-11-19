package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Economy4
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 17 — economy/bank/dashboard depth 4. */
class Economy4Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Economy4.CATALOG).isFile }

    @Test
    fun locksPhase17CatalogFloors() {
        assertEquals(17, Economy4.PHASE)
        assertEquals(27, Economy4.SCHEMA_VERSION)
        assertEquals(Economy4.MARKER, "authored-finish-6.0-phase-17")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(Economy4.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(Shared.content.bank.loanProducts.size >= Economy4.LOAN_PRODUCT_MIN)
        assertTrue(Shared.content.bank.goalPresets.size >= Economy4.GOAL_PRESET_MIN)
        for (id in Economy4.NEW_LOAN_PRODUCT_IDS) {
            assertTrue(id, Shared.content.bank.loanProducts.any { it.id == id })
        }
        for (g in Economy4.GOAL_PRESETS) {
            assertTrue(g.toString(), Shared.content.bank.goalPresets.contains(g))
        }
        assertTrue(File(repoRoot(), Economy4.CATALOG).isFile)
        assertTrue(File(repoRoot(), Economy4.PARITY_FIXTURE).isFile)
    }
}
