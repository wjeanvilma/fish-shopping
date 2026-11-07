package com.willio.jeanvilma.fishshopping.core.progression

/**
 * Phase 6 (post-1.0) — store product catalog sync.
 * Logical SKUs in entitlements.json are the source of truth; Play Console / web checkout
 * expected catalogs and billing SKU tables must match exactly.
 */
object StoreCatalogSync {
    const val PHASE = 6
    const val SCHEMA = "fish.billing.store_catalog_sync.v1"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val SOURCE_OF_TRUTH = "shared/billing/entitlements.json"

    data class EntitlementRow(
        val sku: String,
        val androidProductId: String,
        val webProductId: String,
        val grantsCosmetic: String?,
    )

    data class PlayRow(
        val sku: String,
        val androidProductId: String,
        val grantsCosmetic: String?,
    )

    data class WebRow(
        val sku: String,
        val webProductId: String,
        val androidProductId: String,
        val grantsCosmetic: String?,
    )

    data class PlayConsoleRow(
        val productId: String,
        val sku: String,
    )

    data class WebCheckoutRow(
        val webProductId: String,
        val sku: String,
        val androidProductId: String,
    )

    data class Report(
        val ok: Boolean,
        val errors: List<String>,
    )

    fun engineRows(): List<EntitlementRow> = buildList {
        add(
            EntitlementRow(
                sku = FullUnlockSystem.SKU,
                androidProductId = FullUnlockSystem.ANDROID_PRODUCT_ID,
                webProductId = FullUnlockSystem.WEB_PRODUCT_ID,
                grantsCosmetic = null,
            ),
        )
        for (c in CosmeticsIapSystem.CATALOG) {
            add(
                EntitlementRow(
                    sku = c.sku,
                    androidProductId = c.androidProductId,
                    webProductId = c.webProductId,
                    grantsCosmetic = c.grantsCosmetic,
                ),
            )
        }
    }

    fun validate(
        entitlements: List<EntitlementRow>,
        playBilling: List<PlayRow>,
        webBilling: List<WebRow>,
        playConsole: List<PlayConsoleRow>,
        webCheckout: List<WebCheckoutRow>,
        playConsolePackageName: String,
        engine: List<EntitlementRow> = engineRows(),
    ): Report {
        val errors = mutableListOf<String>()

        if (entitlements.isEmpty()) errors += "entitlements catalog is empty"
        if (playConsolePackageName != PACKAGE_NAME) {
            errors += "play console packageName '$playConsolePackageName' != '$PACKAGE_NAME'"
        }

        val entBySku = entitlements.associateBy { it.sku }
        val playBySku = playBilling.associateBy { it.sku }
        val webBySku = webBilling.associateBy { it.sku }
        val consoleBySku = playConsole.associateBy { it.sku }
        val checkoutBySku = webCheckout.associateBy { it.sku }
        val engineBySku = engine.associateBy { it.sku }

        for (sku in entBySku.keys + playBySku.keys + webBySku.keys + consoleBySku.keys + checkoutBySku.keys + engineBySku.keys) {
            val e = entBySku[sku]
            val p = playBySku[sku]
            val w = webBySku[sku]
            val c = consoleBySku[sku]
            val x = checkoutBySku[sku]
            val g = engineBySku[sku]

            if (e == null) {
                errors += "orphan store sku '$sku' not in entitlements"
                continue
            }
            if (p == null) errors += "entitlement '$sku' missing from play-billing.json"
            if (w == null) errors += "entitlement '$sku' missing from web-billing.json"
            if (c == null) errors += "entitlement '$sku' missing from play-console-products.json"
            if (x == null) errors += "entitlement '$sku' missing from web-checkout-products.json"
            if (g == null) errors += "entitlement '$sku' missing from engine catalog"

            if (p != null) {
                if (p.androidProductId != e.androidProductId) {
                    errors += "play-billing androidProductId mismatch for '$sku': ${p.androidProductId} != ${e.androidProductId}"
                }
                if (p.grantsCosmetic != e.grantsCosmetic) {
                    errors += "play-billing grantsCosmetic mismatch for '$sku'"
                }
            }
            if (w != null) {
                if (w.webProductId != e.webProductId) {
                    errors += "web-billing webProductId mismatch for '$sku': ${w.webProductId} != ${e.webProductId}"
                }
                if (w.androidProductId != e.androidProductId) {
                    errors += "web-billing androidProductId mismatch for '$sku'"
                }
                if (w.grantsCosmetic != e.grantsCosmetic) {
                    errors += "web-billing grantsCosmetic mismatch for '$sku'"
                }
            }
            if (c != null && c.productId != e.androidProductId) {
                errors += "play-console productId mismatch for '$sku': ${c.productId} != ${e.androidProductId}"
            }
            if (x != null) {
                if (x.webProductId != e.webProductId) {
                    errors += "web-checkout webProductId mismatch for '$sku'"
                }
                if (x.androidProductId != e.androidProductId) {
                    errors += "web-checkout androidProductId mismatch for '$sku'"
                }
            }
            if (g != null) {
                if (g.androidProductId != e.androidProductId || g.webProductId != e.webProductId) {
                    errors += "engine product id mismatch for '$sku'"
                }
                if (g.grantsCosmetic != e.grantsCosmetic) {
                    errors += "engine grantsCosmetic mismatch for '$sku'"
                }
            }
        }

        // Duplicate product ids
        val androidIds = entitlements.map { it.androidProductId }
        if (androidIds.size != androidIds.toSet().size) errors += "duplicate androidProductId in entitlements"
        val webIds = entitlements.map { it.webProductId }
        if (webIds.size != webIds.toSet().size) errors += "duplicate webProductId in entitlements"

        return Report(ok = errors.isEmpty(), errors = errors)
    }
}
