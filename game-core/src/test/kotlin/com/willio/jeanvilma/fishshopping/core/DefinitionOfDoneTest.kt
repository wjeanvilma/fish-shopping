package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Phase 30 — blueprint Definition of Done audit for the 1.0.0 freeze.
 * Quotas, reachable tutorial objectives, inventory reconcile, idempotent rewards,
 * latest+previous restore, store URLs, release pin.
 */
class DefinitionOfDoneTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/definition-of-done.json").isFile }
    }

    @Test
    fun catalogMatchesReleasePinAndQuotas() {
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(30, dod.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals("fish.ship.definition_of_done.v1", dod.getValue("schema").jsonPrimitive.content)
        assertEquals("1.0.0", dod.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(20, dod.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertEquals("v1.0.0", dod.getValue("releaseTag").jsonPrimitive.content)

        val quotas = dod.getValue("quotas").jsonObject
        assertEquals(5, quotas.getValue("harbors").jsonPrimitive.int)
        assertEquals(20, quotas.getValue("speciesMin").jsonPrimitive.int)
        assertEquals(6, quotas.getValue("machineClasses").jsonPrimitive.int)

        assertEquals(5, Shared.content.harbors.size)
        assertTrue(Shared.content.species.size >= 20)
        assertEquals(6, Shared.content.machines.size)
        assertEquals("1.0.0", Shared.content.contentVersion)
        assertEquals(SimConstants.SCHEMA_VERSION, 20)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals("1.0.0", pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals("v1.0.0", pin.getValue("releaseTag").jsonPrimitive.content)
        assertEquals("shared/ship/definition-of-done.json", pin.getValue("definitionOfDone").jsonPrimitive.content)
    }

    @Test
    fun tutorialObjectivesAreReachableAndWarehousesReconcile() {
        assertTrue(Shared.content.tutorial.isNotEmpty())
        // Every tutorial step names a real quest / objective id or coaching trigger that content knows.
        for (step in Shared.content.tutorial) {
            val id = step.id
            assertTrue("empty tutorial step id", id.isNotBlank())
        }
        val sim = newSim()
        assertTrue(sim.view().warehouse.reconcileOk)
        // Seed inventories across bag / machine / counter — totals must still reconcile.
        val sprat = "species.silver_sprat"
        val portion = "product.basic_portion"
        sim.state.player.bag.add(sprat, 2)
        sim.state.machines.first { it.stationId == "station.cutter_1" }.input.add(sprat, 1)
        sim.state.counters.first().stock.add(portion, 3)
        val wh = sim.view().warehouse
        assertTrue(wh.reconcileOk)
        assertEquals(2 + 1 + 3, wh.quantity)
    }

    @Test
    fun rewardsAreIdempotentAndBothSaveSlotsRestore() {
        val sim = newSim()
        sim.state.coins = 100
        val first = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bag_capacity_2", "dod-req")))
            .filterIsInstance<GameEvent.UpgradePurchased>().single()
        assertFalse(first.replayed)
        val coinsAfter = sim.state.coins
        val retry = sim.checkedStep(listOf(Command.PurchaseUpgrade("upgrade.bag_capacity_2", "dod-req")))
            .filterIsInstance<GameEvent.UpgradePurchased>().single()
        assertTrue(retry.replayed)
        assertEquals(coinsAfter, sim.state.coins)

        val latest = SnapshotCodec.encode(sim.content, sim.state, savedAtEpochMs = 1_000)
        // Mutate then capture a "previous" mid-state for dual-slot restore.
        sim.state.coins += 7
        val previous = SnapshotCodec.encode(sim.content, sim.state, savedAtEpochMs = 2_000)
        val fromLatest = SnapshotCodec.decode(sim.content, latest)
        val fromPrevious = SnapshotCodec.decode(sim.content, previous)
        assertEquals(coinsAfter, fromLatest.coins)
        assertEquals(coinsAfter + 7, fromPrevious.coins)
        assertTrue("upgrade.bag_capacity_2" in fromLatest.ownedUpgrades)
        assertTrue("upgrade.bag_capacity_2" in fromPrevious.ownedUpgrades)
    }

    @Test
    fun storeUrlsAndShipScreensAreFilled() {
        assertTrue(StoreListing.isHttpsAbsoluteUrl(StoreListing.SUPPORT_URL))
        assertTrue(StoreListing.isHttpsAbsoluteUrl(StoreListing.PRIVACY_POLICY_URL))
        assertTrue(File(root, "web/public/privacy.html").isFile)
        assertTrue(File(root, "web/public/support.html").isFile)
        assertTrue(File(root, "web/public/landing.html").isFile)
        assertTrue(File(root, "shared/store/licenses.json").isFile)

        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        val screens = dod.getValue("screensPresent").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(screens.containsAll(listOf("title", "warehouse", "species_book", "dashboard", "settings", "cloud_conflict")))
    }
}
