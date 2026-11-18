#!/usr/bin/env python3
"""
Finish 4.0 Phase 18 — cosmetics/IAP 12→18 power-neutral.

Usage:
  python3 shared/tools/author_cosmetics_4.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
ENTITLEMENTS = ROOT / "billing" / "entitlements.json"
PRESENTATION = ROOT / "content" / "cosmetic-presentation.json"
PRODUCT_ART = ROOT / "ship" / "product-art.json"
SUPPORT = ROOT / "ops" / "support-runbook.json"
SHIP = ROOT / "ship" / "cosmetics-iap-4.json"
PARITY = ROOT / "fixtures" / "parity-cosmetics-iap-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
SYSTEMS_TS = REPO / "web/src/engine/systems.ts"
COSMETICS_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/CosmeticsIap.kt"
)
PRESENTATION_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/CosmeticPresentation.kt"
)

sys.path.insert(0, str(ROOT / "tools"))
from generate_fish_stubs import write_cosmetic_banner  # noqa: E402

MARKER = "authored-finish-4.0-phase-18"

NEW_COSMETICS = [
    {
        "id": "entitlement.cosmetic.mist_bunting",
        "sku": "fish.cosmetic.mist_bunting",
        "androidProductId": "fish_cosmetic_mist_bunting",
        "webProductId": "fish.cosmetic.mist_bunting",
        "grantsCosmetic": "banner.iap_mist_bunting",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Mist bunting",
        "description": "Mist Cove lantern bunting. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [150, 175, 190],
    },
    {
        "id": "entitlement.cosmetic.prism_pennant",
        "sku": "fish.cosmetic.prism_pennant",
        "androidProductId": "fish_cosmetic_prism_pennant",
        "webProductId": "fish.cosmetic.prism_pennant",
        "grantsCosmetic": "banner.iap_prism_pennant",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Prism pennant",
        "description": "Prism Shelf light pennant. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [180, 120, 220],
    },
    {
        "id": "entitlement.cosmetic.plaza_flag",
        "sku": "fish.cosmetic.plaza_flag",
        "androidProductId": "fish_cosmetic_plaza_flag",
        "webProductId": "fish.cosmetic.plaza_flag",
        "grantsCosmetic": "banner.iap_plaza_flag",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Plaza flag",
        "description": "Plaza market day flag. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [210, 150, 70],
    },
    {
        "id": "entitlement.cosmetic.rime_streamer",
        "sku": "fish.cosmetic.rime_streamer",
        "androidProductId": "fish_cosmetic_rime_streamer",
        "webProductId": "fish.cosmetic.rime_streamer",
        "grantsCosmetic": "banner.iap_rime_streamer",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Rime streamer",
        "description": "Rime Harbor ice streamers. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [170, 210, 230],
    },
    {
        "id": "entitlement.cosmetic.brine_ribbon",
        "sku": "fish.cosmetic.brine_ribbon",
        "androidProductId": "fish_cosmetic_brine_ribbon",
        "webProductId": "fish.cosmetic.brine_ribbon",
        "grantsCosmetic": "banner.iap_brine_ribbon",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Brine ribbon",
        "description": "Brine shelf salt ribbon. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [90, 150, 140],
    },
    {
        "id": "entitlement.cosmetic.aurora_crest",
        "sku": "fish.cosmetic.aurora_crest",
        "androidProductId": "fish_cosmetic_aurora_crest",
        "webProductId": "fish.cosmetic.aurora_crest",
        "grantsCosmetic": "banner.iap_aurora_crest",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Aurora crest",
        "description": "Aurora vigil crest plaque. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [100, 180, 160],
    },
]


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_by_id(items: list, new_items: list, key: str = "id") -> None:
    by_id = {item[key]: i for i, item in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def entitlement_row(c: dict) -> dict:
    return {k: c[k] for k in (
        "id", "sku", "androidProductId", "webProductId", "grantsCosmetic",
        "type", "powerNeutral", "title", "description",
    )}


def presentation_row(c: dict) -> dict:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    return {
        "cosmeticId": c["grantsCosmetic"],
        "sku": c["sku"],
        "title": c["title"],
        "swatchRgb": c["swatchRgb"],
        "source": "iap",
        "powerNeutral": True,
        "meshAsset": f"models/cosmetic_banner_{short}.glb",
        "minCosmeticArtNodes": 4,
    }


def banner_asset_row(c: dict) -> dict:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    return {
        "cosmeticId": c["grantsCosmetic"],
        "asset": f"shared/assets/models/cosmetic_banner_{short}.glb",
    }


def sku_kt_block(c: dict) -> str:
    return f'''        Sku(
            id = "{c["id"]}",
            sku = "{c["sku"]}",
            androidProductId = "{c["androidProductId"]}",
            webProductId = "{c["webProductId"]}",
            grantsCosmetic = "{c["grantsCosmetic"]}",
            title = "{c["title"]}",
            description = "{c["description"]}",
        ),'''


def sku_ts_block(c: dict) -> str:
    return f'''    {{
      id: "{c["id"]}",
      sku: "{c["sku"]}",
      webProductId: "{c["webProductId"]}",
      androidProductId: "{c["androidProductId"]}",
      grantsCosmetic: "{c["grantsCosmetic"]}",
      title: "{c["title"]}",
      description: "{c["description"]}",
    }},'''


def presentation_kt_item(c: dict) -> str:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    r, g, b = c["swatchRgb"]
    return (
        f'        Item("{c["grantsCosmetic"]}", "{c["sku"]}", "{c["title"]}", '
        f'intArrayOf({r}, {g}, {b}), "iap", "models/cosmetic_banner_{short}.glb"),'
    )


def patch_catalog_list(path: Path, marker_end: str, new_blocks: list[str], after_last: str) -> None:
    """Insert new blocks before marker_end if any id/sku not already present."""
    text = path.read_text(encoding="utf-8")
    missing = [b for b in new_blocks if all(tok not in text for tok in re.findall(r'"(?:entitlement|banner|fish)\.[^"]+"', b)[:1] or [b])]
    # Prefer presence check by grantsCosmetic / sku embedded in each block.
    to_add = []
    for c, block in zip(NEW_COSMETICS, new_blocks):
        if c["grantsCosmetic"] not in text and c["sku"] not in text:
            to_add.append(block)
    if not to_add:
        return
    if marker_end not in text:
        raise SystemExit(f"{path}: missing marker {marker_end!r}")
    insert = "\n".join(to_add) + "\n"
    # Insert before after_last occurrence of moonlit block end / list close.
    idx = text.find(after_last)
    if idx < 0:
        raise SystemExit(f"{path}: missing anchor {after_last!r}")
    # Find end of moonlit entry (next closing of list element)
    # Insert after the moonlit Sku/object that contains after_last.
    # Place before the list terminator that follows moonlit.
    term = marker_end
    term_idx = text.find(term, idx)
    if term_idx < 0:
        raise SystemExit(f"{path}: terminator not after anchor")
    text = text[:term_idx] + insert + text[term_idx:]
    path.write_text(text, encoding="utf-8")


def patch_cosmetics_iap_kt() -> None:
    text = COSMETICS_KT.read_text(encoding="utf-8")
    blocks = [sku_kt_block(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["sku"] not in text]
    if not to_add:
        return
    anchor = 'grantsCosmetic = "banner.iap_moonlit_bunting"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticsIap.kt missing moonlit anchor")
    close = text.find(")", idx)
    # end of Sku( ... ),
    comma = text.find(",", close)
    insert_at = comma + 1
    text = text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:]
    COSMETICS_KT.write_text(text, encoding="utf-8")


def patch_systems_ts() -> None:
    text = SYSTEMS_TS.read_text(encoding="utf-8")
    blocks = [sku_ts_block(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["sku"] not in text]
    if not to_add:
        return
    anchor = 'grantsCosmetic: "banner.iap_moonlit_bunting"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("systems.ts missing moonlit anchor")
    # end of object: find closing `},` after description line
    close = text.find("},", idx)
    insert_at = close + 2
    text = text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:]
    SYSTEMS_TS.write_text(text, encoding="utf-8")


def patch_presentation_kt() -> None:
    text = PRESENTATION_KT.read_text(encoding="utf-8")
    blocks = [presentation_kt_item(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["grantsCosmetic"] not in text]
    if not to_add:
        return
    anchor = 'Item("banner.iap_moonlit_bunting"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticPresentation.kt missing moonlit anchor")
    # Insert after the full moonlit Item(...) line terminator.
    end = text.find("\n", text.find("),", idx))
    if end < 0:
        raise SystemExit("CosmeticPresentation.kt moonlit line terminator missing")
    text = text[:end] + "\n" + "\n".join(to_add) + text[end:]
    PRESENTATION_KT.write_text(text, encoding="utf-8")


def write_ship(cosmetics: list) -> None:
    catalog = {
        "phase": 18,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.cosmetics_iap_4.v1",
        "description": (
            "Finish 4.0 Phase 18 — raise power-neutral IAP cosmetics from 12→18 with authored "
            "banner meshes + presentation/entitlement/billing parity. Schema stays 25 / content 3.0.0."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 25,
        "cosmetics4Marker": MARKER,
        "cosmeticsMin": 18,
        "newCosmeticIds": [c["grantsCosmetic"] for c in NEW_COSMETICS],
        "newSkus": [c["sku"] for c in NEW_COSMETICS],
        "powerNeutralRequired": True,
        "extendsProductArt": "shared/ship/product-art.json",
        "entitlements": "shared/billing/entitlements.json",
        "presentation": "shared/content/cosmetic-presentation.json",
        "parityFixture": "shared/fixtures/parity-cosmetics-iap-4.json",
        "authorTool": "shared/tools/author_cosmetics_4.py",
        "validateScript": "npm run cosmetics4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "checklist": [
            "≥18 power-neutral IAP cosmetics in entitlements + CosmeticsIapSystem",
            "cosmetic-presentation items + authored banner GLBs for all 18",
            "product-art cosmeticBannerTarget ≥18",
            "support-runbook restore.skus includes all cosmetic SKUs",
            "kickoff baseline.cosmetics=18 and contentFloorsShort=false",
            "cosmetics:validate + cosmetics4:validate green",
            "schema stays 25 / content 3.0.0",
        ],
        "preflightGates": [
            "shared/ship/cosmetics-iap-4.json",
            "shared/fixtures/parity-cosmetics-iap-4.json",
            "shared/billing/entitlements.json",
            "shared/content/cosmetic-presentation.json",
            "shared/ship/product-art.json",
            "shared/tools/author_cosmetics_4.py",
            "web/src/ship/cosmetics4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Cosmetics4.kt",
            "web/scripts/validate-cosmetics-4.ts",
        ],
        "measured": {"cosmetics": len(cosmetics)},
    }
    dump(SHIP, catalog)

    sample = NEW_COSMETICS[0]
    parity = {
        "schema": "fish.fixture.parity_cosmetics_iap_4.v1",
        "cosmetics4Marker": MARKER,
        "phase": 18,
        "plan": "30_finish_4.0",
        "description": (
            "Finish 4.0 Phase 18: grant mist_bunting IAP cosmetic; assert power-neutral "
            "and catalog size ≥18."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 1818,
        "sampleSku": sample["sku"],
        "sampleCosmeticId": sample["grantsCosmetic"],
        "expect": {
            "cosmeticsMin": 18,
            "powerNeutral": True,
            "schemaVersion": 25,
            "contentVersion": "3.0.0",
            "gates": [
                "cosmetics_18",
                "power_neutral",
                "banner_meshes",
                "kickoff_floors",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod(cosmetics_count: int) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["baseline"]["cosmetics"] = cosmetics_count
    kick["gaps"]["contentFloorsShort"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["quotas"]["cosmetics"] = max(dod.get("quotas", {}).get("cosmetics", 0), 18)
    dod["notes"] = (
        "Finish 4.0 Phase 18 cosmetics-iap-4 complete (cosmetics≥18 power-neutral); "
        "Phases 1–17 remain green. Content stays 3.0.0 / schema 25. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 18,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "cosmetics4Marker": MARKER,
        "catalog": "shared/ship/cosmetics-iap-4.json",
        "parityFixture": "shared/fixtures/parity-cosmetics-iap-4.json",
        "validateScript": "npm run cosmetics4:validate",
        "checklist": [
            "≥18 power-neutral cosmetics",
            "banner meshes + presentation parity",
            "kickoff cosmetics=18 / contentFloorsShort=false",
            "cosmetics4:validate green in CI",
        ],
    }
    if "cosmetics4" not in dod:
        out = {}
        for k, v in dod.items():
            if k == "endgame2":
                out[k] = v
                out["cosmetics4"] = block
            else:
                out[k] = v
        if "cosmetics4" not in out:
            out["cosmetics4"] = block
        dod = out
    else:
        dod["cosmetics4"] = block
    dump(DOD, dod)


def main() -> None:
    ent = json.loads(ENTITLEMENTS.read_text(encoding="utf-8"))
    upsert_by_id(ent["cosmetics"], [entitlement_row(c) for c in NEW_COSMETICS])
    dump(ENTITLEMENTS, ent)

    pres = json.loads(PRESENTATION.read_text(encoding="utf-8"))
    upsert_by_id(pres["items"], [presentation_row(c) for c in NEW_COSMETICS], key="cosmeticId")
    dump(PRESENTATION, pres)

    product = json.loads(PRODUCT_ART.read_text(encoding="utf-8"))
    product["cosmeticBannerTarget"] = max(int(product.get("cosmeticBannerTarget", 0)), 18)
    upsert_by_id(product["cosmeticBanners"], [banner_asset_row(c) for c in NEW_COSMETICS], key="cosmeticId")
    product["description"] = (
        "Finish 4.0 Phase 10/13/18 — product/cosmetic art presentation. Authors multi-part "
        f"ProductArt meshes for all products, authored cosmetic banner GLBs for "
        f"{len(product['cosmeticBanners'])} IAP banners, and counter tray presentation depth. "
        "Schema stays 25 / content 3.0.0."
    )
    dump(PRODUCT_ART, product)

    support = json.loads(SUPPORT.read_text(encoding="utf-8"))
    skus = support.setdefault("restore", {}).setdefault("skus", [])
    for c in NEW_COSMETICS:
        if c["sku"] not in skus:
            skus.append(c["sku"])
    dump(SUPPORT, support)

    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    for c in NEW_COSMETICS:
        write_cosmetic_banner(out_dir, c["grantsCosmetic"], c["swatchRgb"])

    patch_cosmetics_iap_kt()
    patch_systems_ts()
    patch_presentation_kt()

    write_ship(ent["cosmetics"])
    update_kickoff_dod(len(ent["cosmetics"]))

    print(
        f"OK Phase 18 cosmetics-iap-4: cosmetics={len(ent['cosmetics'])} "
        f"new={len(NEW_COSMETICS)} banners={len(product['cosmeticBanners'])}"
    )


if __name__ == "__main__":
    main()
