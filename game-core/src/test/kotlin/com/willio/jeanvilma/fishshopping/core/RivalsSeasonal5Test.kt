package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.RivalsSeasonal5
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 18 — rivals/seasonal/baits/cosmetics growth. */
class RivalsSeasonal5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, RivalsSeasonal5.CATALOG).isFile }

    @Test
    fun catalogFloorsAndCoverage() {
        assertEquals(18, RivalsSeasonal5.PHASE)
        assertEquals(26, RivalsSeasonal5.SCHEMA_VERSION)
        assertEquals(RivalsSeasonal5.RIVALS_SEASONAL_5_MARKER, "authored-finish-5.0-phase-18")
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertTrue(Shared.content.rivalMarkets.rivals.size >= RivalsSeasonal5.RIVALS_MIN)
        assertTrue(Shared.content.seasonalEvents.events.size >= RivalsSeasonal5.SEASONAL_EVENTS_MIN)
        assertTrue(Shared.content.bait.size >= RivalsSeasonal5.BAITS_MIN)
        for (id in RivalsSeasonal5.NEW_RIVAL_IDS) {
            assertTrue(id, Shared.content.rivalMarkets.rivals.any { it.id == id })
        }
        val covered = Shared.content.rivalMarkets.rivals.flatMap { it.harbors }.toSet()
        assertEquals(Shared.content.harbors.size, covered.size)
        assertTrue(File(repoRoot(), RivalsSeasonal5.CATALOG).isFile)
    }
}
