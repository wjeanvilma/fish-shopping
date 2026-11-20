#!/usr/bin/env python3
"""
Finish 6.0 Phase 8 — author species 126–150 + ecology + i18n + fish meshes.

Combined content + fish-art-6 (no separate fish-art-6 phase):
  - 13 bases + 12 rares = 25 species into content-pack
  - 8 new habitats covering the wave
  - 8-locale content i18n (non-EN ≠ EN)
  - FishArt meshes stamped fishFinish6=fish-art-6
  - closes speciesRemaining, authoredFishRemaining, fishArt6Incomplete

Usage:
  python3 shared/tools/author_species_150.py
"""
from __future__ import annotations

import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "shared/tools"))

PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/species-150.json"
PARITY = ROOT / "shared/fixtures/parity-species-150.json"
KICKOFF = ROOT / "shared/ship/finish-6.0-kickoff.json"
PARITY_F6 = ROOT / "shared/fixtures/parity-finish-6.0-kickoff.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"
PASS = ROOT / "shared/ship/fish-art-pass.json"
PASS_PARITY = ROOT / "shared/fixtures/parity-fish-art-pass.json"
LICENSES = ROOT / "shared/store/licenses.json"
THEMES_PY = ROOT / "shared/tools/fish_themes.py"
OUT_DIR = ROOT / "shared/assets/models"

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

MARKER = "authored-finish-6.0-phase-8"
FINISH6 = "fish-art-6"

BASES = [
    {"id": "species.saffron_sprat", "name": "Saffron sprat", "rare": "species.gilt_saffron", "rareName": "Gilt saffron",
     "harbor": "harbor.saffron_quay", "gallery": "gallery.saffron_quay", "family": "ember",
     "carryUnits": 1, "catchTicks": 88, "baseValue": 4, "rarityWeight": 70, "chance": 36, "spoilTier": 3,
     "product": "product.basic_portion", "outQty": 1, "duration": 76},
    {"id": "species.quay_mullet", "name": "Quay mullet", "rare": "species.bronze_quay", "rareName": "Bronze quay",
     "harbor": "harbor.saffron_quay", "gallery": "gallery.saffron_quay", "family": "ember",
     "carryUnits": 2, "catchTicks": 114, "baseValue": 7, "rarityWeight": 40, "chance": 30, "spoilTier": 2,
     "product": "product.fillet", "outQty": 2, "duration": 110},
    {"id": "species.cobalt_smelt", "name": "Cobalt smelt", "rare": "species.aurora_cobalt", "rareName": "Aurora cobalt",
     "harbor": "harbor.cobalt_sound", "gallery": "gallery.cobalt_sound", "family": "polar",
     "carryUnits": 1, "catchTicks": 100, "baseValue": 5, "rarityWeight": 52, "chance": 34, "spoilTier": 2,
     "product": "product.basic_portion", "outQty": 2, "duration": 90},
    {"id": "species.sound_char", "name": "Sound char", "rare": "species.crystal_sound", "rareName": "Crystal sound",
     "harbor": "harbor.cobalt_sound", "gallery": "gallery.cobalt_sound", "family": "polar",
     "carryUnits": 2, "catchTicks": 130, "baseValue": 9, "rarityWeight": 30, "chance": 26, "spoilTier": 2,
     "product": "product.fillet", "outQty": 2, "duration": 122},
    {"id": "species.lantern_scad", "name": "Lantern scad", "rare": "species.prism_scad", "rareName": "Prism scad",
     "harbor": "harbor.aurora_inlet", "gallery": "gallery.aurora_inlet", "family": "cove",
     "carryUnits": 1, "catchTicks": 118, "baseValue": 8, "rarityWeight": 36, "chance": 28, "spoilTier": 2,
     "product": "product.fillet", "outQty": 1, "duration": 112},
    {"id": "species.tide_wrasse", "name": "Tide wrasse", "rare": "species.glass_tide", "rareName": "Glass tide",
     "harbor": "harbor.tideglass_bay", "gallery": "gallery.tideglass_bay", "family": "reef",
     "carryUnits": 1, "catchTicks": 122, "baseValue": 8, "rarityWeight": 34, "chance": 27, "spoilTier": 2,
     "product": "product.fillet", "outQty": 2, "duration": 116},
    {"id": "species.dock_blenny", "name": "Dock blenny", "rare": "species.opal_dock", "rareName": "Opal dock",
     "harbor": "harbor.sunrise_pier", "gallery": "gallery.sunrise_pier", "family": "pier",
     "carryUnits": 1, "catchTicks": 92, "baseValue": 5, "rarityWeight": 58, "chance": 35, "spoilTier": 3,
     "product": "product.basic_portion", "outQty": 1, "duration": 78},
    {"id": "species.cove_drum", "name": "Cove drum", "rare": "species.thunder_cove", "rareName": "Thunder cove",
     "harbor": "harbor.moon_cove", "gallery": "gallery.moon_cove", "family": "cove",
     "carryUnits": 2, "catchTicks": 126, "baseValue": 9, "rarityWeight": 32, "chance": 26, "spoilTier": 2,
     "product": "product.fillet", "outQty": 2, "duration": 120},
    {"id": "species.reef_jack", "name": "Reef jack", "rare": "species.gilt_reef", "rareName": "Gilt reef",
     "harbor": "harbor.coral_lagoon", "gallery": "gallery.coral_lagoon", "family": "reef",
     "carryUnits": 2, "catchTicks": 140, "baseValue": 11, "rarityWeight": 26, "chance": 24, "spoilTier": 1,
     "product": "product.premium_portion", "outQty": 1, "duration": 134},
    {"id": "species.kiln_shad", "name": "Kiln shad", "rare": "species.magma_kiln", "rareName": "Magma kiln",
     "harbor": "harbor.ember_wharf", "gallery": "gallery.ember_wharf", "family": "ember",
     "carryUnits": 1, "catchTicks": 108, "baseValue": 6, "rarityWeight": 44, "chance": 31, "spoilTier": 2,
     "product": "product.basic_portion", "outQty": 2, "duration": 98},
    {"id": "species.mist_goby", "name": "Mist goby", "rare": "species.veil_goby", "rareName": "Veil goby",
     "harbor": "harbor.mist_cove", "gallery": "gallery.mist_cove", "family": "cove",
     "carryUnits": 1, "catchTicks": 96, "baseValue": 5, "rarityWeight": 50, "chance": 33, "spoilTier": 2,
     "product": "product.basic_portion", "outQty": 1, "duration": 84},
    {"id": "species.plaza_bass", "name": "Plaza bass", "rare": "species.gilt_bass", "rareName": "Gilt bass",
     "harbor": "harbor.prism_reach", "gallery": "gallery.prism_reach", "family": "marina",
     "carryUnits": 2, "catchTicks": 150, "baseValue": 12, "rarityWeight": 22, "chance": 22, "spoilTier": 1,
     "product": "product.premium_portion", "outQty": 1, "duration": 142},
    {"id": "species.cobalt_tuna", "name": "Cobalt tuna", "rare": None, "rareName": None,
     "harbor": "harbor.cobalt_sound", "gallery": "gallery.cobalt_sound", "family": "marina",
     "carryUnits": 3, "catchTicks": 220, "baseValue": 20, "rarityWeight": 8, "chance": None, "spoilTier": 1,
     "product": "product.premium_portion", "outQty": 2, "duration": 175},
]

