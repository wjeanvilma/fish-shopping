package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Freeze60
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

class Freeze60CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Freeze60.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, Freeze60.CATALOG).readText()).jsonObject
        assertEquals(Freeze60.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze60.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(Freeze60.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(Freeze60.CONTENT_VERSION, ship.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze60.VERSION_CODE, ship.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze60.RELEASE_TAG, ship.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze60.FREEZE_6_MARKER, ship.getValue("freeze6Marker").jsonPrimitive.content)
        assertEquals(Freeze60.PRIOR_FREEZE, ship.getValue("priorFreeze").jsonPrimitive.content)
        assertEquals(27, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(150, Freeze60.FLOOR_SPECIES)
        assertEquals(24, Freeze60.FLOOR_PARITY_SUITES)
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.isEmpty())
    }

    @Test
    fun releasePinAndListingWireFreeze60() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Freeze60.CONTENT_VERSION, pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze60.VERSION_CODE, pin.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze60.RELEASE_TAG, pin.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze60.CATALOG, pin.getValue("freeze60").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-freeze-6.0.0.json"
            },
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("freeze60Phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze60.CATALOG, listing.getValue("freeze60Catalog").jsonPrimitive.content)
        assertEquals("6.0.0", listing.getValue("whatsNewVersion").jsonPrimitive.content)
    }
}
