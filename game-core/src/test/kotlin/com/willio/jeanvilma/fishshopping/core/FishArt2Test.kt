package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.FishArt2
import com.willio.jeanvilma.fishshopping.core.ship.FishArtPass
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 9 — fish mesh pass 2. */
class FishArt2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/fish-art-2.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, FishArt2.CATALOG).readText()).jsonObject
        assertEquals(FishArt2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(FishArt2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(FishArt2.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(FishArt2.MARKER, json.getValue("fishArt2Marker").jsonPrimitive.content)
        assertEquals(
            FishArt2.AUTHORED_SPECIES_TARGET,
            json.getValue("authoredSpeciesTarget").jsonPrimitive.int,
        )
        assertEquals(
            FishArt2.NEW_AUTHORED_COUNT,
            json.getValue("newAuthoredCount").jsonPrimitive.int,
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(9, listing.getValue("fishArt2Phase").jsonPrimitive.content.toInt())
        assertEquals(FishArt2.CATALOG, listing.getValue("fishArt2Catalog").jsonPrimitive.content)
    }

    @Test
    fun kickoffFishGapClosedAndPassHasFifty() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            50,
            kickoff.getValue("baseline").jsonObject.getValue("authoredFish").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            0,
            kickoff.getValue("gaps").jsonObject.getValue("authoredFishRemaining").jsonPrimitive.content.toInt(),
        )
        assertEquals(FishArt2.GAP_CLOSED_VALUE, Finish3Kickoff.GAP_AUTHORED_FISH_REMAINING)
        assertTrue(FishArtPass.AUTHORED_SPECIES_MIN >= 50)
        assertTrue(FishArtPass.AUTHORED_SPECIES_IDS.size >= 50)

        val pass = Json.parseToJsonElement(File(root, FishArtPass.CATALOG).readText()).jsonObject
        assertTrue(pass.getValue("authoredSpecies").jsonArray.size >= 50)
        assertTrue(File(root, FishArt2.PARITY_FIXTURE).isFile)
        assertTrue(File(root, "web/scripts/validate-fish-art-2.ts").isFile)
    }
}
