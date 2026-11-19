#!/usr/bin/env python3
"""
Finish 4.0 Phase 15 — rival markets 8→12 + AI depth.

Adds mist/prism locals + two multi-harbor AI rivals, stamps aiProfile on all
rivals, and wires catalog-level adaptive / multi-rival pressure knobs.

Usage:
  python3 shared/tools/author_rivals_2.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "rival-markets-2.json"
PARITY = ROOT / "fixtures" / "parity-rival-markets-2.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
EN = ROOT / "i18n" / "content-strings.en.json"
ES = ROOT / "i18n" / "content-strings.es.json"
PT = ROOT / "i18n" / "content-strings.pt.json"
FR = ROOT / "i18n" / "content-strings.fr.json"
HT = ROOT / "i18n" / "content-strings.ht.json"
IT = ROOT / "i18n" / "content-strings.it.json"
CA = ROOT / "i18n" / "content-strings.ca.json"
RU = ROOT / "i18n" / "content-strings.ru.json"
CONTENT_STRINGS_KT = (
    ROOT.parent
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/ContentStrings.kt"
)

MARKER = "authored-finish-4.0-phase-15"

# Profiles for the original eight — AI depth without changing their harbors/SKUs.
LEGACY_PROFILES = {
    "rival.dockside_dolly": "siphon",
    "rival.moon_mariner": "undercut",
    "rival.obsidian_cart": "siphon",
    "rival.northlight_nook": "adaptive",
    "rival.marina_monger": "undercut",
    "rival.coral_crock": "siphon",
    "rival.storm_hawker": "adaptive",
    "rival.ember_emporium": "undercut",
}

NEW_RIVALS = [
    {
        "id": "rival.mist_monger",
        "name": "Mist Monger",
        "description": "Fog-bank monger siphoning braised fillets and stew bowls at Mist Cove.",
        "harbors": ["harbor.mist_cove"],
        "aggressionPermille": 490,
        "specialtyProducts": ["product.braised_fillet", "product.braise_stew"],
        "undercutPriceMultPermille": 875,
        "activeDayParts": ["dawn", "day", "dusk"],
        "aiProfile": "siphon",
    },
    {
        "id": "rival.prism_peddler",
        "name": "Prism Peddler",
        "description": "Shelf peddler undercutting glazed fillets and skewers at Prism Reach.",
        "harbors": ["harbor.prism_reach"],
        "aggressionPermille": 510,
        "specialtyProducts": ["product.glazed_fillet", "product.glaze_skewer"],
        "undercutPriceMultPermille": 860,
        "activeDayParts": ["day", "dusk", "night"],
        "aiProfile": "undercut",
    },
    {
        "id": "rival.fog_roamer",
        "name": "Fog Roamer",
        "description": "Roaming fog stall that hops Mist Cove and Prism Reach chasing braise/glaze trays.",
        "harbors": ["harbor.mist_cove", "harbor.prism_reach"],
        "aggressionPermille": 470,
        "specialtyProducts": ["product.braise_stew", "product.glaze_skewer"],
        "undercutPriceMultPermille": 890,
        "activeDayParts": ["dusk", "night"],
        "aiProfile": "roamer",
    },
    {
        "id": "rival.shelf_syndicate",
        "name": "Shelf Syndicate",
        "description": "Adaptive syndicate working mist and prism wholesale cartons after a beat.",
        "harbors": ["harbor.mist_cove", "harbor.prism_reach"],
        "aggressionPermille": 520,
        "specialtyProducts": ["product.braise_carton", "product.glaze_carton"],
        "undercutPriceMultPermille": 850,
        "activeDayParts": ["dawn", "day"],
        "aiProfile": "adaptive",
    },
]

AI_CATALOG = {
    "adaptiveAggressionBoostPermille": 120,
    "multiRivalPressureExtraMultPermille": 900,
}

I18N = {
    "en": {r["id"]: r["name"] for r in NEW_RIVALS},
    "es": {
        "rival.mist_monger": "Mercader de niebla",
        "rival.prism_peddler": "Vendedor prisma",
        "rival.fog_roamer": "Errante de niebla",
        "rival.shelf_syndicate": "Sindicato del estante",
    },
    "pt": {
        "rival.mist_monger": "Mongueiro da névoa",
        "rival.prism_peddler": "Mascate prisma",
        "rival.fog_roamer": "Errante da névoa",
        "rival.shelf_syndicate": "Sindicato da prateleira",
    },
}


def dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_content_strings_kt() -> None:
    if not CONTENT_STRINGS_KT.is_file():
        return
    text = CONTENT_STRINGS_KT.read_text(encoding="utf-8")
    locale_for = {"EN": I18N["en"], "ES": I18N["es"], "PT": I18N["pt"]}

    def patch_map(src: str, map_name: str, locale_keys: dict[str, str]) -> str:
        if map_name == "PT":
            pattern = rf"(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val bundles)"
        else:
            pattern = rf"(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val )"
        m = re.search(pattern, src, re.S)
        if not m:
            raise SystemExit(f"ContentStrings.kt missing {map_name}")
        body = m.group(2)
        pairs = re.findall(r'"([^"]+)" to "((?:\\.|[^"\\])*)"', body)
        merged = {k: v for k, v in pairs}
        changed = False
        for k, v in locale_keys.items():
            esc = v.replace("\\", "\\\\").replace('"', '\\"')
            if k not in merged:
                merged[k] = esc
                changed = True
        if not changed:
            return src
        lines = [f'        "{k}" to "{merged[k]}",' for k in sorted(merged)]
        new_body = "\n" + "\n".join(lines)
        return src[: m.start(2)] + new_body + src[m.end(2) :]

    for name in ("EN", "ES", "PT"):
        text = patch_map(text, name, locale_for[name])
    CONTENT_STRINGS_KT.write_text(text, encoding="utf-8")


def write_ship(data: dict) -> None:
    rivals = data["rivalMarkets"]["rivals"]
    new_ids = [r["id"] for r in NEW_RIVALS]
    catalog = {
        "phase": 15,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.rival_markets_2.v1",
        "description": (
            "Finish 4.0 Phase 15 — raise rival markets to ≥12 covering mist/prism, "
            "and deepen rival AI (profiles, adaptive aggression, multi-rival pressure). "
            "Schema stays 24 / content 3.0.0."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "rivalCount": 12,
        "rivalMarkets2Marker": MARKER,
        "stats": [
            "stat.rival_sales_stolen",
            "stat.rival_undercuts",
            "stat.rival_beats",
        ],
        "aiProfiles": ["siphon", "undercut", "adaptive", "roamer"],
        "aiCatalog": AI_CATALOG,
        "rivalIds": [r["id"] for r in rivals],
        "newRivalIds": new_ids,
        "extendsRivalMarkets": "shared/ship/rival-markets.json",
        "parityFixture": "shared/fixtures/parity-rival-markets-2.json",
        "authorTool": "shared/tools/author_rivals_2.py",
        "validateScript": "npm run rivals2:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "checklist": [
            "≥12 rivals covering all 10 harbors including mist_cove + prism_reach",
            "aiProfile stamped on every rival; catalog adaptive/multi-rival knobs wired",
            "RivalMarketSystem TS + Kotlin apply AI depth (adaptive aggression, multi pressure)",
            "Finish 3.0 rivalmarkets:validate soft ≥8 floors still green",
            "parity-rival-markets-2 + rivals2:validate green",
            "CI runs rivals2:validate",
            "kickoff baseline.rivalMarkets = 12",
            "schema stays 24 / content 3.0.0",
        ],
        "preflightGates": [
            "shared/ship/rival-markets-2.json",
            "shared/fixtures/parity-rival-markets-2.json",
            "shared/ship/rival-markets.json",
            "shared/content/content-pack.json",
            "shared/tools/author_rivals_2.py",
            "web/src/ship/rivalMarkets2.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalMarkets2.kt",
            "web/scripts/validate-rival-markets-2.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/customers/RivalMarketSystem.kt",
            "web/src/engine/systems.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixtures.parity_rival_markets_2.v1",
        "rivalMarkets2Marker": MARKER,
        "phase": 15,
        "plan": "30_finish_4.0",
        "description": (
            "Finish 4.0 Phase 15: mist dawn activates Mist Monger + Shelf Syndicate; "
            "multi-rival pressure applies AI depth spawn mult; stocking beats mist monger."
        ),
        "harborId": "harbor.mist_cove",
        "seed": 1515,
        "setup": {
            "coins": 300,
            "advanceTicks": 80,
            "completedQuests": ["quest.mist_cove_landing"],
        },
        "expectActive": {
            "rivalIds": ["rival.mist_monger", "rival.shelf_syndicate"],
            "pressureWhenEmpty": True,
            "multiRivalPressure": True,
        },
        "stockAndSell": {
            "counterId": "counter.mist_1",
            "productId": "product.braised_fillet",
            "quantity": 4,
            "expectBeatRivalId": "rival.mist_monger",
        },
        "expectFinal": {
            "rivalCount": 12,
            "schemaVersion": 24,
            "contentVersion": "3.0.0",
            "aiProfilesPresent": True,
            "gates": [
                "rivals_12",
                "ai_depth",
                "harbors_covered",
                "kickoff_rivals_met",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["baseline"]["rivalMarkets"] = len(data["rivalMarkets"]["rivals"])
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["quotas"]["rivalMarkets"] = max(dod.get("quotas", {}).get("rivalMarkets", 0), 12)
    dod["notes"] = (
        "Finish 4.0 Phase 15 rivals-2 complete (12 rival markets + AI depth); "
        "Phases 1–14 remain green. Frozen 3.0.0 / schema 24. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 15,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "rivalMarkets2Marker": MARKER,
        "catalog": "shared/ship/rival-markets-2.json",
        "parityFixture": "shared/fixtures/parity-rival-markets-2.json",
        "validateScript": "npm run rivals2:validate",
        "checklist": [
            "≥12 rivals covering all harbors",
            "AI profiles + adaptive/multi-rival pressure knobs",
            "RivalMarketSystem TS/Kotlin AI depth",
            "kickoff baseline.rivalMarkets = 12",
            "rivals2:validate green in CI",
        ],
    }
    if "rivalMarkets2" not in dod:
        out = {}
        for k, v in dod.items():
            if k == "rivalMarkets":
                out["rivalMarkets2"] = block
            out[k] = v
        if "rivalMarkets2" not in out:
            out["rivalMarkets2"] = block
        dod = out
    else:
        dod["rivalMarkets2"] = block
    dump(DOD, dod)


def main() -> None:
    data = json.loads(PACK.read_text(encoding="utf-8"))
    rm = data["rivalMarkets"]
    rm.update(AI_CATALOG)

    by_id = {r["id"]: r for r in rm["rivals"]}
    for rid, profile in LEGACY_PROFILES.items():
        if rid in by_id:
            by_id[rid]["aiProfile"] = profile
    for rival in NEW_RIVALS:
        by_id[rival["id"]] = rival
    # Preserve legacy order then append new.
    ordered = []
    seen = set()
    for r in rm["rivals"]:
        ordered.append(by_id[r["id"]])
        seen.add(r["id"])
    for rival in NEW_RIVALS:
        if rival["id"] not in seen:
            ordered.append(rival)
    rm["rivals"] = ordered

    # Validate refs.
    product_ids = {p["id"] for p in data["products"]}
    harbor_ids = {h["id"] for h in data["harbors"]}
    day_parts = {p["id"] for p in data["ecology"]["parts"]}
    for rival in rm["rivals"]:
        assert set(rival["harbors"]) <= harbor_ids, rival["id"]
        assert set(rival["specialtyProducts"]) <= product_ids, rival["id"]
        assert set(rival["activeDayParts"]) <= day_parts, rival["id"]
        assert rival.get("aiProfile") in ("siphon", "undercut", "adaptive", "roamer"), rival["id"]

    # Ensure mist/prism/sunrise counters list Phase 15 specialty SKUs.
    specialty_by_harbor = {
        "harbor.mist_cove": [
            "product.braised_fillet",
            "product.braise_stew",
            "product.braise_carton",
            "product.glaze_skewer",
            "product.glaze_carton",
        ],
        "harbor.prism_reach": [
            "product.glazed_fillet",
            "product.glaze_skewer",
            "product.glaze_carton",
            "product.braise_stew",
            "product.braise_carton",
        ],
    }
    for h in data["harbors"]:
        add = specialty_by_harbor.get(h["id"])
        if not add:
            continue
        for c in h.get("counters", []):
            kind = c.get("kind", "retail")
            prods = c.setdefault("products", [])
            for item in add:
                wholesale = "carton" in item
                if wholesale and kind != "wholesale":
                    continue
                if not wholesale and kind == "wholesale":
                    continue
                if item not in prods:
                    prods.append(item)

    dump(PACK, data)

    for locale, path in (("en", EN), ("es", ES), ("pt", PT)):
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    upsert_content_strings_kt()
    write_ship(data)
    update_kickoff_dod(data)

    covered = {h for r in rm["rivals"] for h in r["harbors"]}
    print(
        f"OK Phase 15 rivals-2: rivals={len(rm['rivals'])} "
        f"covered={len(covered)}/{len(harbor_ids)} "
        f"aiBoost={rm['adaptiveAggressionBoostPermille']} "
        f"multiExtra={rm['multiRivalPressureExtraMultPermille']}"
    )


if __name__ == "__main__":
    main()
