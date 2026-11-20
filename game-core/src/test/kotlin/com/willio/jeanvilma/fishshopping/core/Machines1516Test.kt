package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Machines1516
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class Machines1516Test {
    private fun repoRoot(): File = generateSequence(File(".").canonicalFile) { it.parentFile }
        .first { File(it, "shared/ship/machines-15-16.json").isFile }

    @Test
    fun catalogLocksPhase9Floors() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, Machines1516.CATALOG).readText()).jsonObject
        assertEquals(Machines1516.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Machines1516.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Machines1516.MARKER, json.getValue("machines1516Marker").jsonPrimitive.content)
        assertEquals(Machines1516.MACHINE_COUNT, json.getValue("machineCount").jsonPrimitive.int)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(9, listing.getValue("machines1516Phase").jsonPrimitive.content.toInt())
        assertEquals(Machines1516.CATALOG, listing.getValue("machines1516Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentWiresNewMachinesRecipesAndPlots() {
        val root = repoRoot()
        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        val machines = pack.getValue("machines").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }.toSet()
        val upgrades = pack.getValue("upgrades").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }.toSet()
        val recipes = pack.getValue("recipes").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }.toSet()
        val products = pack.getValue("products").jsonArray.map { it.jsonObject.getValue("id").jsonPrimitive.content }.toSet()
        for (id in Machines1516.NEW_MACHINE_IDS) {
            assertTrue(machines.contains(id))
        }
        for (id in Machines1516.UNLOCK_UPGRADES) {
            assertTrue(upgrades.contains(id))
        }
        for (id in Machines1516.SAMPLE_RECIPES) {
            assertTrue(recipes.contains(id))
        }
        for (id in Machines1516.PRODUCTS) {
            assertTrue(products.contains(id))
        }
        val harbors = pack.getValue("harbors").jsonArray
        for (harbor in harbors) {
            val stations = harbor.jsonObject.getValue("stations").jsonArray
            val plots = harbor.jsonObject.getValue("plots").jsonArray
            for (machineId in Machines1516.NEW_MACHINE_IDS) {
                assertTrue(stations.any { it.jsonObject.getValue("machine").jsonPrimitive.content == machineId })
            }
            for (upgradeId in Machines1516.UNLOCK_UPGRADES) {
                assertTrue(plots.any { it.jsonObject.getValue("grantsUpgrade").jsonPrimitive.content == upgradeId })
            }
        }
        assertTrue(Machines1516.machinesEnough(machines.size))
    }

    @Test
    fun kickoffClosesMachinesRemaining() {
        val fx = Json.parseToJsonElement(File(repoRoot(), Machines1516.PARITY_FIXTURE).readText()).jsonObject
        assertEquals(Machines1516.MARKER, fx.getValue("machines1516Marker").jsonPrimitive.content)
        val kickoff = Json.parseToJsonElement(
            File(repoRoot(), "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("machinesRemaining").jsonPrimitive.int)
        assertEquals(14, kickoff.getValue("baseline").jsonObject.getValue("machines").jsonPrimitive.int)
    }
}
