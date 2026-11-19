package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ParityLock6
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import java.io.File
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ParityLock6CatalogTest {
    private val root = File("../").canonicalFile

    @Test
    fun parityLock6CatalogLocksFinish6SuitesAndClosesGap() {
        val catalog = File(root, ParityLock6.CATALOG)
        assertTrue("missing ${ParityLock6.CATALOG}", catalog.exists())
        val json = Json.parseToJsonElement(catalog.readText()).jsonObject
        assertEquals(
            ParityLock6.PARITY_LOCK_6_MARKER,
            json.getValue("parityLock6Marker").jsonPrimitive.content,
        )
        assertEquals(ParityLock6.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock6.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(24, ParityLock6.SUITE_FLOOR)
        assertEquals(4, ParityLock6.FINISH6_SUITE_FLOOR)
        assertEquals(
            listOf("machines_15_16", "quests_contracts_6", "endgame_4", "rivals_seasonal_6"),
            ParityLock6.REQUIRED_FINISH6_SUITE_IDS,
        )
        assertEquals(ParityLock6.REQUIRED_FINISH6_SUITE_IDS, ParityLock.FINISH6_SUITE_IDS)
        assertTrue(ParityLock.SUITE_IDS.size >= 24)
        assertEquals(27, ParityLock.SCHEMA_VERSION)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains(ParityLock6.CLOSES_GAP))
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.isEmpty())
    }
}
