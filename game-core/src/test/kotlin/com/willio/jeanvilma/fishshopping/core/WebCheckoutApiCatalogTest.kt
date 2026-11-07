package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.WebCheckoutApi
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.int
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/**
 * Finish 2.0 Phase 25 — web checkout API ship/contract catalogs.
 * Runtime HTTP is web-only (checkout-api/); Android keeps Play Billing.
 */
class WebCheckoutApiCatalogTest {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, WebCheckoutApi.CATALOG).isFile }

    @Test
    fun catalogMirrorsShipConstants() {
        val root = repoRoot()
        val json = Json.parseToJsonElement(File(root, WebCheckoutApi.CATALOG).readText()).jsonObject
        assertEquals(WebCheckoutApi.PHASE, json.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(WebCheckoutApi.SCHEMA, json.getValue("schema").jsonPrimitive.content)
        assertEquals(WebCheckoutApi.PLAN, json.getValue("plan").jsonPrimitive.content)
        assertEquals(WebCheckoutApi.ROUTE_COUNT, json.getValue("routeCount").jsonPrimitive.int)
        assertEquals(WebCheckoutApi.SKU_FLOOR, json.getValue("skuFloor").jsonPrimitive.int)
        assertEquals(WebCheckoutApi.CONTRACT_CATALOG, json.getValue("contractCatalog").jsonPrimitive.content)
        assertEquals(WebCheckoutApi.MODULE_ROOT, json.getValue("moduleRoot").jsonPrimitive.content)
        assertEquals(
            WebCheckoutApi.LOCAL_EMULATOR_DEFAULT_BASE,
            json.getValue("localEmulatorDefaultBase").jsonPrimitive.content,
        )
        assertEquals(WebCheckoutApi.CLIENT_ENV_KEY, json.getValue("clientEnvKey").jsonPrimitive.content)
        assertEquals(
            WebCheckoutApi.CHECKOUT_API_MARKER,
            json.getValue("checkoutApiMarker").jsonPrimitive.content,
        )
        assertEquals(23, json.getValue("schemaVersion").jsonPrimitive.int)
    }

    @Test
    fun contractRoutesAndPins() {
        val root = repoRoot()
        val billing = Json.parseToJsonElement(File(root, WebCheckoutApi.CONTRACT_CATALOG).readText()).jsonObject
        val api = billing.getValue("api").jsonObject
        assertEquals(
            WebCheckoutApi.CHECKOUT_PATH,
            api.getValue("checkout").jsonObject.getValue("path").jsonPrimitive.content,
        )
        assertEquals(
            WebCheckoutApi.ENTITLEMENTS_PATH,
            api.getValue("entitlements").jsonObject.getValue("path").jsonPrimitive.content,
        )
        assertEquals(
            WebCheckoutApi.FULFILL_PATH,
            api.getValue("fulfill").jsonObject.getValue("path").jsonPrimitive.content,
        )

        val products = Json.parseToJsonElement(File(root, WebCheckoutApi.PRODUCTS_CATALOG).readText()).jsonObject
        val active = products.getValue("products").jsonArray.count {
            it.jsonObject.getValue("status").jsonPrimitive.content == "active"
        }
        assertTrue(active >= WebCheckoutApi.SKU_FLOOR)

        val entitlements = Json.parseToJsonElement(File(root, "shared/billing/entitlements.json").readText()).jsonObject
        assertEquals(25, entitlements.getValue("webCheckoutApiModulePhase").jsonPrimitive.content.toInt())
        assertEquals(2, entitlements.getValue("webBillingPhase").jsonPrimitive.content.toInt())

        val listing = Json.parseToJsonElement(File(root, "shared/store/listing.json").readText()).jsonObject
        assertEquals(25, listing.getValue("webCheckoutApiPhase").jsonPrimitive.content.toInt())
        assertEquals(WebCheckoutApi.CATALOG, listing.getValue("webCheckoutApiCatalog").jsonPrimitive.content)

        val pin = Json.parseToJsonElement(File(root, "shared/fixtures/RELEASE_PIN.json").readText()).jsonObject
        assertEquals(WebCheckoutApi.CATALOG, pin.getValue("webCheckoutApi").jsonPrimitive.content)
        assertTrue(
            pin.getValue("fixtures").jsonArray.any {
                it.jsonPrimitive.contentOrNull == "parity-web-checkout-api.json"
            },
        )

        assertTrue(File(root, "checkout-api/src/server.ts").isFile)
        assertTrue(File(root, "checkout-api/.env.example").isFile)
        assertTrue(File(root, "web/.env.example").readText().contains("VITE_BILLING_API_BASE="))
    }
}
