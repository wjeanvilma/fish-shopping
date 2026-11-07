package com.willio.jeanvilma.fishshopping.core.progression

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.Receipt
import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Phase 24 — optional paid cosmetics (power-neutral).
 * Grants visual banner ids into [com.willio.jeanvilma.fishshopping.core.sim.GameState.unlockedCosmetics].
 * Catalog mirrors shared/billing/entitlements.json; none of these banners gate patience-buffing decor.
 */
object CosmeticsIapSystem {
    data class Sku(
        val id: String,
        val sku: String,
        /** Play Console product id; mirrors shared/billing/entitlements.json androidProductId. */
        val androidProductId: String,
        /** Web checkout product id; mirrors shared/billing/entitlements.json webProductId. */
        val webProductId: String,
        val grantsCosmetic: String,
        val title: String,
        val description: String,
    )

    val CATALOG: List<Sku> = listOf(
        Sku(
            id = "entitlement.cosmetic.sunset_bunting",
            sku = "fish.cosmetic.sunset_bunting",
            androidProductId = "fish_cosmetic_sunset_bunting",
            webProductId = "fish.cosmetic.sunset_bunting",
            grantsCosmetic = "banner.iap_sunset_bunting",
            title = "Sunset bunting",
            description = "Warm dusk bunting for the pier. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.pearl_string",
            sku = "fish.cosmetic.pearl_string",
            androidProductId = "fish_cosmetic_pearl_string",
            webProductId = "fish.cosmetic.pearl_string",
            grantsCosmetic = "banner.iap_pearl_string",
            title = "Pearl string lights",
            description = "Pearl-white string lights. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.captain_crest",
            sku = "fish.cosmetic.captain_crest",
            androidProductId = "fish_cosmetic_captain_crest",
            webProductId = "fish.cosmetic.captain_crest",
            grantsCosmetic = "banner.iap_captain_crest",
            title = "Captain's crest",
            description = "A harbor crest plaque. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.harbor_lantern",
            sku = "fish.cosmetic.harbor_lantern",
            androidProductId = "fish_cosmetic_harbor_lantern",
            webProductId = "fish.cosmetic.harbor_lantern",
            grantsCosmetic = "banner.iap_harbor_lantern",
            title = "Harbor lantern",
            description = "Soft pier lantern glow. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.tide_ribbon",
            sku = "fish.cosmetic.tide_ribbon",
            androidProductId = "fish_cosmetic_tide_ribbon",
            webProductId = "fish.cosmetic.tide_ribbon",
            grantsCosmetic = "banner.iap_tide_ribbon",
            title = "Tide ribbon",
            description = "Tide-blue ribbon streamers. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.fog_pennant",
            sku = "fish.cosmetic.fog_pennant",
            androidProductId = "fish_cosmetic_fog_pennant",
            webProductId = "fish.cosmetic.fog_pennant",
            grantsCosmetic = "banner.iap_fog_pennant",
            title = "Fog pennant",
            description = "Mist-grey fog pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.coral_streamer",
            sku = "fish.cosmetic.coral_streamer",
            androidProductId = "fish_cosmetic_coral_streamer",
            webProductId = "fish.cosmetic.coral_streamer",
            grantsCosmetic = "banner.iap_coral_streamer",
            title = "Coral streamer",
            description = "Coral carnival streamers. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.storm_flag",
            sku = "fish.cosmetic.storm_flag",
            androidProductId = "fish_cosmetic_storm_flag",
            webProductId = "fish.cosmetic.storm_flag",
            grantsCosmetic = "banner.iap_storm_flag",
            title = "Storm flag",
            description = "Storm Quay weather flag. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.ember_pennant",
            sku = "fish.cosmetic.ember_pennant",
            androidProductId = "fish_cosmetic_ember_pennant",
            webProductId = "fish.cosmetic.ember_pennant",
            grantsCosmetic = "banner.iap_ember_pennant",
            title = "Ember pennant",
            description = "Ember Wharf heat pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.northlight_banner",
            sku = "fish.cosmetic.northlight_banner",
            androidProductId = "fish_cosmetic_northlight_banner",
            webProductId = "fish.cosmetic.northlight_banner",
            grantsCosmetic = "banner.iap_northlight_banner",
            title = "Northlight banner",
            description = "Aurora-thread northlight banner. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.marina_pennant",
            sku = "fish.cosmetic.marina_pennant",
            androidProductId = "fish_cosmetic_marina_pennant",
            webProductId = "fish.cosmetic.marina_pennant",
            grantsCosmetic = "banner.iap_marina_pennant",
            title = "Marina pennant",
            description = "Grand Marina dress pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.moonlit_bunting",
            sku = "fish.cosmetic.moonlit_bunting",
            androidProductId = "fish_cosmetic_moonlit_bunting",
            webProductId = "fish.cosmetic.moonlit_bunting",
            grantsCosmetic = "banner.iap_moonlit_bunting",
            title = "Moonlit bunting",
            description = "Moon Cove silver bunting. Visual only — never changes rates, wages, or sale prices.",
        ),
    )

    val BY_SKU: Map<String, Sku> = CATALOG.associateBy { it.sku }
    val BY_COSMETIC: Map<String, Sku> = CATALOG.associateBy { it.grantsCosmetic }
    val GRANTED_COSMETICS: Set<String> = CATALOG.map { it.grantsCosmetic }.toSet()

    fun requestIdForPurchaseToken(sku: String, purchaseToken: String): String =
        "iap-cosmetic:$sku:$purchaseToken"

    fun grant(ctx: StepContext, cosmeticId: String, requestId: String) {
        val s = ctx.state
        s.purchaseReceipts[requestId]?.let { prior ->
            ctx.emit(GameEvent.IapCosmeticGranted(s.tick, cosmeticId, prior, replayed = true))
            return
        }
        val sku = BY_COSMETIC[cosmeticId]
        if (sku == null) {
            ctx.emit(GameEvent.IapCosmeticRejected(s.tick, cosmeticId, requestId, "Unknown cosmetic SKU"))
            return
        }
        if (cosmeticId in s.unlockedCosmetics) {
            val receipt = Receipt(s.newId("cosmetic"), "iap_cosmetic", 0, s.tick, cosmeticId)
            s.record(receipt)
            s.purchaseReceipts[requestId] = receipt
            ctx.emit(GameEvent.IapCosmeticGranted(s.tick, cosmeticId, receipt, replayed = true))
            return
        }
        s.unlockedCosmetics += cosmeticId
        val receipt = Receipt(s.newId("cosmetic"), "iap_cosmetic", 0, s.tick, cosmeticId)
        s.record(receipt)
        s.purchaseReceipts[requestId] = receipt
        ctx.emit(GameEvent.IapCosmeticGranted(s.tick, cosmeticId, receipt, replayed = false))
        ctx.emit(GameEvent.CheckpointRequested(s.tick, "iap_cosmetic"))
    }
}
