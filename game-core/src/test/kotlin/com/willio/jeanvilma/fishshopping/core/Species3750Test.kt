package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Species3750
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 9 — species 37–50 + bait ladder. */
class Species3750Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/species-37-50.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/species-37-50.json").readText()).jsonObject
        assertEquals(Species3750.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Species3750.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Species3750.SPECIES_COUNT, json.getValue("speciesCount").jsonPrimitive.content.toInt())
        assertEquals(Species3750.BAIT_COUNT, json.getValue("baitCount").jsonPrimitive.content.toInt())
        assertEquals(7, json.getValue("newBaseSpecies").jsonArray.size)
        assertEquals(7, json.getValue("newRareSpecies").jsonArray.size)
        assertEquals(5, json.getValue("newBaits").jsonArray.size)
        assertEquals(50, Shared.content.species.size)
        assertTrue(Shared.content.bait.size >= 8)
        for (id in Species3750.NEW_BASE_IDS + Species3750.NEW_RARE_IDS) {
            assertTrue(id, Shared.content.speciesById.containsKey(id))
        }
        for (id in Species3750.NEW_BAIT_IDS) {
            assertTrue(id, Shared.content.baitById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(9, listing.getValue("species3750Phase").jsonPrimitive.content.toInt())
        assertEquals(Species3750.CATALOG, listing.getValue("species3750Catalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(50, dod.getValue("quotas").jsonObject.getValue("speciesMin").jsonPrimitive.int)
    }

    @Test
    fun baitFixtureBuysBrinePasteAtKiosk() {
        val fx = Json.parseToJsonElement(File(root, Species3750.BAIT_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val walk = setup.getValue("walkTo").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.coins = setup.getValue("coins").jsonPrimitive.content.toLong()
        for (u in setup.getValue("ownedUpgrades").jsonArray) {
            sim.state.ownedUpgrades += u.jsonPrimitive.content
        }
        Autopilot(sim).walkTo(
            walk.getValue("x").jsonPrimitive.content.toInt(),
            walk.getValue("z").jsonPrimitive.content.toInt(),
        )
        assertEquals(walk.getValue("expectZone").jsonPrimitive.content, sim.state.player.zoneId)

        val offers = sim.view().baitOffers
        assertEquals(Shared.content.bait.size, offers.size)
        assertTrue(offers.any { it.id == "bait.brine_paste" && it.purchasable })

        for (step in fx.getValue("purchases").jsonArray) {
            val o = step.jsonObject
            val baitId = o.getValue("baitId").jsonPrimitive.content
            val requestId = o.getValue("requestId").jsonPrimitive.content
            val events = sim.checkedStep(listOf(Command.BuyBait(baitId, requestId)))
            assertTrue(
                events.filterIsInstance<GameEvent.BaitPurchased>().any { !it.replayed && it.baitId == baitId },
            )
            assertEquals(o.getValue("expectPreferred").jsonPrimitive.content, sim.state.player.preferredBaitId)
            assertTrue(sim.state.player.bag.quantity(baitId) > 0)
        }

        val fin = fx.getValue("expectFinal").jsonObject
        assertEquals(fin.getValue("speciesCount").jsonPrimitive.content.toInt(), Shared.content.species.size)
        assertEquals(fin.getValue("baitCount").jsonPrimitive.content.toInt(), Shared.content.bait.size)
        assertTrue(
            sim.state.player.bag.quantity(fin.getValue("baitOwned").jsonPrimitive.content) > 0,
        )
    }
}
