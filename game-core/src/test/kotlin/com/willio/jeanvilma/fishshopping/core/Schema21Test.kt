package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.ship.Schema21
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 7 — schema 21 kickoff + v20→v21 migration. */
class Schema21Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/schema-21.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/schema-21.json").readText()).jsonObject
        assertEquals(Schema21.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Schema21.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(Schema21.FROM_SCHEMA, json.getValue("fromSchema").jsonPrimitive.content.toInt())
        assertEquals(Schema21.TO_SCHEMA, json.getValue("toSchema").jsonPrimitive.content.toInt())
        assertEquals(
            Schema21.MIGRATION_FIELD,
            json.getValue("migration").jsonObject.getValue("field").jsonPrimitive.content,
        )
        assertTrue(SimConstants.SCHEMA_VERSION >= 21)
    }

    @Test
    fun legacyV20MigratesToSchema21WithEmptyAchievements() {
        val content = Shared.content
        val legacy = File(root, Schema21.LEGACY_V20_FIXTURE).readText()
        assertTrue(legacy.startsWith("{\"schemaVersion\":20,"))
        assertFalse(legacy.contains("\"unlockedAchievements\""))

        val state = SnapshotCodec.decode(content, legacy)
        assertTrue(state.unlockedAchievements.isEmpty())

        val encoded = SnapshotCodec.encode(content, state)
        assertTrue(encoded.startsWith("{\"schemaVersion\":${SimConstants.SCHEMA_VERSION},"))
        assertTrue(encoded.contains("\"unlockedAchievements\":[]"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(7, listing.getValue("schema21Phase").jsonPrimitive.content.toInt())
        assertEquals(Schema21.CATALOG, listing.getValue("schema21Catalog").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertTrue(pin.getValue("schemaVersion").jsonPrimitive.content.toInt() >= 21)
        assertEquals(
            20,
            pin.getValue("storeRelease").jsonObject.getValue("schemaVersion").jsonPrimitive.content.toInt(),
        )

        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        assertTrue(pack.getValue("saveSchemaVersion").jsonPrimitive.content.toInt() >= 21)

        val parity = Json.parseToJsonElement(File(root, "shared/fixtures/parity-lock.json").readText()).jsonObject
        val fields = parity.getValue("expandedExpectFields").jsonArray.map { it.jsonPrimitive.content }
        assertTrue(fields.contains("unlockedAchievements"))
    }
}
