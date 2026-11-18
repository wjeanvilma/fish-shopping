package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 25 — Stripe/checkout live-ready catalog ops
 * (mirrors shared/ship/stripe-ops-4.json).
 */
object StripeOps4 {
    const val PHASE = 25
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.stripe_ops_4.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val STRIPE_OPS_4_MARKER = "authored-finish-4.0-phase-25"
    const val CLOSES_GAP = "stripeOpsIncomplete"
    const val SKU_FLOOR = 19
    const val COSMETIC_SKU_FLOOR = 18
    const val PRICE_MAP_FLOOR = 19
    const val READINESS_PATH = "/v1/ops/readiness"
    const val WEBHOOK_IDEMPOTENCY_REQUIRED = true
    const val CUTOVER_CHECKLIST_MIN = 8
    const val MANUAL_OPS_MIN = 4
    const val CATALOG = "shared/ship/stripe-ops-4.json"
    const val OPS_CATALOG = "shared/ops/stripe-ops-4.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-stripe-ops-4.json"
    const val VALIDATE_SCRIPT = "stripeops4:validate"
}
