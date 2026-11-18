package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.content.ItemQuantity
import com.willio.jeanvilma.fishshopping.core.customers.RivalMarketSystem
import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.RivalMarkets
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.StepContext
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 14 — rival NPC markets. */
class RivalMarketsTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/rival-markets.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, RivalMarkets.CATALOG).readText()).jsonObject
        assertEquals(RivalMarkets.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(RivalMarkets.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(RivalMarkets.MARKER, json.getValue("rivalMarketsMarker").jsonPrimitive.content)
        assertEquals(RivalMarkets.RIVAL_COUNT, json.getValue("rivalCount").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(14, listing.getValue("rivalMarketsPhase").jsonPrimitive.content.toInt())
        assertEquals(RivalMarkets.CATALOG, listing.getValue("rivalMarketsCatalog").jsonPrimitive.content)
    }

    @Test
    fun contentHasEightRivalsCoveringHarbors() {
        assertEquals(8, Shared.content.rivalMarkets.rivals.size)
        for (id in RivalMarkets.RIVAL_IDS) {
            assertTrue(id, Shared.content.rivalsById.containsKey(id))
        }
        val covered = Shared.content.rivalMarkets.rivals.flatMap { it.harbors }.toSet()
        for (harbor in Shared.content.harbors) {
            assertTrue(harbor.id, harbor.id in covered)
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish3Kickoff.CATALOG).readText()).jsonObject
        assertTrue(
            kickoff.getValue("baseline").jsonObject
                .getValue("measuredAtPhase").jsonPrimitive.int >= 14,
        )
    }

    @Test
    fun sunrisePressuresThenBeatsWhenStocked() {
        val fx = Json.parseToJsonElement(File(repoRoot(), RivalMarkets.PARITY_FIXTURE).readText()).jsonObject
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
        // Rivals stay quiet until the scripted tutorial finishes.
        sim.state.tutorialIndex = Shared.content.tutorial.size
        repeat(setup.getValue("advanceTicks").jsonPrimitive.int) { sim.checkedStep() }
        val rivalId = expectActive.getValue("rivalId").jsonPrimitive.content
        assertTrue(
            RivalMarketSystem.activeRivals(Shared.content, sim.state, sim.state.harborId)
                .any { it.id == rivalId },
        )
        assertEquals(
            expectActive.getValue("pressureWhenEmpty").jsonPrimitive.content.toBoolean(),
            RivalMarketSystem.isPressuring(Shared.content, sim.state, sim.state.harborId),
        )
        assertTrue(rivalId in sim.view().activeRivalIds)
        assertTrue(sim.view().rivalPressureActive)

        val counterId = stock.getValue("counterId").jsonPrimitive.content
        val productId = stock.getValue("productId").jsonPrimitive.content
        val qty = stock.getValue("quantity").jsonPrimitive.int
        sim.state.counters.first { it.counterId == counterId }.stock.add(productId, qty) // portions pad
        assertFalse(RivalMarketSystem.isPressuring(Shared.content, sim.state, sim.state.harborId))

        val ctx = StepContext(Shared.content, sim.state)
        RivalMarketSystem.noteSaleOutcome(ctx, listOf(ItemQuantity(productId, 1)))
        assertTrue(sim.state.stat(Stats.RIVAL_BEATS) >= 1L)
        assertTrue(rivalId in sim.state.beatenRivalIds)
        assertTrue(ctx.events.filterIsInstance<GameEvent.RivalBeaten>().isNotEmpty())
    }
}
