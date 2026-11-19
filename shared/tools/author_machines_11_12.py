#!/usr/bin/env python3
"""
Finish 4.0 Phase 13 — author machine classes 11–12 (Harbor braiser + Harbor glazer)
with recipes, products, unlock plots on all 10 harbors, and ship catalogs.

Usage:
  python3 shared/tools/author_machines_11_12.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "machines-11-12.json"
PARITY = ROOT / "fixtures" / "parity-machines-11-12.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
PRODUCT_ART = ROOT / "ship" / "product-art.json"
PRODUCT_ART_PARITY = ROOT / "fixtures" / "parity-product-art.json"
EN = ROOT / "i18n" / "content-strings.en.json"
ES = ROOT / "i18n" / "content-strings.es.json"
PT = ROOT / "i18n" / "content-strings.pt.json"
FR = ROOT / "i18n" / "content-strings.fr.json"
HT = ROOT / "i18n" / "content-strings.ht.json"
IT = ROOT / "i18n" / "content-strings.it.json"
CA = ROOT / "i18n" / "content-strings.ca.json"
RU = ROOT / "i18n" / "content-strings.ru.json"

NEW_PRODUCTS = [
    {
        "id": "product.braised_fillet",
        "name": "Braised fillet",
        "carryUnits": 1,
        "unitPrice": 24,
        "spoilTier": 2,
        "asset": "models/product_braised_fillet.glb",
    },
    {
        "id": "product.braise_stew",
        "name": "Braise stew",
        "carryUnits": 1,
        "unitPrice": 16,
        "spoilTier": 3,
        "asset": "models/product_braise_stew.glb",
    },
    {
        "id": "product.braise_carton",
        "name": "Braise carton",
        "carryUnits": 3,
        "unitPrice": 96,
        "spoilTier": 2,
        "asset": "models/product_braise_carton.glb",
    },
    {
        "id": "product.glazed_fillet",
        "name": "Glazed fillet",
        "carryUnits": 1,
        "unitPrice": 25,
        "spoilTier": 2,
        "asset": "models/product_glazed_fillet.glb",
    },
    {
        "id": "product.glaze_skewer",
        "name": "Glaze skewer",
        "carryUnits": 1,
        "unitPrice": 15,
        "spoilTier": 3,
        "asset": "models/product_glaze_skewer.glb",
    },
    {
        "id": "product.glaze_carton",
        "name": "Glaze carton",
        "carryUnits": 3,
        "unitPrice": 98,
        "spoilTier": 2,
        "asset": "models/product_glaze_carton.glb",
    },
]

BRAISER_RECIPES = [
    {
        "id": "recipe.braise_fillet",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.braised_fillet", "quantity": 1}],
        "durationTicks": 115,
    },
    {
        "id": "recipe.braise_portion",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.braise_stew", "quantity": 1}],
        "durationTicks": 95,
    },
    {
        "id": "recipe.braise_cedar",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "species.cedar_smelt", "quantity": 1}],
        "outputs": [{"item": "product.braised_fillet", "quantity": 2}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.braise_veil",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "species.veil_skate", "quantity": 1}],
        "outputs": [{"item": "product.braise_stew", "quantity": 2}],
        "durationTicks": 130,
    },
    {
        "id": "recipe.braise_plaza",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "species.plaza_tuna", "quantity": 1}],
        "outputs": [{"item": "product.braised_fillet", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.pack_braise_carton",
        "machine": "machine.harbor_braiser",
        "inputs": [{"item": "product.braised_fillet", "quantity": 4}],
        "outputs": [{"item": "product.braise_carton", "quantity": 1}],
        "durationTicks": 150,
    },
]

GLAZER_RECIPES = [
    {
        "id": "recipe.glaze_fillet",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.glazed_fillet", "quantity": 1}],
        "durationTicks": 110,
    },
    {
        "id": "recipe.glaze_portion",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.glaze_skewer", "quantity": 1}],
        "durationTicks": 90,
    },
    {
        "id": "recipe.glaze_prism",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "species.prism_shad", "quantity": 1}],
        "outputs": [{"item": "product.glazed_fillet", "quantity": 2}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.glaze_ruby",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "species.ruby_hawk", "quantity": 1}],
        "outputs": [{"item": "product.glaze_skewer", "quantity": 2}],
        "durationTicks": 120,
    },
    {
        "id": "recipe.glaze_aurora",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "species.aurora_jack", "quantity": 1}],
        "outputs": [{"item": "product.glazed_fillet", "quantity": 2}],
        "durationTicks": 135,
    },
    {
        "id": "recipe.pack_glaze_carton",
        "machine": "machine.harbor_glazer",
        "inputs": [{"item": "product.glazed_fillet", "quantity": 4}],
        "outputs": [{"item": "product.glaze_carton", "quantity": 1}],
        "durationTicks": 145,
    },
]

NEW_MACHINES = [
    {
        "id": "machine.harbor_braiser",
        "name": "Harbor braiser",
        "recipes": [r["id"] for r in BRAISER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
    {
        "id": "machine.harbor_glazer",
        "name": "Harbor glazer",
        "recipes": [r["id"] for r in GLAZER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
]

NEW_UPGRADES = [
    {
        "id": "upgrade.harbor_braiser",
        "name": "Harbor braiser",
        "description": "Install a braiser line for braised fillets, stews, and braise cartons.",
        "cost": 260,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_press"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_braiser"},
    },
    {
        "id": "upgrade.harbor_glazer",
        "name": "Harbor glazer",
        "description": "Install a glazer line for glazed fillets, glaze skewers, and glaze cartons.",
        "cost": 280,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_pickler"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_glazer"},
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
}

I18N = {
    "en": {
        "machine.harbor_braiser": "Harbor braiser",
        "machine.harbor_glazer": "Harbor glazer",
        "upgrade.harbor_braiser": "Harbor braiser",
        "upgrade.harbor_glazer": "Harbor glazer",
        **{p["id"]: p["name"] for p in NEW_PRODUCTS},
    },
    "es": {
        "machine.harbor_braiser": "Braseadora del puerto",
        "machine.harbor_glazer": "Glaseadora del puerto",
        "upgrade.harbor_braiser": "Braseadora del puerto",
        "upgrade.harbor_glazer": "Glaseadora del puerto",
        "product.braised_fillet": "Filete braseado",
        "product.braise_stew": "Guiso braseado",
        "product.braise_carton": "Cartón braseado",
        "product.glazed_fillet": "Filete glaseado",
        "product.glaze_skewer": "Brocheta glaseada",
        "product.glaze_carton": "Cartón glaseado",
    },
    "pt": {
        "machine.harbor_braiser": "Braseador do porto",
        "machine.harbor_glazer": "Glaceador do porto",
        "upgrade.harbor_braiser": "Braseador do porto",
        "upgrade.harbor_glazer": "Glaceador do porto",
        "product.braised_fillet": "Filé braseado",
        "product.braise_stew": "Ensopado braseado",
        "product.braise_carton": "Cartão braseado",
        "product.glazed_fillet": "Filé glaceado",
        "product.glaze_skewer": "Espeto glaceado",
        "product.glaze_carton": "Cartão glaceado",
    },
}

PHASE_ZONE_SUFFIXES = (
    "braiser_in",
    "braiser_out",
    "glazer_in",
    "glazer_out",
    "plot_braiser",
    "plot_glazer",
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

    press_in = zones_by[zid(p, "press_in")]
    press_out = zones_by[zid(p, "press_out")]
    pickler_in = zones_by[zid(p, "pickler_in")]
    pickler_out = zones_by[zid(p, "pickler_out")]
    plot_press = zones_by[zid(p, "plot_press")]
    plot_pickler = zones_by[zid(p, "plot_pickler")]

    if family in ("sunrise", "cove"):
        dz_braiser = -3500
        dz_glazer = 3500
    else:
        dz_braiser = -3500
        dz_glazer = -3500

    braiser_in = {**shift_z(press_in, dz_braiser), "id": zid(p, "braiser_in"), "kind": "machine_input"}
    braiser_out = {**shift_z(press_out, dz_braiser), "id": zid(p, "braiser_out"), "kind": "machine_output"}
    glazer_in = {**shift_z(pickler_in, dz_glazer), "id": zid(p, "glazer_in"), "kind": "machine_input"}
    glazer_out = {**shift_z(pickler_out, dz_glazer), "id": zid(p, "glazer_out"), "kind": "machine_output"}
    plot_braiser = {**shift_z(plot_press, dz_braiser), "id": zid(p, "plot_braiser"), "kind": "plot"}
    plot_glazer = {**shift_z(plot_pickler, dz_glazer), "id": zid(p, "plot_glazer"), "kind": "plot"}

    zones = [braiser_in, braiser_out, glazer_in, glazer_out, plot_braiser, plot_glazer]
    obstacles = [
        {"id": fid(sp, "braiser"), **zone_between_io(braiser_in, braiser_out)},
        {"id": fid(sp, "glazer"), **zone_between_io(glazer_in, glazer_out)},
    ]
    stations = [
        {
            "id": sid(sp, "braiser"),
            "machine": "machine.harbor_braiser",
            "inputZone": zid(p, "braiser_in"),
            "outputZone": zid(p, "braiser_out"),
            "requiresUpgrade": "upgrade.harbor_braiser",
        },
        {
            "id": sid(sp, "glazer"),
            "machine": "machine.harbor_glazer",
            "inputZone": zid(p, "glazer_in"),
            "outputZone": zid(p, "glazer_out"),
            "requiresUpgrade": "upgrade.harbor_glazer",
        },
    ]
    plots = [
        {
            "id": plot_id(pp, "braiser"),
            "name": f"{cfg['name']} braiser pad",
            "description": "Expansion marker for the harbor braiser line.",
            "zone": zid(p, "plot_braiser"),
            "grantsUpgrade": "upgrade.harbor_braiser",
        },
        {
            "id": plot_id(pp, "glazer"),
            "name": f"{cfg['name']} glazer pad",
            "description": "Expansion marker for the harbor glazer line.",
            "zone": zid(p, "plot_glazer"),
            "grantsUpgrade": "upgrade.harbor_glazer",
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
        "phase": 13,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.machines_11_12.v1",
        "description": (
            "Finish 4.0 Phase 13 — author machine classes 11–12 (Harbor braiser + Harbor glazer) "
            "with recipe graphs, unlock plots on all 10 harbors, and product SKUs. Schema stays 24."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "machineCount": 12,
        "newMachineCount": 2,
        "machines1112Marker": "authored-finish-4.0-phase-13",
        "newMachines": [
            {
                "id": "machine.harbor_braiser",
                "name": "Harbor braiser",
                "unlockUpgrade": "upgrade.harbor_braiser",
                "recipeCount": 6,
                "sampleRecipe": "recipe.braise_fillet",
                "products": [
                    "product.braised_fillet",
                    "product.braise_stew",
                    "product.braise_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/braiser.glb",
            },
            {
                "id": "machine.harbor_glazer",
                "name": "Harbor glazer",
                "unlockUpgrade": "upgrade.harbor_glazer",
                "recipeCount": 6,
                "sampleRecipe": "recipe.glaze_fillet",
                "products": [
                    "product.glazed_fillet",
                    "product.glaze_skewer",
                    "product.glaze_carton",
                ],
                "moduleGlb": "shared/assets/models/modules/glazer.glb",
            },
        ],
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-machines-11-12.json",
        "authorTool": "shared/tools/author_machines_11_12.py",
        "validateScript": "npm run machines1112:validate",
        "checklist": [
            "content-pack has 12 machine classes including harbor_braiser and harbor_glazer",
            "Unlock upgrades + expansion plots on all 10 harbors",
            "Recipe graph produces new retail/wholesale SKUs",
            "Product + module GLBs regenerated; harbor blockouts refreshed",
            "Kickoff baseline.machines = 12; machinesRemaining = 0",
            "machines1112:validate green in CI",
            "schema stays 24",
        ],
        "preflightGates": [
            "shared/ship/machines-11-12.json",
            "shared/fixtures/parity-machines-11-12.json",
            "shared/ship/finish-4.0-kickoff.json",
            "shared/tools/author_machines_11_12.py",
            "shared/assets/models/modules/braiser.glb",
            "shared/assets/models/modules/glazer.glb",
            "shared/assets/models/product_braised_fillet.glb",
            "shared/assets/models/product_glazed_fillet.glb",
            "web/src/ship/machines1112.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Machines1112.kt",
            "web/scripts/validate-machines-11-12.ts",
        ],
    }
    dump(SHIP, catalog)

    # Resolve sunrise braiser walk target from zones after mutation.
    sunrise = next(h for h in data["harbors"] if h["id"] == "harbor.sunrise_pier")
    zin = next(z for z in sunrise["zones"] if z["id"] == "zone.braiser_in")
    walk = {
        "x": (zin["minX"] + zin["maxX"]) // 2,
        "z": (zin["minZ"] + zin["maxZ"]) // 2,
        "expectZone": "zone.braiser_in",
    }

    parity = {
        "schema": "fish.fixtures.parity_machines_11_12.v1",
        "machines1112Marker": "authored-finish-4.0-phase-13",
        "phase": 13,
        "plan": "30_finish_4.0",
        "description": (
            "Finish 4.0 Phase 13: unlock harbor braiser via sunrise plot, process fillet → "
            "braised_fillet; assert 12 machine classes."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 41313,
        "setup": {
            "coins": 1200,
            "completedQuests": ["quest.specialty_kitchen"],
            "ownedUpgrades": ["upgrade.harbor_steamer", "upgrade.harbor_press"],
        },
        "build": {
            "plotId": "plot.sunrise_braiser",
            "requestId": "p13-braiser-build",
            "expectUpgrade": "upgrade.harbor_braiser",
            "stationId": "station.braiser_1",
        },
        "process": {
            "walkTo": walk,
            "bagAfterUnlock": {"product.fillet": 1},
            "preferredRecipeId": "recipe.braise_fillet",
            "expectOutput": {"item": "product.braised_fillet", "quantity": 1},
        },
        "expectFinal": {
            "machineCount": 12,
            "ownedUpgrade": "upgrade.harbor_braiser",
            "schemaVersion": 24,
            "contentVersion": "3.0.0",
            "gates": [
                "machines_12",
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
    kick["baseline"]["machines"] = 12
    kick["gaps"]["machinesRemaining"] = 0
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text())
    dod["quotas"]["machineClasses"] = 12
    dod["notes"] = (
        "Finish 4.0 Phase 13 machines-11-12 complete (12 machines, braiser + glazer recipes/UI pads); "
        "Phases 1–12 remain green. Frozen 3.0.0 / schema 24. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 13,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "machines1112Marker": "authored-finish-4.0-phase-13",
        "catalog": "shared/ship/machines-11-12.json",
        "parityFixture": "shared/fixtures/parity-machines-11-12.json",
        "validateScript": "npm run machines1112:validate",
        "checklist": [
            "12 machine classes including braiser + glazer",
            "recipes + products + plots on all 10 harbors",
            "kickoff machinesRemaining = 0",
            "machines1112:validate green in CI",
        ],
    }
    if "machines1112" not in dod:
        # Insert before machines910 if present.
        out = {}
        for k, v in dod.items():
            if k == "machines910":
                out["machines1112"] = block
            out[k] = v
        if "machines1112" not in out:
            out["machines1112"] = block
        dod = out
    else:
        dod["machines1112"] = block
    dump(DOD, dod)

    # Refresh product-art authored list to include new products.
    art = json.loads(PRODUCT_ART.read_text())
    products = data["products"]
    art["authoredProductTarget"] = len(products)
    art["description"] = (
        "Finish 4.0 Phase 10/13 — product/cosmetic art presentation pass. Authors multi-part "
        f"ProductArt meshes for all {len(products)} products, authored cosmetic banner GLBs for 12 "
        "IAP banners, and counter tray presentation depth. Closes gaps.productArtIncomplete. "
        "Schema stays 24 / content 3.0.0."
    )
    by_id = {e["productId"]: e for e in art.get("authoredProducts", [])}
    for p in products:
        kind = "carton" if "carton" in p["id"] else (
            "skewer" if "skewer" in p["id"] else (
                "soup" if "stew" in p["id"] else (
                    "fillet" if "fillet" in p["id"] else "portion"
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


def main() -> None:
    data = json.loads(PACK.read_text())

    upsert_list(data["products"], NEW_PRODUCTS)
    upsert_list(data["machines"], NEW_MACHINES)
    upsert_list(data["recipes"], BRAISER_RECIPES + GLAZER_RECIPES)
    upsert_list(data["upgrades"], NEW_UPGRADES)

    retail_add = [
        "product.braised_fillet",
        "product.braise_stew",
        "product.glazed_fillet",
        "product.glaze_skewer",
    ]
    wholesale_add = ["product.braise_carton", "product.glaze_carton"]

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
            if s["machine"] not in ("machine.harbor_braiser", "machine.harbor_glazer")
        ]
        h["plots"] = [
            pl
            for pl in h.get("plots", [])
            if pl.get("grantsUpgrade") not in ("upgrade.harbor_braiser", "upgrade.harbor_glazer")
        ]
        h["obstacles"] = [
            o
            for o in h.get("obstacles", [])
            if "braiser" not in o["id"] and "glazer" not in o["id"]
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
        if cust["id"] == "customer.local_shopper" and "product.braise_stew" not in ids:
            prefs.append({"item": "product.braise_stew", "weight": 10})
        if cust["id"] == "customer.family_buyer" and "product.glaze_skewer" not in ids:
            prefs.append({"item": "product.glaze_skewer", "weight": 10})
        if cust["id"] == "customer.premium_visitor" and "product.braised_fillet" not in ids:
            prefs.append({"item": "product.braised_fillet", "weight": 13})
        if cust["id"] == "customer.premium_visitor" and "product.glazed_fillet" not in ids:
            prefs.append({"item": "product.glazed_fillet", "weight": 13})

    dump(PACK, data)

    for locale, path in (("en", EN), ("es", ES), ("pt", PT)):
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    write_ship(data)
    update_kickoff_dod_product_art(data)

    print(
        f"OK Phase 13 machines 11–12: machines={len(data['machines'])} "
        f"recipes={len(data['recipes'])} products={len(data['products'])} "
        f"upgrades={len(data['upgrades'])} harbors={len(data['harbors'])}"
    )


if __name__ == "__main__":
    main()
