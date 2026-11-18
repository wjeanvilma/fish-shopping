package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ParityLock4
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ParityLock4CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ParityLock4.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, ParityLock4.CATALOG).readText()).jsonObject
        assertEquals(ParityLock4.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock4.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(ParityLock4.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(ParityLock4.SUITE_FLOOR, ship.getValue("suiteFloor").jsonPrimitive.content.toInt())
        assertEquals(
            ParityLock4.FINISH4_SUITE_FLOOR,
            ship.getValue("finish4SuiteFloor").jsonPrimitive.content.toInt(),
        )
        assertEquals(ParityLock4.CLOSES_GAP, ship.getValue("closesGap").jsonPrimitive.content)
        assertEquals(
            ParityLock4.PARITY_LOCK_4_MARKER,
            ship.getValue("parityLock4Marker").jsonPrimitive.content,
        )
    }

    @Test
    fun parityLockIncludesFinish4SuitesAndClosesGap() {
        val root = repoRoot()
        val lock = Json.parseToJsonElement(File(root, ParityLock4.PARITY_LOCK_CATALOG).readText()).jsonObject
        assertEquals(27, lock.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(29, lock.getValue("finish4ParityLockPhase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock.FINISH4_PARITY_LOCK_PHASE, 29)
        assertEquals(ParityLock4.CATALOG, lock.getValue("parityLock4Catalog").jsonPrimitive.content)

        val suiteIds = lock.getValue("suites").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(suiteIds.containsAll(ParityLock4.REQUIRED_BASELINE_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock4.REQUIRED_FINISH2_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock4.REQUIRED_FINISH3_SUITE_IDS))
        assertTrue(suiteIds.containsAll(ParityLock4.REQUIRED_FINISH4_SUITE_IDS))
        assertTrue(suiteIds.size >= ParityLock4.SUITE_FLOOR)
        assertEquals(ParityLock.SUITE_IDS, suiteIds)
        assertEquals(ParityLock.FINISH4_SUITE_IDS, ParityLock4.REQUIRED_FINISH4_SUITE_IDS)

        val gates = lock.getValue("gates").jsonObject
        assertTrue(gates.getValue("machines1112RecipesParity").jsonPrimitive.boolean)
        assertTrue(gates.getValue("questsContracts4FloorsMet").jsonPrimitive.boolean)
        assertTrue(gates.getValue("rivalMarkets2PressureDeterministic").jsonPrimitive.boolean)
        assertTrue(gates.getValue("endgameSchema25Persisted").jsonPrimitive.boolean)

        for (path in ParityLock4.FINISH4_FIXTURES) {
            assertTrue(File(root, path).isFile)
        }

        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains(ParityLock4.CLOSES_GAP))
        assertEquals(0, Finish4Kickoff.OPEN_GAP_FLAGS.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(29, listing.getValue("parityLock4Phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock4.CATALOG, listing.getValue("parityLock4Catalog").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(ParityLock4.CATALOG, pin.getValue("parityLock4").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-parity-lock-4.0.json"
            },
        )
    }
}
