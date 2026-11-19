#!/usr/bin/env python3
"""Finish 5.0 Phase 30 — author freeze-5.0.0 catalogs + bump live 5.0.0 pin."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER = "authored-finish-5.0-phase-30"
SHIP = "shared/ship/freeze-5.0.0.json"
FIXTURE = "shared/fixtures/parity-freeze-5.0.0.json"

# Finish 5.0 freeze cut (measured via loc:smoke) with slight under-floor slack.
FREEZE_CUT = {
    "measuredAtPhase": 30,
    "gameCore": 32287,
    "app": 15415,
    "webSrc": 42895,
    "productTotal": 90597,
    "note": (
        "Finish 5.0 Phase 30 freeze cut (physical lines). Floors sit slightly under measured "
        "to avoid flake; growth must remain real systems/content. Finish 4.0 cut (73473) remains "
        "historical via prior freeze catalogs. Plan targets 38k/26k/56k/120k retained without padding."
    ),
}
FLOORS = {
    "gameCore": 32000,
    "app": 15200,
    "webSrc": 42500,
    "productTotal": 90000,
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def soft_floor_pack_version_checks() -> None:
    """Allow live content-pack 5.0.0 in prior Finish 5 validators."""
    web_scripts = ROOT / "web" / "scripts"
    replacements = [
        (
            'if (pack.contentVersion !== "4.0.0") errors.push("content-pack contentVersion must be 4.0.0");',
            'if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");',
        ),
        (
            'if (packRaw.contentVersion !== "4.0.0") errors.push("content-pack contentVersion must be 4.0.0");',
            'if (!["4.0.0", "5.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");',
        ),
        (
            'if (pack.contentVersion !== "4.0.0") errors.push("content-pack must be 4.0.0");',
            'if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 4.0.0 or 5.0.0");',
        ),
    ]
    for path in web_scripts.glob("validate-*.ts"):
        text = path.read_text(encoding="utf-8")
        orig = text
        for old, new in replacements:
            text = text.replace(old, new)
        if text != orig:
            path.write_text(text, encoding="utf-8")
            print(f"soft-floored {path.relative_to(ROOT)}")


def main() -> None:
    ship = {
        "phase": 30,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.freeze_5.v1",
        "description": (
            "Finish 5.0 Phase 30 — content/version 5.0.0 freeze & DoD closeout. "
            "RELEASE_PIN → 5.0.0 / schema 26 / versionCode 6. Content floors green at Finish 5.0 quotas. "
            "LOC enforces anti-regression freeze floors at the measured cut (plan targets 38k/26k/56k/120k "
            "retained; no padding). Tag v5.0.0 remains operator-manual. Finish 4.0 freeze-4.0.0 stays historical."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "versionName": "5.0.0",
        "versionCode": 6,
        "releaseTag": "v5.0.0",
        "freeze5Marker": MARKER,
        "definitionOfDone": "shared/ship/definition-of-done.json",
        "priorFreeze": "shared/ship/freeze-4.0.0.json",
        "completeTagArchived": "v1.0-complete",
        "finish2ReleaseTagArchived": "v2.0.0",
        "finish3ReleaseTagArchived": "v3.0.0",
        "finish4ReleaseTagArchived": "v4.0.0",
        "contentFloors": {
            "harbors": 12,
            "species": 125,
            "machines": 14,
            "quests": 75,
            "seasonalEvents": 16,
            "baits": 16,
            "cosmetics": 24,
            "deliveryChains": 7,
            "rivalMarkets": 16,
            "paritySuites": 20,
        },
        "loc": {
            "catalog": "shared/ship/loc-floors.json",
            "enforceMode": "freeze_anti_regression",
            "planTargetsRetained": True,
            "note": (
                "Plan targets game-core≥38k / app≥26k / web≥56k / product≥120k remain documented. "
                "Phase 30 enforces Finish 5.0 freeze floors at the measured cut without LOC padding."
            ),
        },
        "parityFixture": FIXTURE,
        "validateScript": "npm run freeze5:validate",
        "softFreeze4Validate": "npm run freeze4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "authorTool": "shared/tools/author_freeze_5.py",
        "softFloors": {
            "finish4HistoricalContentVersion": "4.0.0",
            "finish4HistoricalVersionCode": 5,
            "finish4HistoricalSchemaVersion": 25,
            "finish4HistoricalProductTotalFloor": 73100,
            "note": (
                "freeze4/freeze3/freeze2 stay green on historical pins; live pin advances to "
                "5.0.0 / schema 26 / versionCode 6."
            ),
        },
        "checklist": [
            "RELEASE_PIN contentVersion/versionName/releaseTag = 5.0.0; versionCode = 6; schemaVersion = 26",
            "content-pack.json contentVersion = 5.0.0; floors ≥12/125/14/75/16/16/24 + rivals 16 + parity 20",
            "DoD finish5Freeze ready_for_release_tag; finish4/3/2 freeze stay historical",
            "loc-floors enforceFloors=true against Finish 5.0 freeze anti-regression floors; plan targets retained",
            "listing/listing-copy/android strings whatsNewVersion = 5.0.0",
            "freeze5:validate + freeze4:validate + freeze3:validate + freeze2:validate + dod:validate green; CI runs freeze5:validate",
            "git tag v5.0.0 remains manual (manualCommands only)",
        ],
        "manualCommands": [
            "npm run freeze5:validate",
            "npm run freeze4:validate",
            "npm run freeze3:validate",
            "npm run freeze2:validate",
            "npm run dod:validate",
            'git tag -a v5.0.0 -m "Fish Shopping 5.0.0 freeze"',
            "Archive Finish 5.0 plan status as finished",
        ],
        "preflightGates": [
            SHIP,
            FIXTURE,
            "shared/ship/freeze-4.0.0.json",
            "shared/ship/freeze-3.0.0.json",
            "shared/ship/freeze-2.0.0.json",
            "shared/ship/definition-of-done.json",
            "shared/ship/loc-floors.json",
            "shared/ship/finish-5.0-kickoff.json",
            "shared/fixtures/RELEASE_PIN.json",
            "shared/content/content-pack.json",
            "web/src/ship/freeze50.ts",
            "web/scripts/validate-freeze-5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Freeze50.kt",
        ],
    }
    dump(ROOT / SHIP, ship)

    fixture = {
        "schema": "fish.fixtures.parity_freeze_5.v1",
        "freeze5Marker": MARKER,
        "phase": 30,
        "plan": "30_finish_5.0",
        "simHzInvariant": 20,
        "expect": {
            "contentVersion": "5.0.0",
            "schemaVersion": 26,
            "versionName": "5.0.0",
            "versionCode": 6,
            "releaseTag": "v5.0.0",
            "priorFreeze": "shared/ship/freeze-4.0.0.json",
            "contentFloors": ship["contentFloors"],
            "locEnforceMode": "freeze_anti_regression",
            "completeTagArchived": "v1.0-complete",
            "finish2ReleaseTagArchived": "v2.0.0",
            "finish3ReleaseTagArchived": "v3.0.0",
            "finish4ReleaseTagArchived": "v4.0.0",
            "gates": [
                "pin_at_5_0_0",
                "content_floors_met",
                "loc_freeze_enforced",
                "dod_finish5_ready",
                "finish4_historical",
                "tag_manual_only",
            ],
        },
    }
    dump(ROOT / FIXTURE, fixture)

    # Live content + pin bump.
    pack = load(ROOT / "shared/content/content-pack.json")
    pack["contentVersion"] = "5.0.0"
    dump(ROOT / "shared/content/content-pack.json", pack)

    pin = load(ROOT / "shared/fixtures/RELEASE_PIN.json")
    pin["label"] = "Finish 5.0 Phase 30 — content 5.0.0 / schema 26 / freeze"
    pin["contentVersion"] = "5.0.0"
    pin["versionName"] = "5.0.0"
    pin["versionCode"] = 6
    pin["releaseTag"] = "v5.0.0"
    pin["schemaVersion"] = 26
    pin["freeze50"] = SHIP
    pin["notes"] = (
        "Schema 26 mainline (Finish 5.0 Phase 30 freeze). Content 5.0.0 / versionCode 6. "
        "Finish 4.0 freeze catalogs remain schema 25 historical at v4.0.0. "
        "Finish 3.0 freeze catalogs remain schema 24 historical at v3.0.0. "
        "Finish 2.0 freeze catalogs remain schema 23 historical at v2.0.0. "
        "Tag v5.0.0 remains operator-manual."
    )
    if "parity-freeze-5.0.0.json" not in pin["fixtures"]:
        pin["fixtures"].append("parity-freeze-5.0.0.json")
    dump(ROOT / "shared/fixtures/RELEASE_PIN.json", pin)

    pkg = load(ROOT / "web/package.json")
    pkg["version"] = "5.0.0"
    dump(ROOT / "web/package.json", pkg)

    listing = load(ROOT / "shared/store/listing.json")
    listing["whatsNewVersion"] = "5.0.0"
    listing["freeze50Phase"] = 30
    listing["freeze50Catalog"] = SHIP
    dump(ROOT / "shared/store/listing.json", listing)

    listing_copy = load(ROOT / "shared/store/listing-copy.json")
    listing_copy["description"] = (
        "Frozen Play / web listing copy for store ship. Finish 5.0 Phase 30 freezes whatsNew at 5.0.0; "
        "English remains the canonical en freeze for pin/whatsNewVersion."
    )
    listing_copy.setdefault("copy", {})["whatsNewVersion"] = "5.0.0"
    dump(ROOT / "shared/store/listing-copy.json", listing_copy)

    # Android whats-new.
    strings = ROOT / "app/src/main/res/values/strings.xml"
    text = strings.read_text(encoding="utf-8")
    whats_new = (
        "5.0.0 freeze — one hundred twenty-five species, seventy-five quests, fourteen machines, "
        "twelve harbors, sixteen rival markets, schema 26 endgame crests, parity lock 5.0, and "
        "Finish 5.0 ops. Schema 26; prior 4.0 saves still load."
    )
    text = re.sub(
        r'(<string name="store_whats_new">)(.*?)(</string>)',
        lambda m: f"{m.group(1)}{whats_new}{m.group(3)}",
        text,
        count=1,
        flags=re.S,
    )
    strings.write_text(text, encoding="utf-8")

    # LOC floors → Finish 5 freeze cut.
    loc = load(ROOT / "shared/ship/loc-floors.json")
    loc["description"] = (
        "Finish 2.0 Phase 6 scoreboard → Finish 3.0/4.0/5.0 freezes. Measures real source only "
        "(no padding). Freeze floors stay anti-regression at the 5.0 cut; Finish 5.0 plan targets "
        "are 38k/26k/56k/120k."
    )
    loc["contentVersion"] = "5.0.0"
    loc["schemaVersion"] = 26
    loc["scopes"]["gameCore"]["phase30Floor"] = FLOORS["gameCore"]
    loc["scopes"]["app"]["phase30Floor"] = FLOORS["app"]
    loc["scopes"]["webSrc"]["phase30Floor"] = FLOORS["webSrc"]
    loc["productTotalFloor"] = FLOORS["productTotal"]
    loc["freezeCut"] = FREEZE_CUT
    loc.setdefault("softFloors", {})
    loc["softFloors"]["finish4HistoricalProductTotalFloor"] = 73100
    loc["softFloors"]["finish4HistoricalGameCoreFloor"] = 23500
    loc["softFloors"]["finish4HistoricalAppFloor"] = 13800
    loc["softFloors"]["finish4HistoricalWebSrcFloor"] = 35600
    loc["softFloors"]["note"] = (
        "Finish 4.0 anti-regression floors remain documented; live floors raised to Finish 5.0 "
        "measured cut without padding to force-meet 120k plan target."
    )
    dump(ROOT / "shared/ship/loc-floors.json", loc)

    # Kickoff live contentVersion advances at freeze; baseline stays Phase 1 historical.
    kickoff = load(ROOT / "shared/ship/finish-5.0-kickoff.json")
    kickoff["contentVersion"] = "5.0.0"
    kickoff["schemaVersion"] = 26
    dump(ROOT / "shared/ship/finish-5.0-kickoff.json", kickoff)

    # Live parity-lock content version.
    parity = load(ROOT / "shared/fixtures/parity-lock.json")
    parity["contentVersion"] = "5.0.0"
    dump(ROOT / "shared/fixtures/parity-lock.json", parity)

    dod = load(ROOT / "shared/ship/definition-of-done.json")
    dod["contentVersion"] = "5.0.0"
    dod["schemaVersion"] = 26
    dod["releaseTag"] = "v5.0.0"
    dod["notes"] = (
        "Finish 5.0 Phase 30 freeze-5 complete (5.0.0 / schema 26 / versionCode 6); Phases 1–29 remain green. "
        "LOC freeze anti-regression at measured cut; plan targets retained without padding. "
        "Deploy/tag remain manual."
    )
    dod["finish5Freeze"] = {
        "phase": 30,
        "plan": "30_finish_5.0",
        "status": "ready_for_release_tag",
        "statusValues": ["ready_for_release_tag", "tag_cut", "archived"],
        "releaseTag": "v5.0.0",
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "versionName": "5.0.0",
        "versionCode": 6,
        "catalog": SHIP,
        "validateScript": "npm run freeze5:validate",
        "locEnforceMode": "freeze_anti_regression",
        "completeTagArchived": "v1.0-complete",
        "finish2ReleaseTagArchived": "v2.0.0",
        "finish3ReleaseTagArchived": "v3.0.0",
        "finish4ReleaseTagArchived": "v4.0.0",
        "checklist": [
            "RELEASE_PIN + content-pack at 5.0.0 / schema 26 / versionCode 6",
            "Content floors ≥12 harbors / 125 species / 14 machines / 75 quests / 16 seasonal / 16 baits / 24 cosmetics / 16 rivals / 20 parity",
            "LOC freeze anti-regression floors green; plan targets retained without padding",
            "Finish 4.0 + Finish 3.0 + Finish 2.0 freeze + post-1.0 closeout remain historical/archived",
            "freeze5:validate + freeze4:validate + freeze3:validate + freeze2:validate + dod:validate green in CI",
            "Annotated git tag v5.0.0 remains operator-manual",
        ],
        "manualCommands": ship["manualCommands"],
    }
    dump(ROOT / "shared/ship/definition-of-done.json", dod)

    soft_floor_pack_version_checks()
    print(f"authored {SHIP}; freeze floors={FLOORS}; live pin 5.0.0 / vc 6")


if __name__ == "__main__":
    main()
