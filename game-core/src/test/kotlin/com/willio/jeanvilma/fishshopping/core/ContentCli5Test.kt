package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ContentCli5
import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import java.io.File
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ContentCli5Test {
    private val root = File("../").canonicalFile

    @Test
    fun contentCli5CatalogLocksWave5FloorsAndClosesGap() {
        val catalog = File(root, ContentCli5.CATALOG)
        assertTrue("missing ${ContentCli5.CATALOG}", catalog.exists())
        val json = Json.parseToJsonElement(catalog.readText()).jsonObject
        assertEquals(
            ContentCli5.CONTENT_CLI_5_MARKER,
            json.getValue("contentCli5Marker").jsonPrimitive.content,
        )
        assertEquals(ContentCli5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ContentCli5.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(11, ContentCli5.SCAFFOLD_KIND_MIN)
        assertEquals(listOf("seasonal", "endgame", "cosmetic"), ContentCli5.WAVE5_KINDS)
        assertTrue(ContentCli5.FEATURES.contains("check-floors"))
        assertTrue(ContentCli5.FEATURES.contains("seasonal"))
        assertEquals(125, ContentCli5.PACK_FLOOR_SPECIES)
        assertEquals(14, ContentCli5.PACK_FLOOR_MACHINES)
        assertEquals(16, ContentCli5.PACK_FLOOR_RIVALS)
        assertEquals(16, ContentCli5.PACK_FLOOR_SEASONAL)
        assertEquals(24, ContentCli5.PACK_FLOOR_COSMETICS)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(ContentCli5.CLOSES_GAP))
        // Soft-floor: Phase 28 leaves ≤1 open boolean gap; Phase 29 may close the last.
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.size <= 1)
    }
}
