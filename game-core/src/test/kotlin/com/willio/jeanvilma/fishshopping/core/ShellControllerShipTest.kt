package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ShellController
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 4 — shell-controller ship catalog. */
class ShellControllerShipTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/shell-controller.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, ShellController.CATALOG).readText()).jsonObject
        assertEquals(ShellController.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ShellController.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(ShellController.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(ShellController.MARKER, json.getValue("shellControllerMarker").jsonPrimitive.content)
        assertEquals(ShellController.PANEL_COUNT, json.getValue("panelCount").jsonPrimitive.content.toInt())
        assertEquals(
            ShellController.PANEL_WIRES,
            json.getValue("panelWires").jsonArray.map { it.jsonPrimitive.content },
        )
        assertEquals(ShellPanelId.WIRES, ShellController.PANEL_WIRES)
    }

    @Test
    fun hostsWiredAndUnderLineCaps() {
        val android = File(root, ShellController.ANDROID_HOST_PATH)
        val web = File(root, ShellController.WEB_HOST_PATH)
        assertTrue(android.isFile)
        assertTrue(web.isFile)
        assertTrue(android.readLines().size <= ShellController.ANDROID_HOST_MAX_LINES)
        assertTrue(web.readLines().size <= ShellController.WEB_HOST_MAX_LINES)
        assertTrue(android.readText().contains("ShellPanelController"))
        assertTrue(web.readText().contains("ShellPanelController"))
        assertFalse(android.readText().contains("private enum class Panel"))
        assertFalse(web.readText().contains("type PanelId ="))

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(4, listing.getValue("shellControllerPhase").jsonPrimitive.content.toInt())
        assertEquals(
            ShellController.CATALOG,
            listing.getValue("shellControllerCatalog").jsonPrimitive.content,
        )
        assertTrue(File(root, ShellController.PARITY_FIXTURE).isFile)
    }
}
