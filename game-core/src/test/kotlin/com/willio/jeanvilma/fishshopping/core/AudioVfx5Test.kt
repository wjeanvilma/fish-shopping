package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.AudioPack5
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice5
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AudioVfx5Test {
    @Test
    fun locksPhase12PackFloors() {
        assertEquals(12, AudioPack5.PHASE)
        assertEquals(12, VfxJuice5.PHASE)
        assertEquals("authored-finish-5.0-phase-12", AudioPack5.AUDIO_PACK_MARKER)
        assertEquals("authored-finish-5.0-phase-12", VfxJuice5.VFX_JUICE_5_MARKER)
        assertTrue(AudioPack5.NEW_STINGERS.size >= AudioPack5.NEW_STINGER_MIN)
        assertTrue(AudioPack5.NEW_BEDS.size >= AudioPack5.NEW_BED_MIN)
        assertTrue(VfxJuice5.EVENT_BURSTS.size >= VfxJuice5.EVENT_BURST_MIN)
        assertTrue(VfxJuice5.EVENT_SHAKES.size >= VfxJuice5.EVENT_SHAKE_MIN)
        assertTrue(VfxJuice5.PRESSURE_AMBIENT_MODES.size >= VfxJuice5.PRESSURE_AMBIENT_MIN)
        assertEquals("audiovfx5:validate", AudioPack5.VALIDATE_SCRIPT)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("audioVfx5Incomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 12 && it.validate == "audiovfx5:validate" })
    }
}
