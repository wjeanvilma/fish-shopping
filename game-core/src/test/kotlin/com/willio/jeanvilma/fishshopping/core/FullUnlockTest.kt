package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.world.HarborTravelSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class FullUnlockTest {
    @Test
    fun catalogDocumentsFreeSunriseAndPowerNeutralSku() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/billing/entitlements.json").isFile }
        }
        val json = Json.parseToJsonElement(File(root, "shared/billing/entitlements.json").readText()).jsonObject
        assertEquals(FullUnlockSystem.FREE_HARBOR_ID, json.getValue("freeHarborId").jsonPrimitive.content)
        val full = json.getValue("fullUnlock").jsonObject
        assertEquals(FullUnlockSystem.SKU, full.getValue("sku").jsonPrimitive.content)
        assertEquals(
            FullUnlockSystem.ANDROID_PRODUCT_ID,
            full.getValue("androidProductId").jsonPrimitive.content,
        )
        assertEquals(
            FullUnlockSystem.WEB_PRODUCT_ID,
            full.getValue("webProductId").jsonPrimitive.content,
        )
        assertTrue(full.getValue("powerNeutral").jsonPrimitive.content.toBoolean())
        assertTrue(Shared.content.harborsById.getValue(FullUnlockSystem.FREE_HARBOR_ID).requires.isEmpty())
        assertTrue(SimConstants.SCHEMA_VERSION >= 21)
    }

    @Test
    fun grantIsIdempotentAndUnlocksEveryHarborWithoutRateChanges() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 1))
        val moon = Shared.content.harborsById.getValue("harbor.moon_cove")
        assertFalse(HarborTravelSystem.unlocked(Shared.content, sim.state, moon))

        val req = FullUnlockSystem.requestIdForPurchaseToken("tok-abc")
        val first = sim.step(listOf(Command.GrantFullHarborUnlock(req)))
        assertTrue(sim.state.fullHarborUnlock)
        assertTrue(first.filterIsInstance<GameEvent.FullHarborUnlockGranted>().any { !it.replayed })
        for (h in Shared.content.harbors) {
            assertTrue(HarborTravelSystem.unlocked(Shared.content, sim.state, h))
        }

        val beforeCoins = sim.state.coins
        val beforeCatch = sim.state.prestigeCatchSpeedPermille
        val beforePrice = sim.state.prestigePriceBonusPermille
        val retry = sim.step(listOf(Command.GrantFullHarborUnlock(req)))
        assertTrue(retry.filterIsInstance<GameEvent.FullHarborUnlockGranted>().any { it.replayed })
        assertEquals(beforeCoins, sim.state.coins)
        assertEquals(beforeCatch, sim.state.prestigeCatchSpeedPermille)
        assertEquals(beforePrice, sim.state.prestigePriceBonusPermille)
    }

    @Test
    fun snapshotRoundTripsFullHarborUnlock() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 3))
        sim.step(listOf(Command.GrantFullHarborUnlock("full-unlock:persist")))
        val saved = SnapshotCodec.encode(Shared.content, sim.state, savedAtEpochMs = 5_000)
        assertTrue(saved.startsWith("{\"schemaVersion\":${SimConstants.SCHEMA_VERSION},"))
        val loaded = SnapshotCodec.decode(Shared.content, saved)
        assertTrue(loaded.fullHarborUnlock)
    }
}
