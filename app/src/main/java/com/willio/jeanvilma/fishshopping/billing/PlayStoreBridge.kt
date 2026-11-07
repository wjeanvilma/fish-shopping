package com.willio.jeanvilma.fishshopping.billing

import android.app.Activity
import android.content.Context
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.PurchasesUpdatedListener
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.acknowledgePurchase
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume

/** Store-owned non-consumable purchase row (Play product id + token). */
data class PlayOwnedPurchase(
    val androidProductId: String,
    val purchaseToken: String,
    val acknowledged: Boolean,
)

/**
 * Injectable Play Billing surface so unit tests can fake the store without Play Services.
 */
interface PlayStoreBridge {
    suspend fun ensureReady(): Result<Unit>
    /** [activity] required for real Play sheets; fakes may ignore a null host. */
    suspend fun purchase(activity: Activity?, androidProductId: String): Result<PlayOwnedPurchase>
    suspend fun queryOwned(): Result<List<PlayOwnedPurchase>>
    suspend fun acknowledge(purchaseToken: String): Result<Unit>
    fun endConnection()
}

/**
 * Real [BillingClient] bridge for release / sandbox license testers.
 */
class BillingClientPlayStoreBridge(
    context: Context,
) : PlayStoreBridge {
    private val appContext = context.applicationContext
    private val connectMutex = Mutex()
    private val purchaseMutex = Mutex()

    @Volatile
    private var pendingPurchase: CompletableDeferred<Result<PlayOwnedPurchase>>? = null

    private val purchasesListener = PurchasesUpdatedListener { result, purchases ->
        val deferred = pendingPurchase
        pendingPurchase = null
        if (deferred == null) return@PurchasesUpdatedListener
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> {
                val hit = purchases?.firstOrNull()
                if (hit == null) {
                    deferred.complete(Result.failure(IllegalStateException("No purchase returned")))
                } else {
                    val productId = hit.products.firstOrNull().orEmpty()
                    deferred.complete(
                        Result.success(
                            PlayOwnedPurchase(
                                androidProductId = productId,
                                purchaseToken = hit.purchaseToken,
                                acknowledged = hit.isAcknowledged,
                            ),
                        ),
                    )
                }
            }
            BillingClient.BillingResponseCode.USER_CANCELED ->
                deferred.complete(Result.failure(IllegalStateException("Purchase canceled")))
            else ->
                deferred.complete(
                    Result.failure(
                        IllegalStateException(result.debugMessage.ifBlank { "Billing error ${result.responseCode}" }),
                    ),
                )
        }
    }

    private val client: BillingClient = BillingClient.newBuilder(appContext)
        .setListener(purchasesListener)
        .enablePendingPurchases(
            PendingPurchasesParams.newBuilder()
                .enableOneTimeProducts()
                .build(),
        )
        .build()

    private var productDetailsCache: Map<String, ProductDetails> = emptyMap()

    override suspend fun ensureReady(): Result<Unit> = connectMutex.withLock {
        if (client.isReady) {
            return@withLock runCatching { refreshProductDetails() }.fold(
                onSuccess = { Result.success(Unit) },
                onFailure = { Result.failure(it) },
            )
        }
        val setup: BillingResult = suspendCancellableCoroutine { cont ->
            client.startConnection(
                object : BillingClientStateListener {
                    override fun onBillingSetupFinished(billingResult: BillingResult) {
                        if (cont.isActive) {
                            cont.resume(billingResult)
                        }
                    }

                    override fun onBillingServiceDisconnected() {
                        // next call reconnects
                    }
                },
            )
        }
        if (setup.responseCode != BillingClient.BillingResponseCode.OK) {
            return@withLock Result.failure(
                IllegalStateException(setup.debugMessage.ifBlank { "Billing setup failed (${setup.responseCode})" }),
            )
        }
        runCatching { refreshProductDetails() }.fold(
            onSuccess = { Result.success(Unit) },
            onFailure = { Result.failure(it) },
        )
    }

    private suspend fun refreshProductDetails() {
        val productList = BillingCatalog.ANDROID_PRODUCT_IDS.map { id ->
            QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(BillingClient.ProductType.INAPP)
                .build()
        }
        val params = QueryProductDetailsParams.newBuilder().setProductList(productList).build()
        val result = client.queryProductDetails(params)
        if (result.billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            throw IllegalStateException(
                result.billingResult.debugMessage.ifBlank {
                    "Product details failed (${result.billingResult.responseCode})"
                },
            )
        }
        productDetailsCache = result.productDetailsList.orEmpty().associateBy { it.productId }
    }

    override suspend fun purchase(activity: Activity?, androidProductId: String): Result<PlayOwnedPurchase> =
        purchaseMutex.withLock {
            if (activity == null) {
                return Result.failure(IllegalStateException("Open the game to purchase"))
            }
            ensureReady().getOrElse { return Result.failure(it) }
            val details = productDetailsCache[androidProductId]
                ?: return Result.failure(IllegalStateException("Unknown Play product: $androidProductId"))
            val deferred = CompletableDeferred<Result<PlayOwnedPurchase>>()
            pendingPurchase = deferred
            val flowParams = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(
                    listOf(
                        BillingFlowParams.ProductDetailsParams.newBuilder()
                            .setProductDetails(details)
                            .build(),
                    ),
                )
                .build()
            val launch = client.launchBillingFlow(activity, flowParams)
            if (launch.responseCode != BillingClient.BillingResponseCode.OK) {
                pendingPurchase = null
                return Result.failure(
                    IllegalStateException(launch.debugMessage.ifBlank { "Could not open purchase sheet" }),
                )
            }
            val outcome = deferred.await()
            outcome.onSuccess { owned ->
                if (!owned.acknowledged) {
                    acknowledge(owned.purchaseToken)
                }
            }
            outcome
        }

    override suspend fun queryOwned(): Result<List<PlayOwnedPurchase>> {
        ensureReady().getOrElse { return Result.failure(it) }
        val params = QueryPurchasesParams.newBuilder()
            .setProductType(BillingClient.ProductType.INAPP)
            .build()
        val result = client.queryPurchasesAsync(params)
        if (result.billingResult.responseCode != BillingClient.BillingResponseCode.OK) {
            return Result.failure(
                IllegalStateException(
                    result.billingResult.debugMessage.ifBlank {
                        "Restore failed (${result.billingResult.responseCode})"
                    },
                ),
            )
        }
        val owned = result.purchasesList.mapNotNull { p ->
            val productId = p.products.firstOrNull() ?: return@mapNotNull null
            if (productId !in BillingCatalog.BY_ANDROID_PRODUCT_ID) return@mapNotNull null
            if (p.purchaseState != Purchase.PurchaseState.PURCHASED) return@mapNotNull null
            PlayOwnedPurchase(
                androidProductId = productId,
                purchaseToken = p.purchaseToken,
                acknowledged = p.isAcknowledged,
            )
        }
        for (row in owned) {
            if (!row.acknowledged) {
                acknowledge(row.purchaseToken)
            }
        }
        return Result.success(owned)
    }

    override suspend fun acknowledge(purchaseToken: String): Result<Unit> {
        ensureReady().getOrElse { return Result.failure(it) }
        val params = AcknowledgePurchaseParams.newBuilder()
            .setPurchaseToken(purchaseToken)
            .build()
        val result = client.acknowledgePurchase(params)
        return if (result.responseCode == BillingClient.BillingResponseCode.OK) {
            Result.success(Unit)
        } else {
            Result.failure(
                IllegalStateException(result.debugMessage.ifBlank { "Acknowledge failed (${result.responseCode})" }),
            )
        }
    }

    override fun endConnection() {
        pendingPurchase?.cancel()
        pendingPurchase = null
        client.endConnection()
    }
}

