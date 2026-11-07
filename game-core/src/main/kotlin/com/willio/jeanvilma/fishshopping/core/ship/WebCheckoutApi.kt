package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 25 — web checkout API ship constants
 * (mirrors shared/ship/web-checkout-api.json).
 *
 * Runtime HTTP lives in checkout-api/ (web-only). Android keeps Play Billing.
 */
object WebCheckoutApi {
    const val PHASE = 25
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.web_checkout_api.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val CHECKOUT_API_MARKER = "authored-finish-2.0-phase-25"
    const val ROUTE_COUNT = 3
    const val SKU_FLOOR = 4
    const val LOCAL_EMULATOR_DEFAULT_BASE = "http://localhost:8787"
    const val CLIENT_ENV_KEY = "VITE_BILLING_API_BASE"
    const val FORCE_STUB_ENV_KEY = "VITE_BILLING_FORCE_STUB"
    const val PARITY_FIXTURE = "shared/fixtures/parity-web-checkout-api.json"
    const val CATALOG = "shared/ship/web-checkout-api.json"
    const val CONTRACT_CATALOG = "shared/billing/web-billing.json"
    const val PRODUCTS_CATALOG = "shared/billing/web-checkout-products.json"
    const val MODULE_ROOT = "checkout-api/"
    const val CHECKOUT_PATH = "/v1/checkout"
    const val ENTITLEMENTS_PATH = "/v1/entitlements"
    const val FULFILL_PATH = "/v1/fulfill"
}
