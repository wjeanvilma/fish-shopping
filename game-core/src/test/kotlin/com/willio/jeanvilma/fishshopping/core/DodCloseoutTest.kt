package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.DefinitionOfDone
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 30 (post-1.0) — Definition of Done 100% closeout. */
class DodCloseoutTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/definition-of-done.json").isFile }
    }

    @Test
    fun closeoutLocksCompleteTagAndPhaseGates() {
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(DefinitionOfDone.PHASE, dod.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(DefinitionOfDone.SCHEMA, dod.getValue("schema").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.COMPLETE_TAG, dod.getValue("completeTag").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.CONTENT_VERSION, dod.getValue("contentVersion").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.SCHEMA_VERSION, dod.getValue("schemaVersion").jsonPrimitive.content.toInt())

        val closeout = dod.getValue("closeout").jsonObject
        assertEquals(DefinitionOfDone.CLOSEOUT_STATUS, closeout.getValue("status").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.COMPLETE_TAG, closeout.getValue("completeTag").jsonPrimitive.content)
        assertEquals(30, closeout.getValue("planPhases").jsonPrimitive.content.toInt())
        val gates = closeout.getValue("phaseGates").jsonArray
        assertEquals(29, gates.size)
        assertTrue(DefinitionOfDone.isCloseoutReady(closeout.getValue("status").jsonPrimitive.content))

        val checks = dod.getValue("checks").jsonArray.map { it.jsonPrimitive.content }
        for (required in DefinitionOfDone.REQUIRED_CHECKS) {
            assertTrue("missing check $required", required in checks)
        }
    }

    @Test
    fun phaseGateCatalogsExistOnDisk() {
        for (catalog in DefinitionOfDone.PHASE_GATE_CATALOGS) {
            assertTrue(catalog, File(root, catalog).isFile)
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(30, listing.getValue("dodCloseoutPhase").jsonPrimitive.content.toInt())
        assertEquals(DefinitionOfDone.CATALOG, listing.getValue("dodCloseoutCatalog").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.COMPLETE_TAG, listing.getValue("completeTag").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(DefinitionOfDone.COMPLETE_TAG, pin.getValue("completeTag").jsonPrimitive.content)
        assertEquals(DefinitionOfDone.CATALOG, pin.getValue("definitionOfDone").jsonPrimitive.content)
    }
}