# theme, kind name, palette, specialty boxes
ART = {
    "species.saffron_sprat": ("saffron_sprat", "Saffron Sprat", {"body": "#D4A017", "fin": "#A07810", "accent": "#F0C840"},
     [((0.18, 0.03, 0.0), (0.14, 0.06, 0.06)), ((-0.1, -0.04, 0.0), (0.16, 0.04, 0.08))]),
    "species.gilt_saffron": ("gilt_saffron", "Gilt Saffron", {"body": "#E8C050", "fin": "#B09030", "accent": "#FFE080"},
     [((0.2, 0.04, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.03, 0.06), (0.14, 0.04, 0.08))]),
    "species.quay_mullet": ("quay_mullet", "Quay Mullet", {"body": "#C09050", "fin": "#906838", "accent": "#E0B070"},
     [((0.1, 0.0, 0.0), (0.18, 0.18, 0.18)), ((0.16, 0.06, 0.0), (0.08, 0.1, 0.1))]),
    "species.bronze_quay": ("bronze_quay", "Bronze Quay", {"body": "#CD7F32", "fin": "#9A5A20", "accent": "#E0A060"},
     [((0.12, 0.02, 0.0), (0.18, 0.18, 0.18)), ((0.18, 0.08, 0.0), (0.08, 0.1, 0.1))]),
    "species.cobalt_smelt": ("cobalt_smelt", "Cobalt Smelt", {"body": "#3A6AB0", "fin": "#284878", "accent": "#70A0E0"},
     [((0.22, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))]),
    "species.aurora_cobalt": ("aurora_cobalt", "Aurora Cobalt", {"body": "#5090D0", "fin": "#3068A0", "accent": "#90C8F0"},
     [((0.2, 0.04, 0.0), (0.18, 0.05, 0.05)), ((0.0, 0.12, 0.0), (0.1, 0.08, 0.08))]),
    "species.sound_char": ("sound_char", "Sound Char", {"body": "#4A7098", "fin": "#304868", "accent": "#80A8C8"},
     [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))]),
    "species.crystal_sound": ("crystal_sound", "Crystal Sound", {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
     [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))]),
    "species.lantern_scad": ("lantern_scad", "Lantern Scad", {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
     [((0.1, 0.04, 0.0), (0.24, 0.1, 0.12)), ((-0.12, -0.04, 0.0), (0.16, 0.06, 0.1))]),
    "species.prism_scad": ("prism_scad", "Prism Scad", {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
     [((0.08, 0.05, 0.0), (0.22, 0.1, 0.12)), ((-0.1, 0.0, 0.08), (0.12, 0.08, 0.08))]),
    "species.tide_wrasse": ("tide_wrasse", "Tide Wrasse", {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
     [((0.0, 0.12, 0.0), (0.18, 0.14, 0.1)), ((0.1, 0.0, 0.1), (0.12, 0.1, 0.08))]),
    "species.glass_tide": ("glass_tide", "Glass Tide", {"body": "#C8E0E8", "fin": "#90B0C0", "accent": "#E8F4F8"},
     [((0.0, 0.11, 0.0), (0.2, 0.12, 0.1)), ((-0.08, 0.0, 0.1), (0.12, 0.1, 0.08))]),
    "species.dock_blenny": ("dock_blenny", "Dock Blenny", {"body": "#6A8FA0", "fin": "#486878", "accent": "#A0C0D0"},
     [((0.16, 0.06, 0.0), (0.12, 0.1, 0.08)), ((-0.08, -0.04, 0.0), (0.14, 0.06, 0.08))]),
    "species.opal_dock": ("opal_dock", "Opal Dock", {"body": "#9AD0C5", "fin": "#68A898", "accent": "#C8F0E8"},
     [((0.14, 0.08, 0.04), (0.12, 0.1, 0.08)), ((0.14, 0.08, -0.04), (0.12, 0.1, 0.08))]),
    "species.cove_drum": ("cove_drum", "Cove Drum", {"body": "#5A7088", "fin": "#3A5068", "accent": "#90A8C0"},
     [((0.0, 0.0, 0.0), (0.34, 0.26, 0.22)), ((0.12, 0.1, 0.0), (0.1, 0.1, 0.12))]),
    "species.thunder_cove": ("thunder_cove", "Thunder Cove", {"body": "#6A5ACD", "fin": "#4A3A9D", "accent": "#A090F0"},
     [((0.02, 0.02, 0.0), (0.32, 0.24, 0.2)), ((0.0, 0.14, 0.0), (0.12, 0.1, 0.1))]),
    "species.reef_jack": ("reef_jack", "Reef Jack", {"body": "#2F8F7A", "fin": "#1A6050", "accent": "#60C0A8"},
     [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))]),
    "species.gilt_reef": ("gilt_reef", "Gilt Reef", {"body": "#C9A040", "fin": "#907028", "accent": "#E8C060"},
     [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))]),
    "species.kiln_shad": ("kiln_shad", "Kiln Shad", {"body": "#C07050", "fin": "#904830", "accent": "#E0A080"},
     [((0.22, 0.08, 0.0), (0.12, 0.12, 0.1)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.16))]),
    "species.magma_kiln": ("magma_kiln", "Magma Kiln", {"body": "#E04020", "fin": "#A02010", "accent": "#F07040"},
     [((0.2, 0.1, 0.06), (0.1, 0.1, 0.08)), ((0.2, 0.1, -0.06), (0.1, 0.1, 0.08))]),
    "species.mist_goby": ("mist_goby", "Mist Goby", {"body": "#A8C0D0", "fin": "#7890A0", "accent": "#D8E8F0"},
     [((0.2, 0.02, 0.0), (0.1, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))]),
    "species.veil_goby": ("veil_goby", "Veil Goby", {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
     [((0.18, 0.06, 0.04), (0.1, 0.06, 0.06)), ((0.18, 0.06, -0.04), (0.1, 0.06, 0.06))]),
    "species.plaza_bass": ("plaza_bass", "Plaza Bass", {"body": "#2E6B8A", "fin": "#1A4860", "accent": "#60A0C0"},
     [((0.05, 0.0, 0.0), (0.36, 0.2, 0.16)), ((0.16, 0.08, 0.0), (0.12, 0.1, 0.1))]),
    "species.gilt_bass": ("gilt_bass", "Gilt Bass", {"body": "#D4B060", "fin": "#A08840", "accent": "#F0D890"},
     [((0.04, 0.02, 0.0), (0.34, 0.18, 0.16)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))]),
    "species.cobalt_tuna": ("cobalt_tuna", "Cobalt Tuna", {"body": "#1A4A88", "fin": "#103060", "accent": "#5080C0"},
     [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))]),
}

