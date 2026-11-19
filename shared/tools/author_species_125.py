#!/usr/bin/env python3
"""
Finish 5.0 Phase 13 — author species 101–125 + ecology habitats + 8-locale i18n.

Art-ahead meshes already landed in Phase 9 (fish-art-5). This wave:
  - authors 13 bases + 12 rares into content-pack (recipes/spots/galleries/codex)
  - authors 8 new habitat pockets covering all 25 wave ids
  - deepens EN + non-passthrough translations across 8 locales
  - closes gaps.speciesRemaining and wires listing/pin/DoD

Usage:
  python3 shared/tools/author_species_125.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/species-125.json"
PARITY = ROOT / "shared/fixtures/parity-species-125.json"
KICKOFF = ROOT / "shared/ship/finish-5.0-kickoff.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"

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

MARKER = "authored-finish-5.0-phase-13"

# 13 bases (12 with rares + 1 solo) + 12 rares = 25
BASES = [
    {
        "id": "species.mist_sprat",
        "name": "Mist sprat",
        "rare": "species.gilt_mist",
        "rareName": "Gilt mist",
        "harbor": "harbor.sunrise_pier",
        "gallery": "gallery.sunrise_pier",
        "family": "pier",
        "carryUnits": 1,
        "catchTicks": 86,
        "baseValue": 3,
        "rarityWeight": 72,
        "chance": 38,
        "spoilTier": 3,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 74,
    },
    {
        "id": "species.veil_shad",
        "name": "Veil shad",
        "rare": "species.prism_veil",
        "rareName": "Prism veil",
        "harbor": "harbor.sunrise_pier",
        "gallery": "gallery.sunrise_pier",
        "family": "pier",
        "carryUnits": 1,
        "catchTicks": 94,
        "baseValue": 4,
        "rarityWeight": 56,
        "chance": 34,
        "spoilTier": 3,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 82,
    },
    {
        "id": "species.dusk_mullet",
        "name": "Dusk mullet",
        "rare": "species.bronze_dusk",
        "rareName": "Bronze dusk",
        "harbor": "harbor.moon_cove",
        "gallery": "gallery.moon_cove",
        "family": "cove",
        "carryUnits": 2,
        "catchTicks": 112,
        "baseValue": 7,
        "rarityWeight": 42,
        "chance": 30,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 108,
    },
    {
        "id": "species.shelf_blenny",
        "name": "Shelf blenny",
        "rare": "species.opal_shelf",
        "rareName": "Opal shelf",
        "harbor": "harbor.moon_cove",
        "gallery": "gallery.moon_cove",
        "family": "cove",
        "carryUnits": 1,
        "catchTicks": 90,
        "baseValue": 5,
        "rarityWeight": 60,
        "chance": 35,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 76,
    },
    {
        "id": "species.coral_scad",
        "name": "Coral scad",
        "rare": "species.gilt_scad",
        "rareName": "Gilt scad",
        "harbor": "harbor.coral_lagoon",
        "gallery": "gallery.coral_lagoon",
        "family": "reef",
        "carryUnits": 1,
        "catchTicks": 116,
        "baseValue": 8,
        "rarityWeight": 38,
        "chance": 28,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 1,
        "duration": 110,
    },
    {
        "id": "species.storm_drum",
        "name": "Storm drum",
        "rare": "species.thunder_storm",
        "rareName": "Thunder storm",
        "harbor": "harbor.storm_quay",
        "gallery": "gallery.storm_quay",
        "family": "storm",
        "carryUnits": 2,
        "catchTicks": 128,
        "baseValue": 9,
        "rarityWeight": 32,
        "chance": 26,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 120,
    },
    {
        "id": "species.ember_ray",
        "name": "Ember ray",
        "rare": "species.magma_ember",
        "rareName": "Magma ember",
        "harbor": "harbor.ember_wharf",
        "gallery": "gallery.ember_wharf",
        "family": "ember",
        "carryUnits": 2,
        "catchTicks": 148,
        "baseValue": 12,
        "rarityWeight": 22,
        "chance": 22,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 140,
    },
    {
        "id": "species.north_smelt",
        "name": "North smelt",
        "rare": "species.aurora_north",
        "rareName": "Aurora north",
        "harbor": "harbor.northlight_harbor",
        "gallery": "gallery.northlight_harbor",
        "family": "polar",
        "carryUnits": 1,
        "catchTicks": 102,
        "baseValue": 5,
        "rarityWeight": 50,
        "chance": 33,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 2,
        "duration": 88,
    },
    {
        "id": "species.marina_jack",
        "name": "Marina jack",
        "rare": "species.gilt_marina",
        "rareName": "Gilt marina",
        "harbor": "harbor.grand_marina",
        "gallery": "gallery.grand_marina",
        "family": "marina",
        "carryUnits": 2,
        "catchTicks": 138,
        "baseValue": 11,
        "rarityWeight": 28,
        "chance": 24,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 132,
    },
    {
        "id": "species.lantern_pike",
        "name": "Lantern pike",
        "rare": "species.prism_lantern",
        "rareName": "Prism lantern",
        "harbor": "harbor.mist_cove",
        "gallery": "gallery.mist_cove",
        "family": "cove",
        "carryUnits": 2,
        "catchTicks": 152,
        "baseValue": 13,
        "rarityWeight": 20,
        "chance": 21,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 1,
        "duration": 145,
    },
    {
        "id": "species.brine_goby",
        "name": "Brine goby",
        "rare": "species.crystal_brine",
        "rareName": "Crystal brine",
        "harbor": "harbor.obsidian_jetty",
        "gallery": "gallery.obsidian_jetty",
        "family": "jetty",
        "carryUnits": 1,
        "catchTicks": 98,
        "baseValue": 6,
        "rarityWeight": 48,
        "chance": 32,
        "spoilTier": 2,
        "product": "product.basic_portion",
        "outQty": 1,
        "duration": 86,
    },
    {
        "id": "species.plaza_wrasse",
        "name": "Plaza wrasse",
        "rare": "species.crown_plaza",
        "rareName": "Crown plaza",
        "harbor": "harbor.prism_reach",
        "gallery": "gallery.prism_reach",
        "family": "marina",
        "carryUnits": 1,
        "catchTicks": 120,
        "baseValue": 8,
        "rarityWeight": 36,
        "chance": 27,
        "spoilTier": 2,
        "product": "product.fillet",
        "outQty": 2,
        "duration": 115,
    },
    {
        "id": "species.mist_tuna",
        "name": "Mist tuna",
        "rare": None,
        "rareName": None,
        "harbor": "harbor.mist_cove",
        "gallery": "gallery.mist_cove",
        "family": "marina",
        "carryUnits": 3,
        "catchTicks": 215,
        "baseValue": 19,
        "rarityWeight": 9,
        "chance": None,
        "spoilTier": 1,
        "product": "product.premium_portion",
        "outQty": 2,
        "duration": 170,
    },
]

NEW_HABITATS = [
    {
        "id": "habitat.mist_rail",
        "name": "Mist rail",
        "harbors": ["harbor.sunrise_pier"],
        "favoredDayParts": ["dawn", "day"],
        "speciesWeightMultPermille": {
            "species.mist_sprat": 1600,
            "species.gilt_mist": 1700,
            "species.veil_shad": 1300,
            "species.dawn_anchovy": 1200,
        },
    },
    {
        "id": "habitat.veil_glow",
        "name": "Veil glow",
        "harbors": ["harbor.sunrise_pier"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.veil_shad": 1650,
            "species.prism_veil": 1750,
            "species.mist_sprat": 1250,
            "species.silver_sprat": 1200,
        },
    },
    {
        "id": "habitat.dusk_ledge",
        "name": "Dusk ledge",
        "harbors": ["harbor.moon_cove"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.dusk_mullet": 1600,
            "species.bronze_dusk": 1700,
            "species.shelf_blenny": 1350,
        },
    },
    {
        "id": "habitat.shelf_rim",
        "name": "Shelf rim",
        "harbors": ["harbor.moon_cove"],
        "favoredDayParts": ["dawn", "day"],
        "speciesWeightMultPermille": {
            "species.shelf_blenny": 1650,
            "species.opal_shelf": 1750,
            "species.dusk_mullet": 1300,
        },
    },
    {
        "id": "habitat.scad_reef",
        "name": "Scad reef",
        "harbors": ["harbor.coral_lagoon"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.coral_scad": 1650,
            "species.gilt_scad": 1750,
            "species.coral_wrasse": 1250,
        },
    },
    {
        "id": "habitat.drum_chop",
        "name": "Drum chop",
        "harbors": ["harbor.storm_quay"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.storm_drum": 1650,
            "species.thunder_storm": 1800,
            "species.foam_skater": 1250,
        },
    },
    {
        "id": "habitat.ray_kiln",
        "name": "Ray kiln",
        "harbors": ["harbor.ember_wharf"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.ember_ray": 1700,
            "species.magma_ember": 1850,
            "species.cinder_smelt": 1250,
        },
    },
    {
        "id": "habitat.finish5_cut",
        "name": "Finish five cut",
        "harbors": [
            "harbor.northlight_harbor",
            "harbor.grand_marina",
            "harbor.mist_cove",
            "harbor.prism_reach",
            "harbor.obsidian_jetty",
        ],
        "favoredDayParts": ["dawn", "day", "dusk", "night"],
        "speciesWeightMultPermille": {
            "species.north_smelt": 1550,
            "species.aurora_north": 1700,
            "species.marina_jack": 1600,
            "species.gilt_marina": 1750,
            "species.lantern_pike": 1650,
            "species.prism_lantern": 1800,
            "species.brine_goby": 1500,
            "species.crystal_brine": 1650,
            "species.plaza_wrasse": 1550,
            "species.crown_plaza": 1700,
            "species.mist_tuna": 1750,
        },
    },
]

LORE = {
    "species.mist_sprat": ("Soft silver of the mist rail.", "Sunrise Pier mist rails at dawn."),
    "species.gilt_mist": ("Gilt rare of the mist sprat run.", "Mist water after Perfect timing."),
    "species.veil_shad": ("Veiled flanks under pier lanterns.", "Boardwalk edges at dusk."),
    "species.prism_veil": ("Prism rare that fractures veil light.", "Veil shad water on lucky casts."),
    "species.dusk_mullet": ("Salt dusk sides from cove spray.", "Moon Cove dusk ledges."),
    "species.bronze_dusk": ("Bronze rare of the dusk line.", "Dusk pools after a Perfect reel."),
    "species.shelf_blenny": ("Perches on shelf rims between waves.", "Moon Cove shelf lips."),
    "species.opal_shelf": ("Opal rare blenny of the shelf.", "Shelf water after Perfect timing."),
    "species.coral_scad": ("Scads the reef from coral heads.", "Lagoon reef at midday."),
    "species.gilt_scad": ("Gilt rare scad flash.", "Scad reef water on lucky casts."),
    "species.storm_drum": ("Drums ahead of the squall line.", "Storm Quay chop lanes."),
    "species.thunder_storm": ("Thunder rare of the storm drum.", "Drum water after Perfect reels."),
    "species.ember_ray": ("Warm-water ray of the kiln fringe.", "Ember Wharf heated flats."),
    "species.magma_ember": ("Magma rare of the ember ray.", "Ray kiln on a hot night."),
    "species.north_smelt": ("Frost-rimmed smelt of the north shelf.", "Northlight open ice lanes."),
    "species.aurora_north": ("Aurora rare of the north smelt.", "North water under rare luck."),
    "species.marina_jack": ("Heavy jack of the marina plaza lane.", "Grand Marina deep cuts."),
    "species.gilt_marina": ("Gilt rare jack of the marina.", "Marina jack water after Perfect casts."),
    "species.lantern_pike": ("Pike that hunts under cove lanterns.", "Mist Cove lantern shelves."),
    "species.prism_lantern": ("Prism rare of the lantern pike.", "Lantern water under rare luck."),
    "species.brine_goby": ("Salt-crusted goby of the jetty pools.", "Obsidian Jetty brine edges."),
    "species.crystal_brine": ("Crystal rare of the brine goby.", "Brine water after Perfect timing."),
    "species.plaza_wrasse": ("Bright wrasse of the prism plaza.", "Prism Reach plaza cuts."),
    "species.crown_plaza": ("Crowned rare wrasse of the plaza.", "Plaza wrasse water on lucky casts."),
    "species.mist_tuna": ("Heavy tuna of the mist cove lane.", "Mist Cove deep plaza cuts."),
}

TIPS = {
    "pier": "Move before the pier pocket empties — dawn weight is highest.",
    "cove": "Cove shelves reward dusk hops.",
    "reef": "Lagoon schools reward pocket hops.",
    "storm": "Squall fish punish late reels.",
    "ember": "Warm outflows thicken after dusk.",
    "polar": "Cold shelves favor dawn and deep night.",
    "marina": "Plaza cuts want open lane water.",
    "jetty": "Bag space first; jetty fish run heavy.",
}

# Non-English display names (must differ from EN).
TRANSLATIONS = {
    "es": {
        "species.mist_sprat": "Espadín de niebla",
        "species.gilt_mist": "Niebla dorada",
        "species.veil_shad": "Sábalo velo",
        "species.prism_veil": "Velo prisma",
        "species.dusk_mullet": "Lisa del crepúsculo",
        "species.bronze_dusk": "Crepúsculo bronce",
        "species.shelf_blenny": "Blenio de estante",
        "species.opal_shelf": "Estante ópalo",
        "species.coral_scad": "Jurel de coral",
        "species.gilt_scad": "Jurel dorado",
        "species.storm_drum": "Tambor de tormenta",
        "species.thunder_storm": "Tormenta trueno",
        "species.ember_ray": "Raya de brasa",
        "species.magma_ember": "Brasa magmática",
        "species.north_smelt": "Eperlano del norte",
        "species.aurora_north": "Norte aurora",
        "species.marina_jack": "Jurel de marina",
        "species.gilt_marina": "Marina dorada",
        "species.lantern_pike": "Lucio farol",
        "species.prism_lantern": "Farol prisma",
        "species.brine_goby": "Gobio de salmuera",
        "species.crystal_brine": "Salmuera cristalina",
        "species.plaza_wrasse": "Tordo de plaza",
        "species.crown_plaza": "Plaza coronada",
        "species.mist_tuna": "Atún de niebla",
        "habitat.mist_rail": "Barandal de niebla",
        "habitat.veil_glow": "Resplandor del velo",
        "habitat.dusk_ledge": "Cornisa del crepúsculo",
        "habitat.shelf_rim": "Borde del estante",
        "habitat.scad_reef": "Arrecife de jurel",
        "habitat.drum_chop": "Oleaje del tambor",
        "habitat.ray_kiln": "Horno de la raya",
        "habitat.finish5_cut": "Corte del quinto remate",
    },
    "pt": {
        "species.mist_sprat": "Espadilha de névoa",
        "species.gilt_mist": "Névoa dourada",
        "species.veil_shad": "Sável-véu",
        "species.prism_veil": "Véu-prisma",
        "species.dusk_mullet": "Tainha do crepúsculo",
        "species.bronze_dusk": "Crepúsculo bronze",
        "species.shelf_blenny": "Bleniú de prateleira",
        "species.opal_shelf": "Prateleira opala",
        "species.coral_scad": "Xaréu de coral",
        "species.gilt_scad": "Xaréu dourado",
        "species.storm_drum": "Tambor da tempestade",
        "species.thunder_storm": "Tempestade trovão",
        "species.ember_ray": "Arraia de brasa",
        "species.magma_ember": "Brasa magmática",
        "species.north_smelt": "Eperlano do norte",
        "species.aurora_north": "Norte aurora",
        "species.marina_jack": "Xaréu da marina",
        "species.gilt_marina": "Marina dourada",
        "species.lantern_pike": "Lúcio-lanterna",
        "species.prism_lantern": "Lanterna prisma",
        "species.brine_goby": "Gobídeo de salmoura",
        "species.crystal_brine": "Salmoura cristalina",
        "species.plaza_wrasse": "Bodião da praça",
        "species.crown_plaza": "Praça coroada",
        "species.mist_tuna": "Atum de névoa",
        "habitat.mist_rail": "Corrimão de névoa",
        "habitat.veil_glow": "Brilho do véu",
        "habitat.dusk_ledge": "Ledra do crepúsculo",
        "habitat.shelf_rim": "Borda da prateleira",
        "habitat.scad_reef": "Recife de xaréu",
        "habitat.drum_chop": "Marulho do tambor",
        "habitat.ray_kiln": "Forno da arraia",
        "habitat.finish5_cut": "Corte do quinto remate",
    },
    "fr": {
        "species.mist_sprat": "Sprat de brume",
        "species.gilt_mist": "Brume dorée",
        "species.veil_shad": "Alose voile",
        "species.prism_veil": "Voile prisme",
        "species.dusk_mullet": "Mulet du crépuscule",
        "species.bronze_dusk": "Crépuscule bronze",
        "species.shelf_blenny": "Blennie de plateau",
        "species.opal_shelf": "Plateau opale",
        "species.coral_scad": "Sélar de corail",
        "species.gilt_scad": "Sélar doré",
        "species.storm_drum": "Tambour de tempête",
        "species.thunder_storm": "Tempête tonnerre",
        "species.ember_ray": "Raie de braise",
        "species.magma_ember": "Braise magmatique",
        "species.north_smelt": "Éperlan du nord",
        "species.aurora_north": "Nord aurore",
        "species.marina_jack": "Carangue de marina",
        "species.gilt_marina": "Marina dorée",
        "species.lantern_pike": "Brochet lanterne",
        "species.prism_lantern": "Lanterne prisme",
        "species.brine_goby": "Gobie de saumure",
        "species.crystal_brine": "Saumure cristalline",
        "species.plaza_wrasse": "Labre de place",
        "species.crown_plaza": "Place couronnée",
        "species.mist_tuna": "Thon de brume",
        "habitat.mist_rail": "Rampe de brume",
        "habitat.veil_glow": "Lueur du voile",
        "habitat.dusk_ledge": "Corniche du crépuscule",
        "habitat.shelf_rim": "Bord du plateau",
        "habitat.scad_reef": "Récif de sélar",
        "habitat.drum_chop": "Houle du tambour",
        "habitat.ray_kiln": "Four de la raie",
        "habitat.finish5_cut": "Coupe du cinquième finish",
    },
    "ht": {
        "species.mist_sprat": "Espri vapè",
        "species.gilt_mist": "Vapè dore",
        "species.veil_shad": "Saval vwal",
        "species.prism_veil": "Vwal prisma",
        "species.dusk_mullet": "Miwèt solèy kouche",
        "species.bronze_dusk": "Solèy kouche an kwiv",
        "species.shelf_blenny": "Blenni etajè",
        "species.opal_shelf": "Etajè opal",
        "species.coral_scad": "Skad koray",
        "species.gilt_scad": "Skad dore",
        "species.storm_drum": "Tanbou tanpèt",
        "species.thunder_storm": "Tanpèt loraj",
        "species.ember_ray": "Re brazye",
        "species.magma_ember": "Brazye magma",
        "species.north_smelt": "Espri nò",
        "species.aurora_north": "Nò orò",
        "species.marina_jack": "Jak marina",
        "species.gilt_marina": "Marina dore",
        "species.lantern_pike": "Pike lanp",
        "species.prism_lantern": "Lanp prisma",
        "species.brine_goby": "Gobi sèl",
        "species.crystal_brine": "Sèl kristal",
        "species.plaza_wrasse": "Wras plas",
        "species.crown_plaza": "Plas kouwone",
        "species.mist_tuna": "Tonn vapè",
        "habitat.mist_rail": "Balistrad vapè",
        "habitat.veil_glow": "Limyè vwal",
        "habitat.dusk_ledge": "Kornich solèy kouche",
        "habitat.shelf_rim": "Bouòd etajè",
        "habitat.scad_reef": "Resif skad",
        "habitat.drum_chop": "Vag tanbou",
        "habitat.ray_kiln": "Fou re",
        "habitat.finish5_cut": "Koupe senkyèm finish",
    },
    "it": {
        "species.mist_sprat": "Spratto di nebbia",
        "species.gilt_mist": "Nebbia dorata",
        "species.veil_shad": "Cheppia velo",
        "species.prism_veil": "Velo prisma",
        "species.dusk_mullet": "Muggine del crepuscolo",
        "species.bronze_dusk": "Crepuscolo bronzo",
        "species.shelf_blenny": "Blennio di ripiano",
        "species.opal_shelf": "Ripiano opale",
        "species.coral_scad": "Sugarello di corallo",
        "species.gilt_scad": "Sugarello dorato",
        "species.storm_drum": "Tamburo di tempesta",
        "species.thunder_storm": "Tempesta tuono",
        "species.ember_ray": "Razza di brace",
        "species.magma_ember": "Brace magmatica",
        "species.north_smelt": "Sperlano del nord",
        "species.aurora_north": "Nord aurora",
        "species.marina_jack": "Leccia di marina",
        "species.gilt_marina": "Marina dorata",
        "species.lantern_pike": "Luccio lanterna",
        "species.prism_lantern": "Lanterna prisma",
        "species.brine_goby": "Ghiozzo di salamoia",
        "species.crystal_brine": "Salamoia cristallina",
        "species.plaza_wrasse": "Tordo di piazza",
        "species.crown_plaza": "Piazza coronata",
        "species.mist_tuna": "Tonno di nebbia",
        "habitat.mist_rail": "Corrimano di nebbia",
        "habitat.veil_glow": "Bagore del velo",
        "habitat.dusk_ledge": "Cornicione del crepuscolo",
        "habitat.shelf_rim": "Bordo del ripiano",
        "habitat.scad_reef": "Scogliera di sugarello",
        "habitat.drum_chop": "Moto del tamburo",
        "habitat.ray_kiln": "Fornace della razza",
        "habitat.finish5_cut": "Taglio del quinto finish",
    },
    "ca": {
        "species.mist_sprat": "Espet de boira",
        "species.gilt_mist": "Boira daurada",
        "species.veil_shad": "Sàbal vel",
        "species.prism_veil": "Vel prisma",
        "species.dusk_mullet": "Llissa del crepuscle",
        "species.bronze_dusk": "Crepuscle bronze",
        "species.shelf_blenny": "Bleni d’estatge",
        "species.opal_shelf": "Estatge òpal",
        "species.coral_scad": "Sorell de corall",
        "species.gilt_scad": "Sorell daurat",
        "species.storm_drum": "Tambor de tempesta",
        "species.thunder_storm": "Tempesta tro",
        "species.ember_ray": "Rajada de brasa",
        "species.magma_ember": "Brasa magmàtica",
        "species.north_smelt": "Esperlà del nord",
        "species.aurora_north": "Nord aurora",
        "species.marina_jack": "Sorell de marina",
        "species.gilt_marina": "Marina daurada",
        "species.lantern_pike": "Lluç de fanal",
        "species.prism_lantern": "Fanal prisma",
        "species.brine_goby": "Gobí de salmorra",
        "species.crystal_brine": "Salmorra cristal·lina",
        "species.plaza_wrasse": "Tord de plaça",
        "species.crown_plaza": "Plaça coronada",
        "species.mist_tuna": "Tonyina de boira",
        "habitat.mist_rail": "Barana de boira",
        "habitat.veil_glow": "Resplendor del vel",
        "habitat.dusk_ledge": "Cornisa del crepuscle",
        "habitat.shelf_rim": "Vora de l’estatge",
        "habitat.scad_reef": "Escull de sorell",
        "habitat.drum_chop": "Onatge del tambor",
        "habitat.ray_kiln": "Forn de la rajada",
        "habitat.finish5_cut": "Tall del cinquè finish",
    },
    "ru": {
        "species.mist_sprat": "Туманный шпрот",
        "species.gilt_mist": "Золотой туман",
        "species.veil_shad": "Вуалевая сельдь",
        "species.prism_veil": "Призменная вуаль",
        "species.dusk_mullet": "Сумеречная кефаль",
        "species.bronze_dusk": "Бронзовые сумерки",
        "species.shelf_blenny": "Шельфовая собачка",
        "species.opal_shelf": "Опаловый шельф",
        "species.coral_scad": "Коралловая ставрида",
        "species.gilt_scad": "Золотая ставрида",
        "species.storm_drum": "Штормовой барабан",
        "species.thunder_storm": "Грозовой шторм",
        "species.ember_ray": "Угольный скат",
        "species.magma_ember": "Магмовый уголёк",
        "species.north_smelt": "Северная корюшка",
        "species.aurora_north": "Северная аурора",
        "species.marina_jack": "Маринный каранкс",
        "species.gilt_marina": "Золотая марина",
        "species.lantern_pike": "Фонарная щука",
        "species.prism_lantern": "Призменный фонарь",
        "species.brine_goby": "Рассольный бычок",
        "species.crystal_brine": "Хрустальный рассол",
        "species.plaza_wrasse": "Площадный губан",
        "species.crown_plaza": "Коронованная площадь",
        "species.mist_tuna": "Туманный тунец",
        "habitat.mist_rail": "Туманные перила",
        "habitat.veil_glow": "Сияние вуали",
        "habitat.dusk_ledge": "Сумеречный уступ",
        "habitat.shelf_rim": "Край шельфа",
        "habitat.scad_reef": "Риф ставриды",
        "habitat.drum_chop": "Барабанная зыбь",
        "habitat.ray_kiln": "Печь ската",
        "habitat.finish5_cut": "Разрез пятого финиша",
    },
}


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


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def author_content() -> tuple[int, int, int]:
    pack = load(PACK)
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
        "event.coral_carnival": ["species.coral_scad", "species.shelf_blenny"],
        "event.storm_regatta": ["species.storm_drum", "species.veil_shad"],
        "event.ember_night_market": ["species.ember_ray", "species.mist_sprat"],
        "event.northlight_freeze": ["species.north_smelt", "species.marina_jack"],
        "event.harvest_moon_pier": ["species.mist_tuna", "species.plaza_wrasse"],
        "event.moonlit_market": ["species.lantern_pike", "species.brine_goby"],
    }
    for e in pack["seasonalEvents"]["events"]:
        for sid in event_hooks.get(e["id"], []):
            e.setdefault("speciesWeightMultPermille", {})
            e["speciesWeightMultPermille"].setdefault(sid, 1500)

    habitat_hooks = {
        "habitat.boardwalk_edge": {
            "species.mist_sprat": 1350,
            "species.veil_shad": 1300,
        },
        "habitat.mangrove_fringe": {
            "species.coral_scad": 1400,
        },
        "habitat.shear_channel": {
            "species.storm_drum": 1450,
        },
        "habitat.kiln_outflow": {
            "species.ember_ray": 1450,
        },
        "habitat.rime_shelf": {
            "species.north_smelt": 1400,
        },
        "habitat.parade_lane": {
            "species.marina_jack": 1450,
            "species.mist_tuna": 1500,
        },
    }
    for hab in pack["ecology"]["habitats"]:
        extra = habitat_hooks.get(hab["id"])
        if not extra:
            continue
        weights = hab.setdefault("speciesWeightMultPermille", {})
        for sid, mult in extra.items():
            weights.setdefault(sid, mult)

    existing_h = {h["id"] for h in pack["ecology"]["habitats"]}
    habitats_added = 0
    for hab in NEW_HABITATS:
        if hab["id"] in existing_h:
            for old in pack["ecology"]["habitats"]:
                if old["id"] == hab["id"]:
                    old.update(hab)
                    break
        else:
            pack["ecology"]["habitats"].append(hab)
            habitats_added += 1

    wave = {b["id"] for b in BASES} | {b["rare"] for b in BASES if b["rare"]}
    weighted: set[str] = set()
    for hab in pack["ecology"]["habitats"]:
        weighted |= set(hab.get("speciesWeightMultPermille", {}))
    missing = sorted(wave - weighted)
    if missing:
        raise SystemExit(f"habitats missing wave species: {missing}")

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

    dump(PACK, pack)
    return len(pack["species"]), len(pack["ecology"]["habitats"]), habitats_added


def author_i18n() -> None:
    docs = {loc: load(path) for loc, path in I18N_PATHS.items()}
    en_names = {}
    for b in BASES:
        en_names[b["id"]] = b["name"]
        if b["rare"]:
            en_names[b["rare"]] = b["rareName"]
    for hab in NEW_HABITATS:
        en_names[hab["id"]] = hab["name"]

    for sid, name in en_names.items():
        docs["en"].setdefault("strings", {})[sid] = name

    for loc, mapping in TRANSLATIONS.items():
        strings = docs[loc].setdefault("strings", {})
        for sid, name in mapping.items():
            strings[sid] = name
            if name == en_names.get(sid):
                raise SystemExit(f"{loc} passthrough for {sid}")

    for loc, path in I18N_PATHS.items():
        dump(path, docs[loc])


def author_ship() -> None:
    if not SHIP.is_file() or not PARITY.is_file():
        raise SystemExit("missing species-125 catalog/parity")

    kickoff = load(KICKOFF)
    kickoff.setdefault("baseline", {})["species"] = 125
    kickoff.setdefault("gaps", {})["speciesRemaining"] = 0
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["species125Phase"] = 13
    listing["species125Catalog"] = "shared/ship/species-125.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["species125"] = "shared/ship/species-125.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-species-125.json" not in fixtures:
        fixtures.append("parity-species-125.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["speciesMin"] = 125
    quotas["codexEntries"] = 125
    quotas["authoredFishSpecies"] = 125
    dod["species125"] = {
        "phase": 13,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "species125Marker": MARKER,
        "catalog": "shared/ship/species-125.json",
        "parityFixture": "shared/fixtures/parity-species-125.json",
        "validateScript": "npm run species125:validate",
        "checklist": [
            "125 species in content-pack + codex",
            "≥24 habitats with Phase 13 wave coverage",
            "8-locale content i18n for wave + habitats",
            "gaps.speciesRemaining = 0",
            "species125:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase13 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 13), None)
    if not phase13 or phase13.get("validate") != "species125:validate":
        raise SystemExit("kickoff phase 13 must validate via species125:validate")


def main() -> None:
    species_n, habitat_n, habitats_added = author_content()
    author_i18n()
    author_ship()
    print(
        f"OK author_species_125 — species={species_n}, habitats={habitat_n} "
        f"(+{habitats_added}), speciesRemaining closed"
    )


if __name__ == "__main__":
    main()
