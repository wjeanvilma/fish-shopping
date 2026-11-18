package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.WebHudSplit
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 3 — web HUD panel decomposition. */
class WebHudSplitTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/web-hud-split.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, WebHudSplit.CATALOG).readText()).jsonObject
        assertEquals(WebHudSplit.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WebHudSplit.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WebHudSplit.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(WebHudSplit.MARKER, json.getValue("webHudSplitMarker").jsonPrimitive.content)
        assertEquals(WebHudSplit.APP_MAX_LINES, json.getValue("appMaxLines").jsonPrimitive.content.toInt())
        assertEquals(
            WebHudSplit.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(WebHudSplit.GAP_FLAG_CLOSED, json.getValue("gapFlagClosed").jsonPrimitive.content)
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(WebHudSplit.REQUIRED_FILES, required)
    }

    @Test
    fun appSlimAndPanelsExtracted() {
        val app = File(root, WebHudSplit.APP_PATH)
        assertTrue(app.isFile)
        val lines = app.readLines().size
        assertTrue(WebHudSplit.appSlim(lines))
        assertTrue(lines < 2802)

        val uiRoot = File(root, WebHudSplit.UI_PACKAGE_ROOT)
        val extracted = uiRoot.listFiles { f ->
            f.isFile && (f.name.endsWith(".ts") || f.name.endsWith(".tsx")) &&
                f.name != "App.tsx" && f.name != "Joystick.tsx" && f.name != "portraitLayout.ts"
        }?.size ?: 0
        assertTrue(WebHudSplit.extractedEnough(extracted))

        for (name in WebHudSplit.REQUIRED_FILES) {
            assertTrue("missing $name", File(uiRoot, name).isFile)
        }

        val body = app.readText()
        assertTrue(body.contains("export function App"))
        assertTrue(body.contains("function Hud"))
        assertTrue(body.contains("function World"))
        assertFalse(body.contains("function SettingsPanel"))
        assertFalse(body.contains("function QuestLogPanel"))
        assertFalse(body.contains("function formatCoins"))

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-3.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject
                .getValue("webHudDecomposition").jsonPrimitive.content.toBoolean(),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(3, listing.getValue("webHudSplitPhase").jsonPrimitive.content.toInt())
        assertEquals(WebHudSplit.CATALOG, listing.getValue("webHudSplitCatalog").jsonPrimitive.content)
        assertTrue(File(root, WebHudSplit.PARITY_FIXTURE).isFile)
    }
}
