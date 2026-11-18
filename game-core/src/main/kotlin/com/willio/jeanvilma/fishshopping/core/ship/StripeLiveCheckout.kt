package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 16 — live Stripe web checkout
 * (mirrors shared/ship/stripe-live-checkout.json).
 */
object StripeLiveCheckout {
    const val PHASE = 16
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.stripe_live_checkout.v1"
    const val CATALOG = "shared/ship/stripe-live-checkout.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-stripe-live-checkout.json"
    const val MARKER = "authored-finish-3.0-phase-16"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val WEBHOOK_PATH = "/v1/stripe/webhook"
    const val CHECKOUT_HOST = "https://checkout.stripe.com/"
    const val CLOSES_GAP = "stripeLiveCheckoutPartial"
    const val PRIOR_CHECKOUT_API_PHASE = 25
    const val VALIDATE_SCRIPT = "npm run stripe:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val BILLING_CONTRACT = "shared/billing/web-billing.json"
    const val PRODUCTS_CATALOG = "shared/billing/web-checkout-products.json"
}
