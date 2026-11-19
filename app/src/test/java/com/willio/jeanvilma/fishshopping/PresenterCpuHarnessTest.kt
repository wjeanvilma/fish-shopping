package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.FrameBudgetAction
import com.willio.jeanvilma.fishshopping.render.PresenterCpuHarness
import com.willio.jeanvilma.fishshopping.render.PresenterCpuSnapshots
import com.willio.jeanvilma.fishshopping.render.PresenterCpuStage
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/** Finish 6.0 Phase 21 — presenter/render CPU snapshot harness. */
class PresenterCpuHarnessTest {
    @Test
    fun samplesNestHudStageIntoSnapshot() {
        var t = 0L
        val harness = PresenterCpuHarness(nowMs = { ++t })
        harness.beginStage(PresenterCpuStage.CROWD)
        harness.endStage(PresenterCpuStage.CROWD)
        harness.recordStageMs(PresenterCpuStage.NEST_HUD, 0.5)
        harness.setNestHudPressurePermille(400)
        assertEquals(FrameBudgetAction.HOLD, harness.sampleFrame(0.016, QualityPreset.MEDIUM))
        val snap = harness.snapshot()
        assertEquals(1, snap.sampleCount)
        assertTrue(snap.stageMs.nestHud >= 0.5)
        assertEquals(400, snap.nestHudPressurePermille)
        assertTrue(snap.caps.crowd >= 3)
        assertTrue(PresenterCpuSnapshots.STAGES.contains(PresenterCpuStage.NEST_HUD))
    }

    @Test
    fun pureSnapshotFlagsOverBudget() {
        val snap = PresenterCpuSnapshots.from(
            lastFrameMs = 50.0,
            emaFrameMs = 40.0,
            targetMs = 33.3,
            budgetAction = FrameBudgetAction.HOLD,
            quality = QualityPreset.MEDIUM,
            sampleCount = 2,
            nestHudPressurePermille = 100,
        )
        assertTrue(snap.overBudget)
        assertEquals(100, snap.nestHudPressurePermille)
        assertFalse(
            PresenterCpuSnapshots.from(
                lastFrameMs = 10.0,
                emaFrameMs = 10.0,
                targetMs = 33.3,
                budgetAction = FrameBudgetAction.HOLD,
                quality = QualityPreset.LOW,
                sampleCount = 1,
            ).overBudget,
        )
    }
}
