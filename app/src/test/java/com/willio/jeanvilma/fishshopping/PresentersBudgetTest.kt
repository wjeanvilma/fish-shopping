package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.FLYING_TRANSFER_POOL
import com.willio.jeanvilma.fishshopping.render.FrameTiming
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.FlyingTransfers
import com.willio.jeanvilma.fishshopping.render.PresenterQuality
import com.willio.jeanvilma.fishshopping.render.crowdDrawCapForQuality
import com.willio.jeanvilma.fishshopping.render.flyingTransferPoolForQuality
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PresentersBudgetTest {
    @Test
    fun qualityBudgetsMatchPhase29Table() {
        assertEquals(4, flyingTransferPoolForQuality(PresenterQuality.LOW))
        assertEquals(8, flyingTransferPoolForQuality(PresenterQuality.MEDIUM))
        assertEquals(FLYING_TRANSFER_POOL, flyingTransferPoolForQuality(PresenterQuality.HIGH))
        assertEquals(3, crowdDrawCapForQuality(PresenterQuality.LOW, 6))
        assertEquals(5, crowdDrawCapForQuality(PresenterQuality.MEDIUM, 6))
        assertEquals(6, crowdDrawCapForQuality(PresenterQuality.HIGH, 6)) // clamped to GLB
    }

    @Test
    fun flyingBudgetDropsExcessSpawns() {
        val flies = FlyingTransfers(12)
        flies.setBudget(1)
        val cue = FlyingTransferCue(0, 0, 1000, 0, "product.basic_portion")
        assertTrue(flies.spawn(cue))
        assertFalse(flies.spawn(cue))
    }

    @Test
    fun frameTimingSuggestsDowngradeAfterSustainedMiss() {
        val timing = FrameTiming(emaAlpha = 1.0, downgradeStreak = 3)
        val target = FrameTiming.targetMs(QualityPreset.MEDIUM)
        assertFalse(timing.sample(0.010, target))
        assertFalse(timing.sample(0.030, target))
        assertFalse(timing.sample(0.030, target))
        assertTrue(timing.sample(0.030, target))
        assertEquals(QualityPreset.LOW, FrameTiming.downgrade(QualityPreset.MEDIUM))
    }
}
