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
        Sku(
            id = "entitlement.cosmetic.mist_bunting",
            sku = "fish.cosmetic.mist_bunting",
            androidProductId = "fish_cosmetic_mist_bunting",
            webProductId = "fish.cosmetic.mist_bunting",
            grantsCosmetic = "banner.iap_mist_bunting",
            title = "Mist bunting",
            description = "Mist Cove lantern bunting. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.prism_pennant",
            sku = "fish.cosmetic.prism_pennant",
            androidProductId = "fish_cosmetic_prism_pennant",
            webProductId = "fish.cosmetic.prism_pennant",
            grantsCosmetic = "banner.iap_prism_pennant",
            title = "Prism pennant",
            description = "Prism Shelf light pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.plaza_flag",
            sku = "fish.cosmetic.plaza_flag",
            androidProductId = "fish_cosmetic_plaza_flag",
            webProductId = "fish.cosmetic.plaza_flag",
            grantsCosmetic = "banner.iap_plaza_flag",
            title = "Plaza flag",
            description = "Plaza market day flag. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.rime_streamer",
            sku = "fish.cosmetic.rime_streamer",
            androidProductId = "fish_cosmetic_rime_streamer",
            webProductId = "fish.cosmetic.rime_streamer",
            grantsCosmetic = "banner.iap_rime_streamer",
            title = "Rime streamer",
            description = "Rime Harbor ice streamers. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.brine_ribbon",
            sku = "fish.cosmetic.brine_ribbon",
            androidProductId = "fish_cosmetic_brine_ribbon",
            webProductId = "fish.cosmetic.brine_ribbon",
            grantsCosmetic = "banner.iap_brine_ribbon",
            title = "Brine ribbon",
            description = "Brine shelf salt ribbon. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.aurora_crest",
            sku = "fish.cosmetic.aurora_crest",
            androidProductId = "fish_cosmetic_aurora_crest",
            webProductId = "fish.cosmetic.aurora_crest",
            grantsCosmetic = "banner.iap_aurora_crest",
            title = "Aurora crest",
            description = "Aurora vigil crest plaque. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.aurora_bunting",
            sku = "fish.cosmetic.aurora_bunting",
            androidProductId = "fish_cosmetic_aurora_bunting",
            webProductId = "fish.cosmetic.aurora_bunting",
            grantsCosmetic = "banner.iap_aurora_bunting",
            title = "Aurora bunting",
            description = "Aurora Inlet light bunting. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.tideglass_pennant",
            sku = "fish.cosmetic.tideglass_pennant",
            androidProductId = "fish_cosmetic_tideglass_pennant",
            webProductId = "fish.cosmetic.tideglass_pennant",
            grantsCosmetic = "banner.iap_tideglass_pennant",
            title = "Tideglass pennant",
            description = "Tideglass Bay mirror pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.inlet_flag",
            sku = "fish.cosmetic.inlet_flag",
            androidProductId = "fish_cosmetic_inlet_flag",
            webProductId = "fish.cosmetic.inlet_flag",
            grantsCosmetic = "banner.iap_inlet_flag",
            title = "Inlet flag",
            description = "Northern inlet harbor flag. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.bay_streamer",
            sku = "fish.cosmetic.bay_streamer",
            androidProductId = "fish_cosmetic_bay_streamer",
            webProductId = "fish.cosmetic.bay_streamer",
            grantsCosmetic = "banner.iap_bay_streamer",
            title = "Bay streamer",
            description = "Tideglass ferry streamers. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.poach_ribbon",
            sku = "fish.cosmetic.poach_ribbon",
            androidProductId = "fish_cosmetic_poach_ribbon",
            webProductId = "fish.cosmetic.poach_ribbon",
            grantsCosmetic = "banner.iap_poach_ribbon",
            title = "Poach ribbon",
            description = "Poach pantry ribbon. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.can_crest",
            sku = "fish.cosmetic.can_crest",
            androidProductId = "fish_cosmetic_can_crest",
            webProductId = "fish.cosmetic.can_crest",
            grantsCosmetic = "banner.iap_can_crest",
            title = "Can crest",
            description = "Can circuit crest plaque. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.saffron_bunting",
            sku = "fish.cosmetic.saffron_bunting",
            androidProductId = "fish_cosmetic_saffron_bunting",
            webProductId = "fish.cosmetic.saffron_bunting",
            grantsCosmetic = "banner.iap_saffron_bunting",
            title = "Saffron bunting",
            description = "Saffron Quay ember bunting. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.cobalt_pennant",
            sku = "fish.cosmetic.cobalt_pennant",
            androidProductId = "fish_cosmetic_cobalt_pennant",
            webProductId = "fish.cosmetic.cobalt_pennant",
            grantsCosmetic = "banner.iap_cobalt_pennant",
            title = "Cobalt pennant",
            description = "Cobalt Sound rime pennant. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.quay_flag",
            sku = "fish.cosmetic.quay_flag",
            androidProductId = "fish_cosmetic_quay_flag",
            webProductId = "fish.cosmetic.quay_flag",
            grantsCosmetic = "banner.iap_quay_flag",
            title = "Quay flag",
            description = "Saffron quay harbor flag. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.sound_streamer",
            sku = "fish.cosmetic.sound_streamer",
            androidProductId = "fish_cosmetic_sound_streamer",
            webProductId = "fish.cosmetic.sound_streamer",
            grantsCosmetic = "banner.iap_sound_streamer",
            title = "Sound streamer",
            description = "Cobalt ferry streamers. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.roast_ribbon",
            sku = "fish.cosmetic.roast_ribbon",
            androidProductId = "fish_cosmetic_roast_ribbon",
            webProductId = "fish.cosmetic.roast_ribbon",
            grantsCosmetic = "banner.iap_roast_ribbon",
            title = "Roast ribbon",
            description = "Roast nest ribbon. Visual only — never changes rates, wages, or sale prices.",
        ),
        Sku(
            id = "entitlement.cosmetic.ferment_crest",
            sku = "fish.cosmetic.ferment_crest",
            androidProductId = "fish_cosmetic_ferment_crest",
            webProductId = "fish.cosmetic.ferment_crest",
            grantsCosmetic = "banner.iap_ferment_crest",
            title = "Ferment crest",
            description = "Ferment covenant crest plaque. Visual only — never changes rates, wages, or sale prices.",
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
