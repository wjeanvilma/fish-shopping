package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.WeeklyGoalsSystem
import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.TutorialRetention6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.TutorialFriction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 19 — tutorial friction + retention hooks 6. */
class TutorialRetention6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, TutorialRetention6.CATALOG).isFile }

    @Test
    fun locksPhase19CatalogFloors() {
        assertEquals(19, TutorialRetention6.PHASE)
        assertEquals(27, TutorialRetention6.SCHEMA_VERSION)
        assertEquals(TutorialRetention6.TUTORIAL_RETENTION_6_MARKER, "authored-finish-6.0-phase-19")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(TutorialRetention6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 10)
        assertTrue(Shared.content.tutorial.size >= TutorialRetention6.TUTORIAL_STEPS_MIN)
        assertTrue(Shared.content.dailyGoals.objectives.size >= TutorialRetention6.DAILY_OBJECTIVES_MIN)
        assertTrue(Shared.content.dailyGoals.boardSlots >= TutorialRetention6.BOARD_SLOTS_MIN)
        assertEquals(3, WeeklyGoalsSystem.BOARD_SLOTS)
        assertTrue(WeeklyGoalsSystem.OBJECTIVES.size >= TutorialRetention6.WEEKLY_OBJECTIVES_MIN)
        assertTrue(TutorialFriction.HIGH_FRICTION_STEP_IDS.contains("tutorial.roast_nest"))
        assertTrue(TutorialFriction.HIGH_FRICTION_STEP_IDS.contains("tutorial.ferment_line"))
        for (id in TutorialRetention6.NEW_DAILY_OBJECTIVE_IDS) {
            assertTrue(id, Shared.content.dailyGoals.objectives.any { it.id == id })
        }
        for (id in TutorialRetention6.NEW_TUTORIAL_STEP_IDS) {
            assertTrue(id, Shared.content.tutorial.any { it.id == id })
        }
        assertTrue(File(repoRoot(), TutorialRetention6.CATALOG).isFile)
        assertTrue(File(repoRoot(), TutorialRetention6.PARITY_FIXTURE).isFile)
    }
}
