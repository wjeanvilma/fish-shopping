package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish3Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.HarborArt2
import com.willio.jeanvilma.fishshopping.core.ship.HarborArtPass
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 8 — harbor art pass 2. */
class HarborArt2Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/harbor-art-2.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, HarborArt2.CATALOG).readText()).jsonObject
        assertEquals(HarborArt2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(HarborArt2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(HarborArt2.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(HarborArt2.MARKER, json.getValue("harborArt2Marker").jsonPrimitive.content)
        assertEquals(
            HarborArt2.AUTHORED_HARBOR_TARGET,
            json.getValue("authoredHarborTarget").jsonPrimitive.int,
        )

        val newAuthored = json.getValue("newAuthoredHarbors").jsonArray
        assertEquals(5, newAuthored.size)
        for (id in HarborArt2.NEW_AUTHORED_HARBOR_IDS) {
            assertTrue(newAuthored.any { it.jsonObject.getValue("harborId").jsonPrimitive.content == id })
        }

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(8, listing.getValue("harborArt2Phase").jsonPrimitive.content.toInt())
        assertEquals(HarborArt2.CATALOG, listing.getValue("harborArt2Catalog").jsonPrimitive.content)
    }

    @Test
    fun kickoffHarborGapClosedAndPassHasEight() {
        val root = repoRoot()
        val kickoff = Json.parseToJsonElement(File(root, Finish3Kickoff.CATALOG).readText()).jsonObject
        assertEquals(
            8,
            kickoff.getValue("baseline").jsonObject.getValue("authoredHarbors").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            0,
            kickoff.getValue("gaps").jsonObject.getValue("authoredHarborsRemaining").jsonPrimitive.content.toInt(),
        )
        assertEquals(HarborArt2.GAP_CLOSED_VALUE, Finish3Kickoff.GAP_AUTHORED_HARBORS_REMAINING)
        assertEquals(8, HarborArtPass.AUTHORED_HARBOR_MIN)
        assertEquals(8, HarborArtPass.AUTHORED_HARBOR_IDS.size)

        val pass = Json.parseToJsonElement(File(root, HarborArtPass.CATALOG).readText()).jsonObject
        assertEquals(8, pass.getValue("authoredHarbors").jsonArray.size)
        assertTrue(File(root, HarborArt2.PARITY_FIXTURE).isFile)
        assertTrue(File(root, "web/scripts/validate-harbor-art-2.ts").isFile)
    }
}
