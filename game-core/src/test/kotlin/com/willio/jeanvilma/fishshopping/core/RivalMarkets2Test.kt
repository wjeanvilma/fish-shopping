package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.customers.RivalMarketSystem
import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.RivalMarkets2
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 15 — rival markets 8→12 + AI depth. */
class RivalMarkets2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/rival-markets-2.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, RivalMarkets2.CATALOG).readText()).jsonObject
        assertEquals(RivalMarkets2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(RivalMarkets2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            RivalMarkets2.RIVAL_MARKETS_2_MARKER,
            json.getValue("rivalMarkets2Marker").jsonPrimitive.content,
        )
        assertEquals(RivalMarkets2.RIVAL_COUNT, json.getValue("rivalCount").jsonPrimitive.int)
        assertEquals(4, json.getValue("newRivalIds").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(15, listing.getValue("rivalMarkets2Phase").jsonPrimitive.content.toInt())
        assertEquals(RivalMarkets2.CATALOG, listing.getValue("rivalMarkets2Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentHasTwelveRivalsWithAiDepth() {
        assertTrue(Shared.content.rivalMarkets.rivals.size >= 12)
        for (id in RivalMarkets2.NEW_RIVAL_IDS) {
            assertTrue(id, Shared.content.rivalsById.containsKey(id))
        }
        for (rival in Shared.content.rivalMarkets.rivals) {
            assertTrue(rival.id, rival.aiProfile in RivalMarkets2.AI_PROFILES)
        }
        assertEquals(
            RivalMarkets2.ADAPTIVE_AGGRESSION_BOOST,
            Shared.content.rivalMarkets.adaptiveAggressionBoostPermille,
        )
        assertEquals(
            RivalMarkets2.MULTI_RIVAL_PRESSURE_EXTRA,
            Shared.content.rivalMarkets.multiRivalPressureExtraMultPermille,
        )
        val covered = Shared.content.rivalMarkets.rivals.flatMap { it.harbors }.toSet()
        for (harbor in Shared.content.harbors) {
            assertTrue(harbor.id, harbor.id in covered)
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            12,
            kickoff.getValue("baseline").jsonObject.getValue("rivalMarkets").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun mistMultiRivalPressureThenBeats() {
        val fx = Json.parseToJsonElement(File(repoRoot(), RivalMarkets2.PARITY_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val expectActive = fx.getValue("expectActive").jsonObject
        val stock = fx.getValue("stockAndSell").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.tutorialIndex = Shared.content.tutorial.size
        setup["completedQuests"]?.jsonArray?.forEach {
            sim.state.completedQuests += it.jsonPrimitive.content
        }
        repeat(setup.getValue("advanceTicks").jsonPrimitive.int) { sim.checkedStep() }

        val activeIds = RivalMarketSystem.activeRivals(Shared.content, sim.state, sim.state.harborId)
            .map { it.id }
            .toSet()
        for (idEl in expectActive.getValue("rivalIds").jsonArray) {
            assertTrue(idEl.jsonPrimitive.content in activeIds)
        }
        assertTrue(RivalMarketSystem.isPressuring(Shared.content, sim.state, sim.state.harborId))
        val pressuring = RivalMarketSystem.pressuringRivals(Shared.content, sim.state, sim.state.harborId)
        assertTrue(pressuring.size >= 2)
        val spawn = RivalMarketSystem.customerSpawnMultPermille(
            Shared.content,
            sim.state,
            sim.state.harborId,
        )
        assertTrue(spawn < Shared.content.rivalMarkets.pressureSpawnMultPermille)

        val productId = stock.getValue("productId").jsonPrimitive.content
        val qty = stock.getValue("quantity").jsonPrimitive.int
        val counterId = stock.getValue("counterId").jsonPrimitive.content
        sim.state.counters.first { it.counterId == counterId }.stock.add(productId, qty)
        val ctx = StepContext(Shared.content, sim.state)
        RivalMarketSystem.noteSaleOutcome(ctx, listOf(ItemQuantity(productId, 1)))
        assertTrue(sim.state.stat(Stats.RIVAL_BEATS) >= 1L)
        assertTrue(stock.getValue("expectBeatRivalId").jsonPrimitive.content in sim.state.beatenRivalIds)
    }
}
