package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StaffAi3
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 20 — staff/worker AI depth wave 3. */
class StaffAi3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StaffAi3.CATALOG).isFile }

    @Test
    fun locksPhase20CatalogFloors() {
        assertEquals(20, StaffAi3.PHASE)
        assertEquals(26, StaffAi3.SCHEMA_VERSION)
        assertEquals(StaffAi3.STAFF_AI_3_MARKER, "authored-finish-5.0-phase-20")
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(StaffAi3.CLOSES_GAP))
        assertTrue(Shared.content.staffTrees.branches.size >= StaffAi3.BRANCHES_MIN)
        assertTrue(Shared.content.staffTrees.schedules.size >= StaffAi3.SCHEDULES_MIN)
        for (id in StaffAi3.NEW_BRANCH_IDS) {
            assertTrue(id, Shared.content.staffTrees.branches.any { it.id == id })
        }
        for (id in StaffAi3.NEW_SCHEDULE_IDS) {
            assertTrue(id, Shared.content.staffTrees.schedules.any { it.id == id })
        }
        assertEquals(Stats.SUPERVISOR_RUSH_MARSHALS, "stat.supervisor_rush_marshals")
        assertEquals(Stats.WORKER_FAILURE_RECOVERIES, "stat.worker_failure_recoveries")
        assertTrue(File(repoRoot(), StaffAi3.CATALOG).isFile)
        assertTrue(File(repoRoot(), StaffAi3.PARITY_FIXTURE).isFile)
    }
}
