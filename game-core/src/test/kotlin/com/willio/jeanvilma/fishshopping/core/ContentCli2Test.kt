package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ContentCli2
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 28 — content authoring CLI expansion. */
class ContentCli2Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/content-cli-2.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, ContentCli2.CATALOG).readText()).jsonObject
        assertEquals(ContentCli2.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ContentCli2.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ContentCli2.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            ContentCli2.CONTENT_CLI_2_MARKER,
            json.getValue("contentCli2Marker").jsonPrimitive.content,
        )
        assertEquals(
            ContentCli2.SCAFFOLD_KIND_MIN,
            json.getValue("scaffoldKindMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            ContentCli2.SCAFFOLD_KINDS.size,
            json.getValue("scaffoldKinds").jsonArray.size,
        )
        assertEquals(
            ContentCli2.EXPANSION_KINDS.size,
            json.getValue("expansionScaffoldKinds").jsonArray.size,
        )
    }

    @Test
    fun expansionExamplesExist() {
        for (path in ContentCli2.EXAMPLE_FILES) {
            assertTrue(path, File(root, path).isFile)
        }
        for (kind in ContentCli2.EXPANSION_KINDS) {
            assertTrue(ContentCli2.SCAFFOLD_KINDS.contains(kind))
        }
    }
}
