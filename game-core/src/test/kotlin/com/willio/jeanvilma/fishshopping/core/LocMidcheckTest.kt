package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.LocMidcheck
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class LocMidcheckTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, LocMidcheck.CATALOG).isFile }

    @Test
    fun locksPhase6CatalogFloors() {
        assertEquals(6, LocMidcheck.PHASE)
        assertEquals("authored-finish-5.0-phase-6", LocMidcheck.MARKER)
        assertEquals(82280, LocMidcheck.MIDCHECK_PRODUCT_LOC)
        assertEquals(82000, LocMidcheck.INTERIM_PRODUCT_FLOOR)
        assertEquals(80175, LocMidcheck.PRIOR_PRODUCT_LOC)
        assertEquals(120000, LocMidcheck.PLAN_PRODUCT_LOC)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 6 && it.validate == "locmidcheck:validate" })
    }

    @Test
    fun catalogAndParityExist() {
        val root = repoRoot()
        assertTrue(File(root, LocMidcheck.CATALOG).isFile)
        assertTrue(File(root, LocMidcheck.PARITY_FIXTURE).isFile)
    }
}
