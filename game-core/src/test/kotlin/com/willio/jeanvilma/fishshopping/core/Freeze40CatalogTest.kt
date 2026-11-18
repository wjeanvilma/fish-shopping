package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Freeze40
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class Freeze40CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Freeze40.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, Freeze40.CATALOG).readText()).jsonObject
        assertEquals(Freeze40.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze40.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(Freeze40.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(Freeze40.CONTENT_VERSION, ship.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze40.VERSION_CODE, ship.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze40.RELEASE_TAG, ship.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze40.FREEZE_4_MARKER, ship.getValue("freeze4Marker").jsonPrimitive.content)
        assertEquals(Freeze40.PRIOR_FREEZE, ship.getValue("priorFreeze").jsonPrimitive.content)
        assertEquals(25, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(100, Freeze40.FLOOR_SPECIES)
        assertEquals(16, Freeze40.FLOOR_PARITY_SUITES)
    }

    @Test
    fun releasePinAndListingWireFreeze40() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Freeze40.CONTENT_VERSION, pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze40.VERSION_CODE, pin.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze40.RELEASE_TAG, pin.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze40.CATALOG, pin.getValue("freeze40").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-freeze-4.0.0.json"
            },
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("freeze40Phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze40.CATALOG, listing.getValue("freeze40Catalog").jsonPrimitive.content)
        assertEquals("4.0.0", listing.getValue("whatsNewVersion").jsonPrimitive.content)
    }
}
