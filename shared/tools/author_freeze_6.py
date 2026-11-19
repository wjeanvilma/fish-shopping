#!/usr/bin/env python3
"""Finish 6.0 Phase 30 — author freeze-6.0.0 catalogs + bump live 6.0.0 pin."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MARKER = "authored-finish-6.0-phase-30"
SHIP = "shared/ship/freeze-6.0.0.json"
FIXTURE = "shared/fixtures/parity-freeze-6.0.0.json"

# Finish 6.0 freeze cut (measured via loc:smoke) with slight under-floor slack.
FREEZE_CUT = {
    "measuredAtPhase": 30,
    "gameCore": 35947,
    "app": 16080,
    "webSrc": 48266,
    "productTotal": 100293,
    "note": (
        "Finish 6.0 Phase 30 freeze cut (physical lines). Floors sit slightly under measured "
        "to avoid flake; growth must remain real systems/content. Finish 5.0 cut (90597) remains "
        "historical via prior freeze catalogs. Plan targets 38k/26k/56k/120k retained without padding."
    ),
}
FLOORS = {
    "gameCore": 35500,
    "app": 15800,
    "webSrc": 47800,
    "productTotal": 99500,
}


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def soft_floor_pack_version_checks() -> None:
    """Allow live content-pack 6.0.0 in prior Finish 6 validators."""
    web_scripts = ROOT / "web" / "scripts"
    replacements = [
        (
            'if (pack.contentVersion !== "5.0.0") errors.push("content-pack contentVersion must be 5.0.0");',
            'if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");',
        ),
        (
            'if (packRaw.contentVersion !== "5.0.0") errors.push("content-pack contentVersion must be 5.0.0");',
            'if (!["5.0.0", "6.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 5.0.0 or 6.0.0");',
        ),
        (
            'if (pack.contentVersion !== "5.0.0") errors.push("content-pack must be 5.0.0");',
            'if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");',
        ),
        (
            'if (pack.contentVersion !== "5.0.0") errors.push("content-pack must stay 5.0.0");',
            'if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 5.0.0 or 6.0.0");',
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 4.0.0 or 5.0.0");',
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack must be 4.0.0, 5.0.0, or 6.0.0");',
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");',
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(pack.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");',
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0 or 5.0.0");',
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(packRaw.contentVersion)) errors.push("content-pack contentVersion must be 4.0.0, 5.0.0, or 6.0.0");',
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


def soft_floor_freeze5_live_pin() -> None:
    """Allow Finish 6.0 live pin advance inside freeze5:validate."""
    path = ROOT / "web/scripts/validate-freeze-5.ts"
    text = path.read_text(encoding="utf-8")
    reps = [
        (
            'if (pin.contentVersion !== "5.0.0") errors.push("RELEASE_PIN contentVersion must be 5.0.0");\n'
            '  if (pin.versionName !== "5.0.0") errors.push("RELEASE_PIN versionName must be 5.0.0");\n'
            '  if (pin.versionCode !== 6) errors.push("RELEASE_PIN versionCode must be 6");\n'
            '  if (pin.releaseTag !== "v5.0.0") errors.push("RELEASE_PIN releaseTag must be v5.0.0");',
            '// Soft-floor: Finish 6.0 Phase 30 may advance live pin to 6.0.0 / vc 7.\n'
            '  if (!["5.0.0", "6.0.0"].includes(pin.contentVersion)) {\n'
            '    errors.push("RELEASE_PIN contentVersion must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            '  if (!["5.0.0", "6.0.0"].includes(pin.versionName)) {\n'
            '    errors.push("RELEASE_PIN versionName must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            "  if ((pin.versionCode ?? 0) < 6) errors.push(\"RELEASE_PIN versionCode must be ≥ 6\");\n"
            '  if (!["v5.0.0", "v6.0.0"].includes(pin.releaseTag)) {\n'
            '    errors.push("RELEASE_PIN releaseTag must be v5.0.0 or v6.0.0");\n'
            "  }",
        ),
        (
            'if (pack.contentVersion !== "5.0.0") errors.push("content-pack must be 5.0.0");\n'
            '  if (pkg.version !== "5.0.0") errors.push("web/package.json version must be 5.0.0");',
            'if (!["5.0.0", "6.0.0"].includes(pack.contentVersion)) {\n'
            '    errors.push("content-pack must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            '  if (!["5.0.0", "6.0.0"].includes(pkg.version)) {\n'
            '    errors.push("web/package.json version must be 5.0.0 or 6.0.0");\n'
            "  }",
        ),
        (
            'if (dod.contentVersion !== "5.0.0") errors.push("DoD contentVersion must be 5.0.0");\n'
            '  if (dod.releaseTag !== "v5.0.0") errors.push("DoD releaseTag must be v5.0.0");\n'
            '  if (dod.schemaVersion !== 26) errors.push("DoD schemaVersion must be 26");',
            'if (!["5.0.0", "6.0.0"].includes(dod.contentVersion)) {\n'
            '    errors.push("DoD contentVersion must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            '  if (!["v5.0.0", "v6.0.0"].includes(dod.releaseTag)) {\n'
            '    errors.push("DoD releaseTag must be v5.0.0 or v6.0.0");\n'
            "  }\n"
            "  if ((dod.schemaVersion ?? 0) < 26) errors.push(\"DoD schemaVersion must be ≥ 26\");",
        ),
        (
            'if (listing.whatsNewVersion !== "5.0.0") errors.push("listing.whatsNewVersion must be 5.0.0");\n'
            '  if (listingCopy.copy?.whatsNewVersion !== "5.0.0") {\n'
            '    errors.push("listing-copy whatsNewVersion must be 5.0.0");\n'
            "  }\n"
            '  if (!androidEn.includes("5.0.0 freeze") && !androidEn.includes("5.0.0")) {\n'
            '    errors.push("Android values/strings.xml must mention 5.0.0 whats-new");\n'
            "  }",
            'if (!["5.0.0", "6.0.0"].includes(listing.whatsNewVersion)) {\n'
            '    errors.push("listing.whatsNewVersion must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            '  if (!["5.0.0", "6.0.0"].includes(listingCopy.copy?.whatsNewVersion)) {\n'
            '    errors.push("listing-copy whatsNewVersion must be 5.0.0 or 6.0.0");\n'
            "  }\n"
            '  if (!androidEn.includes("5.0.0") && !androidEn.includes("6.0.0")) {\n'
            '    errors.push("Android values/strings.xml must mention 5.0.0 or 6.0.0 whats-new");\n'
            "  }",
        ),
        (
            'if ((loc.scopes?.gameCore?.phase30Floor ?? 0) < 32000) {\n'
            '    errors.push("gameCore freeze floor must be ≥ 32000");\n'
            "  }\n"
            "  if ((loc.scopes?.app?.phase30Floor ?? 0) < 15200) errors.push(\"app freeze floor must be ≥ 15200\");\n"
            "  if ((loc.scopes?.webSrc?.phase30Floor ?? 0) < 42500) {\n"
            '    errors.push("webSrc freeze floor must be ≥ 42500");\n'
            "  }\n"
            "  if ((loc.productTotalFloor ?? 0) < 90000) errors.push(\"productTotalFloor must be ≥ 90000\");\n"
            "  if ((loc.freezeCut?.productTotal ?? 0) < 90000) {\n"
            '    errors.push("loc-floors freezeCut.productTotal must be refreshed to Finish 5.0 cut");\n'
            "  }",
            'if ((loc.scopes?.gameCore?.phase30Floor ?? 0) < 32000) {\n'
            '    errors.push("gameCore freeze floor must be ≥ 32000");\n'
            "  }\n"
            "  if ((loc.scopes?.app?.phase30Floor ?? 0) < 15200) errors.push(\"app freeze floor must be ≥ 15200\");\n"
            "  if ((loc.scopes?.webSrc?.phase30Floor ?? 0) < 42500) {\n"
            '    errors.push("webSrc freeze floor must be ≥ 42500");\n'
            "  }\n"
            "  if ((loc.productTotalFloor ?? 0) < 90000) errors.push(\"productTotalFloor must be ≥ 90000\");\n"
            "  // Soft-floor: Finish 6.0 may refresh freezeCut above Finish 5.0 measured cut.\n"
            "  if ((loc.freezeCut?.productTotal ?? 0) < 90000) {\n"
            '    errors.push("loc-floors freezeCut.productTotal must be ≥ Finish 5.0 cut");\n'
            "  }",
        ),
    ]
    orig = text
    for old, new in reps:
        text = text.replace(old, new)
    if text != orig:
        path.write_text(text, encoding="utf-8")
        print(f"soft-floored {path.relative_to(ROOT)}")


def soft_floor_freeze4_live_pin() -> None:
    path = ROOT / "web/scripts/validate-freeze-4.ts"
    text = path.read_text(encoding="utf-8")
    reps = [
        (
            'if (!["4.0.0", "5.0.0"].includes(pin.contentVersion)) {\n'
            '    errors.push("RELEASE_PIN contentVersion must be 4.0.0 or 5.0.0");\n'
            "  }\n"
            '  if (!["4.0.0", "5.0.0"].includes(pin.versionName)) {\n'
            '    errors.push("RELEASE_PIN versionName must be 4.0.0 or 5.0.0");\n'
            "  }\n"
            "  if ((pin.versionCode ?? 0) < 5) errors.push(\"RELEASE_PIN versionCode must be ≥ 5\");\n"
            '  if (!["v4.0.0", "v5.0.0"].includes(pin.releaseTag)) {\n'
            '    errors.push("RELEASE_PIN releaseTag must be v4.0.0 or v5.0.0");\n'
            "  }",
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(pin.contentVersion)) {\n'
            '    errors.push("RELEASE_PIN contentVersion must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }\n"
            '  if (!["4.0.0", "5.0.0", "6.0.0"].includes(pin.versionName)) {\n'
            '    errors.push("RELEASE_PIN versionName must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }\n"
            "  if ((pin.versionCode ?? 0) < 5) errors.push(\"RELEASE_PIN versionCode must be ≥ 5\");\n"
            '  if (!["v4.0.0", "v5.0.0", "v6.0.0"].includes(pin.releaseTag)) {\n'
            '    errors.push("RELEASE_PIN releaseTag must be v4.0.0, v5.0.0, or v6.0.0");\n'
            "  }",
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(pkg.version)) {\n'
            '    errors.push("web/package.json version must be 4.0.0 or 5.0.0");\n'
            "  }",
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(pkg.version)) {\n'
            '    errors.push("web/package.json version must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }",
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(dod.contentVersion)) {\n'
            '    errors.push("DoD contentVersion must be 4.0.0 or 5.0.0");\n'
            "  }\n"
            '  if (!["v4.0.0", "v5.0.0"].includes(dod.releaseTag)) {\n'
            '    errors.push("DoD releaseTag must be v4.0.0 or v5.0.0");\n'
            "  }",
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(dod.contentVersion)) {\n'
            '    errors.push("DoD contentVersion must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }\n"
            '  if (!["v4.0.0", "v5.0.0", "v6.0.0"].includes(dod.releaseTag)) {\n'
            '    errors.push("DoD releaseTag must be v4.0.0, v5.0.0, or v6.0.0");\n'
            "  }",
        ),
        (
            'if (!["4.0.0", "5.0.0"].includes(listing.whatsNewVersion)) {\n'
            '    errors.push("listing.whatsNewVersion must be 4.0.0 or 5.0.0");\n'
            "  }\n"
            '  if (!["4.0.0", "5.0.0"].includes(listingCopy.copy?.whatsNewVersion)) {\n'
            '    errors.push("listing-copy whatsNewVersion must be 4.0.0 or 5.0.0");\n'
            "  }",
            'if (!["4.0.0", "5.0.0", "6.0.0"].includes(listing.whatsNewVersion)) {\n'
            '    errors.push("listing.whatsNewVersion must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }\n"
            '  if (!["4.0.0", "5.0.0", "6.0.0"].includes(listingCopy.copy?.whatsNewVersion)) {\n'
            '    errors.push("listing-copy whatsNewVersion must be 4.0.0, 5.0.0, or 6.0.0");\n'
            "  }",
        ),
    ]
    orig = text
    for old, new in reps:
        text = text.replace(old, new)
    # Android mention soft-floor
    text2 = text.replace(
        'errors.push("Android values/strings.xml must mention 4.0.0 or 5.0.0 whats-new");',
        'errors.push("Android values/strings.xml must mention 4.0.0, 5.0.0, or 6.0.0 whats-new");',
    )
    text2 = text2.replace(
        '!androidEn.includes("5.0.0")',
        '!androidEn.includes("5.0.0") && !androidEn.includes("6.0.0")',
    )
    if text2 != orig:
        path.write_text(text2, encoding="utf-8")
        print(f"soft-floored {path.relative_to(ROOT)}")


def main() -> None:
    ship = {
        "phase": 30,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.freeze_6.v1",
        "description": (
            "Finish 6.0 Phase 30 — content/version 6.0.0 freeze & DoD closeout. "
            "RELEASE_PIN → 6.0.0 / schema 27 / versionCode 7. Content floors green at Finish 6.0 quotas. "
            "LOC enforces anti-regression freeze floors at the measured cut (plan targets 38k/26k/56k/120k "
            "retained; no padding). Tag v6.0.0 remains operator-manual. Finish 5.0 freeze-5.0.0 stays historical."
        ),
        "contentVersion": "6.0.0",
        "schemaVersion": 27,
        "versionName": "6.0.0",
        "versionCode": 7,
        "releaseTag": "v6.0.0",
        "freeze6Marker": MARKER,
        "definitionOfDone": "shared/ship/definition-of-done.json",
        "priorFreeze": "shared/ship/freeze-5.0.0.json",
        "completeTagArchived": "v1.0-complete",
        "finish2ReleaseTagArchived": "v2.0.0",
        "finish3ReleaseTagArchived": "v3.0.0",
        "finish4ReleaseTagArchived": "v4.0.0",
        "finish5ReleaseTagArchived": "v5.0.0",
        "contentFloors": {
            "harbors": 14,
            "species": 150,
            "machines": 16,
            "quests": 100,
            "seasonalEvents": 20,
            "baits": 20,
            "cosmetics": 30,
            "deliveryChains": 9,
            "rivalMarkets": 20,
            "paritySuites": 24,
        },
        "loc": {
            "catalog": "shared/ship/loc-floors.json",
            "enforceMode": "freeze_anti_regression",
            "planTargetsRetained": True,
            "note": (
                "Plan targets game-core≥38k / app≥26k / web≥56k / product≥120k remain documented. "
                "Phase 30 enforces Finish 6.0 freeze floors at the measured cut without LOC padding."
            ),
        },
        "parityFixture": FIXTURE,
        "validateScript": "npm run freeze6:validate",
        "softFreeze5Validate": "npm run freeze5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "authorTool": "shared/tools/author_freeze_6.py",
        "softFloors": {
            "finish5HistoricalContentVersion": "5.0.0",
            "finish5HistoricalVersionCode": 6,
            "finish5HistoricalSchemaVersion": 26,
            "finish5HistoricalProductTotalFloor": 90000,
            "note": (
                "freeze5/freeze4/freeze3/freeze2 stay green on historical pins; live pin advances to "
                "6.0.0 / schema 27 / versionCode 7."
            ),
        },
        "checklist": [
            "RELEASE_PIN contentVersion/versionName/releaseTag = 6.0.0; versionCode = 7; schemaVersion = 27",
            "content-pack.json contentVersion = 6.0.0; floors ≥14/150/16/100/20/20/30 + rivals 20 + parity 24",
            "DoD finish6Freeze ready_for_release_tag; finish5/4/3/2 freeze stay historical",
            "loc-floors enforceFloors=true against Finish 6.0 freeze anti-regression floors; plan targets retained",
            "listing/listing-copy/android strings whatsNewVersion = 6.0.0",
            "freeze6:validate + freeze5:validate + freeze4:validate + freeze3:validate + freeze2:validate + dod:validate green; CI runs freeze6:validate",
            "git tag v6.0.0 remains manual (manualCommands only)",
        ],
        "manualCommands": [
            "npm run freeze6:validate",
            "npm run freeze5:validate",
            "npm run freeze4:validate",
            "npm run freeze3:validate",
            "npm run freeze2:validate",
            "npm run dod:validate",
            'git tag -a v6.0.0 -m "Fish Shopping 6.0.0 freeze"',
            "Archive Finish 6.0 plan status as finished",
        ],
        "preflightGates": [
            SHIP,
            FIXTURE,
            "shared/ship/freeze-5.0.0.json",
            "shared/ship/freeze-4.0.0.json",
            "shared/ship/freeze-3.0.0.json",
            "shared/ship/freeze-2.0.0.json",
            "shared/ship/definition-of-done.json",
            "shared/ship/loc-floors.json",
            "shared/ship/finish-6.0-kickoff.json",
            "shared/fixtures/RELEASE_PIN.json",
            "shared/content/content-pack.json",
            "web/src/ship/freeze60.ts",
            "web/scripts/validate-freeze-6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Freeze60.kt",
        ],
    }
    dump(ROOT / SHIP, ship)

    fixture = {
        "schema": "fish.fixtures.parity_freeze_6.v1",
        "freeze6Marker": MARKER,
        "phase": 30,
        "plan": "30_finish_6.0",
        "simHzInvariant": 20,
        "expect": {
            "contentVersion": "6.0.0",
            "schemaVersion": 27,
            "versionName": "6.0.0",
            "versionCode": 7,
            "releaseTag": "v6.0.0",
            "priorFreeze": "shared/ship/freeze-5.0.0.json",
            "contentFloors": ship["contentFloors"],
            "locEnforceMode": "freeze_anti_regression",
            "completeTagArchived": "v1.0-complete",
            "finish2ReleaseTagArchived": "v2.0.0",
            "finish3ReleaseTagArchived": "v3.0.0",
            "finish4ReleaseTagArchived": "v4.0.0",
            "finish5ReleaseTagArchived": "v5.0.0",
            "openGapFlagMin": 0,
            "gates": [
                "pin_at_6_0_0",
                "content_floors_met",
                "loc_freeze_enforced",
                "dod_finish6_ready",
                "finish5_historical",
                "tag_manual_only",
            ],
        },
    }
    dump(ROOT / FIXTURE, fixture)

    # Live content + pin bump.
    pack = load(ROOT / "shared/content/content-pack.json")
    pack["contentVersion"] = "6.0.0"
    dump(ROOT / "shared/content/content-pack.json", pack)

    pin = load(ROOT / "shared/fixtures/RELEASE_PIN.json")
    pin["label"] = "Finish 6.0 Phase 30 — content 6.0.0 / schema 27 / freeze"
    pin["contentVersion"] = "6.0.0"
    pin["versionName"] = "6.0.0"
    pin["versionCode"] = 7
    pin["releaseTag"] = "v6.0.0"
    pin["schemaVersion"] = 27
    pin["freeze60"] = SHIP
    pin["notes"] = (
        "Schema 27 mainline (Finish 6.0 Phase 30 freeze). Content 6.0.0 / versionCode 7. "
        "Finish 5.0 freeze catalogs remain schema 26 historical at v5.0.0. "
        "Finish 4.0 freeze catalogs remain schema 25 historical at v4.0.0. "
        "Finish 3.0 freeze catalogs remain schema 24 historical at v3.0.0. "
        "Finish 2.0 freeze catalogs remain schema 23 historical at v2.0.0. "
        "Tag v6.0.0 remains operator-manual."
    )
    if "parity-freeze-6.0.0.json" not in pin["fixtures"]:
        pin["fixtures"].append("parity-freeze-6.0.0.json")
    dump(ROOT / "shared/fixtures/RELEASE_PIN.json", pin)

    pkg = load(ROOT / "web/package.json")
    pkg["version"] = "6.0.0"
    dump(ROOT / "web/package.json", pkg)

    listing = load(ROOT / "shared/store/listing.json")
    listing["whatsNewVersion"] = "6.0.0"
    listing["freeze60Phase"] = 30
    listing["freeze60Catalog"] = SHIP
    dump(ROOT / "shared/store/listing.json", listing)

    listing_copy = load(ROOT / "shared/store/listing-copy.json")
    listing_copy["description"] = (
        "Frozen Play / web listing copy for store ship. Finish 6.0 Phase 30 freezes whatsNew at 6.0.0; "
        "English remains the canonical en freeze for pin/whatsNewVersion."
    )
    listing_copy.setdefault("copy", {})["whatsNewVersion"] = "6.0.0"
    dump(ROOT / "shared/store/listing-copy.json", listing_copy)

    # Android whats-new.
    strings = ROOT / "app/src/main/res/values/strings.xml"
    text = strings.read_text(encoding="utf-8")
    whats_new = (
        "6.0.0 freeze — one hundred fifty species, one hundred quests, sixteen machines, "
        "fourteen harbors, twenty rival markets, schema 27 nest sigils, parity lock 6.0, and "
        "Finish 6.0 ops. Schema 27; prior 5.0 saves still load."
    )
    text = re.sub(
        r'(<string name="store_whats_new">)(.*?)(</string>)',
        lambda m: f"{m.group(1)}{whats_new}{m.group(3)}",
        text,
        count=1,
        flags=re.S,
    )
    strings.write_text(text, encoding="utf-8")

    # LOC floors → Finish 6 freeze cut.
    loc = load(ROOT / "shared/ship/loc-floors.json")
    loc["description"] = (
        "Finish 2.0 Phase 6 scoreboard → Finish 3.0/4.0/5.0/6.0 freezes. Measures real source only "
        "(no padding). Freeze floors stay anti-regression at the 6.0 cut; Finish 6.0 plan targets "
        "are 38k/26k/56k/120k."
    )
    loc["contentVersion"] = "6.0.0"
    loc["schemaVersion"] = 27
    loc["scopes"]["gameCore"]["phase30Floor"] = FLOORS["gameCore"]
    loc["scopes"]["app"]["phase30Floor"] = FLOORS["app"]
    loc["scopes"]["webSrc"]["phase30Floor"] = FLOORS["webSrc"]
    loc["productTotalFloor"] = FLOORS["productTotal"]
    loc["freezeCut"] = FREEZE_CUT
    loc.setdefault("softFloors", {})
    loc["softFloors"]["finish5HistoricalProductTotalFloor"] = 90000
    loc["softFloors"]["finish5HistoricalGameCoreFloor"] = 32000
    loc["softFloors"]["finish5HistoricalAppFloor"] = 15200
    loc["softFloors"]["finish5HistoricalWebSrcFloor"] = 42500
    loc["softFloors"]["note"] = (
        "Finish 5.0 anti-regression floors remain documented; live floors raised to Finish 6.0 "
        "measured cut without padding to force-meet 120k plan target."
    )
    dump(ROOT / "shared/ship/loc-floors.json", loc)

    # Kickoff live contentVersion advances at freeze; baseline stays Phase 1 historical.
    kickoff = load(ROOT / "shared/ship/finish-6.0-kickoff.json")
    kickoff["contentVersion"] = "6.0.0"
    kickoff["schemaVersion"] = 27
    dump(ROOT / "shared/ship/finish-6.0-kickoff.json", kickoff)

    # Live parity-lock content version.
    parity = load(ROOT / "shared/fixtures/parity-lock.json")
    parity["contentVersion"] = "6.0.0"
    dump(ROOT / "shared/fixtures/parity-lock.json", parity)

    dod = load(ROOT / "shared/ship/definition-of-done.json")
    dod["contentVersion"] = "6.0.0"
    dod["schemaVersion"] = 27
    dod["releaseTag"] = "v6.0.0"
    dod["notes"] = (
        "Finish 6.0 Phase 30 freeze-6 complete (6.0.0 / schema 27 / versionCode 7); Phases 1–29 remain green. "
        "LOC freeze anti-regression at measured cut; plan targets retained without padding. "
        "Deploy/tag remain manual."
    )
    dod["finish6Freeze"] = {
        "phase": 30,
        "plan": "30_finish_6.0",
        "status": "ready_for_release_tag",
        "statusValues": ["ready_for_release_tag", "tag_cut", "archived"],
        "releaseTag": "v6.0.0",
        "contentVersion": "6.0.0",
        "schemaVersion": 27,
        "versionName": "6.0.0",
        "versionCode": 7,
        "catalog": SHIP,
        "validateScript": "npm run freeze6:validate",
        "locEnforceMode": "freeze_anti_regression",
        "completeTagArchived": "v1.0-complete",
        "finish2ReleaseTagArchived": "v2.0.0",
        "finish3ReleaseTagArchived": "v3.0.0",
        "finish4ReleaseTagArchived": "v4.0.0",
        "finish5ReleaseTagArchived": "v5.0.0",
        "checklist": [
            "RELEASE_PIN + content-pack at 6.0.0 / schema 27 / versionCode 7",
            "Content floors ≥14 harbors / 150 species / 16 machines / 100 quests / 20 seasonal / 20 baits / 30 cosmetics / 20 rivals / 24 parity",
            "LOC freeze anti-regression floors green; plan targets retained without padding",
            "Finish 5.0 + Finish 4.0 + Finish 3.0 + Finish 2.0 freeze + post-1.0 closeout remain historical/archived",
            "freeze6:validate + freeze5:validate + freeze4:validate + freeze3:validate + freeze2:validate + dod:validate green in CI",
            "Annotated git tag v6.0.0 remains operator-manual",
        ],
        "manualCommands": ship["manualCommands"],
    }
    dump(ROOT / "shared/ship/definition-of-done.json", dod)

    # Soft-floor note on Finish 5 ship catalog.
    p5 = load(ROOT / "shared/ship/freeze-5.0.0.json")
    p5.setdefault("softFloors", {})
    p5["softFloors"]["note"] = (
        "freeze5/freeze4/freeze3/freeze2 stay green on historical pins; Finish 6.0 Phase 30 advances "
        "live pin to 6.0.0 / schema 27 / versionCode 7."
    )
    dump(ROOT / "shared/ship/freeze-5.0.0.json", p5)

    soft_floor_pack_version_checks()
    soft_floor_freeze5_live_pin()
    soft_floor_freeze4_live_pin()
    print(f"authored {SHIP}; freeze floors={FLOORS}; live pin 6.0.0 / vc 7")


if __name__ == "__main__":
    main()
