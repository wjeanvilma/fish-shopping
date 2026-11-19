package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Atmosphere5
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class Atmosphere5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Atmosphere5.CATALOG).isFile }

    @Test
    fun locksPhase11CatalogFloors() {
        assertEquals(11, Atmosphere5.PHASE)
        assertEquals("authored-finish-5.0-phase-11", Atmosphere5.MARKER)
        assertEquals("atmosphere-5", Atmosphere5.FINISH5_MARKER)
        assertEquals(10, Atmosphere5.FINISH5_HARBOR_TARGET)
        assertEquals(4, Atmosphere5.RENDER_MODULES.size)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("atmosphere5Incomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 11 && it.validate == "atmosphere5:validate" })
    }

    @Test
    fun renderModulesAndCatalogExist() {
        val root = repoRoot()
        assertTrue(File(root, Atmosphere5.CATALOG).isFile)
        assertTrue(File(root, Atmosphere5.PARITY_FIXTURE).isFile)
        for (rel in Atmosphere5.RENDER_MODULES) {
            assertTrue("missing $rel", File(root, rel).isFile)
        }
        assertTrue(File(root, "shared/assets/models/sunrise_pier_blockout.glb").isFile)
    }
}
