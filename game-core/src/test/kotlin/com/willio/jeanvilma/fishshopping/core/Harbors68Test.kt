package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Harbors68
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
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

/** Finish 2.0 Phase 8 — harbors 6–8 travel circuit. */
class Harbors68Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/harbors-6-8.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/harbors-6-8.json").readText()).jsonObject
        assertEquals(Harbors68.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Harbors68.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Harbors68.HARBOR_COUNT, json.getValue("harborCount").jsonPrimitive.content.toInt())
        assertEquals(3, json.getValue("newHarbors").jsonArray.size)
        assertEquals(8, Shared.content.harbors.size)
        for (id in Harbors68.NEW_HARBOR_IDS) {
            assertTrue(id, Shared.content.harborsById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(8, listing.getValue("harbors68Phase").jsonPrimitive.content.toInt())
        assertEquals(Harbors68.CATALOG, listing.getValue("harbors68Catalog").jsonPrimitive.content)
    }

    @Test
    fun travelFixtureUnlocksSixSevenEightCircuit() {
        val fx = Json.parseToJsonElement(File(root, Harbors68.TRAVEL_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, fx.getValue("harborId").jsonPrimitive.content, fx.getValue("seed").jsonPrimitive.int),
        )
        for (q in setup.getValue("completedQuests").jsonArray) {
            sim.state.completedQuests += q.jsonPrimitive.content
        }
        for (p in setup.getValue("completedPrestige").jsonArray) {
            sim.state.completedPrestige += p.jsonPrimitive.content
        }
        for (c in setup.getValue("unlockedCosmetics").jsonArray) {
            sim.state.unlockedCosmetics += c.jsonPrimitive.content
        }
        sim.state.stats[Stats.HARBORS_TRAVELED] = setup.getValue("harborsTraveled").jsonPrimitive.content.toLong()

        for (step in fx.getValue("travels").jsonArray) {
            val o = step.jsonObject
            val harborId = o.getValue("harborId").jsonPrimitive.content
            val requestId = o.getValue("requestId").jsonPrimitive.content
            assertTrue(sim.view().harbors.first { it.harborId == harborId }.travelEnabled)
            val events = sim.checkedStep(listOf(Command.TravelToHarbor(harborId, requestId)))
            assertTrue(
                events.filterIsInstance<GameEvent.HarborTraveled>().any { !it.replayed && it.toHarborId == harborId },
            )
            assertEquals(harborId, sim.state.harborId)
            assertEquals(o.getValue("expectBlockout").jsonPrimitive.content, sim.view().blockoutAsset)
            // Prestige/quest grants evaluate on the travel step and subsequent idle steps.
            repeat(2) { sim.checkedStep() }
            assertTrue(o.getValue("expectQuest").jsonPrimitive.content in sim.state.completedQuests)
            assertTrue(o.getValue("expectPrestige").jsonPrimitive.content in sim.state.completedPrestige)
            assertTrue(o.getValue("expectBanner").jsonPrimitive.content in sim.state.unlockedCosmetics)
        }

        val fin = fx.getValue("expectFinal").jsonObject
        assertEquals(fin.getValue("harborId").jsonPrimitive.content, sim.state.harborId)
        assertEquals(
            fin.getValue("harborsTraveled").jsonPrimitive.content.toLong(),
            sim.state.stat(Stats.HARBORS_TRAVELED),
        )
        assertEquals(fin.getValue("blockoutAsset").jsonPrimitive.content, sim.view().blockoutAsset)
        assertEquals(
            fin.getValue("specializationId").jsonPrimitive.content,
            Shared.content.harborsById.getValue(sim.state.harborId).specialization!!.id,
        )
        for (id in Harbors68.CIRCUIT_PRESTIGE) {
            assertTrue(id, id in sim.state.completedPrestige)
        }
        for (id in Harbors68.LANDING_QUESTS) {
            assertTrue(id, id in sim.state.completedQuests)
        }
    }
}
