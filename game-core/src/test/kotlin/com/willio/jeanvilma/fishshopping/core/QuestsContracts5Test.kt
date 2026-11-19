package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.QuestsContracts5
import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 5.0 Phase 16 — quests/contracts expansion floors. */
class QuestsContracts5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, "shared/ship/quests-contracts-5.json").isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, QuestsContracts5.CATALOG).readText()).jsonObject
        assertEquals(QuestsContracts5.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(QuestsContracts5.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            QuestsContracts5.QUESTS_CONTRACTS_5_MARKER,
            json.getValue("questsContracts5Marker").jsonPrimitive.content,
        )
        assertEquals(QuestsContracts5.QUESTS_MIN, json.getValue("questsMin").jsonPrimitive.int)
        assertEquals(QuestsContracts5.DELIVERY_CHAINS_MIN, json.getValue("deliveryChainsMin").jsonPrimitive.int)
        assertEquals(23, json.getValue("newQuests").jsonArray.size)

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(16, listing.getValue("questsContracts5Phase").jsonPrimitive.content.toInt())
        assertEquals(QuestsContracts5.CATALOG, listing.getValue("questsContracts5Catalog").jsonPrimitive.content)
    }

    @Test
    fun contentMeetsQuestChainFloors() {
        assertTrue(Shared.content.quests.size >= QuestsContracts5.QUESTS_MIN)
        for (id in QuestsContracts5.NEW_QUESTS) {
            assertTrue(id, Shared.content.questsById.containsKey(id))
        }
        assertTrue(Shared.content.questsById.containsKey(QuestsContracts5.TERMINAL_QUEST))
        for (id in QuestsContracts5.NEW_CHAINS) {
            assertEquals(3, ContractSystem.chainLength(Shared.content, id))
        }
        for (id in QuestsContracts5.NEW_REPUTATION_GATED) {
            assertTrue(id, Shared.content.contractTemplatesById.containsKey(id))
        }
        val chains = Shared.content.contracts.templates.mapNotNull { it.chainId }.toSet()
        assertTrue(chains.size >= QuestsContracts5.DELIVERY_CHAINS_MIN)
        val rep = Shared.content.contracts.templates.count { it.requiresReputationBand != null }
        assertTrue(rep >= QuestsContracts5.REPUTATION_GATED_MIN)

        val kickoff = Json.parseToJsonElement(File(repoRoot(), Finish5Kickoff.CATALOG).readText()).jsonObject
        assertTrue(kickoff.getValue("baseline").jsonObject.getValue("quests").jsonPrimitive.int >= 75)
        assertTrue(kickoff.getValue("baseline").jsonObject.getValue("deliveryChains").jsonPrimitive.int >= 7)
        assertEquals(0, kickoff.getValue("gaps").jsonObject.getValue("questsRemaining").jsonPrimitive.int)
    }
}
