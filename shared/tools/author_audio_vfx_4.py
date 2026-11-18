#!/usr/bin/env python3
"""
Finish 4.0 Phase 23 — audio pack 4 + VFX juice 4 catalog lock helper.

Usage:
  python3 shared/tools/author_audio_vfx_4.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIO_SHIP = ROOT / "ship" / "audio-pack-4.json"
VFX_SHIP = ROOT / "ship" / "vfx-juice-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LICENSES = ROOT / "store" / "licenses.json"

MARKER = "authored-finish-4.0-phase-23"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not AUDIO_SHIP.is_file() or not VFX_SHIP.is_file():
        raise SystemExit("missing audio-pack-4 / vfx-juice-4 catalogs")

    listing = load(LISTING)
    listing["audioPack4Phase"] = 23
    listing["audioPack4Catalog"] = "shared/ship/audio-pack-4.json"
    listing["vfxJuice4Phase"] = 23
    listing["vfxJuice4Catalog"] = "shared/ship/vfx-juice-4.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["audioPack4"] = "shared/ship/audio-pack-4.json"
    pin["vfxJuice4"] = "shared/ship/vfx-juice-4.json"
    fixtures = list(pin.get("fixtures") or [])
    for fx in ("parity-audio-pack-4.json", "parity-vfx-juice-4.json"):
        if fx not in fixtures:
            fixtures.append(fx)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["audioPack4Stingers"] = 9
    quotas["audioPack4Beds"] = 2
    quotas["vfxJuice4BurstKinds"] = 7
    quotas["vfxJuice4ShakeKinds"] = 2
    quotas["endgameAmbientModes"] = 3
    dod["audioPack4"] = {
        "phase": 23,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "audioPackMarker": MARKER,
        "catalog": "shared/ship/audio-pack-4.json",
        "parityFixture": "shared/fixtures/parity-audio-pack-4.json",
        "validateScript": "npm run audiovfx4:validate",
        "checklist": [
            "≥9 pack-4 stingers",
            "≥2 pack-4 beds (endgame/ledger)",
            "ducking frozen",
            "audiovfx4:validate green in CI",
        ],
    }
    dod["vfxJuice4"] = {
        "phase": 23,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "vfxJuice4Marker": MARKER,
        "catalog": "shared/ship/vfx-juice-4.json",
        "parityFixture": "shared/fixtures/parity-vfx-juice-4.json",
        "validateScript": "npm run audiovfx4:validate",
        "checklist": [
            "≥7 event bursts",
            "≥2 endgame shakes",
            "≥3 endgame ambient modes",
            "audiovfx4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    licenses = load(LICENSES)
    records = licenses.setdefault("records", [])
    if not any(n.get("id") == "authored-audio-pack-4" for n in records):
        # Insert before content-pack / third-party if present; else append.
        insert_at = next(
            (i for i, n in enumerate(records) if n.get("id") in ("content-pack", "third-party-runtime")),
            len(records),
        )
        records.insert(
            insert_at,
            {
                "id": "authored-audio-pack-4",
                "paths": [
                    "shared/audio/sfx/decor.wav",
                    "shared/audio/sfx/cosmetic.wav",
                    "shared/audio/sfx/endgame_tier.wav",
                    "shared/audio/sfx/endgame_challenge.wav",
                    "shared/audio/sfx/contract_accept.wav",
                    "shared/audio/sfx/bait.wav",
                    "shared/audio/sfx/full_unlock.wav",
                    "shared/audio/sfx/machine_break.wav",
                    "shared/audio/sfx/spoil.wav",
                    "shared/audio/music/endgame.wav",
                    "shared/audio/music/ledger.wav",
                ],
                "kind": "audio",
                "origin": "first_party_authored",
                "tool": "shared/tools/generate_sfx_pack.py + shared/tools/generate_music_pack.py",
                "rights": "original",
                "note": "Finish 4.0 Phase 23 pack-4 stingers + endgame/ledger beds (plan 30_finish_4.0). Ducking policy unchanged from music-pack.json.",
            },
        )
        dump(LICENSES, licenses)

    kickoff = load(KICKOFF)
    phase23 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 23), None)
    if not phase23 or phase23.get("validate") != "audiovfx4:validate":
        raise SystemExit("kickoff phase 23 must validate via audiovfx4:validate")
    print("OK author_audio_vfx_4 — listing/pin/DoD/licenses wired")


if __name__ == "__main__":
    main()
