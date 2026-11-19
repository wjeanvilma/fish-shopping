#!/usr/bin/env python3
"""Finish 4.0 Phase 11 — ecology habitats + full i18n for species 76–100.

Species roster already landed in Phase 8. This wave:
  - authors 8 new habitat pockets covering all 25 wave species (incl. rares)
  - deepens ES/PT content-string translations (no English passthrough)
  - leaves schemaVersion at 24 with explicit schema-25 prep notes in ship catalog
"""
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

WAVE_BASES = [
    "species.cedar_smelt",
    "species.lantern_shad",
    "species.brine_mullet",
    "species.canyon_bass",
    "species.tidepool_blenny",
    "species.reef_hawkfish",
    "species.squall_smelt",
    "species.gale_herring",
    "species.cinder_smelt",
    "species.slag_perch",
    "species.frost_jack",
    "species.rime_herring",
    "species.plaza_tuna",
]

WAVE_RARES = [
    "species.gilt_cedar",
    "species.prism_shad",
    "species.bronze_brine",
    "species.crown_canyon",
    "species.opal_blenny",
    "species.ruby_hawk",
    "species.thunder_smelt",
    "species.prism_gale",
    "species.magma_cinder",
    "species.gilt_slag",
    "species.aurora_jack",
    "species.crystal_rime",
]

NEW_HABITATS = [
    {
        "id": "habitat.cedar_rail",
        "name": "Cedar rail",
        "harbors": ["harbor.sunrise_pier"],
        "favoredDayParts": ["dawn", "day"],
        "speciesWeightMultPermille": {
            "species.cedar_smelt": 1600,
            "species.gilt_cedar": 1700,
            "species.lantern_shad": 1300,
            "species.dawn_anchovy": 1200,
        },
    },
    {
        "id": "habitat.lantern_shelf",
        "name": "Lantern shelf",
        "harbors": ["harbor.sunrise_pier"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.lantern_shad": 1650,
            "species.prism_shad": 1750,
            "species.cedar_smelt": 1250,
            "species.silver_sprat": 1200,
        },
    },
    {
        "id": "habitat.brine_pools",
        "name": "Brine pools",
        "harbors": ["harbor.obsidian_jetty"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.brine_mullet": 1600,
            "species.bronze_brine": 1700,
            "species.canyon_bass": 1350,
            "species.basalt_gurnard": 1250,
        },
    },
    {
        "id": "habitat.canyon_drop",
        "name": "Canyon drop",
        "harbors": ["harbor.obsidian_jetty"],
        "favoredDayParts": ["dusk", "night"],
        "speciesWeightMultPermille": {
            "species.canyon_bass": 1650,
            "species.crown_canyon": 1800,
            "species.brine_mullet": 1300,
            "species.lava_eel": 1250,
        },
    },
    {
        "id": "habitat.tide_lip",
        "name": "Tide lip",
        "harbors": ["harbor.coral_lagoon"],
        "favoredDayParts": ["dawn", "dusk"],
        "speciesWeightMultPermille": {
            "species.tidepool_blenny": 1600,
            "species.opal_blenny": 1700,
            "species.reef_hawkfish": 1350,
            "species.glass_goby": 1250,
        },
    },
    {
        "id": "habitat.hawk_perch",
        "name": "Hawk perch",
        "harbors": ["harbor.coral_lagoon"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.reef_hawkfish": 1650,
            "species.ruby_hawk": 1750,
            "species.tidepool_blenny": 1300,
            "species.coral_wrasse": 1250,
        },
    },
    {
        "id": "habitat.squall_foam",
        "name": "Squall foam",
        "harbors": ["harbor.storm_quay"],
        "favoredDayParts": ["day", "dusk"],
        "speciesWeightMultPermille": {
            "species.squall_smelt": 1600,
            "species.thunder_smelt": 1750,
            "species.gale_herring": 1400,
            "species.foam_skater": 1250,
        },
    },
    {
        "id": "habitat.plaza_cut",
        "name": "Plaza cut",
        "harbors": ["harbor.grand_marina", "harbor.ember_wharf", "harbor.northlight_harbor"],
        "favoredDayParts": ["dawn", "day", "dusk", "night"],
        "speciesWeightMultPermille": {
            "species.plaza_tuna": 1700,
            "species.gale_herring": 1450,
            "species.prism_gale": 1600,
            "species.cinder_smelt": 1500,
            "species.magma_cinder": 1650,
            "species.slag_perch": 1450,
            "species.gilt_slag": 1600,
            "species.frost_jack": 1550,
            "species.aurora_jack": 1700,
            "species.rime_herring": 1500,
            "species.crystal_rime": 1650,
        },
    },
]

