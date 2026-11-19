#!/usr/bin/env python3
"""
Finish 6.0 Phase 9 — author machine classes 15–16 (Harbor roaster + Harbor fermenter)
with recipes, products, unlock plots on all 14 harbors, and ship catalogs.

Usage:
  python3 shared/tools/author_machines_15_16.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/machines-15-16.json"
PARITY = ROOT / "shared/fixtures/parity-machines-15-16.json"
KICKOFF = ROOT / "shared/ship/finish-6.0-kickoff.json"
PARITY_F6 = ROOT / "shared/fixtures/parity-finish-6.0-kickoff.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
PRODUCT_ART = ROOT / "shared/ship/product-art.json"
PRODUCT_ART_PARITY = ROOT / "shared/fixtures/parity-product-art.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"
LICENSES = ROOT / "shared/store/licenses.json"
I18N_PATHS = {
    "en": ROOT / "shared/i18n/content-strings.en.json",
    "es": ROOT / "shared/i18n/content-strings.es.json",
    "pt": ROOT / "shared/i18n/content-strings.pt.json",
    "fr": ROOT / "shared/i18n/content-strings.fr.json",
    "ht": ROOT / "shared/i18n/content-strings.ht.json",
    "it": ROOT / "shared/i18n/content-strings.it.json",
    "ca": ROOT / "shared/i18n/content-strings.ca.json",
    "ru": ROOT / "shared/i18n/content-strings.ru.json",
}

MARKER = "authored-finish-6.0-phase-9"

NEW_PRODUCTS = [
    {
        "id": "product.roasted_fillet",
        "name": "Roasted fillet",
        "carryUnits": 1,
        "unitPrice": 28,
        "spoilTier": 2,
        "asset": "models/product_roasted_fillet.glb",
    },
    {
        "id": "product.roast_chip",
        "name": "Roast chip",
        "carryUnits": 1,
        "unitPrice": 19,
        "spoilTier": 3,
        "asset": "models/product_roast_chip.glb",
    },
    {
        "id": "product.roast_carton",
        "name": "Roast carton",
        "carryUnits": 3,
        "unitPrice": 108,
        "spoilTier": 2,
        "asset": "models/product_roast_carton.glb",
    },
    {
        "id": "product.fermented_fillet",
        "name": "Fermented fillet",
        "carryUnits": 1,
        "unitPrice": 29,
        "spoilTier": 1,
        "asset": "models/product_fermented_fillet.glb",
    },
    {
        "id": "product.ferment_paste",
        "name": "Ferment paste",
        "carryUnits": 1,
        "unitPrice": 20,
        "spoilTier": 2,
        "asset": "models/product_ferment_paste.glb",
    },
    {
        "id": "product.ferment_carton",
        "name": "Ferment carton",
        "carryUnits": 3,
        "unitPrice": 112,
        "spoilTier": 1,
        "asset": "models/product_ferment_carton.glb",
    },
]

ROASTER_RECIPES = [
    {
        "id": "recipe.roast_fillet",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.roasted_fillet", "quantity": 1}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.roast_portion",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.roast_chip", "quantity": 1}],
        "durationTicks": 105,
    },
    {
        "id": "recipe.roast_saffron",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "species.saffron_sole", "quantity": 1}],
        "outputs": [{"item": "product.roasted_fillet", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.roast_kiln",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "species.kiln_shad", "quantity": 1}],
        "outputs": [{"item": "product.roast_chip", "quantity": 2}],
        "durationTicks": 135,
    },
    {
        "id": "recipe.roast_magma",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "species.magma_kiln", "quantity": 1}],
        "outputs": [{"item": "product.roasted_fillet", "quantity": 2}],
        "durationTicks": 150,
    },
    {
        "id": "recipe.pack_roast_carton",
        "machine": "machine.harbor_roaster",
        "inputs": [{"item": "product.roasted_fillet", "quantity": 4}],
        "outputs": [{"item": "product.roast_carton", "quantity": 1}],
        "durationTicks": 160,
    },
]

FERMENTER_RECIPES = [
    {
        "id": "recipe.ferment_fillet",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.fermented_fillet", "quantity": 1}],
        "durationTicks": 130,
    },
    {
        "id": "recipe.ferment_portion",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.ferment_paste", "quantity": 1}],
        "durationTicks": 110,
    },
    {
        "id": "recipe.ferment_mist",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "species.mist_goby", "quantity": 1}],
        "outputs": [{"item": "product.fermented_fillet", "quantity": 2}],
        "durationTicks": 145,
    },
    {
        "id": "recipe.ferment_veil",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "species.veil_goby", "quantity": 1}],
        "outputs": [{"item": "product.ferment_paste", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.ferment_plaza",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "species.plaza_bass", "quantity": 1}],
        "outputs": [{"item": "product.fermented_fillet", "quantity": 2}],
        "durationTicks": 155,
    },
    {
        "id": "recipe.pack_ferment_carton",
        "machine": "machine.harbor_fermenter",
        "inputs": [{"item": "product.fermented_fillet", "quantity": 4}],
        "outputs": [{"item": "product.ferment_carton", "quantity": 1}],
        "durationTicks": 165,
    },
]

NEW_MACHINES = [
    {
        "id": "machine.harbor_roaster",
        "name": "Harbor roaster",
        "recipes": [r["id"] for r in ROASTER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
    {
        "id": "machine.harbor_fermenter",
        "name": "Harbor fermenter",
        "recipes": [r["id"] for r in FERMENTER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
]

NEW_UPGRADES = [
    {
        "id": "upgrade.harbor_roaster",
        "name": "Harbor roaster",
        "description": "Install a roaster line for roasted fillets, roast chips, and roast cartons.",
        "cost": 340,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_poacher"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_roaster"},
    },
    {
        "id": "upgrade.harbor_fermenter",
        "name": "Harbor fermenter",
        "description": "Install a fermenter line for fermented fillets, pastes, and ferment cartons.",
        "cost": 360,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_canner"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_fermenter"},
    },
]

HARBORS = {
    "harbor.sunrise_pier": {
        "family": "sunrise",
        "prefix": "",
        "station_prefix": "",
        "plot_prefix": "sunrise",
        "name": "Sunrise",
    },
    "harbor.moon_cove": {
        "family": "cove",
        "prefix": "cove_",
        "station_prefix": "cove_",
        "plot_prefix": "cove",
        "name": "Moon Cove",
    },
    "harbor.obsidian_jetty": {
        "family": "vertical",
        "prefix": "jetty_",
        "station_prefix": "jetty_",
        "plot_prefix": "jetty",
        "name": "Obsidian Jetty",
    },
    "harbor.northlight_harbor": {
        "family": "vertical",
        "prefix": "nl_",
        "station_prefix": "nl_",
        "plot_prefix": "nl",
        "name": "Northlight",
    },
    "harbor.grand_marina": {
        "family": "vertical",
        "prefix": "gm_",
        "station_prefix": "gm_",
        "plot_prefix": "gm",
        "name": "Grand Marina",
    },
    "harbor.coral_lagoon": {
        "family": "vertical",
        "prefix": "cl_",
        "station_prefix": "cl_",
        "plot_prefix": "cl",
        "name": "Coral Lagoon",
    },
    "harbor.storm_quay": {
        "family": "vertical",
        "prefix": "sq_",
        "station_prefix": "sq_",
        "plot_prefix": "sq",
        "name": "Storm Quay",
    },
    "harbor.ember_wharf": {
        "family": "vertical",
        "prefix": "ew_",
        "station_prefix": "ew_",
        "plot_prefix": "ew",
        "name": "Ember Wharf",
    },
    "harbor.mist_cove": {
        "family": "vertical",
        "prefix": "mist_",
        "station_prefix": "mist_",
        "plot_prefix": "mist",
        "name": "Mist Cove",
    },
    "harbor.prism_reach": {
        "family": "vertical",
        "prefix": "pr_",
        "station_prefix": "pr_",
        "plot_prefix": "pr",
        "name": "Prism Reach",
    },
    "harbor.aurora_inlet": {
        "family": "vertical",
        "prefix": "au_",
        "station_prefix": "au_",
        "plot_prefix": "au",
        "name": "Aurora Inlet",
    },
    "harbor.tideglass_bay": {
        "family": "vertical",
        "prefix": "tg_",
        "station_prefix": "tg_",
        "plot_prefix": "tg",
        "name": "Tideglass Bay",
    },
    "harbor.saffron_quay": {
        "family": "vertical",
        "prefix": "sf_",
        "station_prefix": "sf_",
        "plot_prefix": "sf",
        "name": "Saffron Quay",
    },
    "harbor.cobalt_sound": {
        "family": "vertical",
        "prefix": "cb_",
        "station_prefix": "cb_",
        "plot_prefix": "cb",
        "name": "Cobalt Sound",
    },
}

I18N = {
    "en": {
        "machine.harbor_roaster": "Harbor roaster",
        "machine.harbor_fermenter": "Harbor fermenter",
        "upgrade.harbor_roaster": "Harbor roaster",
        "upgrade.harbor_fermenter": "Harbor fermenter",
        **{p["id"]: p["name"] for p in NEW_PRODUCTS},
    },
    "es": {
        "machine.harbor_roaster": "Asador del puerto",
        "machine.harbor_fermenter": "Fermentador del puerto",
        "upgrade.harbor_roaster": "Asador del puerto",
        "upgrade.harbor_fermenter": "Fermentador del puerto",
        "product.roasted_fillet": "Filete asado",
        "product.roast_chip": "Chip asado",
        "product.roast_carton": "Cartón asado",
        "product.fermented_fillet": "Filete fermentado",
        "product.ferment_paste": "Pasta fermentada",
        "product.ferment_carton": "Cartón fermentado",
    },
    "pt": {
        "machine.harbor_roaster": "Assador do porto",
        "machine.harbor_fermenter": "Fermentador do porto",
        "upgrade.harbor_roaster": "Assador do porto",
        "upgrade.harbor_fermenter": "Fermentador do porto",
        "product.roasted_fillet": "Filé assado",
        "product.roast_chip": "Chip assado",
        "product.roast_carton": "Cartão assado",
        "product.fermented_fillet": "Filé fermentado",
        "product.ferment_paste": "Pasta fermentada",
        "product.ferment_carton": "Cartão fermentado",
    },
    "fr": {
        "machine.harbor_roaster": "Rôtissoire du port",
        "machine.harbor_fermenter": "Fermenteur du port",
        "upgrade.harbor_roaster": "Rôtissoire du port",
        "upgrade.harbor_fermenter": "Fermenteur du port",
        "product.roasted_fillet": "Filet rôti",
        "product.roast_chip": "Copeau rôti",
        "product.roast_carton": "Carton rôti",
        "product.fermented_fillet": "Filet fermenté",
        "product.ferment_paste": "Pâte fermentée",
        "product.ferment_carton": "Carton fermenté",
    },
    "ht": {
        "machine.harbor_roaster": "Roti pò a",
        "machine.harbor_fermenter": "Fermante pò a",
        "upgrade.harbor_roaster": "Roti pò a",
        "upgrade.harbor_fermenter": "Fermante pò a",
        "product.roasted_fillet": "File roti",
        "product.roast_chip": "Chip roti",
        "product.roast_carton": "Katòn roti",
        "product.fermented_fillet": "File fermente",
        "product.ferment_paste": "Pasta fermente",
        "product.ferment_carton": "Katòn fermente",
    },
    "it": {
        "machine.harbor_roaster": "Arrosto del porto",
        "machine.harbor_fermenter": "Fermentatore del porto",
        "upgrade.harbor_roaster": "Arrosto del porto",
        "upgrade.harbor_fermenter": "Fermentatore del porto",
        "product.roasted_fillet": "Filetto arrostito",
        "product.roast_chip": "Chip arrostito",
        "product.roast_carton": "Cartone arrostito",
        "product.fermented_fillet": "Filetto fermentato",
        "product.ferment_paste": "Pasta fermentata",
        "product.ferment_carton": "Cartone fermentato",
    },
    "ca": {
        "machine.harbor_roaster": "Rostidor del port",
        "machine.harbor_fermenter": "Fermentador del port",
        "upgrade.harbor_roaster": "Rostidor del port",
        "upgrade.harbor_fermenter": "Fermentador del port",
        "product.roasted_fillet": "Filet rostit",
        "product.roast_chip": "Xip rostit",
        "product.roast_carton": "Cartró rostit",
        "product.fermented_fillet": "Filet fermentat",
        "product.ferment_paste": "Pasta fermentada",
        "product.ferment_carton": "Cartró fermentat",
    },
    "ru": {
        "machine.harbor_roaster": "Гаванский ростер",
        "machine.harbor_fermenter": "Гаванский ферментер",
        "upgrade.harbor_roaster": "Гаванский ростер",
        "upgrade.harbor_fermenter": "Гаванский ферментер",
        "product.roasted_fillet": "Жареное филе",
        "product.roast_chip": "Жареный чипс",
        "product.roast_carton": "Коробка жаркого",
        "product.fermented_fillet": "Ферментированное филе",
        "product.ferment_paste": "Фермент-паста",
        "product.ferment_carton": "Коробка фермента",
    },
}

PHASE_ZONE_SUFFIXES = (
    "roaster_in",
    "roaster_out",
    "fermenter_in",
    "fermenter_out",
    "plot_roaster",
    "plot_fermenter",
)


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n")


def zid(prefix: str, stem: str) -> str:
    return f"zone.{prefix}{stem}"


def sid(station_prefix: str, stem: str) -> str:
    if station_prefix == "":
        return f"station.{stem}_1"
    return f"station.{station_prefix}{stem}"


def fid(station_prefix: str, stem: str) -> str:
    if station_prefix == "":
        return f"footprint.{stem}_1"
    return f"footprint.{station_prefix}{stem}"


def plot_id(plot_prefix: str, stem: str) -> str:
    return f"plot.{plot_prefix}_{stem}"


def shift_z(zone: dict, dz: int) -> dict:
    return {
        "minX": zone["minX"],
        "maxX": zone["maxX"],
        "minZ": zone["minZ"] + dz,
        "maxZ": zone["maxZ"] + dz,
    }


def zone_between_io(zin: dict, zout: dict) -> dict:
    xs = sorted([zin["minX"], zin["maxX"], zout["minX"], zout["maxX"]])
    if zin["maxX"] < zout["minX"]:
        return {"minX": zin["maxX"], "maxX": zout["minX"], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}
    if zout["maxX"] < zin["minX"]:
        return {"minX": zout["maxX"], "maxX": zin["minX"], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}
    return {"minX": xs[1], "maxX": xs[2], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}


def layout_for(harbor: dict, cfg: dict) -> dict:
    p = cfg["prefix"]
    sp = cfg["station_prefix"]
    pp = cfg["plot_prefix"]
    family = cfg["family"]
    zones_by = {z["id"]: z for z in harbor["zones"]}

    poacher_in = zones_by[zid(p, "poacher_in")]
    poacher_out = zones_by[zid(p, "poacher_out")]
    canner_in = zones_by[zid(p, "canner_in")]
    canner_out = zones_by[zid(p, "canner_out")]
    plot_poacher = zones_by[zid(p, "plot_poacher")]
    plot_canner = zones_by[zid(p, "plot_canner")]

    if family in ("sunrise", "cove"):
        dz_roaster = -3500
        dz_fermenter = 3500
    else:
        dz_roaster = -3500
        dz_fermenter = -3500

    roaster_in = {**shift_z(poacher_in, dz_roaster), "id": zid(p, "roaster_in"), "kind": "machine_input"}
    roaster_out = {**shift_z(poacher_out, dz_roaster), "id": zid(p, "roaster_out"), "kind": "machine_output"}
    fermenter_in = {**shift_z(canner_in, dz_fermenter), "id": zid(p, "fermenter_in"), "kind": "machine_input"}
    fermenter_out = {
        **shift_z(canner_out, dz_fermenter),
        "id": zid(p, "fermenter_out"),
        "kind": "machine_output",
    }
    plot_roaster = {**shift_z(plot_poacher, dz_roaster), "id": zid(p, "plot_roaster"), "kind": "plot"}
    plot_fermenter = {
        **shift_z(plot_canner, dz_fermenter),
        "id": zid(p, "plot_fermenter"),
        "kind": "plot",
    }

    zones = [roaster_in, roaster_out, fermenter_in, fermenter_out, plot_roaster, plot_fermenter]
    obstacles = [
        {"id": fid(sp, "roaster"), **zone_between_io(roaster_in, roaster_out)},
        {"id": fid(sp, "fermenter"), **zone_between_io(fermenter_in, fermenter_out)},
    ]
    stations = [
        {
            "id": sid(sp, "roaster"),
            "machine": "machine.harbor_roaster",
            "inputZone": zid(p, "roaster_in"),
            "outputZone": zid(p, "roaster_out"),
            "requiresUpgrade": "upgrade.harbor_roaster",
        },
        {
            "id": sid(sp, "fermenter"),
            "machine": "machine.harbor_fermenter",
            "inputZone": zid(p, "fermenter_in"),
            "outputZone": zid(p, "fermenter_out"),
            "requiresUpgrade": "upgrade.harbor_fermenter",
        },
    ]
    plots = [
        {
            "id": plot_id(pp, "roaster"),
            "name": f"{cfg['name']} roaster pad",
            "description": "Expansion marker for the harbor roaster line.",
            "zone": zid(p, "plot_roaster"),
            "grantsUpgrade": "upgrade.harbor_roaster",
        },
        {
            "id": plot_id(pp, "fermenter"),
            "name": f"{cfg['name']} fermenter pad",
            "description": "Expansion marker for the harbor fermenter line.",
            "zone": zid(p, "plot_fermenter"),
            "grantsUpgrade": "upgrade.harbor_fermenter",
        },
    ]
    return {"zones": zones, "stations": stations, "plots": plots, "obstacles": obstacles}


def expand_walkable(harbor: dict, layout: dict) -> None:
    pads = [z for z in layout["zones"] if z["kind"] in ("machine_input", "machine_output", "plot")]
    min_z = min(z["minZ"] for z in pads) - 500
    max_z = max(z["maxZ"] for z in pads) + 500
    min_x = min(z["minX"] for z in pads) - 500
    max_x = max(z["maxX"] for z in pads) + 500
    land = harbor["walkable"][0]
    land["minZ"] = min(land["minZ"], min_z)
    land["maxZ"] = max(land["maxZ"], max_z)
    land["minX"] = min(land["minX"], min_x)
    land["maxX"] = max(land["maxX"], max_x)


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {x[key]: i for i, x in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def write_ship(data: dict) -> None:
    catalog = {
        "phase": 9,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.machines_15_16.v1",
        "description": (
            "Finish 6.0 Phase 9 — author machine classes 15–16 (Harbor roaster + Harbor fermenter) "
            "with recipe graphs, unlock plots on all 14 harbors, and product SKUs. Schema stays 26."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "machineCount": 16,
        "newMachineCount": 2,
        "machines1516Marker": MARKER,
        "newMachines": [
            {
                "id": "machine.harbor_roaster",
                "name": "Harbor roaster",
                "unlockUpgrade": "upgrade.harbor_roaster",
                "recipeCount": 6,
                "sampleRecipe": "recipe.roast_fillet",
                "products": [
                    "product.roasted_fillet",
                    "product.roast_chip",
                    "product.roast_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/roaster.glb",
            },
            {
                "id": "machine.harbor_fermenter",
                "name": "Harbor fermenter",
                "unlockUpgrade": "upgrade.harbor_fermenter",
                "recipeCount": 6,
                "sampleRecipe": "recipe.ferment_fillet",
                "products": [
                    "product.fermented_fillet",
                    "product.ferment_paste",
                    "product.ferment_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/fermenter.glb",
            },
        ],
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-machines-15-16.json",
        "authorTool": "shared/tools/author_machines_15_16.py",
        "validateScript": "npm run machines1516:validate",
        "checklist": [
            "content-pack has 16 machine classes including harbor_roaster and harbor_fermenter",
            "Unlock upgrades + expansion plots on all 14 harbors",
            "Recipe graph produces new retail/wholesale SKUs",
            "Product + module GLBs regenerated; harbor blockouts refreshed",
            "Kickoff machinesRemaining = 0; baseline.machines stays 14",
            "machines1516:validate green in CI",
            "schema stays 26",
        ],
        "preflightGates": [
            "shared/ship/machines-15-16.json",
            "shared/fixtures/parity-machines-15-16.json",
            "shared/ship/finish-6.0-kickoff.json",
            "shared/tools/author_machines_15_16.py",
            "shared/assets/models/modules/roaster.glb",
            "shared/assets/models/modules/fermenter.glb",
            "shared/assets/models/product_roasted_fillet.glb",
            "shared/assets/models/product_fermented_fillet.glb",
            "web/src/ship/machines1516.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1516.kt",
            "web/scripts/validate-machines-15-16.ts",
        ],
    }
    dump(SHIP, catalog)

    sunrise = next(h for h in data["harbors"] if h["id"] == "harbor.sunrise_pier")
    zin = next(z for z in sunrise["zones"] if z["id"] == "zone.roaster_in")
    walk = {
        "x": (zin["minX"] + zin["maxX"]) // 2,
        "z": (zin["minZ"] + zin["maxZ"]) // 2,
        "expectZone": "zone.roaster_in",
    }

    parity = {
        "schema": "fish.fixtures.parity_machines_15_16.v1",
        "machines1516Marker": MARKER,
        "phase": 9,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 9: unlock harbor roaster via sunrise plot, process fillet → "
            "roasted_fillet; assert 16 machine classes."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 61616,
        "setup": {
            "coins": 1800,
            "completedQuests": ["quest.specialty_kitchen"],
            "ownedUpgrades": [
                "upgrade.harbor_steamer",
                "upgrade.harbor_press",
                "upgrade.harbor_braiser",
                "upgrade.harbor_poacher",
            ],
        },
        "build": {
            "plotId": "plot.sunrise_roaster",
            "requestId": "p9-roaster-build",
            "expectUpgrade": "upgrade.harbor_roaster",
            "stationId": "station.roaster_1",
        },
        "process": {
            "walkTo": walk,
            "bagAfterUnlock": {"product.fillet": 1},
            "preferredRecipeId": "recipe.roast_fillet",
            "expectOutput": {"item": "product.roasted_fillet", "quantity": 1},
        },
        "expectFinal": {
            "machineCount": 16,
            "ownedUpgrade": "upgrade.harbor_roaster",
            "schemaVersion": 26,
            "contentVersion": "5.0.0",
            "machinesRemainingClosed": 0,
            "gates": [
                "machines_16",
                "plots_wired",
                "recipes_and_products",
                "module_glbs",
                "kickoff_machines_met",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_product_art(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text())
    # Phase 1 baseline stays locked; remaining closes.
    kick["gaps"]["machinesRemaining"] = 0
    dump(KICKOFF, kick)

    if PARITY_F6.is_file():
        pfx = json.loads(PARITY_F6.read_text())
        pfx.setdefault("expect", {})["openGapFlagMin"] = 17
        dump(PARITY_F6, pfx)

    dod = json.loads(DOD.read_text())
    dod["quotas"]["machineClasses"] = 16
    dod["machines1516"] = {
        "phase": 9,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "machines1516Marker": MARKER,
        "catalog": "shared/ship/machines-15-16.json",
        "parityFixture": "shared/fixtures/parity-machines-15-16.json",
        "validateScript": "npm run machines1516:validate",
        "checklist": [
            "16 machine classes including roaster + fermenter",
            "recipes + products + plots on all 14 harbors",
            "kickoff machinesRemaining = 0",
            "machines1516:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text())
    listing["machines1516Phase"] = 9
    listing["machines1516Catalog"] = "shared/ship/machines-15-16.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text())
    pin["machines1516"] = "shared/ship/machines-15-16.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-machines-15-16.json" not in fixtures:
        fixtures.append("parity-machines-15-16.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    art = json.loads(PRODUCT_ART.read_text())
    products = data["products"]
    art["authoredProductTarget"] = len(products)
    art["description"] = (
        "Finish 4.0 Phase 10/13 + Finish 5.0 Phase 15 + Finish 6.0 Phase 9 — product/cosmetic "
        f"art presentation pass. Authors multi-part ProductArt meshes for all {len(products)} "
        "products, authored cosmetic banner GLBs, and counter tray presentation depth. "
        "Schema stays 26 / content 5.0.0."
    )
    by_id = {e["productId"]: e for e in art.get("authoredProducts", [])}
    for p in products:
        kind = (
            "carton"
            if "carton" in p["id"]
            else (
                "skewer"
                if "skewer" in p["id"] or "medley" in p["id"]
                else (
                    "soup"
                    if "stew" in p["id"] or "broth" in p["id"] or "paste" in p["id"]
                    else (
                        "chips"
                        if "chip" in p["id"]
                        else ("fillet" if "fillet" in p["id"] else "portion")
                    )
                )
            )
        )
        asset = f"shared/assets/{p['asset']}"
        by_id[p["id"]] = {"productId": p["id"], "kind": kind, "asset": asset}
    art["authoredProducts"] = [by_id[p["id"]] for p in products]
    dump(PRODUCT_ART, art)

    if PRODUCT_ART_PARITY.exists():
        fx = json.loads(PRODUCT_ART_PARITY.read_text())
        fx.setdefault("expect", {})["authoredProductTarget"] = len(products)
        dump(PRODUCT_ART_PARITY, fx)

    if LICENSES.exists():
        lic = json.loads(LICENSES.read_text())
        for rec in lic.get("records", []):
            if rec.get("id") == "product-authored-art":
                paths = sorted(
                    f"shared/assets/{p['asset']}" for p in products if p.get("asset")
                )
                rec["paths"] = paths
                rec["note"] = (
                    "Finish 4.0/5.0/6.0 multi-part ProductArt "
                    f"meshes for all {len(paths)} products."
                )
            if rec.get("id") == "cosmetic-banner-art":
                banner_paths = sorted(
                    e["asset"] for e in art.get("cosmeticBanners", []) if e.get("asset")
                )
                rec["paths"] = banner_paths
                rec["note"] = f"Authored cosmetic banner meshes ({len(banner_paths)})."
        dump(LICENSES, lic)


def main() -> None:
    data = json.loads(PACK.read_text())

    upsert_list(data["products"], NEW_PRODUCTS)
    upsert_list(data["machines"], NEW_MACHINES)
    upsert_list(data["recipes"], ROASTER_RECIPES + FERMENTER_RECIPES)
    upsert_list(data["upgrades"], NEW_UPGRADES)

    retail_add = [
        "product.roasted_fillet",
        "product.roast_chip",
        "product.fermented_fillet",
        "product.ferment_paste",
    ]
    wholesale_add = ["product.roast_carton", "product.ferment_carton"]

    missing = [h["id"] for h in data["harbors"] if h["id"] not in HARBORS]
    if missing:
        raise SystemExit(f"missing harbor layout configs: {missing}")

    for h in data["harbors"]:
        cfg = HARBORS[h["id"]]
        h["zones"] = [
            z
            for z in h["zones"]
            if not any(z["id"].endswith(suf) or z["id"].endswith("_" + suf) for suf in PHASE_ZONE_SUFFIXES)
        ]
        h["stations"] = [
            s
            for s in h["stations"]
            if s["machine"] not in ("machine.harbor_roaster", "machine.harbor_fermenter")
        ]
        h["plots"] = [
            pl
            for pl in h.get("plots", [])
            if pl.get("grantsUpgrade") not in ("upgrade.harbor_roaster", "upgrade.harbor_fermenter")
        ]
        h["obstacles"] = [
            o
            for o in h.get("obstacles", [])
            if "roaster" not in o["id"] and "fermenter" not in o["id"]
        ]

        layout = layout_for(h, cfg)
        expand_walkable(h, layout)
        h["zones"].extend(layout["zones"])
        h["stations"].extend(layout["stations"])
        h.setdefault("plots", []).extend(layout["plots"])
        h.setdefault("obstacles", []).extend(layout["obstacles"])

        for c in h.get("counters", []):
            kind = c.get("kind", "retail")
            prods = c.setdefault("products", [])
            add = wholesale_add if kind == "wholesale" else retail_add
            for item in add:
                if item not in prods:
                    prods.append(item)

    for cust in data.get("customers", []):
        prefs = cust.get("preferredProducts")
        if not isinstance(prefs, list):
            continue
        ids = {p["item"] for p in prefs if isinstance(p, dict)}
        if cust["id"] == "customer.local_shopper" and "product.roast_chip" not in ids:
            prefs.append({"item": "product.roast_chip", "weight": 10})
        if cust["id"] == "customer.family_buyer" and "product.ferment_paste" not in ids:
            prefs.append({"item": "product.ferment_paste", "weight": 10})
        if cust["id"] == "customer.premium_visitor" and "product.roasted_fillet" not in ids:
            prefs.append({"item": "product.roasted_fillet", "weight": 13})
        if cust["id"] == "customer.premium_visitor" and "product.fermented_fillet" not in ids:
            prefs.append({"item": "product.fermented_fillet", "weight": 13})

    dump(PACK, data)

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    write_ship(data)
    update_kickoff_dod_product_art(data)

    phase9 = next((p for p in json.loads(KICKOFF.read_text()).get("phases", []) if p.get("phase") == 9), None)
    if not phase9 or phase9.get("validate") != "machines1516:validate":
        raise SystemExit("kickoff phase 9 must validate via machines1516:validate")

    print(
        f"OK Phase 9 machines 15–16: machines={len(data['machines'])} "
        f"recipes={len(data['recipes'])} products={len(data['products'])} "
        f"upgrades={len(data['upgrades'])} harbors={len(data['harbors'])}"
    )


if __name__ == "__main__":
    main()
