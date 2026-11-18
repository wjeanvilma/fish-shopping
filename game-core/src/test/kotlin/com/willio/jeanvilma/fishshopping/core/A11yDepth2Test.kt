package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.a11y.AccessibilityDepth2
import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth2
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 25 — a11y depth 2. */
class A11yDepth2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, A11yDepth2.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, A11yDepth2.CATALOG).readText()).jsonObject
        assertEquals(A11yDepth2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(A11yDepth2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(A11yDepth2.SCREEN_SURFACE_MIN, json.getValue("screenSurfaceMin").jsonPrimitive.int)
        assertEquals(A11yDepth2.CONTRAST_PAIR_MIN, json.getValue("contrastPairMin").jsonPrimitive.int)
        assertEquals(A11yDepth2.DEPTH_CATALOG, json.getValue("depthCatalog").jsonPrimitive.content)
        assertEquals(A11yDepth2.EXTENDS_CATALOG, json.getValue("extendsCatalog").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(25, listing.getValue("a11yDepth2Phase").jsonPrimitive.content.toInt())
        assertEquals(A11yDepth2.CATALOG, listing.getValue("a11yDepth2Catalog").jsonPrimitive.content)
    }

    @Test
    fun depthSurfacesAndLiveRegions() {
        val root = repoRoot()
        val depth = Json.parseToJsonElement(File(root, A11yDepth2.DEPTH_CATALOG).readText()).jsonObject
        assertEquals(AccessibilityDepth2.PHASE, depth.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AccessibilityDepth2.SCHEMA, depth.getValue("schema").jsonPrimitive.content)
        val surfaces = depth.getValue("screenSurfaces").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(AccessibilityDepth2.SCREEN_IDS, surfaces)
        val live = depth.getValue("liveRegions").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(AccessibilityDepth2.LIVE_REGIONS, live)
        val pairs = depth.getValue("contrastPairs").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(pairs.containsAll(AccessibilityDepth2.CONTRAST_PAIR_IDS))

        val depth1 = Json.parseToJsonElement(File(root, A11yDepth2.EXTENDS_CATALOG).readText()).jsonObject
        assertEquals(24, depth1.getValue("phase").jsonPrimitive.content.toInt())

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(A11yDepth2.CATALOG, pin.getValue("a11yDepth2").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-a11y-depth-2.json"
            },
        )
    }
}
