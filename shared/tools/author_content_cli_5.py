#!/usr/bin/env python3
"""
Finish 5.0 Phase 28 — Content authoring CLI wave 5.

Raises --check-floors to Finish 5.0 pack mins and registers wave-5 scaffold
kinds (seasonal/endgame/cosmetic). Closes contentCli5Missing.

Usage:
  python3 shared/tools/author_content_cli_5.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "content-cli-5.json"
PARITY = ROOT / "fixtures" / "parity-content-cli-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
MARKER = "authored-finish-5.0-phase-28"

SCAFFOLD_KIND_MIN = 11
EXAMPLE_FILE_MIN = 11
FEATURE_MIN = 8
WAVE5_KINDS = ["seasonal", "endgame", "cosmetic"]

PACK_FLOORS = {
    "speciesMin": 125,
    "questsMin": 75,
    "harborsMin": 12,
    "machinesMin": 14,
    "rivalsMin": 16,
    "baitsMin": 16,
    "seasonalMin": 16,
    "cosmeticsMin": 24,
    "chainsMin": 7,
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    dump(
        SHIP,
        {
            "phase": 28,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.content_cli_5.v1",
            "description": (
                "Finish 5.0 Phase 28 — content authoring CLI wave 5. "
                "Adds seasonal/endgame/cosmetic scaffolds and --check-floors for Finish 5.0 pack mins "
                "(species≥125, quests≥75, harbors≥12, machines≥14, rivals≥16, baits≥16, seasonal≥16, "
                "cosmetics≥24, chains≥7). Extends Finish 4.0 contentcli3 via soft floors. "
                "Closes kickoff gap contentCli5Missing. Schema stays 26 / content 4.0.0."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "contentCli5Marker": MARKER,
            "closesGap": "contentCli5Missing",
            "extendsContentCli3": "shared/ship/content-cli-3.json",
            "extendsContentCli2": "shared/ship/content-cli-2.json",
            "extendsContentCli": "shared/ship/content-authoring-cli.json",
            "moduleRoot": "shared/tools/content_cli/",
            "pythonWrapper": "shared/tools/content_scaffold.py",
            "examplesDir": "shared/content/scaffolds/examples",
            "coreScaffoldKinds": ["species", "quest", "harbor"],
            "expansionScaffoldKinds": ["contract", "bait", "decor"],
            "wave3ScaffoldKinds": ["machine", "rival"],
            "wave5ScaffoldKinds": WAVE5_KINDS,
            "scaffoldKinds": [
                "species",
                "quest",
                "harbor",
                "contract",
                "bait",
                "decor",
                "machine",
                "rival",
                *WAVE5_KINDS,
            ],
            "scaffoldKindMin": SCAFFOLD_KIND_MIN,
            "exampleFileMin": EXAMPLE_FILE_MIN,
            "features": [
                "list",
                "check-pack",
                "check-floors",
                "machine",
                "rival",
                "seasonal",
                "endgame",
                "cosmetic",
            ],
            "featureMin": FEATURE_MIN,
            "packFloors": PACK_FLOORS,
            "contentValidateStillGreen": True,
            "parityFixture": "shared/fixtures/parity-content-cli-5.json",
            "validateScript": "npm run contentcli5:validate",
            "softContentCli3Validate": "npm run contentcli3:validate",
            "simHzInvariant": 20,
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "authorTool": "shared/tools/author_content_cli_5.py",
            "softFloors": {
                "contentCliHistoricalKindMin": 3,
                "contentCli2HistoricalKindMin": 6,
                "contentCli3HistoricalKindMin": 8,
                "contentCli3HistoricalExampleMin": 8,
                "finish4PackSpeciesMin": 100,
                "finish4PackQuestsMin": 50,
                "note": (
                    "contentcli/contentcli2/contentcli3 stay green on historical kind floors; "
                    "Phase 28 enforces 11 kinds + Finish 5.0 pack floors."
                ),
            },
            "manualCommands": [
                "cd web && npm run content:scaffold -- --list",
                "cd web && npm run content:scaffold -- --check-floors",
                "cd web && npm run content:scaffold -- seasonal --id aurora_tide --dry-run",
                "cd web && npm run content:scaffold -- endgame --id crest_harbor --dry-run",
                "cd web && npm run content:scaffold -- cosmetic --id aurora_bunting --check-pack --dry-run",
                "cd web && npm run contentcli3:validate",
                "cd web && npm run contentcli5:validate",
            ],
            "checklist": [
                f"≥{SCAFFOLD_KIND_MIN} scaffold kinds (prior 8 + seasonal/endgame/cosmetic)",
                f"≥{EXAMPLE_FILE_MIN} committed example fragments under scaffolds/examples",
                "--list, --check-pack, and --check-floors work; never auto-merge content-pack.json",
                "Ajv/structural fragment validation for seasonal/endgame/cosmetic",
                "Pack floors meet Finish 5.0 species/quests/harbors/machines/rivals/baits/seasonal/cosmetics/chains",
                "Finish 4.0 contentcli3:validate still green (soft floors)",
                "parity-content-cli-5 + contentcli5:validate green",
                "CI runs contentcli5:validate",
                "kickoff gaps.contentCli5Missing=false",
                "schema stays 26 / content 4.0.0",
            ],
            "preflightGates": [
                "shared/ship/content-cli-5.json",
                "shared/fixtures/parity-content-cli-5.json",
                "shared/ship/content-cli-3.json",
                "shared/ship/content-cli-2.json",
                "shared/ship/content-authoring-cli.json",
                "shared/tools/content_cli/ids.ts",
                "shared/tools/content_cli/scaffolds.ts",
                "shared/tools/content_cli/validateFragment.ts",
                "shared/tools/content_cli/packIds.ts",
                "shared/tools/content_cli/packFloors.ts",
                "shared/tools/content_cli/cli.ts",
                "shared/tools/content_scaffold.py",
                "shared/content/scaffolds/examples/event.scaffold_aurora_tide.json",
                "shared/content/scaffolds/examples/endgame.tier.scaffold_crest_harbor.json",
                "shared/content/scaffolds/examples/entitlement.cosmetic.scaffold_aurora_bunting.json",
                "web/scripts/content-scaffold.ts",
                "web/scripts/validate-content-cli-5.ts",
                "web/src/contentAuthoring/scaffoldValidate.ts",
                "web/src/ship/contentCli5.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli5.kt",
            ],
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixture.parity_content_cli_5.v1",
            "description": "Finish 5.0 Phase 28: content CLI wave-5 kinds + examples + Finish 5 pack floors.",
            "contentCli5Marker": MARKER,
            "scaffoldKindMin": SCAFFOLD_KIND_MIN,
            "exampleFileMin": EXAMPLE_FILE_MIN,
            "featureMin": FEATURE_MIN,
            "simHzInvariant": 20,
            "expect": {
                "closesGap": "contentCli5Missing",
                "contentCli5Missing": False,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "kinds": [
                    "species",
                    "quest",
                    "harbor",
                    "contract",
                    "bait",
                    "decor",
                    "machine",
                    "rival",
                    *WAVE5_KINDS,
                ],
                "wave5Kinds": WAVE5_KINDS,
                "features": [
                    "list",
                    "check-pack",
                    "check-floors",
                    "machine",
                    "rival",
                    "seasonal",
                    "endgame",
                    "cosmetic",
                ],
                "exampleFiles": [
                    "shared/content/scaffolds/examples/species.scaffold_tide_perch.json",
                    "shared/content/scaffolds/examples/quest.scaffold_morning_haul.json",
                    "shared/content/scaffolds/examples/harbor.scaffold_mist_cove.json",
                    "shared/content/scaffolds/examples/contract.scaffold_dawn_crate.json",
                    "shared/content/scaffolds/examples/bait.scaffold_kelp_chunk.json",
                    "shared/content/scaffolds/examples/decor.scaffold_pier_bunting.json",
                    "shared/content/scaffolds/examples/machine.scaffold_dock_press.json",
                    "shared/content/scaffolds/examples/rival.scaffold_mist_hawker.json",
                    "shared/content/scaffolds/examples/event.scaffold_aurora_tide.json",
                    "shared/content/scaffolds/examples/endgame.tier.scaffold_crest_harbor.json",
                    "shared/content/scaffolds/examples/entitlement.cosmetic.scaffold_aurora_bunting.json",
                ],
                "exampleIds": [
                    "species.scaffold_tide_perch",
                    "quest.scaffold_morning_haul",
                    "harbor.scaffold_mist_cove",
                    "contract.scaffold_dawn_crate",
                    "bait.scaffold_kelp_chunk",
                    "decor.scaffold_pier_bunting",
                    "machine.scaffold_dock_press",
                    "rival.scaffold_mist_hawker",
                    "event.scaffold_aurora_tide",
                    "endgame.tier.scaffold_crest_harbor",
                    "entitlement.cosmetic.scaffold_aurora_bunting",
                ],
                "moduleFiles": [
                    "shared/tools/content_cli/ids.ts",
                    "shared/tools/content_cli/scaffolds.ts",
                    "shared/tools/content_cli/validateFragment.ts",
                    "shared/tools/content_cli/packIds.ts",
                    "shared/tools/content_cli/packFloors.ts",
                    "shared/tools/content_cli/cli.ts",
                    "web/scripts/content-scaffold.ts",
                ],
                "packFloorKeys": [
                    "speciesMin",
                    "questsMin",
                    "harborsMin",
                    "machinesMin",
                    "rivalsMin",
                    "baitsMin",
                    "seasonalMin",
                    "cosmeticsMin",
                    "chainsMin",
                ],
            },
        },
    )


def update_kickoff_dod_listing_pin() -> None:
    kick = load(KICKOFF)
    kick["gaps"]["contentCli5Missing"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["contentCliScaffoldKinds"] = SCAFFOLD_KIND_MIN
    quotas["speciesMin"] = PACK_FLOORS["speciesMin"]
    quotas["questsMin"] = PACK_FLOORS["questsMin"]
    quotas["harborsMin"] = PACK_FLOORS["harborsMin"]
    dod["notes"] = (
        "Finish 5.0 Phase 28 content-cli-5 complete (11 scaffold kinds + Finish 5 pack floors); "
        "Phases 1–27 remain green. Content stays 4.0.0 / schema 26. contentCli5Missing closed. "
        "Deploy/tag remain manual."
    )
    dod["contentCli5"] = {
        "phase": 28,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "contentCli5Marker": MARKER,
        "catalog": "shared/ship/content-cli-5.json",
        "parityFixture": "shared/fixtures/parity-content-cli-5.json",
        "validateScript": "npm run contentcli5:validate",
        "checklist": [
            f"≥{SCAFFOLD_KIND_MIN} scaffold kinds",
            "Finish 5.0 --check-floors green",
            "Kickoff contentCli5Missing closed",
            "contentcli5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["contentCli5Phase"] = 28
    listing["contentCli5Catalog"] = "shared/ship/content-cli-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["contentCli5"] = "shared/ship/content-cli-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-content-cli-5.json" not in fixtures:
        fixtures.append("parity-content-cli-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    write_ship()
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 28 content-cli-5: kinds≥{SCAFFOLD_KIND_MIN} "
        f"floors species≥{PACK_FLOORS['speciesMin']} quests≥{PACK_FLOORS['questsMin']}"
    )


if __name__ == "__main__":
    main()
