package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5 ship contracts from
 * `shared/ship/stripe-ops-5.json`.
 */
object StripeOps5 {
    const val PHASE = 25
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.stripe_ops_5.v1"
    const val CATALOG = "shared/ship/stripe-ops-5.json"
    const val OPS_CATALOG = "shared/ops/stripe-ops-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-stripe-ops-5.json"
    const val MARKER = "authored-finish-5.0-phase-25"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val SKU_FLOOR = 25
    const val COSMETIC_SKU_FLOOR = 24
    const val PRICE_MAP_FLOOR = 25
    const val READINESS_PATH = "/v1/ops/readiness"
    const val VALIDATE_SCRIPT = "stripeops5:validate"
    const val SOFT_STRIPE_OPS_4_VALIDATE = "stripeops4:validate"
    const val CLOSES_GAP = "stripeOps5Incomplete"
    const val EXTENDS_STRIPE_OPS_4 = "shared/ship/stripe-ops-4.json"
}
