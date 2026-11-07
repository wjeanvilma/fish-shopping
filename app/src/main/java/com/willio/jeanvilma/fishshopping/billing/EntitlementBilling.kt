package com.willio.jeanvilma.fishshopping.billing

import android.content.Context
import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

/**
 * Phase 23–24 — full-harbor unlock + optional cosmetics billing.
 * Stub stores non-consumables locally; swap for Play Billing BillingClient in release.
 */
data class EntitlementRecord(
    val sku: String,
    val purchaseToken: String,
    val cloudAccountId: String?,
    val purchasedAtEpochMs: Long,
)

data class RestoredEntitlement(
    val sku: String,
    val purchaseToken: String,
    val grantsCosmetic: String?,
)

sealed class PurchaseOutcome {
    data class Ok(val purchaseToken: String, val alreadyOwned: Boolean) : PurchaseOutcome()
    data class Err(val reason: String) : PurchaseOutcome()
}

interface EntitlementBilling {
    val kind: String
    fun purchaseFullUnlock(cloudAccountId: String?): PurchaseOutcome
    fun purchaseCosmetic(sku: String, cloudAccountId: String?): PurchaseOutcome
    fun restore(cloudAccountId: String?): Pair<Boolean, String?>
    fun restoreAll(cloudAccountId: String?): List<RestoredEntitlement>
    fun owned(): Boolean
    fun ownedCosmetic(sku: String): Boolean
    fun purchaseToken(): String?
    fun purchaseTokenForSku(sku: String): String?
}

private fun findSku(
    records: List<EntitlementRecord>,
    sku: String,
    cloudAccountId: String?,
): EntitlementRecord? {
    val matches = records.filter { it.sku == sku }
    if (cloudAccountId != null) {
        matches.find { it.cloudAccountId == cloudAccountId }?.let { return it }
    }
    return matches.find { it.cloudAccountId.isNullOrBlank() } ?: matches.firstOrNull()
}

private fun cosmeticGrant(sku: String): String? =
    CosmeticsIapSystem.BY_SKU[sku]?.grantsCosmetic

private fun associateCloud(
    records: MutableList<EntitlementRecord>,
    purchaseToken: String,
    cloudAccountId: String,
) {
    val idx = records.indexOfFirst { it.purchaseToken == purchaseToken }
    if (idx < 0) return
    val hit = records[idx]
    if (hit.cloudAccountId.isNullOrBlank()) {
        records[idx] = hit.copy(cloudAccountId = cloudAccountId)
    }
}

class MemoryEntitlementBilling : EntitlementBilling {
    override val kind = "memory"
    private val records = mutableListOf<EntitlementRecord>()

    override fun purchaseFullUnlock(cloudAccountId: String?): PurchaseOutcome =
        purchaseSku(FullUnlockSystem.SKU, cloudAccountId)

    override fun purchaseCosmetic(sku: String, cloudAccountId: String?): PurchaseOutcome {
        if (sku !in CosmeticsIapSystem.BY_SKU) {
            return PurchaseOutcome.Err("Unknown cosmetic SKU")
        }
        return purchaseSku(sku, cloudAccountId)
    }

    override fun restore(cloudAccountId: String?): Pair<Boolean, String?> {
        val hit = findSku(records, FullUnlockSystem.SKU, cloudAccountId) ?: return false to null
        if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
            associateCloud(records, hit.purchaseToken, cloudAccountId)
        }
        return true to hit.purchaseToken
    }

    override fun restoreAll(cloudAccountId: String?): List<RestoredEntitlement> {
        val skus = listOf(FullUnlockSystem.SKU) + CosmeticsIapSystem.CATALOG.map { it.sku }
        return skus.mapNotNull { sku ->
            val hit = findSku(records, sku, cloudAccountId) ?: records.find { it.sku == sku }
            if (hit == null) return@mapNotNull null
            if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
                associateCloud(records, hit.purchaseToken, cloudAccountId)
            }
            RestoredEntitlement(sku, hit.purchaseToken, cosmeticGrant(sku))
        }
    }

    override fun owned(): Boolean = records.any { it.sku == FullUnlockSystem.SKU }
    override fun ownedCosmetic(sku: String): Boolean = records.any { it.sku == sku }
    override fun purchaseToken(): String? =
        records.find { it.sku == FullUnlockSystem.SKU }?.purchaseToken
    override fun purchaseTokenForSku(sku: String): String? =
        records.find { it.sku == sku }?.purchaseToken

    private fun purchaseSku(sku: String, cloudAccountId: String?): PurchaseOutcome {
        findSku(records, sku, cloudAccountId)?.let {
            if (cloudAccountId != null && it.cloudAccountId.isNullOrBlank()) {
                associateCloud(records, it.purchaseToken, cloudAccountId)
            }
            return PurchaseOutcome.Ok(it.purchaseToken, alreadyOwned = true)
        }
        val token = "mem-${UUID.randomUUID()}"
        records += EntitlementRecord(
            sku = sku,
            purchaseToken = token,
            cloudAccountId = cloudAccountId,
            purchasedAtEpochMs = System.currentTimeMillis(),
        )
        return PurchaseOutcome.Ok(token, alreadyOwned = false)
    }
}

