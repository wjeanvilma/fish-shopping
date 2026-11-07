package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Phase 23 — one-time full-harbor unlock entitlement (power-neutral access).
 * Idempotent via [com.willio.jeanvilma.fishshopping.core.sim.GameState.purchaseReceipts].
 */
object FullUnlockSystem {
    const val ENTITLEMENT_ID = "entitlement.full_harbor_unlock"
    const val FREE_HARBOR_ID = "harbor.sunrise_pier"
    const val SKU = "fish.full_harbor_unlock"
    /** Play Console product id (underscores); mirrors shared/billing/entitlements.json. */
    const val ANDROID_PRODUCT_ID = "fish_full_harbor_unlock"
    /** Web checkout product id; mirrors shared/billing/entitlements.json webProductId. */
    const val WEB_PRODUCT_ID = "fish.full_harbor_unlock"

    /** Stable request id for a store purchase token — retries replay without double-grant side effects. */
    fun requestIdForPurchaseToken(purchaseToken: String): String = "full-unlock:$purchaseToken"

    fun grant(ctx: StepContext, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(GameEvent.FullHarborUnlockGranted(s.tick, prior, replayed = true))
            return
        }
        if (s.fullHarborUnlock) {
            val receipt = Receipt(s.newId("unlock"), "full_harbor_unlock", 0, s.tick, ENTITLEMENT_ID)
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.FullHarborUnlockGranted(s.tick, receipt, replayed = true))
            return
        }
        s.fullHarborUnlock = true
        val receipt = Receipt(s.newId("unlock"), "full_harbor_unlock", 0, s.tick, ENTITLEMENT_ID)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.FullHarborUnlockGranted(s.tick, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "full_unlock"))
    }
}
