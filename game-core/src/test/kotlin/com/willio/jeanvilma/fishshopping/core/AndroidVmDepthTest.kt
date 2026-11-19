package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.AndroidVmDepth
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class AndroidVmDepthTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, AndroidVmDepth.CATALOG).isFile }

    @Test
    fun locksPhase4CatalogFloors() {
        assertEquals(4, AndroidVmDepth.PHASE)
        assertEquals("authored-finish-5.0-phase-4", AndroidVmDepth.MARKER)
        assertEquals(10, AndroidVmDepth.VIEW_FIELD_MIN)
        assertEquals(3, AndroidVmDepth.HUD_BINDING_SURFACES)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 4 && it.validate == "androidvmdepth:validate" })
    }

    @Test
    fun requiredAndroidFilesExist() {
        val root = repoRoot()
        for (path in AndroidVmDepth.REQUIRED_FILES) {
            assertTrue("missing $path", File(root, path).isFile)
        }
        for (surface in AndroidVmDepth.HUD_SURFACES) {
            val path = "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/$surface"
            assertTrue("missing $path", File(root, path).isFile)
        }
    }
}
