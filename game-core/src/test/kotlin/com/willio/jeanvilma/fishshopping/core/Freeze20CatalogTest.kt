package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Freeze20
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

/** Finish 2.0 Phase 30 — 2.0.0 freeze catalog + pin lock. */
class Freeze20CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Freeze20.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, Freeze20.CATALOG).readText()).jsonObject
        assertEquals(Freeze20.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze20.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(Freeze20.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(Freeze20.CONTENT_VERSION, ship.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze20.SCHEMA_VERSION, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(Freeze20.VERSION_CODE, ship.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze20.RELEASE_TAG, ship.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze20.FREEZE_2_MARKER, ship.getValue("freeze2Marker").jsonPrimitive.content)
        assertEquals(
            Freeze20.LOC_ENFORCE_MODE,
            ship.getValue("loc").jsonObject.getValue("enforceMode").jsonPrimitive.content,
        )
        val floors = ship.getValue("contentFloors").jsonObject
        assertEquals(Freeze20.FLOOR_HARBORS, floors.getValue("harbors").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_SPECIES, floors.getValue("species").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_MACHINES, floors.getValue("machines").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_QUESTS, floors.getValue("quests").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_SEASONAL, floors.getValue("seasonalEvents").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_BAITS, floors.getValue("baits").jsonPrimitive.int)
        assertEquals(Freeze20.FLOOR_COSMETICS, floors.getValue("cosmetics").jsonPrimitive.int)
    }

    @Test
    fun releasePinAndPackAt200() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Freeze20.CONTENT_VERSION, pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze20.VERSION_NAME, pin.getValue("versionName").jsonPrimitive.content)
        assertEquals(Freeze20.VERSION_CODE, pin.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze20.RELEASE_TAG, pin.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze20.SCHEMA_VERSION, pin.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(Freeze20.CATALOG, pin.getValue("freeze20").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-freeze-2.0.0.json"
            },
        )

        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        assertEquals(Freeze20.CONTENT_VERSION, pack.getValue("contentVersion").jsonPrimitive.content)
        assertTrue(pack.getValue("quests").jsonArray.size >= Freeze20.FLOOR_QUESTS)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("freeze20Phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze20.CATALOG, listing.getValue("freeze20Catalog").jsonPrimitive.content)
    }
}
