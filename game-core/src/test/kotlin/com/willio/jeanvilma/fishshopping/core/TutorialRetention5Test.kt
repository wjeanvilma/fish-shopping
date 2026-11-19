package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.WeeklyGoalsSystem
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.TutorialRetention5
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.TutorialFriction
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 19 — tutorial friction rewrite + retention hooks. */
class TutorialRetention5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, TutorialRetention5.CATALOG).isFile }

    @Test
    fun locksPhase19CatalogFloors() {
        assertEquals(19, TutorialRetention5.PHASE)
        assertEquals(26, TutorialRetention5.SCHEMA_VERSION)
        assertEquals(TutorialRetention5.TUTORIAL_RETENTION_5_MARKER, "authored-finish-5.0-phase-19")
        assertTrue(SimConstants.SCHEMA_VERSION >= 26)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(TutorialRetention5.CLOSES_GAP))
        assertTrue(Shared.content.dailyGoals.objectives.size >= TutorialRetention5.DAILY_OBJECTIVES_MIN)
        assertTrue(Shared.content.dailyGoals.boardSlots >= TutorialRetention5.BOARD_SLOTS_MIN)
        assertTrue(Shared.content.dailyGoals.maxStreakBonusDays >= TutorialRetention5.MAX_STREAK_BONUS_DAYS_MIN)
        assertTrue(TutorialFriction.HIGH_FRICTION_STEP_IDS.size >= TutorialRetention5.HIGH_FRICTION_MIN)
        assertTrue(TutorialFriction.NUDGES.size >= TutorialRetention5.NUDGES_MIN)
        for (id in TutorialRetention5.MID_GAME_FRICTION_IDS) {
            assertTrue(id, TutorialFriction.HIGH_FRICTION_STEP_IDS.contains(id))
        }
        assertTrue(WeeklyGoalsSystem.OBJECTIVES.size >= TutorialRetention5.WEEKLY_OBJECTIVES_MIN)
        for (id in TutorialRetention5.NEW_WEEKLY_OBJECTIVE_IDS) {
            assertTrue(id, WeeklyGoalsSystem.OBJECTIVES.any { it.id == id })
        }
        assertTrue(File(repoRoot(), TutorialRetention5.CATALOG).isFile)
        assertTrue(File(repoRoot(), TutorialRetention5.PARITY_FIXTURE).isFile)
    }
}
