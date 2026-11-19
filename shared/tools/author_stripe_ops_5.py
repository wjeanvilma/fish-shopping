#!/usr/bin/env python3
"""
Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5.

Syncs Finish 5 cosmetics into Play/web/console/checkout catalogs, raises
SKU/price floors to ≥25 / cosmetics ≥24, and closes stripeOps5Incomplete.

Usage:
  python3 shared/tools/author_stripe_ops_5.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "stripe-ops-5.json"
OPS = ROOT / "ops" / "stripe-ops-5.json"
PARITY = ROOT / "fixtures" / "parity-stripe-ops-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
ENTITLEMENTS = ROOT / "billing" / "entitlements.json"
MARKER = "authored-finish-5.0-phase-25"

SKU_FLOOR = 25
COSMETIC_SKU_FLOOR = 24
PRICE_MAP_FLOOR = 25
CUTOVER_MIN = 10
MANUAL_OPS_MIN = 5


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sync_from_entitlements() -> tuple[int, int]:
    ents = load(ENTITLEMENTS)
    cosmetics = ents.get("cosmetics") or []
    unlock = ents.get("fullUnlock") or {}
    rows = []
    if unlock.get("sku"):
        rows.append(unlock)
    rows.extend(cosmetics)

    pb = load(ROOT / "billing" / "play-billing.json")
    wb = load(ROOT / "billing" / "web-billing.json")
    pc = load(ROOT / "billing" / "play-console-products.json")
    wc = load(ROOT / "billing" / "web-checkout-products.json")
    er = load(ROOT / "billing" / "entitlement-reconcile.json")

    pb_have = {p["sku"] for p in pb["skus"]}
    wb_have = {p["sku"] for p in wb["skus"]}
    pc_have = {p["sku"] for p in pc["products"]}
    wc_have = {p["sku"] for p in wc["products"]}
    er_have = set(er.get("skus") or [])

    for row in rows:
        sku = row["sku"]
        android = row["androidProductId"]
        web = row.get("webProductId") or sku
        grants = row.get("grantsCosmetic")
        if sku not in pb_have:
            pb["skus"].append({"sku": sku, "androidProductId": android, "grantsCosmetic": grants})
            pb_have.add(sku)
        if sku not in wb_have:
            wb["skus"].append(
                {
                    "sku": sku,
                    "webProductId": web,
                    "androidProductId": android,
                    "grantsCosmetic": grants,
                }
            )
            wb_have.add(sku)
        if sku not in pc_have:
            pc["products"].append(
                {"productId": android, "sku": sku, "status": "active", "type": "non_consumable"}
            )
            pc_have.add(sku)
        if sku not in wc_have:
            wc["products"].append(
                {
                    "webProductId": web,
                    "sku": sku,
                    "androidProductId": android,
                    "status": "active",
                    "type": "non_consumable",
                    "stripePriceId": f"price_test_{android}",
                }
            )
            wc_have.add(sku)
        if sku not in er_have:
            er.setdefault("skus", []).append(sku)
            er_have.add(sku)

    wb["finish5StripeOpsPhase"] = 25
    wb["stripeOps5Catalog"] = "shared/ship/stripe-ops-5.json"
    # Keep Finish 4 pin so soft stripeops4:validate stays green.
    wb.setdefault("finish4StripeOpsPhase", 25)
    wb.setdefault("stripeOpsCatalog", "shared/ship/stripe-ops-4.json")
    dump(ROOT / "billing" / "play-billing.json", pb)
    dump(ROOT / "billing" / "web-billing.json", wb)
    dump(ROOT / "billing" / "play-console-products.json", pc)
    dump(ROOT / "billing" / "web-checkout-products.json", wc)
    dump(ROOT / "billing" / "entitlement-reconcile.json", er)

    active = [p for p in wc["products"] if p.get("status") == "active"]
    cosmetic = [p for p in active if ".cosmetic." in (p.get("sku") or "")]
    return len(active), len(cosmetic)


def write_catalogs() -> None:
    dump(
        OPS,
        {
            "phase": 25,
            "plan": "30_finish_5.0",
            "schema": "fish.ops.stripe_ops_5.v1",
            "description": (
                "Finish 5.0 Phase 25 — live-ready Stripe/checkout catalog ops refresh for 5.0.0 "
                "SKUs/entitlements (≥25 active / ≥24 cosmetics). Secrets never committed."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "stripeOps5Marker": MARKER,
            "extendsStripeOps4": "shared/ops/stripe-ops-4.json",
            "extendsStripeLive": "shared/ship/stripe-live-checkout.json",
            "productsCatalog": "shared/billing/web-checkout-products.json",
            "storeCatalogSync": "shared/billing/store-catalog-sync.json",
            "skuFloor": SKU_FLOOR,
            "cosmeticSkuFloor": COSMETIC_SKU_FLOOR,
            "priceMapFloor": PRICE_MAP_FLOOR,
            "readinessPath": "/v1/ops/readiness",
            "healthPath": "/health",
            "webhookPath": "/v1/stripe/webhook",
            "webhookIdempotency": {
                "required": True,
                "storeField": "processedStripeEventIds",
                "duplicateResponse": {"received": True, "duplicate": True},
            },
            "readinessFields": [
                "ok",
                "catalogOk",
                "priceMapOk",
                "priceMapSize",
                "skuFloor",
                "cosmeticSkuFloor",
                "cosmeticSkuCount",
                "finish5CatalogOk",
                "liveReady",
            ],
            "cutoverChecklist": [
                "billing:validate green (entitlements ↔ Play/web/checkout catalogs)",
                "Every active SKU has stripePriceId placeholder or STRIPE_PRICE_* override",
                "CHECKOUT_API_MODE=stub still completes instant checkout",
                "Live without STRIPE_SECRET_KEY returns 503 (no sandbox fallback)",
                "Webhook signature verify + idempotent replay of same event id",
                "GET /v1/ops/readiness reports catalogOk + priceMapOk + finish5CatalogOk",
                "Stripe Dashboard webhook endpoint points at POST /v1/stripe/webhook",
                "Replace price_test_* placeholders with live price ids before production traffic",
                "Finish 5 cosmetics (≥24) synced into Play/web/console/checkout",
                "stripeops5:validate green; soft stripeops4:validate still green",
            ],
            "envPlaceholders": [
                "CHECKOUT_API_MODE",
                "STRIPE_SECRET_KEY",
                "STRIPE_WEBHOOK_SECRET",
                "STRIPE_PRICE_*",
            ],
            "manualOps": [
                {
                    "id": "sync_catalogs",
                    "title": "Sync store catalogs",
                    "body": (
                        "Run python3 shared/tools/author_stripe_ops_5.py then npm run billing:validate "
                        "after adding cosmetics. Mirrors entitlements into Play/web/checkout product tables."
                    ),
                },
                {
                    "id": "map_live_prices",
                    "title": "Map live Stripe prices",
                    "body": (
                        "Create Stripe Prices for each webProductId, then set stripePriceId or "
                        "STRIPE_PRICE_<SKU> env overrides. Never commit live secret keys."
                    ),
                },
                {
                    "id": "cutover_live",
                    "title": "Cut over to live mode",
                    "body": (
                        "Set CHECKOUT_API_MODE=live with STRIPE_SECRET_KEY + STRIPE_WEBHOOK_SECRET. "
                        "Confirm /v1/ops/readiness liveReady=true and finish5CatalogOk=true before traffic."
                    ),
                },
                {
                    "id": "refund_verify",
                    "title": "Refund verify",
                    "body": (
                        "After a Stripe refund, confirm GET /v1/entitlements no longer returns the SKU "
                        "for that cloudAccountId (or re-reconcile per entitlement-reconcile.json)."
                    ),
                },
                {
                    "id": "finish5_drift_audit",
                    "title": "Finish 5 catalog drift audit",
                    "body": (
                        "Diff entitlements.json cosmetics vs web-checkout-products.json. Any missing "
                        "Finish 5 harbor/machine banners must be synced before freeze-5."
                    ),
                },
            ],
        },
    )
    dump(
        SHIP,
        {
            "phase": 25,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.stripe_ops_5.v1",
            "description": (
                "Finish 5.0 Phase 25 — Stripe/checkout live-ready catalog ops 5 ship gate. "
                "Closes kickoff gap stripeOps5Incomplete. Soft-floors Finish 4.0 stripeops4:validate."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "stripeOps5Marker": MARKER,
            "closesGap": "stripeOps5Incomplete",
            "opsCatalog": "shared/ops/stripe-ops-5.json",
            "extendsStripeOps4": "shared/ship/stripe-ops-4.json",
            "extendsStripeLive": "shared/ship/stripe-live-checkout.json",
            "productsCatalog": "shared/billing/web-checkout-products.json",
            "storeCatalogSync": "shared/billing/store-catalog-sync.json",
            "skuFloor": SKU_FLOOR,
            "cosmeticSkuFloor": COSMETIC_SKU_FLOOR,
            "priceMapFloor": PRICE_MAP_FLOOR,
            "readinessPath": "/v1/ops/readiness",
            "webhookIdempotencyRequired": True,
            "cutoverChecklistMin": CUTOVER_MIN,
            "manualOpsMin": MANUAL_OPS_MIN,
            "parityFixture": "shared/fixtures/parity-stripe-ops-5.json",
            "validateScript": "npm run stripeops5:validate",
            "softStripeOps4Validate": "npm run stripeops4:validate",
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "authorTool": "shared/tools/author_stripe_ops_5.py",
            "checklist": [
                "Entitlements ↔ Play/web/console/checkout catalogs synced (≥25 SKUs)",
                "≥24 cosmetic SKUs with stripePriceId",
                "Webhook event idempotency in CheckoutStore",
                "GET /v1/ops/readiness reports finish5CatalogOk",
                "Kickoff gaps.stripeOps5Incomplete=false",
                "stripeops4:validate soft-green",
                "stripeops5:validate green in CI",
                "schema stays 26 / content 4.0.0",
            ],
            "preflightGates": [
                "shared/ship/stripe-ops-5.json",
                "shared/ops/stripe-ops-5.json",
                "shared/fixtures/parity-stripe-ops-5.json",
                "shared/billing/web-checkout-products.json",
                "shared/billing/store-catalog-sync.json",
                "shared/tools/author_stripe_ops_5.py",
                "checkout-api/src/stripeLive.ts",
                "checkout-api/src/store.ts",
                "checkout-api/src/server.ts",
                "checkout-api/src/handlers.ts",
                "web/src/ship/stripeOps5.ts",
                "web/scripts/validate-stripe-ops-5.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeOps5.kt",
            ],
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixtures.parity_stripe_ops_5.v1",
            "stripeOps5Marker": MARKER,
            "phase": 25,
            "plan": "30_finish_5.0",
            "expect": {
                "skuFloor": SKU_FLOOR,
                "cosmeticSkuFloor": COSMETIC_SKU_FLOOR,
                "priceMapFloor": PRICE_MAP_FLOOR,
                "readinessPath": "/v1/ops/readiness",
                "webhookIdempotency": True,
                "closesGap": "stripeOps5Incomplete",
                "stripeOps5Incomplete": False,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "gates": [
                    "catalog_sync",
                    "price_map",
                    "readiness",
                    "webhook_idempotency",
                    "gap_closed",
                    "ci_gate",
                ],
            },
        },
    )


def update_kickoff_dod_listing_pin(sku_count: int, cosmetic_count: int) -> None:
    kick = load(KICKOFF)
    kick["gaps"]["stripeOps5Incomplete"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["stripeOps5Skus"] = SKU_FLOOR
    quotas["stripeOps5Cosmetics"] = COSMETIC_SKU_FLOOR
    quotas["stripeOps5PriceMapped"] = PRICE_MAP_FLOOR
    dod["notes"] = (
        "Finish 5.0 Phase 25 stripe-ops-5 complete (catalog ops refresh ≥25 SKUs / ≥24 cosmetics); "
        "Phases 1–24 remain green. Content stays 4.0.0 / schema 26. stripeOps5Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["stripeOps5"] = {
        "phase": 25,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "stripeOps5Marker": MARKER,
        "catalog": "shared/ship/stripe-ops-5.json",
        "opsCatalog": "shared/ops/stripe-ops-5.json",
        "parityFixture": "shared/fixtures/parity-stripe-ops-5.json",
        "validateScript": "npm run stripeops5:validate",
        "checklist": [
            f"≥{SKU_FLOOR} SKUs synced ({sku_count} live)",
            f"≥{COSMETIC_SKU_FLOOR} cosmetics ({cosmetic_count} live)",
            "Webhook idempotency + finish5CatalogOk readiness",
            "Kickoff stripeOps5Incomplete closed",
            "stripeops5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["stripeOps5Phase"] = 25
    listing["stripeOps5Catalog"] = "shared/ship/stripe-ops-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["stripeOps5"] = "shared/ship/stripe-ops-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-stripe-ops-5.json" not in fixtures:
        fixtures.append("parity-stripe-ops-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    sku_count, cosmetic_count = sync_from_entitlements()
    if sku_count < SKU_FLOOR:
        raise SystemExit(f"active SKUs {sku_count} < {SKU_FLOOR}")
    if cosmetic_count < COSMETIC_SKU_FLOOR:
        raise SystemExit(f"cosmetic SKUs {cosmetic_count} < {COSMETIC_SKU_FLOOR}")
    write_catalogs()
    update_kickoff_dod_listing_pin(sku_count, cosmetic_count)
    print(
        f"OK Phase 25 stripe-ops-5: skus={sku_count} cosmetics={cosmetic_count} "
        f"floors={SKU_FLOOR}/{COSMETIC_SKU_FLOOR}"
    )


if __name__ == "__main__":
    main()
