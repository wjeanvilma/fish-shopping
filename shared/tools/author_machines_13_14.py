#!/usr/bin/env python3
"""
Finish 5.0 Phase 15 — author machine classes 13–14 (Harbor poacher + Harbor canner)
with recipes, products, unlock plots on all 12 harbors, and ship catalogs.

Usage:
  python3 shared/tools/author_machines_13_14.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/machines-13-14.json"
PARITY = ROOT / "shared/fixtures/parity-machines-13-14.json"
KICKOFF = ROOT / "shared/ship/finish-5.0-kickoff.json"
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

MARKER = "authored-finish-5.0-phase-15"

NEW_PRODUCTS = [
    {
        "id": "product.poached_fillet",
        "name": "Poached fillet",
        "carryUnits": 1,
        "unitPrice": 26,
        "spoilTier": 2,
        "asset": "models/product_poached_fillet.glb",
    },
    {
        "id": "product.poach_broth",
        "name": "Poach broth",
        "carryUnits": 1,
        "unitPrice": 17,
        "spoilTier": 3,
        "asset": "models/product_poach_broth.glb",
    },
    {
        "id": "product.poach_carton",
        "name": "Poach carton",
        "carryUnits": 3,
        "unitPrice": 100,
        "spoilTier": 2,
        "asset": "models/product_poach_carton.glb",
    },
    {
        "id": "product.canned_fillet",
        "name": "Canned fillet",
        "carryUnits": 1,
        "unitPrice": 27,
        "spoilTier": 1,
        "asset": "models/product_canned_fillet.glb",
    },
    {
        "id": "product.can_medley",
        "name": "Can medley",
        "carryUnits": 1,
        "unitPrice": 18,
        "spoilTier": 2,
        "asset": "models/product_can_medley.glb",
    },
    {
        "id": "product.can_carton",
        "name": "Can carton",
        "carryUnits": 3,
        "unitPrice": 104,
        "spoilTier": 1,
        "asset": "models/product_can_carton.glb",
    },
]

POACHER_RECIPES = [
    {
        "id": "recipe.poach_fillet",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.poached_fillet", "quantity": 1}],
        "durationTicks": 120,
    },
    {
        "id": "recipe.poach_portion",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.poach_broth", "quantity": 1}],
        "durationTicks": 100,
    },
    {
        "id": "recipe.poach_aurora",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "species.aurora_cod", "quantity": 1}],
        "outputs": [{"item": "product.poached_fillet", "quantity": 2}],
        "durationTicks": 135,
    },
    {
        "id": "recipe.poach_veil",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "species.veil_shad", "quantity": 1}],
        "outputs": [{"item": "product.poach_broth", "quantity": 2}],
        "durationTicks": 130,
    },
    {
        "id": "recipe.poach_north",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "species.aurora_north", "quantity": 1}],
        "outputs": [{"item": "product.poached_fillet", "quantity": 2}],
        "durationTicks": 145,
    },
    {
        "id": "recipe.pack_poach_carton",
        "machine": "machine.harbor_poacher",
        "inputs": [{"item": "product.poached_fillet", "quantity": 4}],
        "outputs": [{"item": "product.poach_carton", "quantity": 1}],
        "durationTicks": 155,
    },
]

CANNER_RECIPES = [
    {
        "id": "recipe.can_fillet",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.canned_fillet", "quantity": 1}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.can_portion",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.can_medley", "quantity": 1}],
        "durationTicks": 105,
    },
    {
        "id": "recipe.can_brine",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "species.brine_goby", "quantity": 1}],
        "outputs": [{"item": "product.canned_fillet", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.can_crystal",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "species.crystal_brine", "quantity": 1}],
        "outputs": [{"item": "product.can_medley", "quantity": 2}],
        "durationTicks": 135,
    },
    {
        "id": "recipe.can_tide",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "species.tide_bass", "quantity": 1}],
        "outputs": [{"item": "product.canned_fillet", "quantity": 2}],
        "durationTicks": 150,
    },
    {
        "id": "recipe.pack_can_carton",
        "machine": "machine.harbor_canner",
        "inputs": [{"item": "product.canned_fillet", "quantity": 4}],
        "outputs": [{"item": "product.can_carton", "quantity": 1}],
        "durationTicks": 160,
    },
]

NEW_MACHINES = [
    {
        "id": "machine.harbor_poacher",
        "name": "Harbor poacher",
        "recipes": [r["id"] for r in POACHER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
    {
        "id": "machine.harbor_canner",
        "name": "Harbor canner",
        "recipes": [r["id"] for r in CANNER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
]

NEW_UPGRADES = [
    {
        "id": "upgrade.harbor_poacher",
        "name": "Harbor poacher",
        "description": "Install a poacher line for poached fillets, broths, and poach cartons.",
        "cost": 300,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_braiser"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_poacher"},
    },
    {
        "id": "upgrade.harbor_canner",
        "name": "Harbor canner",
        "description": "Install a canner line for canned fillets, medleys, and can cartons.",
        "cost": 320,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_glazer"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_canner"},
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
}

I18N = {
    "en": {
        "machine.harbor_poacher": "Harbor poacher",
        "machine.harbor_canner": "Harbor canner",
        "upgrade.harbor_poacher": "Harbor poacher",
        "upgrade.harbor_canner": "Harbor canner",
        **{p["id"]: p["name"] for p in NEW_PRODUCTS},
    },
    "es": {
        "machine.harbor_poacher": "Escalfador del puerto",
        "machine.harbor_canner": "Enlatadora del puerto",
        "upgrade.harbor_poacher": "Escalfador del puerto",
        "upgrade.harbor_canner": "Enlatadora del puerto",
        "product.poached_fillet": "Filete escalfado",
        "product.poach_broth": "Caldo escalfado",
        "product.poach_carton": "Cartón escalfado",
        "product.canned_fillet": "Filete enlatado",
        "product.can_medley": "Mezcla enlatada",
        "product.can_carton": "Cartón enlatado",
    },
    "pt": {
        "machine.harbor_poacher": "Escalfador do porto",
        "machine.harbor_canner": "Enlatadora do porto",
        "upgrade.harbor_poacher": "Escalfador do porto",
        "upgrade.harbor_canner": "Enlatadora do porto",
        "product.poached_fillet": "Filé escalfado",
        "product.poach_broth": "Caldo escalfado",
        "product.poach_carton": "Cartão escalfado",
        "product.canned_fillet": "Filé enlatado",
        "product.can_medley": "Mistura enlatada",
        "product.can_carton": "Cartão enlatado",
    },
    "fr": {
        "machine.harbor_poacher": "Pocheuse du port",
        "machine.harbor_canner": "Conserverie du port",
        "upgrade.harbor_poacher": "Pocheuse du port",
        "upgrade.harbor_canner": "Conserverie du port",
        "product.poached_fillet": "Filet poché",
        "product.poach_broth": "Bouillon poché",
        "product.poach_carton": "Carton poché",
        "product.canned_fillet": "Filet en conserve",
        "product.can_medley": "Mélange en conserve",
        "product.can_carton": "Carton conserve",
    },
    "ht": {
        "machine.harbor_poacher": "Pocher pò a",
        "machine.harbor_canner": "Kanè pò a",
        "upgrade.harbor_poacher": "Pocher pò a",
        "upgrade.harbor_canner": "Kanè pò a",
        "product.poached_fillet": "File poché",
        "product.poach_broth": "Bouyon poché",
        "product.poach_carton": "Katòn poché",
        "product.canned_fillet": "File nan bwat",
        "product.can_medley": "Melanj nan bwat",
        "product.can_carton": "Katòn bwat",
    },
    "it": {
        "machine.harbor_poacher": "Poché del porto",
        "machine.harbor_canner": "Scatolatrice del porto",
        "upgrade.harbor_poacher": "Poché del porto",
        "upgrade.harbor_canner": "Scatolatrice del porto",
        "product.poached_fillet": "Filetto lessato",
        "product.poach_broth": "Brodo lessato",
        "product.poach_carton": "Cartone lessato",
        "product.canned_fillet": "Filetto in scatola",
        "product.can_medley": "Misto in scatola",
        "product.can_carton": "Cartone in scatola",
    },
    "ca": {
        "machine.harbor_poacher": "Escalfador del port",
        "machine.harbor_canner": "Enllatadora del port",
        "upgrade.harbor_poacher": "Escalfador del port",
        "upgrade.harbor_canner": "Enllatadora del port",
        "product.poached_fillet": "Filet escalfat",
        "product.poach_broth": "Brou escalfat",
        "product.poach_carton": "Cartró escalfat",
        "product.canned_fillet": "Filet enllaunat",
        "product.can_medley": "Mescla enllaunada",
        "product.can_carton": "Cartró enllaunat",
    },
    "ru": {
        "machine.harbor_poacher": "Гаванский пашот",
        "machine.harbor_canner": "Гаванская консервная",
        "upgrade.harbor_poacher": "Гаванский пашот",
        "upgrade.harbor_canner": "Гаванская консервная",
        "product.poached_fillet": "Филе пашот",
        "product.poach_broth": "Бульон пашот",
        "product.poach_carton": "Коробка пашот",
        "product.canned_fillet": "Консервированное филе",
        "product.can_medley": "Консервированный микс",
        "product.can_carton": "Коробка консервов",
    },
}

PHASE_ZONE_SUFFIXES = (
    "poacher_in",
    "poacher_out",
    "canner_in",
    "canner_out",
    "plot_poacher",
    "plot_canner",
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

    braiser_in = zones_by[zid(p, "braiser_in")]
    braiser_out = zones_by[zid(p, "braiser_out")]
    glazer_in = zones_by[zid(p, "glazer_in")]
    glazer_out = zones_by[zid(p, "glazer_out")]
    plot_braiser = zones_by[zid(p, "plot_braiser")]
    plot_glazer = zones_by[zid(p, "plot_glazer")]

    if family in ("sunrise", "cove"):
        dz_poacher = -3500
        dz_canner = 3500
    else:
        dz_poacher = -3500
        dz_canner = -3500

    poacher_in = {**shift_z(braiser_in, dz_poacher), "id": zid(p, "poacher_in"), "kind": "machine_input"}
    poacher_out = {**shift_z(braiser_out, dz_poacher), "id": zid(p, "poacher_out"), "kind": "machine_output"}
    canner_in = {**shift_z(glazer_in, dz_canner), "id": zid(p, "canner_in"), "kind": "machine_input"}
    canner_out = {**shift_z(glazer_out, dz_canner), "id": zid(p, "canner_out"), "kind": "machine_output"}
    plot_poacher = {**shift_z(plot_braiser, dz_poacher), "id": zid(p, "plot_poacher"), "kind": "plot"}
    plot_canner = {**shift_z(plot_glazer, dz_canner), "id": zid(p, "plot_canner"), "kind": "plot"}

    zones = [poacher_in, poacher_out, canner_in, canner_out, plot_poacher, plot_canner]
    obstacles = [
        {"id": fid(sp, "poacher"), **zone_between_io(poacher_in, poacher_out)},
        {"id": fid(sp, "canner"), **zone_between_io(canner_in, canner_out)},
    ]
    stations = [
        {
            "id": sid(sp, "poacher"),
            "machine": "machine.harbor_poacher",
            "inputZone": zid(p, "poacher_in"),
            "outputZone": zid(p, "poacher_out"),
            "requiresUpgrade": "upgrade.harbor_poacher",
        },
        {
            "id": sid(sp, "canner"),
            "machine": "machine.harbor_canner",
            "inputZone": zid(p, "canner_in"),
            "outputZone": zid(p, "canner_out"),
            "requiresUpgrade": "upgrade.harbor_canner",
        },
    ]
    plots = [
        {
            "id": plot_id(pp, "poacher"),
            "name": f"{cfg['name']} poacher pad",
            "description": "Expansion marker for the harbor poacher line.",
            "zone": zid(p, "plot_poacher"),
            "grantsUpgrade": "upgrade.harbor_poacher",
        },
        {
            "id": plot_id(pp, "canner"),
            "name": f"{cfg['name']} canner pad",
            "description": "Expansion marker for the harbor canner line.",
            "zone": zid(p, "plot_canner"),
            "grantsUpgrade": "upgrade.harbor_canner",
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
        "phase": 15,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.machines_13_14.v1",
        "description": (
            "Finish 5.0 Phase 15 — author machine classes 13–14 (Harbor poacher + Harbor canner) "
            "with recipe graphs, unlock plots on all 12 harbors, and product SKUs. Schema stays 25."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 25,
        "machineCount": 14,
        "newMachineCount": 2,
        "machines1314Marker": MARKER,
        "newMachines": [
            {
                "id": "machine.harbor_poacher",
                "name": "Harbor poacher",
                "unlockUpgrade": "upgrade.harbor_poacher",
                "recipeCount": 6,
                "sampleRecipe": "recipe.poach_fillet",
                "products": [
                    "product.poached_fillet",
                    "product.poach_broth",
                    "product.poach_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/poacher.glb",
            },
            {
                "id": "machine.harbor_canner",
                "name": "Harbor canner",
                "unlockUpgrade": "upgrade.harbor_canner",
                "recipeCount": 6,
                "sampleRecipe": "recipe.can_fillet",
                "products": [
                    "product.canned_fillet",
                    "product.can_medley",
                    "product.can_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/canner.glb",
            },
        ],
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-machines-13-14.json",
        "authorTool": "shared/tools/author_machines_13_14.py",
        "validateScript": "npm run machines1314:validate",
        "checklist": [
            "content-pack has 14 machine classes including harbor_poacher and harbor_canner",
            "Unlock upgrades + expansion plots on all 12 harbors",
            "Recipe graph produces new retail/wholesale SKUs",
            "Product + module GLBs regenerated; harbor blockouts refreshed",
            "Kickoff baseline.machines = 14; machinesRemaining = 0",
            "machines1314:validate green in CI",
            "schema stays 25",
        ],
        "preflightGates": [
            "shared/ship/machines-13-14.json",
            "shared/fixtures/parity-machines-13-14.json",
            "shared/ship/finish-5.0-kickoff.json",
            "shared/tools/author_machines_13_14.py",
            "shared/assets/models/modules/poacher.glb",
            "shared/assets/models/modules/canner.glb",
            "shared/assets/models/product_poached_fillet.glb",
            "shared/assets/models/product_canned_fillet.glb",
            "web/src/ship/machines1314.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1314.kt",
            "web/scripts/validate-machines-13-14.ts",
        ],
    }
    dump(SHIP, catalog)

    sunrise = next(h for h in data["harbors"] if h["id"] == "harbor.sunrise_pier")
    zin = next(z for z in sunrise["zones"] if z["id"] == "zone.poacher_in")
    walk = {
        "x": (zin["minX"] + zin["maxX"]) // 2,
        "z": (zin["minZ"] + zin["maxZ"]) // 2,
        "expectZone": "zone.poacher_in",
    }

    parity = {
        "schema": "fish.fixtures.parity_machines_13_14.v1",
        "machines1314Marker": MARKER,
        "phase": 15,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 15: unlock harbor poacher via sunrise plot, process fillet → "
            "poached_fillet; assert 14 machine classes."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 51515,
        "setup": {
            "coins": 1600,
            "completedQuests": ["quest.specialty_kitchen"],
            "ownedUpgrades": [
                "upgrade.harbor_steamer",
                "upgrade.harbor_press",
                "upgrade.harbor_braiser",
            ],
        },
        "build": {
            "plotId": "plot.sunrise_poacher",
            "requestId": "p15-poacher-build",
            "expectUpgrade": "upgrade.harbor_poacher",
            "stationId": "station.poacher_1",
        },
        "process": {
            "walkTo": walk,
            "bagAfterUnlock": {"product.fillet": 1},
            "preferredRecipeId": "recipe.poach_fillet",
            "expectOutput": {"item": "product.poached_fillet", "quantity": 1},
        },
        "expectFinal": {
            "machineCount": 14,
            "ownedUpgrade": "upgrade.harbor_poacher",
            "schemaVersion": 25,
            "contentVersion": "4.0.0",
            "gates": [
                "machines_14",
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
    kick["baseline"]["machines"] = 14
    kick["gaps"]["machinesRemaining"] = 0
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text())
    dod["quotas"]["machineClasses"] = 14
    dod["machines1314"] = {
        "phase": 15,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "machines1314Marker": MARKER,
        "catalog": "shared/ship/machines-13-14.json",
        "parityFixture": "shared/fixtures/parity-machines-13-14.json",
        "validateScript": "npm run machines1314:validate",
        "checklist": [
            "14 machine classes including poacher + canner",
            "recipes + products + plots on all 12 harbors",
            "kickoff machinesRemaining = 0",
            "machines1314:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text())
    listing["machines1314Phase"] = 15
    listing["machines1314Catalog"] = "shared/ship/machines-13-14.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text())
    pin["machines1314"] = "shared/ship/machines-13-14.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-machines-13-14.json" not in fixtures:
        fixtures.append("parity-machines-13-14.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    art = json.loads(PRODUCT_ART.read_text())
    products = data["products"]
    art["authoredProductTarget"] = len(products)
    art["description"] = (
        "Finish 4.0 Phase 10/13 + Finish 5.0 Phase 15 — product/cosmetic art presentation pass. "
        f"Authors multi-part ProductArt meshes for all {len(products)} products, authored cosmetic "
        "banner GLBs, and counter tray presentation depth. Schema stays 25 / content 4.0.0."
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
                    if "stew" in p["id"] or "broth" in p["id"]
                    else ("fillet" if "fillet" in p["id"] else "portion")
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
                    "Finish 4.0 Phase 10/13 + Finish 5.0 Phase 15 multi-part ProductArt "
                    f"meshes for all {len(paths)} products."
                )
                break
        dump(LICENSES, lic)


def main() -> None:
    data = json.loads(PACK.read_text())

    upsert_list(data["products"], NEW_PRODUCTS)
    upsert_list(data["machines"], NEW_MACHINES)
    upsert_list(data["recipes"], POACHER_RECIPES + CANNER_RECIPES)
    upsert_list(data["upgrades"], NEW_UPGRADES)

    retail_add = [
        "product.poached_fillet",
        "product.poach_broth",
        "product.canned_fillet",
        "product.can_medley",
    ]
    wholesale_add = ["product.poach_carton", "product.can_carton"]

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
            if s["machine"] not in ("machine.harbor_poacher", "machine.harbor_canner")
        ]
        h["plots"] = [
            pl
            for pl in h.get("plots", [])
            if pl.get("grantsUpgrade") not in ("upgrade.harbor_poacher", "upgrade.harbor_canner")
        ]
        h["obstacles"] = [
            o
            for o in h.get("obstacles", [])
            if "poacher" not in o["id"] and "canner" not in o["id"]
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
        if cust["id"] == "customer.local_shopper" and "product.poach_broth" not in ids:
            prefs.append({"item": "product.poach_broth", "weight": 10})
        if cust["id"] == "customer.family_buyer" and "product.can_medley" not in ids:
            prefs.append({"item": "product.can_medley", "weight": 10})
        if cust["id"] == "customer.premium_visitor" and "product.poached_fillet" not in ids:
            prefs.append({"item": "product.poached_fillet", "weight": 13})
        if cust["id"] == "customer.premium_visitor" and "product.canned_fillet" not in ids:
            prefs.append({"item": "product.canned_fillet", "weight": 13})

    dump(PACK, data)

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    write_ship(data)
    update_kickoff_dod_product_art(data)

    phase15 = next((p for p in json.loads(KICKOFF.read_text()).get("phases", []) if p.get("phase") == 15), None)
    if not phase15 or phase15.get("validate") != "machines1314:validate":
        raise SystemExit("kickoff phase 15 must validate via machines1314:validate")

    print(
        f"OK Phase 15 machines 13–14: machines={len(data['machines'])} "
        f"recipes={len(data['recipes'])} products={len(data['products'])} "
        f"upgrades={len(data['upgrades'])} harbors={len(data['harbors'])}"
    )


if __name__ == "__main__":
    main()
