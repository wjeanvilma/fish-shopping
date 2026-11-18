package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ParityLock3
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 29 — Parity lock 3.0 catalog. */
class ParityLock3CatalogTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/parity-lock-3.0.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val ship = Json.parseToJsonElement(File(root, ParityLock3.CATALOG).readText()).jsonObject
        assertEquals(ParityLock3.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock3.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(ParityLock3.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(
            ParityLock3.PARITY_LOCK_3_MARKER,
            ship.getValue("parityLock3Marker").jsonPrimitive.content,
        )
        assertEquals(ParityLock3.SUITE_FLOOR, ship.getValue("suiteFloor").jsonPrimitive.content.toInt())
        assertEquals(
            ParityLock3.FINISH3_SUITE_FLOOR,
            ship.getValue("finish3SuiteFloor").jsonPrimitive.content.toInt(),
        )
    }

    @Test
    fun parityLockIncludesFinish3Suites() {
        val lock = Json.parseToJsonElement(File(root, ParityLock.CATALOG).readText()).jsonObject
        assertEquals(29, lock.getValue("finish3ParityLockPhase").jsonPrimitive.content.toInt())
        val suiteIds = lock.getValue("suites").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(suiteIds.containsAll(ParityLock3.REQUIRED_BASELINE_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock3.REQUIRED_FINISH2_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock3.REQUIRED_FINISH3_SUITE_IDS))
        assertTrue(suiteIds.size >= ParityLock3.SUITE_FLOOR)
        assertEquals(ParityLock.SUITE_IDS, suiteIds)
        assertEquals(ParityLock.FINISH3_SUITE_IDS, ParityLock3.REQUIRED_FINISH3_SUITE_IDS)
    }
}
