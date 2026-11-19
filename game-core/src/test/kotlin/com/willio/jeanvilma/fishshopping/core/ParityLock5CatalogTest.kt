package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ParityLock5
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import java.io.File
import org.junit.Test
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive

class ParityLock5CatalogTest {
    private val root = File("../").canonicalFile

    @Test
    fun parityLock5CatalogLocksFinish5SuitesAndClosesGap() {
        val catalog = File(root, ParityLock5.CATALOG)
        assertTrue("missing ${ParityLock5.CATALOG}", catalog.exists())
        val json = Json.parseToJsonElement(catalog.readText()).jsonObject
        assertEquals(
            ParityLock5.PARITY_LOCK_5_MARKER,
            json.getValue("parityLock5Marker").jsonPrimitive.content,
        )
        assertEquals(ParityLock5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(ParityLock5.CLOSES_GAP, json.getValue("closesGap").jsonPrimitive.content)
        assertEquals(20, ParityLock5.SUITE_FLOOR)
        assertEquals(4, ParityLock5.FINISH5_SUITE_FLOOR)
        assertEquals(
            listOf("machines_13_14", "quests_contracts_5", "endgame_3", "rivals_seasonal_5"),
            ParityLock5.REQUIRED_FINISH5_SUITE_IDS,
        )
        assertEquals(ParityLock5.REQUIRED_FINISH5_SUITE_IDS, ParityLock.FINISH5_SUITE_IDS)
        assertTrue(ParityLock.SUITE_IDS.size >= 20)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains(ParityLock5.CLOSES_GAP))
        assertTrue(Finish5Kickoff.OPEN_GAP_FLAGS.isEmpty())
    }
}
