package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.HarborArt5a
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class HarborArt5aTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, HarborArt5a.CATALOG).isFile }

    @Test
    fun locksPhase7CatalogFloors() {
        assertEquals(7, HarborArt5a.PHASE)
        assertEquals("authored-finish-5.0-phase-7", HarborArt5a.MARKER)
        assertEquals("harbor-art-5a", HarborArt5a.FINISH5_MARKER)
        assertEquals(6, HarborArt5a.FINISH5_HARBOR_TARGET)
        assertEquals(6, HarborArt5a.FINISH5_HARBOR_IDS.size)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 7 && it.validate == "harborart5a:validate" })
    }

    @Test
    fun fiveAAssetsExist() {
        val root = repoRoot()
        assertTrue(File(root, HarborArt5a.CATALOG).isFile)
        assertTrue(File(root, HarborArt5a.PARITY_FIXTURE).isFile)
        for (id in HarborArt5a.FINISH5_HARBOR_IDS) {
            val suffix = id.removePrefix("harbor.")
            assertTrue(File(root, "shared/assets/models/${suffix}_blockout.glb").isFile)
        }
    }
}
