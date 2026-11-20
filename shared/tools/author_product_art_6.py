#!/usr/bin/env python3
"""
Finish 6.0 Phase 10 — product/cosmetic art presentation 6.

Regenerates product + cosmetic banner GLBs with Finish 6 stamps (retaining
Finish 4/5 markers), closes gaps.productArt6Incomplete, and wires
listing/pin/DoD + ship catalog.

Usage:
  python3 shared/tools/author_product_art_6.py
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_fish_stubs import (  # noqa: E402
    product_color,
    product_kind,
    write_cosmetic_banner,
    write_product,
)
from product_themes import (  # noqa: E402
    COSMETIC_BANNER_MARKER,
    COSMETIC_FINISH5_MARKER,
    COSMETIC_FINISH6_MARKER,
    PRODUCT_ART_MARKER,
    PRODUCT_FINISH5_MARKER,
    PRODUCT_FINISH6_MARKER,
)

SHIP = ROOT / "ship" / "product-art-6.json"
PARITY = ROOT / "fixtures" / "parity-product-art-6.json"
PRODUCT_ART = ROOT / "ship" / "product-art.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY_F6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
PRESENTATION = ROOT / "content" / "cosmetic-presentation.json"
LICENSES = ROOT / "store" / "licenses.json"
OUT_DIR = ROOT / "assets" / "models"

MARKER = "authored-finish-6.0-phase-10"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_ship(product_n: int, banner_n: int) -> None:
    catalog = {
        "phase": 10,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.product_art_6.v1",
        "description": (
            "Finish 6.0 Phase 10 — product/cosmetic art presentation 6. Stamps "
            f"productFinish6 + cosmeticFinish6={PRODUCT_FINISH6_MARKER} on the live "
            f"product-art roster ({product_n} products / {banner_n} banners) while retaining "
            "Finish 4/5 markers. Closes gaps.productArt6Incomplete. Schema stays 26 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "productArt6Marker": MARKER,
        "productFinish6Marker": PRODUCT_FINISH6_MARKER,
        "cosmeticFinish6Marker": COSMETIC_FINISH6_MARKER,
        "productFinish5Marker": PRODUCT_FINISH5_MARKER,
        "cosmeticFinish5Marker": COSMETIC_FINISH5_MARKER,
        "productArtCatalog": "shared/ship/product-art.json",
        "productArtMarker": PRODUCT_ART_MARKER,
        "cosmeticBannerMarker": COSMETIC_BANNER_MARKER,
        "authoredProductTarget": product_n,
        "cosmeticBannerTarget": banner_n,
        "minProductArtNodes": 4,
        "minCosmeticArtNodes": 4,
        "themesModule": "shared/tools/product_themes.py",
        "generator": "shared/tools/generate_fish_stubs.py",
        "cosmeticPresentationCatalog": "shared/content/cosmetic-presentation.json",
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "gapClosed": "productArt6Incomplete",
        "gapClosedValue": False,
        "parityFixture": "shared/fixtures/parity-product-art-6.json",
        "authorTool": "shared/tools/author_product_art_6.py",
        "validateScript": "npm run productart6:validate",
        "checklist": [
            f"All {product_n} product GLBs carry productFinish6={PRODUCT_FINISH6_MARKER}",
            f"All {banner_n} cosmetic banner GLBs carry cosmeticFinish6={COSMETIC_FINISH6_MARKER}",
            "Finish 4/5 productArt / finish5 markers retained",
            "gaps.productArt6Incomplete = false",
            "productart:validate + productart5:validate still green",
            "productart6:validate green in CI",
            "schema stays 26 / content 5.0.0",
        ],
        "preflightGates": [
            "shared/ship/product-art-6.json",
            "shared/fixtures/parity-product-art-6.json",
            "shared/ship/product-art.json",
            "shared/ship/finish-6.0-kickoff.json",
            "shared/tools/product_themes.py",
            "shared/tools/generate_fish_stubs.py",
            "shared/tools/author_product_art_6.py",
            "shared/assets/models/product_basic_portion.glb",
            "shared/assets/models/cosmetic_banner_sunset_bunting.glb",
            "web/src/ship/productArt6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ProductArt6.kt",
            "web/scripts/validate-product-art-6.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixtures.parity_product_art_6.v1",
        "productArt6Marker": MARKER,
        "productFinish6Marker": PRODUCT_FINISH6_MARKER,
        "cosmeticFinish6Marker": COSMETIC_FINISH6_MARKER,
        "phase": 10,
        "plan": "30_finish_6.0",
        "expect": {
            "authoredProductTarget": product_n,
            "cosmeticBannerTarget": banner_n,
            "minProductArtNodes": 4,
            "minCosmeticArtNodes": 4,
            "schemaVersion": 26,
            "contentVersion": "5.0.0",
            "productArt6IncompleteClosed": True,
            "openGapFlagMin": 17,
            "gates": [
                "products_stamped",
                "banners_stamped",
                "gap_closed",
                "kickoff_phase_wired",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def main() -> None:
    product_art = load(PRODUCT_ART)
    presentation = load(PRESENTATION)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    products = product_art.get("authoredProducts", [])
    banners = product_art.get("cosmeticBanners", [])
    by_id = {item["cosmeticId"]: item for item in presentation.get("items", [])}

    for entry in products:
        pid = entry["productId"]
        asset = entry["asset"].replace("shared/assets/", "")
        write_product(OUT_DIR, pid, asset, product_color(pid), product_kind(pid))

    for entry in banners:
        cid = entry["cosmeticId"]
        item = by_id.get(cid)
        if not item:
            raise SystemExit(f"missing cosmetic presentation for {cid}")
        write_cosmetic_banner(OUT_DIR, cid, item["swatchRgb"])

    soft = product_art.setdefault("softFloors", {})
    soft["productFinish5Marker"] = PRODUCT_FINISH5_MARKER
    soft["cosmeticFinish5Marker"] = COSMETIC_FINISH5_MARKER
    soft["productFinish6Marker"] = PRODUCT_FINISH6_MARKER
    soft["cosmeticFinish6Marker"] = COSMETIC_FINISH6_MARKER
    product_art["authoredProductTarget"] = len(products)
    product_art["cosmeticBannerTarget"] = len(banners)
    product_art["description"] = (
        "Finish 4.0 Phase 10/13 + Finish 5.0 Phase 10/15 + Finish 6.0 Phase 10 — "
        f"product/cosmetic art presentation pass. Authors multi-part ProductArt meshes for all "
        f"{len(products)} products, authored cosmetic banner GLBs for {len(banners)} banners, "
        "and counter tray presentation depth. Schema stays 26 / content 5.0.0."
    )
    dump(PRODUCT_ART, product_art)

    if LICENSES.is_file():
        lic = load(LICENSES)
        for rec in lic.get("records", []):
            if rec.get("id") == "product-authored-art":
                rec["paths"] = sorted(e["asset"] for e in products if e.get("asset"))
                rec["note"] = (
                    "Finish 4.0/5.0/6.0 multi-part ProductArt "
                    f"meshes for all {len(rec['paths'])} products."
                )
            if rec.get("id") == "cosmetic-banner-art":
                rec["paths"] = sorted(e["asset"] for e in banners if e.get("asset"))
                rec["note"] = f"Authored cosmetic banner meshes ({len(rec['paths'])})."
        dump(LICENSES, lic)

    write_ship(len(products), len(banners))

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["productArt6Incomplete"] = False
    dump(KICKOFF, kickoff)

    if PARITY_F6.is_file():
        pfx = load(PARITY_F6)
        pfx.setdefault("expect", {})["openGapFlagMin"] = 17
        dump(PARITY_F6, pfx)

    listing = load(LISTING)
    listing["productArt6Phase"] = 10
    listing["productArt6Catalog"] = "shared/ship/product-art-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["productArt6"] = "shared/ship/product-art-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-product-art-6.json" not in fixtures:
        fixtures.append("parity-product-art-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["productArt6"] = {
        "phase": 10,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "productArt6Marker": MARKER,
        "catalog": "shared/ship/product-art-6.json",
        "parityFixture": "shared/fixtures/parity-product-art-6.json",
        "validateScript": "npm run productart6:validate",
        "checklist": [
            f"{len(products)} products + {len(banners)} banners stamped product/cosmetic Finish 6",
            "gaps.productArt6Incomplete closed",
            "productart:validate + productart5:validate still green",
            "productart6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase10 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 10), None)
    if not phase10 or phase10.get("validate") != "productart6:validate":
        raise SystemExit("kickoff phase 10 must validate via productart6:validate")

    print(
        f"OK author_product_art_6 — "
        f"{len(products)} products + {len(banners)} banners stamped; "
        f"productArt6Incomplete closed"
    )


if __name__ == "__main__":
    main()
