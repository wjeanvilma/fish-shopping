package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.QuestsContracts3
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 3.0 Phase 27 — quests/contracts expansion. */
class QuestsContracts3Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/quests-contracts-3.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, QuestsContracts3.CATALOG).readText()).jsonObject
        assertEquals(QuestsContracts3.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(QuestsContracts3.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(QuestsContracts3.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(
            QuestsContracts3.QUESTS_CONTRACTS_3_MARKER,
            json.getValue("questsContracts3Marker").jsonPrimitive.content,
        )
        assertEquals(QuestsContracts3.QUESTS_MIN, json.getValue("questsMin").jsonPrimitive.content.toInt())
        assertEquals(
            QuestsContracts3.DELIVERY_CHAINS_MIN,
            json.getValue("deliveryChainsMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(
            QuestsContracts3.REPUTATION_GATED_MIN,
            json.getValue("reputationGatedMin").jsonPrimitive.content.toInt(),
        )
        assertEquals(QuestsContracts3.NEW_CHAIN, json.getValue("newChain").jsonPrimitive.content)
        assertEquals(QuestsContracts3.NEW_CHAIN_HEAD, json.getValue("newChainHead").jsonPrimitive.content)
        assertEquals(
            QuestsContracts3.NEW_QUESTS.size,
            json.getValue("newQuests").jsonArray.size,
        )
    }

    @Test
    fun contentPackMeetsFloors() {
        val pack = Json.parseToJsonElement(File(root, "shared/content/content-pack.json").readText()).jsonObject
        val quests = pack.getValue("quests").jsonArray
        assertTrue(quests.size >= QuestsContracts3.QUESTS_MIN)
        val templates = pack.getValue("contracts").jsonObject.getValue("templates").jsonArray
        assertTrue(templates.size >= QuestsContracts3.CONTRACT_TEMPLATES_MIN)
        val chainIds = templates.mapNotNull {
            it.jsonObject["chainId"]?.jsonPrimitive?.content
        }.toSet()
        assertTrue(chainIds.size >= QuestsContracts3.DELIVERY_CHAINS_MIN)
        assertTrue(chainIds.contains(QuestsContracts3.NEW_CHAIN))
        val repGated = templates.count {
            it.jsonObject["requiresReputationBand"] != null
        }
        assertTrue(repGated >= QuestsContracts3.REPUTATION_GATED_MIN)
    }
}
