package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.LoadtestBanks
import java.io.File
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class LoadtestBanksTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/content/content-pack.json").isFile }

    @Test
    fun banksExistAboveFloorAndMatchSchemas() {
        val root = repoRoot()
        val (save, tele) = LoadtestBanks.measureFromRepo(root)
        assertTrue("save bytes=${save.bytes}", save.bytes >= LoadtestBanks.MIN_BYTES)
        assertTrue("tele bytes=${tele.bytes}", tele.bytes >= LoadtestBanks.MIN_BYTES)
        assertEquals(LoadtestBanks.SAVE_SCHEMA, save.schema)
        assertEquals(LoadtestBanks.TELEMETRY_SCHEMA, tele.schema)
        assertEquals("records", save.sampleKey)
        assertEquals("events", tele.sampleKey)
        assertTrue(save.floorsMet && tele.floorsMet)
    }

    @Test
    fun pinAndCatalogWireBothApps() {
        val root = repoRoot()
        assertTrue(File(root, LoadtestBanks.CATALOG).isFile)
        assertTrue(File(root, LoadtestBanks.PARITY_FIXTURE).isFile)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        val fixtures = pin.getValue("fixtures").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fixtures.contains("loadtest-save-bank.json"))
        assertTrue(fixtures.contains("loadtest-telemetry-bank.json"))
        assertTrue(fixtures.contains("parity-loadtest-banks.json"))
        assertEquals(
            LoadtestBanks.CATALOG,
            pin.getValue("loadtestBanks").jsonPrimitive.content,
        )
        assertTrue(
            File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/game/GameViewModel.kt").isFile,
        )
        assertTrue(File(root, "web/src/game/GameHost.ts").isFile)
    }
}
