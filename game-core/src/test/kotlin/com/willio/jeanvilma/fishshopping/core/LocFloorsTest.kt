package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.LocFloors
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 6 — product LOC floors scoreboard. */
class LocFloorsTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/loc-floors.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/loc-floors.json").readText()).jsonObject
        assertEquals(LocFloors.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(LocFloors.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(LocFloors.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(LocFloors.SCHEMA_VERSION, json.getValue("schemaVersion").jsonPrimitive.content.toInt())
        assertEquals(
            LocFloors.METRIC_UNIT,
            json.getValue("metric").jsonObject.getValue("unit").jsonPrimitive.content,
        )
        assertTrue(json.getValue("enforceFloors").jsonPrimitive.content.toBoolean())
        assertEquals(
            LocFloors.ENFORCE_MODE,
            json.getValue("enforceMode").jsonPrimitive.content,
        )
        assertEquals(LocFloors.ENFORCE_AT_PHASE, json.getValue("enforceAtPhase").jsonPrimitive.content.toInt())
        assertEquals(LocFloors.PRODUCT_TOTAL_FLOOR, json.getValue("productTotalFloor").jsonPrimitive.content.toInt())
        assertEquals(
            LocFloors.PRODUCT_TOTAL_PLAN_TARGET,
            json.getValue("productTotalPlanTarget").jsonPrimitive.content.toInt(),
        )

        val scopes = json.getValue("scopes").jsonObject
        assertEquals(
            LocFloors.GAME_CORE_FLOOR,
            scopes.getValue("gameCore").jsonObject.getValue("phase30Floor").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            LocFloors.APP_FLOOR,
            scopes.getValue("app").jsonObject.getValue("phase30Floor").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            LocFloors.WEB_SRC_FLOOR,
            scopes.getValue("webSrc").jsonObject.getValue("phase30Floor").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            LocFloors.GAME_CORE_ROOT,
            scopes.getValue("gameCore").jsonObject.getValue("root").jsonPrimitive.content,
        )
        assertEquals(LocFloors.APP_ROOT, scopes.getValue("app").jsonObject.getValue("root").jsonPrimitive.content)
        assertEquals(
            LocFloors.WEB_SRC_ROOT,
            scopes.getValue("webSrc").jsonObject.getValue("root").jsonPrimitive.content,
        )
    }

    @Test
    fun listingAndBaselineLockPhase6() {
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(6, listing.getValue("locFloorsPhase").jsonPrimitive.content.toInt())
        assertEquals(LocFloors.CATALOG, listing.getValue("locFloorsCatalog").jsonPrimitive.content)

        val json = Json.parseToJsonElement(File(root, "shared/ship/loc-floors.json").readText()).jsonObject
        val baseline = json.getValue("baseline").jsonObject
        assertEquals(LocFloors.BASELINE_GAME_CORE, baseline.getValue("gameCore").jsonPrimitive.content.toInt())
        assertEquals(LocFloors.BASELINE_APP, baseline.getValue("app").jsonPrimitive.content.toInt())
        assertEquals(LocFloors.BASELINE_WEB_SRC, baseline.getValue("webSrc").jsonPrimitive.content.toInt())
        assertEquals(
            LocFloors.BASELINE_PRODUCT_TOTAL,
            baseline.getValue("productTotal").jsonPrimitive.content.toInt(),
        )
        assertTrue(File(root, "web/scripts/smoke-loc-floors.ts").isFile)
        assertTrue(File(root, "web/scripts/validate-loc-floors.ts").isFile)
    }
}
