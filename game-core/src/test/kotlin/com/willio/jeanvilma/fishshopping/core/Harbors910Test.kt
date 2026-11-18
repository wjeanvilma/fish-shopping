package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Harbors910
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

/** Finish 4.0 Phase 12 — harbors 9–10 travel circuit. */
class Harbors910Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/harbors-9-10.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, Harbors910.CATALOG).readText()).jsonObject
        assertEquals(Harbors910.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Harbors910.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Harbors910.MARKER, json.getValue("harbors910Marker").jsonPrimitive.content)
        assertEquals(Harbors910.HARBOR_COUNT, json.getValue("harborCount").jsonPrimitive.content.toInt())
        assertEquals(2, json.getValue("newHarbors").jsonArray.size)
        assertTrue(Shared.content.harbors.size >= 10)
        for (id in Harbors910.NEW_HARBOR_IDS) {
            assertTrue(id, Shared.content.harborsById.containsKey(id))
        }
        for (id in Harbors910.CIRCUIT_PRESTIGE) {
            assertTrue(id, Shared.content.prestigeMilestonesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(12, listing.getValue("harbors910Phase").jsonPrimitive.content.toInt())
        assertEquals(Harbors910.CATALOG, listing.getValue("harbors910Catalog").jsonPrimitive.content)

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(10, kickoff.getValue("baseline").jsonObject.getValue("authoredHarbors").jsonPrimitive.int)
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("authoredHarborsRemaining").jsonPrimitive.int)
    }

    @Test
    fun travelFixtureUnlocksNineTenCircuit() {
        val fx = Json.parseToJsonElement(File(root, Harbors910.TRAVEL_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
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
            repeat(2) { sim.checkedStep() }
            assertTrue(o.getValue("expectQuest").jsonPrimitive.content in sim.state.completedQuests)
            assertTrue(o.getValue("expectPrestige").jsonPrimitive.content in sim.state.completedPrestige)
            assertTrue(o.getValue("expectBanner").jsonPrimitive.content in sim.state.unlockedCosmetics)
        }

        val expect = fx.getValue("expectFinal").jsonObject
        assertEquals(expect.getValue("harborId").jsonPrimitive.content, sim.state.harborId)
        assertEquals(
            expect.getValue("harborsTraveled").jsonPrimitive.content.toLong(),
            sim.state.stats[Stats.HARBORS_TRAVELED],
        )
        assertEquals(
            expect.getValue("specializationId").jsonPrimitive.content,
            Shared.content.harborsById.getValue(sim.state.harborId).specialization?.id,
        )
        assertEquals(expect.getValue("blockoutAsset").jsonPrimitive.content, sim.view().blockoutAsset)
    }
}
