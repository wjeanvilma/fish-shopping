package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ParityLock2
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 29 — Parity lock 2.0 ship + expanded suites. */
class ParityLock2CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ParityLock2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, ParityLock2.CATALOG).readText()).jsonObject
        assertEquals(ParityLock2.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock2.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(ParityLock2.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(ParityLock2.SUITE_FLOOR, ship.getValue("suiteFloor").jsonPrimitive.int)
        assertEquals(ParityLock2.FINISH2_SUITE_FLOOR, ship.getValue("finish2SuiteFloor").jsonPrimitive.int)
        assertEquals(ParityLock2.PARITY_LOCK_CATALOG, ship.getValue("parityLockCatalog").jsonPrimitive.content)
        assertEquals(23, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(
            ParityLock2.PARITY_LOCK_2_MARKER,
            ship.getValue("parityLock2Marker").jsonPrimitive.content,
        )
    }

    @Test
    fun parityLockIncludesFinish2Suites() {
        val root = repoRoot()
        val lock = Json.parseToJsonElement(File(root, ParityLock2.PARITY_LOCK_CATALOG).readText()).jsonObject
        assertEquals(27, lock.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(29, lock.getValue("finish2ParityLockPhase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock.FINISH2_PARITY_LOCK_PHASE, 29)
        assertEquals(ParityLock2.CATALOG, lock.getValue("parityLock2Catalog").jsonPrimitive.content)

        val suiteIds = lock.getValue("suites").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(suiteIds.containsAll(ParityLock2.REQUIRED_BASELINE_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock2.REQUIRED_FINISH2_SUITE_IDS))
        assertTrue(suiteIds.size >= ParityLock2.SUITE_FLOOR)
        assertEquals(ParityLock.SUITE_IDS, suiteIds)

        val gates = lock.getValue("gates").jsonObject
        assertTrue(gates.getValue("achievementsIdempotent").jsonPrimitive.boolean)
        assertTrue(gates.getValue("weatherDeterministicFromTick").jsonPrimitive.boolean)
        assertTrue(gates.getValue("masteryXpOnCatch").jsonPrimitive.boolean)
        assertTrue(gates.getValue("festivalTipsCatalogDriven").jsonPrimitive.boolean)

        for (path in ParityLock2.FINISH2_FIXTURES) {
            assertTrue(File(root, path).isFile)
        }

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(29, listing.getValue("parityLock2Phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock2.CATALOG, listing.getValue("parityLock2Catalog").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(ParityLock2.CATALOG, pin.getValue("parityLock2").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-parity-lock-2.0.json"
            },
        )
    }
}
