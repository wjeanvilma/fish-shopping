package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.OfflineCloud4
import com.willio.jeanvilma.fishshopping.core.sim.RemoteAnalyticsPolicy
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 18 — offline/cloud/analytics hardening 4. */
class OfflineCloud4Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, OfflineCloud4.CATALOG).isFile }

    @Test
    fun locksPhase18CatalogFloors() {
        assertEquals(18, OfflineCloud4.PHASE)
        assertEquals(27, OfflineCloud4.SCHEMA_VERSION)
        assertEquals(OfflineCloud4.MARKER, "authored-finish-6.0-phase-18")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(OfflineCloud4.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertEquals(7, RemoteAnalyticsPolicy.MAX_FLUSH_RETRIES)
        assertEquals(750L, RemoteAnalyticsPolicy.RETRY_JITTER_MS)
        assertEquals(3, RemoteAnalyticsPolicy.CIRCUIT_BREAKER_AFTER_DEAD_LETTERS)
        assertTrue(RemoteAnalyticsPolicy.circuitOpen(3))
        assertFalse(RemoteAnalyticsPolicy.circuitOpen(2))
        assertTrue(File(repoRoot(), OfflineCloud4.CATALOG).isFile)
        assertTrue(File(repoRoot(), OfflineCloud4.PARITY_FIXTURE).isFile)
        val kickoff = File(repoRoot(), "shared/ship/finish-6.0-kickoff.json").readText()
        assertTrue(kickoff.contains("\"offlineCloud4Incomplete\": false"))
        assertTrue(kickoff.contains("offlinecloud4:validate"))
    }
}