/** In-memory fake for JVM unit tests (sandbox without Play Services). */
class FakePlayStoreBridge : PlayStoreBridge {
    private val owned = linkedMapOf<String, PlayOwnedPurchase>()
    var failNextPurchase: String? = null
    var ready: Boolean = true

    fun seed(androidProductId: String, purchaseToken: String = "fake-$androidProductId") {
        owned[androidProductId] = PlayOwnedPurchase(androidProductId, purchaseToken, acknowledged = true)
    }

    override suspend fun ensureReady(): Result<Unit> =
        if (ready) Result.success(Unit) else Result.failure(IllegalStateException("Billing unavailable"))

    override suspend fun purchase(activity: Activity?, androidProductId: String): Result<PlayOwnedPurchase> {
        ensureReady().getOrElse { return Result.failure(it) }
        failNextPurchase?.let {
            failNextPurchase = null
            return Result.failure(IllegalStateException(it))
        }
        owned[androidProductId]?.let {
            return Result.success(it)
        }
        if (androidProductId !in BillingCatalog.BY_ANDROID_PRODUCT_ID) {
            return Result.failure(IllegalStateException("Unknown Play product: $androidProductId"))
        }
        val row = PlayOwnedPurchase(androidProductId, "play-$androidProductId-${owned.size}", acknowledged = true)
        owned[androidProductId] = row
        return Result.success(row)
    }

    override suspend fun queryOwned(): Result<List<PlayOwnedPurchase>> {
        ensureReady().getOrElse { return Result.failure(it) }
        return Result.success(owned.values.toList())
    }

    override suspend fun acknowledge(purchaseToken: String): Result<Unit> = Result.success(Unit)

    override fun endConnection() = Unit
}
