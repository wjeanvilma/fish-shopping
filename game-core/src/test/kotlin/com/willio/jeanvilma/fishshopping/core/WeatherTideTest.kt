package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.WeatherTide
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.world.WeatherSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 13 — weather + tide. */
class WeatherTideTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/weather-tide.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/weather-tide.json").readText()).jsonObject
        assertEquals(WeatherTide.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WeatherTide.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WeatherTide.WEATHER_PATTERN_COUNT, json.getValue("weatherPatternCount").jsonPrimitive.content.toInt())
        assertEquals(WeatherTide.TIDE_PHASE_COUNT, json.getValue("tidePhaseCount").jsonPrimitive.content.toInt())
        assertEquals(5, Shared.content.weather.patterns.size)
        assertEquals(4, Shared.content.weather.tide.phases.size)
        for (id in WeatherTide.PATTERN_IDS) {
            assertTrue(id, Shared.content.weatherPatternsById.containsKey(id))
        }
        for (id in WeatherTide.TIDE_PHASE_IDS) {
            assertTrue(id, Shared.content.tidePhasesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(13, listing.getValue("weatherTidePhase").jsonPrimitive.content.toInt())
        assertEquals(WeatherTide.CATALOG, listing.getValue("weatherTideCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(5, dod.getValue("quotas").jsonObject.getValue("weatherPatterns").jsonPrimitive.int)
        assertEquals(4, dod.getValue("quotas").jsonObject.getValue("tidePhases").jsonPrimitive.int)
    }

    @Test
    fun parityFixtureRotatesWeatherAndUpdatesView() {
        val fx = Json.parseToJsonElement(File(root, WeatherTide.PARITY_FIXTURE).readText()).jsonObject
        val at0 = fx.getValue("expectAtTick0").jsonObject
        val after = fx.getValue("expectAfterAdvance").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.tick = 0
        assertEquals(at0.getValue("weatherId").jsonPrimitive.content, WeatherSystem.weatherAt(Shared.content, 0).id)
        assertEquals(at0.getValue("tidePhaseId").jsonPrimitive.content, WeatherSystem.tidePhaseAt(Shared.content, 0).id)
        assertEquals(
            at0.getValue("weatherTicksRemaining").jsonPrimitive.int,
            WeatherSystem.ticksUntilWeatherChange(Shared.content, 0),
        )
        val view0 = sim.view()
        assertEquals(at0.getValue("weatherId").jsonPrimitive.content, view0.weatherId)
        assertEquals(at0.getValue("tidePhaseId").jsonPrimitive.content, view0.tidePhaseId)
        assertTrue(view0.weatherName.isNotBlank())
        assertTrue(view0.tidePhaseName.isNotBlank())

        sim.state.tick = fx.getValue("advanceToTick").jsonPrimitive.int.toLong() - 1
        val events = sim.checkedStep()
        assertEquals(fx.getValue("advanceToTick").jsonPrimitive.int.toLong(), sim.state.tick)
        assertEquals(
            after.getValue("weatherId").jsonPrimitive.content,
            WeatherSystem.weatherAt(Shared.content, sim.state.tick).id,
        )
        assertTrue(
            events.filterIsInstance<GameEvent.WeatherChanged>().any {
                it.weatherId == after.getValue("eventWeatherId").jsonPrimitive.content
            },
        )
        assertTrue(WeatherSystem.catchSpeedMultPermille(Shared.content, sim.state) >= 1)
    }
}
