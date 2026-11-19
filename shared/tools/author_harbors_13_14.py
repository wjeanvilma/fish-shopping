#!/usr/bin/env python3
"""
Finish 6.0 Phase 7 — author harbors 13–14 (Saffron Quay, Cobalt Sound) with
travel/prestige gates, landing quests, galleries, themes, and ship catalogs.

Usage:
  python3 shared/tools/author_harbors_13_14.py
"""
from __future__ import annotations

import copy
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONTENT = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/harbors-13-14.json"
PARITY = ROOT / "shared/fixtures/parity-harbors-13-14.json"
KICKOFF = ROOT / "shared/ship/finish-6.0-kickoff.json"
HARBOR_ART = ROOT / "shared/ship/harbor-art-pass.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
LICENSES = ROOT / "shared/store/licenses.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"
PARITY_FINISH6 = ROOT / "shared/fixtures/parity-finish-6.0-kickoff.json"
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

MARKER = "authored-finish-6.0-phase-7"

SAFFRON = {
    "id": "harbor.saffron_quay",
    "name": "Saffron Quay",
    "clone_from": "harbor.ember_wharf",
    "prefix_from": "ew",
    "prefix_to": "sf",
    "requires": ["prestige.twelve_harbors"],
    "specialization": {
        "id": "spec.saffron_lantern",
        "name": "Saffron lantern",
        "description": "Warm lantern quays pull premium diners and rare gilt catches.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 80,
        "kindSpawnMultPermille": {"premium": 1340, "tourist": 1220, "critic": 1180},
    },
    "landingQuest": "quest.saffron_quay_landing",
    "prestigeUnlock": "prestige.thirteen_harbors",
    "gallery": "gallery.saffron_quay",
    "curator": "prestige.saffron_curator",
    "banner": "banner.thirteen_harbors",
    "museumBanner": "banner.saffron_museum",
    "blockout": "shared/assets/models/saffron_quay_blockout.glb",
    "theme": "saffron",
    "species": [
        "species.saffron_sole",
        "species.amber_snapper",
        "species.gilt_sole",
        "species.gilt_mackerel",
        "species.ember_ray",
        "species.cinder_carp",
        "species.harbor_pompano",
        "species.marina_tuna",
        "species.ash_pike",
        "species.kiln_perch",
        "species.lava_eel",
    ],
}

COBALT = {
    "id": "harbor.cobalt_sound",
    "name": "Cobalt Sound",
    "clone_from": "harbor.northlight_harbor",
    "prefix_from": "nl",
    "prefix_to": "cb",
    "requires": ["prestige.thirteen_harbors"],
    "specialization": {
        "id": "spec.cobalt_shelf",
        "name": "Cobalt shelf",
        "description": "Deep cobalt shelves draw critics and rare polar runs.",
        "maintenanceDiscountPerStation": 0,
        "rareChanceBonusPermille": 85,
        "kindSpawnMultPermille": {"critic": 1360, "premium": 1240, "tourist": 1140},
    },
    "landingQuest": "quest.cobalt_sound_landing",
    "prestigeUnlock": "prestige.fourteen_harbors",
    "gallery": "gallery.cobalt_sound",
    "curator": "prestige.cobalt_curator",
    "banner": "banner.fourteen_harbors",
    "museumBanner": "banner.cobalt_museum",
    "blockout": "shared/assets/models/cobalt_sound_blockout.glb",
    "theme": "cobalt",
    "species": [
        "species.arctic_cod",
        "species.aurora_cod",
        "species.frost_jack",
        "species.drift_icefish",
        "species.north_smelt",
        "species.polar_herring",
        "species.rime_herring",
        "species.ice_char",
        "species.ghost_lanternfish",
        "species.aurora_icefish",
        "species.crystal_smelt",
    ],
}

