package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.FishArt3b
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 8 — fish art 3b (meshes 76–100). */
class FishArt3bTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, FishArt3b.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, FishArt3b.CATALOG).readText()).jsonObject
        assertEquals(FishArt3b.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FishArt3b.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FishArt3b.MARKER, json.getValue("fishArt3bMarker").jsonPrimitive.content)
        assertEquals(FishArt3b.AUTHORED_SPECIES_TARGET, json.getValue("authoredSpeciesTarget").jsonPrimitive.int)
        assertEquals(FishArt3b.SPECIES_COUNT_TARGET, json.getValue("speciesCountTarget").jsonPrimitive.int)
        assertEquals(FishArt3b.NEW_AUTHORED_COUNT, json.getValue("newAuthoredCount").jsonPrimitive.int)
        assertEquals(25, json.getValue("newSpeciesIds").jsonArray.size)
    }

    @Test
    fun listingAndPinWireFishArt3b() {
        val root = repoRoot()
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(8, listing.getValue("fishArt3bPhase").jsonPrimitive.content.toInt())
        assertEquals(FishArt3b.CATALOG, listing.getValue("fishArt3bCatalog").jsonPrimitive.content)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(FishArt3b.CATALOG, pin.getValue("fishArt3b").jsonPrimitive.content)
        val fixtures = pin.getValue("fixtures").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fixtures.contains("parity-fish-art-3b.json"))
    }

    @Test
    fun waveHelpers() {
        assertTrue(FishArt3b.authoredEnough(100))
        assertTrue(FishArt3b.speciesEnough(100))
        assertTrue(FishArt3b.waveComplete(25))
    }
}
