#!/usr/bin/env python3
"""
Finish 5.0 Phase 27 — Device/browser/perf matrix 5.

Raises harbor LRU for 12 harbors, expands Android/browser matrices,
raises denser-scene presenter caps, and closes devicePerf5Incomplete.

Usage:
  python3 shared/tools/author_device_perf_5.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "device-perf-5.json"
PARITY = ROOT / "fixtures" / "parity-device-perf-5.json"
MATRIX = ROOT / "perf" / "device-matrix.json"
BUDGET = ROOT / "perf" / "budget-gate.json"
ANDROID = ROOT / "lifecycle" / "android-device-matrix.json"
BROWSER = ROOT / "lifecycle" / "browser-matrix.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
MARKER = "authored-finish-5.0-phase-27"

HARBOR_CACHE_FLOOR = 4
OVER_BUDGET_MULT_MAX = 1.12
UNDER_BUDGET_MULT = 0.85
ANDROID_CLASS_FLOOR = 5
ANDROID_SCENARIO_FLOOR = 9
BROWSER_TARGET_FLOOR = 5
BROWSER_SCENARIO_FLOOR = 9
ANALYTICS_CONTRACT_TESTS_MIN = 4

PRESENTER_CAPS = {
    "crowd": {"low": 3, "medium": 6, "high": 10},
    "fly": {"low": 4, "medium": 10, "high": 16},
    "burst": {"low": 2, "medium": 5, "high": 10},
}

NEW_ANDROID_CLASS = {
    "id": "desktop",
    "minWidthDp": 840,
    "maxWidthDp": 10000,
    "orientations": ["landscape", "portrait"],
    "note": "Finish 5.0 Phase 27 — Chromebook / desktop-class large window; denser harbor LRU travel.",
}

NEW_ANDROID_SCENARIOS = [
    {
        "id": "picture_in_picture",
        "title": "Picture-in-picture / multi-resume",
        "trigger": "Enter PiP or overlay while sim running",
        "expects": ["pauseSimOnStop", "checkpointOnStop", "resumeSimLoop"],
        "hostHooks": ["MainActivity.onStop", "MainActivity.onStart", "GameViewModel.pause"],
        "phase28Keys": ["android.pauseSimOnStop", "android.checkpointOnStop"],
    },
    {
        "id": "thermal_status",
        "title": "Thermal throttle / sustained heat",
        "trigger": "Device reports thermal throttling during dense harbor travel",
        "expects": ["checkpointWithoutDestroy", "keepSimStateInMemoryIfPossible"],
        "hostHooks": ["MainActivity.onTrimMemory", "GameViewModel.onTrimMemory"],
        "phase28Keys": ["android.checkpointOnStop"],
    },
]

NEW_BROWSER = {
    "id": "chrome_android",
    "label": "Chrome for Android",
    "engines": ["Blink"],
    "minNotes": "Finish 5.0 Phase 27 — mobile Chrome WebGL2 + touch unlock; denser scene budgets",
    "webgl2": "required",
    "indexedDb": "persistent",
    "audioUnlock": ["pointerdown", "keydown", "touchstart"],
}

NEW_BROWSER_SCENARIOS = [
    {
        "id": "bfcache_restore",
        "title": "Back/forward cache restore",
        "trigger": "Navigate away then back; page restored from bfcache",
        "expects": ["resumeOnVisibilityVisible", "keepUnlockAcrossSuspend"],
        "hostHooks": ["App.tsx pageshow", "GameHost pause/resume"],
        "phase28Keys": ["web.tabLifecycle.suspendAudioWhenHidden"],
    },
    {
        "id": "persistent_storage",
        "title": "Persistent storage grant",
        "trigger": "navigator.storage.persist() granted after first play",
        "expects": ["persistentFalse", "titleToastWhenMemoryOnly", "settingsLabel"],
        "hostHooks": ["web/src/game/saveStore.ts", "openSaveStore"],
        "phase28Keys": ["web.storageUnavailable"],
    },
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def expand_perf() -> int:
    matrix = load(MATRIX)
    # Keep historical Phase 26 id; Finish 5 marks via finish5Phase.
    matrix["finish5Phase"] = 27
    matrix["harborCacheLimit"] = HARBOR_CACHE_FLOOR
    matrix["description"] = (
        "Blueprint device budgets for quality presets and soft auto-downgrade/upgrade. "
        "Finish 5.0 Phase 27 raises harbor LRU to 4 and denser-scene presenter caps for 12 harbors."
    )
    matrix["qualityCosts"] = {
        "low": {
            "web": "1× DPR, no shadows, crowd≤3, fly≤4, burst≤2",
            "android": "no shadows, no MSAA, crowd≤3, fly≤4, burst≤2",
        },
        "medium": {
            "web": "≤1.5× DPR (≤1080 CSS tall), 1024 shadows, crowd≤6, fly≤10, burst≤5",
            "android": "shadows on, no MSAA, crowd≤6, fly≤10, burst≤5",
        },
        "high": {
            "web": "≤2× DPR, 2048 soft shadows, crowd≤10, fly full pool, burst full pool",
            "android": "shadows + 4× MSAA, crowd≤10, fly full pool, burst full pool",
        },
    }
    if "autoUpgrade" in matrix:
        matrix["autoUpgrade"]["note"] = (
            "Finish 5.0 Phase 27 — recover quality after sustained under-budget frames "
            "without exceeding player preset (12-harbor travel)."
        )
    dump(MATRIX, matrix)

    gate = load(BUDGET)
    gate["finish5Phase"] = 27
    gate["harborCacheLimit"] = HARBOR_CACHE_FLOOR
    gate["presenterCaps"] = PRESENTER_CAPS
    gate["description"] = (
        "Post-1.0 Phase 15 — CI smoke + fail criteria enforcing device-matrix budgets. "
        "Finish 5.0 Phase 27 raises harbor LRU + denser presenter caps for 12 harbors."
    )
    checklist = gate.setdefault("deviceChecklist", [])
    note = "Harbor GLB LRU ≥4 on both platforms (12-harbor travel)"
    if note not in checklist:
        checklist.append(note)
    dump(BUDGET, gate)
    return HARBOR_CACHE_FLOOR


def expand_android() -> tuple[int, int]:
    android = load(ANDROID)
    android["finish5Phase"] = 27
    android["description"] = (
        "Post-1.0 Phase 13 — Android device lifecycle QA matrix. "
        "Finish 5.0 Phase 27 adds desktop class + PiP/thermal scenarios for denser harbors."
    )
    classes = android.setdefault("deviceClasses", [])
    have = {c.get("id") for c in classes}
    if NEW_ANDROID_CLASS["id"] not in have:
        classes.append(NEW_ANDROID_CLASS)
    scenarios = android.setdefault("scenarios", [])
    shave = {s.get("id") for s in scenarios}
    for s in NEW_ANDROID_SCENARIOS:
        if s["id"] not in shave:
            scenarios.append(s)
            shave.add(s["id"])
    dump(ANDROID, android)
    return len(classes), len(scenarios)


def expand_browser() -> tuple[int, int]:
    browser = load(BROWSER)
    browser["finish5Phase"] = 27
    browser["description"] = (
        "Post-1.0 Phase 14 — browser QA matrix. "
        "Finish 5.0 Phase 27 adds Chrome Android + bfcache/persistent-storage scenarios."
    )
    browsers = browser.setdefault("browsers", [])
    have = {b.get("id") for b in browsers}
    if NEW_BROWSER["id"] not in have:
        browsers.append(NEW_BROWSER)
    scenarios = browser.setdefault("scenarios", [])
    shave = {s.get("id") for s in scenarios}
    for s in NEW_BROWSER_SCENARIOS:
        if s["id"] not in shave:
            scenarios.append(s)
            shave.add(s["id"])
    dump(BROWSER, browser)
    return len(browsers), len(scenarios)


def write_ship(android_classes: int, android_scenarios: int, browsers: int, browser_scenarios: int) -> None:
    dump(
        SHIP,
        {
            "phase": 27,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.device_perf_5.v1",
            "description": (
                "Finish 5.0 Phase 27 — Device/browser/perf matrix 5. "
                "Harbor LRU ≥4, denser presenter caps, expanded Android/browser matrices for 12 harbors. "
                "Closes kickoff gap devicePerf5Incomplete. Soft-floors Finish 4.0 deviceperf4:validate."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "devicePerf5Marker": MARKER,
            "closesGap": "devicePerf5Incomplete",
            "perfMatrix": "shared/perf/device-matrix.json",
            "budgetGate": "shared/perf/budget-gate.json",
            "androidMatrix": "shared/lifecycle/android-device-matrix.json",
            "browserMatrix": "shared/lifecycle/browser-matrix.json",
            "remoteAnalyticsShip": "shared/ship/remote-analytics.json",
            "remoteAnalyticsPolicy": "shared/ops/remote-analytics-sink.json",
            "harborCacheFloor": HARBOR_CACHE_FLOOR,
            "overBudgetMultMax": OVER_BUDGET_MULT_MAX,
            "underBudgetMult": UNDER_BUDGET_MULT,
            "androidDowngradeStreakMax": 40,
            "webDowngradeStreakMax": 75,
            "androidDeviceClassFloor": ANDROID_CLASS_FLOOR,
            "androidScenarioFloor": ANDROID_SCENARIO_FLOOR,
            "browserTargetFloor": BROWSER_TARGET_FLOOR,
            "browserScenarioFloor": BROWSER_SCENARIO_FLOOR,
            "analyticsContractTestsMin": ANALYTICS_CONTRACT_TESTS_MIN,
            "presenterCaps": PRESENTER_CAPS,
            "parityFixture": "shared/fixtures/parity-device-perf-5.json",
            "validateScript": "npm run deviceperf5:validate",
            "softDevicePerf4Validate": "npm run deviceperf4:validate",
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "authorTool": "shared/tools/author_device_perf_5.py",
            "softFloors": {
                "devicePerf4HarborCacheFloor": 3,
                "devicePerf4AndroidClassFloor": 4,
                "devicePerf4BrowserTargetFloor": 4,
                "perfBudgetHistoricalHarborCache": 3,
                "note": (
                    "Finish 4.0 deviceperf4 / perf:budget / lifecycle validates stay green; "
                    "Phase 27 enforces harbor LRU ≥4 + denser caps for 12 harbors."
                ),
            },
            "checklist": [
                f"Perf matrix harborCache≥{HARBOR_CACHE_FLOOR}, denser presenter caps wired web+Android",
                f"Android device classes ≥{ANDROID_CLASS_FLOOR} (desktop) + scenarios ≥{ANDROID_SCENARIO_FLOOR}",
                f"Browser targets ≥{BROWSER_TARGET_FLOOR} (chrome_android) + scenarios ≥{BROWSER_SCENARIO_FLOOR}",
                f"Remote analytics sink contract tests (≥{ANALYTICS_CONTRACT_TESTS_MIN})",
                "Kickoff gaps.devicePerf5Incomplete=false",
                "deviceperf4:validate + perf:budget soft-green",
                "deviceperf5:validate green in CI",
                "schema stays 26 / content 4.0.0",
            ],
            "preflightGates": [
                "shared/ship/device-perf-5.json",
                "shared/fixtures/parity-device-perf-5.json",
                "shared/perf/device-matrix.json",
                "shared/perf/budget-gate.json",
                "shared/lifecycle/android-device-matrix.json",
                "shared/lifecycle/browser-matrix.json",
                "shared/ops/remote-analytics-sink.json",
                "web/src/render/frameTiming.ts",
                "web/src/render/perfBudgetGate.ts",
                "web/src/render/presenters/quality.ts",
                "web/scripts/validate-perf-budget.ts",
                "web/scripts/validate-device-perf-5.ts",
                "web/src/ship/devicePerf5.ts",
                "web/test/devicePerf5.test.ts",
                "web/test/remoteAnalyticsContract.test.ts",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DevicePerf5.kt",
            ],
            "liveCounts": {
                "harborCacheLimit": HARBOR_CACHE_FLOOR,
                "androidClasses": android_classes,
                "androidScenarios": android_scenarios,
                "browserTargets": browsers,
                "browserScenarios": browser_scenarios,
            },
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixture.parity_device_perf_5.v1",
            "description": "Finish 5.0 Phase 27: device/browser/perf matrix 5 expectations.",
            "devicePerf5Marker": MARKER,
            "expect": {
                "closesGap": "devicePerf5Incomplete",
                "devicePerf5Incomplete": False,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "harborCacheFloor": HARBOR_CACHE_FLOOR,
                "overBudgetMultMax": OVER_BUDGET_MULT_MAX,
                "underBudgetMult": UNDER_BUDGET_MULT,
                "androidDeviceClassFloor": ANDROID_CLASS_FLOOR,
                "androidScenarioFloor": ANDROID_SCENARIO_FLOOR,
                "browserTargetFloor": BROWSER_TARGET_FLOOR,
                "browserScenarioFloor": BROWSER_SCENARIO_FLOOR,
                "analyticsContractTestsMin": ANALYTICS_CONTRACT_TESTS_MIN,
                "requiredAndroidClasses": ["phone", "tablet7", "tablet10", "foldable", "desktop"],
                "requiredAndroidScenarios": [
                    "multi_window",
                    "deep_trim",
                    "picture_in_picture",
                    "thermal_status",
                ],
                "requiredBrowsers": ["chrome", "edge", "firefox", "safari", "chrome_android"],
                "requiredBrowserScenarios": [
                    "visibility_hidden",
                    "pwa_offline",
                    "reduced_motion",
                    "bfcache_restore",
                    "persistent_storage",
                ],
                "frameTimingMustContain": [
                    "FRAME_UPGRADE_STREAK",
                    "FRAME_UNDER_BUDGET_MULT",
                    "upgradeQuality",
                    "FrameBudgetAction",
                    "HARBOR_CACHE_LIMIT",
                ],
                "androidFrameTimingMustContain": [
                    "FRAME_UPGRADE_STREAK",
                    "UNDER_BUDGET_MULT",
                    "FrameBudgetAction",
                    f"HARBOR_CACHE_LIMIT = {HARBOR_CACHE_FLOOR}",
                ],
                "presenterMustContain": [
                    "medium: 6",
                    "high: 10",
                    "FLYING_TRANSFER_POOL = 16",
                    "MEDIUM -> 6",
                    "HIGH -> 10",
                ],
                "analyticsContractMustContain": [
                    "consent fail-closed",
                    "batch schema",
                    "retry backoff",
                    "flush slice empty",
                ],
            },
        },
    )


def update_kickoff_dod_listing_pin() -> None:
    kick = load(KICKOFF)
    kick["gaps"]["devicePerf5Incomplete"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["harborCacheLimit"] = HARBOR_CACHE_FLOOR
    quotas["androidDeviceClasses"] = ANDROID_CLASS_FLOOR
    quotas["browserTargets"] = BROWSER_TARGET_FLOOR
    dod["notes"] = (
        "Finish 5.0 Phase 27 device-perf-5 complete (harbor LRU ≥4 + denser matrices for 12 harbors); "
        "Phases 1–26 remain green. Content stays 4.0.0 / schema 26. devicePerf5Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["devicePerf5"] = {
        "phase": 27,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "devicePerf5Marker": MARKER,
        "catalog": "shared/ship/device-perf-5.json",
        "parityFixture": "shared/fixtures/parity-device-perf-5.json",
        "validateScript": "npm run deviceperf5:validate",
        "checklist": [
            f"Harbor LRU ≥{HARBOR_CACHE_FLOOR}",
            f"Android classes ≥{ANDROID_CLASS_FLOOR} / browsers ≥{BROWSER_TARGET_FLOOR}",
            "Kickoff devicePerf5Incomplete closed",
            "deviceperf5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["devicePerf5Phase"] = 27
    listing["devicePerf5Catalog"] = "shared/ship/device-perf-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["devicePerf5"] = "shared/ship/device-perf-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-device-perf-5.json" not in fixtures:
        fixtures.append("parity-device-perf-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    expand_perf()
    android_classes, android_scenarios = expand_android()
    browsers, browser_scenarios = expand_browser()
    if android_classes < ANDROID_CLASS_FLOOR:
        raise SystemExit(f"android classes {android_classes} < {ANDROID_CLASS_FLOOR}")
    if android_scenarios < ANDROID_SCENARIO_FLOOR:
        raise SystemExit(f"android scenarios {android_scenarios} < {ANDROID_SCENARIO_FLOOR}")
    if browsers < BROWSER_TARGET_FLOOR:
        raise SystemExit(f"browsers {browsers} < {BROWSER_TARGET_FLOOR}")
    if browser_scenarios < BROWSER_SCENARIO_FLOOR:
        raise SystemExit(f"browser scenarios {browser_scenarios} < {BROWSER_SCENARIO_FLOOR}")
    write_ship(android_classes, android_scenarios, browsers, browser_scenarios)
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 27 device-perf-5: harborCache={HARBOR_CACHE_FLOOR} "
        f"android={android_classes}/{android_scenarios} browser={browsers}/{browser_scenarios}"
    )


if __name__ == "__main__":
    main()