NEW_HABITATS = [
    {"id": "habitat.saffron_rail", "name": "Saffron rail", "harbors": ["harbor.saffron_quay"],
     "favoredDayParts": ["dawn", "day"],
     "speciesWeightMultPermille": {"species.saffron_sprat": 1600, "species.gilt_saffron": 1700, "species.quay_mullet": 1300}},
    {"id": "habitat.quay_glow", "name": "Quay glow", "harbors": ["harbor.saffron_quay"],
     "favoredDayParts": ["dusk", "night"],
     "speciesWeightMultPermille": {"species.quay_mullet": 1650, "species.bronze_quay": 1750, "species.saffron_sprat": 1250}},
    {"id": "habitat.cobalt_shelf", "name": "Cobalt shelf", "harbors": ["harbor.cobalt_sound"],
     "favoredDayParts": ["dawn", "night"],
     "speciesWeightMultPermille": {"species.cobalt_smelt": 1600, "species.aurora_cobalt": 1700, "species.sound_char": 1350}},
    {"id": "habitat.sound_cut", "name": "Sound cut", "harbors": ["harbor.cobalt_sound"],
     "favoredDayParts": ["day", "dusk"],
     "speciesWeightMultPermille": {"species.sound_char": 1650, "species.crystal_sound": 1750, "species.cobalt_tuna": 1800}},
    {"id": "habitat.lantern_scad_reef", "name": "Lantern scad reef", "harbors": ["harbor.aurora_inlet"],
     "favoredDayParts": ["dusk", "night"],
     "speciesWeightMultPermille": {"species.lantern_scad": 1650, "species.prism_scad": 1750}},
    {"id": "habitat.tide_wrasse_lip", "name": "Tide wrasse lip", "harbors": ["harbor.tideglass_bay"],
     "favoredDayParts": ["day", "dusk"],
     "speciesWeightMultPermille": {"species.tide_wrasse": 1650, "species.glass_tide": 1750}},
    {"id": "habitat.dock_rim", "name": "Dock rim", "harbors": ["harbor.sunrise_pier"],
     "favoredDayParts": ["dawn", "day"],
     "speciesWeightMultPermille": {"species.dock_blenny": 1650, "species.opal_dock": 1750}},
    {"id": "habitat.finish6_cut", "name": "Finish six cut",
     "harbors": ["harbor.moon_cove", "harbor.coral_lagoon", "harbor.ember_wharf", "harbor.mist_cove", "harbor.prism_reach"],
     "favoredDayParts": ["dawn", "day", "dusk", "night"],
     "speciesWeightMultPermille": {
         "species.cove_drum": 1600, "species.thunder_cove": 1700,
         "species.reef_jack": 1600, "species.gilt_reef": 1750,
         "species.kiln_shad": 1550, "species.magma_kiln": 1700,
         "species.mist_goby": 1500, "species.veil_goby": 1650,
         "species.plaza_bass": 1600, "species.gilt_bass": 1750,
     }},
]

