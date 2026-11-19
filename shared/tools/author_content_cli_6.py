#!/usr/bin/env python3
"""
Finish 6.0 Phase 27 — Content authoring CLI wave 6 + modular packs.

Adds chain/sigil/modpack scaffolds, Finish 6.0 --check-floors, and
--list-modpacks/--check-modpacks. Closes contentCli6Missing (openFlags 3→2).

Usage:
  python3 shared/tools/author_content_cli_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "content-cli-6.json"
PARITY = ROOT / "fixtures" / "parity-content-cli-6.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
FINISH6_PARITY = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
ANALYTICS_PARITY = ROOT / "fixtures" / "parity-analytics-loadtest-6.json"
MARKER = "authored-finish-6.0-phase-27"

SCAFFOLD_KIND_MIN = 14
EXAMPLE_FILE_MIN = 14
FEATURE_MIN = 11
WAVE6_KINDS = ["chain", "sigil", "modpack"]
OPEN_GAP_FLAG_MIN = 2

PACK_FLOORS = {
    "speciesMin": 150,
    "questsMin": 100,
    "harborsMin": 14,
    "machinesMin": 16,
    "rivalsMin": 20,
    "baitsMin": 20,
    "seasonalMin": 20,
    "cosmeticsMin": 30,
    "chainsMin": 9,
}

ALL_KINDS = [
    "species",
    "quest",
    "harbor",
    "contract",
    "bait",
    "decor",
    "machine",
    "rival",
    "seasonal",
    "endgame",
    "cosmetic",
    *WAVE6_KINDS,
]

FEATURES = [
    "list",
    "check-pack",
    "check-floors",
    "list-modpacks",
    "check-modpacks",
    "machine",
    "rival",
    "seasonal",
    "endgame",
    "cosmetic",
    "chain",
    "sigil",
    "modpack",
]

EXAMPLE_FILES = [
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
    "shared/content/scaffolds/examples/chain.scaffold_nest_relay.json",
    "shared/content/scaffolds/examples/endgame.sigil.scaffold_nest_ember.json",
    "shared/content/scaffolds/examples/pack.scaffold_nest_saffron.json",
]

EXAMPLE_IDS = [
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
    "chain.scaffold_nest_relay",
    "endgame.sigil.scaffold_nest_ember",
    "pack.scaffold_nest_saffron",
]

MODPACK_EXAMPLE = ROOT / "content" / "scaffolds" / "modpacks" / "pack.scaffold_nest_saffron.json"


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_examples() -> None:
    dump(
        ROOT / "content" / "scaffolds" / "examples" / "chain.scaffold_nest_relay.json",
        {
            "id": "chain.scaffold_nest_relay",
            "name": "Nest Relay",
            "description": (
                "Authoring scaffold delivery chain for Nest Relay. "
                "Author 3 contract steps with this chainId before merge."
            ),
            "steps": 3,
            "requiresHarbor": "harbor.sunrise_pier",
            "contractIdHints": [
                "contract.chain_scaffold_nest_relay_1",
                "contract.chain_scaffold_nest_relay_2",
                "contract.chain_scaffold_nest_relay_3",
            ],
        },
    )
    dump(
        ROOT / "content" / "scaffolds" / "examples" / "endgame.sigil.scaffold_nest_ember.json",
        {
            "id": "endgame.sigil.scaffold_nest_ember",
            "name": "Nest Ember",
            "description": (
                "Authoring scaffold nest sigil. Reference from endgame.challenge.grantsSigil "
                "before merge — fragment is not auto-merged."
            ),
            "grantsFromChallengeHint": "endgame.challenge.scaffold_nest_ember",
            "requiresPrestigeCount": 10,
            "powerNeutral": True,
        },
    )
    pack_doc = {
        "id": "pack.scaffold_nest_saffron",
        "name": "Nest Saffron Modular Pack",
        "description": (
            "Authoring scaffold modular content pack. Lists fragment kinds to author "
            "together; never auto-merges content-pack.json."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "includes": ["chain", "sigil", "seasonal", "cosmetic"],
        "fragments": [
            "shared/content/scaffolds/examples/chain.scaffold_nest_relay.json",
            "shared/content/scaffolds/examples/endgame.sigil.scaffold_nest_ember.json",
        ],
        "modular": True,
    }
    dump(
        ROOT / "content" / "scaffolds" / "examples" / "pack.scaffold_nest_saffron.json",
        pack_doc,
    )
    dump(MODPACK_EXAMPLE, pack_doc)


def write_ship() -> None:
    dump(
        SHIP,
        {
            "phase": 27,
            "plan": "30_finish_6.0",
            "schema": "fish.ship.content_cli_6.v1",
            "description": (
                "Finish 6.0 Phase 27 — content authoring CLI wave 6 + modular packs. "
                "Adds chain/sigil/modpack scaffolds, --list-modpacks/--check-modpacks, and "
                "Finish 6.0 --check-floors (species≥150, quests≥100, harbors≥14, machines≥16, "
                "rivals≥20, baits≥20, seasonal≥20, cosmetics≥30, chains≥9). Soft-floors "
                "contentcli5:validate. Closes kickoff gap contentCli6Missing. "
                "Schema stays 27 / content 5.0.0."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "contentCli6Marker": MARKER,
            "closesGap": "contentCli6Missing",
            "extendsContentCli5": "shared/ship/content-cli-5.json",
            "extendsContentCli3": "shared/ship/content-cli-3.json",
            "moduleRoot": "shared/tools/content_cli/",
            "pythonWrapper": "shared/tools/content_scaffold.py",
            "examplesDir": "shared/content/scaffolds/examples",
            "modpacksDir": "shared/content/scaffolds/modpacks",
            "coreScaffoldKinds": ["species", "quest", "harbor"],
            "expansionScaffoldKinds": ["contract", "bait", "decor"],
            "wave3ScaffoldKinds": ["machine", "rival"],
            "wave5ScaffoldKinds": ["seasonal", "endgame", "cosmetic"],
            "wave6ScaffoldKinds": WAVE6_KINDS,
            "scaffoldKinds": ALL_KINDS,
            "scaffoldKindMin": SCAFFOLD_KIND_MIN,
            "exampleFileMin": EXAMPLE_FILE_MIN,
            "features": FEATURES,
            "featureMin": FEATURE_MIN,
            "modpackFloor": 1,
            "packFloors": PACK_FLOORS,
            "contentValidateStillGreen": True,
            "parityFixture": "shared/fixtures/parity-content-cli-6.json",
            "validateScript": "npm run contentcli6:validate",
            "softContentCli5Validate": "npm run contentcli5:validate",
            "simHzInvariant": 20,
            "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
            "authorTool": "shared/tools/author_content_cli_6.py",
            "softFloors": {
                "contentCli5KindMin": 11,
                "contentCli5ExampleMin": 11,
                "contentCli5FeatureMin": 8,
                "finish5PackSpeciesMin": 125,
                "finish5PackQuestsMin": 75,
                "openGapFlagMinPrior": 3,
                "note": (
                    "contentcli5 stays green on Finish 5.0 kind/pack floors; "
                    "Phase 27 enforces 14 kinds + Finish 6.0 pack floors + modular packs."
                ),
            },
            "manualCommands": [
                "cd web && npm run content:scaffold -- --list",
                "cd web && npm run content:scaffold -- --check-floors",
                "cd web && npm run content:scaffold -- --list-modpacks",
                "cd web && npm run content:scaffold -- --check-modpacks",
                "cd web && npm run content:scaffold -- chain --id nest_relay --dry-run",
                "cd web && npm run content:scaffold -- sigil --id nest_ember --dry-run",
                "cd web && npm run content:scaffold -- modpack --id nest_saffron --dry-run",
                "cd web && npm run contentcli5:validate",
                "cd web && npm run contentcli6:validate",
            ],
            "checklist": [
                "≥14 scaffold kinds (prior 11 + chain/sigil/modpack)",
                "≥14 committed example fragments under scaffolds/examples",
                "≥1 modular pack under scaffolds/modpacks",
                "--list, --check-pack, --check-floors, --list-modpacks, --check-modpacks",
                "Never auto-merge content-pack.json",
                "Pack floors meet Finish 6.0 species/quests/harbors/machines/rivals/baits/seasonal/cosmetics/chains",
                "Finish 5.0 contentcli5:validate still green (soft floors)",
                "parity-content-cli-6 + contentcli6:validate green",
                "CI runs contentcli6:validate",
                "kickoff gaps.contentCli6Missing=false",
                "schema stays 27 / content 5.0.0",
            ],
            "preflightGates": [
                "shared/ship/content-cli-6.json",
                "shared/fixtures/parity-content-cli-6.json",
                "shared/ship/content-cli-5.json",
                "shared/tools/content_cli/ids.ts",
                "shared/tools/content_cli/scaffolds.ts",
                "shared/tools/content_cli/validateFragment.ts",
                "shared/tools/content_cli/packIds.ts",
                "shared/tools/content_cli/packFloors.ts",
                "shared/tools/content_cli/cli.ts",
                "shared/tools/content_cli/modpacks.ts",
                "shared/tools/content_scaffold.py",
                "shared/tools/author_content_cli_6.py",
                "shared/content/scaffolds/examples/chain.scaffold_nest_relay.json",
                "shared/content/scaffolds/examples/endgame.sigil.scaffold_nest_ember.json",
                "shared/content/scaffolds/examples/pack.scaffold_nest_saffron.json",
                "shared/content/scaffolds/modpacks/pack.scaffold_nest_saffron.json",
                "web/scripts/content-scaffold.ts",
                "web/scripts/validate-content-cli-6.ts",
                "web/src/contentAuthoring/scaffoldValidate.ts",
                "web/src/ship/contentCli6.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/ContentCli6.kt",
            ],
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixtures.parity_content_cli_6.v1",
            "description": (
                "Finish 6.0 Phase 27: content CLI wave-6 kinds + modular packs + Finish 6 pack floors."
            ),
            "contentCli6Marker": MARKER,
            "scaffoldKindMin": SCAFFOLD_KIND_MIN,
            "exampleFileMin": EXAMPLE_FILE_MIN,
            "featureMin": FEATURE_MIN,
            "modpackFloor": 1,
            "simHzInvariant": 20,
            "expect": {
                "closesGap": "contentCli6Missing",
                "contentCli6Missing": False,
                "openGapFlagMin": OPEN_GAP_FLAG_MIN,
                "schemaVersion": 27,
                "contentVersion": "5.0.0",
                "kinds": ALL_KINDS,
                "wave6Kinds": WAVE6_KINDS,
                "features": FEATURES,
                "exampleFiles": EXAMPLE_FILES,
                "exampleIds": EXAMPLE_IDS,
                "modpackFiles": [
                    "shared/content/scaffolds/modpacks/pack.scaffold_nest_saffron.json",
                ],
                "moduleFiles": [
                    "shared/tools/content_cli/ids.ts",
                    "shared/tools/content_cli/scaffolds.ts",
                    "shared/tools/content_cli/validateFragment.ts",
                    "shared/tools/content_cli/packIds.ts",
                    "shared/tools/content_cli/packFloors.ts",
                    "shared/tools/content_cli/modpacks.ts",
                    "shared/tools/content_cli/cli.ts",
                    "web/scripts/content-scaffold.ts",
                ],
                "packFloorKeys": list(PACK_FLOORS.keys()),
                "gates": [
                    "wave6_kinds",
                    "modpacks",
                    "finish6_floors",
                    "gap_closed",
                    "ci_gate",
                ],
            },
        },
    )


def soft_floor_open_gap_flags() -> None:
    for path in (ROOT / "fixtures").glob("parity-*.json"):
        data = load(path)
        expect = data.get("expect")
        if isinstance(expect, dict) and expect.get("openGapFlagMin") == 3:
            expect["openGapFlagMin"] = OPEN_GAP_FLAG_MIN
            dump(path, data)


def update_kickoff_dod_listing_pin() -> None:
    kick = load(KICKOFF)
    kick["gaps"]["contentCli6Missing"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    dod.setdefault("quotas", {})
    dod["quotas"]["contentScaffoldKinds"] = max(
        dod["quotas"].get("contentScaffoldKinds", 0), SCAFFOLD_KIND_MIN
    )
    dod["quotas"]["contentCli6Kinds"] = SCAFFOLD_KIND_MIN
    dod["quotas"]["contentCli6Examples"] = EXAMPLE_FILE_MIN
    dod["quotas"]["contentCli6Features"] = FEATURE_MIN
    dod["quotas"]["contentCli6Modpacks"] = 1
    for k, v in PACK_FLOORS.items():
        dod["quotas"][f"contentCli6{k[0].upper()}{k[1:]}"] = v
    dod["contentCli6"] = {
        "phase": 27,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "contentCli6Marker": MARKER,
        "catalog": "shared/ship/content-cli-6.json",
        "parityFixture": "shared/fixtures/parity-content-cli-6.json",
        "validateScript": "npm run contentcli6:validate",
        "checklist": [
            f"≥{SCAFFOLD_KIND_MIN} scaffold kinds + modular packs",
            "Finish 6.0 pack floors via --check-floors",
            "kickoff contentCli6Missing closed",
            "contentcli6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["contentCli6Phase"] = 27
    listing["contentCli6Catalog"] = "shared/ship/content-cli-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["contentCli6"] = "shared/ship/content-cli-6.json"
    fx = pin.get("fixtures") or []
    if "parity-content-cli-6.json" not in fx:
        fx.append("parity-content-cli-6.json")
    pin["fixtures"] = fx
    dump(PIN, pin)

    soft_floor_open_gap_flags()


def main() -> None:
    write_examples()
    write_ship()
    update_kickoff_dod_listing_pin()
    print(
        f"content-cli-6 authored: marker={MARKER} kinds≥{SCAFFOLD_KIND_MIN} "
        f"features≥{FEATURE_MIN} openGapFlagMin={OPEN_GAP_FLAG_MIN}"
    )


if __name__ == "__main__":
    main()