# Proper translations (not English passthrough).
ES_NAMES = {
    "species.cedar_smelt": "Eperlano de cedro",
    "species.gilt_cedar": "Cedro dorado",
    "species.lantern_shad": "Sábalo farol",
    "species.prism_shad": "Sábalo prisma",
    "species.brine_mullet": "Lisa de salmuera",
    "species.bronze_brine": "Salmuera bronce",
    "species.canyon_bass": "Lubina del cañón",
    "species.crown_canyon": "Cañón coronado",
    "species.tidepool_blenny": "Blenio de poza",
    "species.opal_blenny": "Blenio ópalo",
    "species.reef_hawkfish": "Halcón de arrecife",
    "species.ruby_hawk": "Halcón rubí",
    "species.squall_smelt": "Eperlano de chubasco",
    "species.thunder_smelt": "Eperlano trueno",
    "species.gale_herring": "Arenque de vendaval",
    "species.prism_gale": "Vendaval prisma",
    "species.cinder_smelt": "Eperlano de ceniza",
    "species.magma_cinder": "Ceniza magmática",
    "species.slag_perch": "Perca de escoria",
    "species.gilt_slag": "Escoria dorada",
    "species.frost_jack": "Jurel de escarcha",
    "species.aurora_jack": "Jurel aurora",
    "species.rime_herring": "Arenque de escarcha",
    "species.crystal_rime": "Escarcha cristalina",
    "species.plaza_tuna": "Atún de plaza",
    "habitat.cedar_rail": "Barandal de cedro",
    "habitat.lantern_shelf": "Estante farol",
    "habitat.brine_pools": "Pozas de salmuera",
    "habitat.canyon_drop": "Caída del cañón",
    "habitat.tide_lip": "Borde de marea",
    "habitat.hawk_perch": "Percha del halcón",
    "habitat.squall_foam": "Espuma de chubasco",
    "habitat.plaza_cut": "Corte de la plaza",
}

PT_NAMES = {
    "species.cedar_smelt": "Eperlano de cedro",
    "species.gilt_cedar": "Cedro dourado",
    "species.lantern_shad": "Sável-lanterna",
    "species.prism_shad": "Sável-prisma",
    "species.brine_mullet": "Tainha de salmoura",
    "species.bronze_brine": "Salmoura bronze",
    "species.canyon_bass": "Robalo do cânion",
    "species.crown_canyon": "Cânion coroado",
    "species.tidepool_blenny": "Bleniú de poça",
    "species.opal_blenny": "Bleniú opala",
    "species.reef_hawkfish": "Falcão do recife",
    "species.ruby_hawk": "Falcão rubi",
    "species.squall_smelt": "Eperlano de rajada",
    "species.thunder_smelt": "Eperlano trovão",
    "species.gale_herring": "Arenque de vendaval",
    "species.prism_gale": "Vendaval prisma",
    "species.cinder_smelt": "Eperlano de cinza",
    "species.magma_cinder": "Cinza magmática",
    "species.slag_perch": "Perca de escória",
    "species.gilt_slag": "Escória dourada",
    "species.frost_jack": "Xaréu de geada",
    "species.aurora_jack": "Xaréu aurora",
    "species.rime_herring": "Arenque de geada",
    "species.crystal_rime": "Geada cristalina",
    "species.plaza_tuna": "Atum da praça",
    "habitat.cedar_rail": "Corrimão de cedro",
    "habitat.lantern_shelf": "Prateleira-lanterna",
    "habitat.brine_pools": "Poças de salmoura",
    "habitat.canyon_drop": "Queda do cânion",
    "habitat.tide_lip": "Borda da maré",
    "habitat.hawk_perch": "Poleiro do falcão",
    "habitat.squall_foam": "Espuma de rajada",
    "habitat.plaza_cut": "Corte da praça",
}

EN_HABITAT_NAMES = {h["id"]: h["name"] for h in NEW_HABITATS}


def main() -> None:
    pack = json.loads(PACK.read_text())
    existing = {h["id"] for h in pack["ecology"]["habitats"]}
    added = 0
    for hab in NEW_HABITATS:
        if hab["id"] in existing:
            # refresh weights in place
            for old in pack["ecology"]["habitats"]:
                if old["id"] == hab["id"]:
                    old.update(hab)
                    break
        else:
            pack["ecology"]["habitats"].append(hab)
            added += 1

    wave = set(WAVE_BASES + WAVE_RARES)
    weighted: set[str] = set()
    for hab in pack["ecology"]["habitats"]:
        weighted |= set(hab.get("speciesWeightMultPermille", {}))
    missing = sorted(wave - weighted)
    if missing:
        raise SystemExit(f"habitats missing wave species: {missing}")

    PACK.write_text(json.dumps(pack, indent=2) + "\n")
    print(f"habitats now {len(pack['ecology']['habitats'])} (added {added})")
    print(f"wave species weighted {len(wave & weighted)}/{len(wave)}")

    en = json.loads(EN.read_text())
    es = json.loads(ES.read_text())
    pt = json.loads(PT.read_text())
    for sid in WAVE_BASES + WAVE_RARES:
        # keep EN names from prior author wave
        if sid not in en["strings"]:
            raise SystemExit(f"missing EN string {sid}")
    for hid, name in EN_HABITAT_NAMES.items():
        en["strings"][hid] = name
    for sid, name in ES_NAMES.items():
        es["strings"][sid] = name
    for sid, name in PT_NAMES.items():
        pt["strings"][sid] = name

    EN.write_text(json.dumps(en, indent=2, ensure_ascii=False) + "\n")
    ES.write_text(json.dumps(es, indent=2, ensure_ascii=False) + "\n")
    PT.write_text(json.dumps(pt, indent=2, ensure_ascii=False) + "\n")
    print("i18n en/es/pt updated for wave + habitats")


if __name__ == "__main__":
    main()
