package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.customers.CustomerSystem
import com.willio.jeanvilma.fishshopping.core.ship.FestivalWeekends
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.world.SeasonalEventSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 16 — festival weekends. */
class FestivalWeekendsTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/festival-weekends.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, FestivalWeekends.CATALOG).readText()).jsonObject
        assertEquals(FestivalWeekends.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FestivalWeekends.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            FestivalWeekends.WEEKEND_EVENT_COUNT,
            json.getValue("weekendEventCount").jsonPrimitive.content.toInt(),
        )
        assertTrue(Shared.content.seasonalEvents.events.size >= 8)
        for (id in FestivalWeekends.EVENT_IDS) {
            assertTrue(id, Shared.content.seasonalEventsById.containsKey(id))
        }
        for (id in FestivalWeekends.FESTIVAL_CUSTOMER_IDS) {
            assertTrue(id, Shared.content.customersById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(16, listing.getValue("festivalWeekendsPhase").jsonPrimitive.content.toInt())
        assertEquals(FestivalWeekends.CATALOG, listing.getValue("festivalWeekendsCatalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(8, dod.getValue("quotas").jsonObject.getValue("seasonalEvents").jsonPrimitive.int)
    }

    @Test
    fun silverTideStacksCrowdPriceGatesCustomerAndView() {
        val fx = Json.parseToJsonElement(File(root, FestivalWeekends.PARITY_FIXTURE).readText()).jsonObject
        val expect = fx.getValue("expect").jsonObject
        val content = Shared.content
        val eventId = fx.getValue("eventId").jsonPrimitive.content
        val tick = fx.getValue("tickInWindow").jsonPrimitive.content.toLong()
        val guestId = fx.getValue("festivalCustomerId").jsonPrimitive.content
        val event = content.seasonalEventsById.getValue(eventId)

        assertEquals(
            expect.getValue("customerSpawnMultPermille").jsonPrimitive.int,
            event.customerSpawnMultPermille,
        )
        assertEquals(expect.getValue("priceMultPermille").jsonPrimitive.int, event.priceMultPermille)
        assertEquals(
            expect.getValue("speciesWeightSilverSprat").jsonPrimitive.int,
            SeasonalEventSystem.scaledWeight(1000, content, tick, "species.silver_sprat"),
        )
        assertEquals(
            event.customerSpawnMultPermille,
            SeasonalEventSystem.customerSpawnMultPermille(content, tick),
        )
        assertEquals(event.priceMultPermille, SeasonalEventSystem.priceMultPermille(content, tick))

        val harbor = content.harborsById.getValue(fx.getValue("harborId").jsonPrimitive.content)
        val sim = Simulation(
            content,
            GameState.newGame(content, harbor.id, fx.getValue("seed").jsonPrimitive.int),
        )
        val guest = content.customersById.getValue(guestId)
        sim.state.tick = tick
        assertTrue(
            CustomerSystem.effectiveSpawnWeight(content, sim.state, harbor, guest) >= 1,
        )
        sim.state.tick = tick - 1
        assertEquals(
            0,
            CustomerSystem.effectiveSpawnWeight(content, sim.state, harbor, guest),
        )

        // step() increments tick first — enter the window from tick-1.
        sim.state.tick = tick - 1
        sim.step()
        assertEquals(tick, sim.state.tick)
        val banner = sim.view().seasonalEvent
        assertNotNull(banner)
        assertEquals(eventId, banner!!.eventId)
        assertEquals(event.customerSpawnMultPermille, banner.customerSpawnMultPermille)
        assertEquals(event.priceMultPermille, banner.priceMultPermille)
        assertTrue(event.banner!! in sim.state.unlockedCosmetics)
    }
}
