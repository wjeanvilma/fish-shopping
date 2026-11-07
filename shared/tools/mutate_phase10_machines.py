#!/usr/bin/env python3
"""Finish 2.0 Phase 10 — add harbor steamer + kiln machines, recipes, products, stations."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"

NEW_PRODUCTS = [
    {
        "id": "product.steamed_fillet",
        "name": "Steamed fillet",
        "carryUnits": 1,
        "unitPrice": 21,
        "spoilTier": 2,
        "asset": "models/product_steamed_fillet.glb",
    },
    {
        "id": "product.steamed_portion",
        "name": "Steamed portion",
        "carryUnits": 1,
        "unitPrice": 12,
        "spoilTier": 3,
        "asset": "models/product_steamed_portion.glb",
    },
    {
        "id": "product.harbor_broth",
        "name": "Harbor broth",
        "carryUnits": 1,
        "unitPrice": 15,
        "spoilTier": 3,
        "asset": "models/product_harbor_broth.glb",
    },
    {
        "id": "product.steam_carton",
        "name": "Steam carton",
        "carryUnits": 3,
        "unitPrice": 88,
        "spoilTier": 2,
        "asset": "models/product_steam_carton.glb",
    },
    {
        "id": "product.cured_fillet",
        "name": "Cured fillet",
        "carryUnits": 1,
        "unitPrice": 24,
        "spoilTier": 1,
        "asset": "models/product_cured_fillet.glb",
    },
    {
        "id": "product.dried_strip",
        "name": "Dried strip",
        "carryUnits": 1,
        "unitPrice": 10,
        "spoilTier": 1,
        "asset": "models/product_dried_strip.glb",
    },
    {
        "id": "product.kiln_carton",
        "name": "Kiln carton",
        "carryUnits": 3,
        "unitPrice": 96,
        "spoilTier": 1,
        "asset": "models/product_kiln_carton.glb",
    },
]

STEAMER_RECIPES = [
    {
        "id": "recipe.steam_fillet",
        "machine": "machine.harbor_steamer",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.steamed_fillet", "quantity": 1}],
        "durationTicks": 100,
    },
    {
        "id": "recipe.steam_portion",
        "machine": "machine.harbor_steamer",
        "inputs": [{"item": "product.basic_portion", "quantity": 1}],
        "outputs": [{"item": "product.steamed_portion", "quantity": 1}],
        "durationTicks": 80,
    },
    {
        "id": "recipe.steam_mullet",
        "machine": "machine.harbor_steamer",
        "inputs": [{"item": "species.copper_mullet", "quantity": 1}],
        "outputs": [{"item": "product.steamed_fillet", "quantity": 2}],
        "durationTicks": 120,
    },
    {
        "id": "recipe.steam_wrasse",
        "machine": "machine.harbor_steamer",
        "inputs": [{"item": "species.coral_wrasse", "quantity": 1}],
        "outputs": [{"item": "product.steamed_fillet", "quantity": 2}],
        "durationTicks": 125,
    },
    {
        "id": "recipe.harbor_broth",
        "machine": "machine.harbor_steamer",
        "inputs": [
            {"item": "product.soup_stock", "quantity": 1},
            {"item": "product.diced_fish", "quantity": 1},
        ],
        "outputs": [{"item": "product.harbor_broth", "quantity": 2}],
        "durationTicks": 110,
    },
    {
        "id": "recipe.pack_steam_carton",
        "machine": "machine.harbor_steamer",
        "inputs": [{"item": "product.steamed_fillet", "quantity": 4}],
        "outputs": [{"item": "product.steam_carton", "quantity": 1}],
        "durationTicks": 140,
    },
]

KILN_RECIPES = [
    {
        "id": "recipe.cure_fillet",
        "machine": "machine.harbor_kiln",
        "inputs": [{"item": "product.fillet", "quantity": 1}],
        "outputs": [{"item": "product.cured_fillet", "quantity": 1}],
        "durationTicks": 130,
    },
    {
        "id": "recipe.dry_diced",
        "machine": "machine.harbor_kiln",
        "inputs": [{"item": "product.diced_fish", "quantity": 2}],
        "outputs": [{"item": "product.dried_strip", "quantity": 2}],
        "durationTicks": 100,
    },
    {
        "id": "recipe.cure_cinder",
        "machine": "machine.harbor_kiln",
        "inputs": [{"item": "species.cinder_carp", "quantity": 1}],
        "outputs": [{"item": "product.cured_fillet", "quantity": 2}],
        "durationTicks": 140,
    },
    {
        "id": "recipe.cure_ash_pike",
        "machine": "machine.harbor_kiln",
        "inputs": [{"item": "species.ash_pike", "quantity": 1}],
        "outputs": [{"item": "product.cured_fillet", "quantity": 2}],
        "durationTicks": 145,
    },
    {
        "id": "recipe.pack_kiln_carton",
        "machine": "machine.harbor_kiln",
        "inputs": [{"item": "product.cured_fillet", "quantity": 4}],
        "outputs": [{"item": "product.kiln_carton", "quantity": 1}],
        "durationTicks": 150,
    },
]

NEW_MACHINES = [
    {
        "id": "machine.harbor_steamer",
        "name": "Harbor steamer",
        "recipes": [r["id"] for r in STEAMER_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
    {
        "id": "machine.harbor_kiln",
        "name": "Harbor kiln",
        "recipes": [r["id"] for r in KILN_RECIPES],
        "inputCapacityUnits": 10,
        "outputCapacityUnits": 16,
    },
]

NEW_UPGRADES = [
    {
        "id": "upgrade.harbor_steamer",
        "name": "Harbor steamer",
        "description": "Install a steam kettle line for steamed fillets, portions, broth, and steam cartons.",
        "cost": 190,
        "requires": ["quest.specialty_kitchen"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_steamer"},
    },
    {
        "id": "upgrade.harbor_kiln",
        "name": "Harbor kiln",
        "description": "Install a curing kiln for cured fillets, dried strips, and kiln cartons.",
        "cost": 230,
        "requires": ["quest.specialty_kitchen", "upgrade.harbor_grill"],
        "effect": {"kind": "unlock_machine", "machine": "machine.harbor_kiln"},
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
    """Footprint between input and output pads (same pattern as existing machines)."""
    xs = sorted([zin["minX"], zin["maxX"], zout["minX"], zout["maxX"]])
    # middle gap between the two pads
    if zin["maxX"] < zout["minX"]:
        return {"minX": zin["maxX"], "maxX": zout["minX"], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}
    if zout["maxX"] < zin["minX"]:
        return {"minX": zout["maxX"], "maxX": zin["minX"], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}
    # fallback: union X
    return {"minX": xs[1], "maxX": xs[2], "minZ": zin["minZ"], "maxZ": zin["maxZ"]}


def find_zone(harbor: dict, suffix: str):
    for z in harbor["zones"]:
        if z["id"].endswith(suffix) or z["id"].endswith("." + suffix):
            return z
        if z["id"].split(".")[-1] == suffix or z["id"].endswith("_" + suffix):
            return z
    return None


def layout_for(harbor: dict, cfg: dict) -> dict:
    p = cfg["prefix"]
    sp = cfg["station_prefix"]
    pp = cfg["plot_prefix"]
    family = cfg["family"]
    zones_by = {z["id"]: z for z in harbor["zones"]}

    if family in ("sunrise", "cove"):
        fryer_in = zones_by[zid(p, "fryer_in")]
        fryer_out = zones_by[zid(p, "fryer_out")]
        plot_fryer = zones_by[zid(p, "plot_fryer")]
        # Place steamer one step "south" of fryer (more negative Z on sunrise/cove).
        dz_steam = -6000
        dz_kiln = -9000
        steam_in = {**shift_z(fryer_in, dz_steam), "id": zid(p, "steamer_in"), "kind": "machine_input"}
        steam_out = {**shift_z(fryer_out, dz_steam), "id": zid(p, "steamer_out"), "kind": "machine_output"}
        kiln_in = {**shift_z(fryer_in, dz_kiln), "id": zid(p, "kiln_in"), "kind": "machine_input"}
        kiln_out = {**shift_z(fryer_out, dz_kiln), "id": zid(p, "kiln_out"), "kind": "machine_output"}
        plot_steam = {**shift_z(plot_fryer, dz_steam), "id": zid(p, "plot_steamer"), "kind": "plot"}
        plot_kiln = {**shift_z(plot_fryer, dz_kiln), "id": zid(p, "plot_kiln"), "kind": "plot"}
        zones = [steam_in, steam_out, kiln_in, kiln_out, plot_steam, plot_kiln]
        obstacles = [
            {"id": fid(sp, "steamer"), **zone_between_io(steam_in, steam_out)},
            {"id": fid(sp, "kiln"), **zone_between_io(kiln_in, kiln_out)},
        ]
    else:
        # Vertical: steamer below chiller column, kiln below packer column.
        chiller_in = zones_by[zid(p, "chiller_in")]
        chiller_out = zones_by[zid(p, "chiller_out")]
        packer_in = zones_by[zid(p, "packer_in")]
        packer_out = zones_by[zid(p, "packer_out")]
        plot_chiller = zones_by[zid(p, "plot_chiller")]
        plot_packer = zones_by[zid(p, "plot_packer")]
        dz = -3500
        steam_in = {**shift_z(chiller_in, dz), "id": zid(p, "steamer_in"), "kind": "machine_input"}
        steam_out = {**shift_z(chiller_out, dz), "id": zid(p, "steamer_out"), "kind": "machine_output"}
        kiln_in = {**shift_z(packer_in, dz), "id": zid(p, "kiln_in"), "kind": "machine_input"}
        kiln_out = {**shift_z(packer_out, dz), "id": zid(p, "kiln_out"), "kind": "machine_output"}
        plot_steam = {**shift_z(plot_chiller, dz), "id": zid(p, "plot_steamer"), "kind": "plot"}
        plot_kiln = {**shift_z(plot_packer, dz), "id": zid(p, "plot_kiln"), "kind": "plot"}
        zones = [steam_in, steam_out, kiln_in, kiln_out, plot_steam, plot_kiln]
        obstacles = [
            {"id": fid(sp, "steamer"), **zone_between_io(steam_in, steam_out)},
            {"id": fid(sp, "kiln"), **zone_between_io(kiln_in, kiln_out)},
        ]

    stations = [
        {
            "id": sid(sp, "steamer"),
            "machine": "machine.harbor_steamer",
            "inputZone": zid(p, "steamer_in"),
            "outputZone": zid(p, "steamer_out"),
            "requiresUpgrade": "upgrade.harbor_steamer",
        },
        {
            "id": sid(sp, "kiln"),
            "machine": "machine.harbor_kiln",
            "inputZone": zid(p, "kiln_in"),
            "outputZone": zid(p, "kiln_out"),
            "requiresUpgrade": "upgrade.harbor_kiln",
        },
    ]
    plots = [
        {
            "id": plot_id(pp, "steamer"),
            "name": f"{cfg['name']} steamer pad",
            "description": "Expansion marker for the harbor steamer line.",
            "zone": zid(p, "plot_steamer"),
            "grantsUpgrade": "upgrade.harbor_steamer",
        },
        {
            "id": plot_id(pp, "kiln"),
            "name": f"{cfg['name']} kiln pad",
            "description": "Expansion marker for the harbor kiln line.",
            "zone": zid(p, "plot_kiln"),
            "grantsUpgrade": "upgrade.harbor_kiln",
        },
    ]
    return {"zones": zones, "stations": stations, "plots": plots, "obstacles": obstacles}


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
    for r in STEAMER_RECIPES + KILN_RECIPES:
        if r["id"] not in existing_rec:
            data["recipes"].append(r)

    existing_up = {u["id"] for u in data["upgrades"]}
    for u in NEW_UPGRADES:
        if u["id"] not in existing_up:
            data["upgrades"].append(u)

    retail_add = [
        "product.steamed_fillet",
        "product.steamed_portion",
        "product.harbor_broth",
        "product.cured_fillet",
        "product.dried_strip",
    ]
    wholesale_add = ["product.steam_carton", "product.kiln_carton"]

    for h in data["harbors"]:
        cfg = HARBORS[h["id"]]
        layout = layout_for(h, cfg)
        zone_ids = {z["id"] for z in h["zones"]}
        for z in layout["zones"]:
            if z["id"] not in zone_ids:
                h["zones"].append(z)
        st_ids = {s["id"] for s in h["stations"]}
        for s in layout["stations"]:
            if s["id"] not in st_ids:
                h["stations"].append(s)
        pl_ids = {p["id"] for p in h.get("plots", [])}
        h.setdefault("plots", [])
        for pl in layout["plots"]:
            if pl["id"] not in pl_ids:
                h["plots"].append(pl)
        ob_ids = {o["id"] for o in h.get("obstacles", [])}
        h.setdefault("obstacles", [])
        for o in layout["obstacles"]:
            if o["id"] not in ob_ids:
                h["obstacles"].append(o)

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
        if cust["id"] == "customer.local_shopper" and "product.steamed_portion" not in ids:
            prefs.append({"item": "product.steamed_portion", "weight": 10})
        if cust["id"] == "customer.family_buyer" and "product.harbor_broth" not in ids:
            prefs.append({"item": "product.harbor_broth", "weight": 10})
        if cust["id"] == "customer.premium_visitor" and "product.cured_fillet" not in ids:
            prefs.append({"item": "product.cured_fillet", "weight": 14})
        if cust["id"] == "customer.premium_visitor" and "product.steamed_fillet" not in ids:
            prefs.append({"item": "product.steamed_fillet", "weight": 12})

    PACK.write_text(json.dumps(data, indent=2) + "\n")
    print(
        f"OK Phase 10 mutation: machines={len(data['machines'])} "
        f"recipes={len(data['recipes'])} products={len(data['products'])} "
        f"upgrades={len(data['upgrades'])} "
        f"plots={sum(len(h.get('plots', [])) for h in data['harbors'])}"
    )


if __name__ == "__main__":
    main()
