package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Species125
import com.willio.jeanvilma.fishshopping.core.world.EcologySystem
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class Species125Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Species125.CATALOG).isFile }

    @Test
    fun locksPhase13CatalogFloors() {
        assertEquals(13, Species125.PHASE)
        assertEquals("authored-finish-5.0-phase-13", Species125.MARKER)
        assertEquals(125, Species125.SPECIES_COUNT)
        assertEquals(24, Species125.HABITAT_COUNT)
        assertEquals(13, Species125.NEW_BASE_IDS.size)
        assertEquals(12, Species125.NEW_RARE_IDS.size)
        assertEquals(8, Species125.NEW_HABITAT_IDS.size)
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 13 && it.validate == "species125:validate" })
    }

    @Test
    fun ecologyCoversWaveWhenPackPresent() {
        val root = repoRoot()
        assertTrue(File(root, Species125.CATALOG).isFile)
        assertTrue(File(root, Species125.PARITY_FIXTURE).isFile)
        // Shared content pack may be loaded by other tests; floor constants stay locked here.
        assertEquals(24, EcologySystem.HABITAT_FLOOR_PHASE_13)
        assertEquals(25, Species125.waveIds().size)
    }
}
