package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.HostPresenterDepth
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class HostPresenterDepthTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, HostPresenterDepth.CATALOG).isFile }

    @Test
    fun locksPhase5CatalogFloors() {
        assertEquals(5, HostPresenterDepth.PHASE)
        assertEquals("authored-finish-5.0-phase-5", HostPresenterDepth.MARKER)
        assertEquals(10, HostPresenterDepth.VIEW_FIELD_MIN)
        assertEquals(4, HostPresenterDepth.HUD_BINDING_SURFACES)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 5 && it.validate == "hostpresenterdepth:validate" })
    }

    @Test
    fun requiredHostFilesExist() {
        val root = repoRoot()
        for (path in HostPresenterDepth.REQUIRED_FILES) {
            assertTrue("missing $path", File(root, path).isFile)
        }
        for (surface in HostPresenterDepth.HUD_SURFACES) {
            val path = "web/src/ui/$surface"
            assertTrue("missing $path", File(root, path).isFile)
        }
    }
}