LORE = {
    "species.saffron_sprat": ("Warm silver of the saffron rail.", "Saffron Quay lantern rails at dawn."),
    "species.gilt_saffron": ("Gilt rare of the saffron sprat run.", "Saffron water after Perfect timing."),
    "species.quay_mullet": ("Salt dusk sides from quay spray.", "Saffron Quay dusk glow."),
    "species.bronze_quay": ("Bronze rare of the quay line.", "Quay pools after a Perfect reel."),
    "species.cobalt_smelt": ("Deep cobalt smelt of the sound shelf.", "Cobalt Sound open lanes."),
    "species.aurora_cobalt": ("Aurora rare of the cobalt smelt.", "Cobalt water under rare luck."),
    "species.sound_char": ("Heavy char of the cobalt cut.", "Cobalt Sound deep cuts."),
    "species.crystal_sound": ("Crystal rare of the sound char.", "Sound water after Perfect casts."),
    "species.lantern_scad": ("Scads the inlet under lantern poles.", "Aurora Inlet night reef."),
    "species.prism_scad": ("Prism rare scad flash.", "Lantern scad water on lucky casts."),
    "species.tide_wrasse": ("Bright wrasse of the tideglass lip.", "Tideglass Bay clear basins."),
    "species.glass_tide": ("Glass rare of the tide wrasse.", "Tide wrasse water after Perfect timing."),
    "species.dock_blenny": ("Perches on dock rims between waves.", "Sunrise Pier dock lips."),
    "species.opal_dock": ("Opal rare blenny of the dock.", "Dock water after Perfect timing."),
    "species.cove_drum": ("Drums ahead of the cove squall.", "Moon Cove chop lanes."),
    "species.thunder_cove": ("Thunder rare of the cove drum.", "Cove drum water after Perfect reels."),
    "species.reef_jack": ("Heavy jack of the lagoon reef lane.", "Coral Lagoon deep reef."),
    "species.gilt_reef": ("Gilt rare jack of the reef.", "Reef jack water after Perfect casts."),
    "species.kiln_shad": ("Warm shad of the kiln fringe.", "Ember Wharf heated flats."),
    "species.magma_kiln": ("Magma rare of the kiln shad.", "Kiln water on a hot night."),
    "species.mist_goby": ("Soft goby of the mist cove pools.", "Mist Cove brine edges."),
    "species.veil_goby": ("Veil rare of the mist goby.", "Mist goby water under rare luck."),
    "species.plaza_bass": ("Heavy bass of the prism plaza.", "Prism Reach plaza cuts."),
    "species.gilt_bass": ("Gilt rare bass of the plaza.", "Plaza bass water on lucky casts."),
    "species.cobalt_tuna": ("Heavy tuna of the cobalt sound lane.", "Cobalt Sound deep plaza cuts."),
}

TIPS = {
    "pier": "Move before the pier pocket empties — dawn weight is highest.",
    "cove": "Cove shelves reward dusk hops.",
    "reef": "Lagoon schools reward pocket hops.",
    "ember": "Warm outflows thicken after dusk.",
    "polar": "Cold shelves favor dawn and deep night.",
    "marina": "Plaza cuts want open lane water.",
}

