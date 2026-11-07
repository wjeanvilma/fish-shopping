package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.a11y.AccessibilityDepth
import com.willio.jeanvilma.fishshopping.core.ship.A11yDepth
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

/** Finish 2.0 Phase 24 — a11y depth. */
class A11yDepthTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, A11yDepth.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, A11yDepth.CATALOG).readText()).jsonObject
        assertEquals(A11yDepth.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(A11yDepth.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(A11yDepth.SCREEN_SURFACE_MIN, json.getValue("screenSurfaceMin").jsonPrimitive.int)
        assertEquals(A11yDepth.CONTRAST_PAIR_MIN, json.getValue("contrastPairMin").jsonPrimitive.int)
        assertEquals(A11yDepth.DEPTH_CATALOG, json.getValue("depthCatalog").jsonPrimitive.content)
        assertEquals(A11yDepth.EXTENDS_CATALOG, json.getValue("extendsCatalog").jsonPrimitive.content)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(24, listing.getValue("a11yDepthPhase").jsonPrimitive.content.toInt())
        assertEquals(A11yDepth.CATALOG, listing.getValue("a11yDepthCatalog").jsonPrimitive.content)
    }

    @Test
    fun depthSurfacesAndLiveRegions() {
        val root = repoRoot()
        val depth = Json.parseToJsonElement(File(root, A11yDepth.DEPTH_CATALOG).readText()).jsonObject
        assertEquals(AccessibilityDepth.PHASE, depth.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AccessibilityDepth.SCHEMA, depth.getValue("schema").jsonPrimitive.content)
        val surfaces = depth.getValue("screenSurfaces").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertEquals(AccessibilityDepth.SCREEN_IDS, surfaces)
        val live = depth.getValue("liveRegions").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(AccessibilityDepth.LIVE_REGIONS, live)
        val pairs = depth.getValue("contrastPairs").jsonArray.map {
            it.jsonObject.getValue("id").jsonPrimitive.content
        }
        assertTrue(pairs.containsAll(AccessibilityDepth.CONTRAST_PAIR_IDS))

        val sweep = Json.parseToJsonElement(File(root, A11yDepth.EXTENDS_CATALOG).readText()).jsonObject
        assertEquals(16, sweep.getValue("phase").jsonPrimitive.content.toInt())

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(A11yDepth.CATALOG, pin.getValue("a11yDepth").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-a11y-depth.json"
            },
        )
    }
}
