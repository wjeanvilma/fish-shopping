package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Freeze30
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

/** Finish 3.0 Phase 30 — 3.0.0 freeze catalog + pin lock. */
class Freeze30CatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Freeze30.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val ship = Json.parseToJsonElement(File(root, Freeze30.CATALOG).readText()).jsonObject
        assertEquals(Freeze30.PHASE, ship.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze30.SCHEMA, ship.getValue("schema").jsonPrimitive.content)
        assertEquals(Freeze30.PLAN, ship.getValue("plan").jsonPrimitive.content)
        assertEquals(Freeze30.CONTENT_VERSION, ship.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze30.SCHEMA_VERSION, ship.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(Freeze30.VERSION_CODE, ship.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze30.RELEASE_TAG, ship.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze30.FREEZE_3_MARKER, ship.getValue("freeze3Marker").jsonPrimitive.content)
        assertEquals(Freeze30.PRIOR_FREEZE, ship.getValue("priorFreeze").jsonPrimitive.content)
        assertEquals(
            Freeze30.LOC_ENFORCE_MODE,
            ship.getValue("loc").jsonObject.getValue("enforceMode").jsonPrimitive.content,
        )
        val floors = ship.getValue("contentFloors").jsonObject
        assertEquals(Freeze30.FLOOR_HARBORS, floors.getValue("harbors").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_SPECIES, floors.getValue("species").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_MACHINES, floors.getValue("machines").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_QUESTS, floors.getValue("quests").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_SEASONAL, floors.getValue("seasonalEvents").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_BAITS, floors.getValue("baits").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_COSMETICS, floors.getValue("cosmetics").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_DELIVERY_CHAINS, floors.getValue("deliveryChains").jsonPrimitive.int)
        assertEquals(Freeze30.FLOOR_PARITY_SUITES, floors.getValue("paritySuites").jsonPrimitive.int)
    }

    @Test
    fun releasePinAndPackAt300() {
        val root = repoRoot()
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(Freeze30.CONTENT_VERSION, pin.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze30.VERSION_NAME, pin.getValue("versionName").jsonPrimitive.content)
        assertEquals(Freeze30.VERSION_CODE, pin.getValue("versionCode").jsonPrimitive.int)
        assertEquals(Freeze30.RELEASE_TAG, pin.getValue("releaseTag").jsonPrimitive.content)
        assertTrue(pin.getValue("schemaVersion").jsonPrimitive.int >= Freeze30.SCHEMA_VERSION)
        assertEquals(Freeze30.CATALOG, pin.getValue("freeze30").jsonPrimitive.content)
        assertEquals(Freeze30.PRIOR_FREEZE, pin.getValue("freeze20").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-freeze-3.0.0.json"
            },
        )

        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        assertEquals(Freeze30.CONTENT_VERSION, pack.getValue("contentVersion").jsonPrimitive.content)
        assertTrue(pack.getValue("quests").jsonArray.size >= Freeze30.FLOOR_QUESTS)
        assertTrue(pack.getValue("species").jsonArray.size >= Freeze30.FLOOR_SPECIES)
        assertTrue(pack.getValue("machines").jsonArray.size >= Freeze30.FLOOR_MACHINES)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("freeze30Phase").jsonPrimitive.content.toInt())
        assertEquals(Freeze30.CATALOG, listing.getValue("freeze30Catalog").jsonPrimitive.content)
        assertEquals(Freeze30.CONTENT_VERSION, listing.getValue("whatsNewVersion").jsonPrimitive.content)

        val dod = Json.parseToJsonElement(File(root, Freeze30.DEFINITION_OF_DONE).readText()).jsonObject
        val freeze3 = dod.getValue("finish3Freeze").jsonObject
        assertEquals(Freeze30.RELEASE_TAG, freeze3.getValue("releaseTag").jsonPrimitive.content)
        assertEquals(Freeze30.CONTENT_VERSION, freeze3.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Freeze30.VERSION_CODE, freeze3.getValue("versionCode").jsonPrimitive.int)
    }
}
