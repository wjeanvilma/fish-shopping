#!/usr/bin/env python3
"""
Finish 6.0 Phase 11 — atmosphere/cozy render depth 6.

Regenerates harbor blockouts with atmosphereFinish6 stamps (retaining Finish 5
atmosphere + cozy + scenic markers), closes gaps.atmosphere6Incomplete, and
wires listing/pin/DoD + ship catalog.

Usage:
  python3 shared/tools/author_atmosphere_6.py
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(Path(__file__).resolve().parent))

import cozy_art  # noqa: E402

SHIP = ROOT / "ship" / "atmosphere-6.json"
PARITY = ROOT / "fixtures" / "parity-atmosphere-6.json"
PASS = ROOT / "ship" / "harbor-art-pass.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY_F6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
GENERATOR = ROOT / "tools" / "generate_blockout.py"

MARKER = "authored-finish-6.0-phase-11"
FINISH6 = cozy_art.ATMOSPHERE_FINISH6_MARKER
FINISH5 = cozy_art.ATMOSPHERE_FINISH5_MARKER
COZY = cozy_art.COZY_ART_MARKER


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def write_ship(harbor_n: int) -> None:
    catalog = {
        "phase": 11,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.atmosphere_6.v1",
        "description": (
            "Finish 6.0 Phase 11 — atmosphere/cozy render depth 6. Stamps "
            f"atmosphereFinish6={FINISH6} on all {harbor_n} harbor GLBs while retaining "
            f"{FINISH5} + {COZY} + harbor-art-3 scenic. Closes gaps.atmosphere6Incomplete. "
            "Schema stays 26 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "atmosphere6Marker": MARKER,
        "atmosphereFinish6Marker": FINISH6,
        "atmosphereFinish5Marker": FINISH5,
        "cozyArtMarker": COZY,
        "harborScenicMarker": "harbor-art-3",
        "harborArtPassCatalog": "shared/ship/harbor-art-pass.json",
        "finish6HarborTarget": harbor_n,
        "themesModule": "shared/tools/cozy_art.py",
        "generator": "shared/tools/generate_blockout.py",
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "gapClosed": "atmosphere6Incomplete",
        "gapClosedValue": False,
        "parityFixture": "shared/fixtures/parity-atmosphere-6.json",
        "authorTool": "shared/tools/author_atmosphere_6.py",
        "validateScript": "npm run atmosphere6:validate",
        "renderModules": [
            "web/src/render/atmosphere.ts",
            "web/src/render/cozyScene.ts",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Atmosphere.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/CozyAtmospherePass.kt",
        ],
        "requiredSockets": ["Water", "Foam"],
        "requiredSocketPrefixes": ["LampGlow_"],
        "checklist": [
            f"All {harbor_n} harbor GLBs carry atmosphereFinish6={FINISH6}",
            f"envArt includes {FINISH6} while retaining {FINISH5} + {COZY} + harbor-art-3",
            "Water/Foam/LampGlow sockets present",
            "Render modules present (web + Android)",
            "gaps.atmosphere6Incomplete = false",
            "atmosphere5:validate still green",
            "atmosphere6:validate green in CI",
            "schema stays 26 / content 5.0.0",
        ],
        "preflightGates": [
            "shared/ship/atmosphere-6.json",
            "shared/fixtures/parity-atmosphere-6.json",
            "shared/ship/harbor-art-pass.json",
            "shared/ship/finish-6.0-kickoff.json",
            "shared/tools/cozy_art.py",
            "shared/tools/generate_blockout.py",
            "shared/tools/author_atmosphere_6.py",
            "shared/assets/models/sunrise_pier_blockout.glb",
            "shared/assets/models/saffron_quay_blockout.glb",
            "shared/assets/models/cobalt_sound_blockout.glb",
            "web/src/render/atmosphere.ts",
            "web/src/render/cozyScene.ts",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/Atmosphere.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/render/CozyAtmospherePass.kt",
            "web/src/ship/atmosphere6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Atmosphere6.kt",
            "web/scripts/validate-atmosphere-6.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixtures.parity_atmosphere_6.v1",
        "atmosphere6Marker": MARKER,
        "atmosphereFinish6Marker": FINISH6,
        "atmosphereFinish5Marker": FINISH5,
        "phase": 11,
        "plan": "30_finish_6.0",
        "expect": {
            "finish6HarborTarget": harbor_n,
            "schemaVersion": 26,
            "contentVersion": "5.0.0",
            "atmosphere6IncompleteClosed": True,
            "openGapFlagMin": 17,
            "gates": [
                "harbors_stamped",
                "sockets_present",
                "render_modules",
                "gap_closed",
                "kickoff_phase_wired",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def main() -> None:
    rc = subprocess.call([sys.executable, str(GENERATOR)], cwd=str(ROOT.parent))
    if rc != 0:
        raise SystemExit(f"generate_blockout.py failed with {rc}")

    pass_cat = load(PASS)
    harbors = pass_cat.get("authoredHarbors", [])
    harbor_n = len(harbors)
    if harbor_n < cozy_art.ATMOSPHERE_FINISH6_HARBOR_MIN:
        raise SystemExit(
            f"authored harbors {harbor_n} < {cozy_art.ATMOSPHERE_FINISH6_HARBOR_MIN}"
        )

    soft = pass_cat.setdefault("softFloors", {})
    soft["atmosphereFinish5Marker"] = FINISH5
    soft["atmosphereFinish6Marker"] = FINISH6
    soft["cozyArtMarker"] = COZY
    dump(PASS, pass_cat)

    write_ship(harbor_n)

    kickoff = load(KICKOFF)
    kickoff.setdefault("gaps", {})["atmosphere6Incomplete"] = False
    dump(KICKOFF, kickoff)

    if PARITY_F6.is_file():
        pfx = load(PARITY_F6)
        pfx.setdefault("expect", {})["openGapFlagMin"] = 17
        dump(PARITY_F6, pfx)

    listing = load(LISTING)
    listing["atmosphere6Phase"] = 11
    listing["atmosphere6Catalog"] = "shared/ship/atmosphere-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["atmosphere6"] = "shared/ship/atmosphere-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-atmosphere-6.json" not in fixtures:
        fixtures.append("parity-atmosphere-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    dod = load(DOD)
    dod["atmosphere6"] = {
        "phase": 11,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "atmosphere6Marker": MARKER,
        "catalog": "shared/ship/atmosphere-6.json",
        "parityFixture": "shared/fixtures/parity-atmosphere-6.json",
        "validateScript": "npm run atmosphere6:validate",
        "checklist": [
            f"All {harbor_n} harbors stamped atmosphereFinish6={FINISH6}",
            "Water/Foam/LampGlow sockets retained with cozy-art-5",
            "gaps.atmosphere6Incomplete closed",
            "atmosphere6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    phase11 = next((p for p in kickoff.get("phases", []) if p.get("phase") == 11), None)
    if not phase11 or phase11.get("validate") != "atmosphere6:validate":
        raise SystemExit("kickoff phase 11 must validate via atmosphere6:validate")

    print(
        f"OK author_atmosphere_6 — "
        f"{harbor_n} harbors stamped; atmosphere6Incomplete closed"
    )


if __name__ == "__main__":
    main()
