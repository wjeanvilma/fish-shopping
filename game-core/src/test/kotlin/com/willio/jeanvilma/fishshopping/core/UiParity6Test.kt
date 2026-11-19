package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.UiParity6
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 20 — Web↔Android panel parity depth 6. */
class UiParity6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, UiParity6.CATALOG).isFile }

    @Test
    fun locksPhase20CatalogFloors() {
        assertEquals(20, UiParity6.PHASE)
        assertEquals(27, UiParity6.SCHEMA_VERSION)
        assertEquals(UiParity6.UI_PARITY_6_MARKER, "authored-finish-6.0-phase-20")
        assertTrue(SimConstants.SCHEMA_VERSION >= 27)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(UiParity6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 4)
        assertTrue(UiParity6.FEATURE_FLOOR_IDS.size >= UiParity6.FEATURE_FLOOR_MIN)
        assertTrue(UiParity6.NEW_FEATURE_FLOOR_IDS.contains("nest_treasury"))
        assertTrue(UiParity6.NEW_PANEL_PAIR_IDS.contains("hud_primitives"))
        assertTrue(Shared.content.dailyGoals.objectives.size >= UiParity6.DAILY_OBJECTIVE_MIN)
        assertTrue(Shared.content.bank.loanProducts.size >= UiParity6.LOAN_PRODUCT_MIN)
        assertTrue(Shared.content.bank.goalPresets.size >= UiParity6.GOAL_PRESET_MIN)
        assertTrue(File(repoRoot(), UiParity6.CATALOG).isFile)
        assertTrue(File(repoRoot(), UiParity6.PARITY_FIXTURE).isFile)
    }
}
