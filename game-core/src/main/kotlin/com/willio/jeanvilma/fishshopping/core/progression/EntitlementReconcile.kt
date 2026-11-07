package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.sim.GameState

/**
 * Phase 3 (post-1.0) — idempotent entitlement reconcile.
 * Store-owned paid SKUs are the source of truth; save flags are unioned upward.
 * Prestige cosmetics already on the save are never revoked.
 */
object EntitlementReconcile {
    const val PHASE = 3
    const val SCHEMA = "fish.billing.entitlement_reconcile.v1"

    data class StoreOwned(
        val sku: String,
        val purchaseToken: String,
        val grantsCosmetic: String?,
    )

    data class SaveSnapshot(
        val fullHarborUnlock: Boolean,
        val unlockedCosmetics: Set<String>,
        val purchaseReceiptIds: Set<String>,
    )

    data class GrantNeed(
        val sku: String,
        val purchaseToken: String,
        val requestId: String,
        val cosmeticId: String?,
        val reason: String,
    )

    fun snapshotOf(state: GameState): SaveSnapshot = SaveSnapshot(
        fullHarborUnlock = state.fullHarborUnlock,
        unlockedCosmetics = state.unlockedCosmetics.toSet(),
        purchaseReceiptIds = state.purchaseReceipts.keys.toSet(),
    )

    fun requestId(store: StoreOwned): String =
        if (store.grantsCosmetic != null) {
            CosmeticsIapSystem.requestIdForPurchaseToken(store.sku, store.purchaseToken)
        } else {
            FullUnlockSystem.requestIdForPurchaseToken(store.purchaseToken)
        }

    /**
     * Merge store restore rows with any crash-pending ledger rows (token wins per SKU;
     * ledger fills gaps the store query missed after a kill mid-purchase).
     */
    fun mergeStoreAndPending(
        store: List<StoreOwned>,
        pending: List<StoreOwned>,
    ): List<StoreOwned> {
        val bySku = linkedMapOf<String, StoreOwned>()
        for (row in store) bySku[row.sku] = row
        for (row in pending) {
            if (row.sku !in bySku) bySku[row.sku] = row
        }
        return bySku.values.toList()
    }

    /** Grants still needed so save matches store ownership (idempotent if re-applied). */
    fun neededGrants(owned: List<StoreOwned>, save: SaveSnapshot): List<GrantNeed> {
        val out = mutableListOf<GrantNeed>()
        for (row in owned) {
            val requestId = requestId(row)
            val cosmeticId = row.grantsCosmetic
            if (cosmeticId != null) {
                val flagMissing = cosmeticId !in save.unlockedCosmetics
                val receiptMissing = requestId !in save.purchaseReceiptIds
                if (flagMissing || receiptMissing) {
                    out += GrantNeed(
                        sku = row.sku,
                        purchaseToken = row.purchaseToken,
                        requestId = requestId,
                        cosmeticId = cosmeticId,
                        reason = when {
                            flagMissing && receiptMissing -> "missing_flag_and_receipt"
                            flagMissing -> "missing_flag"
                            else -> "missing_receipt"
                        },
                    )
                }
            } else {
                val flagMissing = !save.fullHarborUnlock
                val receiptMissing = requestId !in save.purchaseReceiptIds
                if (flagMissing || receiptMissing) {
                    out += GrantNeed(
                        sku = row.sku,
                        purchaseToken = row.purchaseToken,
                        requestId = requestId,
                        cosmeticId = null,
                        reason = when {
                            flagMissing && receiptMissing -> "missing_flag_and_receipt"
                            flagMissing -> "missing_flag"
                            else -> "missing_receipt"
                        },
                    )
                }
            }
        }
        return out
    }

    fun alreadySatisfiedCount(owned: List<StoreOwned>, save: SaveSnapshot): Int =
        owned.size - neededGrants(owned, save).size
}
