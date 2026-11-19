#!/usr/bin/env python3
"""
Finish 5.0 Phase 9 — fish art 5: author meshes for species 101–125 (art-ahead).

Presentation-only: extends fish_themes + fish-art-pass + GLBs with
fishFinish5=fish-art-5. Content-pack / ecology / i18n remain Phase 13.
Closes gaps.fishArt5Incomplete and authoredFishRemaining; speciesRemaining stays 25.

Usage:
  python3 shared/tools/author_fish_art_5.py
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

from generate_fish_stubs import fish_kind, write_authored_fish  # noqa: E402

SHIP = ROOT / "ship" / "fish-art-5.json"
PARITY_5 = ROOT / "fixtures" / "parity-fish-art-5.json"
PASS = ROOT / "ship" / "fish-art-pass.json"
PASS_PARITY = ROOT / "fixtures" / "parity-fish-art-pass.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LICENSES = ROOT / "store" / "licenses.json"
THEMES_PY = ROOT / "tools" / "fish_themes.py"
OUT_DIR = ROOT / "assets" / "models"

MARKER = "authored-finish-5.0-phase-9"
FINISH5 = "fish-art-5"

# species 101–125 — art-ahead roster (content Phase 13).
NEW_SPECIES: list[tuple[str, str, str, dict, list]] = [
    # (speciesId, theme, kind_hint_name, palette, specialty_boxes)
    ("species.mist_sprat", "mist_sprat", "Mist Sprat",
     {"body": "#A8C0D0", "fin": "#7890A0", "accent": "#D8E8F0"},
     [((0.18, 0.03, 0.0), (0.14, 0.06, 0.06)), ((-0.1, -0.04, 0.0), (0.16, 0.04, 0.08))]),
    ("species.gilt_mist", "gilt_mist", "Gilt Mist",
     {"body": "#D4B060", "fin": "#A08840", "accent": "#F0D890"},
     [((0.2, 0.04, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.03, 0.06), (0.14, 0.04, 0.08))]),
    ("species.veil_shad", "veil_shad", "Veil Shad",
     {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
     [((0.22, 0.08, 0.0), (0.12, 0.12, 0.1)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.16))]),
    ("species.prism_veil", "prism_veil", "Prism Veil",
     {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
     [((0.2, 0.1, 0.06), (0.1, 0.1, 0.08)), ((0.2, 0.1, -0.06), (0.1, 0.1, 0.08))]),
    ("species.dusk_mullet", "dusk_mullet", "Dusk Mullet",
     {"body": "#6A5080", "fin": "#4A3060", "accent": "#A080C0"},
     [((0.1, 0.0, 0.0), (0.18, 0.18, 0.18)), ((0.16, 0.06, 0.0), (0.08, 0.1, 0.1))]),
    ("species.bronze_dusk", "bronze_dusk", "Bronze Dusk",
     {"body": "#CD7F32", "fin": "#9A5A20", "accent": "#E0A060"},
     [((0.12, 0.02, 0.0), (0.18, 0.18, 0.18)), ((0.18, 0.08, 0.0), (0.08, 0.1, 0.1))]),
    ("species.shelf_blenny", "shelf_blenny", "Shelf Blenny",
     {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
     [((0.16, 0.06, 0.0), (0.12, 0.1, 0.08)), ((-0.08, -0.04, 0.0), (0.14, 0.06, 0.08))]),
    ("species.opal_shelf", "opal_shelf", "Opal Shelf",
     {"body": "#9AD0C5", "fin": "#68A898", "accent": "#C8F0E8"},
     [((0.14, 0.08, 0.04), (0.12, 0.1, 0.08)), ((0.14, 0.08, -0.04), (0.12, 0.1, 0.08))]),
    ("species.coral_scad", "coral_scad", "Coral Scad",
     {"body": "#E07070", "fin": "#A04040", "accent": "#F0A0A0"},
     [((0.1, 0.04, 0.0), (0.24, 0.1, 0.12)), ((-0.12, -0.04, 0.0), (0.16, 0.06, 0.1))]),
    ("species.gilt_scad", "gilt_scad", "Gilt Scad",
     {"body": "#D0A050", "fin": "#987830", "accent": "#E8C880"},
     [((0.08, 0.05, 0.0), (0.22, 0.1, 0.12)), ((-0.1, 0.0, 0.08), (0.12, 0.08, 0.08))]),
    ("species.storm_drum", "storm_drum", "Storm Drum",
     {"body": "#5A7088", "fin": "#3A5068", "accent": "#90A8C0"},
     [((0.0, 0.0, 0.0), (0.34, 0.26, 0.22)), ((0.12, 0.1, 0.0), (0.1, 0.1, 0.12))]),
    ("species.thunder_storm", "thunder_storm", "Thunder Storm",
     {"body": "#6A5ACD", "fin": "#4A3A9D", "accent": "#A090F0"},
     [((0.02, 0.02, 0.0), (0.32, 0.24, 0.2)), ((0.0, 0.14, 0.0), (0.12, 0.1, 0.1))]),
    ("species.ember_ray", "ember_ray", "Ember Ray",
     {"body": "#D4552A", "fin": "#902010", "accent": "#F09050"},
     [((0.0, 0.0, 0.2), (0.36, 0.04, 0.24)), ((0.0, 0.0, -0.2), (0.36, 0.04, 0.24))]),
    ("species.magma_ember", "magma_ember", "Magma Ember",
     {"body": "#E04020", "fin": "#A02010", "accent": "#F07040"},
     [((0.0, 0.0, 0.18), (0.34, 0.04, 0.22)), ((-0.2, 0.0, 0.0), (0.12, 0.04, 0.1))]),
    ("species.north_smelt", "north_smelt", "North Smelt",
     {"body": "#B8D4E8", "fin": "#88A8C0", "accent": "#E0F0FF"},
     [((0.22, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))]),
    ("species.aurora_north", "aurora_north", "Aurora North",
     {"body": "#6BC4C8", "fin": "#409098", "accent": "#A0E8E8"},
     [((0.2, 0.04, 0.0), (0.18, 0.05, 0.05)), ((0.0, 0.12, 0.0), (0.1, 0.08, 0.08))]),
    ("species.marina_jack", "marina_jack", "Marina Jack",
     {"body": "#2E6B8A", "fin": "#1A4860", "accent": "#60A0C0"},
     [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))]),
    ("species.gilt_marina", "gilt_marina", "Gilt Marina",
     {"body": "#C9A040", "fin": "#907028", "accent": "#E8C060"},
     [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))]),
    ("species.lantern_pike", "lantern_pike", "Lantern Pike",
     {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
     [((0.22, 0.0, 0.0), (0.3, 0.08, 0.08)), ((-0.16, 0.04, 0.0), (0.2, 0.06, 0.06))]),
    ("species.prism_lantern", "prism_lantern", "Prism Lantern",
     {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
     [((0.24, 0.0, 0.0), (0.32, 0.08, 0.08)), ((-0.14, -0.04, 0.0), (0.18, 0.06, 0.06))]),
    ("species.brine_goby", "brine_goby", "Brine Goby",
     {"body": "#C8E0E8", "fin": "#90B0C0", "accent": "#E8F4F8"},
     [((0.2, 0.02, 0.0), (0.1, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))]),
    ("species.crystal_brine", "crystal_brine", "Crystal Brine",
     {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
     [((0.18, 0.06, 0.04), (0.1, 0.06, 0.06)), ((0.18, 0.06, -0.04), (0.1, 0.06, 0.06))]),
    ("species.plaza_wrasse", "plaza_wrasse", "Plaza Wrasse",
     {"body": "#E07070", "fin": "#A04040", "accent": "#F0A0A0"},
     [((0.0, 0.12, 0.0), (0.18, 0.14, 0.1)), ((0.1, 0.0, 0.1), (0.12, 0.1, 0.08))]),
    ("species.crown_plaza", "crown_plaza", "Crown Plaza",
     {"body": "#C9A227", "fin": "#907018", "accent": "#E8C850"},
     [((0.0, 0.11, 0.0), (0.2, 0.12, 0.1)), ((-0.08, 0.0, 0.1), (0.12, 0.1, 0.08))]),
    ("species.mist_tuna", "mist_tuna", "Mist Tuna",
     {"body": "#7FA8C4", "fin": "#507890", "accent": "#B0D0E0"},
     [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))]),
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def patch_themes_py() -> None:
    text = THEMES_PY.read_text(encoding="utf-8")
    # Fully patched when colors + specialty exist (not just FINISH5_ART_AHEAD_IDS).
    if (
        '"mist_sprat": {"body"' in text
        and '"mist_tuna": {"body"' in text
        and "Finish 5.0 Phase 9 specialty" in text
        and '"species.mist_sprat": "mist_sprat"' in text
    ):
        return

    # Drop prior Finish 5 authored block if re-running mid-patch.
    text = re.sub(
        r"\n    # Finish 5\.0 Phase 9 — species 101–125 \(art-ahead\).*?(?=\n\}\n\nTHEME_COLORS)",
        "",
        text,
        flags=re.S,
    )
    insert_authored = "    # Finish 5.0 Phase 9 — species 101–125 (art-ahead)\n"
    for sid, theme, *_ in NEW_SPECIES:
        insert_authored += f'    "{sid}": "{theme}",\n'
    if '    "species.plaza_tuna": "plaza_tuna",\n}\n\nTHEME_COLORS' not in text:
        raise SystemExit("could not locate AUTHORED_SPECIES close for Phase 9 insert")
    text = text.replace(
        '    "species.plaza_tuna": "plaza_tuna",\n}\n\nTHEME_COLORS',
        f'    "species.plaza_tuna": "plaza_tuna",\n{insert_authored}}}\n\nTHEME_COLORS',
    )

    text = re.sub(
        r"\n    # Finish 5\.0 Phase 9 colors.*?(?=\n\}\n\nTHEME_SPECIALTY)",
        "",
        text,
        flags=re.S,
    )
    insert_colors = "    # Finish 5.0 Phase 9 colors\n"
    for _, theme, _, palette, _ in NEW_SPECIES:
        insert_colors += (
            f'    "{theme}": {{"body": "{palette["body"]}", '
            f'"fin": "{palette["fin"]}", "accent": "{palette["accent"]}"}},\n'
        )
    if "Finish 5.0 Phase 9 colors" not in text:
        text = re.sub(
            r'("plaza_tuna": \{[^}]+\},)\n(\}\n\nTHEME_SPECIALTY)',
            rf"\1\n{insert_colors}\2",
            text,
            count=1,
        )

    text = re.sub(
        r"\n    # Finish 5\.0 Phase 9 specialty.*?(?=\n\}\n\n\ndef _finish_part)",
        "",
        text,
        flags=re.S,
    )
    insert_spec = "    # Finish 5.0 Phase 9 specialty\n"
    for _, theme, _, _, boxes in NEW_SPECIES:
        insert_spec += f'    "{theme}": {boxes!r},\n'
    if "Finish 5.0 Phase 9 specialty" not in text:
        text = re.sub(
            r'("plaza_tuna": \[[^\]]+\],)\n(\}\n\n\ndef _finish_part)',
            rf"\1\n{insert_spec}\2",
            text,
            count=1,
        )

    THEMES_PY.write_text(text, encoding="utf-8")


def main() -> None:
    if not SHIP.is_file():
        raise SystemExit(f"missing catalog {SHIP} — write fish-art-5.json first")
    if not PARITY_5.is_file():
        raise SystemExit(f"missing parity {PARITY_5}")

    patch_themes_py()

    # Reload themes after patch.
    import importlib
    import fish_themes
    importlib.reload(fish_themes)

    pass_cat = load(PASS)
    existing = {e["speciesId"] for e in pass_cat["authoredSpecies"]}
    for sid, theme, *_ in NEW_SPECIES:
        if sid in existing:
            continue
        short = sid.split(".", 1)[1]
        pass_cat["authoredSpecies"].append({
            "speciesId": sid,
            "theme": theme,
            "asset": f"shared/assets/models/fish_{short}.glb",
        })
    pass_cat["authoredSpeciesMin"] = 125
    pass_cat["maxTotalAuthoredBytes"] = 4_000_000
    pass_cat["description"] = (
        "Finish 2.0 Phase 20 + Finish 3.0 Phase 9 + Finish 4.0 Phases 7–8 + "
        "Finish 5.0 Phase 9 — all 125 species authored multi-part FishArt meshes "
        "(101–125 art-ahead of content); licenses + size budgets; path contract unchanged."
    )
    if FINISH5 not in pass_cat.get("softFloors", {}):
        pass_cat["softFloors"] = {
            "authoredSpeciesHistoricalMin": 100,
            "artAheadAllowed": True,
            "fishFinish5Marker": FINISH5,
        }
    dump(PASS, pass_cat)

    parity = load(PASS_PARITY)
    parity_ids = {s["speciesId"] for s in parity["expect"]["species"]}
    for sid, theme, *_ in NEW_SPECIES:
        if sid in parity_ids:
            continue
        short = sid.split(".", 1)[1]
        parity["expect"]["species"].append({
            "speciesId": sid,
            "theme": theme,
            "asset": f"fish_{short}.glb",
            "minFishArtNodes": 6,
        })
    parity["authoredSpeciesMin"] = 125
    parity["description"] = (
        "Finish 2.0 Phase 20 + Finish 3.0 Phase 9 + Finish 4.0 Phases 7–8 + "
        "Finish 5.0 Phase 9: all 125 authored fish mesh markers, themes, and byte budgets."
    )
    dump(PASS_PARITY, parity)

    # Generate GLBs for art-ahead species.
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for sid, theme, name, *_ in NEW_SPECIES:
        short = sid.split(".", 1)[1]
        kind = fish_kind(sid, name)
        write_authored_fish(OUT_DIR, sid, f"models/fish_{short}.glb", kind, theme)

    licenses = load(LICENSES)
    record = next((r for r in licenses["records"] if r["id"] == "fish-authored-art"), None)
    if not record:
        raise SystemExit("licenses missing fish-authored-art")
    paths = list(record.get("paths") or [])
    for sid, *_ in NEW_SPECIES:
        short = sid.split(".", 1)[1]
        rel = f"shared/assets/models/fish_{short}.glb"
        if rel not in paths:
            paths.append(rel)
    record["paths"] = paths
    dump(LICENSES, licenses)

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["fishArt5Incomplete"] = False
    kickoff["gaps"]["authoredFishRemaining"] = 0
    kickoff.setdefault("baseline", {})["authoredFish"] = 125
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["fishArt5Phase"] = 9
    listing["fishArt5Catalog"] = "shared/ship/fish-art-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["fishArt5"] = "shared/ship/fish-art-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-fish-art-5.json" not in fixtures:
        fixtures.append("parity-fish-art-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod.setdefault("quotas", {})["authoredFishSpecies"] = 125
    dod["fishArt5"] = {
        "phase": 9,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "fishArt5Marker": MARKER,
        "catalog": "shared/ship/fish-art-5.json",
        "parityFixture": "shared/fixtures/parity-fish-art-5.json",
        "validateScript": "npm run fishart5:validate",
        "checklist": [
            "25 art-ahead meshes for species 101–125 stamped fishFinish5=fish-art-5",
            "fish-art-pass authoredSpecies = 125",
            "gaps.fishArt5Incomplete closed; authoredFishRemaining = 0",
            "speciesRemaining stays 25 until Phase 13",
            "fishart5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase9 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 9), None)
    if not phase9 or phase9.get("validate") != "fishart5:validate":
        raise SystemExit("kickoff phase 9 must validate via fishart5:validate")
    print(f"OK author_fish_art_5 — {len(NEW_SPECIES)} art-ahead meshes; authoredFish=125; fishArt5Incomplete closed")


if __name__ == "__main__":
    main()
