#!/usr/bin/env python3
"""
Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6.

Syncs Finish 6 cosmetics (≥30) into Play/web/console/checkout catalogs, raises
SKU/price floors to ≥31 / cosmetics ≥30, and closes stripeOps6Incomplete.

Usage:
  python3 shared/tools/author_stripe_ops_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "stripe-ops-6.json"
OPS = ROOT / "ops" / "stripe-ops-6.json"
PARITY = ROOT / "fixtures" / "parity-stripe-ops-6.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
ENTITLEMENTS = ROOT / "billing" / "entitlements.json"
MARKER = "authored-finish-6.0-phase-25"

SKU_FLOOR = 31
COSMETIC_SKU_FLOOR = 30
PRICE_MAP_FLOOR = 31
CUTOVER_MIN = 11
MANUAL_OPS_MIN = 6


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

    wb["finish6StripeOpsPhase"] = 25
    wb["stripeOps6Catalog"] = "shared/ship/stripe-ops-6.json"
    # Keep Finish 5 pin so soft stripeops5:validate stays green.
    wb.setdefault("finish5StripeOpsPhase", 25)
    wb.setdefault("stripeOps5Catalog", "shared/ship/stripe-ops-5.json")
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
            "plan": "30_finish_6.0",
            "schema": "fish.ops.stripe_ops_6.v1",
            "description": (
                "Finish 6.0 Phase 25 — live-ready Stripe/checkout catalog ops refresh for nest "
                "cosmetics (≥31 active / ≥30 cosmetics). Secrets never committed."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "stripeOps6Marker": MARKER,
            "extendsStripeOps5": "shared/ops/stripe-ops-5.json",
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
                "finish6CatalogOk",
                "liveReady",
            ],
            "cutoverChecklist": [
                "billing:validate green (entitlements ↔ Play/web/checkout catalogs)",
                "Every active SKU has stripePriceId placeholder or STRIPE_PRICE_* override",
                "CHECKOUT_API_MODE=stub still completes instant checkout",
                "Live without STRIPE_SECRET_KEY returns 503 (no sandbox fallback)",
                "Webhook signature verify + idempotent replay of same event id",
                "GET /v1/ops/readiness reports catalogOk + priceMapOk + finish6CatalogOk",
                "Stripe Dashboard webhook endpoint points at POST /v1/stripe/webhook",
                "Replace price_test_* placeholders with live price ids before production traffic",
                "Finish 6 cosmetics (≥30) synced into Play/web/console/checkout",
                "Nest saffron/cobalt/roast/ferment banners price-mapped",
                "stripeops6:validate green; soft stripeops5:validate still green",
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
                        "Run python3 shared/tools/author_stripe_ops_6.py then npm run billing:validate "
                        "after adding nest cosmetics. Mirrors entitlements into Play/web/checkout product tables."
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
                        "Confirm /v1/ops/readiness liveReady=true and finish6CatalogOk=true before traffic."
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
                    "title": "Finish 5 catalog drift audit (soft)",
                    "body": (
                        "Diff entitlements.json cosmetics vs web-checkout-products.json for Finish 5 "
                        "floors (≥24). Soft-floor stays green under Finish 6 sync."
                    ),
                },
                {
                    "id": "finish6_nest_drift_audit",
                    "title": "Finish 6 nest catalog drift audit",
                    "body": (
                        "Diff entitlements.json nest cosmetics (saffron/cobalt/roast/ferment) vs "
                        "web-checkout-products.json. Any missing nest banners must be synced before freeze-6."
                    ),
                },
            ],
        },
    )
    dump(
        SHIP,
        {
            "phase": 25,
            "plan": "30_finish_6.0",
            "schema": "fish.ship.stripe_ops_6.v1",
            "description": (
                "Finish 6.0 Phase 25 — Stripe/checkout live-ready catalog ops 6 ship gate. "
                "Closes kickoff gap stripeOps6Incomplete. Soft-floors Finish 5.0 stripeops5:validate."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "stripeOps6Marker": MARKER,
            "closesGap": "stripeOps6Incomplete",
            "opsCatalog": "shared/ops/stripe-ops-6.json",
            "extendsStripeOps5": "shared/ship/stripe-ops-5.json",
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
            "parityFixture": "shared/fixtures/parity-stripe-ops-6.json",
            "validateScript": "npm run stripeops6:validate",
            "softStripeOps5Validate": "npm run stripeops5:validate",
            "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
            "authorTool": "shared/tools/author_stripe_ops_6.py",
            "softFloors": {
                "stripeOps5SkuFloor": 25,
                "stripeOps5CosmeticFloor": 24,
                "stripeOps5PriceMapFloor": 25,
                "note": "Finish 5.0 stripeops5 stays green; Phase 25 enforces ≥31/≥30 floors.",
            },
            "checklist": [
                "Entitlements ↔ Play/web/console/checkout catalogs synced (≥31 SKUs)",
                "≥30 cosmetic SKUs with stripePriceId",
                "Webhook event idempotency in CheckoutStore",
                "GET /v1/ops/readiness reports finish6CatalogOk",
                "Kickoff gaps.stripeOps6Incomplete=false",
                "stripeops5:validate soft-green",
                "stripeops6:validate green in CI",
                "schema stays 27 / content 5.0.0",
            ],
            "preflightGates": [
                "shared/ship/stripe-ops-6.json",
                "shared/ops/stripe-ops-6.json",
                "shared/fixtures/parity-stripe-ops-6.json",
                "shared/billing/web-checkout-products.json",
                "shared/billing/store-catalog-sync.json",
                "shared/tools/author_stripe_ops_6.py",
                "checkout-api/src/stripeLive.ts",
                "checkout-api/src/store.ts",
                "checkout-api/src/server.ts",
                "checkout-api/src/handlers.ts",
                "web/src/ship/stripeOps6.ts",
                "web/scripts/validate-stripe-ops-6.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StripeOps6.kt",
            ],
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixtures.parity_stripe_ops_6.v1",
            "stripeOps6Marker": MARKER,
            "phase": 25,
            "plan": "30_finish_6.0",
            "expect": {
                "skuFloor": SKU_FLOOR,
                "cosmeticSkuFloor": COSMETIC_SKU_FLOOR,
                "priceMapFloor": PRICE_MAP_FLOOR,
                "readinessPath": "/v1/ops/readiness",
                "webhookIdempotency": True,
                "closesGap": "stripeOps6Incomplete",
                "stripeOps6Incomplete": False,
                "openGapFlagMin": 4,
                "schemaVersion": 27,
                "contentVersion": "5.0.0",
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
    kick["gaps"]["stripeOps6Incomplete"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    dod.setdefault("quotas", {})
    dod["quotas"]["stripeOps6Skus"] = SKU_FLOOR
    dod["quotas"]["stripeOps6Cosmetics"] = COSMETIC_SKU_FLOOR
    dod["quotas"]["stripeOps6PriceMapped"] = PRICE_MAP_FLOOR
    # Soft-floor: Finish 5 quotas stay as mins under raised live counts.
    dod["quotas"]["stripeOps5Skus"] = max(dod["quotas"].get("stripeOps5Skus", 25), 25)
    dod["quotas"]["stripeOps5Cosmetics"] = max(dod["quotas"].get("stripeOps5Cosmetics", 24), 24)
    dod["quotas"]["stripeOps5PriceMapped"] = max(dod["quotas"].get("stripeOps5PriceMapped", 25), 25)
    dod["stripeOps6"] = {
        "phase": 25,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "stripeOps6Marker": MARKER,
        "catalog": "shared/ship/stripe-ops-6.json",
        "opsCatalog": "shared/ops/stripe-ops-6.json",
        "parityFixture": "shared/fixtures/parity-stripe-ops-6.json",
        "validateScript": "npm run stripeops6:validate",
        "checklist": [
            f"≥{SKU_FLOOR} SKUs / ≥{COSMETIC_SKU_FLOOR} cosmetics price-mapped (live {sku_count}/{cosmetic_count})",
            "finish6CatalogOk readiness",
            "kickoff stripeOps6Incomplete closed",
            "stripeops6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["stripeOps6Phase"] = 25
    listing["stripeOps6Catalog"] = "shared/ship/stripe-ops-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["stripeOps6"] = "shared/ship/stripe-ops-6.json"
    fx = pin.get("fixtures") or []
    if "parity-stripe-ops-6.json" not in fx:
        fx.append("parity-stripe-ops-6.json")
    pin["fixtures"] = fx
    dump(PIN, pin)


def main() -> None:
    sku_count, cosmetic_count = sync_from_entitlements()
    write_catalogs()
    update_kickoff_dod_listing_pin(sku_count, cosmetic_count)
    print(
        f"stripe-ops-6 authored: active={sku_count} cosmetics={cosmetic_count} "
        f"floors={SKU_FLOOR}/{COSMETIC_SKU_FLOOR}"
    )
    if sku_count < SKU_FLOOR or cosmetic_count < COSMETIC_SKU_FLOOR:
        raise SystemExit(
            f"floors short after sync: active={sku_count} cosmetics={cosmetic_count}"
        )


if __name__ == "__main__":
    main()
