package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.Schema6
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.boolean
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 2 — schema foundations catalog. */
class Schema6Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, Schema6.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val catalog = Json.parseToJsonElement(File(root, Schema6.CATALOG).readText()).jsonObject
        assertEquals(Schema6.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Schema6.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(Schema6.PLAN, catalog.getValue("plan").jsonPrimitive.content)
        assertEquals(Schema6.MARKER, catalog.getValue("schema6Marker").jsonPrimitive.content)
        assertEquals(Schema6.CONTENT_VERSION, catalog.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(Schema6.SCHEMA_VERSION, catalog.getValue("schemaVersion").jsonPrimitive.int)
        assertEquals(Schema6.SCHEMA_MIN, catalog.getValue("schemaMin").jsonPrimitive.int)

        val schemas = catalog.getValue("schemas").jsonObject
        assertEquals(Schema6.SHIP_CATALOG_SCHEMA, schemas.getValue("shipCatalog").jsonPrimitive.content)
        assertEquals(Schema6.BILLING_CONTRACT_SCHEMA, schemas.getValue("billingContract").jsonPrimitive.content)
        assertEquals(Schema6.OPS_CATALOG_SCHEMA, schemas.getValue("opsCatalog").jsonPrimitive.content)
        assertEquals(Schema6.CONTENT_PACK_SCHEMA, schemas.getValue("contentPack").jsonPrimitive.content)

        for (path in Schema6.SCHEMA_PATHS) {
            assertTrue(path, File(root, path).isFile)
        }
        assertTrue(File(root, Schema6.SCHEMA_INDEX).isFile)
        assertTrue(File(root, Schema6.PARITY_FIXTURE).isFile)
    }

    @Test
    fun indexAndSamplesPresentAndKickoffGapClosed() {
        val root = repoRoot()
        val index = Json.parseToJsonElement(File(root, Schema6.SCHEMA_INDEX).readText()).jsonObject
        val ids = index.getValue("schemas").jsonArray
            .map { it.jsonObject.getValue("id").jsonPrimitive.content }
            .sorted()
        assertEquals(Schema6.INDEX_IDS, ids)

        for (path in Schema6.SAMPLE_SHIP + Schema6.SAMPLE_BILLING + Schema6.SAMPLE_OPS) {
            assertTrue(path, File(root, path).isFile)
        }

        val kickoff = Json.parseToJsonElement(File(root, Finish6Kickoff.CATALOG).readText()).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertFalse(gaps.getValue("schemaFoundationsIncomplete").jsonPrimitive.boolean)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("schemaFoundationsIncomplete"))
        // Soft-floor: Phase 4 closed systemsSplit3Incomplete → 19 open flags.
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 17)
    }
}
