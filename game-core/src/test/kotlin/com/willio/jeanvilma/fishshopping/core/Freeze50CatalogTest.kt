package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Freeze50
import java.io.File
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class Freeze50CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Freeze50.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, Freeze50.CATALOG).readText()).jsonObject
        assertEquals(Freeze50.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze50.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(Freeze50.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(Freeze50.CONTENT_VERSION, ship.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze50.VERSION_CODE, ship.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze50.RELEASE_TAG, ship.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze50.FREEZE_5_MARKER, ship.getValue("freeze5Marker").jsonPrimitive.content)
        assertEquals(Freeze50.PRIOR_FREEZE, ship.getValue("priorFreeze").jsonPrimitive.content)
        assertEquals(26, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(125, Freeze50.FLOOR_SPECIES)
        assertEquals(20, Freeze50.FLOOR_PARITY_SUITES)
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.isEmpty())
    }

    @Test
    fun releasePinAndListingWireFreeze50() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        // Soft-floor: Finish 6.0 Phase 30 advances live pin to 6.0.0 / vc 7.
        val pinContent = pin.getValue("contentVersion").jsonPrimitive.content
        assertTrue(pinContent == "5.0.0" || pinContent == "6.0.0")
        assertTrue(pin.getValue("versionCode").jsonPrimitive.int >= Freeze50.VERSION_CODE)
        val pinTag = pin.getValue("releaseTag").jsonPrimitive.content
        assertTrue(pinTag == "v5.0.0" || pinTag == "v6.0.0")
        assertEquals(Freeze50.CATALOG, pin.getValue("freeze50").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-freeze-5.0.0.json"
            },
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("freeze50Phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze50.CATALOG, listing.getValue("freeze50Catalog").jsonPrimitive.content)
        val whatsNew = listing.getValue("whatsNewVersion").jsonPrimitive.content
        assertTrue(whatsNew == "5.0.0" || whatsNew == "6.0.0")
    }
}