TRANSLATIONS = {
    "es": {
        "species.saffron_sprat": "Espadín azafrán", "species.gilt_saffron": "Azafrán dorado",
        "species.quay_mullet": "Lisa del muelle", "species.bronze_quay": "Muelle bronce",
        "species.cobalt_smelt": "Eperlano cobalto", "species.aurora_cobalt": "Cobalto aurora",
        "species.sound_char": "Salvelino del seno", "species.crystal_sound": "Seno cristalino",
        "species.lantern_scad": "Jurel farol", "species.prism_scad": "Jurel prisma",
        "species.tide_wrasse": "Tordo de marea", "species.glass_tide": "Marea de vidrio",
        "species.dock_blenny": "Blenio de muelle", "species.opal_dock": "Muelle ópalo",
        "species.cove_drum": "Tambor de cala", "species.thunder_cove": "Cala trueno",
        "species.reef_jack": "Jurel de arrecife", "species.gilt_reef": "Arrecife dorado",
        "species.kiln_shad": "Sábalo de horno", "species.magma_kiln": "Horno magmático",
        "species.mist_goby": "Gobio de niebla", "species.veil_goby": "Gobio velo",
        "species.plaza_bass": "Lubina de plaza", "species.gilt_bass": "Lubina dorada",
        "species.cobalt_tuna": "Atún cobalto",
        "habitat.saffron_rail": "Barandal azafrán", "habitat.quay_glow": "Resplandor del muelle",
        "habitat.cobalt_shelf": "Estante cobalto", "habitat.sound_cut": "Corte del seno",
        "habitat.lantern_scad_reef": "Arrecife jurel farol", "habitat.tide_wrasse_lip": "Borde tordo de marea",
        "habitat.dock_rim": "Borde del muelle", "habitat.finish6_cut": "Corte del sexto remate",
    },
    "pt": {
        "species.saffron_sprat": "Espadilha açafrão", "species.gilt_saffron": "Açafrão dourado",
        "species.quay_mullet": "Tainha do cais", "species.bronze_quay": "Cais bronze",
        "species.cobalt_smelt": "Eperlano cobalto", "species.aurora_cobalt": "Cobalto aurora",
        "species.sound_char": "Salvelino da enseada", "species.crystal_sound": "Enseada cristalina",
        "species.lantern_scad": "Xaréu-lanterna", "species.prism_scad": "Xaréu-prisma",
        "species.tide_wrasse": "Bodião de maré", "species.glass_tide": "Maré de vidro",
        "species.dock_blenny": "Bleniú do cais", "species.opal_dock": "Cais opala",
        "species.cove_drum": "Tambor da enseada", "species.thunder_cove": "Enseada trovão",
        "species.reef_jack": "Xaréu do recife", "species.gilt_reef": "Recife dourado",
        "species.kiln_shad": "Sável do forno", "species.magma_kiln": "Forno magmático",
        "species.mist_goby": "Gobídeo de névoa", "species.veil_goby": "Gobídeo-véu",
        "species.plaza_bass": "Robalo da praça", "species.gilt_bass": "Robalo dourado",
        "species.cobalt_tuna": "Atum cobalto",
        "habitat.saffron_rail": "Corrimão açafrão", "habitat.quay_glow": "Brilho do cais",
        "habitat.cobalt_shelf": "Prateleira cobalto", "habitat.sound_cut": "Corte da enseada",
        "habitat.lantern_scad_reef": "Recife xaréu-lanterna", "habitat.tide_wrasse_lip": "Borda bodião de maré",
        "habitat.dock_rim": "Borda do cais", "habitat.finish6_cut": "Corte do sexto remate",
    },
    "fr": {
        "species.saffron_sprat": "Sprat safran", "species.gilt_saffron": "Safran doré",
        "species.quay_mullet": "Mulet de quai", "species.bronze_quay": "Quai bronze",
        "species.cobalt_smelt": "Éperlan cobalt", "species.aurora_cobalt": "Cobalt aurore",
        "species.sound_char": "Omble de l’anse", "species.crystal_sound": "Anse cristalline",
        "species.lantern_scad": "Sélar lanterne", "species.prism_scad": "Sélar prisme",
        "species.tide_wrasse": "Labre de marée", "species.glass_tide": "Marée de verre",
        "species.dock_blenny": "Blennie de quai", "species.opal_dock": "Quai opale",
        "species.cove_drum": "Tambour d’anse", "species.thunder_cove": "Anse tonnerre",
        "species.reef_jack": "Carangue de récif", "species.gilt_reef": "Récif doré",
        "species.kiln_shad": "Alose de four", "species.magma_kiln": "Four magmatique",
        "species.mist_goby": "Gobie de brume", "species.veil_goby": "Gobie voile",
        "species.plaza_bass": "Bar de place", "species.gilt_bass": "Bar doré",
        "species.cobalt_tuna": "Thon cobalt",
        "habitat.saffron_rail": "Rampe safran", "habitat.quay_glow": "Lueur du quai",
        "habitat.cobalt_shelf": "Plateau cobalt", "habitat.sound_cut": "Coupe de l’anse",
        "habitat.lantern_scad_reef": "Récif sélar lanterne", "habitat.tide_wrasse_lip": "Bord labre de marée",
        "habitat.dock_rim": "Bord du quai", "habitat.finish6_cut": "Coupe du sixième finish",
    },
    "ht": {
        "species.saffron_sprat": "Espri safran", "species.gilt_saffron": "Safran dore",
        "species.quay_mullet": "Miwèt ke", "species.bronze_quay": "Ke an kwiv",
        "species.cobalt_smelt": "Espri kobal", "species.aurora_cobalt": "Kobal orò",
        "species.sound_char": "Char son", "species.crystal_sound": "Son kristal",
        "species.lantern_scad": "Skad lanp", "species.prism_scad": "Skad prisma",
        "species.tide_wrasse": "Wras mare", "species.glass_tide": "Mare vè",
        "species.dock_blenny": "Blenni dok", "species.opal_dock": "Dok opal",
        "species.cove_drum": "Tanbou anse", "species.thunder_cove": "Anse loraj",
        "species.reef_jack": "Jak resif", "species.gilt_reef": "Resif dore",
        "species.kiln_shad": "Saval fou", "species.magma_kiln": "Fou magma",
        "species.mist_goby": "Gobi vapè", "species.veil_goby": "Gobi vwal",
        "species.plaza_bass": "Bas plas", "species.gilt_bass": "Bas dore",
        "species.cobalt_tuna": "Tonn kobal",
        "habitat.saffron_rail": "Balistrad safran", "habitat.quay_glow": "Limyè ke",
        "habitat.cobalt_shelf": "Etajè kobal", "habitat.sound_cut": "Koupe son",
        "habitat.lantern_scad_reef": "Resif skad lanp", "habitat.tide_wrasse_lip": "Bouòd wras mare",
        "habitat.dock_rim": "Bouòd dok", "habitat.finish6_cut": "Koupe sizyèm finish",
    },
    "it": {
        "species.saffron_sprat": "Spratto zafferano", "species.gilt_saffron": "Zafferano dorato",
        "species.quay_mullet": "Muggine del molo", "species.bronze_quay": "Molo bronzo",
        "species.cobalt_smelt": "Sperlano cobalto", "species.aurora_cobalt": "Cobalto aurora",
        "species.sound_char": "Salmerino del golfo", "species.crystal_sound": "Golfo cristallino",
        "species.lantern_scad": "Sugarello lanterna", "species.prism_scad": "Sugarello prisma",
        "species.tide_wrasse": "Tordo di marea", "species.glass_tide": "Marea di vetro",
        "species.dock_blenny": "Blennio di molo", "species.opal_dock": "Molo opale",
        "species.cove_drum": "Tamburo di cala", "species.thunder_cove": "Cala tuono",
        "species.reef_jack": "Leccia di scogliera", "species.gilt_reef": "Scogliera dorata",
        "species.kiln_shad": "Cheppia di forno", "species.magma_kiln": "Forno magmatico",
        "species.mist_goby": "Ghiozzo di nebbia", "species.veil_goby": "Ghiozzo velo",
        "species.plaza_bass": "Spigola di piazza", "species.gilt_bass": "Spigola dorata",
        "species.cobalt_tuna": "Tonno cobalto",
        "habitat.saffron_rail": "Corrimano zafferano", "habitat.quay_glow": "Bagore del molo",
        "habitat.cobalt_shelf": "Piattaforma cobalto", "habitat.sound_cut": "Taglio del golfo",
        "habitat.lantern_scad_reef": "Scogliera sugarello lanterna", "habitat.tide_wrasse_lip": "Bordo tordo di marea",
        "habitat.dock_rim": "Bordo del molo", "habitat.finish6_cut": "Taglio del sesto finish",
    },
    "ca": {
        "species.saffron_sprat": "Espet de safrà", "species.gilt_saffron": "Safrà daurat",
        "species.quay_mullet": "Llissa del moll", "species.bronze_quay": "Moll bronze",
        "species.cobalt_smelt": "Esperlà cobalt", "species.aurora_cobalt": "Cobalt aurora",
        "species.sound_char": "Salvelí de la badia", "species.crystal_sound": "Badia cristal·lina",
        "species.lantern_scad": "Sorell fanal", "species.prism_scad": "Sorell prisma",
        "species.tide_wrasse": "Tord de marea", "species.glass_tide": "Marea de vidre",
        "species.dock_blenny": "Bleni de moll", "species.opal_dock": "Moll òpal",
        "species.cove_drum": "Tambor de cala", "species.thunder_cove": "Cala tro",
        "species.reef_jack": "Sorell d’escull", "species.gilt_reef": "Escull daurat",
        "species.kiln_shad": "Sàbal de forn", "species.magma_kiln": "Forn magmàtic",
        "species.mist_goby": "Gobí de boira", "species.veil_goby": "Gobí vel",
        "species.plaza_bass": "Llobarro de plaça", "species.gilt_bass": "Llobarro daurat",
        "species.cobalt_tuna": "Tonyina cobalt",
        "habitat.saffron_rail": "Barana de safrà", "habitat.quay_glow": "Resplendor del moll",
        "habitat.cobalt_shelf": "Lleixa cobalt", "habitat.sound_cut": "Tall de la badia",
        "habitat.lantern_scad_reef": "Escull sorell fanal", "habitat.tide_wrasse_lip": "Vora tord de marea",
        "habitat.dock_rim": "Vora del moll", "habitat.finish6_cut": "Tall del sisè finish",
    },
    "ru": {
        "species.saffron_sprat": "Шафрановый шпрот", "species.gilt_saffron": "Золотой шафран",
        "species.quay_mullet": "Кефаль пристани", "species.bronze_quay": "Бронзовая пристань",
        "species.cobalt_smelt": "Кобальтовая корюшка", "species.aurora_cobalt": "Кобальтовая аврора",
        "species.sound_char": "Гольц залива", "species.crystal_sound": "Хрустальный залив",
        "species.lantern_scad": "Фонарная ставрида", "species.prism_scad": "Призменная ставрида",
        "species.tide_wrasse": "Приливный губан", "species.glass_tide": "Стеклянный прилив",
        "species.dock_blenny": "Доковая собачка", "species.opal_dock": "Опаловый док",
        "species.cove_drum": "Бухтовый барабан", "species.thunder_cove": "Грозовая бухта",
        "species.reef_jack": "Рифовый каранкс", "species.gilt_reef": "Золотой риф",
        "species.kiln_shad": "Печная сельдь", "species.magma_kiln": "Магмовая печь",
        "species.mist_goby": "Туманный бычок", "species.veil_goby": "Вуалевый бычок",
        "species.plaza_bass": "Площадной бас", "species.gilt_bass": "Золотой бас",
        "species.cobalt_tuna": "Кобальтовый тунец",
        "habitat.saffron_rail": "Шафрановые перила", "habitat.quay_glow": "Сияние пристани",
        "habitat.cobalt_shelf": "Кобальтовый шельф", "habitat.sound_cut": "Разрез залива",
        "habitat.lantern_scad_reef": "Риф фонарной ставриды", "habitat.tide_wrasse_lip": "Край приливного губана",
        "habitat.dock_rim": "Край дока", "habitat.finish6_cut": "Разрез шестого финиша",
    },
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def asset_for(species_id: str) -> str:
    return f"models/fish_{species_id.split('.', 1)[1]}.glb"


def make_species(entry: dict, *, rare: bool) -> dict:
    if rare:
        sid = entry["rare"]
        name = entry["rareName"]
        return {
            "id": sid, "name": name, "carryUnits": entry["carryUnits"], "catchTicks": entry["catchTicks"],
            "baseValue": max(entry["baseValue"] * 2 + 2, entry["baseValue"] + 8),
            "rarityWeight": 1, "asset": asset_for(sid), "spoilTier": entry["spoilTier"],
        }
    sp = {
        "id": entry["id"], "name": entry["name"], "carryUnits": entry["carryUnits"],
        "catchTicks": entry["catchTicks"], "baseValue": entry["baseValue"],
        "rarityWeight": entry["rarityWeight"], "asset": asset_for(entry["id"]),
        "spoilTier": entry["spoilTier"],
    }
    if entry["rare"]:
        sp["rareUpgrade"] = {"to": entry["rare"], "chancePermille": entry["chance"]}
    return sp


def recipe_id(species_id: str) -> str:
    return f"recipe.{species_id.split('.', 1)[1]}_cut"


def patch_themes() -> None:
    text = THEMES_PY.read_text(encoding="utf-8")
    if "FISH_FINISH6_MARKER" not in text:
        text = text.replace(
            'FISH_ART_FINISH5_MIN = 125\n',
            'FISH_ART_FINISH5_MIN = 125\n'
            'FISH_FINISH6_MARKER = "fish-art-6"  # Finish 6.0 Phase 8\n'
            'FISH_ART_FINISH6_MIN = 150\n'
            'FINISH6_SPECIES_IDS = frozenset({\n'
            + "".join(f'    "{sid}",\n' for sid in ART)
            + '})\n',
        )
    if '"species.saffron_sprat": "saffron_sprat"' not in text:
        block = "    # Finish 6.0 Phase 8 — species 126–150\n"
        for sid, (theme, *_rest) in ART.items():
            block += f'    "{sid}": "{theme}",\n'
        text = text.replace(
            '    "species.mist_tuna": "mist_tuna",\n}\n\nTHEME_COLORS',
            f'    "species.mist_tuna": "mist_tuna",\n{block}}}\n\nTHEME_COLORS',
        )
    if '"saffron_sprat": {"body"' not in text:
        colors = "    # Finish 6.0 Phase 8 colors\n"
        for theme, _, palette, _ in ART.values():
            colors += (
                f'    "{theme}": {{"body": "{palette["body"]}", '
                f'"fin": "{palette["fin"]}", "accent": "{palette["accent"]}"}},\n'
            )
        text = text.replace(
            '    "mist_tuna": {"body": "#7FA8C4", "fin": "#507890", "accent": "#B0D0E0"},\n}\n\n# Unique specialty',
            f'    "mist_tuna": {{"body": "#7FA8C4", "fin": "#507890", "accent": "#B0D0E0"}},\n{colors}}}\n\n# Unique specialty',
        )
    if '"saffron_sprat": [' not in text:
        specs = "    # Finish 6.0 Phase 8 specialty\n"
        for theme, _, _, boxes in ART.values():
            specs += f'    "{theme}": {boxes!r},\n'
        text = text.replace(
            '    "mist_tuna": [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))],\n}\n\n\ndef _finish_part',
            f'    "mist_tuna": [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))],\n{specs}}}\n\n\ndef _finish_part',
        )
    THEMES_PY.write_text(text, encoding="utf-8")


def patch_generate_stubs() -> None:
    path = ROOT / "shared/tools/generate_fish_stubs.py"
    text = path.read_text(encoding="utf-8")
    if "FINISH6_SPECIES_IDS" not in text:
        text = text.replace(
            "    FISH_FINISH5_MARKER,\n",
            "    FISH_FINISH5_MARKER,\n    FINISH6_SPECIES_IDS,\n    FISH_FINISH6_MARKER,\n",
        )
        text = text.replace(
            """    if item_id in FINISH5_ART_AHEAD_IDS:
        extras["fishFinish5"] = FISH_FINISH5_MARKER
        extras["envArt"] = f"{FISH_ART_MARKER}+{FISH_FINISH5_MARKER}"
""",
            """    if item_id in FINISH5_ART_AHEAD_IDS:
        extras["fishFinish5"] = FISH_FINISH5_MARKER
        extras["envArt"] = f"{FISH_ART_MARKER}+{FISH_FINISH5_MARKER}"
    if item_id in FINISH6_SPECIES_IDS:
        extras["fishFinish6"] = FISH_FINISH6_MARKER
        extras["envArt"] = f"{FISH_ART_MARKER}+{FISH_FINISH6_MARKER}"
""",
        )
        path.write_text(text, encoding="utf-8")


def author_content() -> tuple[int, int]:
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
        pack["recipes"].append({
            "id": rid, "machine": "machine.basic_cutter",
            "inputs": [{"item": b["id"], "quantity": 1}],
            "outputs": [{"item": b["product"], "quantity": b["outQty"]}],
            "durationTicks": b["duration"],
        })

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

    existing_h = {h["id"] for h in pack["ecology"]["habitats"]}
    for hab in NEW_HABITATS:
        if hab["id"] in existing_h:
            for old in pack["ecology"]["habitats"]:
                if old["id"] == hab["id"]:
                    old.update(hab)
                    break
        else:
            pack["ecology"]["habitats"].append(hab)

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
            pack["codex"]["entries"].append({
                "speciesId": sid, "family": fam, "lore": lore,
                "habitatHint": hint, "journalTip": TIPS[fam],
            })
            codex_have.add(sid)

    dump(PACK, pack)
    return len(pack["species"]), len(pack["ecology"]["habitats"])


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


def author_fish_art() -> None:
    import fish_themes
    importlib.reload(fish_themes)
    from generate_fish_stubs import fish_kind, write_authored_fish
    importlib.reload(sys.modules["generate_fish_stubs"])
    from generate_fish_stubs import fish_kind, write_authored_fish

    pass_cat = load(PASS)
    existing = {e["speciesId"] for e in pass_cat["authoredSpecies"]}
    for sid, (theme, *_rest) in ART.items():
        if sid in existing:
            continue
        short = sid.split(".", 1)[1]
        pass_cat["authoredSpecies"].append({
            "speciesId": sid, "theme": theme,
            "asset": f"shared/assets/models/fish_{short}.glb",
        })
    pass_cat["authoredSpeciesMin"] = 150
    pass_cat["maxTotalAuthoredBytes"] = max(int(pass_cat.get("maxTotalAuthoredBytes") or 0), 5_000_000)
    pass_cat["description"] = (
        "Finish 2.0–5.0 fish art + Finish 6.0 Phase 8 — all 150 species authored "
        "multi-part FishArt meshes; licenses + size budgets; path contract unchanged."
    )
    soft = pass_cat.setdefault("softFloors", {})
    soft["authoredSpeciesHistoricalMin"] = 125
    soft["fishFinish6Marker"] = FINISH6
    dump(PASS, pass_cat)

    parity = load(PASS_PARITY)
    parity_ids = {s["speciesId"] for s in parity["expect"]["species"]}
    for sid, (theme, *_rest) in ART.items():
        if sid in parity_ids:
            continue
        short = sid.split(".", 1)[1]
        parity["expect"]["species"].append({
            "speciesId": sid, "theme": theme,
            "asset": f"fish_{short}.glb", "minFishArtNodes": 6,
        })
    parity["authoredSpeciesMin"] = 150
    parity["description"] = (
        "Finish 2.0–5.0 + Finish 6.0 Phase 8: all 150 authored fish mesh markers, "
        "themes, and byte budgets."
    )
    dump(PASS_PARITY, parity)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for sid, (theme, name, *_rest) in ART.items():
        short = sid.split(".", 1)[1]
        kind = fish_kind(sid, name)
        write_authored_fish(OUT_DIR, sid, f"models/fish_{short}.glb", kind, theme)

    licenses = load(LICENSES)
    record = next((r for r in licenses["records"] if r["id"] == "fish-authored-art"), None)
    if not record:
        raise SystemExit("licenses missing fish-authored-art")
    paths = list(record.get("paths") or [])
    for sid in ART:
        rel = f"shared/assets/models/fish_{sid.split('.', 1)[1]}.glb"
        if rel not in paths:
            paths.append(rel)
    record["paths"] = paths
    dump(LICENSES, licenses)


def write_ship(species_n: int, habitat_n: int) -> None:
    new_bases = []
    for b in BASES:
        hab = next(
            (h["id"] for h in NEW_HABITATS if b["id"] in h["speciesWeightMultPermille"]),
            "habitat.finish6_cut",
        )
        new_bases.append({
            "id": b["id"], "name": b["name"], "rareUpgrade": b["rare"],
            "harbors": [b["harbor"]], "gallery": b["gallery"], "habitat": hab,
        })
    rares = [b["rare"] for b in BASES if b["rare"]]
    catalog = {
        "phase": 8, "plan": "30_finish_6.0", "schema": "fish.ship.species_150.v1",
        "description": (
            "Finish 6.0 Phase 8 — lock species 126–150 into content-pack with ecology "
            "depth (8 new habitats) + full 8-locale content i18n + fish-art-6 meshes. "
            "Closes speciesRemaining, authoredFishRemaining, fishArt6Incomplete. Schema stays 26."
        ),
        "contentVersion": "5.0.0", "schemaVersion": 26,
        "speciesCount": 150, "newSpeciesCount": 25,
        "habitatCount": habitat_n, "newHabitatCount": 8,
        "species150Marker": MARKER, "priorSpeciesFloor": 125,
        "fishArtMarker": FINISH6,
        "gapsClosed": ["speciesRemaining", "authoredFishRemaining", "fishArt6Incomplete"],
        "newBaseSpecies": new_bases, "newRareSpecies": rares,
        "habitatIds": [h["id"] for h in NEW_HABITATS],
        "allHabitatFloor": 32, "rareGallery": "gallery.rare_gallery",
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-species-150.json",
        "authorTool": "shared/tools/author_species_150.py",
        "validateScript": "npm run species150:validate",
        "i18n": {
            "locales": ["en", "es", "pt", "fr", "ht", "it", "ca", "ru"],
            "contentStringsEn": "shared/i18n/content-strings.en.json",
            "waveKeyCount": 25, "habitatKeyCount": 8,
            "requireTranslatedLocales": True,
            "requireNonEnglishPassthrough": ["es", "pt", "fr", "ht", "it", "ca", "ru"],
        },
        "checklist": [
            "content-pack has 150 species including Phase 8 wave + rares",
            "ecology.habitats ≥32 with 8 Phase 8 pockets covering all 25 wave ids",
            "All 8 locales translate wave species + new habitats (non-EN ≠ EN)",
            "fish-art-pass authoredSpecies = 150 with fishFinish6 stamps",
            "kickoff baseline.species stays 125; remaining gaps closed to 0/false",
            "species150:validate green in CI",
            "schema stays 26 / content 5.0.0",
        ],
        "preflightGates": [
            "shared/ship/species-150.json",
            "shared/fixtures/parity-species-150.json",
            "shared/ship/fish-art-pass.json",
            "shared/ship/finish-6.0-kickoff.json",
            "shared/tools/author_species_150.py",
            "shared/assets/models/fish_saffron_sprat.glb",
            "shared/assets/models/fish_cobalt_tuna.glb",
            "web/src/ship/species150.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Species150.kt",
            "web/scripts/validate-species-150.ts",
        ],
    }
    dump(SHIP, catalog)
    dump(PARITY, {
        "name": "parity-species-150",
        "description": "Finish 6.0 Phase 8: species 150 + habitats + i18n + fish-art-6.",
        "contentVersion": "5.0.0", "schemaVersion": 26,
        "species150Marker": MARKER,
        "expect": {
            "speciesCount": 150, "newSpeciesCount": 25, "habitatFloor": 32,
            "speciesRemainingClosed": 0, "authoredFishRemainingClosed": 0,
            "fishArt6IncompleteClosed": False, "openGapFlagMin": 17,
        },
    })

    kick = load(KICKOFF)
    # Phase 1 baseline stays locked; remaining closes.
    kick["gaps"]["speciesRemaining"] = 0
    kick["gaps"]["authoredFishRemaining"] = 0
    kick["gaps"]["fishArt6Incomplete"] = False
    dump(KICKOFF, kick)

    if PARITY_F6.is_file():
        pfx = load(PARITY_F6)
        pfx.setdefault("expect", {})["openGapFlagMin"] = 17
        dump(PARITY_F6, pfx)

    listing = load(LISTING)
    listing["species150Phase"] = 8
    listing["species150Catalog"] = "shared/ship/species-150.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["species150"] = "shared/ship/species-150.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-species-150.json" not in fixtures:
        fixtures.append("parity-species-150.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["speciesMin"] = 150
    quotas["codexEntries"] = 150
    quotas["authoredFishSpecies"] = 150
    dod["species150"] = {
        "phase": 8, "plan": "30_finish_6.0", "status": "complete",
        "statusValues": ["pending", "complete"], "species150Marker": MARKER,
        "catalog": "shared/ship/species-150.json",
        "parityFixture": "shared/fixtures/parity-species-150.json",
        "validateScript": "npm run species150:validate",
        "checklist": [
            "150 species in content-pack + codex",
            "≥32 habitats with Phase 8 wave coverage",
            "8-locale content i18n for wave + habitats",
            "fish-art-6 meshes; authoredFishRemaining=0; fishArt6Incomplete=false",
            "gaps.speciesRemaining = 0",
            "species150:validate green in CI",
        ],
    }
    dump(DOD, dod)


def main() -> int:
    patch_themes()
    patch_generate_stubs()
    species_n, habitat_n = author_content()
    author_i18n()
    author_fish_art()
    write_ship(species_n, habitat_n)
    phase8 = next((p for p in load(KICKOFF).get("phases", []) if p.get("phase") == 8), None)
    if not phase8 or phase8.get("validate") != "species150:validate":
        print("ERROR: kickoff phase 8 must validate via species150:validate", file=sys.stderr)
        return 1
    print(
        f"OK author_species_150 — species={species_n}, habitats={habitat_n}; "
        f"speciesRemaining/authoredFish/fishArt6 closed"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
