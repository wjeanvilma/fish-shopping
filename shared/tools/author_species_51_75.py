#!/usr/bin/env python3
"""Finish 3.0 Phase 12 — author species 51–75 + ecology habitats into content-pack."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
EN = ROOT / "shared/i18n/content-strings.en.json"
ES = ROOT / "shared/i18n/content-strings.es.json"
PT = ROOT / "shared/i18n/content-strings.pt.json"
FR = ROOT / "shared/i18n/content-strings.fr.json"
HT = ROOT / "shared/i18n/content-strings.ht.json"
IT = ROOT / "shared/i18n/content-strings.it.json"
CA = ROOT / "shared/i18n/content-strings.ca.json"
RU = ROOT / "shared/i18n/content-strings.ru.json"

# 13 bases (12 with rares + 1 solo) + 12 rares = 25
BASES = [
    {
        "id": "species.mangrove_snapper",
        "name": "Mangrove snapper",
        "rare": "species.gilt_mangrove",
        "rareName": "Gilt mangrove",
        "harbor": "harbor.coral_lagoon",
        "gallery": "gallery.coral_lagoon",
        "family": "reef",
        "carryUnits": 1,
        "catchTicks": 105,
        "baseValue": 6,
        "rarityWeight": 48,
        "chance": 33,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 95,
    },
    {
        "id": "species.glass_goby",
        "name": "Glass goby",
        "rare": "species.prism_goby",
        "rareName": "Prism goby",
        "harbor": "harbor.coral_lagoon",
        "gallery": "gallery.coral_lagoon",
        "family": "reef",
        "carryUnits": 1,
        "catchTicks": 90,
        "baseValue": 4,
        "rarityWeight": 60,
        "chance": 36,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 70,
    },
    {
        "id": "species.shear_drum",
        "name": "Shear drum",
        "rare": "species.thunder_drum",
        "rareName": "Thunder drum",
        "harbor": "harbor.storm_quay",
        "gallery": "gallery.storm_quay",
        "family": "storm",
        "carryUnits": 2,
        "catchTicks": 135,
        "baseValue": 9,
        "rarityWeight": 36,
        "chance": 28,
        "spoilTier": 1,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 125,
    },
    {
        "id": "species.foam_skater",
        "name": "Foam skater",
        "rare": "species.crystal_skater",
        "rareName": "Crystal skater",
        "harbor": "harbor.storm_quay",
        "gallery": "gallery.storm_quay",
        "family": "storm",
        "carryUnits": 1,
        "catchTicks": 100,
        "baseValue": 5,
        "rarityWeight": 50,
        "chance": 34,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 85,
    },
    {
        "id": "species.slag_loach",
        "name": "Slag loach",
        "rare": "species.magma_loach",
        "rareName": "Magma loach",
        "harbor": "harbor.ember_wharf",
        "gallery": "gallery.ember_wharf",
        "family": "ember",
        "carryUnits": 1,
        "catchTicks": 120,
        "baseValue": 7,
        "rarityWeight": 40,
        "chance": 30,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 110,
    },
    {
        "id": "species.kiln_perch",
        "name": "Kiln perch",
        "rare": "species.gilt_kiln",
        "rareName": "Gilt kiln",
        "harbor": "harbor.ember_wharf",
        "gallery": "gallery.ember_wharf",
        "family": "ember",
        "carryUnits": 1,
        "catchTicks": 112,
        "baseValue": 6,
        "rarityWeight": 44,
        "chance": 31,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 100,
    },
    {
        "id": "species.drift_icefish",
        "name": "Drift icefish",
        "rare": "species.aurora_icefish",
        "rareName": "Aurora icefish",
        "harbor": "harbor.northlight_harbor",
        "gallery": "gallery.northlight_harbor",
        "family": "polar",
        "carryUnits": 1,
        "catchTicks": 118,
        "baseValue": 7,
        "rarityWeight": 38,
        "chance": 29,
        "spoilTier": 1,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 115,
    },
    {
        "id": "species.rime_bream",
        "name": "Rime bream",
        "rare": "species.crystal_bream",
        "rareName": "Crystal bream",
        "harbor": "harbor.northlight_harbor",
        "gallery": "gallery.northlight_harbor",
        "family": "polar",
        "carryUnits": 2,
        "catchTicks": 140,
        "baseValue": 10,
        "rarityWeight": 30,
        "chance": 26,
        "spoilTier": 1,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 130,
    },
    {
        "id": "species.silk_amberjack",
        "name": "Silk amberjack",
        "rare": "species.gilt_amberjack",
        "rareName": "Gilt amberjack",
        "harbor": "harbor.grand_marina",
        "gallery": "gallery.grand_marina",
        "family": "marina",
        "carryUnits": 2,
        "catchTicks": 150,
        "baseValue": 11,
        "rarityWeight": 28,
        "chance": 25,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 140,
    },
    {
        "id": "species.parade_scad",
        "name": "Parade scad",
        "rare": "species.opal_scad",
        "rareName": "Opal scad",
        "harbor": "harbor.grand_marina",
        "gallery": "gallery.grand_marina",
        "family": "marina",
        "carryUnits": 1,
        "catchTicks": 108,
        "baseValue": 6,
        "rarityWeight": 46,
        "chance": 32,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 90,
    },
    {
        "id": "species.veil_skate",
        "name": "Veil skate",
        "rare": "species.pearl_skate",
        "rareName": "Pearl skate",
        "harbor": "harbor.moon_cove",
        "gallery": "gallery.moon_cove",
        "family": "cove",
        "carryUnits": 2,
        "catchTicks": 155,
        "baseValue": 12,
        "rarityWeight": 22,
        "chance": 23,
        "spoilTier": 1,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 145,
    },
    {
        "id": "species.dusk_cuttle",
        "name": "Dusk cuttle",
        "rare": "species.opal_cuttle",
        "rareName": "Opal cuttle",
        "harbor": "harbor.moon_cove",
        "gallery": "gallery.moon_cove",
        "family": "cove",
        "carryUnits": 1,
        "catchTicks": 125,
        "baseValue": 8,
        "rarityWeight": 34,
        "chance": 28,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 118,
    },
    {
        "id": "species.basalt_gurnard",
        "name": "Basalt gurnard",
        "rare": None,
        "rareName": None,
        "harbor": "harbor.obsidian_jetty",
        "gallery": "gallery.obsidian_jetty",
        "family": "jetty",
        "carryUnits": 2,
        "catchTicks": 148,
        "baseValue": 13,
        "rarityWeight": 20,
        "chance": None,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 138,
    },
]

HABITATS = [
    {
        "id": "habitat.mangrove_fringe",
        "name": "Mangrove fringe",
        "harbors": ["harbor.coral_lagoon"],
        "favoredDayParts": ["dawn", "dusk"],
        "speciesWeightMultPermille": {
            "species.mangrove_snapper": 1550,
            "species.glass_goby": 1450,
            "species.coral_wrasse": 1250,
        },
    },
    {
        "id": "habitat.shear_channel",
        "name": "Shear channel",
        "harbors": ["harbor.storm_quay"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.shear_drum": 1600,
            "species.foam_skater": 1500,
            "species.gale_jack": 1300,
        },
    },
    {
        "id": "habitat.kiln_outflow",
        "name": "Kiln outflow",
        "harbors": ["harbor.ember_wharf"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.slag_loach": 1650,
            "species.kiln_perch": 1500,
            "species.cinder_carp": 1300,
        },
    },
    {
        "id": "habitat.rime_shelf",
        "name": "Rime shelf",
        "harbors": ["harbor.northlight_harbor"],
        "favoredDayParts": ["dawn", "night"],
        "speciesWeightMultPermille": {
            "species.drift_icefish": 1600,
            "species.rime_bream": 1500,
            "species.frost_smelt": 1300,
        },
    },
    {
        "id": "habitat.parade_lane",
        "name": "Parade lane",
        "harbors": ["harbor.grand_marina"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.silk_amberjack": 1550,
            "species.parade_scad": 1450,
            "species.marina_tuna": 1250,
        },
    },
    {
        "id": "habitat.veil_flats",
        "name": "Veil flats",
        "harbors": ["harbor.moon_cove"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.veil_skate": 1700,
            "species.dusk_cuttle": 1550,
            "species.moon_flounder": 1300,
        },
    },
    {
        "id": "habitat.basalt_spur",
        "name": "Basalt spur",
        "harbors": ["harbor.obsidian_jetty"],
        "favoredDayParts": ["day", "night"],
        "speciesWeightMultPermille": {
            "species.basalt_gurnard": 1750,
            "species.lava_eel": 1400,
            "species.reef_perch": 1250,
        },
    },
    {
        "id": "habitat.boardwalk_edge",
        "name": "Boardwalk edge",
        "harbors": ["harbor.sunrise_pier"],
        "favoredDayParts": ["dawn", "day"],
        "speciesWeightMultPermille": {
            "species.dawn_anchovy": 1400,
            "species.silver_sprat": 1300,
            "species.foam_skater": 1200,
        },
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

    # Recipes for new bases
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

    # Trophy galleries
    for b in BASES:
        for s in pack["trophies"]["sets"]:
            if s["id"] == b["gallery"] and b["id"] not in s["species"]:
                s["species"].append(b["id"])
            if s["id"] == "gallery.rare_gallery" and b["rare"] and b["rare"] not in s["species"]:
                s["species"].append(b["rare"])

    # Fishing spots — add base species to matching harbor first spot + one secondary
    harbors_by_id = {h["id"]: h for h in pack["harbors"]}
    for b in BASES:
        h = harbors_by_id[b["harbor"]]
        spots = h["fishingSpots"]
        if not spots:
            continue
        if b["id"] not in spots[0]["species"]:
            spots[0]["species"].append(b["id"])
        if len(spots) > 1 and b["id"] not in spots[1]["species"]:
            # lighter secondary presence
            if b["rarityWeight"] >= 30:
                spots[1]["species"].append(b["id"])

    # Seasonal weights for related events
    event_hooks = {
        "event.coral_carnival": ["species.mangrove_snapper", "species.glass_goby"],
        "event.storm_regatta": ["species.shear_drum", "species.foam_skater"],
        "event.ember_night_market": ["species.slag_loach", "species.kiln_perch"],
        "event.northlight_freeze": ["species.drift_icefish", "species.rime_bream"],
        "event.harvest_moon_pier": ["species.silk_amberjack", "species.parade_scad"],
        "event.moonlit_market": ["species.veil_skate", "species.dusk_cuttle"],
    }
    for e in pack["seasonalEvents"]["events"]:
        for sid in event_hooks.get(e["id"], []):
            e.setdefault("speciesWeightMultPermille", {})
            e["speciesWeightMultPermille"].setdefault(sid, 1500)

    # Ecology habitats
    pack["ecology"]["habitats"] = HABITATS

    # Codex entries
    codex_have = {e["speciesId"] for e in pack["codex"]["entries"]}
    lore = {
        "species.mangrove_snapper": ("Root-shadow ambushers with copper cheeks.", "Dawn mangrove roots at Coral Lagoon."),
        "species.gilt_mangrove": ("Gold-laced rare of the mangrove line.", "Same roots — rarer flash."),
        "species.glass_goby": ("Nearly invisible until the school turns.", "Shallow reef pockets at first light."),
        "species.prism_goby": ("Refracts pier lanterns into coin-bright sides.", "Glass goby grounds on a lucky cast."),
        "species.shear_drum": ("Drums the shear walls before a squall.", "Storm Quay channels in hard wind."),
        "species.thunder_drum": ("Rare thunderhead of the drum family.", "Shear channels after Perfect reels."),
        "species.foam_skater": ("Skips whitecaps like a thrown coin.", "Foam lines off Storm Quay."),
        "species.crystal_skater": ("Ice-bright rare skater.", "Foam lines under rare luck."),
        "species.slag_loach": ("Feeds on kiln slag warm-water bugs.", "Ember Wharf heated outflows."),
        "species.magma_loach": ("Rare molten stripe along the loach.", "Kiln outflows on a hot night."),
        "species.kiln_perch": ("Perches on warm brick rubble.", "Ember docks after dusk."),
        "species.gilt_kiln": ("Gilded rare perch of the kiln line.", "Kiln perch water after a Perfect."),
        "species.drift_icefish": ("Rides ice pans into the harbor mouth.", "Northlight dawn shelves."),
        "species.aurora_icefish": ("Aurora-backed rare icefish.", "Drift ice lanes under rare luck."),
        "species.rime_bream": ("Frost crystals lace its scales.", "Deep rime shelves at night."),
        "species.crystal_bream": ("Rare crystal-plated bream.", "Rime shelves on a lucky cast."),
        "species.silk_amberjack": ("Silk-smooth jack of the parade lane.", "Grand Marina day channels."),
        "species.gilt_amberjack": ("Gilt rare of the amberjack run.", "Parade lane after Perfect timing."),
        "species.parade_scad": ("Follows festival barges in tight schools.", "Marina parade edges at dusk."),
        "species.opal_scad": ("Opal-sheen rare scad.", "Parade scad water under rare luck."),
        "species.veil_skate": ("Glides under moon veils on the flats.", "Moon Cove dusk flats."),
        "species.pearl_skate": ("Pearl-disk rare skate.", "Veil flats after a Perfect reel."),
        "species.dusk_cuttle": ("Inks the dusk water before vanishing.", "Cove night slips."),
        "species.opal_cuttle": ("Opal rare of the cuttle line.", "Dusk cuttle water on lucky casts."),
        "species.basalt_gurnard": ("Walks basalt shelves on armored fins.", "Obsidian Jetty basalt spurs."),
    }
    tips = {
        "reef": "Lagoon schools reward moving before a pocket empties.",
        "storm": "Watch the shear — storm fish punish late reels.",
        "ember": "Warm outflows thicken after dusk maintenance.",
        "polar": "Cold shelves favor dawn and deep night casts.",
        "marina": "Parade traffic boosts scad; jacks want open lane water.",
        "cove": "Moon flats peak when lantern customers arrive.",
        "jetty": "Basalt spurs hold heavy fish — bag space first.",
    }
    for b in BASES:
        pairs = [(b["id"], b["family"])]
        if b["rare"]:
            pairs.append((b["rare"], b["family"]))
        for sid, fam in pairs:
            if sid in codex_have:
                continue
            L, H = lore[sid]
            pack["codex"]["entries"].append(
                {
                    "speciesId": sid,
                    "family": fam,
                    "lore": L,
                    "habitatHint": H,
                    "journalTip": tips[fam],
                }
            )
            codex_have.add(sid)

    PACK.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"species now {len(pack['species'])}")
    print(f"codex now {len(pack['codex']['entries'])}")
    print(f"habitats {len(pack['ecology']['habitats'])}")

    # i18n names
    for path in (EN, ES, PT, FR, HT, IT, CA, RU):
        doc = json.loads(path.read_text())
        strings = doc.setdefault("strings", {})
        for b in BASES:
            strings[b["id"]] = b["name"]
            if b["rare"]:
                strings[b["rare"]] = b["rareName"]
        for h in HABITATS:
            strings[h["id"]] = h["name"]
        path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + "\n")
    print("i18n updated")


if __name__ == "__main__":
    main()
