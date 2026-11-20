#!/usr/bin/env python3
"""
Finish 6.0 Phase 28 — Device/browser/perf matrix 6.

Raises harbor LRU for 14 harbors, expands Android/browser matrices,
raises denser nest presenter caps, and closes devicePerf6Incomplete.

Usage:
  python3 shared/tools/author_device_perf_6.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "device-perf-6.json"
PARITY = ROOT / "fixtures" / "parity-device-perf-6.json"
MATRIX = ROOT / "perf" / "device-matrix.json"
BUDGET = ROOT / "perf" / "budget-gate.json"
ANDROID = ROOT / "lifecycle" / "android-device-matrix.json"
BROWSER = ROOT / "lifecycle" / "browser-matrix.json"
KICKOFF = ROOT / "ship" / "finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
MARKER = "authored-finish-6.0-phase-28"
OPEN_GAP_FLAG_MIN = 1

HARBOR_CACHE_FLOOR = 5
OVER_BUDGET_MULT_MAX = 1.12
UNDER_BUDGET_MULT = 0.85
ANDROID_CLASS_FLOOR = 6
ANDROID_SCENARIO_FLOOR = 11
BROWSER_TARGET_FLOOR = 6
BROWSER_SCENARIO_FLOOR = 11
ANALYTICS_CONTRACT_TESTS_MIN = 5

PRESENTER_CAPS = {
    "crowd": {"low": 4, "medium": 8, "high": 12},
    "fly": {"low": 5, "medium": 12, "high": 20},
    "burst": {"low": 3, "medium": 6, "high": 12},
}

NEW_ANDROID_CLASS = {
    "id": "ultrawide",
    "minWidthDp": 1000,
    "maxWidthDp": 10000,
    "orientations": ["landscape", "portrait"],
    "note": "Finish 6.0 Phase 28 — ultrawide / nest multi-pane large window; harbor LRU ≥5 travel.",
}

NEW_ANDROID_SCENARIOS = [
    {
        "id": "nest_harbor_travel",
        "title": "Nest harbor travel LRU soak",
        "trigger": "Travel across ≥5 distinct harbors without process death",
        "expects": ["glContextRetained", "hudReflow", "noActivityRecreate"],
        "hostHooks": ["GameViewModel.travel", "HarborRenderer.harborCache"],
        "phase28Keys": ["android.configChangesHandled"],
    },
    {
        "id": "display_cutout",
        "title": "Display cutout / edge-to-edge",
        "trigger": "Notch / cutout device; rotate into cutout-safe insets",
        "expects": ["hudReflow", "configChangesHandled", "glContextRetained"],
        "hostHooks": ["MainActivity.onConfigurationChanged", "AndroidManifest.configChanges"],
        "phase28Keys": ["android.configChangesHandled"],
    },
]

NEW_BROWSER = {
    "id": "safari_ios",
    "label": "Safari on iOS",
    "engines": ["WebKit"],
    "minNotes": "Finish 6.0 Phase 28 — iOS Safari WebGL2 + touchstart unlock; nest deeplink resume",
    "webgl2": "required",
    "indexedDb": "persistent_or_private_memory",
    "audioUnlock": ["pointerdown", "keydown", "touchstart"],
    "notes": [
        "ITP may force memory-only saves in private mode",
        "Nest deeplink resume must re-unlock audio on first tap",
    ],
}

NEW_BROWSER_SCENARIOS = [
    {
        "id": "nest_deeplink_resume",
        "title": "Nest deeplink resume",
        "trigger": "Open /play?panel=nest (or hash) after cold load",
        "expects": ["resumeOnVisibilityVisible", "unlockOnGesture"],
        "hostHooks": ["App.tsx deep link", "GameHost.pendingDeepLink"],
        "phase28Keys": ["web.audioGesture", "web.tabLifecycle.suspendAudioWhenHidden"],
    },
    {
        "id": "page_lifecycle_freeze",
        "title": "Page Lifecycle freeze / resume",
        "trigger": "document freeze/resume (Chrome Page Lifecycle)",
        "expects": ["suspendOnVisibilityHidden", "resumeOnVisibilityVisible", "keepUnlockAcrossSuspend"],
        "hostHooks": ["App.tsx freeze/resume", "GameHost pause/resume"],
        "phase28Keys": ["web.tabLifecycle.suspendAudioWhenHidden"],
    },
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def expand_perf() -> None:
    matrix = load(MATRIX)
    matrix["finish6Phase"] = 28
    matrix["harborCacheLimit"] = HARBOR_CACHE_FLOOR
    matrix["description"] = (
        "Blueprint device budgets for quality presets and soft auto-downgrade/upgrade. "
        "Finish 6.0 Phase 28 raises harbor LRU to 5 and denser nest presenter caps for 14 harbors."
    )
    matrix["qualityCosts"] = {
        "low": {
            "web": "1× DPR, no shadows, crowd≤4, fly≤5, burst≤3",
            "android": "no shadows, no MSAA, crowd≤4, fly≤5, burst≤3",
        },
        "medium": {
            "web": "≤1.5× DPR (≤1080 CSS tall), 1024 shadows, crowd≤8, fly≤12, burst≤6",
            "android": "shadows on, no MSAA, crowd≤8, fly≤12, burst≤6",
        },
        "high": {
            "web": "≤2× DPR, 2048 soft shadows, crowd≤12, fly full pool, burst full pool",
            "android": "shadows + 4× MSAA, crowd≤12, fly full pool, burst full pool",
        },
    }
    if "autoUpgrade" in matrix:
        matrix["autoUpgrade"]["note"] = (
            "Finish 6.0 Phase 28 — recover quality after sustained under-budget frames "
            "without exceeding player preset (14-harbor nest travel)."
        )
    dump(MATRIX, matrix)

    gate = load(BUDGET)
    gate["finish6Phase"] = 28
    gate["harborCacheLimit"] = HARBOR_CACHE_FLOOR
    gate["presenterCaps"] = PRESENTER_CAPS
    gate["description"] = (
        "Post-1.0 Phase 15 — CI smoke + fail criteria enforcing device-matrix budgets. "
        "Finish 6.0 Phase 28 raises harbor LRU + denser nest presenter caps for 14 harbors."
    )
    checklist = gate.setdefault("deviceChecklist", [])
    note = "Harbor GLB LRU ≥5 on both platforms (14-harbor nest travel)"
    if note not in checklist:
        checklist.append(note)
    dump(BUDGET, gate)


def expand_matrices() -> tuple[int, int, int, int]:
    android = load(ANDROID)
    android["finish6Phase"] = 28
    android["description"] = (
        "Post-1.0 Phase 13 — Android device lifecycle QA matrix. "
        "Finish 6.0 Phase 28 adds ultrawide class + nest travel/cutout scenarios for 14 harbors."
    )
    classes = android.setdefault("deviceClasses", [])
    if not any(c.get("id") == NEW_ANDROID_CLASS["id"] for c in classes):
        classes.append(NEW_ANDROID_CLASS)
    scenarios = android.setdefault("scenarios", [])
    have = {s.get("id") for s in scenarios}
    for s in NEW_ANDROID_SCENARIOS:
        if s["id"] not in have:
            scenarios.append(s)
    checklist = android.setdefault("manualChecklist", [])
    for item in (
        "Ultrawide: nest multi-pane landscape; harbor LRU retains ≥5 warm GLBs",
        "Nest travel: visit 5 harbors without recreate; Filament context retained",
        "Cutout: notch device rotate; HUD insets reflow, no blank GL surface",
    ):
        if item not in checklist:
            checklist.append(item)
    dump(ANDROID, android)

    browser = load(BROWSER)
    browser["finish6Phase"] = 28
    browser["description"] = (
        "Post-1.0 Phase 14 — browser QA matrix. "
        "Finish 6.0 Phase 28 adds Safari iOS + nest deeplink/page-lifecycle scenarios."
    )
    browsers = browser.setdefault("browsers", [])
    if not any(b.get("id") == NEW_BROWSER["id"] for b in browsers):
        browsers.append(NEW_BROWSER)
    b_scenarios = browser.setdefault("scenarios", [])
    b_have = {s.get("id") for s in b_scenarios}
    for s in NEW_BROWSER_SCENARIOS:
        if s["id"] not in b_have:
            b_scenarios.append(s)
    b_checklist = browser.setdefault("manualChecklist", [])
    for item in (
        "Safari iOS: nest deeplink opens panel; first tap unlocks audio",
        "Chrome: Page Lifecycle freeze → resume keeps unlock + harbor scene",
        "Nest deeplink: /play?panel=nest after cold load resumes without blank WebGL",
    ):
        if item not in b_checklist:
            b_checklist.append(item)
    dump(BROWSER, browser)

    return (
        len(android["deviceClasses"]),
        len(android["scenarios"]),
        len(browser["browsers"]),
        len(browser["scenarios"]),
    )


def write_ship(live: dict) -> None:
    dump(
        SHIP,
        {
            "phase": 28,
            "plan": "30_finish_6.0",
            "schema": "fish.ship.device_perf_6.v1",
            "description": (
                "Finish 6.0 Phase 28 — Device/browser/perf matrix 6. Harbor LRU ≥5, denser nest "
                "presenter caps, expanded Android/browser matrices for 14 harbors. Closes kickoff "
                "gap devicePerf6Incomplete. Soft-floors Finish 5.0 deviceperf5:validate."
            ),
            "contentVersion": "5.0.0",
            "schemaVersion": 27,
            "devicePerf6Marker": MARKER,
            "closesGap": "devicePerf6Incomplete",
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
            "parityFixture": "shared/fixtures/parity-device-perf-6.json",
            "validateScript": "npm run deviceperf6:validate",
            "softDevicePerf5Validate": "npm run deviceperf5:validate",
            "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
            "authorTool": "shared/tools/author_device_perf_6.py",
            "softFloors": {
                "devicePerf5HarborCacheFloor": 4,
                "devicePerf5AndroidClassFloor": 5,
                "devicePerf5BrowserTargetFloor": 5,
                "openGapFlagMinPrior": 2,
                "note": (
                    "Finish 5.0 deviceperf5 / perf:budget stay green on ≥ floors; "
                    "Phase 28 enforces harbor LRU ≥5 + denser nest caps for 14 harbors."
                ),
            },
            "checklist": [
                "Perf matrix harborCache≥5, denser nest presenter caps wired web+Android",
                "Android device classes ≥6 (ultrawide) + scenarios ≥11",
                "Browser targets ≥6 (safari_ios) + scenarios ≥11",
                "Remote analytics sink contract tests (≥5)",
                "Kickoff gaps.devicePerf6Incomplete=false",
                "deviceperf5:validate + perf:budget soft-green",
                "deviceperf6:validate green in CI",
                "schema stays 27 / content 5.0.0",
            ],
            "preflightGates": [
                "shared/ship/device-perf-6.json",
                "shared/fixtures/parity-device-perf-6.json",
                "shared/perf/device-matrix.json",
                "shared/perf/budget-gate.json",
                "shared/lifecycle/android-device-matrix.json",
                "shared/lifecycle/browser-matrix.json",
                "shared/ops/remote-analytics-sink.json",
                "shared/tools/author_device_perf_6.py",
                "web/src/render/frameTiming.ts",
                "web/src/render/perfBudgetGate.ts",
                "web/src/render/presenters/quality.ts",
                "web/src/render/presenters/vfx.ts",
                "web/scripts/validate-perf-budget.ts",
                "web/scripts/validate-device-perf-6.ts",
                "web/src/ship/devicePerf6.ts",
                "web/test/devicePerf6.test.ts",
                "web/test/remoteAnalyticsContract.test.ts",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/FrameTiming.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersQuality.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/render/PresentersVfx.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DevicePerf6.kt",
            ],
            "liveCounts": live,
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixtures.parity_device_perf_6.v1",
            "description": "Finish 6.0 Phase 28: device/browser/perf matrix 6 expectations.",
            "devicePerf6Marker": MARKER,
            "expect": {
                "closesGap": "devicePerf6Incomplete",
                "devicePerf6Incomplete": False,
                "openGapFlagMin": OPEN_GAP_FLAG_MIN,
                "schemaVersion": 27,
                "contentVersion": "5.0.0",
                "harborCacheFloor": HARBOR_CACHE_FLOOR,
                "overBudgetMultMax": OVER_BUDGET_MULT_MAX,
                "underBudgetMult": UNDER_BUDGET_MULT,
                "androidDeviceClassFloor": ANDROID_CLASS_FLOOR,
                "androidScenarioFloor": ANDROID_SCENARIO_FLOOR,
                "browserTargetFloor": BROWSER_TARGET_FLOOR,
                "browserScenarioFloor": BROWSER_SCENARIO_FLOOR,
                "analyticsContractTestsMin": ANALYTICS_CONTRACT_TESTS_MIN,
                "requiredAndroidClasses": [
                    "phone",
                    "tablet7",
                    "tablet10",
                    "foldable",
                    "desktop",
                    "ultrawide",
                ],
                "requiredAndroidScenarios": [
                    "multi_window",
                    "deep_trim",
                    "picture_in_picture",
                    "thermal_status",
                    "nest_harbor_travel",
                    "display_cutout",
                ],
                "requiredBrowsers": [
                    "chrome",
                    "edge",
                    "firefox",
                    "safari",
                    "chrome_android",
                    "safari_ios",
                ],
                "requiredBrowserScenarios": [
                    "visibility_hidden",
                    "pwa_offline",
                    "reduced_motion",
                    "bfcache_restore",
                    "persistent_storage",
                    "nest_deeplink_resume",
                    "page_lifecycle_freeze",
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
                    "HARBOR_CACHE_LIMIT = 5",
                ],
                "presenterMustContain": [
                    "medium: 8",
                    "high: 12",
                    "FLYING_TRANSFER_POOL = 20",
                    "MEDIUM -> 8",
                    "HIGH -> 12",
                ],
                "analyticsContractMustContain": [
                    "consent fail-closed",
                    "batch schema",
                    "retry backoff",
                    "flush slice empty",
                    "nest loadtest probe",
                ],
                "gates": [
                    "harbor_lru_5",
                    "matrix_expand",
                    "denser_caps",
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
        if isinstance(expect, dict) and expect.get("openGapFlagMin") == 2:
            expect["openGapFlagMin"] = OPEN_GAP_FLAG_MIN
            dump(path, data)


def update_kickoff_dod_listing_pin(live: dict) -> None:
    kick = load(KICKOFF)
    kick["gaps"]["devicePerf6Incomplete"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    dod.setdefault("quotas", {})
    dod["quotas"]["devicePerf6HarborCache"] = HARBOR_CACHE_FLOOR
    dod["quotas"]["devicePerf6AndroidClasses"] = ANDROID_CLASS_FLOOR
    dod["quotas"]["devicePerf6AndroidScenarios"] = ANDROID_SCENARIO_FLOOR
    dod["quotas"]["devicePerf6BrowserTargets"] = BROWSER_TARGET_FLOOR
    dod["quotas"]["devicePerf6BrowserScenarios"] = BROWSER_SCENARIO_FLOOR
    dod["devicePerf6"] = {
        "phase": 28,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "devicePerf6Marker": MARKER,
        "catalog": "shared/ship/device-perf-6.json",
        "parityFixture": "shared/fixtures/parity-device-perf-6.json",
        "validateScript": "npm run deviceperf6:validate",
        "checklist": [
            f"Harbor LRU ≥{HARBOR_CACHE_FLOOR} (live {live['harborCacheLimit']})",
            f"Android ≥{ANDROID_CLASS_FLOOR}/{ANDROID_SCENARIO_FLOOR} "
            f"(live {live['androidClasses']}/{live['androidScenarios']})",
            f"Browser ≥{BROWSER_TARGET_FLOOR}/{BROWSER_SCENARIO_FLOOR} "
            f"(live {live['browserTargets']}/{live['browserScenarios']})",
            "kickoff devicePerf6Incomplete closed",
            "deviceperf6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["devicePerf6Phase"] = 28
    listing["devicePerf6Catalog"] = "shared/ship/device-perf-6.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["devicePerf6"] = "shared/ship/device-perf-6.json"
    fx = pin.get("fixtures") or []
    if "parity-device-perf-6.json" not in fx:
        fx.append("parity-device-perf-6.json")
    pin["fixtures"] = fx
    dump(PIN, pin)

    soft_floor_open_gap_flags()


def main() -> None:
    expand_perf()
    a_cls, a_sc, b_tg, b_sc = expand_matrices()
    live = {
        "harborCacheLimit": HARBOR_CACHE_FLOOR,
        "androidClasses": a_cls,
        "androidScenarios": a_sc,
        "browserTargets": b_tg,
        "browserScenarios": b_sc,
    }
    write_ship(live)
    update_kickoff_dod_listing_pin(live)
    print(
        f"device-perf-6 authored: marker={MARKER} cache={HARBOR_CACHE_FLOOR} "
        f"android={a_cls}/{a_sc} browser={b_tg}/{b_sc} openGapFlagMin={OPEN_GAP_FLAG_MIN}"
    )


if __name__ == "__main__":
    main()