/** SharedPreferences-backed stub (production: Play Billing). */
class StubEntitlementBilling(context: Context) : EntitlementBilling {
    override val kind = "stub"
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    override fun purchaseFullUnlock(cloudAccountId: String?): PurchaseOutcome =
        purchaseSku(FullUnlockSystem.SKU, cloudAccountId)

    override fun purchaseCosmetic(sku: String, cloudAccountId: String?): PurchaseOutcome {
        if (sku !in CosmeticsIapSystem.BY_SKU) {
            return PurchaseOutcome.Err("Unknown cosmetic SKU")
        }
        return purchaseSku(sku, cloudAccountId)
    }

    override fun restore(cloudAccountId: String?): Pair<Boolean, String?> {
        val records = readAll().toMutableList()
        val hit = findSku(records, FullUnlockSystem.SKU, cloudAccountId)
            ?: records.find { it.sku == FullUnlockSystem.SKU }
            ?: return false to null
        if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
            associateCloud(records, hit.purchaseToken, cloudAccountId)
            writeAll(records)
        }
        return true to hit.purchaseToken
    }

    override fun restoreAll(cloudAccountId: String?): List<RestoredEntitlement> {
        val records = readAll().toMutableList()
        val skus = listOf(FullUnlockSystem.SKU) + CosmeticsIapSystem.CATALOG.map { it.sku }
        val out = mutableListOf<RestoredEntitlement>()
        var dirty = false
        for (sku in skus) {
            val hit = findSku(records, sku, cloudAccountId) ?: records.find { it.sku == sku } ?: continue
            if (cloudAccountId != null && hit.cloudAccountId.isNullOrBlank()) {
                associateCloud(records, hit.purchaseToken, cloudAccountId)
                dirty = true
            }
            out += RestoredEntitlement(sku, hit.purchaseToken, cosmeticGrant(sku))
        }
        if (dirty) writeAll(records)
        return out
    }

    override fun owned(): Boolean = readAll().any { it.sku == FullUnlockSystem.SKU }
    override fun ownedCosmetic(sku: String): Boolean = readAll().any { it.sku == sku }
    override fun purchaseToken(): String? =
        readAll().find { it.sku == FullUnlockSystem.SKU }?.purchaseToken
    override fun purchaseTokenForSku(sku: String): String? =
        readAll().find { it.sku == sku }?.purchaseToken

    private fun purchaseSku(sku: String, cloudAccountId: String?): PurchaseOutcome {
        val records = readAll().toMutableList()
        findSku(records, sku, cloudAccountId)?.let {
            return PurchaseOutcome.Ok(it.purchaseToken, alreadyOwned = true)
        }
        val token = "android-stub-${UUID.randomUUID()}"
        records += EntitlementRecord(
            sku = sku,
            purchaseToken = token,
            cloudAccountId = cloudAccountId,
            purchasedAtEpochMs = System.currentTimeMillis(),
        )
        writeAll(records)
        return PurchaseOutcome.Ok(token, alreadyOwned = false)
    }

    private fun readAll(): List<EntitlementRecord> {
        val json = prefs.getString(KEY_RECORDS, null)
        if (!json.isNullOrBlank()) {
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
        // Migrate Phase 23 single-record prefs.
        val token = prefs.getString(KEY_TOKEN, null) ?: return emptyList()
        return listOf(
            EntitlementRecord(
                sku = prefs.getString(KEY_SKU, FullUnlockSystem.SKU) ?: FullUnlockSystem.SKU,
                purchaseToken = token,
                cloudAccountId = prefs.getString(KEY_CLOUD, null),
                purchasedAtEpochMs = prefs.getLong(KEY_AT, 0L),
            ),
        )
    }

    private fun writeAll(records: List<EntitlementRecord>) {
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
        prefs.edit()
            .putString(KEY_RECORDS, arr.toString())
            .remove(KEY_SKU)
            .remove(KEY_TOKEN)
            .remove(KEY_CLOUD)
            .remove(KEY_AT)
            .apply()
    }

    private companion object {
        const val PREFS = "fish_shopping_entitlements"
        const val KEY_RECORDS = "records_json"
        const val KEY_SKU = "sku"
        const val KEY_TOKEN = "purchase_token"
        const val KEY_CLOUD = "cloud_account_id"
        const val KEY_AT = "purchased_at"
    }
}

object EntitlementBillings {
    @Volatile
    var override: EntitlementBilling? = null

    fun create(context: Context): EntitlementBilling =
        override ?: StubEntitlementBilling(context)

    fun requestIdForToken(purchaseToken: String): String =
        FullUnlockSystem.requestIdForPurchaseToken(purchaseToken)

    fun cosmeticRequestId(sku: String, purchaseToken: String): String =
        CosmeticsIapSystem.requestIdForPurchaseToken(sku, purchaseToken)
}

/** Test helper map when Context is unavailable. */
object InProcessEntitlementStore {
    val slots = ConcurrentHashMap<String, EntitlementRecord>()
}
