package com.willio.jeanvilma.fishshopping.core.sim

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem

/**
 * Phase 24 (post-1.0) + Finish 4.0 Phase 10 — cosmetic equip/preview contracts from
 * `shared/content/cosmetic-presentation.json`. Presentation-only; power-neutral.
 * Phase 10 adds authored banner meshAsset paths + counter presentation depth.
 */
object CosmeticPresentation {
    const val PHASE = 24
    const val SCHEMA = "fish.content.cosmetic_presentation.v1"
    const val CATALOG = "shared/content/cosmetic-presentation.json"
    const val ENTITLEMENTS = "shared/billing/entitlements.json"
    const val SLOT_ID = "harbor_banner"
    const val MAX_EQUIPPED = 1
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 21
    const val PRODUCT_ART_PHASE = 10
    const val PRODUCT_ART_MARKER = "authored-finish-4.0-phase-10"
    const val COSMETIC_BANNER_MARKER = "cosmetic-banner-phase-10"
    const val MIN_COSMETIC_ART_NODES = 4
    const val COUNTER_LAYOUT_ID = "counter.tray.v1"

    data class Item(
        val cosmeticId: String,
        val sku: String?,
        val title: String,
        val swatchRgb: IntArray,
        val source: String,
        val meshAsset: String,
    )

    val ITEMS: List<Item> = listOf(
        Item("banner.iap_sunset_bunting", "fish.cosmetic.sunset_bunting", "Sunset bunting", intArrayOf(232, 120, 64), "iap", "models/cosmetic_banner_sunset_bunting.glb"),
        Item("banner.iap_pearl_string", "fish.cosmetic.pearl_string", "Pearl string lights", intArrayOf(236, 236, 245), "iap", "models/cosmetic_banner_pearl_string.glb"),
        Item("banner.iap_captain_crest", "fish.cosmetic.captain_crest", "Captain's crest", intArrayOf(48, 96, 168), "iap", "models/cosmetic_banner_captain_crest.glb"),
        Item("banner.iap_harbor_lantern", "fish.cosmetic.harbor_lantern", "Harbor lantern", intArrayOf(210, 160, 70), "iap", "models/cosmetic_banner_harbor_lantern.glb"),
        Item("banner.iap_tide_ribbon", "fish.cosmetic.tide_ribbon", "Tide ribbon", intArrayOf(64, 140, 180), "iap", "models/cosmetic_banner_tide_ribbon.glb"),
        Item("banner.iap_fog_pennant", "fish.cosmetic.fog_pennant", "Fog pennant", intArrayOf(170, 180, 190), "iap", "models/cosmetic_banner_fog_pennant.glb"),
        Item("banner.iap_coral_streamer", "fish.cosmetic.coral_streamer", "Coral streamer", intArrayOf(230, 100, 120), "iap", "models/cosmetic_banner_coral_streamer.glb"),
        Item("banner.iap_storm_flag", "fish.cosmetic.storm_flag", "Storm flag", intArrayOf(70, 90, 130), "iap", "models/cosmetic_banner_storm_flag.glb"),
        Item("banner.iap_ember_pennant", "fish.cosmetic.ember_pennant", "Ember pennant", intArrayOf(220, 90, 40), "iap", "models/cosmetic_banner_ember_pennant.glb"),
        Item("banner.iap_northlight_banner", "fish.cosmetic.northlight_banner", "Northlight banner", intArrayOf(120, 200, 220), "iap", "models/cosmetic_banner_northlight_banner.glb"),
        Item("banner.iap_marina_pennant", "fish.cosmetic.marina_pennant", "Marina pennant", intArrayOf(40, 90, 160), "iap", "models/cosmetic_banner_marina_pennant.glb"),
        Item("banner.iap_moonlit_bunting", "fish.cosmetic.moonlit_bunting", "Moonlit bunting", intArrayOf(200, 210, 230), "iap", "models/cosmetic_banner_moonlit_bunting.glb"),
        Item("banner.iap_mist_bunting", "fish.cosmetic.mist_bunting", "Mist bunting", intArrayOf(150, 175, 190), "iap", "models/cosmetic_banner_mist_bunting.glb"),
        Item("banner.iap_prism_pennant", "fish.cosmetic.prism_pennant", "Prism pennant", intArrayOf(180, 120, 220), "iap", "models/cosmetic_banner_prism_pennant.glb"),
        Item("banner.iap_plaza_flag", "fish.cosmetic.plaza_flag", "Plaza flag", intArrayOf(210, 150, 70), "iap", "models/cosmetic_banner_plaza_flag.glb"),
        Item("banner.iap_rime_streamer", "fish.cosmetic.rime_streamer", "Rime streamer", intArrayOf(170, 210, 230), "iap", "models/cosmetic_banner_rime_streamer.glb"),
        Item("banner.iap_brine_ribbon", "fish.cosmetic.brine_ribbon", "Brine ribbon", intArrayOf(90, 150, 140), "iap", "models/cosmetic_banner_brine_ribbon.glb"),
        Item("banner.iap_aurora_crest", "fish.cosmetic.aurora_crest", "Aurora crest", intArrayOf(100, 180, 160), "iap", "models/cosmetic_banner_aurora_crest.glb"),
    )

    val BY_ID: Map<String, Item> = ITEMS.associateBy { it.cosmeticId }

    val FALLBACK_SWATCH: IntArray = intArrayOf(120, 160, 140)

    const val ANCHOR_X_MM = -9000
    const val ANCHOR_Z_MM = 1800
    const val ANCHOR_HEIGHT_M = 2.4f

    fun titleFor(cosmeticId: String): String =
        BY_ID[cosmeticId]?.title
            ?: cosmeticId.removePrefix("banner.").replace('_', ' ')
                .replaceFirstChar { if (it.isLowerCase()) it.titlecase() else it.toString() }

    fun swatchRgb(cosmeticId: String): IntArray = BY_ID[cosmeticId]?.swatchRgb ?: FALLBACK_SWATCH

    fun meshAsset(cosmeticId: String): String? = BY_ID[cosmeticId]?.meshAsset

    fun allMeshAssetsPresent(assetRootExists: (String) -> Boolean): Boolean =
        ITEMS.all { assetRootExists(it.meshAsset) }

    /** Keep equipped id only while owned; otherwise clear. */
    fun sanitizeEquipped(equippedId: String?, unlocked: Set<String>): String? {
        if (equippedId.isNullOrBlank()) return null
        return if (equippedId in unlocked) equippedId else null
    }

    /** Preview may show unowned IAP catalog items; equipped must be owned. */
    fun resolveVisible(equippedId: String?, previewId: String?, unlocked: Set<String>): String? {
        if (!previewId.isNullOrBlank()) {
            if (previewId in unlocked || BY_ID.containsKey(previewId)) return previewId
        }
        return sanitizeEquipped(equippedId, unlocked)
    }

    fun isPowerNeutralIapCatalog(): Boolean =
        CosmeticsIapSystem.CATALOG.all { sku ->
            BY_ID[sku.grantsCosmetic] != null && sku.grantsCosmetic.startsWith("banner.")
        }
}
