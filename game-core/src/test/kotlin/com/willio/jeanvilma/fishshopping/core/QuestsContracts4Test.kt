package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish4Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.QuestsContracts4
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 4.0 Phase 14 — quests/contracts expansion. */
class QuestsContracts4Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/quests-contracts-4.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, QuestsContracts4.CATALOG).readText()).jsonObject
        assertEquals(QuestsContracts4.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(QuestsContracts4.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(QuestsContracts4.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            QuestsContracts4.QUESTS_CONTRACTS_4_MARKER,
            json.getValue("questsContracts4Marker").jsonPrimitive.content,
        )
        assertEquals(QuestsContracts4.QUESTS_MIN, json.getValue("questsMin").jsonPrimitive.content.toInt())
        assertEquals(
            QuestsContracts4.DELIVERY_CHAINS_MIN,
            json.getValue("deliveryChainsMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            QuestsContracts4.REPUTATION_GATED_MIN,
            json.getValue("reputationGatedMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            QuestsContracts4.NEW_QUESTS.size,
            json.getValue("newQuests").jsonArray.size,
        )
        assertEquals(
            QuestsContracts4.NEW_CHAINS.size,
            json.getValue("newChains").jsonArray.size,
        )
    }

    @Test
    fun contentPackMeetsFloors() {
        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        val quests = pack.getValue("quests").jsonArray
        assertTrue(quests.size >= QuestsContracts4.QUESTS_MIN)
        assertTrue(
            quests.any { it.jsonObject.getValue("id").jsonPrimitive.content == QuestsContracts4.TERMINAL_QUEST },
        )
        val templates = pack.getValue("contracts").jsonObject.getValue("templates").jsonArray
        assertTrue(templates.size >= QuestsContracts4.CONTRACT_TEMPLATES_MIN)
        val chainIds = templates.mapNotNull {
            it.jsonObject["chainId"]?.jsonPrimitive?.content
        }.toSet()
        assertTrue(chainIds.size >= QuestsContracts4.DELIVERY_CHAINS_MIN)
        for (id in QuestsContracts4.NEW_CHAINS) {
            assertTrue(chainIds.contains(id))
        }
        val repGated = templates.count {
            it.jsonObject["requiresReputationBand"] != null
        }
        assertTrue(repGated >= QuestsContracts4.REPUTATION_GATED_MIN)

        val kickoff = Json.parseToJsonElement(File(root, Finish4Kickoff.CATALOG).readText()).jsonObject
        assertEquals(50, kickoff.getValue("baseline").jsonObject.getValue("quests").jsonPrimitive.content.toInt())
        assertEquals(5, kickoff.getValue("baseline").jsonObject.getValue("deliveryChains").jsonPrimitive.content.toInt())
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("questsRemaining").jsonPrimitive.content.toInt())
    }
}
