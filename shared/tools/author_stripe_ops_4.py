#!/usr/bin/env python3
"""
Finish 4.0 Phase 25 — Stripe/checkout live-ready catalog ops lock helper.

Syncs Phase-18 cosmetics into Play/web/console/checkout catalogs when missing,
then wires listing/pin/DoD/kickoff gap close.

Usage:
  python3 shared/tools/author_stripe_ops_4.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "stripe-ops-4.json"
OPS = ROOT / "ops" / "stripe-ops-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
ENTITLEMENTS = ROOT / "billing" / "entitlements.json"
MARKER = "authored-finish-4.0-phase-25"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def sync_from_entitlements() -> int:
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

    wb["finish4StripeOpsPhase"] = 25
    wb["stripeOpsCatalog"] = "shared/ship/stripe-ops-4.json"
    dump(ROOT / "billing" / "play-billing.json", pb)
    dump(ROOT / "billing" / "web-billing.json", wb)
    dump(ROOT / "billing" / "play-console-products.json", pc)
    dump(ROOT / "billing" / "web-checkout-products.json", wc)
    dump(ROOT / "billing" / "entitlement-reconcile.json", er)
    return len(wc["products"])


def main() -> None:
    if not SHIP.is_file() or not OPS.is_file():
        raise SystemExit("missing stripe-ops-4 catalogs")
    sku_count = sync_from_entitlements()

    listing = load(LISTING)
    listing["stripeOps4Phase"] = 25
    listing["stripeOps4Catalog"] = "shared/ship/stripe-ops-4.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["stripeOps4"] = "shared/ship/stripe-ops-4.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-stripe-ops-4.json" not in fixtures:
        fixtures.append("parity-stripe-ops-4.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["stripeOpsSkus"] = 19
    quotas["stripeOpsPriceMapped"] = 19
    dod["stripeOps4"] = {
        "phase": 25,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "stripeOps4Marker": MARKER,
        "catalog": "shared/ship/stripe-ops-4.json",
        "opsCatalog": "shared/ops/stripe-ops-4.json",
        "parityFixture": "shared/fixtures/parity-stripe-ops-4.json",
        "validateScript": "npm run stripeops4:validate",
        "checklist": [
            "≥19 SKUs synced across Play/web/checkout",
            "Webhook idempotency + /v1/ops/readiness",
            "Kickoff stripeOpsIncomplete closed",
            "stripeops4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    kickoff = load(KICKOFF)
    phase25 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 25), None)
    if not phase25 or phase25.get("validate") != "stripeops4:validate":
        raise SystemExit("kickoff phase 25 must validate via stripeops4:validate")
    kickoff.setdefault("gaps", {})["stripeOpsIncomplete"] = False
    dump(KICKOFF, kickoff)
    print(f"OK author_stripe_ops_4 — {sku_count} checkout SKUs; stripeOpsIncomplete closed")


if __name__ == "__main__":
    main()
