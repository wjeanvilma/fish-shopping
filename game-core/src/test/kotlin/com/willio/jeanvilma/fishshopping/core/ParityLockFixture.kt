package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.ParityLock
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.long
import kotlinx.serialization.json.put
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Phase 27 — entitlements / unlock golden fixture + catalog gates.
 *
 * Regenerate with:
 *   ./gradlew :game-core:test --tests ParityLockFixtureTest -PrecordFixtures=true
 */
object ParityLockFixture {
    const val PATH = ParityLock.ENTITLEMENTS_FIXTURE
    const val SEED = 27001
    const val TICKS = 2L
    const val COSMETIC_ID = "banner.iap_sunset_bunting"
    const val TRAVEL_HARBOR = "harbor.moon_cove"

    fun record(): String {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, SEED))
        val commands = buildJsonArray {
            add(buildJsonObject {
                put("tick", 1)
                put("type", "grant_full_harbor_unlock")
                put("requestId", "parity-full-1")
            })
            add(buildJsonObject {
                put("tick", 2)
                put("type", "grant_iap_cosmetic")
                put("cosmeticId", COSMETIC_ID)
                put("requestId", "parity-cos-1")
            })
        }
        sim.checkedStep(listOf(Command.GrantFullHarborUnlock("parity-full-1")))
        sim.checkedStep(listOf(Command.GrantIapCosmetic(COSMETIC_ID, "parity-cos-1")))
        return buildJsonObject {
            put("name", "parity-entitlements")
            put(
                "description",
                "Phase 27: grant full-harbor unlock + IAP cosmetic (Moon Cove becomes travel-unlocked).",
            )
            put("contentVersion", Shared.content.contentVersion)
            put("harborId", HARBOR)
            put("seed", SEED)
            put("ticks", TICKS)
            put("commands", commands)
            put("expect", StarterLineFixture.expectedState(sim.state))
        }.toString()
    }
}

class ParityLockFixtureTest {
    private fun recording() = System.getProperty("recordFixtures") == "true"

    private fun fixture(): JsonObject =
        Json.parseToJsonElement(Shared.text(ParityLockFixture.PATH)).jsonObject

    private fun replay(untilTick: Long): Simulation {
        val f = fixture()
        val sim = Simulation(
            Shared.content,
            GameState.newGame(Shared.content, HARBOR, f["seed"]!!.jsonPrimitive.content.toInt()),
        )
        val byTick = f["commands"]!!.jsonArray.map { it.jsonObject }
            .groupBy({ it["tick"]!!.jsonPrimitive.long }, { StarterLineFixture.parseCommand(it) })
        while (sim.state.tick < untilTick) sim.checkedStep(byTick[sim.state.tick + 1].orEmpty())
        return sim
    }

    @Test
    fun catalogDocumentsExpandedSuites() {
        if (recording() && !File(Shared.root, ParityLockFixture.PATH).isFile) {
            File(Shared.root, ParityLockFixture.PATH).writeText(ParityLockFixture.record() + "\n")
        }
        val root = Shared.root
        val json = Json.parseToJsonElement(File(root, "fixtures/parity-lock.json").readText()).jsonObject
        assertEquals(ParityLock.PHASE, json["phase"]!!.jsonPrimitive.content.toInt())
        assertEquals(ParityLock.SCHEMA, json["schema"]!!.jsonPrimitive.content)
        assertEquals(ParityLock.CONTENT_VERSION, json["contentVersion"]!!.jsonPrimitive.content)
        assertEquals(ParityLock.SCHEMA_VERSION, json["schemaVersion"]!!.jsonPrimitive.content.toInt())
        val suites = json["suites"]!!.jsonArray.map { it.jsonObject["id"]!!.jsonPrimitive.content }
        assertEquals(ParityLock.SUITE_IDS, suites)
        for (field in ParityLock.EXPANDED_EXPECT_FIELDS) {
            assertTrue(
                field,
                json["expandedExpectFields"]!!.jsonArray.any { it.jsonPrimitive.content == field },
            )
        }
        assertTrue(File(root, ParityLock.ENTITLEMENTS_FIXTURE).isFile)
    }

    @Test
    fun entitlementsUnlockReplayMatchesSharedFixture() {
        if (recording()) {
            File(Shared.root, ParityLockFixture.PATH).writeText(ParityLockFixture.record() + "\n")
        }
        val f = fixture()
        assertEquals(Shared.content.contentVersion, f["contentVersion"]!!.jsonPrimitive.content)
        val sim = replay(f["ticks"]!!.jsonPrimitive.long)
        assertEquals(f["expect"], StarterLineFixture.expectedState(sim.state))
        assertTrue(sim.state.fullHarborUnlock)
        assertTrue(sim.state.unlockedCosmetics.contains(ParityLockFixture.COSMETIC_ID))
        assertEquals(HARBOR, sim.state.harborId)
        assertTrue(
            HarborTravelSystem.unlocked(
                Shared.content,
                sim.state,
                Shared.content.harborsById.getValue(ParityLockFixture.TRAVEL_HARBOR),
            ),
        )
    }

    @Test
    fun entitlementGrantsAreIdempotent() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 9))
        val fullReq = FullUnlockSystem.requestIdForPurchaseToken("parity-idem")
        val cosReq = CosmeticsIapSystem.requestIdForPurchaseToken(
            CosmeticsIapSystem.CATALOG.first { it.grantsCosmetic == ParityLockFixture.COSMETIC_ID }.sku,
            "parity-cos-idem",
        )
        sim.checkedStep(listOf(Command.GrantFullHarborUnlock(fullReq)))
        sim.checkedStep(listOf(Command.GrantIapCosmetic(ParityLockFixture.COSMETIC_ID, cosReq)))
        val coins = sim.state.coins
        val cosmetics = sim.state.unlockedCosmetics.toSet()
        sim.checkedStep(listOf(Command.GrantFullHarborUnlock(fullReq)))
        sim.checkedStep(listOf(Command.GrantIapCosmetic(ParityLockFixture.COSMETIC_ID, cosReq)))
        assertEquals(coins, sim.state.coins)
        assertEquals(cosmetics, sim.state.unlockedCosmetics.toSet())
        assertTrue(sim.state.fullHarborUnlock)
    }

    @Test
    fun starterLineExpectIncludesExpandedParityFields() {
        val expect = Json.parseToJsonElement(Shared.text(StarterLineFixture.PATH))
            .jsonObject["expect"]!!.jsonObject
        for (field in ParityLock.EXPANDED_EXPECT_FIELDS) {
            assertTrue("starter-line expect missing $field", expect.containsKey(field))
        }
        assertFalse(expect["fullHarborUnlock"]!!.jsonPrimitive.content.toBoolean())
        assertEquals(0, expect["loanOwed"]!!.jsonPrimitive.content.toLong())
        assertTrue(expect["tutorialIndex"]!!.jsonPrimitive.content.toInt() >= Shared.content.tutorial.size)
        assertTrue(expect["workers"]!!.jsonPrimitive.content.toInt() >= 1)
    }
}
