package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.HarborArt5b
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class HarborArt5bTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, HarborArt5b.CATALOG).isFile }

    @Test
    fun locksPhase8CatalogFloors() {
        assertEquals(8, HarborArt5b.PHASE)
        assertEquals("authored-finish-5.0-phase-8", HarborArt5b.MARKER)
        assertEquals("harbor-art-5b", HarborArt5b.FINISH5_MARKER)
        assertEquals(4, HarborArt5b.FINISH5_HARBOR_TARGET)
        assertEquals(4, HarborArt5b.FINISH5_HARBOR_IDS.size)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("harborArt5Incomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 8 && it.validate == "harborart5b:validate" })
    }

    @Test
    fun fiveBAssetsExist() {
        val root = repoRoot()
        assertTrue(File(root, HarborArt5b.CATALOG).isFile)
        assertTrue(File(root, HarborArt5b.PARITY_FIXTURE).isFile)
        for (id in HarborArt5b.FINISH5_HARBOR_IDS) {
            val suffix = id.removePrefix("harbor.")
            assertTrue(File(root, "shared/assets/models/${suffix}_blockout.glb").isFile)
        }
    }
}
