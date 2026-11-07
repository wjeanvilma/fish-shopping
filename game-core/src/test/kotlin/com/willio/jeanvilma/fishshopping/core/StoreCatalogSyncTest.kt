package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.progression.StoreCatalogSync
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.contentOrNull
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class StoreCatalogSyncTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first {
            File(it, "shared/billing/store-catalog-sync.json").isFile
        }
    }

    private fun obj(path: String) =
        Json.parseToJsonElement(File(root, path).readText()).jsonObject

    @Test
    fun catalogDocumentsSyncInputsAndPackage() {
        val sync = obj("shared/billing/store-catalog-sync.json")
        assertEquals(StoreCatalogSync.PHASE, sync.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(StoreCatalogSync.SCHEMA, sync.getValue("schema").jsonPrimitive.content)
        assertEquals(StoreCatalogSync.PACKAGE_NAME, sync.getValue("packageName").jsonPrimitive.content)
        assertEquals(StoreCatalogSync.SOURCE_OF_TRUTH, sync.getValue("sourceOfTruth").jsonPrimitive.content)
        assertEquals("billing:validate", sync.getValue("npmScript").jsonPrimitive.content)
        val inputs = sync.getValue("inputs").jsonObject
        assertTrue(inputs.containsKey("entitlements"))
        assertTrue(inputs.containsKey("playConsole"))
        assertTrue(inputs.containsKey("webCheckout"))
    }

    @Test
    fun sharedCatalogsStayInSyncWithEngine() {
        val entitlementsJson = obj("shared/billing/entitlements.json")
        val full = entitlementsJson.getValue("fullUnlock").jsonObject
        val cosmetics = entitlementsJson.getValue("cosmetics").jsonArray
        val entitlements = buildList {
            add(
                StoreCatalogSync.EntitlementRow(
                    sku = full.getValue("sku").jsonPrimitive.content,
                    androidProductId = full.getValue("androidProductId").jsonPrimitive.content,
                    webProductId = full.getValue("webProductId").jsonPrimitive.content,
                    grantsCosmetic = null,
                ),
            )
            for (row in cosmetics) {
                val o = row.jsonObject
                add(
                    StoreCatalogSync.EntitlementRow(
                        sku = o.getValue("sku").jsonPrimitive.content,
                        androidProductId = o.getValue("androidProductId").jsonPrimitive.content,
                        webProductId = o.getValue("webProductId").jsonPrimitive.content,
                        grantsCosmetic = o.getValue("grantsCosmetic").jsonPrimitive.content,
                    ),
                )
            }
        }

        val playBilling = obj("shared/billing/play-billing.json").getValue("skus").jsonArray.map {
            val o = it.jsonObject
            StoreCatalogSync.PlayRow(
                sku = o.getValue("sku").jsonPrimitive.content,
                androidProductId = o.getValue("androidProductId").jsonPrimitive.content,
                grantsCosmetic = o["grantsCosmetic"]?.jsonPrimitive?.contentOrNull,
            )
        }
        val webBilling = obj("shared/billing/web-billing.json").getValue("skus").jsonArray.map {
            val o = it.jsonObject
            StoreCatalogSync.WebRow(
                sku = o.getValue("sku").jsonPrimitive.content,
                webProductId = o.getValue("webProductId").jsonPrimitive.content,
                androidProductId = o.getValue("androidProductId").jsonPrimitive.content,
                grantsCosmetic = o["grantsCosmetic"]?.jsonPrimitive?.contentOrNull,
            )
        }
        val playConsoleFile = obj("shared/billing/play-console-products.json")
        val playConsole = playConsoleFile.getValue("products").jsonArray.map {
            val o = it.jsonObject
            StoreCatalogSync.PlayConsoleRow(
                productId = o.getValue("productId").jsonPrimitive.content,
                sku = o.getValue("sku").jsonPrimitive.content,
            )
        }
        val webCheckout = obj("shared/billing/web-checkout-products.json").getValue("products").jsonArray.map {
            val o = it.jsonObject
            StoreCatalogSync.WebCheckoutRow(
                webProductId = o.getValue("webProductId").jsonPrimitive.content,
                sku = o.getValue("sku").jsonPrimitive.content,
                androidProductId = o.getValue("androidProductId").jsonPrimitive.content,
            )
        }

        val report = StoreCatalogSync.validate(
            entitlements = entitlements,
            playBilling = playBilling,
            webBilling = webBilling,
            playConsole = playConsole,
            webCheckout = webCheckout,
            playConsolePackageName = playConsoleFile.getValue("packageName").jsonPrimitive.content,
        )
        assertTrue(report.errors.joinToString("\n"), report.ok)
        assertEquals(StoreCatalogSync.engineRows().size, entitlements.size)
        assertEquals(6, entitlementsJson.getValue("storeCatalogSyncPhase").jsonPrimitive.content.toInt())
    }

    @Test
    fun detectDriftWhenPlayConsoleProductMissing() {
        val engine = StoreCatalogSync.engineRows()
        val play = engine.map {
            StoreCatalogSync.PlayRow(it.sku, it.androidProductId, it.grantsCosmetic)
        }
        val web = engine.map {
            StoreCatalogSync.WebRow(it.sku, it.webProductId, it.androidProductId, it.grantsCosmetic)
        }
        val console = engine.dropLast(1).map {
            StoreCatalogSync.PlayConsoleRow(it.androidProductId, it.sku)
        }
        val checkout = engine.map {
            StoreCatalogSync.WebCheckoutRow(it.webProductId, it.sku, it.androidProductId)
        }
        val report = StoreCatalogSync.validate(
            entitlements = engine,
            playBilling = play,
            webBilling = web,
            playConsole = console,
            webCheckout = checkout,
            playConsolePackageName = StoreCatalogSync.PACKAGE_NAME,
        )
        assertTrue(!report.ok)
        assertTrue(report.errors.any { it.contains("play-console-products") })
    }
}
