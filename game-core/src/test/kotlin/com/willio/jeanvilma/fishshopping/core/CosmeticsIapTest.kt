package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.core.world.DecorSystem
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class CosmeticsIapTest {
    @Test
    fun catalogIsPowerNeutralAndNeverGatesPatienceDecor() {
        val root = File(".").canonicalFile.let { dir ->
            generateSequence(dir) { it.parentFile }.first { File(it, "shared/billing/entitlements.json").isFile }
        }
        val json = Json.parseToJsonElement(File(root, "shared/billing/entitlements.json").readText()).jsonObject
        val cosmetics = json.getValue("cosmetics").jsonArray
        assertEquals(CosmeticsIapSystem.CATALOG.size, cosmetics.size)
        for (row in cosmetics) {
            val o = row.jsonObject
            assertTrue(o.getValue("powerNeutral").jsonPrimitive.content.toBoolean())
            val grants = o.getValue("grantsCosmetic").jsonPrimitive.content
            assertTrue(grants in CosmeticsIapSystem.GRANTED_COSMETICS)
            val sku = CosmeticsIapSystem.BY_SKU.getValue(o.getValue("sku").jsonPrimitive.content)
            assertEquals(sku.androidProductId, o.getValue("androidProductId").jsonPrimitive.content)
            assertEquals(sku.webProductId, o.getValue("webProductId").jsonPrimitive.content)
            assertTrue(
                Shared.content.decor.items.none { it.requiresCosmetic == grants },
            )
        }
        assertEquals(3, simViewOffers())
    }

    @Test
    fun grantIsIdempotentAndDoesNotChangeRatesOrPatience() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 1))
        val sku = CosmeticsIapSystem.CATALOG.first()
        val beforeCoins = sim.state.coins
        val beforeCatch = sim.state.prestigeCatchSpeedPermille
        val beforePrice = sim.state.prestigePriceBonusPermille
        val beforePatience = DecorSystem.patienceBonusTicks(Shared.content, sim.state)

        val req = CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "tok-cosmetic")
        val first = sim.step(listOf(Command.GrantIapCosmetic(sku.grantsCosmetic, req)))
        assertTrue(sku.grantsCosmetic in sim.state.unlockedCosmetics)
        assertTrue(first.filterIsInstance<GameEvent.IapCosmeticGranted>().any { !it.replayed })
        assertEquals(beforeCoins, sim.state.coins)
        assertEquals(beforeCatch, sim.state.prestigeCatchSpeedPermille)
        assertEquals(beforePrice, sim.state.prestigePriceBonusPermille)
        assertEquals(beforePatience, DecorSystem.patienceBonusTicks(Shared.content, sim.state))

        val retry = sim.step(listOf(Command.GrantIapCosmetic(sku.grantsCosmetic, req)))
        assertTrue(retry.filterIsInstance<GameEvent.IapCosmeticGranted>().any { it.replayed })
        assertEquals(beforeCoins, sim.state.coins)
        assertEquals(beforePatience, DecorSystem.patienceBonusTicks(Shared.content, sim.state))
    }

    @Test
    fun unknownCosmeticIsRejected() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 2))
        val events = sim.step(listOf(Command.GrantIapCosmetic("banner.not_real", "iap-cosmetic:x:tok")))
        assertTrue(events.filterIsInstance<GameEvent.IapCosmeticRejected>().any())
        assertFalse("banner.not_real" in sim.state.unlockedCosmetics)
    }

    @Test
    fun viewListsCosmeticOffers() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 4))
        val offers = sim.view().cosmeticIapOffers
        assertEquals(CosmeticsIapSystem.CATALOG.size, offers.size)
        assertTrue(offers.all { it.status == "available" })
        val sku = CosmeticsIapSystem.CATALOG[1]
        sim.step(
            listOf(
                Command.GrantIapCosmetic(
                    sku.grantsCosmetic,
                    CosmeticsIapSystem.requestIdForPurchaseToken(sku.sku, "owned"),
                ),
            ),
        )
        val after = sim.view().cosmeticIapOffers.first { it.sku == sku.sku }
        assertEquals("owned", after.status)
    }

    private fun simViewOffers(): Int =
        Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 1)).view().cosmeticIapOffers.size
}
