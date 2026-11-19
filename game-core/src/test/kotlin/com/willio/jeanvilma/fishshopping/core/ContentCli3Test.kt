package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.ContentCli3
import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import java.io.File
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ContentCli3Test {
    private val root = File("../").canonicalFile

    @Test
    fun contentCli3CatalogLocksWave3FloorsAndClosesGap() {
        val catalog = File(root, ContentCli3.CATALOG)
        assertTrue("missing ${ContentCli3.CATALOG}", catalog.exists())
        val json = Json.parseToJsonElement(catalog.readText()).jsonObject
        assertEquals(
            ContentCli3.CONTENT_CLI_3_MARKER,
            json.getValue("contentCli3Marker").jsonPrimitive.content,
        )
        assertEquals(ContentCli3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ContentCli3.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(8, ContentCli3.SCAFFOLD_KIND_MIN)
        assertEquals(listOf("machine", "rival"), ContentCli3.WAVE3_KINDS)
        assertTrue(ContentCli3.FEATURES.contains("check-floors"))
        assertEquals(100, ContentCli3.PACK_FLOOR_SPECIES)
        assertEquals(12, ContentCli3.PACK_FLOOR_MACHINES)
        assertEquals(12, ContentCli3.PACK_FLOOR_RIVALS)
        assertFalse(Finish4Kickoff.OPEN_GAP_FLAGS.contains(ContentCli3.CLOSES_GAP))
        assertTrue(Finish4Kickoff.OPEN_GAP_FLAGS.size <= 1)
    }
}
