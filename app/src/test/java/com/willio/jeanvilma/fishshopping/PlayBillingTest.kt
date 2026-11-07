package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.billing.BillingCatalog
import com.willio.jeanvilma.fishshopping.billing.FakePlayStoreBridge
import com.willio.jeanvilma.fishshopping.billing.PlayEntitlementBilling
import com.willio.jeanvilma.fishshopping.billing.PurchaseOutcome
import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Post-1.0 Phase 1 — Play Billing catalog + fake-store purchase/restore path. */
class PlayBillingTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, "shared/billing/play-billing.json").isFile }
    }

    @Test
    fun catalogMatchesEntitlementsAndPlayBillingJson() {
        val play = JSONObject(File(root, "shared/billing/play-billing.json").readText())
        assertEquals(1, play.getInt("phase"))
        assertEquals("fish.billing.play_production.v1", play.getString("schema"))
        assertEquals("7.1.1", play.getString("billingLibrary"))
        assertEquals("play", play.getString("releaseBackend"))
        assertEquals("stub", play.getString("debugBackend"))

        val entitlements = JSONObject(File(root, "shared/billing/entitlements.json").readText())
        assertEquals(1, entitlements.getInt("androidPlayBillingPhase"))
        assertEquals(2, entitlements.getInt("webBillingPhase"))
        assertEquals(
            FullUnlockSystem.ANDROID_PRODUCT_ID,
            entitlements.getJSONObject("fullUnlock").getString("androidProductId"),
        )
        assertEquals(
            FullUnlockSystem.WEB_PRODUCT_ID,
            entitlements.getJSONObject("fullUnlock").getString("webProductId"),
        )
        assertEquals(FullUnlockSystem.SKU, BillingCatalog.FULL_UNLOCK.sku)
        assertEquals(FullUnlockSystem.ANDROID_PRODUCT_ID, BillingCatalog.FULL_UNLOCK.androidProductId)

        val cosmetics = entitlements.getJSONArray("cosmetics")
        assertEquals(CosmeticsIapSystem.CATALOG.size, cosmetics.length())
        assertEquals(BillingCatalog.COSMETICS.size, cosmetics.length())
        for (i in 0 until cosmetics.length()) {
            val row = cosmetics.getJSONObject(i)
            val product = BillingCatalog.BY_SKU.getValue(row.getString("sku"))
            assertEquals(row.getString("androidProductId"), product.androidProductId)
            assertEquals(row.getString("grantsCosmetic"), product.grantsCosmetic)
        }

        val skus = play.getJSONArray("skus")
        assertEquals(BillingCatalog.ALL.size, skus.length())
        for (i in 0 until skus.length()) {
            val row = skus.getJSONObject(i)
            assertEquals(
                BillingCatalog.androidProductIdForSku(row.getString("sku")),
                row.getString("androidProductId"),
            )
        }
    }

    @Test
    fun fakePlayPurchaseAndRestoreGrantsMappedSkus() = runBlocking {
        val bridge = FakePlayStoreBridge()
        val billing = PlayEntitlementBilling(context = null, bridge = bridge, activityProvider = { null })
        assertEquals("play", billing.kind)
        assertFalse(billing.owned())

        when (val buy = billing.purchaseFullUnlock("cloud-1")) {
            is PurchaseOutcome.Err -> throw AssertionError(buy.reason)
            is PurchaseOutcome.Ok -> {
                assertFalse(buy.alreadyOwned)
                assertTrue(buy.purchaseToken.startsWith("play-"))
            }
        }
        assertTrue(billing.owned())
        assertEquals(FullUnlockSystem.SKU, BillingCatalog.skuForAndroidProductId(FullUnlockSystem.ANDROID_PRODUCT_ID))

        val cosmetic = CosmeticsIapSystem.CATALOG.first()
        when (val buy = billing.purchaseCosmetic(cosmetic.sku, "cloud-1")) {
            is PurchaseOutcome.Err -> throw AssertionError(buy.reason)
            is PurchaseOutcome.Ok -> assertTrue(billing.ownedCosmetic(cosmetic.sku))
        }

        val restored = billing.restoreAll("cloud-1")
        assertEquals(2, restored.size)
        assertTrue(restored.any { it.sku == FullUnlockSystem.SKU && it.grantsCosmetic == null })
        assertTrue(restored.any { it.sku == cosmetic.sku && it.grantsCosmetic == cosmetic.grantsCosmetic })

        when (val again = billing.purchaseFullUnlock("cloud-1")) {
            is PurchaseOutcome.Ok -> assertTrue(again.alreadyOwned)
            is PurchaseOutcome.Err -> throw AssertionError(again.reason)
        }
    }

    @Test
    fun restorePullsSeededStorePurchases() = runBlocking {
        val bridge = FakePlayStoreBridge()
        bridge.seed(FullUnlockSystem.ANDROID_PRODUCT_ID, "tok-full")
        bridge.seed("fish_cosmetic_pearl_string", "tok-pearl")
        val billing = PlayEntitlementBilling(context = null, bridge = bridge)
        val restored = billing.restoreAll(null)
        assertEquals(2, restored.size)
        assertTrue(billing.owned())
        assertTrue(billing.ownedCosmetic("fish.cosmetic.pearl_string"))
        assertEquals("tok-full", billing.purchaseToken())
    }

    @Test
    fun purchaseSurfacesStoreErrors() = runBlocking {
        val bridge = FakePlayStoreBridge()
        bridge.failNextPurchase = "License tester required"
        val billing = PlayEntitlementBilling(context = null, bridge = bridge)
        when (val result = billing.purchaseFullUnlock(null)) {
            is PurchaseOutcome.Err -> assertTrue(result.reason.contains("License tester"))
            is PurchaseOutcome.Ok -> throw AssertionError("expected failure")
        }
    }
}
