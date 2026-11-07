package com.willio.jeanvilma.fishshopping.billing

import com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem
import com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem

/**
 * Phase 1 (post-1.0) — logical SKU ↔ Play Console product id map.
 * Mirrors [shared/billing/entitlements.json] androidProductId fields.
 */
object BillingCatalog {
    data class Product(
        val sku: String,
        val androidProductId: String,
        val grantsCosmetic: String?,
    )

    val FULL_UNLOCK = Product(
        sku = FullUnlockSystem.SKU,
        androidProductId = FullUnlockSystem.ANDROID_PRODUCT_ID,
        grantsCosmetic = null,
    )

    val COSMETICS: List<Product> = CosmeticsIapSystem.CATALOG.map {
        Product(sku = it.sku, androidProductId = it.androidProductId, grantsCosmetic = it.grantsCosmetic)
    }

    val ALL: List<Product> = listOf(FULL_UNLOCK) + COSMETICS

    val BY_SKU: Map<String, Product> = ALL.associateBy { it.sku }
    val BY_ANDROID_PRODUCT_ID: Map<String, Product> = ALL.associateBy { it.androidProductId }

    val ANDROID_PRODUCT_IDS: List<String> = ALL.map { it.androidProductId }

    fun skuForAndroidProductId(productId: String): String? =
        BY_ANDROID_PRODUCT_ID[productId]?.sku

    fun androidProductIdForSku(sku: String): String? =
        BY_SKU[sku]?.androidProductId
}
