package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.audio.SfxCue
import com.willio.jeanvilma.fishshopping.audio.sfxFromEvent
import com.willio.jeanvilma.fishshopping.audio.wantsHaptic
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SfxCuesTest {
    @Test
    fun mapsCatchMachineSaleUpgradeRush() {
        assertEquals(SfxCue.CATCH, sfxFromEvent(GameEvent.FishCaught(1, "species.a", "zone.a")))
        assertEquals(SfxCue.MACHINE_DONE, sfxFromEvent(GameEvent.BatchCompleted(1, "b1", "station.a")))
        assertEquals(
            SfxCue.SALE,
            sfxFromEvent(GameEvent.SaleCommitted(1, "s1", "c1", emptyList(), 10)),
        )
        val receipt = Receipt("r1", "upgrade", -5, 1, "upgrade.a")
        assertEquals(
            SfxCue.UPGRADE,
            sfxFromEvent(GameEvent.UpgradePurchased(1, "upgrade.a", receipt, replayed = false)),
        )
        assertNull(
            sfxFromEvent(GameEvent.UpgradePurchased(1, "upgrade.a", receipt, replayed = true)),
        )
        assertEquals(SfxCue.RUSH, sfxFromEvent(GameEvent.RushStarted(1, "rush.a", "Lunch Rush")))
    }

    @Test
    fun abandonOnlyWhenUnpaid() {
        assertEquals(SfxCue.ABANDON, sfxFromEvent(GameEvent.CustomerLeft(1, "c1", paid = false)))
        assertNull(sfxFromEvent(GameEvent.CustomerLeft(1, "c1", paid = true)))
    }

    @Test
    fun hapticOnCatchAndSale() {
        assertTrue(SfxCue.CATCH.wantsHaptic())
        assertTrue(SfxCue.SALE.wantsHaptic())
        assertFalse(SfxCue.RUSH.wantsHaptic())
    }
}