I18N_STRINGS = {
    "en": {
        "harbor.saffron_quay": "Saffron Quay",
        "harbor.cobalt_sound": "Cobalt Sound",
        "quest.saffron_quay_landing": "Saffron Quay landing",
        "quest.cobalt_sound_landing": "Cobalt Sound landing",
        "prestige.thirteen_harbors": "Thirteen Harbors",
        "prestige.fourteen_harbors": "Fourteen Harbors",
        "prestige.saffron_curator": "Saffron Curator",
        "prestige.cobalt_curator": "Cobalt Curator",
        "gallery.saffron_quay": "Saffron Quay gallery",
        "gallery.cobalt_sound": "Cobalt Sound gallery",
        "spec.saffron_lantern": "Saffron lantern",
        "spec.cobalt_shelf": "Cobalt shelf",
    },
    "es": {
        "harbor.saffron_quay": "Muelle Azafrán",
        "harbor.cobalt_sound": "Seno Cobalto",
        "quest.saffron_quay_landing": "Desembarco en Muelle Azafrán",
        "quest.cobalt_sound_landing": "Desembarco en Seno Cobalto",
        "prestige.thirteen_harbors": "Trece Puertos",
        "prestige.fourteen_harbors": "Catorce Puertos",
        "prestige.saffron_curator": "Curador Azafrán",
        "prestige.cobalt_curator": "Curador Cobalto",
        "gallery.saffron_quay": "Galería Muelle Azafrán",
        "gallery.cobalt_sound": "Galería Seno Cobalto",
        "spec.saffron_lantern": "Linterna azafrán",
        "spec.cobalt_shelf": "Estante cobalto",
    },
    "pt": {
        "harbor.saffron_quay": "Cais Açafrão",
        "harbor.cobalt_sound": "Enseada Cobalto",
        "quest.saffron_quay_landing": "Desembarque no Cais Açafrão",
        "quest.cobalt_sound_landing": "Desembarque na Enseada Cobalto",
        "prestige.thirteen_harbors": "Treze Portos",
        "prestige.fourteen_harbors": "Quatorze Portos",
        "prestige.saffron_curator": "Curador Açafrão",
        "prestige.cobalt_curator": "Curador Cobalto",
        "gallery.saffron_quay": "Galeria Cais Açafrão",
        "gallery.cobalt_sound": "Galeria Enseada Cobalto",
        "spec.saffron_lantern": "Lanterna açafrão",
        "spec.cobalt_shelf": "Prateleira cobalto",
    },
    "fr": {
        "harbor.saffron_quay": "Quai Safran",
        "harbor.cobalt_sound": "Anse Cobalt",
        "quest.saffron_quay_landing": "Accostage au Quai Safran",
        "quest.cobalt_sound_landing": "Accostage à Anse Cobalt",
        "prestige.thirteen_harbors": "Treize Ports",
        "prestige.fourteen_harbors": "Quatorze Ports",
        "prestige.saffron_curator": "Conservateur Safran",
        "prestige.cobalt_curator": "Conservateur Cobalt",
        "gallery.saffron_quay": "Galerie Quai Safran",
        "gallery.cobalt_sound": "Galerie Anse Cobalt",
        "spec.saffron_lantern": "Lanterne safran",
        "spec.cobalt_shelf": "Plateau cobalt",
    },
    "ht": {
        "harbor.saffron_quay": "Ke Safran",
        "harbor.cobalt_sound": "Son Kobal",
        "quest.saffron_quay_landing": "Aterisaj nan Ke Safran",
        "quest.cobalt_sound_landing": "Aterisaj nan Son Kobal",
        "prestige.thirteen_harbors": "Trèz Pò",
        "prestige.fourteen_harbors": "Katòz Pò",
        "prestige.saffron_curator": "Kiratè Safran",
        "prestige.cobalt_curator": "Kiratè Kobal",
        "gallery.saffron_quay": "Galeri Ke Safran",
        "gallery.cobalt_sound": "Galeri Son Kobal",
        "spec.saffron_lantern": "Lantèn safran",
        "spec.cobalt_shelf": "Etajè kobal",
    },
    "it": {
        "harbor.saffron_quay": "Molo Zafferano",
        "harbor.cobalt_sound": "Baia Cobalto",
        "quest.saffron_quay_landing": "Approdo a Molo Zafferano",
        "quest.cobalt_sound_landing": "Approdo a Baia Cobalto",
        "prestige.thirteen_harbors": "Tredici Porti",
        "prestige.fourteen_harbors": "Quattordici Porti",
        "prestige.saffron_curator": "Curatore Zafferano",
        "prestige.cobalt_curator": "Curatore Cobalto",
        "gallery.saffron_quay": "Galleria Molo Zafferano",
        "gallery.cobalt_sound": "Galleria Baia Cobalto",
        "spec.saffron_lantern": "Lanterna zafferano",
        "spec.cobalt_shelf": "Piattaforma cobalto",
    },
    "ca": {
        "harbor.saffron_quay": "Moll Safrà",
        "harbor.cobalt_sound": "Badia Cobalt",
        "quest.saffron_quay_landing": "Desembarcament a Moll Safrà",
        "quest.cobalt_sound_landing": "Desembarcament a Badia Cobalt",
        "prestige.thirteen_harbors": "Tretze Ports",
        "prestige.fourteen_harbors": "Catorze Ports",
        "prestige.saffron_curator": "Conservador Safrà",
        "prestige.cobalt_curator": "Conservador Cobalt",
        "gallery.saffron_quay": "Galeria Moll Safrà",
        "gallery.cobalt_sound": "Galeria Badia Cobalt",
        "spec.saffron_lantern": "Llanterna safrà",
        "spec.cobalt_shelf": "Lleixa cobalt",
    },
    "ru": {
        "harbor.saffron_quay": "Шафрановая пристань",
        "harbor.cobalt_sound": "Кобальтовый залив",
        "quest.saffron_quay_landing": "Высадка на Шафрановой пристани",
        "quest.cobalt_sound_landing": "Высадка в Кобальтовом заливе",
        "prestige.thirteen_harbors": "Тринадцать гаваней",
        "prestige.fourteen_harbors": "Четырнадцать гаваней",
        "prestige.saffron_curator": "Куратор Шафрана",
        "prestige.cobalt_curator": "Куратор Кобальта",
        "gallery.saffron_quay": "Галерея Шафрановой пристани",
        "gallery.cobalt_sound": "Галерея Кобальтового залива",
        "spec.saffron_lantern": "Шафрановый фонарь",
        "spec.cobalt_shelf": "Кобальтовый шельф",
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
        if "ember_wharf" in lid:
            mapping[lid] = lid.replace("ember_wharf", "saffron_quay")
        if "northlight_harbor" in lid:
            mapping[lid] = lid.replace("northlight_harbor", "cobalt_sound")

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
    # Phase 1 baseline stays locked at 12; remaining closes to 0 after Phase 7.
    kick["gaps"]["authoredHarborsRemaining"] = 0
    kick["gaps"]["harborArt6Incomplete"] = False
    dump(KICKOFF, kick)

    if PARITY_FINISH6.is_file():
        pfx = load(PARITY_FINISH6)
        # Soft-floor: Phase 7 closed harborArt6Incomplete → openGapFlagMin 20.
        pfx.setdefault("expect", {})["openGapFlagMin"] = 20
        dump(PARITY_FINISH6, pfx)


def update_harbor_art(pack: dict) -> None:
    art = load(HARBOR_ART)
    by_id = {h["harborId"]: h for h in art["authoredHarbors"]}
    for spec in (SAFFRON, COBALT):
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
    for hid in (SAFFRON["id"], COBALT["id"]):
        if hid not in seen:
            ordered.append(by_id[hid])
    art["authoredHarbors"] = ordered
    art["authoredHarborMin"] = 14
    art["definitionOfDoneAuthoredHarbors"] = 14
    art["maxTotalAuthoredBytes"] = max(int(art.get("maxTotalAuthoredBytes") or 0), 16_000_000)
    assets = []
    for h in pack["harbors"]:
        assets.append(f"{h['id'].split('.', 1)[1]}_blockout.glb")
    art["allBlockoutAssets"] = assets
    art["description"] = (
        "Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 + "
        "Finish 5.0 Phase 14 + Finish 6.0 Phase 7 — all 14 harbor GLBs authored "
        "scenic theme sets beyond grey-box blockout; licenses + size budgets; "
        "web loads all 14 scenes."
    )
    dump(HARBOR_ART, art)

    parity_art = ROOT / "shared/fixtures/parity-harbor-art-pass.json"
    if parity_art.is_file():
        pfx = load(parity_art)
        pfx["authoredHarborMin"] = 14
        pfx["description"] = (
            "Finish 2.0 Phase 19 + Finish 3.0 Phase 8 + Finish 4.0 Phase 9/12 + "
            "Finish 5.0 Phase 14 + Finish 6.0 Phase 7: all 14 authored scenic "
            "harbor art markers, themes, and byte budgets."
        )
        by_id = {h["harborId"]: h for h in pfx.get("expect", {}).get("harbors", [])}
        for spec in (SAFFRON, COBALT):
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
        for hid in (SAFFRON["id"], COBALT["id"]):
            if hid not in seen:
                ordered.append(by_id[hid])
        pfx.setdefault("expect", {})["harbors"] = ordered
        dump(parity_art, pfx)


def update_dod() -> None:
    dod = load(DOD)
    dod["quotas"]["harbors"] = 14
    dod["quotas"]["authoredHarborScenes"] = 14
    dod["harbors1314"] = {
        "phase": 7,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "harbors1314Marker": MARKER,
        "catalog": "shared/ship/harbors-13-14.json",
        "parityFixture": "shared/fixtures/parity-harbors-13-14.json",
        "validateScript": "npm run harbors1314:validate",
        "checklist": [
            "14 harbors including saffron_quay + cobalt_sound",
            "prestige thirteen/fourteen + landing quests + galleries wired",
            "kickoff authoredHarborsRemaining = 0; harborArt6Incomplete = false",
            "harbors1314:validate green in CI",
        ],
    }
    dump(DOD, dod)


def update_licenses() -> None:
    lic = load(LICENSES)
    for rec in lic.get("records", []):
        if rec.get("id") == "harbor-authored-art":
            paths = set(rec.get("paths", []))
            paths.add(SAFFRON["blockout"])
            paths.add(COBALT["blockout"])
            rec["paths"] = sorted(paths)
            break
    dump(LICENSES, lic)


def update_listing_pin() -> None:
    listing = load(LISTING)
    listing["harbors1314Phase"] = 7
    listing["harbors1314Catalog"] = "shared/ship/harbors-13-14.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["harbors1314"] = "shared/ship/harbors-13-14.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-harbors-13-14.json" not in fixtures:
        fixtures.append("parity-harbors-13-14.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def write_ship_catalog() -> None:
    catalog = {
        "phase": 7,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.harbors_13_14.v1",
        "description": (
            "Finish 6.0 Phase 7 — author harbors 13–14 (Saffron Quay, Cobalt Sound) "
            "with layouts, specializations, thirteen/fourteen prestige circuit, landing "
            "quests, trophy galleries, and regenerated scenic blockouts. Schema stays 26."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "harborCount": 14,
        "newHarborCount": 2,
        "harbors1314Marker": MARKER,
        "newHarbors": [
            {
                "id": SAFFRON["id"],
                "name": SAFFRON["name"],
                "requires": SAFFRON["requires"],
                "specialization": SAFFRON["specialization"]["id"],
                "blockout": SAFFRON["blockout"],
                "landingQuest": SAFFRON["landingQuest"],
                "prestigeUnlock": SAFFRON["prestigeUnlock"],
                "gallery": SAFFRON["gallery"],
                "theme": SAFFRON["theme"],
            },
            {
                "id": COBALT["id"],
                "name": COBALT["name"],
                "requires": COBALT["requires"],
                "specialization": COBALT["specialization"]["id"],
                "blockout": COBALT["blockout"],
                "landingQuest": COBALT["landingQuest"],
                "prestigeUnlock": COBALT["prestigeUnlock"],
                "gallery": COBALT["gallery"],
                "theme": COBALT["theme"],
            },
        ],
        "circuitPrestige": ["prestige.thirteen_harbors", "prestige.fourteen_harbors"],
        "travelFixture": "shared/fixtures/parity-harbors-13-14.json",
        "blockoutTool": "shared/tools/generate_blockout.py",
        "themesModule": "shared/tools/harbor_themes.py",
        "authorTool": "shared/tools/author_harbors_13_14.py",
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "definitionOfDoneQuota": 14,
        "validateScript": "npm run harbors1314:validate",
        "checklist": [
            "content-pack has 14 harbors including saffron_quay + cobalt_sound",
            "Blockouts regenerated for saffron_quay + cobalt_sound GLBs",
            "Prestige thirteen/fourteen + landing quests + galleries/curators wired",
            "kickoff authoredHarborsRemaining=0 and harborArt6Incomplete=false",
            "Phase 1 baseline.authoredHarbors stays 12",
            "DoD quotas.harbors = 14",
            "parity-harbors-13-14 fixture + harbors1314:validate green",
            "CI runs harbors1314:validate",
        ],
        "preflightGates": [
            "shared/ship/harbors-13-14.json",
            "shared/fixtures/parity-harbors-13-14.json",
            "shared/assets/models/saffron_quay_blockout.glb",
            "shared/assets/models/cobalt_sound_blockout.glb",
            "shared/tools/author_harbors_13_14.py",
            "web/src/ship/harbors1314.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Harbors1314.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "name": "parity-harbors-13-14",
        "description": (
            "Finish 6.0 Phase 7: from twelve-harbor prestige, travel Saffron Quay → "
            "Cobalt Sound; landing quests + thirteen/fourteen prestige unlock."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "harbors1314Marker": MARKER,
        "harborId": "harbor.sunrise_pier",
        "seed": 60714,
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
                "quest.aurora_inlet_landing",
                "quest.tideglass_bay_landing",
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
                "prestige.eleven_harbors",
                "prestige.twelve_harbors",
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
                "banner.eleven_harbors",
                "banner.twelve_harbors",
            ],
            "harborsTraveled": 12,
        },
        "travels": [
            {
                "harborId": SAFFRON["id"],
                "requestId": "p7-saffron-1",
                "expectQuest": SAFFRON["landingQuest"],
                "expectPrestige": SAFFRON["prestigeUnlock"],
                "expectBanner": SAFFRON["banner"],
                "expectBlockout": "saffron_quay_blockout.glb",
            },
            {
                "harborId": COBALT["id"],
                "requestId": "p7-cobalt-1",
                "expectQuest": COBALT["landingQuest"],
                "expectPrestige": COBALT["prestigeUnlock"],
                "expectBanner": COBALT["banner"],
                "expectBlockout": "cobalt_sound_blockout.glb",
            },
        ],
        "expectFinal": {
            "harborId": COBALT["id"],
            "harborsTraveled": 14,
            "specializationId": COBALT["specialization"]["id"],
            "blockoutAsset": "cobalt_sound_blockout.glb",
        },
    }
    dump(PARITY, parity)


def main() -> int:
    pack = load(CONTENT)
    existing = {h["id"] for h in pack["harbors"]}
    for spec in (SAFFRON, COBALT):
        harbor = clone_harbor(pack, spec)
        pack["harbors"] = [h for h in pack["harbors"] if h["id"] != spec["id"]]
        pack["harbors"].append(harbor)

    upsert_quest(
        pack,
        {
            "id": SAFFRON["landingQuest"],
            "name": "Saffron Quay landing",
            "description": "Open the thirteenth harbor route and land at Saffron Quay.",
            "requires": ["quest.tideglass_bay_landing"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 13},
            "reward": {"coins": 380, "unlockUpgrades": []},
        },
        "quest.tideglass_bay_landing",
    )
    upsert_quest(
        pack,
        {
            "id": COBALT["landingQuest"],
            "name": "Cobalt Sound landing",
            "description": "Open the fourteenth harbor route and land at Cobalt Sound.",
            "requires": [SAFFRON["landingQuest"]],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 14},
            "reward": {"coins": 400, "unlockUpgrades": []},
        },
        SAFFRON["landingQuest"],
    )
    for q in pack["quests"]:
        if q["id"] == "quest.perfect_line":
            q["requires"] = [COBALT["landingQuest"]]

    upsert_prestige(
        pack,
        {
            "id": "prestige.thirteen_harbors",
            "name": "Thirteen Harbors",
            "description": "Travel the thirteen-harbor circuit.",
            "requires": ["prestige.twelve_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 13},
            "reward": {
                "coins": 525,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": SAFFRON["banner"],
            },
        },
        "prestige.twelve_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": "prestige.fourteen_harbors",
            "name": "Fourteen Harbors",
            "description": "Travel the fourteen-harbor circuit.",
            "requires": ["prestige.thirteen_harbors"],
            "goal": {"stat": "stat.harbors_traveled", "atLeast": 14},
            "reward": {
                "coins": 550,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": COBALT["banner"],
            },
        },
        "prestige.thirteen_harbors",
    )
    upsert_prestige(
        pack,
        {
            "id": SAFFRON["curator"],
            "name": "Saffron Curator",
            "description": "Fill the Saffron Quay trophy gallery.",
            "requires": ["prestige.thirteen_harbors"],
            "goal": {"stat": "stat.trophy_set_saffron_quay", "atLeast": 1},
            "reward": {
                "coins": 390,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": SAFFRON["museumBanner"],
            },
        },
        "prestige.tideglass_curator",
    )
    upsert_prestige(
        pack,
        {
            "id": COBALT["curator"],
            "name": "Cobalt Curator",
            "description": "Fill the Cobalt Sound trophy gallery.",
            "requires": ["prestige.fourteen_harbors"],
            "goal": {"stat": "stat.trophy_set_cobalt_sound", "atLeast": 1},
            "reward": {
                "coins": 400,
                "catchSpeedPermille": 0,
                "priceBonusPermille": 0,
                "cosmetic": COBALT["museumBanner"],
            },
        },
        SAFFRON["curator"],
    )

    upsert_gallery(
        pack,
        {
            "id": SAFFRON["gallery"],
            "name": "Saffron Quay gallery",
            "description": "Mount the Saffron Quay specialty fish.",
            "species": SAFFRON["species"][:8],
            "completeStat": "stat.trophy_set_saffron_quay",
        },
    )
    upsert_gallery(
        pack,
        {
            "id": COBALT["gallery"],
            "name": "Cobalt Sound gallery",
            "description": "Mount the Cobalt Sound specialty fish.",
            "species": COBALT["species"][:8],
            "completeStat": "stat.trophy_set_cobalt_sound",
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

    phase7 = next((p for p in load(KICKOFF).get("phases", []) if p.get("phase") == 7), None)
    if not phase7 or phase7.get("validate") != "harbors1314:validate":
        print("ERROR: kickoff phase 7 must validate via harbors1314:validate", file=sys.stderr)
        return 1

    print(
        f"authored harbors={len(pack['harbors'])} quests={len(pack['quests'])} "
        f"new={[SAFFRON['id'], COBALT['id']]} prior_existing={sorted(existing)}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
