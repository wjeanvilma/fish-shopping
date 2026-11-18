#!/usr/bin/env python3
"""Finish 4.0 Phase 8 — author species 76–100 into content-pack (art-ready roster).

Ecology habitat pockets + deep i18n remain Finish 4.0 Phase 11; this wave adds
species, recipes, spots, galleries, codex, and EN name strings so FishArt can
lock to 100.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
EN = ROOT / "shared/i18n/content-strings.en.json"
ES = ROOT / "shared/i18n/content-strings.es.json"
PT = ROOT / "shared/i18n/content-strings.pt.json"

# 13 bases (12 with rares + 1 solo) + 12 rares = 25
BASES = [
    {
        "id": "species.cedar_smelt",
        "name": "Cedar smelt",
        "rare": "species.gilt_cedar",
        "rareName": "Gilt cedar",
        "harbor": "harbor.sunrise_pier",
        "gallery": "gallery.sunrise_pier",
        "family": "pier",
        "carryUnits": 1,
        "catchTicks": 88,
        "baseValue": 3,
        "rarityWeight": 70,
        "chance": 38,
        "spoilTier": 3,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 75,
    },
    {
        "id": "species.lantern_shad",
        "name": "Lantern shad",
        "rare": "species.prism_shad",
        "rareName": "Prism shad",
        "harbor": "harbor.sunrise_pier",
        "gallery": "gallery.sunrise_pier",
        "family": "pier",
        "carryUnits": 1,
        "catchTicks": 95,
        "baseValue": 4,
        "rarityWeight": 55,
        "chance": 34,
        "spoilTier": 3,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 80,
    },
    {
        "id": "species.brine_mullet",
        "name": "Brine mullet",
        "rare": "species.bronze_brine",
        "rareName": "Bronze brine",
        "harbor": "harbor.obsidian_jetty",
        "gallery": "gallery.obsidian_jetty",
        "family": "jetty",
        "carryUnits": 2,
        "catchTicks": 115,
        "baseValue": 7,
        "rarityWeight": 40,
        "chance": 30,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 110,
    },
    {
        "id": "species.canyon_bass",
        "name": "Canyon bass",
        "rare": "species.crown_canyon",
        "rareName": "Crown canyon",
        "harbor": "harbor.obsidian_jetty",
        "gallery": "gallery.obsidian_jetty",
        "family": "jetty",
        "carryUnits": 2,
        "catchTicks": 145,
        "baseValue": 11,
        "rarityWeight": 26,
        "chance": 24,
        "spoilTier": 1,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 135,
    },
    {
        "id": "species.tidepool_blenny",
        "name": "Tidepool blenny",
        "rare": "species.opal_blenny",
        "rareName": "Opal blenny",
        "harbor": "harbor.coral_lagoon",
        "gallery": "gallery.coral_lagoon",
        "family": "reef",
        "carryUnits": 1,
        "catchTicks": 92,
        "baseValue": 5,
        "rarityWeight": 58,
        "chance": 35,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 78,
    },
    {
        "id": "species.reef_hawkfish",
        "name": "Reef hawkfish",
        "rare": "species.ruby_hawk",
        "rareName": "Ruby hawk",
        "harbor": "harbor.coral_lagoon",
        "gallery": "gallery.coral_lagoon",
        "family": "reef",
        "carryUnits": 1,
        "catchTicks": 118,
        "baseValue": 8,
        "rarityWeight": 36,
        "chance": 28,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 112,
    },
    {
        "id": "species.squall_smelt",
        "name": "Squall smelt",
        "rare": "species.thunder_smelt",
        "rareName": "Thunder smelt",
        "harbor": "harbor.storm_quay",
        "gallery": "gallery.storm_quay",
        "family": "storm",
        "carryUnits": 1,
        "catchTicks": 98,
        "baseValue": 5,
        "rarityWeight": 52,
        "chance": 33,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 88,
    },
    {
        "id": "species.gale_herring",
        "name": "Gale herring",
        "rare": "species.prism_gale",
        "rareName": "Prism gale",
        "harbor": "harbor.storm_quay",
        "gallery": "gallery.storm_quay",
        "family": "storm",
        "carryUnits": 1,
        "catchTicks": 110,
        "baseValue": 6,
        "rarityWeight": 44,
        "chance": 31,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 95,
    },
    {
        "id": "species.cinder_smelt",
        "name": "Cinder smelt",
        "rare": "species.magma_cinder",
        "rareName": "Magma cinder",
        "harbor": "harbor.ember_wharf",
        "gallery": "gallery.ember_wharf",
        "family": "ember",
        "carryUnits": 1,
        "catchTicks": 108,
        "baseValue": 6,
        "rarityWeight": 46,
        "chance": 32,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 100,
    },
    {
        "id": "species.slag_perch",
        "name": "Slag perch",
        "rare": "species.gilt_slag",
        "rareName": "Gilt slag",
        "harbor": "harbor.ember_wharf",
        "gallery": "gallery.ember_wharf",
        "family": "ember",
        "carryUnits": 1,
        "catchTicks": 122,
        "baseValue": 8,
        "rarityWeight": 34,
        "chance": 27,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 118,
    },
    {
        "id": "species.frost_jack",
        "name": "Frost jack",
        "rare": "species.aurora_jack",
        "rareName": "Aurora jack",
        "harbor": "harbor.northlight_harbor",
        "gallery": "gallery.northlight_harbor",
        "family": "polar",
        "carryUnits": 2,
        "catchTicks": 142,
        "baseValue": 12,
        "rarityWeight": 24,
        "chance": 23,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 138,
    },
    {
        "id": "species.rime_herring",
        "name": "Rime herring",
        "rare": "species.crystal_rime",
        "rareName": "Crystal rime",
        "harbor": "harbor.northlight_harbor",
        "gallery": "gallery.northlight_harbor",
        "family": "polar",
        "carryUnits": 1,
        "catchTicks": 104,
        "baseValue": 5,
        "rarityWeight": 48,
        "chance": 34,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 90,
    },
    {
        "id": "species.plaza_tuna",
        "name": "Plaza tuna",
        "rare": None,
        "rareName": None,
        "harbor": "harbor.grand_marina",
        "gallery": "gallery.grand_marina",
        "family": "marina",
        "carryUnits": 3,
        "catchTicks": 210,
        "baseValue": 18,
        "rarityWeight": 10,
        "chance": None,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 2,
        "duration": 165,
    },
]


def asset_for(species_id: str) -> str:
    return f"models/fish_{species_id.split('.', 1)[1]}.glb"


def make_species(entry: dict, *, rare: bool) -> dict:
    if rare:
        sid = entry["rare"]
        name = entry["rareName"]
        assert sid and name
        return {
            "id": sid,
            "name": name,
            "carryUnits": entry["carryUnits"],
            "catchTicks": entry["catchTicks"],
            "baseValue": max(entry["baseValue"] * 2 + 2, entry["baseValue"] + 8),
            "rarityWeight": 1,
            "asset": asset_for(sid),
            "spoilTier": entry["spoilTier"],
        }
    sp = {
        "id": entry["id"],
        "name": entry["name"],
        "carryUnits": entry["carryUnits"],
        "catchTicks": entry["catchTicks"],
        "baseValue": entry["baseValue"],
        "rarityWeight": entry["rarityWeight"],
        "asset": asset_for(entry["id"]),
        "spoilTier": entry["spoilTier"],
    }
    if entry["rare"]:
        sp["rareUpgrade"] = {"to": entry["rare"], "chancePermille": entry["chance"]}
    return sp


def recipe_id(species_id: str) -> str:
    return f"recipe.{species_id.split('.', 1)[1]}_cut"


LORE = {
    "species.cedar_smelt": ("Cedar-smoked scent on cold pier air.", "Sunrise Pier dawn rails."),
    "species.gilt_cedar": ("Gilt rare of the cedar smelt run.", "Cedar water after Perfect timing."),
    "species.lantern_shad": ("Belly-glow under pier lanterns.", "Boardwalk edges at first light."),
    "species.prism_shad": ("Prism rare that fractures lantern light.", "Lantern shad water on lucky casts."),
    "species.brine_mullet": ("Salt-crusted sides from jetty spray.", "Obsidian Jetty brine pools."),
    "species.bronze_brine": ("Bronze rare of the brine line.", "Brine pools after a Perfect reel."),
    "species.canyon_bass": ("Holds the canyon shelf in hard current.", "Jetty canyon drop-offs."),
    "species.crown_canyon": ("Crowned rare bass of the canyon.", "Canyon bass water under rare luck."),
    "species.tidepool_blenny": ("Perches on tidepool lips between waves.", "Coral Lagoon tide shelves."),
    "species.opal_blenny": ("Opal rare blenny of the pools.", "Tidepool water after Perfect timing."),
    "species.reef_hawkfish": ("Hawks the reef from coral perches.", "Lagoon reef heads at midday."),
    "species.ruby_hawk": ("Ruby rare hawkfish flash.", "Reef hawk water on lucky casts."),
    "species.squall_smelt": ("Arrives ahead of the squall line.", "Storm Quay foam shelves."),
    "species.thunder_smelt": ("Thunder rare of the squall smelt.", "Squall water after Perfect reels."),
    "species.gale_herring": ("Schools in gale-chopped lanes.", "Storm Quay open chop."),
    "species.prism_gale": ("Prism rare herring of the gale.", "Gale herring water under rare luck."),
    "species.cinder_smelt": ("Warm-water smelt of the kiln fringe.", "Ember Wharf heated edges."),
    "species.magma_cinder": ("Magma rare of the cinder smelt.", "Cinder water on a hot night."),
    "species.slag_perch": ("Perches on cooling slag piles.", "Ember docks after dusk."),
    "species.gilt_slag": ("Gilt rare perch of the slag line.", "Slag perch water after Perfect timing."),
    "species.frost_jack": ("Frost-rimmed jack of the north shelf.", "Northlight open ice lanes."),
    "species.aurora_jack": ("Aurora rare jack of the frost line.", "Frost jack water under rare luck."),
    "species.rime_herring": ("Rime crystals rim its gill plates.", "Northlight rime shelves at dawn."),
    "species.crystal_rime": ("Crystal rare of the rime herring.", "Rime water after Perfect casts."),
    "species.plaza_tuna": ("Heavy tuna of the marina plaza lane.", "Grand Marina deep plaza cuts."),
}

TIPS = {
    "pier": "Move before the pier pocket empties — dawn weight is highest.",
    "jetty": "Bag space first; jetty fish run heavy.",
    "reef": "Lagoon schools reward pocket hops.",
    "storm": "Squall fish punish late reels.",
    "ember": "Warm outflows thicken after dusk.",
    "polar": "Cold shelves favor dawn and deep night.",
    "marina": "Plaza cuts want open lane water.",
}


def main() -> None:
    pack = json.loads(PACK.read_text())
    existing = {s["id"] for s in pack["species"]}
    new_species = []
    for b in BASES:
        if b["id"] not in existing:
            new_species.append(make_species(b, rare=False))
        if b["rare"] and b["rare"] not in existing:
            new_species.append(make_species(b, rare=True))
    pack["species"].extend(new_species)

    recipe_ids = {r["id"] for r in pack["recipes"]}
    for b in BASES:
        rid = recipe_id(b["id"])
        if rid in recipe_ids:
            continue
        pack["recipes"].append(
            {
                "id": rid,
                "machine": "machine.basic_cutter",
                "inputs": [{"item": b["id"], "quantity": 1}],
                "outputs": [{"item": b["product"], "quantity": b["outQty"]}],
                "durationTicks": b["duration"],
            }
        )

    for b in BASES:
        for s in pack["trophies"]["sets"]:
            if s["id"] == b["gallery"] and b["id"] not in s["species"]:
                s["species"].append(b["id"])
            if s["id"] == "gallery.rare_gallery" and b["rare"] and b["rare"] not in s["species"]:
                s["species"].append(b["rare"])

    harbors_by_id = {h["id"]: h for h in pack["harbors"]}
    for b in BASES:
        h = harbors_by_id[b["harbor"]]
        spots = h["fishingSpots"]
        if not spots:
            continue
        if b["id"] not in spots[0]["species"]:
            spots[0]["species"].append(b["id"])
        if len(spots) > 1 and b["id"] not in spots[1]["species"] and b["rarityWeight"] >= 30:
            spots[1]["species"].append(b["id"])

    event_hooks = {
        "event.coral_carnival": ["species.tidepool_blenny", "species.reef_hawkfish"],
        "event.storm_regatta": ["species.squall_smelt", "species.gale_herring"],
        "event.ember_night_market": ["species.cinder_smelt", "species.slag_perch"],
        "event.northlight_freeze": ["species.frost_jack", "species.rime_herring"],
        "event.harvest_moon_pier": ["species.plaza_tuna", "species.cedar_smelt"],
        "event.moonlit_market": ["species.lantern_shad", "species.brine_mullet"],
    }
    for e in pack["seasonalEvents"]["events"]:
        for sid in event_hooks.get(e["id"], []):
            e.setdefault("speciesWeightMultPermille", {})
            e["speciesWeightMultPermille"].setdefault(sid, 1500)

    # Extend existing habitats with Phase 8 weight hooks (full habitat authoring = Phase 11).
    habitat_hooks = {
        "habitat.boardwalk_edge": {
            "species.cedar_smelt": 1350,
            "species.lantern_shad": 1300,
        },
        "habitat.basalt_spur": {
            "species.brine_mullet": 1400,
            "species.canyon_bass": 1450,
        },
        "habitat.mangrove_fringe": {
            "species.tidepool_blenny": 1400,
            "species.reef_hawkfish": 1350,
        },
        "habitat.shear_channel": {
            "species.squall_smelt": 1450,
            "species.gale_herring": 1400,
        },
        "habitat.kiln_outflow": {
            "species.cinder_smelt": 1450,
            "species.slag_perch": 1400,
        },
        "habitat.rime_shelf": {
            "species.frost_jack": 1500,
            "species.rime_herring": 1400,
        },
        "habitat.parade_lane": {
            "species.plaza_tuna": 1600,
        },
    }
    for hab in pack["ecology"]["habitats"]:
        extra = habitat_hooks.get(hab["id"])
        if not extra:
            continue
        weights = hab.setdefault("speciesWeightMultPermille", {})
        for sid, mult in extra.items():
            weights.setdefault(sid, mult)

    codex_have = {e["speciesId"] for e in pack["codex"]["entries"]}
    for b in BASES:
        pairs = [(b["id"], b["family"])]
        if b["rare"]:
            pairs.append((b["rare"], b["family"]))
        for sid, fam in pairs:
            if sid in codex_have:
                continue
            lore, hint = LORE[sid]
            pack["codex"]["entries"].append(
                {
                    "speciesId": sid,
                    "family": fam,
                    "lore": lore,
                    "habitatHint": hint,
                    "journalTip": TIPS[fam],
                }
            )
            codex_have.add(sid)

    PACK.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"species now {len(pack['species'])}")
    print(f"codex now {len(pack['codex']['entries'])}")
    print(f"new species added {len(new_species)}")

    for path in (EN, ES, PT):
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for b in BASES:
            strings.setdefault(b["id"], b["name"])
            if b["rare"]:
                strings.setdefault(b["rare"], b["rareName"])
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print("i18n names updated")


if __name__ == "__main__":
    main()
