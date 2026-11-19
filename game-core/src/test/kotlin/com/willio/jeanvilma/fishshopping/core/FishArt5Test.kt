package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.FishArt5
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class FishArt5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, FishArt5.CATALOG).isFile }

    @Test
    fun locksPhase9CatalogFloors() {
        assertEquals(9, FishArt5.PHASE)
        assertEquals("authored-finish-5.0-phase-9", FishArt5.MARKER)
        assertEquals("fish-art-5", FishArt5.FINISH5_MARKER)
        assertEquals(125, FishArt5.AUTHORED_SPECIES_TARGET)
        assertEquals(25, FishArt5.NEW_SPECIES_IDS.size)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("fishArt5Incomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 9 && it.validate == "fishart5:validate" })
    }

    @Test
    fun artAheadAssetsExist() {
        val root = repoRoot()
        assertTrue(File(root, FishArt5.CATALOG).isFile)
        assertTrue(File(root, FishArt5.PARITY_FIXTURE).isFile)
        for (id in FishArt5.NEW_SPECIES_IDS) {
            val suffix = id.removePrefix("species.")
            assertTrue(File(root, "shared/assets/models/fish_${suffix}.glb").isFile)
        }
    }
}
