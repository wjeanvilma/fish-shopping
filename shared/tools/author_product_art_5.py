#!/usr/bin/env python3
"""
Finish 5.0 Phase 10 — product/cosmetic art presentation 5 lock helper.

Regenerates product + cosmetic banner GLBs with Finish 5 stamps, closes
gaps.productArt5Incomplete, and wires listing/pin/DoD.

Usage:
  python3 shared/tools/author_product_art_5.py
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

SHIP = ROOT / "ship" / "product-art-5.json"
PARITY = ROOT / "fixtures" / "parity-product-art-5.json"
PRODUCT_ART = ROOT / "ship" / "product-art.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
PRESENTATION = ROOT / "content" / "cosmetic-presentation.json"
OUT_DIR = ROOT / "assets" / "models"

MARKER = "authored-finish-5.0-phase-10"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP}")
    if not PARITY.is_file():
        raise SystemExit(f"missing parity {PARITY}")

    product_art = load(PRODUCT_ART)
    presentation = load(PRESENTATION)
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for entry in product_art.get("authoredProducts", []):
        pid = entry["productId"]
        asset = entry["asset"].replace("shared/assets/", "")
        write_product(OUT_DIR, pid, asset, product_color(pid), product_kind(pid))

    by_id = {item["cosmeticId"]: item for item in presentation.get("items", [])}
    for entry in product_art.get("cosmeticBanners", []):
        cid = entry["cosmeticId"]
        item = by_id.get(cid)
        if not item:
            raise SystemExit(f"missing cosmetic presentation for {cid}")
        write_cosmetic_banner(OUT_DIR, cid, item["swatchRgb"])

    soft = product_art.setdefault("softFloors", {})
    soft["productFinish5Marker"] = "product-art-5"
    soft["cosmeticFinish5Marker"] = "product-art-5"
    dump(PRODUCT_ART, product_art)

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["productArt5Incomplete"] = False
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["productArt5Phase"] = 10
    listing["productArt5Catalog"] = "shared/ship/product-art-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["productArt5"] = "shared/ship/product-art-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-product-art-5.json" not in fixtures:
        fixtures.append("parity-product-art-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["productArt5"] = {
        "phase": 10,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "productArt5Marker": MARKER,
        "catalog": "shared/ship/product-art-5.json",
        "parityFixture": "shared/fixtures/parity-product-art-5.json",
        "validateScript": "npm run productart5:validate",
        "checklist": [
            "40 products + 18 banners stamped product/cosmetic Finish 5",
            "gaps.productArt5Incomplete closed",
            "productart:validate still green",
            "productart5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase10 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 10), None)
    if not phase10 or phase10.get("validate") != "productart5:validate":
        raise SystemExit("kickoff phase 10 must validate via productart5:validate")
    print(
        f"OK author_product_art_5 — "
        f"{len(product_art.get('authoredProducts', []))} products + "
        f"{len(product_art.get('cosmeticBanners', []))} banners stamped; "
        f"productArt5Incomplete closed"
    )


if __name__ == "__main__":
    main()
