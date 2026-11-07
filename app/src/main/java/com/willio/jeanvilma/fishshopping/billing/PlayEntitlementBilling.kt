package com.willio.jeanvilma.fishshopping.billing

import android.content.Context
import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import org.json.JSONArray
import org.json.JSONObject

/**
 * Phase 1 (post-1.0) — Google Play Billing production path.
 * Purchases and restores go through [PlayStoreBridge]; local prefs mirror owned SKUs for cold start.
 */
class PlayEntitlementBilling(
    context: Context?,
    private val bridge: PlayStoreBridge,
    private val activityProvider: () -> android.app.Activity? = { BillingActivityHost.current() },
) : EntitlementBilling {
    override val kind = "play"

    private val prefs = context?.applicationContext?.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val lock = Any()
    private var records: MutableList<EntitlementRecord> = loadInitial().toMutableList()

    override suspend fun purchaseFullUnlock(cloudAccountId: String?): PurchaseOutcome =
        purchaseSku(FullUnlockSystem.SKU, cloudAccountId)

    override suspend fun purchaseCosmetic(sku: String, cloudAccountId: String?): PurchaseOutcome {
        if (sku !in CosmeticsIapSystem.BY_SKU) {
            return PurchaseOutcome.Err("Unknown cosmetic SKU")
        }
        return purchaseSku(sku, cloudAccountId)
    }

    override suspend fun restore(cloudAccountId: String?): Pair<Boolean, String?> {
        val all = restoreAll(cloudAccountId)
        val hit = all.find { it.sku == FullUnlockSystem.SKU } ?: return false to null
        return true to hit.purchaseToken
    }

    override suspend fun restoreAll(cloudAccountId: String?): List<RestoredEntitlement> {
        val storeOwned = bridge.queryOwned().getOrElse {
            // Fall back to local mirror when Play is unreachable.
            return localRestored(cloudAccountId)
        }
        synchronized(lock) {
            for (row in storeOwned) {
                val product = BillingCatalog.BY_ANDROID_PRODUCT_ID[row.androidProductId] ?: continue
                upsert(product.sku, row.purchaseToken, cloudAccountId)
            }
            persistLocked()
            return localRestoredLocked(cloudAccountId)
        }
    }

    override fun owned(): Boolean = synchronized(lock) {
        records.any { it.sku == FullUnlockSystem.SKU }
    }

    override fun ownedCosmetic(sku: String): Boolean = synchronized(lock) {
        records.any { it.sku == sku }
    }

    override fun purchaseToken(): String? = synchronized(lock) {
        records.find { it.sku == FullUnlockSystem.SKU }?.purchaseToken
    }

    override fun purchaseTokenForSku(sku: String): String? = synchronized(lock) {
        records.find { it.sku == sku }?.purchaseToken
    }

    fun endConnection() = bridge.endConnection()

    private suspend fun purchaseSku(sku: String, cloudAccountId: String?): PurchaseOutcome {
        synchronized(lock) {
            findSku(records, sku, cloudAccountId)?.let {
                if (cloudAccountId != null && it.cloudAccountId.isNullOrBlank()) {
                    associateCloud(records, it.purchaseToken, cloudAccountId)
                    persistLocked()
                }
                return PurchaseOutcome.Ok(it.purchaseToken, alreadyOwned = true)
            }
        }
        val productId = BillingCatalog.androidProductIdForSku(sku)
            ?: return PurchaseOutcome.Err("Unknown SKU")
        val alreadyLocal = synchronized(lock) { records.any { it.sku == sku } }
        val bought = bridge.purchase(activityProvider(), productId).getOrElse {
            return PurchaseOutcome.Err(it.message ?: "Purchase failed")
        }
        val mappedSku = BillingCatalog.skuForAndroidProductId(bought.androidProductId) ?: sku
        synchronized(lock) {
            val already = alreadyLocal || records.any { it.sku == mappedSku }
            upsert(mappedSku, bought.purchaseToken, cloudAccountId)
            persistLocked()
            return PurchaseOutcome.Ok(
                purchaseToken = bought.purchaseToken,
                alreadyOwned = already,
            )
        }
    }

    private fun upsert(sku: String, purchaseToken: String, cloudAccountId: String?) {
        val existing = records.indexOfFirst { it.sku == sku && it.purchaseToken == purchaseToken }
        if (existing >= 0) {
            val hit = records[existing]
            if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
                records[existing] = hit.copy(cloudAccountId = cloudAccountId)
            }
            return
        }
        if (records.any { it.sku == sku }) {
            // Same SKU, new token from store — keep store token as source of truth.
            records.removeAll { it.sku == sku }
        }
        records += EntitlementRecord(
            sku = sku,
            purchaseToken = purchaseToken,
            cloudAccountId = cloudAccountId,
            purchasedAtEpochMs = System.currentTimeMillis(),
        )
    }

    private fun localRestored(cloudAccountId: String?): List<RestoredEntitlement> = synchronized(lock) {
        localRestoredLocked(cloudAccountId)
    }

    private fun localRestoredLocked(cloudAccountId: String?): List<RestoredEntitlement> {
        val skus = listOf(FullUnlockSystem.SKU) + CosmeticsIapSystem.CATALOG.map { it.sku }
        val out = mutableListOf<RestoredEntitlement>()
        for (sku in skus) {
            val hit = findSku(records, sku, cloudAccountId) ?: records.find { it.sku == sku } ?: continue
            if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
                associateCloud(records, hit.purchaseToken, cloudAccountId)
            }
            out += RestoredEntitlement(sku, hit.purchaseToken, cosmeticGrant(sku))
        }
        persistLocked()
        return out
    }

    private fun loadInitial(): List<EntitlementRecord> {
        val json = prefs?.getString(KEY_RECORDS, null) ?: return emptyList()
        return try {
            val arr = JSONArray(json)
            buildList {
                for (i in 0 until arr.length()) {
                    val o = arr.getJSONObject(i)
                    add(
                        EntitlementRecord(
                            sku = o.getString("sku"),
                            purchaseToken = o.getString("purchaseToken"),
                            cloudAccountId = if (o.isNull("cloudAccountId")) {
                                null
                            } else {
                                o.optString("cloudAccountId").takeIf { it.isNotBlank() }
                            },
                            purchasedAtEpochMs = o.optLong("purchasedAtEpochMs", 0L),
                        ),
                    )
                }
            }
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun persistLocked() {
        val p = prefs ?: return
        val arr = JSONArray()
        for (r in records) {
            arr.put(
                JSONObject()
                    .put("sku", r.sku)
                    .put("purchaseToken", r.purchaseToken)
                    .put("cloudAccountId", r.cloudAccountId ?: JSONObject.NULL)
                    .put("purchasedAtEpochMs", r.purchasedAtEpochMs),
            )
        }
        p.edit().putString(KEY_RECORDS, arr.toString()).apply()
    }

    private companion object {
        const val PREFS = "fish_shopping_entitlements"
        const val KEY_RECORDS = "records_json"
    }
}
