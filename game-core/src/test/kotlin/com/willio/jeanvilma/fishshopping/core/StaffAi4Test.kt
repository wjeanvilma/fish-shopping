package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.StaffAi4
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures. */
class StaffAi4Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, StaffAi4.CATALOG).isFile }

    @Test
    fun locksPhase16CatalogFloors() {
        assertEquals(16, StaffAi4.PHASE)
        assertEquals(27, StaffAi4.SCHEMA_VERSION)
        assertEquals(StaffAi4.STAFF_AI_4_MARKER, "authored-finish-6.0-phase-16")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(StaffAi4.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(Shared.content.staffTrees.branches.size >= StaffAi4.BRANCHES_MIN)
        assertTrue(Shared.content.staffTrees.schedules.size >= StaffAi4.SCHEDULES_MIN)
        for (id in StaffAi4.NEW_BRANCH_IDS) {
            assertTrue(id, Shared.content.staffTrees.branches.any { it.id == id })
        }
        for (id in StaffAi4.NEW_SCHEDULE_IDS) {
            assertTrue(id, Shared.content.staffTrees.schedules.any { it.id == id })
        }
        assertEquals(Stats.ICE_RUNNER_NEST_CHILLS, "stat.ice_runner_nest_chills")
        assertEquals(Stats.GREETER_NEST_HOSTS, "stat.greeter_nest_hosts")
        assertEquals(Stats.PORTER_NEST_HAULS, "stat.porter_nest_hauls")
        assertTrue(File(repoRoot(), StaffAi4.CATALOG).isFile)
        assertTrue(File(repoRoot(), StaffAi4.PARITY_FIXTURE).isFile)
        assertTrue(File(repoRoot(), StaffAi4.DECISION_TRACE_FIXTURE).isFile)
    }
}
