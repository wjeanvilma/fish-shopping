package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.EntitlementReconcile
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class EntitlementReconcileTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/billing/entitlement-reconcile.json").isFile
        }
    }

    @Test
    fun catalogDocumentsStoreAsSourceOfTruthAndCrashLedger() {
        val json = Json.parseToJsonElement(
            File(root, "shared/billing/entitlement-reconcile.json").readText(),
        ).jsonObject
        assertEquals(EntitlementReconcile.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(EntitlementReconcile.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(
            "store",
            json.getValue("sourceOfTruth").jsonObject.getValue("paidSkus").jsonPrimitive.content,
        )
        assertTrue(
            json.getValue("crashSafety").jsonObject.getValue("pendingLedger").jsonPrimitive.content.toBoolean(),
        )
        assertEquals(
            "fish_shopping_pending_entitlements",
            json.getValue("crashSafety").jsonObject.getValue("androidPrefs").jsonPrimitive.content,
        )
        val entitlements = Json.parseToJsonElement(
            File(root, "shared/billing/entitlements.json").readText(),
        ).jsonObject
        assertEquals(3, entitlements.getValue("entitlementReconcilePhase").jsonPrimitive.content.toInt())
        assertTrue(json.getValue("skus").jsonArray.size >= 4)
    }

    @Test
    fun neededGrantsWhenSaveMissingFlagOrReceipt() {
        val token = "tok-full"
        val store = listOf(
            EntitlementReconcile.StoreOwned(FullUnlockSystem.SKU, token, null),
        )
        val empty = EntitlementReconcile.SaveSnapshot(false, emptySet(), emptySet())
        val needs = EntitlementReconcile.neededGrants(store, empty)
        assertEquals(1, needs.size)
        assertEquals("missing_flag_and_receipt", needs.single().reason)
        assertEquals(FullUnlockSystem.requestIdForPurchaseToken(token), needs.single().requestId)

        val flagged = empty.copy(fullHarborUnlock = true)
        val receiptOnly = EntitlementReconcile.neededGrants(store, flagged)
        assertEquals("missing_receipt", receiptOnly.single().reason)

        val complete = flagged.copy(
            purchaseReceiptIds = setOf(FullUnlockSystem.requestIdForPurchaseToken(token)),
        )
        assertTrue(EntitlementReconcile.neededGrants(store, complete).isEmpty())
        assertEquals(1, EntitlementReconcile.alreadySatisfiedCount(store, complete))
    }

    @Test
    fun mergePrefersStoreTokenAndFillsFromPending() {
        val store = listOf(
            EntitlementReconcile.StoreOwned(FullUnlockSystem.SKU, "store-tok", null),
        )
        val pending = listOf(
            EntitlementReconcile.StoreOwned(FullUnlockSystem.SKU, "pending-tok", null),
            EntitlementReconcile.StoreOwned(
                CosmeticsIapSystem.CATALOG.first().sku,
                "cos-tok",
                CosmeticsIapSystem.CATALOG.first().grantsCosmetic,
            ),
        )
        val merged = EntitlementReconcile.mergeStoreAndPending(store, pending)
        assertEquals(2, merged.size)
        assertEquals("store-tok", merged.first { it.sku == FullUnlockSystem.SKU }.purchaseToken)
        assertTrue(merged.any { it.grantsCosmetic != null })
    }

    @Test
    fun reconcileIntoSaveIsIdempotentAndDoesNotRevokePrestigeCosmetic() {
        val sim = Simulation(Shared.content, GameState.newGame(Shared.content, HARBOR, 1))
        // Prestige-style cosmetic already on save (not an IAP SKU grant).
        sim.state.unlockedCosmetics += "banner.prestige_only"
        val sku = CosmeticsIapSystem.CATALOG.first()
        val store = listOf(
            EntitlementReconcile.StoreOwned(FullUnlockSystem.SKU, "t-full", null),
            EntitlementReconcile.StoreOwned(sku.sku, "t-cos", sku.grantsCosmetic),
        )
        val needs = EntitlementReconcile.neededGrants(store, EntitlementReconcile.snapshotOf(sim.state))
        assertEquals(2, needs.size)
        for (need in needs) {
            if (need.cosmeticId != null) {
                sim.step(listOf(Command.GrantIapCosmetic(need.cosmeticId, need.requestId)))
            } else {
                sim.step(listOf(Command.GrantFullHarborUnlock(need.requestId)))
            }
        }
        assertTrue(sim.state.fullHarborUnlock)
        assertTrue(sku.grantsCosmetic in sim.state.unlockedCosmetics)
        assertTrue("banner.prestige_only" in sim.state.unlockedCosmetics)

        val again = EntitlementReconcile.neededGrants(store, EntitlementReconcile.snapshotOf(sim.state))
        assertTrue(again.isEmpty())
        val beforeCoins = sim.state.coins
        for (need in needs) {
            if (need.cosmeticId != null) {
                sim.step(listOf(Command.GrantIapCosmetic(need.cosmeticId, need.requestId)))
            } else {
                sim.step(listOf(Command.GrantFullHarborUnlock(need.requestId)))
            }
        }
        assertEquals(beforeCoins, sim.state.coins)
        assertTrue(EntitlementReconcile.neededGrants(store, EntitlementReconcile.snapshotOf(sim.state)).isEmpty())
    }
}
