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
        val json = Telemetry.encode(content, state)
        assertTrue(json.contains("\"schema\":\"${Telemetry.SCHEMA}\""))
        assertTrue(json.contains("\"stat.fish_caught\":3"))
        assertTrue(json.contains("\"stat.sales\":2"))
        for (key in Stats.ALL) {
            assertTrue("missing $key", json.contains("\"$key\""))
        }
        for (key in Telemetry.FORBIDDEN_KEYS) {
            assertFalse("leaked $key", json.contains("\"$key\""))
        }
    }

    @Test
    fun balanceExportSurfacesEconomyAndPlayerKnobs() {
        val content = Shared.content
        val json = BalanceExport.encode(content)
        assertTrue(json.contains("\"schema\":\"${BalanceExport.SCHEMA}\""))
        assertTrue(json.contains("\"contentVersion\":\"${content.contentVersion}\""))
        assertTrue(json.contains("\"moveSpeedMmPerTick\":${content.player.moveSpeedMmPerTick}"))
        assertTrue(json.contains("\"maintenanceCoinsPerStation\":${content.economy.maintenanceCoinsPerStation}"))
        assertTrue(json.contains("maintenancePeriodTicks"))
        assertEquals(content.species.size, Regex("\"catchTicks\"").findAll(json).count())
    }
}
