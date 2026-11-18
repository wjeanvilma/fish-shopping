#!/usr/bin/env python3
"""Finish 3.0 Phase 13 — add harbor press + pickler machines, recipes, products, stations."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
EN = ROOT / "shared/i18n/content-strings.en.json"
ES = ROOT / "shared/i18n/content-strings.es.json"
PT = ROOT / "shared/i18n/content-strings.pt.json"

NEW_PRODUCTS = [
    {
        "id": "product.pressed_fillet",
        "name": "Pressed fillet",
        "carryUnits": 1,
        "unitPrice": 23,
        "spoilTier": 2,
        "asset": "models/product_pressed_fillet.glb",
    },
    {
        "id": "product.fish_cake",
        "name": "Fish cake",
        "carryUnits": 1,
        "unitPrice": 14,
        "spoilTier": 3,
        "asset": "models/product_fish_cake.glb",
    },
    {
        "id": "product.press_carton",
        "name": "Press carton",
        "carryUnits": 3,
        "unitPrice": 92,
        "spoilTier": 2,
        "asset": "models/product_press_carton.glb",
    },
    {
        "id": "product.pickled_fillet",
        "name": "Pickled fillet",
        "carryUnits": 1,
        "unitPrice": 22,
        "spoilTier": 1,
        "asset": "models/product_pickled_fillet.glb",
    },
    {
        "id": "product.relish_jar",
        "name": "Relish jar",
        "carryUnits": 1,
        "unitPrice": 11,
        "spoilTier": 1,
        "asset": "models/product_relish_jar.glb",
    },
    {
        "id": "product.pickle_carton",
        "name": "Pickle carton",
        "carryUnits": 3,
        "unitPrice": 90,
        "spoilTier": 1,
        "asset": "models/product_pickle_carton.glb",
    },
]

PRESS_RECIPES = [
    {
        "id": "recipe.press_fillet",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.pressed_fillet", "quantity": 1}],
        "durationTicks": 110,
    },
    {
        "id": "recipe.press_portion",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.fish_cake", "quantity": 1}],
        "durationTicks": 85,
    },
    {
        "id": "recipe.press_tang",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "species.lagoon_tang", "quantity": 1}],
        "outputs": [{"item": "product.fish_cake", "quantity": 2}],
        "durationTicks": 120,
    },
    {
        "id": "recipe.press_scad",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "species.parade_scad", "quantity": 1}],
        "outputs": [{"item": "product.pressed_fillet", "quantity": 2}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.press_amberjack",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "species.silk_amberjack", "quantity": 1}],
        "outputs": [{"item": "product.pressed_fillet", "quantity": 2}],
        "durationTicks": 135,
    },
    {
        "id": "recipe.pack_press_carton",
        "machine": "machine.harbor_press",
        "inputs": [{"item": "product.pressed_fillet", "quantity": 4}],
        "outputs": [{"item": "product.press_carton", "quantity": 1}],
        "durationTicks": 145,
    },
]

PICKLER_RECIPES = [
    {
        "id": "recipe.pickle_fillet",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.pickled_fillet", "quantity": 1}],
        "durationTicks": 120,
    },
    {
        "id": "recipe.pickle_portion",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.relish_jar", "quantity": 1}],
        "durationTicks": 90,
    },
    {
        "id": "recipe.pickle_mullet",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "species.copper_mullet", "quantity": 1}],
        "outputs": [{"item": "product.pickled_fillet", "quantity": 2}],
        "durationTicks": 130,
    },
    {
        "id": "recipe.pickle_goby",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "species.glass_goby", "quantity": 1}],
        "outputs": [{"item": "product.relish_jar", "quantity": 2}],
        "durationTicks": 115,
    },
    {
        "id": "recipe.pickle_cuttle",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "species.dusk_cuttle", "quantity": 1}],
        "outputs": [{"item": "product.pickled_fillet", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.pack_pickle_carton",
        "machine": "machine.harbor_pickler",
        "inputs": [{"item": "product.pickled_fillet", "quantity": 4}],
        "outputs": [{"item": "product.pickle_carton", "quantity": 1}],
        "durationTicks": 150,
    },
]

NEW_MACHINES = [
    {
        "id": "machine.harbor_press",
        "name": "Harbor press",
        "recipes": [r["id"] for r in PRESS_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
    {
        "id": "machine.harbor_pickler",
        "name": "Harbor pickler",
        "recipes": [r["id"] for r in PICKLER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
]

NEW_UPGRADES = [
    {
        "id": "upgrade.harbor_press",
        "name": "Harbor press",
        "description": "Install a press line for pressed fillets, fish cakes, and press cartons.",
        "cost": 210,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_steamer"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_press"},
    },
    {
        "id": "upgrade.harbor_pickler",
        "name": "Harbor pickler",
        "description": "Install a pickling line for pickled fillets, relish jars, and pickle cartons.",
        "cost": 240,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_kiln"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_pickler"},
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
}


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

    steam_in = zones_by[zid(p, "steamer_in")]
    steam_out = zones_by[zid(p, "steamer_out")]
    kiln_in = zones_by[zid(p, "kiln_in")]
    kiln_out = zones_by[zid(p, "kiln_out")]
    plot_steam = zones_by[zid(p, "plot_steamer")]
    plot_kiln = zones_by[zid(p, "plot_kiln")]

    if family in ("sunrise", "cove"):
        # Press south of steamer; pickler north of kiln (expand walkable accordingly).
        dz_press = -3500
        dz_pickler = 3500
    else:
        # Vertical harbors: both continue further "south" (more negative Z) of steamer/kiln.
        dz_press = -3500
        dz_pickler = -3500

    press_in = {**shift_z(steam_in, dz_press), "id": zid(p, "press_in"), "kind": "machine_input"}
    press_out = {**shift_z(steam_out, dz_press), "id": zid(p, "press_out"), "kind": "machine_output"}
    pickler_in = {**shift_z(kiln_in, dz_pickler), "id": zid(p, "pickler_in"), "kind": "machine_input"}
    pickler_out = {**shift_z(kiln_out, dz_pickler), "id": zid(p, "pickler_out"), "kind": "machine_output"}
    plot_press = {**shift_z(plot_steam, dz_press), "id": zid(p, "plot_press"), "kind": "plot"}
    plot_pickler = {**shift_z(plot_kiln, dz_pickler), "id": zid(p, "plot_pickler"), "kind": "plot"}

    zones = [press_in, press_out, pickler_in, pickler_out, plot_press, plot_pickler]
    obstacles = [
        {"id": fid(sp, "press"), **zone_between_io(press_in, press_out)},
        {"id": fid(sp, "pickler"), **zone_between_io(pickler_in, pickler_out)},
    ]
    stations = [
        {
            "id": sid(sp, "press"),
            "machine": "machine.harbor_press",
            "inputZone": zid(p, "press_in"),
            "outputZone": zid(p, "press_out"),
            "requiresUpgrade": "upgrade.harbor_press",
        },
        {
            "id": sid(sp, "pickler"),
            "machine": "machine.harbor_pickler",
            "inputZone": zid(p, "pickler_in"),
            "outputZone": zid(p, "pickler_out"),
            "requiresUpgrade": "upgrade.harbor_pickler",
        },
    ]
    plots = [
        {
            "id": plot_id(pp, "press"),
            "name": f"{cfg['name']} press pad",
            "description": "Expansion marker for the harbor press line.",
            "zone": zid(p, "plot_press"),
            "grantsUpgrade": "upgrade.harbor_press",
        },
        {
            "id": plot_id(pp, "pickler"),
            "name": f"{cfg['name']} pickler pad",
            "description": "Expansion marker for the harbor pickler line.",
            "zone": zid(p, "plot_pickler"),
            "grantsUpgrade": "upgrade.harbor_pickler",
        },
    ]
    return {"zones": zones, "stations": stations, "plots": plots, "obstacles": obstacles}


def expand_walkable(harbor: dict, cfg: dict, layout: dict) -> None:
    """Grow land walkable rects so new pads stay on open ground."""
    pads = [z for z in layout["zones"] if z["kind"] in ("machine_input", "machine_output", "plot")]
    min_z = min(z["minZ"] for z in pads) - 500
    max_z = max(z["maxZ"] for z in pads) + 500
    min_x = min(z["minX"] for z in pads) - 500
    max_x = max(z["maxX"] for z in pads) + 500
    # Prefer the primary land area (first walkable rect).
    land = harbor["walkable"][0]
    land["minZ"] = min(land["minZ"], min_z)
    land["maxZ"] = max(land["maxZ"], max_z)
    land["minX"] = min(land["minX"], min_x)
    land["maxX"] = max(land["maxX"], max_x)


PHASE13_ZONE_SUFFIXES = (
    "press_in",
    "press_out",
    "pickler_in",
    "pickler_out",
    "plot_press",
    "plot_pickler",
)


def main() -> None:
    data = json.loads(PACK.read_text())

    existing_prod = {p["id"] for p in data["products"]}
    for prod in NEW_PRODUCTS:
        if prod["id"] not in existing_prod:
            data["products"].append(prod)

    existing_mach = {m["id"] for m in data["machines"]}
    for m in NEW_MACHINES:
        if m["id"] not in existing_mach:
            data["machines"].append(m)
        else:
            for i, cur in enumerate(data["machines"]):
                if cur["id"] == m["id"]:
                    data["machines"][i] = m

    existing_rec = {r["id"] for r in data["recipes"]}
    for r in PRESS_RECIPES + PICKLER_RECIPES:
        if r["id"] not in existing_rec:
            data["recipes"].append(r)

    existing_up = {u["id"] for u in data["upgrades"]}
    for u in NEW_UPGRADES:
        if u["id"] not in existing_up:
            data["upgrades"].append(u)

    retail_add = [
        "product.pressed_fillet",
        "product.fish_cake",
        "product.pickled_fillet",
        "product.relish_jar",
    ]
    wholesale_add = ["product.press_carton", "product.pickle_carton"]

    for h in data["harbors"]:
        cfg = HARBORS[h["id"]]
        # Drop prior Phase 13 pads so layout can be rewritten idempotently.
        h["zones"] = [
            z
            for z in h["zones"]
            if not any(z["id"].endswith(suf) or z["id"].endswith("_" + suf) for suf in PHASE13_ZONE_SUFFIXES)
        ]
        h["stations"] = [
            s
            for s in h["stations"]
            if s["machine"] not in ("machine.harbor_press", "machine.harbor_pickler")
        ]
        h["plots"] = [
            pl
            for pl in h.get("plots", [])
            if pl.get("grantsUpgrade")
            not in ("upgrade.harbor_press", "upgrade.harbor_pickler")
        ]
        h["obstacles"] = [
            o
            for o in h.get("obstacles", [])
            if "press" not in o["id"] and "pickler" not in o["id"]
        ]

        layout = layout_for(h, cfg)
        expand_walkable(h, cfg, layout)
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
        if cust["id"] == "customer.local_shopper" and "product.fish_cake" not in ids:
            prefs.append({"item": "product.fish_cake", "weight": 10})
        if cust["id"] == "customer.family_buyer" and "product.relish_jar" not in ids:
            prefs.append({"item": "product.relish_jar", "weight": 10})
        if cust["id"] == "customer.premium_visitor" and "product.pressed_fillet" not in ids:
            prefs.append({"item": "product.pressed_fillet", "weight": 13})
        if cust["id"] == "customer.premium_visitor" and "product.pickled_fillet" not in ids:
            prefs.append({"item": "product.pickled_fillet", "weight": 12})

    PACK.write_text(json.dumps(data, indent=2) + "\n")

    names = {
        "machine.harbor_press": "Harbor press",
        "machine.harbor_pickler": "Harbor pickler",
        "upgrade.harbor_press": "Harbor press",
        "upgrade.harbor_pickler": "Harbor pickler",
        **{p["id"]: p["name"] for p in NEW_PRODUCTS},
    }
    for path in (EN, ES, PT):
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for k, v in names.items():
            strings[k] = v
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")

    print(
        f"OK Phase 13 mutation: machines={len(data['machines'])} "
        f"recipes={len(data['recipes'])} products={len(data['products'])} "
        f"upgrades={len(data['upgrades'])} "
        f"plots={sum(len(h.get('plots', [])) for h in data['harbors'])}"
    )


if __name__ == "__main__":
    main()
