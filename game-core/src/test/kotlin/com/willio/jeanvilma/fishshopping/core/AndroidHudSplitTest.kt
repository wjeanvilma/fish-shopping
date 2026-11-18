package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.AndroidHudSplit
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 2 — Android HUD panel decomposition. */
class AndroidHudSplitTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/android-hud-split.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, AndroidHudSplit.CATALOG).readText()).jsonObject
        assertEquals(AndroidHudSplit.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AndroidHudSplit.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(AndroidHudSplit.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(AndroidHudSplit.MARKER, json.getValue("androidHudSplitMarker").jsonPrimitive.content)
        assertEquals(
            AndroidHudSplit.GAME_SCREEN_MAX_LINES,
            json.getValue("gameScreenMaxLines").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            AndroidHudSplit.EXTRACTED_FILE_MIN,
            json.getValue("extractedFileMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            AndroidHudSplit.GAP_FLAG_CLOSED,
            json.getValue("gapFlagClosed").jsonPrimitive.content,
        )
        val required = json.getValue("requiredFiles").jsonArray.map { it.jsonPrimitive.content }
        assertEquals(AndroidHudSplit.REQUIRED_FILES, required)
    }

    @Test
    fun gameScreenSlimAndPanelsExtracted() {
        val gameScreen = File(root, AndroidHudSplit.GAME_SCREEN_PATH)
        assertTrue(gameScreen.isFile)
        val lines = gameScreen.readLines().size
        assertTrue(AndroidHudSplit.gameScreenSlim(lines))
        assertTrue(lines < 3668) // pre-split god-file size

        val hudRoot = File(root, AndroidHudSplit.HUD_PACKAGE_ROOT)
        val extracted = hudRoot.listFiles { f ->
            f.isFile && f.name.endsWith(".kt") &&
                f.name != "GameScreen.kt" && f.name != "Joystick.kt" && f.name != "TapToMove.kt"
        }?.size ?: 0
        assertTrue(AndroidHudSplit.extractedEnough(extracted))

        for (name in AndroidHudSplit.REQUIRED_FILES) {
            assertTrue("missing $name", File(hudRoot, name).isFile)
        }

        val body = gameScreen.readText()
        assertTrue(body.contains("fun GameScreen"))
        assertTrue(body.contains("fun Hud"))
        assertFalse(body.contains("fun SettingsPanel"))
        assertFalse(body.contains("fun QuestLogPanel"))

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-3.0-kickoff.json").readText(),
        ).jsonObject
        assertEquals(
            false,
            kickoff.getValue("gaps").jsonObject
                .getValue("androidHudDecomposition").jsonPrimitive.content.toBoolean(),
        )

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(2, listing.getValue("androidHudSplitPhase").jsonPrimitive.content.toInt())
        assertEquals(
            AndroidHudSplit.CATALOG,
            listing.getValue("androidHudSplitCatalog").jsonPrimitive.content,
        )
        assertTrue(File(root, AndroidHudSplit.PARITY_FIXTURE).isFile)
    }
}
