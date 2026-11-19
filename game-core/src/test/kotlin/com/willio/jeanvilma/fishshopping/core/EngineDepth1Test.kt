package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.economy.EconomySystem
import com.willio.jeanvilma.fishshopping.core.fishing.CastPhase
import com.willio.jeanvilma.fishshopping.core.fishing.CastPhases
import com.willio.jeanvilma.fishshopping.core.fishing.FishingSystem
import com.willio.jeanvilma.fishshopping.core.ship.EngineDepth1
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.TimingTier
import com.willio.jeanvilma.fishshopping.core.sim.view
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class EngineDepth1Test {
    @Test
    fun locksPhase2CatalogFloors() {
        assertEquals(2, EngineDepth1.PHASE)
        assertEquals("authored-finish-5.0-phase-2", EngineDepth1.MARKER)
        assertEquals(3, EngineDepth1.CAST_PHASE_MIN)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("engineDepthIncomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 2 && it.validate == "enginedepth1:validate" })
    }

    @Test
    fun castPhasesStrikeXpMatchCatalog() {
        assertEquals(EngineDepth1.WAITING_END_PERMILLE, CastPhases.WAITING_END_PERMILLE)
        assertEquals(EngineDepth1.STRIKE_END_PERMILLE, CastPhases.STRIKE_END_PERMILLE)
        assertEquals(
            EngineDepth1.STRIKE_XP_PERFECT_PERMILLE,
            CastPhases.strikeXpMultPermille(CastPhase.STRIKE, TimingTier.PERFECT),
        )
        assertEquals(
            EngineDepth1.STRIKE_XP_GOOD_PERMILLE,
            CastPhases.strikeXpMultPermille(CastPhase.STRIKE, TimingTier.GOOD),
        )
    }

    @Test
    fun emitsCastPhaseAndStrikeReel() {
        val sim = newSim(7)
        Autopilot(sim).walkTo(-14250, 0)
        assertEquals("zone.pier_end", sim.state.player.zoneId)
        val spot = sim.state.fishingSpots.first { it.zoneId == "zone.pier_end" }
        spot.stock = maxOf(spot.stock, 3)

        repeat(5) { sim.step(emptyList()) }
        assertNotNull(sim.state.player.fishingSpecies)
        assertEquals(CastPhase.WAITING, sim.state.player.lastCastPhase)
        assertTrue(sim.state.stat(Stats.CAST_PHASE_TRANSITIONS) >= 1)

        val duration = sim.state.player.fishingCatchTicks
        val strikeStart = (CastPhases.WAITING_END_PERMILLE * duration + 999) / 1000
        while (sim.state.player.fishingProgress < strikeStart && sim.state.player.fishingSpecies != null) {
            sim.step(emptyList())
        }
        assertEquals(CastPhase.STRIKE, sim.state.player.lastCastPhase)

        val before = sim.state.stat(Stats.CAST_STRIKE_REELS)
        var guard = 0
        while (sim.state.player.fishingSpecies != null &&
            CastPhases.phaseAt(
                sim.state.player.fishingProgress,
                sim.state.player.fishingCatchTicks,
                sim.content,
                sim.state,
            ) == CastPhase.STRIKE &&
            guard++ < 200
        ) {
            val tier = FishingSystem.timingTierAt(
                sim.content, sim.state, sim.state.player.fishingProgress, sim.state.player.fishingCatchTicks,
            )
            if (tier != TimingTier.MISS) {
                val strike = sim.step(listOf(Command.Reel))
                assertTrue(strike.filterIsInstance<GameEvent.CastStrikeReel>().isNotEmpty())
                assertEquals(before + 1, sim.state.stat(Stats.CAST_STRIKE_REELS))
                return
            }
            sim.step(emptyList())
        }
        assertTrue(
            sim.state.player.lastCastPhase == CastPhase.FIGHT ||
                sim.state.stat(Stats.CAST_PHASE_TRANSITIONS) >= 2,
        )
    }

    @Test
    fun spoilEtaOnView() {
        val sim = newSim(3)
        sim.state.completedQuests.add("quest.first_ten_sales")
        val locked = sim.view()
        assertNull(locked.ticksUntilBagSpoil)
        assertEquals(1000, locked.bagSpoilPressurePermille)

        val sprat = Shared.content.species.first().id
        sim.state.player.bag.capacityUnits = 10
        sim.state.player.bag.add(sprat, 2)
        val v = sim.view()
        assertTrue(v.bagFishSpoilActive)
        assertNotNull(v.ticksUntilBagSpoil)
        assertEquals(
            EconomySystem.bagFishSpoilPeriodTicks(sim.content, sim.state) - sim.state.bagSpoilAccrualTicks,
            v.ticksUntilBagSpoil,
        )
        assertNull(v.castPhase)
    }
}
