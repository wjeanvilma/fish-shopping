package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.FishArt3a
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 7 — fish art 3a (meshes 51–75). */
class FishArt3aTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, FishArt3a.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, FishArt3a.CATALOG).readText()).jsonObject
        assertEquals(FishArt3a.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FishArt3a.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FishArt3a.MARKER, json.getValue("fishArt3aMarker").jsonPrimitive.content)
        assertEquals(FishArt3a.AUTHORED_SPECIES_TARGET, json.getValue("authoredSpeciesTarget").jsonPrimitive.int)
        assertEquals(FishArt3a.NEW_AUTHORED_COUNT, json.getValue("newAuthoredCount").jsonPrimitive.int)
        assertEquals(FishArt3a.GAP_CLOSED_VALUE, json.getValue("gapClosedValue").jsonPrimitive.int)
        assertEquals(25, json.getValue("newSpeciesIds").jsonArray.size)
        assertEquals(FishArt3a.NEW_SPECIES_IDS.size, json.getValue("newSpeciesIds").jsonArray.size)
    }

    @Test
    fun listingAndPinWireFishArt3a() {
        val root = repoRoot()
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(7, listing.getValue("fishArt3aPhase").jsonPrimitive.content.toInt())
        assertEquals(FishArt3a.CATALOG, listing.getValue("fishArt3aCatalog").jsonPrimitive.content)
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(FishArt3a.CATALOG, pin.getValue("fishArt3a").jsonPrimitive.content)
        val fixtures = pin.getValue("fixtures").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fixtures.contains("parity-fish-art-3a.json"))
    }

    @Test
    fun waveHelpers() {
        assertTrue(FishArt3a.authoredEnough(75))
        assertTrue(FishArt3a.waveComplete(25))
    }
}
