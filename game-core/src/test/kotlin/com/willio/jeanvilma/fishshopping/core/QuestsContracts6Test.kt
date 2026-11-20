package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish6Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.QuestsContracts6
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 6.0 Phase 13 — quests/contracts readiness. */
class QuestsContracts6Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, QuestsContracts6.CATALOG).isFile }
    }

    @Test
    fun catalogLocksFloorsAndMarker() {
        val catalog = Json.parseToJsonElement(File(root, QuestsContracts6.CATALOG).readText()).jsonObject
        assertEquals(QuestsContracts6.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(QuestsContracts6.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(
            QuestsContracts6.QUESTS_CONTRACTS_6_MARKER,
            catalog.getValue("questsContracts6Marker").jsonPrimitive.content,
        )
        assertEquals(QuestsContracts6.QUESTS_MIN, catalog.getValue("questsMin").jsonPrimitive.content.toInt())
        assertEquals(
            QuestsContracts6.DELIVERY_CHAINS_MIN,
            catalog.getValue("deliveryChainsMin").jsonPrimitive.content.toInt(),
        )
        assertTrue(QuestsContracts6.NEW_QUESTS.contains(QuestsContracts6.TERMINAL_QUEST))
        assertEquals(2, QuestsContracts6.NEW_CHAINS.size)
    }

    @Test
    fun listingAndKickoffSoftFloor() {
        val listing = Json.parseToJsonElement(
            File(root, "shared/store/listing.json").readText(),
        ).jsonObject
        assertEquals(13, listing.getValue("questsContracts6Phase").jsonPrimitive.content.toInt())
        assertEquals(
            QuestsContracts6.CATALOG,
            listing.getValue("questsContracts6Catalog").jsonPrimitive.content,
        )

        val kickoff = Json.parseToJsonElement(
            File(root, "shared/ship/finish-6.0-kickoff.json").readText(),
        ).jsonObject
        val gaps = kickoff.getValue("gaps").jsonObject
        assertEquals(0, gaps.getValue("questsRemaining").jsonPrimitive.content.toInt())
        // Soft-floor: Phase 15 closed contentFloorsShort.
        assertFalse(gaps.getValue("contentFloorsShort").jsonPrimitive.content.toBoolean())
        assertTrue(Finish6Kickoff.OPEN_GAP_FLAGS.size <= 16)
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("audioVfx6Incomplete"))
        assertFalse(Finish6Kickoff.OPEN_GAP_FLAGS.contains("contentFloorsShort"))
    }
}
