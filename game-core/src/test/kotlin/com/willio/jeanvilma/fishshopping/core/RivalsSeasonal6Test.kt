package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.RivalsSeasonal6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 15 — rivals/seasonal/baits/cosmetics growth. */
class RivalsSeasonal6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, RivalsSeasonal6.CATALOG).isFile }

    @Test
    fun catalogFloorsAndNestCoverage() {
        assertEquals(15, RivalsSeasonal6.PHASE)
        assertEquals(27, RivalsSeasonal6.SCHEMA_VERSION)
        assertEquals(RivalsSeasonal6.RIVALS_SEASONAL_6_MARKER, "authored-finish-6.0-phase-15")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertTrue(Shared.content.rivalMarkets.rivals.size >= RivalsSeasonal6.RIVALS_MIN)
        assertTrue(Shared.content.seasonalEvents.events.size >= RivalsSeasonal6.SEASONAL_EVENTS_MIN)
        assertTrue(Shared.content.bait.size >= RivalsSeasonal6.BAITS_MIN)
        for (id in RivalsSeasonal6.NEW_RIVAL_IDS) {
            assertTrue(id, Shared.content.rivalMarkets.rivals.any { it.id == id })
        }
        for (id in RivalsSeasonal6.NEW_EVENT_IDS) {
            assertTrue(id, Shared.content.seasonalEvents.events.any { it.id == id })
        }
        for (id in RivalsSeasonal6.NEW_BAIT_IDS) {
            assertTrue(id, Shared.content.bait.any { it.id == id })
        }
        val covered = Shared.content.rivalMarkets.rivals.flatMap { it.harbors }.toSet()
        assertEquals(Shared.content.harbors.size, covered.size)
        val entitlements = File(repoRoot(), "shared/billing/entitlements.json").readText()
        for (id in RivalsSeasonal6.NEW_COSMETIC_IDS) {
            assertTrue(id, entitlements.contains(id))
        }
        assertTrue(File(repoRoot(), RivalsSeasonal6.PARITY_FIXTURE).isFile)
    }
}
