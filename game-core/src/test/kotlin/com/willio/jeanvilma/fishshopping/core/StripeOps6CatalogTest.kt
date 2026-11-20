package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StripeOps6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6. */
class StripeOps6CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StripeOps6.CATALOG).isFile }

    @Test
    fun locksPhase25CatalogFloors() {
        assertEquals(25, StripeOps6.PHASE)
        assertEquals(27, StripeOps6.SCHEMA_VERSION)
        assertEquals(StripeOps6.STRIPE_OPS_6_MARKER, "authored-finish-6.0-phase-25")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(StripeOps6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertEquals(31, StripeOps6.SKU_FLOOR)
        assertEquals(30, StripeOps6.COSMETIC_SKU_FLOOR)
        assertTrue(File(repoRoot(), StripeOps6.CATALOG).isFile)
        assertTrue(File(repoRoot(), StripeOps6.OPS_CATALOG).isFile)
        assertTrue(File(repoRoot(), StripeOps6.PARITY_FIXTURE).isFile)
    }
}
