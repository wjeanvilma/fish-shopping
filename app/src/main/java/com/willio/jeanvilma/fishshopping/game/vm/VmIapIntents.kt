package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.billing.PurchaseOutcome
import com.willio.jeanvilma.fishshopping.billing.RestoredEntitlement
import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem

/**
 * Finish 4.0 Phase 4 — Play Billing / entitlement purchase + restore intents.
 */
class VmIapIntents(
    private val host: VmIapIntentHost,
) {
    fun purchaseFullHarborUnlock() {
        host.launchMain {
            when (val result = host.billing.purchaseFullUnlock(host.cloudAccountId())) {
                is PurchaseOutcome.Err -> host.emitMessage(result.reason)
                is PurchaseOutcome.Ok -> {
                    host.pendingEntitlements.enqueue(
                        sku = FullUnlockSystem.SKU,
                        purchaseToken = result.purchaseToken,
                        grantsCosmetic = null,
                    )
                    host.launchSim {
                        host.applyStoreOwned(
                            listOf(
                                RestoredEntitlement(
                                    sku = FullUnlockSystem.SKU,
                                    purchaseToken = result.purchaseToken,
                                    grantsCosmetic = null,
                                ),
                            ),
                            announceRestore = false,
                        )
                    }
                }
            }
        }
    }

    fun restoreFullHarborUnlock() {
        host.launchMain {
            val (owned, token) = host.billing.restore(host.cloudAccountId())
            if (!owned || token.isNullOrBlank()) {
                host.emitMessage("No harbor unlock to restore")
                return@launchMain
            }
            host.pendingEntitlements.enqueue(
                sku = FullUnlockSystem.SKU,
                purchaseToken = token,
                grantsCosmetic = null,
            )
            host.launchSim {
                host.applyStoreOwned(
                    listOf(
                        RestoredEntitlement(
                            sku = FullUnlockSystem.SKU,
                            purchaseToken = token,
                            grantsCosmetic = null,
                        ),
                    ),
                    announceRestore = true,
                )
            }
        }
    }

    fun purchaseIapCosmetic(sku: String) {
        host.launchMain {
            when (val result = host.billing.purchaseCosmetic(sku, host.cloudAccountId())) {
                is PurchaseOutcome.Err -> host.emitMessage(result.reason)
                is PurchaseOutcome.Ok -> {
                    val cosmeticId = CosmeticsIapSystem.BY_SKU[sku]?.grantsCosmetic
                    if (cosmeticId == null) {
                        host.emitMessage("Unknown cosmetic SKU")
                        return@launchMain
                    }
                    host.pendingEntitlements.enqueue(sku, result.purchaseToken, cosmeticId)
                    host.launchSim {
                        host.applyStoreOwned(
                            listOf(RestoredEntitlement(sku, result.purchaseToken, cosmeticId)),
                            announceRestore = false,
                        )
                    }
                }
            }
        }
    }

    fun restorePurchases() {
        host.launchMain {
            val owned = host.billing.restoreAll(host.cloudAccountId())
            if (owned.isEmpty() && host.pendingEntitlements.all().isEmpty()) {
                host.emitMessage("No purchases to restore")
                return@launchMain
            }
            for (row in owned) {
                host.pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic)
            }
            host.launchSim {
                host.applyStoreOwned(owned, announceRestore = true)
            }
        }
    }
}
