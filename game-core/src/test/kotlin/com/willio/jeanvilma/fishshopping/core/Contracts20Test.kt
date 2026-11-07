package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.contracts.ContractSystem
import com.willio.jeanvilma.fishshopping.core.customers.ReputationSystem
import com.willio.jeanvilma.fishshopping.core.ship.Contracts20
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Stats
import com.willio.jeanvilma.fishshopping.core.sim.view
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Finish 2.0 Phase 17 — Contracts 2.0. */
class Contracts20Test {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/ship/contracts-2.0.json").isFile
        }
    }

    @Test
    fun catalogMatchesSharedShipJson() {
        val json = Json.parseToJsonElement(File(root, Contracts20.CATALOG).readText()).jsonObject
        assertEquals(Contracts20.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(Contracts20.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            Contracts20.DELIVERY_CHAIN_COUNT,
            json.getValue("deliveryChainCount").jsonPrimitive.content.toInt(),
        )
        for (id in Contracts20.CHAIN_HEAD_IDS) {
            assertTrue(id, Shared.content.contractTemplatesById.containsKey(id))
        }
        for (id in Contracts20.REPUTATION_GATED_IDS) {
            assertTrue(id, Shared.content.contractTemplatesById.containsKey(id))
        }
        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(17, listing.getValue("contracts2Phase").jsonPrimitive.content.toInt())
        assertEquals(Contracts20.CATALOG, listing.getValue("contracts2Catalog").jsonPrimitive.content)
        val dod = Json.parseToJsonElement(File(root, "shared/ship/definition-of-done.json").readText()).jsonObject
        assertEquals(2, dod.getValue("quotas").jsonObject.getValue("deliveryChains").jsonPrimitive.int)
        assertEquals(2, dod.getValue("quotas").jsonObject.getValue("reputationGatedContracts").jsonPrimitive.int)
    }

    @Test
    fun morningChainAdvancesAndFailStreakPressuresBoard() {
        val fx = Json.parseToJsonElement(File(root, Contracts20.PARITY_FIXTURE).readText()).jsonObject
        val content = Shared.content
        val headId = fx.getValue("chainHeadId").jsonPrimitive.content
        val step2Id = fx.getValue("chainStep2Id").jsonPrimitive.content
        val chainId = fx.getValue("chainId").jsonPrimitive.content
        assertEquals(3, ContractSystem.chainLength(content, chainId))

        val sim = Simulation(
            content,
            GameState.newGame(
                content,
                fx.getValue("harborId").jsonPrimitive.content,
                fx.getValue("seed").jsonPrimitive.int,
            ),
        )
        sim.state.completedQuests += content.contracts.requires
        sim.state.contractBoardRefreshAt = 0
        sim.step()
        // Force the chain head onto the board.
        val head = content.contractTemplatesById.getValue(headId)
        sim.state.contractOffers.clear()
        sim.state.contractOffers += com.willio.jeanvilma.fishshopping.core.sim.ContractOffer(
            id = "offer-chain",
            templateId = head.id,
            itemId = head.item,
            quantity = head.quantity,
            durationTicks = head.durationTicks,
            payout = head.payout,
            penalty = head.penalty,
        )
        sim.step(listOf(Command.AcceptContract("offer-chain", "accept-chain")))
        val job = sim.state.activeContracts.single()
        assertEquals(headId, job.templateId)

        sim.state.player.bag.add(head.item, head.quantity)
        sim.step(listOf(Command.DeliverContract(job.id, "deliver-1")))
        assertEquals(1, sim.state.activeContracts.size)
        assertEquals(step2Id, sim.state.activeContracts.single().templateId)
        assertEquals(0, ContractSystem.failStreak(sim.state))
        val view = sim.view()
        assertEquals(chainId, view.activeContracts.single().chainId)
        assertEquals(2, view.activeContracts.single().chainStep)

        // Fail streak pressure
        sim.state.stats[Stats.CONTRACT_FAIL_STREAK] = content.contracts.failStreakThreshold.toLong()
        assertTrue(ContractSystem.effectiveBoardSlots(content, sim.state) < content.contracts.boardSlots)
        assertTrue(
            ContractSystem.offerWeight(content, sim.state, head) < head.weight ||
                content.contracts.failStreakOfferWeightMultPermille < 1000,
        )

        // Reputation gate
        val vip = content.contractTemplatesById.getValue(fx.getValue("repGatedId").jsonPrimitive.content)
        assertFalse(ContractSystem.templateEligibleForBoard(content, sim.state, vip))
        // Force Excellent band via high sales / zero losses.
        sim.state.stats[Stats.SALES] = 100L
        sim.state.stats[Stats.LOST_CUSTOMERS] = 0L
        assertTrue(ReputationSystem.band(content, sim.state) >= vip.requiresReputationBand!!)
        assertTrue(ContractSystem.templateEligibleForBoard(content, sim.state, vip))
        assertNotNull(sim.view().contractFailStreakThreshold)
    }
}
