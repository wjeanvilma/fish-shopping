package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6 ship contracts from
 * `shared/ship/stripe-ops-6.json`.
 */
object StripeOps6 {
    const val PHASE = 25
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.stripe_ops_6.v1"
    const val CATALOG = "shared/ship/stripe-ops-6.json"
    const val OPS_CATALOG = "shared/ops/stripe-ops-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-stripe-ops-6.json"
    const val MARKER = "authored-finish-6.0-phase-25"
    const val STRIPE_OPS_6_MARKER = MARKER
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val SKU_FLOOR = 31
    const val COSMETIC_SKU_FLOOR = 30
    const val PRICE_MAP_FLOOR = 31
    const val READINESS_PATH = "/v1/ops/readiness"
    const val VALIDATE_SCRIPT = "stripeops6:validate"
    const val SOFT_STRIPE_OPS_5_VALIDATE = "stripeops5:validate"
    const val CLOSES_GAP = "stripeOps6Incomplete"
    const val EXTENDS_STRIPE_OPS_5 = "shared/ship/stripe-ops-5.json"
}
