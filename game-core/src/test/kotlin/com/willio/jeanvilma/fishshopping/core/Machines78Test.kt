package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Machines78
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
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

/** Finish 2.0 Phase 10 — machines 7–8 + recipe graph. */
class Machines78Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/machines-7-8.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/machines-7-8.json").readText()).jsonObject
        assertEquals(Machines78.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Machines78.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Machines78.MACHINE_COUNT, json.getValue("machineCount").jsonPrimitive.content.toInt())
        assertEquals(2, json.getValue("newMachines").jsonArray.size)
        assertEquals(8, Shared.content.machines.size)
        for (id in Machines78.NEW_MACHINE_IDS) {
            assertTrue(id, Shared.content.machinesById.containsKey(id))
        }
        for (id in Machines78.UNLOCK_UPGRADES) {
            assertTrue(id, Shared.content.upgradesById.containsKey(id))
        }
        for (harbor in Shared.content.harbors) {
            for (machineId in Machines78.NEW_MACHINE_IDS) {
                assertTrue(
                    "${harbor.id}/$machineId",
                    harbor.stations.any { it.machine == machineId },
                )
            }
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(10, listing.getValue("machines78Phase").jsonPrimitive.content.toInt())
        assertEquals(Machines78.CATALOG, listing.getValue("machines78Catalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(8, dod.getValue("quotas").jsonObject.getValue("machineClasses").jsonPrimitive.int)
    }

    @Test
    fun steamerFixtureUnlocksAndCooksWithReconcile() {
        val fx = Json.parseToJsonElement(File(root, Machines78.RECIPE_FIXTURE).readText()).jsonObject
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

        val steamer = sim.state.machines.first { it.stationId == build.getValue("stationId").jsonPrimitive.content }
        sim.checkedStep()
        assertEquals(MachineStatus.LOCKED, steamer.status)

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
        steamer.preferredRecipeId = process.getValue("preferredRecipeId").jsonPrimitive.content
        repeat(150) { sim.checkedStep() }
        val expectOut = process.getValue("expectOutput").jsonObject
        assertEquals(
            expectOut.getValue("quantity").jsonPrimitive.content.toInt(),
            steamer.output.quantity(expectOut.getValue("item").jsonPrimitive.content),
        )

        val fin = fx.getValue("expectFinal").jsonObject
        assertEquals(fin.getValue("machineCount").jsonPrimitive.content.toInt(), Shared.content.machines.size)
        assertTrue(fin.getValue("ownedUpgrade").jsonPrimitive.content in sim.state.ownedUpgrades)
        assertEquals(fin.getValue("reconcileOk").jsonPrimitive.content.toBoolean(), sim.view().warehouse.reconcileOk)
    }
}
