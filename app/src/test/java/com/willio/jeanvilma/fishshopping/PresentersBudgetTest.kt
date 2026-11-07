package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.FLYING_TRANSFER_POOL
import com.willio.jeanvilma.fishshopping.render.FrameTiming
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.FlyingTransfers
import com.willio.jeanvilma.fishshopping.render.LocomotionClip
import com.willio.jeanvilma.fishshopping.render.LocomotionOpts
import com.willio.jeanvilma.fishshopping.render.PresenterQuality
import com.willio.jeanvilma.fishshopping.render.VFX_BURST_POOL
import com.willio.jeanvilma.fishshopping.render.WALK_SPEED_REF_M_PER_S
import com.willio.jeanvilma.fishshopping.render.WorldBurstCue
import com.willio.jeanvilma.fishshopping.render.WorldBurstKind
import com.willio.jeanvilma.fishshopping.render.WorldBursts
import com.willio.jeanvilma.fishshopping.render.crowdDrawCapForQuality
import com.willio.jeanvilma.fishshopping.render.flyingTransferPoolForQuality
import com.willio.jeanvilma.fishshopping.render.locomoteFromMotion
import com.willio.jeanvilma.fishshopping.render.pickLocomotionClip
import com.willio.jeanvilma.fishshopping.render.worldBurstPoolForQuality
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class PresentersBudgetTest {
    @Test
    fun qualityBudgetsMatchPhase26Table() {
        assertEquals(4, flyingTransferPoolForQuality(PresenterQuality.LOW))
        assertEquals(8, flyingTransferPoolForQuality(PresenterQuality.MEDIUM))
        assertEquals(FLYING_TRANSFER_POOL, flyingTransferPoolForQuality(PresenterQuality.HIGH))
        assertEquals(3, crowdDrawCapForQuality(PresenterQuality.LOW, 6))
        assertEquals(5, crowdDrawCapForQuality(PresenterQuality.MEDIUM, 6))
        assertEquals(6, crowdDrawCapForQuality(PresenterQuality.HIGH, 6)) // clamped to GLB
    }

    @Test
    fun androidFrameTargetsMatchDeviceMatrix30Fps() {
        assertEquals(33.3, FrameTiming.targetMs(QualityPreset.MEDIUM), 0.05)
        assertEquals(33.3, FrameTiming.targetMs(QualityPreset.HIGH), 0.05)
        assertEquals(40.0, FrameTiming.targetMs(QualityPreset.LOW), 0.05)
        assertEquals(45, FrameTiming.FRAME_DOWNGRADE_STREAK)
        assertEquals(2, FrameTiming.HARBOR_CACHE_LIMIT)
        assertEquals(1.15, FrameTiming.OVER_BUDGET_MULT, 0.001)
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

    @Test
    fun locomotionClipsMatchCarryAndCast() {
        assertEquals(LocomotionClip.CARRY, pickLocomotionClip(moving = true, carrying = true, casting = false))
        assertEquals(LocomotionClip.CAST, pickLocomotionClip(moving = false, carrying = false, casting = true))
        val walk = locomoteFromMotion(0.0, 0.0, WALK_SPEED_REF_M_PER_S * 0.1, 0.0, 0.0, 0.0, 0.0, 0.1)
        assertEquals(LocomotionClip.WALK, walk.first.clip)
        val carry = locomoteFromMotion(
            0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.1, false, LocomotionOpts(carrying = true),
        )
        assertEquals(LocomotionClip.CARRY, carry.first.clip)
        assertTrue(carry.first.leanRad > 0.0)
        val cast = locomoteFromMotion(
            0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, false, LocomotionOpts(casting = true, cast01 = 0.6),
        )
        assertEquals(LocomotionClip.CAST, cast.first.clip)
        assertEquals(0.6, cast.first.cast01, 1e-6)
        assertTrue(cast.first.leanRad < 0.0)
    }

    @Test
    fun worldBurstBudgetsMatchPhase16Table() {
        assertEquals(2, worldBurstPoolForQuality(PresenterQuality.LOW))
        assertEquals(4, worldBurstPoolForQuality(PresenterQuality.MEDIUM))
        assertEquals(VFX_BURST_POOL, worldBurstPoolForQuality(PresenterQuality.HIGH))
        val bursts = WorldBursts(8)
        bursts.setBudget(2)
        val cue = WorldBurstCue(0, 0, WorldBurstKind.PAY)
        assertTrue(bursts.spawn(cue))
        assertTrue(bursts.spawn(cue))
        assertFalse(bursts.spawn(cue))
    }
}
