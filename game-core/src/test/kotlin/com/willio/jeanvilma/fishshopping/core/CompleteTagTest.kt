package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.CompleteTag
import com.willio.jeanvilma.fishshopping.core.ship.DefinitionOfDone
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 4 — v1.0-complete tag cut. */
class CompleteTagTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/ship/complete-tag.json").isFile }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, "shared/ship/complete-tag.json").readText()).jsonObject
        assertEquals(CompleteTag.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(CompleteTag.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(CompleteTag.TAG, json.getValue("completeTag").jsonPrimitive.content)
        assertEquals(CompleteTag.CLOSEOUT_STATUS_AFTER, json.getValue("closeoutStatusAfter").jsonPrimitive.content)
        assertEquals(4, json.getValue("artifactSlots").jsonObject.size)
    }

    @Test
    fun pinAndDodArchivedForCompleteTag() {
        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(CompleteTag.TAG, pin.getValue("completeTag").jsonPrimitive.content)
        val complete = pin.getValue("completeRelease").jsonObject
        assertEquals(CompleteTag.TAG, complete.getValue("releaseTag").jsonPrimitive.content)
        val arts = complete.getValue("hashes").jsonObject.getValue("artifacts").jsonObject
        for (slot in CompleteTag.ARTIFACT_SLOTS.keys) {
            assertTrue(slot, arts.containsKey(slot))
            assertTrue(arts.getValue(slot).jsonPrimitive.content.length == 64)
        }

        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals("archived", dod.getValue("closeout").jsonObject.getValue("status").jsonPrimitive.content)
        assertEquals(
            CompleteTag.TAG,
            dod.getValue("closeout").jsonObject.getValue("completeTagCut").jsonObject.getValue("tag").jsonPrimitive.content,
        )
        assertTrue(DefinitionOfDone.isCloseoutReady("archived"))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(4, listing.getValue("completeTagPhase").jsonPrimitive.content.toInt())
        assertEquals(CompleteTag.CATALOG, listing.getValue("completeTagCatalog").jsonPrimitive.content)
    }
}
