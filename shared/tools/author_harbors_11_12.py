#!/usr/bin/env python3
"""
Finish 5.0 Phase 14 — author harbors 11–12 (Aurora Inlet, Tideglass Bay) with
travel/prestige gates, landing quests, galleries, themes, and ship catalogs.

Usage:
  python3 shared/tools/author_harbors_11_12.py
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/harbors-11-12.json"
PARITY = ROOT / "shared/fixtures/parity-harbors-11-12.json"
KICKOFF = ROOT / "shared/ship/finish-5.0-kickoff.json"
HARBOR_ART = ROOT / "shared/ship/harbor-art-pass.json"
HARBOR_ART_5B = ROOT / "shared/ship/harbor-art-5b.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
LICENSES = ROOT / "shared/store/licenses.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"
I18N = {
    "en": ROOT / "shared/i18n/content-strings.en.json",
    "es": ROOT / "shared/i18n/content-strings.es.json",
    "pt": ROOT / "shared/i18n/content-strings.pt.json",
    "fr": ROOT / "shared/i18n/content-strings.fr.json",
    "ht": ROOT / "shared/i18n/content-strings.ht.json",
    "it": ROOT / "shared/i18n/content-strings.it.json",
    "ca": ROOT / "shared/i18n/content-strings.ca.json",
    "ru": ROOT / "shared/i18n/content-strings.ru.json",
}

MARKER = "authored-finish-5.0-phase-14"

AURORA = {
    "id": "harbor.aurora_inlet",
    "name": "Aurora Inlet",
    "clone_from": "harbor.mist_cove",
    "prefix_from": "mist",
    "prefix_to": "au",
    "requires": ["prestige.ten_harbors"],
    "specialization": {
        "id": "spec.aurora_shelf",
        "name": "Aurora shelf",
        "description": "Night-glow shelves draw critics and rare polar catches.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 70,
        "kindSpawnMultPermille": {"critic": 1320, "premium": 1220, "tourist": 1120},
    },
    "landingQuest": "quest.aurora_inlet_landing",
    "prestigeUnlock": "prestige.eleven_harbors",
    "gallery": "gallery.aurora_inlet",
    "curator": "prestige.aurora_curator",
    "banner": "banner.eleven_harbors",
    "museumBanner": "banner.aurora_museum",
    "blockout": "shared/assets/models/aurora_inlet_blockout.glb",
    "theme": "aurora",
    "species": [
        "species.aurora_cod",
        "species.aurora_jack",
        "species.aurora_icefish",
        "species.aurora_north",
        "species.north_smelt",
        "species.crystal_rime",
        "species.rime_herring",
        "species.frost_jack",
        "species.veil_shad",
        "species.prism_veil",
        "species.glass_goby",
    ],
}

TIDEGLASS = {
    "id": "harbor.tideglass_bay",
    "name": "Tideglass Bay",
    "clone_from": "harbor.prism_reach",
    "prefix_from": "pr",
    "prefix_to": "tg",
    "requires": ["prestige.eleven_harbors"],
    "specialization": {
        "id": "spec.tideglass_basin",
        "name": "Tideglass basin",
        "description": "Clear tide basins pull tourists and premium tastings.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 75,
        "kindSpawnMultPermille": {"tourist": 1350, "premium": 1280, "critic": 1180},
    },
    "landingQuest": "quest.tideglass_bay_landing",
    "prestigeUnlock": "prestige.twelve_harbors",
    "gallery": "gallery.tideglass_bay",
    "curator": "prestige.tideglass_curator",
    "banner": "banner.twelve_harbors",
    "museumBanner": "banner.tideglass_museum",
    "blockout": "shared/assets/models/tideglass_bay_blockout.glb",
    "theme": "tideglass",
    "species": [
        "species.glass_goby",
        "species.crystal_brine",
        "species.brine_goby",
        "species.crystal_smelt",
        "species.crystal_skater",
        "species.crystal_bream",
        "species.opal_shelf",
        "species.opal_blenny",
        "species.tide_bass",
        "species.tidepool_blenny",
        "species.prism_lantern",
    ],
}

I18N_STRINGS = {
    "en": {
        "harbor.aurora_inlet": "Aurora Inlet",
        "harbor.tideglass_bay": "Tideglass Bay",
        "quest.aurora_inlet_landing": "Aurora Inlet landing",
        "quest.tideglass_bay_landing": "Tideglass Bay landing",
        "prestige.eleven_harbors": "Eleven Harbors",
        "prestige.twelve_harbors": "Twelve Harbors",
        "prestige.aurora_curator": "Aurora Curator",
        "prestige.tideglass_curator": "Tideglass Curator",
        "gallery.aurora_inlet": "Aurora Inlet gallery",
        "gallery.tideglass_bay": "Tideglass Bay gallery",
        "spec.aurora_shelf": "Aurora shelf",
        "spec.tideglass_basin": "Tideglass basin",
    },
    "es": {
        "harbor.aurora_inlet": "Ensenada Aurora",
        "harbor.tideglass_bay": "Bahía Cristal de Marea",
        "quest.aurora_inlet_landing": "Desembarco en Ensenada Aurora",
        "quest.tideglass_bay_landing": "Desembarco en Bahía Cristal de Marea",
        "prestige.eleven_harbors": "Once Puertos",
        "prestige.twelve_harbors": "Doce Puertos",
        "prestige.aurora_curator": "Curador Aurora",
        "prestige.tideglass_curator": "Curador Cristal de Marea",
        "gallery.aurora_inlet": "Galería Ensenada Aurora",
        "gallery.tideglass_bay": "Galería Bahía Cristal de Marea",
        "spec.aurora_shelf": "Estante aurora",
        "spec.tideglass_basin": "Cuenca cristal de marea",
    },
    "pt": {
        "harbor.aurora_inlet": "Enseada Aurora",
        "harbor.tideglass_bay": "Baía Cristal de Maré",
        "quest.aurora_inlet_landing": "Desembarque na Enseada Aurora",
        "quest.tideglass_bay_landing": "Desembarque na Baía Cristal de Maré",
        "prestige.eleven_harbors": "Onze Portos",
        "prestige.twelve_harbors": "Doze Portos",
        "prestige.aurora_curator": "Curador Aurora",
        "prestige.tideglass_curator": "Curador Cristal de Maré",
        "gallery.aurora_inlet": "Galeria Enseada Aurora",
        "gallery.tideglass_bay": "Galeria Baía Cristal de Maré",
        "spec.aurora_shelf": "Prateleira aurora",
        "spec.tideglass_basin": "Bacia cristal de maré",
    },
    "fr": {
        "harbor.aurora_inlet": "Anse Aurore",
        "harbor.tideglass_bay": "Baie Marée de Verre",
        "quest.aurora_inlet_landing": "Accostage à Anse Aurore",
        "quest.tideglass_bay_landing": "Accostage à Baie Marée de Verre",
        "prestige.eleven_harbors": "Onze Ports",
        "prestige.twelve_harbors": "Douze Ports",
        "prestige.aurora_curator": "Conservateur Aurore",
        "prestige.tideglass_curator": "Conservateur Marée de Verre",
        "gallery.aurora_inlet": "Galerie Anse Aurore",
        "gallery.tideglass_bay": "Galerie Baie Marée de Verre",
        "spec.aurora_shelf": "Plateau aurore",
        "spec.tideglass_basin": "Bassin marée de verre",
    },
    "ht": {
        "harbor.aurora_inlet": "Anse Aurora",
        "harbor.tideglass_bay": "Bé Cristal Mare",
        "quest.aurora_inlet_landing": "Aterisaj nan Anse Aurora",
        "quest.tideglass_bay_landing": "Aterisaj nan Bé Cristal Mare",
        "prestige.eleven_harbors": "Onz Pò",
        "prestige.twelve_harbors": "Douz Pò",
        "prestige.aurora_curator": "Kiratè Aurora",
        "prestige.tideglass_curator": "Kiratè Cristal Mare",
        "gallery.aurora_inlet": "Galeri Anse Aurora",
        "gallery.tideglass_bay": "Galeri Bé Cristal Mare",
        "spec.aurora_shelf": "Etajè aurora",
        "spec.tideglass_basin": "Basen cristal mare",
    },
    "it": {
        "harbor.aurora_inlet": "Insenatura Aurora",
        "harbor.tideglass_bay": "Baia Vetro di Marea",
        "quest.aurora_inlet_landing": "Approdo a Insenatura Aurora",
        "quest.tideglass_bay_landing": "Approdo a Baia Vetro di Marea",
        "prestige.eleven_harbors": "Undici Porti",
        "prestige.twelve_harbors": "Dodici Porti",
        "prestige.aurora_curator": "Curatore Aurora",
        "prestige.tideglass_curator": "Curatore Vetro di Marea",
        "gallery.aurora_inlet": "Galleria Insenatura Aurora",
        "gallery.tideglass_bay": "Galleria Baia Vetro di Marea",
        "spec.aurora_shelf": "Piattaforma aurora",
        "spec.tideglass_basin": "Bacino vetro di marea",
    },
    "ca": {
        "harbor.aurora_inlet": "Cala Aurora",
        "harbor.tideglass_bay": "Badia Vidre de Marea",
        "quest.aurora_inlet_landing": "Desembarcament a Cala Aurora",
        "quest.tideglass_bay_landing": "Desembarcament a Badia Vidre de Marea",
        "prestige.eleven_harbors": "Onze Ports",
        "prestige.twelve_harbors": "Dotze Ports",
        "prestige.aurora_curator": "Conservador Aurora",
        "prestige.tideglass_curator": "Conservador Vidre de Marea",
        "gallery.aurora_inlet": "Galeria Cala Aurora",
        "gallery.tideglass_bay": "Galeria Badia Vidre de Marea",
        "spec.aurora_shelf": "Lleixa aurora",
        "spec.tideglass_basin": "Conca vidre de marea",
    },
    "ru": {
        "harbor.aurora_inlet": "Бухта Аврора",
        "harbor.tideglass_bay": "Залив Приливного Стекла",
        "quest.aurora_inlet_landing": "Высадка в Бухте Аврора",
        "quest.tideglass_bay_landing": "Высадка в Заливе Приливного Стекла",
        "prestige.eleven_harbors": "Одиннадцать гаваней",
        "prestige.twelve_harbors": "Двенадцать гаваней",
        "prestige.aurora_curator": "Куратор Авроры",
        "prestige.tideglass_curator": "Куратор Приливного Стекла",
        "gallery.aurora_inlet": "Галерея Бухты Аврора",
        "gallery.tideglass_bay": "Галерея Залива Приливного Стекла",
        "spec.aurora_shelf": "Шельф авроры",
        "spec.tideglass_basin": "Бассейн приливного стекла",
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
        if "mist_cove" in lid:
            mapping[lid] = lid.replace("mist_cove", "aurora_inlet")
        if "prism_reach" in lid:
            mapping[lid] = lid.replace("prism_reach", "tideglass_bay")
        if "prism" in lid and spec["id"] == TIDEGLASS["id"]:
            mapping.setdefault(lid, lid.replace("prism", "tideglass"))

    harbor = rewrite_ids(harbor, mapping)
    harbor["id"] = spec["id"]
    harbor["name"] = spec["name"]
    harbor["requires"] = list(spec["requires"])
    harbor["specialization"] = copy.deepcopy(spec["specialization"])

    species = list(spec["species"])
    while len(harbor["fishingSpots"]) < 3 and harbor["fishingSpots"]:
        extra = copy.deepcopy(harbor["fishingSpots"][0])
        fish_zones = [z["id"] for z in harbor["zones"] if z.get("kind") == "fishing"]
        used = {s.get("zone") for s in harbor["fishingSpots"]}
        unused = [z for z in fish_zones if z not in used]
        if unused:
            extra["zone"] = unused[0]
        else:
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
    pack = load(CONTENT)
    kick["baseline"]["harbors"] = 12
    kick["baseline"]["authoredHarbors"] = 12
    kick["baseline"]["quests"] = len(pack["quests"])
    kick["gaps"]["authoredHarborsRemaining"] = 0
    kick["gaps"]["questsRemaining"] = max(
        0, kick["gapTargets"]["questsMin"] - kick["baseline"]["quests"]
    )
    dump(KICKOFF, kick)


def update_harbor_art(pack: dict) -> None:
    art = load(HARBOR_ART)
    by_id = {h["harborId"]: h for h in art["authoredHarbors"]}
    for spec in (AURORA, TIDEGLASS):
        by_id[spec["id"]] = {
            "harborId": spec["id"],
            "theme": spec["theme"],
            "asset": spec["blockout"],
        }
    ordered = []
    seen = set()
    for h in art["authoredHarbors"]:
        ordered.append(by_id[h["harborId"]])
        seen.add(h["harborId"])
    for hid in (AURORA["id"], TIDEGLASS["id"]):
        if hid not in seen:
            ordered.append(by_id[hid])
    art["authoredHarbors"] = ordered
    art["authoredHarborMin"] = 12
    art["definitionOfDoneAuthoredHarbors"] = 12
    art["maxTotalAuthoredBytes"] = max(int(art.get("maxTotalAuthoredBytes") or 0), 14_000_000)
    assets = []
    for h in pack["harbors"]:
        assets.append(f"{h['id'].split('.', 1)[1]}_blockout.glb")
    art["allBlockoutAssets"] = assets
    art["description"] = (
        "Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 + "
        "Finish 5.0 Phase 14 — all 12 harbor GLBs authored scenic theme sets "
        "beyond grey-box blockout; licenses + size budgets; web loads all 12 scenes."
    )
    dump(HARBOR_ART, art)

    parity_art = ROOT / "shared/fixtures/parity-harbor-art-pass.json"
    if parity_art.is_file():
        pfx = load(parity_art)
        pfx["authoredHarborMin"] = 12
        pfx["description"] = (
            "Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 + "
            "Finish 5.0 Phase 14: all 12 authored scenic harbor art markers, themes, "
            "and byte budgets."
        )
        by_id = {h["harborId"]: h for h in pfx.get("expect", {}).get("harbors", [])}
        for spec in (AURORA, TIDEGLASS):
            by_id[spec["id"]] = {
                "harborId": spec["id"],
                "theme": spec["theme"],
                "asset": Path(spec["blockout"]).name,
                "minHarborArtNodes": 10,
            }
        ordered = []
        seen = set()
        for h in pfx.get("expect", {}).get("harbors", []):
            ordered.append(by_id[h["harborId"]])
            seen.add(h["harborId"])
        for hid in (AURORA["id"], TIDEGLASS["id"]):
            if hid not in seen:
                ordered.append(by_id[hid])
        pfx.setdefault("expect", {})["harbors"] = ordered
        dump(parity_art, pfx)

    if HARBOR_ART_5B.is_file():
        art5b = load(HARBOR_ART_5B)
        checklist = art5b.get("checklist", [])
        art5b["checklist"] = [
            (
                "authoredHarbors reaches 12 after Phase 14 harbors-11-12"
                if "authoredHarbors stays 10" in c
                else c
            )
            for c in checklist
        ]
        desc = art5b.get("description", "")
        art5b["description"] = desc.replace(
            "Harbors 11–12 content deferred to Phase 14; authoredHarbors stays 10.",
            "Harbors 11–12 landed in Phase 14; authoredHarbors is 12.",
        )
        dump(HARBOR_ART_5B, art5b)


def update_dod() -> None:
    dod = load(DOD)
    dod["quotas"]["harbors"] = 12
    dod["quotas"]["authoredHarborScenes"] = 12
    dod["harbors1112"] = {
        "phase": 14,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "harbors1112Marker": MARKER,
        "catalog": "shared/ship/harbors-11-12.json",
        "parityFixture": "shared/fixtures/parity-harbors-11-12.json",
        "validateScript": "npm run harbors1112:validate",
        "checklist": [
            "12 harbors including aurora_inlet + tideglass_bay",
            "prestige eleven/twelve + landing quests + galleries wired",
            "kickoff authoredHarborsRemaining = 0",
            "harbors1112:validate green in CI",
        ],
    }
    if "harborArt5b" in dod:
        dod["harborArt5b"]["checklist"] = [
            (
                "authoredHarbors reaches 12 after Phase 14"
                if "authoredHarbors stays 10" in c
                else c
            )
            for c in dod["harborArt5b"].get("checklist", [])
        ]
    dump(DOD, dod)


def update_licenses() -> None:
    lic = load(LICENSES)
    for rec in lic.get("records", []):
        if rec.get("id") == "harbor-authored-art":
            paths = set(rec.get("paths", []))
            paths.add(AURORA["blockout"])
            paths.add(TIDEGLASS["blockout"])
            rec["paths"] = sorted(paths)
            break
    dump(LICENSES, lic)


def update_listing_pin() -> None:
    listing = load(LISTING)
    listing["harbors1112Phase"] = 14
    listing["harbors1112Catalog"] = "shared/ship/harbors-11-12.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["harbors1112"] = "shared/ship/harbors-11-12.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-harbors-11-12.json" not in fixtures:
        fixtures.append("parity-harbors-11-12.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def write_ship_catalog() -> None:
    catalog = {
        "phase": 14,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.harbors_11_12.v1",
        "description": (
            "Finish 5.0 Phase 14 — author harbors 11–12 (Aurora Inlet, Tideglass Bay) "
            "with layouts, specializations, eleven/twelve prestige circuit, landing "
            "quests, trophy galleries, and regenerated scenic blockouts. Schema stays 25."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 25,
        "harborCount": 12,
        "newHarborCount": 2,
        "harbors1112Marker": MARKER,
        "newHarbors": [
            {
                "id": AURORA["id"],
                "name": AURORA["name"],
                "requires": AURORA["requires"],
                "specialization": AURORA["specialization"]["id"],
                "blockout": AURORA["blockout"],
                "landingQuest": AURORA["landingQuest"],
                "prestigeUnlock": AURORA["prestigeUnlock"],
                "gallery": AURORA["gallery"],
                "theme": AURORA["theme"],
            },
            {
                "id": TIDEGLASS["id"],
                "name": TIDEGLASS["name"],
                "requires": TIDEGLASS["requires"],
                "specialization": TIDEGLASS["specialization"]["id"],
                "blockout": TIDEGLASS["blockout"],
                "landingQuest": TIDEGLASS["landingQuest"],
                "prestigeUnlock": TIDEGLASS["prestigeUnlock"],
                "gallery": TIDEGLASS["gallery"],
                "theme": TIDEGLASS["theme"],
            },
        ],
        "circuitPrestige": ["prestige.eleven_harbors", "prestige.twelve_harbors"],
        "travelFixture": "shared/fixtures/parity-harbors-11-12.json",
        "blockoutTool": "shared/tools/generate_blockout.py",
        "themesModule": "shared/tools/harbor_themes.py",
        "authorTool": "shared/tools/author_harbors_11_12.py",
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "definitionOfDoneQuota": 12,
        "validateScript": "npm run harbors1112:validate",
        "checklist": [
            "content-pack has 12 harbors including aurora_inlet + tideglass_bay",
            "Blockouts regenerated for aurora_inlet + tideglass_bay GLBs",
            "Prestige eleven/twelve + landing quests + galleries/curators wired",
            "kickoff authoredHarbors=12 and authoredHarborsRemaining=0",
            "DoD quotas.harbors = 12",
            "parity-harbors-11-12 fixture + harbors1112:validate green",
            "CI runs harbors1112:validate",
        ],
        "preflightGates": [
            "shared/ship/harbors-11-12.json",
            "shared/fixtures/parity-harbors-11-12.json",
            "shared/assets/models/aurora_inlet_blockout.glb",
            "shared/assets/models/tideglass_bay_blockout.glb",
            "shared/tools/author_harbors_11_12.py",
            "web/src/ship/harbors1112.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors1112.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "name": "parity-harbors-11-12",
        "description": (
            "Finish 5.0 Phase 14: from ten-harbor prestige, travel Aurora Inlet → "
            "Tideglass Bay; landing quests + eleven/twelve prestige unlock."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 25,
        "harbors1112Marker": MARKER,
        "harborId": "harbor.sunrise_pier",
        "seed": 51414,
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
                "quest.mist_cove_landing",
                "quest.prism_reach_landing",
            ],
            "completedPrestige": [
                "prestige.twin_harbors",
                "prestige.triple_harbors",
                "prestige.quad_harbors",
                "prestige.five_harbors",
                "prestige.six_harbors",
                "prestige.seven_harbors",
                "prestige.eight_harbors",
                "prestige.nine_harbors",
                "prestige.ten_harbors",
            ],
            "unlockedCosmetics": [
                "banner.twin_harbors",
                "banner.triple_harbors",
                "banner.quad_harbors",
                "banner.five_harbors",
                "banner.six_harbors",
                "banner.seven_harbors",
                "banner.eight_harbors",
                "banner.nine_harbors",
                "banner.ten_harbors",
            ],
            "harborsTraveled": 10,
        },
        "travels": [
            {
                "harborId": AURORA["id"],
                "requestId": "p14-aurora-1",
                "expectQuest": AURORA["landingQuest"],
                "expectPrestige": AURORA["prestigeUnlock"],
                "expectBanner": AURORA["banner"],
                "expectBlockout": "aurora_inlet_blockout.glb",
            },
            {
                "harborId": TIDEGLASS["id"],
                "requestId": "p14-tideglass-1",
                "expectQuest": TIDEGLASS["landingQuest"],
                "expectPrestige": TIDEGLASS["prestigeUnlock"],
                "expectBanner": TIDEGLASS["banner"],
                "expectBlockout": "tideglass_bay_blockout.glb",
            },
        ],
        "expectFinal": {
            "harborId": TIDEGLASS["id"],
            "harborsTraveled": 12,
            "specializationId": TIDEGLASS["specialization"]["id"],
            "blockoutAsset": "tideglass_bay_blockout.glb",
        },
    }
    dump(PARITY, parity)


def main() -> int:
    pack = load(CONTENT)
    existing = {h["id"] for h in pack["harbors"]}
    for spec in (AURORA, TIDEGLASS):
        harbor = clone_harbor(pack, spec)
        pack["harbors"] = [h for h in pack["harbors"] if h["id"] != spec["id"]]
        pack["harbors"].append(harbor)

    upsert_quest(
        pack,
        {
            "id": AURORA["landingQuest"],
            "name": "Aurora Inlet landing",
            "description": "Open the eleventh harbor route and land at Aurora Inlet.",
            "requires": ["quest.prism_reach_landing"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 11},
            "reward": {"coins": 340, "unlockUpgrades": []},
        },
        "quest.prism_reach_landing",
    )
    upsert_quest(
        pack,
        {
            "id": TIDEGLASS["landingQuest"],
            "name": "Tideglass Bay landing",
            "description": "Open the twelfth harbor route and land at Tideglass Bay.",
            "requires": [AURORA["landingQuest"]],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 12},
            "reward": {"coins": 360, "unlockUpgrades": []},
        },
        AURORA["landingQuest"],
    )
    for q in pack["quests"]:
        if q["id"] == "quest.perfect_line":
            q["requires"] = [TIDEGLASS["landingQuest"]]

    upsert_prestige(
        pack,
        {
            "id": "prestige.eleven_harbors",
            "name": "Eleven Harbors",
            "description": "Travel the eleven-harbor circuit.",
            "requires": ["prestige.ten_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 11},
            "reward": {
                "coins": 475,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": AURORA["banner"],
            },
        },
        "prestige.ten_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": "prestige.twelve_harbors",
            "name": "Twelve Harbors",
            "description": "Travel the twelve-harbor circuit.",
            "requires": ["prestige.eleven_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 12},
            "reward": {
                "coins": 500,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": TIDEGLASS["banner"],
            },
        },
        "prestige.eleven_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": AURORA["curator"],
            "name": "Aurora Curator",
            "description": "Fill the Aurora Inlet trophy gallery.",
            "requires": ["prestige.eleven_harbors"],
            "goal": {"stat": "stat.trophy_set_aurora_inlet", "atLeast": 1},
            "reward": {
                "coins": 370,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": AURORA["museumBanner"],
            },
        },
        "prestige.prism_curator",
    )
    upsert_prestige(
        pack,
        {
            "id": TIDEGLASS["curator"],
            "name": "Tideglass Curator",
            "description": "Fill the Tideglass Bay trophy gallery.",
            "requires": ["prestige.twelve_harbors"],
            "goal": {"stat": "stat.trophy_set_tideglass_bay", "atLeast": 1},
            "reward": {
                "coins": 380,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": TIDEGLASS["museumBanner"],
            },
        },
        AURORA["curator"],
    )

    upsert_gallery(
        pack,
        {
            "id": AURORA["gallery"],
            "name": "Aurora Inlet gallery",
            "description": "Mount the Aurora Inlet specialty fish.",
            "species": AURORA["species"][:8],
            "completeStat": "stat.trophy_set_aurora_inlet",
        },
    )
    upsert_gallery(
        pack,
        {
            "id": TIDEGLASS["gallery"],
            "name": "Tideglass Bay gallery",
            "description": "Mount the Tideglass Bay specialty fish.",
            "species": TIDEGLASS["species"][:8],
            "completeStat": "stat.trophy_set_tideglass_bay",
        },
    )

    dump(CONTENT, pack)
    write_ship_catalog()
    ensure_i18n()
    update_kickoff()
    update_harbor_art(pack)
    update_dod()
    update_licenses()
    update_listing_pin()

    phase14 = next((p for p in load(KICKOFF).get("phases", []) if p.get("phase") == 14), None)
    if not phase14 or phase14.get("validate") != "harbors1112:validate":
        print("ERROR: kickoff phase 14 must validate via harbors1112:validate", file=sys.stderr)
        return 1

    print(
        f"authored harbors={len(pack['harbors'])} quests={len(pack['quests'])} "
        f"new={[AURORA['id'], TIDEGLASS['id']]} prior_existing={sorted(existing)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
