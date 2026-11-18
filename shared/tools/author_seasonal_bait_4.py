#!/usr/bin/env python3
"""
Finish 4.0 Phase 16 — seasonal→12, baits→12, mastery depth.

Usage:
  python3 shared/tools/author_seasonal_bait_4.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "seasonal-bait-4.json"
PARITY = ROOT / "fixtures" / "parity-seasonal-bait-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
EN = ROOT / "i18n" / "content-strings.en.json"
ES = ROOT / "i18n" / "content-strings.es.json"
PT = ROOT / "i18n" / "content-strings.pt.json"
CONTENT_STRINGS_KT = (
    ROOT.parent
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/ContentStrings.kt"
)

MARKER = "authored-finish-4.0-phase-16"
PERIOD = 16000

NEW_EVENTS = [
    {
        "id": "event.mist_fog_festival",
        "name": "Mist Fog Festival",
        "description": "Lanterns cut the mist while brine mullet and braise trays pack the cove.",
        "periodTicks": PERIOD,
        "startTick": 12000,
        "durationTicks": 900,
        "banner": "banner.mist_fog_festival",
        "customerSpawnMultPermille": 1500,
        "priceMultPermille": 1250,
        "festivalCustomerIds": ["customer.mist_fog_lantern"],
        "speciesWeightMultPermille": {
            "species.brine_mullet": 1900,
            "species.bronze_brine": 1700,
            "species.prism_lanternfish": 1500,
        },
    },
    {
        "id": "event.prism_light_fair",
        "name": "Prism Light Fair",
        "description": "Shelf lights blaze for prism gobies and glazed skewers at the fair.",
        "periodTicks": PERIOD,
        "startTick": 12950,
        "durationTicks": 850,
        "banner": "banner.prism_light_fair",
        "customerSpawnMultPermille": 1550,
        "priceMultPermille": 1280,
        "festivalCustomerIds": ["customer.prism_fair_tourist"],
        "speciesWeightMultPermille": {
            "species.prism_goby": 2000,
            "species.prism_shad": 1800,
            "species.prism_gale": 1600,
        },
    },
    {
        "id": "event.plaza_tuna_week",
        "name": "Plaza Tuna Week",
        "description": "Plaza tuna runs draw bulk buyers and braise kitchens all week.",
        "periodTicks": PERIOD,
        "startTick": 13850,
        "durationTicks": 900,
        "banner": "banner.plaza_tuna_week",
        "customerSpawnMultPermille": 1480,
        "priceMultPermille": 1320,
        "festivalCustomerIds": ["customer.plaza_tuna_buyer"],
        "speciesWeightMultPermille": {
            "species.plaza_tuna": 2100,
            "species.gilt_tuna": 1700,
            "species.aurora_jack": 1500,
        },
    },
    {
        "id": "event.rime_aurora_vigil",
        "name": "Rime Aurora Vigil",
        "description": "Aurora night vigil favors rime herring and crystal rime bites.",
        "periodTicks": PERIOD,
        "startTick": 14800,
        "durationTicks": 1000,
        "banner": "banner.rime_aurora_vigil",
        "customerSpawnMultPermille": 1420,
        "priceMultPermille": 1350,
        "festivalCustomerIds": ["customer.rime_vigil_guest"],
        "speciesWeightMultPermille": {
            "species.rime_herring": 2000,
            "species.crystal_rime": 1900,
            "species.aurora_icefish": 1700,
            "species.rime_bream": 1600,
        },
    },
]

NEW_CUSTOMERS = [
    {
        "id": "customer.mist_fog_lantern",
        "name": "Mist fog lantern",
        "kind": "tourist",
        "basketMin": 1,
        "basketMax": 3,
        "patienceTicks": 1400,
        "spawnWeight": 70,
        "priceMultPermille": 1500,
        "preferredProducts": [
            {"item": "product.braise_stew", "weight": 55},
            {"item": "product.braised_fillet", "weight": 45},
        ],
        "unmetPriceMultPermille": 750,
        "unmetPatienceDrainPermille": 1800,
        "requiresSeasonalEvent": "event.mist_fog_festival",
    },
    {
        "id": "customer.prism_fair_tourist",
        "name": "Prism fair tourist",
        "kind": "tourist",
        "basketMin": 1,
        "basketMax": 2,
        "patienceTicks": 1300,
        "spawnWeight": 75,
        "priceMultPermille": 1550,
        "preferredProducts": [
            {"item": "product.glaze_skewer", "weight": 60},
            {"item": "product.glazed_fillet", "weight": 40},
        ],
        "unmetPriceMultPermille": 740,
        "unmetPatienceDrainPermille": 1900,
        "requiresSeasonalEvent": "event.prism_light_fair",
    },
    {
        "id": "customer.plaza_tuna_buyer",
        "name": "Plaza tuna buyer",
        "kind": "wholesaler",
        "basketMin": 2,
        "basketMax": 4,
        "patienceTicks": 1600,
        "spawnWeight": 65,
        "priceMultPermille": 1600,
        "preferredProducts": [
            {"item": "product.braise_carton", "weight": 50},
            {"item": "product.glaze_carton", "weight": 50},
        ],
        "unmetPriceMultPermille": 720,
        "unmetPatienceDrainPermille": 1700,
        "requiresSeasonalEvent": "event.plaza_tuna_week",
    },
    {
        "id": "customer.rime_vigil_guest",
        "name": "Rime vigil guest",
        "kind": "premium",
        "basketMin": 2,
        "basketMax": 3,
        "patienceTicks": 1500,
        "spawnWeight": 68,
        "priceMultPermille": 1700,
        "preferredProducts": [
            {"item": "product.chilled_fillet", "weight": 55},
            {"item": "product.premium_portion", "weight": 45},
        ],
        "unmetPriceMultPermille": 730,
        "unmetPatienceDrainPermille": 2000,
        "requiresSeasonalEvent": "event.rime_aurora_vigil",
    },
]

NEW_CONTRACTS = [
    {
        "id": "contract.mist_fog_braise",
        "name": "Mist fog braise crate",
        "description": "Festival-only — braised fillets for the fog lantern stalls.",
        "item": "product.braised_fillet",
        "quantity": 3,
        "durationTicks": 1400,
        "payout": 95,
        "penalty": 22,
        "weight": 70,
        "requiresSeasonalEvent": "event.mist_fog_festival",
    },
    {
        "id": "contract.prism_fair_glaze",
        "name": "Prism fair glaze platter",
        "description": "Festival-only — glazed skewers for the light fair booths.",
        "item": "product.glaze_skewer",
        "quantity": 4,
        "durationTicks": 1300,
        "payout": 88,
        "penalty": 20,
        "weight": 72,
        "requiresSeasonalEvent": "event.prism_light_fair",
    },
    {
        "id": "contract.plaza_tuna_haul",
        "name": "Plaza tuna haul",
        "description": "Festival-only — plaza tuna for the week-long market.",
        "item": "species.plaza_tuna",
        "quantity": 3,
        "durationTicks": 1500,
        "payout": 110,
        "penalty": 26,
        "weight": 68,
        "requiresSeasonalEvent": "event.plaza_tuna_week",
    },
    {
        "id": "contract.rime_vigil_crate",
        "name": "Rime vigil crate",
        "description": "Festival-only — rime herring for the aurora vigil pantry.",
        "item": "species.rime_herring",
        "quantity": 6,
        "durationTicks": 1600,
        "payout": 100,
        "penalty": 24,
        "weight": 66,
        "requiresSeasonalEvent": "event.rime_aurora_vigil",
    },
]

NEW_BAITS = [
    {
        "id": "bait.mist_morsel",
        "name": "Mist morsel",
        "description": "Pack of 3. Soft fog bait for brine and lanternfish runs.",
        "carryUnits": 1,
        "packQuantity": 3,
        "cost": 48,
        "rareSpeciesWeightMultPermille": 1350,
        "rareChanceBonusPermille": 70,
        "requires": ["upgrade.bait_pouch"],
    },
    {
        "id": "bait.prism_flake",
        "name": "Prism flake",
        "description": "Pack of 2. Sparkling flake that sweetens prism shelf bites.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 70,
        "rareSpeciesWeightMultPermille": 1500,
        "rareChanceBonusPermille": 95,
        "requires": ["upgrade.rod_speed_2"],
    },
    {
        "id": "bait.plaza_cutlet",
        "name": "Plaza cutlet",
        "description": "Pack of 2. Heavy cutlet for plaza tuna and gilt runs.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 110,
        "rareSpeciesWeightMultPermille": 1650,
        "rareChanceBonusPermille": 125,
        "requires": ["upgrade.timing_sights"],
    },
    {
        "id": "bait.rime_crystal",
        "name": "Rime crystal",
        "description": "Pack of 2. Ice crystal tip for aurora and rime rares.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 160,
        "rareSpeciesWeightMultPermille": 1800,
        "rareChanceBonusPermille": 160,
        "requires": ["upgrade.rod_speed_3"],
    },
]

NEW_TECHNIQUES = [
    {
        "id": "technique.pulse_jig",
        "name": "Pulse jig",
        "description": "Mid-tier pulse that tightens Perfect and bumps rare odds.",
        "requiresMasteryLevel": 3,
        "windowStartDeltaPermille": -10,
        "windowEndDeltaPermille": 10,
        "perfectStartDeltaPermille": 10,
        "perfectEndDeltaPermille": -10,
        "catchSpeedMultPermille": 1050,
        "perfectBonusPermille": 30,
        "rareChanceBonusPermille": 20,
    },
    {
        "id": "technique.harbor_cast",
        "name": "Harbor cast",
        "description": "Wide harbor cast — slower retrieve, generous Good window.",
        "requiresMasteryLevel": 5,
        "windowStartDeltaPermille": -50,
        "windowEndDeltaPermille": 50,
        "perfectStartDeltaPermille": -5,
        "perfectEndDeltaPermille": 5,
        "catchSpeedMultPermille": 880,
        "perfectBonusPermille": 10,
        "rareChanceBonusPermille": 55,
    },
    {
        "id": "technique.legend_set",
        "name": "Legend set",
        "description": "Endgame set — razor Perfect band with a legendary tip bonus.",
        "requiresMasteryLevel": 6,
        "windowStartDeltaPermille": 0,
        "windowEndDeltaPermille": 0,
        "perfectStartDeltaPermille": 20,
        "perfectEndDeltaPermille": -20,
        "catchSpeedMultPermille": 1180,
        "perfectBonusPermille": 80,
        "rareChanceBonusPermille": 25,
    },
]

NEW_TIPS = [
    {
        "id": "tip.mastery.pulse_jig",
        "minGlobalLevel": 3,
        "maxGlobalLevel": 4,
        "minSpeciesLevel": 2,
        "text": "Pulse jig sharpens Perfects — equip it once mastery hits 3",
    },
    {
        "id": "tip.mastery.harbor_cast",
        "minGlobalLevel": 5,
        "maxGlobalLevel": 5,
        "minSpeciesLevel": 3,
        "text": "Harbor cast slows the retrieve for rare bites on tough species",
    },
    {
        "id": "tip.mastery.legend_set",
        "minGlobalLevel": 6,
        "maxGlobalLevel": 7,
        "minSpeciesLevel": 4,
        "text": "Legend set is for endgame Perfects — unlock at mastery 6",
    },
]

MASTERY_DEPTH = {
    "maxLevel": 7,
    "xpThresholds": [0, 15, 40, 80, 140, 220, 320],
    "catchSpeedPermillePerLevel": 28,
    "rareChanceBonusPermillePerLevel": 10,
}

I18N = {
    "en": {},
    "es": {
        "event.mist_fog_festival": "Festival de niebla",
        "event.prism_light_fair": "Feria de luz prisma",
        "event.plaza_tuna_week": "Semana del atún plaza",
        "event.rime_aurora_vigil": "Vigilia aurora rime",
        "customer.mist_fog_lantern": "Linterna de niebla",
        "customer.prism_fair_tourist": "Turista feria prisma",
        "customer.plaza_tuna_buyer": "Comprador atún plaza",
        "customer.rime_vigil_guest": "Invitado vigilia rime",
        "contract.mist_fog_braise": "Caja braseada de niebla",
        "contract.prism_fair_glaze": "Bandeja glaseada feria",
        "contract.plaza_tuna_haul": "Captura atún plaza",
        "contract.rime_vigil_crate": "Caja vigilia rime",
        "bait.mist_morsel": "Bocado de niebla",
        "bait.prism_flake": "Escama prisma",
        "bait.plaza_cutlet": "Chuletón plaza",
        "bait.rime_crystal": "Cristal rime",
        "technique.pulse_jig": "Jig de pulso",
        "technique.harbor_cast": "Lance de puerto",
        "technique.legend_set": "Lance leyenda",
    },
    "pt": {
        "event.mist_fog_festival": "Festival da névoa",
        "event.prism_light_fair": "Feira de luz prisma",
        "event.plaza_tuna_week": "Semana do atum praça",
        "event.rime_aurora_vigil": "Vigília aurora rime",
        "customer.mist_fog_lantern": "Lanterna da névoa",
        "customer.prism_fair_tourist": "Turista feira prisma",
        "customer.plaza_tuna_buyer": "Comprador atum praça",
        "customer.rime_vigil_guest": "Convidado vigília rime",
        "contract.mist_fog_braise": "Caixa braseada da névoa",
        "contract.prism_fair_glaze": "Bandeja glaceada feira",
        "contract.plaza_tuna_haul": "Pesca atum praça",
        "contract.rime_vigil_crate": "Caixa vigília rime",
        "bait.mist_morsel": "Isca da névoa",
        "bait.prism_flake": "Floco prisma",
        "bait.plaza_cutlet": "Costeleta praça",
        "bait.rime_crystal": "Cristal rime",
        "technique.pulse_jig": "Jig de pulso",
        "technique.harbor_cast": "Lançamento do porto",
        "technique.legend_set": "Lance lendário",
    },
}


def dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {x[key]: i for i, x in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def fill_en_i18n() -> None:
    for e in NEW_EVENTS:
        I18N["en"][e["id"]] = e["name"]
    for c in NEW_CUSTOMERS:
        I18N["en"][c["id"]] = c["name"]
    for t in NEW_CONTRACTS:
        I18N["en"][t["id"]] = t["name"]
    for b in NEW_BAITS:
        I18N["en"][b["id"]] = b["name"]
    for t in NEW_TECHNIQUES:
        I18N["en"][t["id"]] = t["name"]


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
    mastery = data["fishingMastery"]
    catalog = {
        "phase": 16,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.seasonal_bait_4.v1",
        "description": (
            "Finish 4.0 Phase 16 — raise seasonal festivals to ≥12 and baits to ≥12, "
            "and deepen fishing mastery (maxLevel 7, +3 techniques, +3 coaching tips). "
            "Schema stays 24 / content 3.0.0."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "seasonalBait4Marker": MARKER,
        "seasonalEventsMin": 12,
        "baitsMin": 12,
        "masteryMaxLevel": 7,
        "masteryTechniquesMin": 6,
        "masteryCoachingTipsMin": 8,
        "newEvents": [e["id"] for e in NEW_EVENTS],
        "newBaits": [b["id"] for b in NEW_BAITS],
        "newTechniques": [t["id"] for t in NEW_TECHNIQUES],
        "newCoachingTips": [t["id"] for t in NEW_TIPS],
        "newFestivalCustomers": [c["id"] for c in NEW_CUSTOMERS],
        "newFestivalContracts": [t["id"] for t in NEW_CONTRACTS],
        "extendsFestivalWeekends": "shared/ship/festival-weekends.json",
        "extendsFishingMastery": "shared/ship/fishing-mastery.json",
        "parityFixture": "shared/fixtures/parity-seasonal-bait-4.json",
        "authorTool": "shared/tools/author_seasonal_bait_4.py",
        "validateScript": "npm run seasonalbait4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "checklist": [
            "≥12 seasonal events (period expanded to 16000; mist/prism/plaza/rime weekends)",
            "≥12 baits including mist/prism/plaza/rime packs",
            "Mastery maxLevel 7 + ≥6 techniques + ≥8 coaching tips",
            "Festival customers + gated contracts for new weekends",
            "Finish 2.0 festivals:validate / mastery:validate soft floors still green",
            "parity-seasonal-bait-4 + seasonalbait4:validate green",
            "CI runs seasonalbait4:validate",
            "kickoff baseline seasonalEvents=12 / baits=12",
            "schema stays 24 / content 3.0.0",
        ],
        "preflightGates": [
            "shared/ship/seasonal-bait-4.json",
            "shared/fixtures/parity-seasonal-bait-4.json",
            "shared/ship/festival-weekends.json",
            "shared/ship/fishing-mastery.json",
            "shared/content/content-pack.json",
            "shared/tools/author_seasonal_bait_4.py",
            "web/src/ship/seasonalBait4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/SeasonalBait4.kt",
            "web/scripts/validate-seasonal-bait-4.ts",
        ],
        "measured": {
            "seasonalEvents": len(data["seasonalEvents"]["events"]),
            "baits": len(data["bait"]),
            "masteryMaxLevel": mastery["maxLevel"],
            "techniques": len(mastery["techniques"]),
            "coachingTips": len(mastery["coachingTips"]),
        },
    }
    dump(SHIP, catalog)

    mist = next(e for e in NEW_EVENTS if e["id"] == "event.mist_fog_festival")
    parity = {
        "schema": "fish.fixture.parity_seasonal_bait_4.v1",
        "seasonalBait4Marker": MARKER,
        "phase": 16,
        "plan": "30_finish_4.0",
        "description": (
            "Finish 4.0 Phase 16: enter Mist Fog Festival window; assert crowd/price, "
            "festival customer gate, bait kiosk size ≥12, mastery maxLevel 7 + pulse_jig."
        ),
        "harborId": "harbor.mist_cove",
        "seed": 1616,
        "eventId": "event.mist_fog_festival",
        "tickInWindow": mist["startTick"] + 50,
        "festivalCustomerId": "customer.mist_fog_lantern",
        "gatedContractId": "contract.mist_fog_braise",
        "sampleBaitId": "bait.mist_morsel",
        "sampleTechniqueId": "technique.pulse_jig",
        "expect": {
            "customerSpawnMultPermille": mist["customerSpawnMultPermille"],
            "priceMultPermille": mist["priceMultPermille"],
            "seasonalEventsMin": 12,
            "baitsMin": 12,
            "masteryMaxLevel": 7,
            "techniquesMin": 6,
            "coachingTipsMin": 8,
            "schemaVersion": 24,
            "contentVersion": "3.0.0",
            "gates": [
                "seasonal_12",
                "baits_12",
                "mastery_depth",
                "kickoff_floors",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["baseline"]["seasonalEvents"] = len(data["seasonalEvents"]["events"])
    kick["baseline"]["baits"] = len(data["bait"])
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["quotas"]["seasonalEvents"] = max(dod.get("quotas", {}).get("seasonalEvents", 0), 12)
    dod["quotas"]["baits"] = max(dod.get("quotas", {}).get("baits", 0), 12)
    dod["quotas"]["masteryTechniques"] = max(
        dod.get("quotas", {}).get("masteryTechniques", 0), 6
    )
    dod["quotas"]["masteryCoachingTips"] = max(
        dod.get("quotas", {}).get("masteryCoachingTips", 0), 8
    )
    dod["notes"] = (
        "Finish 4.0 Phase 16 seasonal-bait-4 complete (seasonal≥12, baits≥12, mastery depth); "
        "Phases 1–15 remain green. Frozen 3.0.0 / schema 24. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 16,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "seasonalBait4Marker": MARKER,
        "catalog": "shared/ship/seasonal-bait-4.json",
        "parityFixture": "shared/fixtures/parity-seasonal-bait-4.json",
        "validateScript": "npm run seasonalbait4:validate",
        "checklist": [
            "≥12 seasonal events + festival guests/contracts",
            "≥12 baits",
            "mastery maxLevel 7 / ≥6 techniques / ≥8 tips",
            "kickoff seasonalEvents=12 / baits=12",
            "seasonalbait4:validate green in CI",
        ],
    }
    if "seasonalBait4" not in dod:
        out = {}
        for k, v in dod.items():
            if k == "questsContracts4":
                out[k] = v
                out["seasonalBait4"] = block
            else:
                out[k] = v
        if "seasonalBait4" not in out:
            out["seasonalBait4"] = block
        dod = out
    else:
        dod["seasonalBait4"] = block
    dump(DOD, dod)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))

    # Expand legacy festival period so new weekends fit without overlap.
    for e in data["seasonalEvents"]["events"]:
        e["periodTicks"] = PERIOD

    upsert_list(data["seasonalEvents"]["events"], NEW_EVENTS)
    upsert_list(data["customers"], NEW_CUSTOMERS)
    upsert_list(data["contracts"]["templates"], NEW_CONTRACTS)
    upsert_list(data["bait"], NEW_BAITS)

    mastery = data["fishingMastery"]
    mastery.update(MASTERY_DEPTH)
    upsert_list(mastery["techniques"], NEW_TECHNIQUES)
    upsert_list(mastery["coachingTips"], NEW_TIPS)

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

    print(
        f"OK Phase 16 seasonal/bait/mastery: events={len(data['seasonalEvents']['events'])} "
        f"baits={len(data['bait'])} maxLevel={mastery['maxLevel']} "
        f"techniques={len(mastery['techniques'])} tips={len(mastery['coachingTips'])}"
    )


if __name__ == "__main__":
    main()
