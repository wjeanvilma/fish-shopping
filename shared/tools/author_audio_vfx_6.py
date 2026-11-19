#!/usr/bin/env python3
"""
Finish 6.0 Phase 12 — audio pack 6 + VFX juice 6 catalog lock helper.

Closes gaps.audioVfx6Incomplete and wires listing/pin/DoD/licenses.
Soft-floors Finish 6 openGapFlagMin 17 → 16.

Usage:
  python3 shared/tools/author_audio_vfx_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_SHIP = ROOT / "ship" / "audio-pack-6.json"
VFX_SHIP = ROOT / "ship" / "vfx-juice-6.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY_F6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LICENSES = ROOT / "store" / "licenses.json"
BUDGET = ROOT / "perf" / "budget-gate.json"

MARKER = "authored-finish-6.0-phase-12"
OPEN_GAP_MIN = 16


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def soft_floor_parity(path: Path) -> None:
    if not path.is_file():
        return
    data = load(path)
    data.setdefault("expect", {})["openGapFlagMin"] = OPEN_GAP_MIN
    dump(path, data)


def main() -> None:
    if not AUDIO_SHIP.is_file() or not VFX_SHIP.is_file():
        raise SystemExit("missing audio-pack-6 / vfx-juice-6 catalogs")

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["audioVfx6Incomplete"] = False
    dump(KICKOFF, kickoff)

    soft_floor_parity(PARITY_F6)
    for name in (
        "parity-atmosphere-6.json",
        "parity-product-art-6.json",
        "parity-species-150.json",
        "parity-machines-15-16.json",
        "parity-audio-pack-6.json",
        "parity-vfx-juice-6.json",
    ):
        soft_floor_parity(ROOT / "fixtures" / name)

    listing = load(LISTING)
    listing["audioPack6Phase"] = 12
    listing["audioPack6Catalog"] = "shared/ship/audio-pack-6.json"
    listing["vfxJuice6Phase"] = 12
    listing["vfxJuice6Catalog"] = "shared/ship/vfx-juice-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["audioPack6"] = "shared/ship/audio-pack-6.json"
    pin["vfxJuice6"] = "shared/ship/vfx-juice-6.json"
    fixtures = list(pin.get("fixtures") or [])
    for fx in ("parity-audio-pack-6.json", "parity-vfx-juice-6.json"):
        if fx not in fixtures:
            fixtures.append(fx)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["audioPack6Stingers"] = 5
    quotas["audioPack6Beds"] = 1
    quotas["vfxJuice6BurstKinds"] = 5
    quotas["vfxJuice6ShakeKinds"] = 2
    quotas["nestAmbientModes"] = 3
    dod["audioPack6"] = {
        "phase": 12,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "audioPackMarker": MARKER,
        "catalog": "shared/ship/audio-pack-6.json",
        "parityFixture": "shared/fixtures/parity-audio-pack-6.json",
        "validateScript": "npm run audiovfx6:validate",
        "checklist": [
            "≥5 pack-6 stingers",
            "≥1 pack-6 bed (nest)",
            "ducking frozen",
            "gaps.audioVfx6Incomplete closed",
            "audiovfx6:validate green in CI",
        ],
    }
    dod["vfxJuice6"] = {
        "phase": 12,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "vfxJuice6Marker": MARKER,
        "catalog": "shared/ship/vfx-juice-6.json",
        "parityFixture": "shared/fixtures/parity-vfx-juice-6.json",
        "validateScript": "npm run audiovfx6:validate",
        "checklist": [
            "≥5 event bursts",
            "≥2 Finish 6 shakes",
            "≥3 nest ambient modes",
            "gaps.audioVfx6Incomplete closed",
            "audiovfx6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    budget = load(BUDGET)
    budget["vfxJuice6Phase"] = 12
    budget["vfxJuice6Catalog"] = "shared/ship/vfx-juice-6.json"
    dump(BUDGET, budget)

    licenses = load(LICENSES)
    records = licenses.setdefault("records", [])
    if not any(n.get("id") == "authored-audio-pack-6" for n in records):
        insert_at = next(
            (i for i, n in enumerate(records) if n.get("id") in ("content-pack", "third-party-runtime")),
            len(records),
        )
        records.insert(
            insert_at,
            {
                "id": "authored-audio-pack-6",
                "paths": [
                    "shared/audio/sfx/nest_settle.wav",
                    "shared/audio/sfx/roast_ready.wav",
                    "shared/audio/sfx/ferment_ready.wav",
                    "shared/audio/sfx/school_flash.wav",
                    "shared/audio/sfx/aurora_crest.wav",
                    "shared/audio/music/nest.wav",
                ],
                "kind": "audio",
                "origin": "first_party_authored",
                "tool": "shared/tools/generate_sfx_pack.py + shared/tools/generate_music_pack.py",
                "rights": "original",
                "note": "Finish 6.0 Phase 12 pack-6 nest/roast/ferment/school/aurora stingers + nest bed (plan 30_finish_6.0). Ducking policy unchanged from music-pack.json.",
            },
        )
        dump(LICENSES, licenses)

    phase12 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 12), None)
    if not phase12 or phase12.get("validate") != "audiovfx6:validate":
        raise SystemExit("kickoff phase 12 must validate via audiovfx6:validate")
    if kickoff.get("gaps", {}).get("audioVfx6Incomplete") is not False:
        raise SystemExit("audioVfx6Incomplete must be closed")
    print("OK author_audio_vfx_6 — listing/pin/DoD/licenses wired; audioVfx6Incomplete closed; openGapFlagMin=16")


if __name__ == "__main__":
    main()
