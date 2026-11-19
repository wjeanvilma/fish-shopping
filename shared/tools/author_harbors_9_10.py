#!/usr/bin/env python3
"""
Finish 4.0 Phase 12 — author harbors 9–10 (Mist Cove, Prism Reach) with
travel/prestige gates, landing quests, galleries, themes, and ship catalogs.

Usage:
  python3 shared/tools/author_harbors_9_10.py
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "harbors-9-10.json"
PARITY = ROOT / "fixtures" / "parity-harbors-9-10.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
HARBOR_ART = ROOT / "ship" / "harbor-art-pass.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LICENSES = ROOT / "store" / "licenses.json"
I18N = {
    "en": ROOT / "i18n" / "content-strings.en.json",
    "es": ROOT / "i18n" / "content-strings.es.json",
    "pt": ROOT / "i18n" / "content-strings.pt.json",
    "fr": ROOT / "i18n" / "content-strings.fr.json",
    "ht": ROOT / "i18n" / "content-strings.ht.json",
    "it": ROOT / "i18n" / "content-strings.it.json",
    "ca": ROOT / "i18n" / "content-strings.ca.json",
    "ru": ROOT / "i18n" / "content-strings.ru.json"
}

MIST = {
    "id": "harbor.mist_cove",
    "name": "Mist Cove",
    "clone_from": "harbor.moon_cove",
    "prefix_from": "cove",
    "prefix_to": "mist",
    "requires": ["prestige.eight_harbors"],
    "specialization": {
        "id": "spec.mist_banks",
        "name": "Mist banks",
        "description": "Fog-bank shelves draw tourists and rare softwater catches.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 55,
        "kindSpawnMultPermille": {"tourist": 1300, "premium": 1150, "critic": 1100},
    },
    "landingQuest": "quest.mist_cove_landing",
    "prestigeUnlock": "prestige.nine_harbors",
    "gallery": "gallery.mist_cove",
    "curator": "prestige.mist_curator",
    "banner": "banner.nine_harbors",
    "museumBanner": "banner.mist_museum",
    "blockout": "shared/assets/models/mist_cove_blockout.glb",
    "theme": "mist",
    "species": [
        "species.veil_skate",
        "species.glass_goby",
        "species.frost_smelt",
        "species.lantern_shad",
        "species.prism_shad",
        "species.aurora_cod",
        "species.harbor_herring",
        "species.moon_flounder",
        "species.squall_smelt",
        "species.gale_herring",
        "species.cedar_smelt",
    ],
}

PRISM = {
    "id": "harbor.prism_reach",
    "name": "Prism Reach",
    "clone_from": "harbor.northlight_harbor",
    "prefix_from": "nl",
    "prefix_to": "pr",
    "requires": ["prestige.nine_harbors"],
    "specialization": {
        "id": "spec.prism_shelf",
        "name": "Prism shelf",
        "description": "Refracted shelf light pulls critics and premium tastings.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 65,
        "kindSpawnMultPermille": {"critic": 1350, "premium": 1280, "tourist": 1100},
    },
    "landingQuest": "quest.prism_reach_landing",
    "prestigeUnlock": "prestige.ten_harbors",
    "gallery": "gallery.prism_reach",
    "curator": "prestige.prism_curator",
    "banner": "banner.ten_harbors",
    "museumBanner": "banner.prism_museum",
    "blockout": "shared/assets/models/prism_reach_blockout.glb",
    "theme": "prism",
    "species": [
        "species.prism_lanternfish",
        "species.prism_squall",
        "species.prism_goby",
        "species.prism_gale",
        "species.aurora_jack",
        "species.aurora_icefish",
        "species.gilt_cedar",
        "species.opal_blenny",
        "species.ruby_hawk",
        "species.plaza_tuna",
        "species.frost_jack",
    ],
}

I18N_STRINGS = {
    "en": {
        "harbor.mist_cove": "Mist Cove",
        "harbor.prism_reach": "Prism Reach",
        "quest.mist_cove_landing": "Mist Cove landing",
        "quest.prism_reach_landing": "Prism Reach landing",
        "prestige.nine_harbors": "Nine Harbors",
        "prestige.ten_harbors": "Ten Harbors",
        "prestige.mist_curator": "Mist Curator",
        "prestige.prism_curator": "Prism Curator",
        "gallery.mist_cove": "Mist Cove gallery",
        "gallery.prism_reach": "Prism Reach gallery",
        "spec.mist_banks": "Mist banks",
        "spec.prism_shelf": "Prism shelf",
    },
    "es": {
        "harbor.mist_cove": "Cala de la Niebla",
        "harbor.prism_reach": "Alcance Prisma",
        "quest.mist_cove_landing": "Desembarco en Cala de la Niebla",
        "quest.prism_reach_landing": "Desembarco en Alcance Prisma",
        "prestige.nine_harbors": "Nueve Puertos",
        "prestige.ten_harbors": "Diez Puertos",
        "prestige.mist_curator": "Curador de Niebla",
        "prestige.prism_curator": "Curador Prisma",
        "gallery.mist_cove": "Galería Cala de la Niebla",
        "gallery.prism_reach": "Galería Alcance Prisma",
        "spec.mist_banks": "Bancos de niebla",
        "spec.prism_shelf": "Estante prisma",
    },
    "pt": {
        "harbor.mist_cove": "Enseada da Névoa",
        "harbor.prism_reach": "Alcance Prisma",
        "quest.mist_cove_landing": "Desembarque na Enseada da Névoa",
        "quest.prism_reach_landing": "Desembarque no Alcance Prisma",
        "prestige.nine_harbors": "Nove Portos",
        "prestige.ten_harbors": "Dez Portos",
        "prestige.mist_curator": "Curador da Névoa",
        "prestige.prism_curator": "Curador Prisma",
        "gallery.mist_cove": "Galeria Enseada da Névoa",
        "gallery.prism_reach": "Galeria Alcance Prisma",
        "spec.mist_banks": "Bancos de névoa",
        "spec.prism_shelf": "Prateleira prisma",
    },
}


def load(path: Path):
    return json.loads(path.read_text())


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")


def rewrite_ids(obj, mapping: dict[str, str]):
    if isinstance(obj, dict):
        out = {}
        for k, v in obj.items():
            nk = mapping.get(k, k) if isinstance(k, str) else k
            out[nk] = rewrite_ids(v, mapping)
        return out
    if isinstance(obj, list):
        return [rewrite_ids(x, mapping) for x in obj]
    if isinstance(obj, str):
        return mapping.get(obj, obj)
    return obj


def collect_local_ids(harbor: dict) -> set[str]:
    ids: set[str] = set()

    def walk(o):
        if isinstance(o, dict):
            for k, v in o.items():
                if k in {"id", "zone", "inputZone", "outputZone", "footprint"} and isinstance(v, str):
                    ids.add(v)
                walk(v)
        elif isinstance(o, list):
            for x in o:
                walk(x)

    walk(harbor)
    return ids


def clone_harbor(pack: dict, spec: dict) -> dict:
    src = next(h for h in pack["harbors"] if h["id"] == spec["clone_from"])
    harbor = copy.deepcopy(src)
    local_ids = sorted(collect_local_ids(harbor))
    mapping: dict[str, str] = {spec["clone_from"]: spec["id"]}
    pf, pt = spec["prefix_from"], spec["prefix_to"]
    for lid in local_ids:
        if lid == spec["clone_from"]:
            continue
        # Rewrite prefix tokens inside dotted ids: zone.cove_end -> zone.mist_end
        parts = lid.split(".", 1)
        if len(parts) == 2:
            head, rest = parts
            if rest.startswith(pf + "_"):
                mapping[lid] = f"{head}.{pt}_{rest[len(pf) + 1:]}"
            elif rest == pf:
                mapping[lid] = f"{head}.{pt}"
            elif f"_{pf}_" in rest:
                mapping[lid] = f"{head}.{rest.replace(f'_{pf}_', f'_{pt}_')}"
            elif rest.endswith("_" + pf):
                mapping[lid] = f"{head}.{rest[: -len(pf)] + pt}"
        if "moon_cove" in lid:
            mapping[lid] = lid.replace("moon_cove", "mist_cove")
        if "northlight" in lid:
            mapping[lid] = lid.replace("northlight", "prism")

    harbor = rewrite_ids(harbor, mapping)
    harbor["id"] = spec["id"]
    harbor["name"] = spec["name"]
    harbor["requires"] = list(spec["requires"])
    harbor["specialization"] = copy.deepcopy(spec["specialization"])

    # Rebalance fishing spots onto the Phase 12 specialty pool; ensure ≥3 spots.
    species = list(spec["species"])
    while len(harbor["fishingSpots"]) < 3 and harbor["fishingSpots"]:
        extra = copy.deepcopy(harbor["fishingSpots"][0])
        # Prefer a non-primary fishing zone if present.
        fish_zones = [z["id"] for z in harbor["zones"] if z.get("kind") == "fishing"]
        used = {s.get("zone") for s in harbor["fishingSpots"]}
        unused = [z for z in fish_zones if z not in used]
        if unused:
            extra["zone"] = unused[0]
        else:
            # Synthesize a west dock fishing zone from the first fishing zone.
            base = next(z for z in harbor["zones"] if z["id"] == harbor["fishingSpots"][0]["zone"])
            synth = copy.deepcopy(base)
            synth["id"] = base["id"].rsplit("_", 1)[0] + "_west"
            width = base["maxX"] - base["minX"]
            synth["minX"] = base["minX"] - width - 500
            synth["maxX"] = base["minX"] - 500
            harbor["zones"].append(synth)
            extra["zone"] = synth["id"]
        harbor["fishingSpots"].append(extra)
    for i, spot in enumerate(harbor["fishingSpots"]):
        start = i % max(1, len(species) - 3)
        spot["species"] = species[start : start + 8] if start + 8 <= len(species) else species[:8]
        if len(spot["species"]) < 4:
            spot["species"] = species[: min(8, len(species))]
    return harbor


def upsert_quest(pack: dict, quest: dict, after_id: str) -> None:
    quests = pack["quests"]
    quests[:] = [q for q in quests if q["id"] != quest["id"]]
    idx = next(i for i, q in enumerate(quests) if q["id"] == after_id) + 1
    quests.insert(idx, quest)


def upsert_prestige(pack: dict, milestone: dict, after_id: str) -> None:
    ms = pack["prestige"]["milestones"]
    ms[:] = [m for m in ms if m["id"] != milestone["id"]]
    idx = next(i for i, m in enumerate(ms) if m["id"] == after_id) + 1
    ms.insert(idx, milestone)


def upsert_gallery(pack: dict, gallery: dict) -> None:
    sets = pack["trophies"]["sets"]
    sets[:] = [g for g in sets if g["id"] != gallery["id"]]
    sets.append(gallery)


def ensure_i18n() -> None:
    for locale, path in I18N.items():
        data = load(path)
        strings = data.setdefault("strings", {})
        for key, value in I18N_STRINGS[locale].items():
            strings[key] = value
        dump(path, data)


def update_kickoff() -> None:
    kick = load(KICKOFF)
    kick["baseline"]["harbors"] = 10
    kick["baseline"]["authoredHarbors"] = 10
    kick["baseline"]["quests"] = len(load(CONTENT)["quests"])
    kick["gaps"]["authoredHarborsRemaining"] = 0
    # Keep questsRemaining aligned to target 50.
    kick["gaps"]["questsRemaining"] = max(0, kick["gapTargets"]["questsMin"] - kick["baseline"]["quests"])
    dump(KICKOFF, kick)


def update_harbor_art(pack: dict) -> None:
    art = load(HARBOR_ART)
    by_id = {h["harborId"]: h for h in art["authoredHarbors"]}
    for spec in (MIST, PRISM):
        by_id[spec["id"]] = {
            "harborId": spec["id"],
            "theme": spec["theme"],
            "asset": spec["blockout"],
        }
    # Preserve original order then append new.
    ordered = []
    seen = set()
    for h in art["authoredHarbors"]:
        ordered.append(by_id[h["harborId"]])
        seen.add(h["harborId"])
    for hid in (MIST["id"], PRISM["id"]):
        if hid not in seen:
            ordered.append(by_id[hid])
    art["authoredHarbors"] = ordered
    art["authoredHarborMin"] = 10
    art["definitionOfDoneAuthoredHarbors"] = 10
    assets = []
    for h in pack["harbors"]:
        assets.append(f"{h['id'].split('.', 1)[1]}_blockout.glb")
    art["allBlockoutAssets"] = assets
    art["description"] = (
        "Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 — all "
        "10 harbor GLBs authored scenic theme sets beyond grey-box blockout; "
        "licenses + size budgets; web loads all 10 scenes."
    )
    dump(HARBOR_ART, art)


def update_dod() -> None:
    dod = load(DOD)
    dod["quotas"]["harbors"] = 10
    dod["quotas"]["authoredHarborScenes"] = 10
    dod["quotas"]["quests"] = max(dod["quotas"].get("quests", 0), len(load(CONTENT)["quests"]))
    dump(DOD, dod)


def update_licenses() -> None:
    lic = load(LICENSES)
    for rec in lic.get("records", []):
        if rec.get("id") == "harbor-authored-art":
            paths = set(rec.get("paths", []))
            paths.add(MIST["blockout"])
            paths.add(PRISM["blockout"])
            rec["paths"] = sorted(paths)
            break
    dump(LICENSES, lic)


def write_ship_catalog() -> None:
    catalog = {
        "phase": 12,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.harbors_9_10.v1",
        "description": (
            "Finish 4.0 Phase 12 — author harbors 9–10 (Mist Cove, Prism Reach) "
            "with layouts, specializations, nine/ten prestige circuit, landing "
            "quests, trophy galleries, and regenerated scenic blockouts. Schema stays 24."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "harborCount": 10,
        "newHarborCount": 2,
        "harbors910Marker": "authored-finish-4.0-phase-12",
        "newHarbors": [
            {
                "id": MIST["id"],
                "name": MIST["name"],
                "requires": MIST["requires"],
                "specialization": MIST["specialization"]["id"],
                "blockout": MIST["blockout"],
                "landingQuest": MIST["landingQuest"],
                "prestigeUnlock": MIST["prestigeUnlock"],
                "gallery": MIST["gallery"],
                "theme": MIST["theme"],
            },
            {
                "id": PRISM["id"],
                "name": PRISM["name"],
                "requires": PRISM["requires"],
                "specialization": PRISM["specialization"]["id"],
                "blockout": PRISM["blockout"],
                "landingQuest": PRISM["landingQuest"],
                "prestigeUnlock": PRISM["prestigeUnlock"],
                "gallery": PRISM["gallery"],
                "theme": PRISM["theme"],
            },
        ],
        "circuitPrestige": ["prestige.nine_harbors", "prestige.ten_harbors"],
        "travelFixture": "shared/fixtures/parity-harbors-9-10.json",
        "blockoutTool": "shared/tools/generate_blockout.py",
        "themesModule": "shared/tools/harbor_themes.py",
        "authorTool": "shared/tools/author_harbors_9_10.py",
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "definitionOfDoneQuota": 10,
        "validateScript": "npm run harbors910:validate",
        "checklist": [
            "content-pack has 10 harbors including mist_cove + prism_reach",
            "Blockouts regenerated for mist_cove + prism_reach GLBs",
            "Prestige nine/ten + landing quests + galleries/curators wired",
            "kickoff authoredHarbors=10 and authoredHarborsRemaining=0",
            "DoD quotas.harbors = 10",
            "parity-harbors-9-10 fixture + harbors910:validate green",
            "CI runs harbors910:validate",
        ],
        "preflightGates": [
            "shared/ship/harbors-9-10.json",
            "shared/fixtures/parity-harbors-9-10.json",
            "shared/assets/models/mist_cove_blockout.glb",
            "shared/assets/models/prism_reach_blockout.glb",
            "shared/tools/author_harbors_9_10.py",
            "web/src/ship/harbors910.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors910.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "name": "parity-harbors-9-10",
        "description": (
            "Finish 4.0 Phase 12: from eight-harbor prestige, travel Mist Cove → "
            "Prism Reach; landing quests + nine/ten prestige unlock."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "harbors910Marker": "authored-finish-4.0-phase-12",
        "harborId": "harbor.sunrise_pier",
        "seed": 41210,
        "setup": {
            "completedQuests": [
                "quest.busy_harbor",
                "quest.moon_crossing",
                "quest.obsidian_landing",
                "quest.northlight_landing",
                "quest.grand_marina_landing",
                "quest.coral_lagoon_landing",
                "quest.storm_quay_landing",
                "quest.ember_wharf_landing",
            ],
            "completedPrestige": [
                "prestige.twin_harbors",
                "prestige.triple_harbors",
                "prestige.quad_harbors",
                "prestige.five_harbors",
                "prestige.six_harbors",
                "prestige.seven_harbors",
                "prestige.eight_harbors",
            ],
            "unlockedCosmetics": [
                "banner.twin_harbors",
                "banner.triple_harbors",
                "banner.quad_harbors",
                "banner.five_harbors",
                "banner.six_harbors",
                "banner.seven_harbors",
                "banner.eight_harbors",
            ],
            "harborsTraveled": 8,
        },
        "travels": [
            {
                "harborId": MIST["id"],
                "requestId": "p12-mist-1",
                "expectQuest": MIST["landingQuest"],
                "expectPrestige": MIST["prestigeUnlock"],
                "expectBanner": MIST["banner"],
                "expectBlockout": "mist_cove_blockout.glb",
            },
            {
                "harborId": PRISM["id"],
                "requestId": "p12-prism-1",
                "expectQuest": PRISM["landingQuest"],
                "expectPrestige": PRISM["prestigeUnlock"],
                "expectBanner": PRISM["banner"],
                "expectBlockout": "prism_reach_blockout.glb",
            },
        ],
        "expectFinal": {
            "harborId": PRISM["id"],
            "harborsTraveled": 10,
            "specializationId": PRISM["specialization"]["id"],
            "blockoutAsset": "prism_reach_blockout.glb",
        },
    }
    dump(PARITY, parity)


def main() -> int:
    pack = load(CONTENT)
    existing = {h["id"] for h in pack["harbors"]}
    for spec in (MIST, PRISM):
        harbor = clone_harbor(pack, spec)
        pack["harbors"] = [h for h in pack["harbors"] if h["id"] != spec["id"]]
        pack["harbors"].append(harbor)

    # Landing quests after ember_wharf_landing; retarget perfect_line chain.
    upsert_quest(
        pack,
        {
            "id": MIST["landingQuest"],
            "name": "Mist Cove landing",
            "description": "Open the ninth harbor route and land at Mist Cove.",
            "requires": ["quest.ember_wharf_landing"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 9},
            "reward": {"coins": 300, "unlockUpgrades": []},
        },
        "quest.ember_wharf_landing",
    )
    upsert_quest(
        pack,
        {
            "id": PRISM["landingQuest"],
            "name": "Prism Reach landing",
            "description": "Open the tenth harbor route and land at Prism Reach.",
            "requires": [MIST["landingQuest"]],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 10},
            "reward": {"coins": 320, "unlockUpgrades": []},
        },
        MIST["landingQuest"],
    )
    for q in pack["quests"]:
        if q["id"] == "quest.perfect_line":
            q["requires"] = [PRISM["landingQuest"]]

    upsert_prestige(
        pack,
        {
            "id": "prestige.nine_harbors",
            "name": "Nine Harbors",
            "description": "Travel the nine-harbor circuit.",
            "requires": ["prestige.eight_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 9},
            "reward": {
                "coins": 425,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": MIST["banner"],
            },
        },
        "prestige.eight_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": "prestige.ten_harbors",
            "name": "Ten Harbors",
            "description": "Travel the ten-harbor circuit.",
            "requires": ["prestige.nine_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 10},
            "reward": {
                "coins": 450,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": PRISM["banner"],
            },
        },
        "prestige.nine_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": MIST["curator"],
            "name": "Mist Curator",
            "description": "Fill the Mist Cove trophy gallery.",
            "requires": ["prestige.nine_harbors"],
            "goal": {"stat": "stat.trophy_set_mist_cove", "atLeast": 1},
            "reward": {
                "coins": 350,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": MIST["museumBanner"],
            },
        },
        "prestige.ember_curator",
    )
    upsert_prestige(
        pack,
        {
            "id": PRISM["curator"],
            "name": "Prism Curator",
            "description": "Fill the Prism Reach trophy gallery.",
            "requires": ["prestige.ten_harbors"],
            "goal": {"stat": "stat.trophy_set_prism_reach", "atLeast": 1},
            "reward": {
                "coins": 360,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": PRISM["museumBanner"],
            },
        },
        MIST["curator"],
    )

    upsert_gallery(
        pack,
        {
            "id": MIST["gallery"],
            "name": "Mist Cove gallery",
            "description": "Mount the Mist Cove specialty fish.",
            "species": MIST["species"][:8],
            "completeStat": "stat.trophy_set_mist_cove",
        },
    )
    upsert_gallery(
        pack,
        {
            "id": PRISM["gallery"],
            "name": "Prism Reach gallery",
            "description": "Mount the Prism Reach specialty fish.",
            "species": PRISM["species"][:8],
            "completeStat": "stat.trophy_set_prism_reach",
        },
    )

    dump(CONTENT, pack)
    write_ship_catalog()
    ensure_i18n()
    update_kickoff()
    update_harbor_art(pack)
    update_dod()
    update_licenses()

    print(
        f"authored harbors={len(pack['harbors'])} quests={len(pack['quests'])} "
        f"new={[MIST['id'], PRISM['id']]} prior_existing={sorted(existing)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
