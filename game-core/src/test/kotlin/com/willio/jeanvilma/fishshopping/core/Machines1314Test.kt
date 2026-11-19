package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Machines1314
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 15 — machines 13–14 + recipe graph. */
class Machines1314Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/machines-13-14.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Machines1314.CATALOG).readText()).jsonObject
        assertEquals(Machines1314.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Machines1314.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Machines1314.MARKER, json.getValue("machines1314Marker").jsonPrimitive.content)
        assertEquals(Machines1314.MACHINE_COUNT, json.getValue("machineCount").jsonPrimitive.int)
        assertEquals(2, json.getValue("newMachines").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(15, listing.getValue("machines1314Phase").jsonPrimitive.content.toInt())
        assertEquals(Machines1314.CATALOG, listing.getValue("machines1314Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentHasFourteenMachinesAndWiring() {
        assertTrue(Shared.content.machines.size >= 14)
        for (id in Machines1314.NEW_MACHINE_IDS) {
            assertTrue(id, Shared.content.machinesById.containsKey(id))
        }
        for (id in Machines1314.UNLOCK_UPGRADES) {
            assertTrue(id, Shared.content.upgradesById.containsKey(id))
        }
        for (id in Machines1314.SAMPLE_RECIPES) {
            assertTrue(id, Shared.content.recipesById.containsKey(id))
        }
        for (id in Machines1314.PRODUCTS) {
            assertTrue(id, Shared.content.productsById.containsKey(id))
        }
        for (harbor in Shared.content.harbors) {
            for (machineId in Machines1314.NEW_MACHINE_IDS) {
                assertTrue(
                    "${harbor.id}/$machineId",
                    harbor.stations.any { it.machine == machineId },
                )
            }
        }
        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish5Kickoff.CATALOG).readText()).jsonObject
        assertEquals(14, kickoff.getValue("baseline").jsonObject.getValue("machines").jsonPrimitive.int)
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("machinesRemaining").jsonPrimitive.int)
    }

    @Test
    fun poacherFixtureUnlocksAndCooks() {
        val fx = Json.parseToJsonElement(File(repoRoot(), Machines1314.PARITY_FIXTURE).readText()).jsonObject
        val setup = fx.getValue("setup").jsonObject
        val build = fx.getValue("build").jsonObject
        val process = fx.getValue("process").jsonObject
        val walk = process.getValue("walkTo").jsonObject
        val sim = Simulation(
            Shared.content,
            GameState.newGame(
                Shared.content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.coins = setup.getValue("coins").jsonPrimitive.content.toLong()
        for (q in setup.getValue("completedQuests").jsonArray) {
            sim.state.completedQuests += q.jsonPrimitive.content
        }
        for (u in setup.getValue("ownedUpgrades").jsonArray) {
            sim.state.ownedUpgrades += u.jsonPrimitive.content
        }

        val poacher = sim.state.machines.first { it.stationId == build.getValue("stationId").jsonPrimitive.content }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, poacher.status)

        val plotId = build.getValue("plotId").jsonPrimitive.content
        val plot = sim.harbor.plotsById.getValue(plotId)
        val zone = sim.harbor.zonesById.getValue(plot.zone)
        Autopilot(sim).walkTo(zone.rect.centerX, zone.rect.centerZ)
        val bought = sim.checkedStep(
            listOf(Command.BuildPlot(plotId, build.getValue("requestId").jsonPrimitive.content)),
        )
        assertTrue(bought.filterIsInstance<GameEvent.PlotBuilt>().any { !it.replayed })
        assertTrue(build.getValue("expectUpgrade").jsonPrimitive.content in sim.state.ownedUpgrades)

        Autopilot(sim).walkTo(
            walk.getValue("x").jsonPrimitive.content.toInt(),
            walk.getValue("z").jsonPrimitive.content.toInt(),
        )
        assertEquals(walk.getValue("expectZone").jsonPrimitive.content, sim.state.player.zoneId)
        val bag = process.getValue("bagAfterUnlock").jsonObject
        for ((item, qty) in bag) {
            sim.state.player.bag.add(item, qty.jsonPrimitive.content.toInt())
        }
        repeat(40) { sim.checkedStep() }
        assertEquals(0, sim.state.player.bag.quantity("product.fillet"))
        poacher.preferredRecipeId = process.getValue("preferredRecipeId").jsonPrimitive.content
        repeat(180) { sim.checkedStep() }
        val expectOut = process.getValue("expectOutput").jsonObject
        assertEquals(
            expectOut.getValue("quantity").jsonPrimitive.content.toInt(),
            poacher.output.quantity(expectOut.getValue("item").jsonPrimitive.content),
        )
    }
}
