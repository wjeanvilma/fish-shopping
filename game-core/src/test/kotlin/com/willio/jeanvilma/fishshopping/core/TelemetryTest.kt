package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.BalanceExport
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.Telemetry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TelemetryTest {
    @Test
    fun exportsAllKnownStatsWithoutForbiddenKeys() {
        val content = Shared.content
        val state = GameState.newGame(content, "harbor.sunrise_pier", 11)
        state.bumpStat(Stats.FISH_CAUGHT, 3)
        state.bumpStat(Stats.SALES, 2)
        state.recordSpeciesCatch("species.silver_sprat", 2)
        state.recordSpeciesCatch("species.copper_mullet", 1)
        val json = Telemetry.encode(content, state)
        assertTrue(json.contains("\"schema\":\"${Telemetry.SCHEMA}\""))
        assertTrue(json.contains("\"schema\":\"fish.telemetry.v2\""))
        assertTrue(json.contains("\"stat.fish_caught\":3"))
        assertTrue(json.contains("\"stat.sales\":2"))
        assertTrue(json.contains("\"species.silver_sprat\":2"))
        assertTrue(json.contains("\"speciesCatchSharePermille\""))
        for (key in Stats.ALL) {
            assertTrue("missing $key", json.contains("\"$key\""))
        }
        for (key in Telemetry.FORBIDDEN_KEYS) {
            assertFalse("leaked $key", json.contains("\"$key\""))
        }
        assertEquals(666L, Telemetry.speciesCatchSharePermille(state)["species.silver_sprat"])
        assertEquals(333L, Telemetry.speciesCatchSharePermille(state)["species.copper_mullet"])
    }

    @Test
    fun computesAbandonAndWageRatiosInPermille() {
        val state = GameState.newGame(Shared.content, "harbor.sunrise_pier", 11)
        assertEquals(0L, Telemetry.abandonPermille(state))
        assertEquals(0L, Telemetry.wageRatioPermille(state))
        state.bumpStat(Stats.SALES, 8)
        state.bumpStat(Stats.LOST_CUSTOMERS, 2)
        assertEquals(200L, Telemetry.abandonPermille(state))
        state.bumpStat(Stats.REVENUE, 100)
        state.bumpStat(Stats.WAGES_PAID, 25)
        assertEquals(250L, Telemetry.wageRatioPermille(state))
    }

    @Test
    fun balanceExportSurfacesEconomyAndPlayerKnobs() {
        val content = Shared.content
        val json = BalanceExport.encode(content)
        assertTrue(json.contains("\"schema\":\"${BalanceExport.SCHEMA}\""))
        assertTrue(json.contains("\"schema\":\"fish.balance.v2\""))
        assertTrue(json.contains("\"contentVersion\":\"${content.contentVersion}\""))
        assertTrue(json.contains("derivedRateFormulas"))
        assertTrue(json.contains("lost_customers"))
        assertTrue(json.contains("\"moveSpeedMmPerTick\":${content.player.moveSpeedMmPerTick}"))
        assertTrue(json.contains("\"maintenanceCoinsPerStation\":${content.economy.maintenanceCoinsPerStation}"))
        assertTrue(json.contains("maintenancePeriodTicks"))
        assertEquals(content.species.size, Regex("\"catchTicks\"").findAll(json).count())
        assertTrue(json.contains("\"bait\""))
        assertTrue(json.contains(content.bait.first().id))
        assertTrue(json.contains("\"trophies\""))
        assertTrue(json.contains(content.trophies.sets.first().id))
    }
}
