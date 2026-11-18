package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ViewModelSplit
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 4 — Android GameViewModel intent/handler decomposition. */
class ViewModelSplitTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/viewmodel-split.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, ViewModelSplit.CATALOG).readText()).jsonObject
        assertEquals(ViewModelSplit.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ViewModelSplit.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ViewModelSplit.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            ViewModelSplit.MARKER,
            json.getValue("viewModelSplitMarker").jsonPrimitive.content,
        )
        assertEquals(
            ViewModelSplit.VIEW_MODEL_MAX_LINES,
            json.getValue("viewModelMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            ViewModelSplit.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            ViewModelSplit.GAP_FLAG_CLOSED,
            json.getValue("gapFlagClosed").jsonPrimitive.content,
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(ViewModelSplit.REQUIRED_FILES, required)
    }

    @Test
    fun viewModelSlimAndIntentsExtracted() {
        val vm = File(root, ViewModelSplit.VIEW_MODEL_PATH)
        assertTrue(vm.isFile)
        val lines = vm.readLines().size
        assertTrue(ViewModelSplit.viewModelSlim(lines))
        assertTrue(lines < 1633)

        val pkg = File(root, ViewModelSplit.VIEW_MODEL_PACKAGE_ROOT)
        var extracted = 0
        if (File(pkg, "GameUiState.kt").isFile) extracted++
        val vmDir = File(pkg, "vm")
        if (vmDir.isDirectory) {
            extracted += vmDir.listFiles { f -> f.isFile && f.name.endsWith(".kt") }?.size ?: 0
        }
        assertTrue(ViewModelSplit.extractedEnough(extracted))

        for (name in ViewModelSplit.REQUIRED_FILES) {
            assertTrue("missing $name", File(pkg, name).isFile)
        }

        val body = vm.readText()
        assertTrue(body.contains("VmShellIntents"))
        assertTrue(body.contains("VmEconomyIntents"))
        assertTrue(body.contains("VmTravelIntents"))
        assertTrue(body.contains("VmIapIntents"))
        assertTrue(body.contains("enqueuePanelCommand"))
        assertFalse(body.contains("sealed interface GameUiState"))
        assertFalse(body.contains("class VmEconomyIntents"))

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-4.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject
                .getValue("viewModelSplitIncomplete").jsonPrimitive.content.toBoolean(),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(4, listing.getValue("viewModelSplitPhase").jsonPrimitive.content.toInt())
        assertEquals(
            ViewModelSplit.CATALOG,
            listing.getValue("viewModelSplitCatalog").jsonPrimitive.content,
        )
        assertTrue(File(root, ViewModelSplit.PARITY_FIXTURE).isFile)
    }
}
