package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ContentAuthoringCli
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

/** Finish 2.0 Phase 27 — content authoring CLI ship catalog. */
class ContentAuthoringCliCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ContentAuthoringCli.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, ContentAuthoringCli.CATALOG).readText()).jsonObject
        assertEquals(ContentAuthoringCli.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ContentAuthoringCli.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ContentAuthoringCli.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(ContentAuthoringCli.SCAFFOLD_KIND_MIN, json.getValue("scaffoldKindMin").jsonPrimitive.int)
        assertEquals(ContentAuthoringCli.EXAMPLE_FILE_MIN, json.getValue("exampleFileMin").jsonPrimitive.int)
        assertEquals(ContentAuthoringCli.MODULE_ROOT, json.getValue("moduleRoot").jsonPrimitive.content)
        assertEquals(ContentAuthoringCli.PYTHON_WRAPPER, json.getValue("pythonWrapper").jsonPrimitive.content)
        assertEquals(
            ContentAuthoringCli.CONTENT_CLI_MARKER,
            json.getValue("contentCliMarker").jsonPrimitive.content,
        )
        assertEquals(23, json.getValue("schemaVersion").jsonPrimitive.int)
        val kinds = json.getValue("scaffoldKinds").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(ContentAuthoringCli.SCAFFOLD_KINDS, kinds)
    }

    @Test
    fun examplesAndPinsPresent() {
        val root = repoRoot()
        for (path in ContentAuthoringCli.EXAMPLE_FILES) {
            assertTrue(File(root, path).isFile)
        }
        assertTrue(File(root, ContentAuthoringCli.PYTHON_WRAPPER).isFile)
        assertTrue(File(root, "shared/tools/content_cli/scaffolds.ts").isFile)
        assertTrue(File(root, "web/scripts/content-scaffold.ts").isFile)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(27, listing.getValue("contentAuthoringCliPhase").jsonPrimitive.content.toInt())
        assertEquals(
            ContentAuthoringCli.CATALOG,
            listing.getValue("contentAuthoringCliCatalog").jsonPrimitive.content,
        )

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(
            ContentAuthoringCli.CATALOG,
            pin.getValue("contentAuthoringCli").jsonPrimitive.content,
        )
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-content-authoring-cli.json"
            },
        )
    }
}
