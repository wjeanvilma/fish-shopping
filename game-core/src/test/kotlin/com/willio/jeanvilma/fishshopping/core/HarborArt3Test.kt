package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.HarborArt3
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 9 — harbor art scenic pass beyond blockout. */
class HarborArt3Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, HarborArt3.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, HarborArt3.CATALOG).readText()).jsonObject
        assertEquals(HarborArt3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(HarborArt3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(HarborArt3.MARKER, json.getValue("harborArt3Marker").jsonPrimitive.content)
        assertEquals(HarborArt3.AUTHORED_HARBOR_TARGET, json.getValue("authoredHarborTarget").jsonPrimitive.int)
        assertEquals(HarborArt3.SCENIC_HARBOR_TARGET, json.getValue("scenicHarborTarget").jsonPrimitive.int)
        assertEquals(HarborArt3.MIN_HARBOR_ART_NODES, json.getValue("minHarborArtNodes").jsonPrimitive.int)
        assertEquals(8, json.getValue("scenicHarbors").jsonArray.size)
    }

    @Test
    fun listingAndPinWireHarborArt3() {
        val root = repoRoot()
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(9, listing.getValue("harborArt3Phase").jsonPrimitive.content.toInt())
        assertEquals(HarborArt3.CATALOG, listing.getValue("harborArt3Catalog").jsonPrimitive.content)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(HarborArt3.CATALOG, pin.getValue("harborArt3").jsonPrimitive.content)
        val fixtures = pin.getValue("fixtures").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fixtures.contains("parity-harbor-art-3.json"))
    }

    @Test
    fun scenicHelpers() {
        assertTrue(HarborArt3.scenicEnough(8))
        assertTrue(HarborArt3.artNodesEnough(10))
        assertTrue(HarborArt3.artNodesEnough(12))
    }
}
