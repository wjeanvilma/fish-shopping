#!/usr/bin/env python3
"""
Finish 5.0 Phase 12 — audio pack 5 + VFX juice 5 catalog lock helper.

Closes gaps.audioVfx5Incomplete and wires listing/pin/DoD/licenses.

Usage:
  python3 shared/tools/author_audio_vfx_5.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_SHIP = ROOT / "ship" / "audio-pack-5.json"
VFX_SHIP = ROOT / "ship" / "vfx-juice-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LICENSES = ROOT / "store" / "licenses.json"
BUDGET = ROOT / "perf" / "budget-gate.json"

MARKER = "authored-finish-5.0-phase-12"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not AUDIO_SHIP.is_file() or not VFX_SHIP.is_file():
        raise SystemExit("missing audio-pack-5 / vfx-juice-5 catalogs")

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["audioVfx5Incomplete"] = False
    dump(KICKOFF, kickoff)

    listing = load(LISTING)
    listing["audioPack5Phase"] = 12
    listing["audioPack5Catalog"] = "shared/ship/audio-pack-5.json"
    listing["vfxJuice5Phase"] = 12
    listing["vfxJuice5Catalog"] = "shared/ship/vfx-juice-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["audioPack5"] = "shared/ship/audio-pack-5.json"
    pin["vfxJuice5"] = "shared/ship/vfx-juice-5.json"
    fixtures = list(pin.get("fixtures") or [])
    for fx in ("parity-audio-pack-5.json", "parity-vfx-juice-5.json"):
        if fx not in fixtures:
            fixtures.append(fx)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["audioPack5Stingers"] = 5
    quotas["audioPack5Beds"] = 1
    quotas["vfxJuice5BurstKinds"] = 5
    quotas["vfxJuice5ShakeKinds"] = 2
    quotas["pressureAmbientModes"] = 3
    dod["audioPack5"] = {
        "phase": 12,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "audioPackMarker": MARKER,
        "catalog": "shared/ship/audio-pack-5.json",
        "parityFixture": "shared/fixtures/parity-audio-pack-5.json",
        "validateScript": "npm run audiovfx5:validate",
        "checklist": [
            "≥5 pack-5 stingers",
            "≥1 pack-5 bed (pressure)",
            "ducking frozen",
            "gaps.audioVfx5Incomplete closed",
            "audiovfx5:validate green in CI",
        ],
    }
    dod["vfxJuice5"] = {
        "phase": 12,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "vfxJuice5Marker": MARKER,
        "catalog": "shared/ship/vfx-juice-5.json",
        "parityFixture": "shared/fixtures/parity-vfx-juice-5.json",
        "validateScript": "npm run audiovfx5:validate",
        "checklist": [
            "≥5 event bursts",
            "≥2 Finish 5 shakes",
            "≥3 pressure ambient modes",
            "gaps.audioVfx5Incomplete closed",
            "audiovfx5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    budget = load(BUDGET)
    budget["vfxJuice5Phase"] = 12
    budget["vfxJuice5Catalog"] = "shared/ship/vfx-juice-5.json"
    dump(BUDGET, budget)

    licenses = load(LICENSES)
    records = licenses.setdefault("records", [])
    if not any(n.get("id") == "authored-audio-pack-5" for n in records):
        insert_at = next(
            (i for i, n in enumerate(records) if n.get("id") in ("content-pack", "third-party-runtime")),
            len(records),
        )
        records.insert(
            insert_at,
            {
                "id": "authored-audio-pack-5",
                "paths": [
                    "shared/audio/sfx/cast_strike.wav",
                    "shared/audio/sfx/spoil_warn.wav",
                    "shared/audio/sfx/service_queue.wav",
                    "shared/audio/sfx/contract_deadline.wav",
                    "shared/audio/sfx/quest_near.wav",
                    "shared/audio/music/pressure.wav",
                ],
                "kind": "audio",
                "origin": "first_party_authored",
                "tool": "shared/tools/generate_sfx_pack.py + shared/tools/generate_music_pack.py",
                "rights": "original",
                "note": "Finish 5.0 Phase 12 pack-5 cast/spoil/service/contract/quest stingers + pressure bed (plan 30_finish_5.0). Ducking policy unchanged from music-pack.json.",
            },
        )
        dump(LICENSES, licenses)

    phase12 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 12), None)
    if not phase12 or phase12.get("validate") != "audiovfx5:validate":
        raise SystemExit("kickoff phase 12 must validate via audiovfx5:validate")
    if kickoff.get("gaps", {}).get("audioVfx5Incomplete") is not False:
        raise SystemExit("audioVfx5Incomplete must be closed")
    print("OK author_audio_vfx_5 — listing/pin/DoD/licenses wired; audioVfx5Incomplete closed")


if __name__ == "__main__":
    main()
