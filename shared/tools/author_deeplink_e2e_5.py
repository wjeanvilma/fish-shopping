#!/usr/bin/env python3
"""
Finish 5.0 Phase 26 — Deep links + E2E floors ≥12 / ≥14.

Expands panel/hash aliases for Finish 5 surfaces, raises Playwright/Compose
scenario floors, and closes deeplinkE2e5Thin.

Usage:
  python3 shared/tools/author_deeplink_e2e_5.py
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SHIP = ROOT / "ship" / "deeplink-e2e-5.json"
PARITY = ROOT / "fixtures" / "parity-deeplink-e2e-5.json"
ROUTES = ROOT / "deep-links" / "routes.json"
DEEP_PARITY = ROOT / "fixtures" / "parity-deep-links.json"
WEB_E2E = ROOT / "ship" / "web-e2e.json"
COMPOSE = ROOT / "ship" / "compose-ui-tests.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
MARKER = "authored-finish-5.0-phase-26"

PANEL_ALIAS_FLOOR = 40
HASH_ALIAS_FLOOR = 24
MIN_ID_COUNT = 32
MIN_TAG_COUNT = 32
WEB_SCENARIO_FLOOR = 12
COMPOSE_SCENARIO_FLOOR = 14
URI_VECTOR_FLOOR = 12

NEW_PANEL_ALIASES = {
    "weekly": "quests",
    "weeklygoals": "quests",
    "endgame": "quests",
    "retention": "quests",
    "pierledger": "dashboard",
    "cashflow": "dashboard",
    "friction": "pause",
    "licenses": "settings",
    "decor": "settings",
    "photo": "pause",
}

NEW_HASH_ALIASES = {
    "weekly": "quests",
    "endgame": "quests",
    "retention": "quests",
    "pierledger": "dashboard",
    "ledger": "dashboard",
    "friction": "pause",
    "licenses": "settings",
}

WEB_SCENARIOS = [
    "title_play_pause_resume",
    "analytics_decline_goals_nav",
    "staff_map_nav_opens",
    "jobs_dash_nav_opens",
    "deep_link_panel_staff",
    "warehouse_upgrades_nav_opens",
    "deep_link_panel_warehouse",
    "deep_link_panel_weekly",
    "deep_link_panel_ledger",
    "deep_link_hash_endgame",
    "pause_settings_opens",
    "photo_decor_nav_opens",
]

COMPOSE_SCENARIOS = [
    "title_menu_play_no_save",
    "title_menu_continue_has_save",
    "title_analytics_consent",
    "offline_summary_continue",
    "pause_panel_actions",
    "hud_nav_toolbar_tags",
    "compose_tags_catalog_stable",
    "hud_nav_warehouse_goals_fire",
    "hud_nav_staff_upgrades_fire",
    "compose_tags_finish5_floor",
    "title_brand_displayed",
    "pause_root_stable",
    "offline_root_stable",
    "deeplink_ready_tag_present",
]

NEW_URI_VECTORS = [
    {
        "uri": "https://wjeanvilma.github.io/fish-shopping/play/?panel=weekly",
        "panel": "quests",
        "harborId": None,
        "source": "query",
    },
    {
        "uri": "https://wjeanvilma.github.io/fish-shopping/play/?go=pierledger",
        "panel": "dashboard",
        "harborId": None,
        "source": "query",
    },
    {
        "uri": "https://wjeanvilma.github.io/fish-shopping/play/#endgame",
        "panel": "quests",
        "harborId": None,
        "source": "hash",
    },
]


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def expand_routes() -> tuple[int, int]:
    routes = load(ROUTES)
    panels = routes.setdefault("panelAliases", {})
    hashes = routes.setdefault("hashAliases", {})
    for k, v in NEW_PANEL_ALIASES.items():
        panels.setdefault(k, v)
    for k, v in NEW_HASH_ALIASES.items():
        hashes.setdefault(k, v)
    routes["phase"] = 26
    routes["plan"] = "30_finish_5.0"
    routes["description"] = (
        "Finish 3.0 Phase 20 — Android App Links + web deep-link route catalog. "
        "Finish 5.0 Phase 26 expands weekly/endgame/ledger/friction aliases."
    )
    dump(ROUTES, routes)
    return len(panels), len(hashes)


def expand_deep_parity() -> int:
    parity = load(DEEP_PARITY)
    vectors = parity.setdefault("expect", {}).setdefault("uriVectors", [])
    have = {v.get("uri") for v in vectors}
    for v in NEW_URI_VECTORS:
        if v["uri"] not in have:
            vectors.append(v)
            have.add(v["uri"])
    dump(DEEP_PARITY, parity)
    return len(vectors)


def expand_e2e_ships() -> None:
    web = load(WEB_E2E)
    web["minIdCount"] = MIN_ID_COUNT
    web["scenarios"] = WEB_SCENARIOS
    web["finish5DeeplinkE2ePhase"] = 26
    web["description"] = (
        "Finish 3.0 Phase 22 — Web Playwright E2E smoke. "
        "Finish 5.0 Phase 26 soft-floors minIdCount≥32 and expands scenarios to ≥12."
    )
    dump(WEB_E2E, web)

    compose = load(COMPOSE)
    compose["minTagCount"] = MIN_TAG_COUNT
    compose["scenarios"] = COMPOSE_SCENARIOS
    compose["finish5DeeplinkE2ePhase"] = 26
    compose["description"] = (
        "Finish 3.0 Phase 21 — Compose UI integration tests. "
        "Finish 5.0 Phase 26 soft-floors minTagCount≥32 and expands scenarios to ≥14."
    )
    dump(COMPOSE, compose)


def write_ship(panel_count: int, hash_count: int, uri_count: int) -> None:
    dump(
        SHIP,
        {
            "phase": 26,
            "plan": "30_finish_5.0",
            "schema": "fish.ship.deeplink_e2e_5.v1",
            "description": (
                "Finish 5.0 Phase 26 — Deep links + E2E floors ≥12/≥14. "
                "Closes kickoff gap deeplinkE2e5Thin. Soft-floors Finish 4.0 deeplinke2e4:validate."
            ),
            "contentVersion": "4.0.0",
            "schemaVersion": 26,
            "deeplinkE2e5Marker": MARKER,
            "closesGap": "deeplinkE2e5Thin",
            "routesCatalog": "shared/deep-links/routes.json",
            "deepLinksShip": "shared/ship/deep-links.json",
            "webE2eShip": "shared/ship/web-e2e.json",
            "composeUiShip": "shared/ship/compose-ui-tests.json",
            "panelAliasFloor": PANEL_ALIAS_FLOOR,
            "hashAliasFloor": HASH_ALIAS_FLOOR,
            "minIdCount": MIN_ID_COUNT,
            "minTagCount": MIN_TAG_COUNT,
            "webScenarioFloor": WEB_SCENARIO_FLOOR,
            "composeScenarioFloor": COMPOSE_SCENARIO_FLOOR,
            "uriVectorFloor": URI_VECTOR_FLOOR,
            "parityFixture": "shared/fixtures/parity-deeplink-e2e-5.json",
            "validateScript": "npm run deeplinke2e5:validate",
            "softDeeplinkE2e4Validate": "npm run deeplinke2e4:validate",
            "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
            "authorTool": "shared/tools/author_deeplink_e2e_5.py",
            "softFloors": {
                "deeplinkE2e4PanelAliasFloor": 28,
                "deeplinkE2e4WebScenarioFloor": 5,
                "deeplinkE2e4ComposeScenarioFloor": 7,
                "webE2eHistoricalMinIdCount": 24,
                "composeHistoricalMinTagCount": 24,
                "note": (
                    "Finish 4.0 deeplinke2e4 / Finish 3.0 webe2e+composeui stay green; "
                    "Phase 26 enforces raised ≥12/≥14 scenario floors."
                ),
            },
            "checklist": [
                f"Panel aliases ≥{PANEL_ALIAS_FLOOR} + hash aliases ≥{HASH_ALIAS_FLOOR}",
                f"WEB_E2E_IDS ≥{MIN_ID_COUNT} + ComposeUiTags ≥{MIN_TAG_COUNT}",
                f"≥{WEB_SCENARIO_FLOOR} Playwright scenarios",
                f"≥{COMPOSE_SCENARIO_FLOOR} Compose scenarios",
                "Kickoff gaps.deeplinkE2e5Thin=false",
                "deeplinke2e4:validate soft-green",
                "deeplinke2e5:validate green in CI",
                "schema stays 26 / content 4.0.0",
            ],
            "preflightGates": [
                "shared/ship/deeplink-e2e-5.json",
                "shared/fixtures/parity-deeplink-e2e-5.json",
                "shared/deep-links/routes.json",
                "shared/ship/deep-links.json",
                "shared/ship/web-e2e.json",
                "shared/ship/compose-ui-tests.json",
                "web/src/e2e/webE2eIds.ts",
                "web/e2e/smoke.spec.ts",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt",
                "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudNavToolbar.kt",
                "app/src/test/java/com/willio/jeanvilma/fishshopping/ComposeUiIntegrationTest.kt",
                "web/src/ship/deeplinkE2e5.ts",
                "web/scripts/validate-deeplink-e2e-5.ts",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/DeeplinkE2e5.kt",
                "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/deeplink/DeepLinkRoutes.kt",
            ],
            "liveCounts": {
                "panelAliases": panel_count,
                "hashAliases": hash_count,
                "uriVectors": uri_count,
            },
        },
    )
    dump(
        PARITY,
        {
            "schema": "fish.fixture.parity_deeplink_e2e_5.v1",
            "description": "Finish 5.0 Phase 26: deep-link + E2E/Compose ≥12/≥14 expectations.",
            "deeplinkE2e5Marker": MARKER,
            "expect": {
                "closesGap": "deeplinkE2e5Thin",
                "deeplinkE2e5Thin": False,
                "schemaVersion": 26,
                "contentVersion": "4.0.0",
                "panelAliasFloor": PANEL_ALIAS_FLOOR,
                "hashAliasFloor": HASH_ALIAS_FLOOR,
                "minIdCount": MIN_ID_COUNT,
                "minTagCount": MIN_TAG_COUNT,
                "webScenarioFloor": WEB_SCENARIO_FLOOR,
                "composeScenarioFloor": COMPOSE_SCENARIO_FLOOR,
                "uriVectorFloor": URI_VECTOR_FLOOR,
                "requiredAliases": [
                    "weekly",
                    "endgame",
                    "pierledger",
                    "friction",
                    "licenses",
                    "warehouse",
                ],
                "requiredIds": [
                    "goals.weekly",
                    "goals.endgame",
                    "dash.ledger",
                    "warehouse.panel",
                    "friction.nudge",
                ],
                "requiredTags": [
                    "goals.weekly",
                    "goals.endgame",
                    "dash.ledger",
                    "warehouse.panel",
                    "friction.nudge",
                ],
                "smokeMustContain": [
                    "warehouse and upgrades nav open",
                    "deep link panel=weekly",
                    "deep link panel=pierledger",
                    "deep link hash endgame",
                    "photo and decor nav open",
                ],
                "robolectricMustContain": [
                    "hudNavWarehouseGoalsFire",
                    "hudNavStaffUpgradesFire",
                    "composeUiTagsFinish5Floor",
                ],
            },
        },
    )


def update_kickoff_dod_listing_pin() -> None:
    kick = load(KICKOFF)
    kick["gaps"]["deeplinkE2e5Thin"] = False
    dump(KICKOFF, kick)

    dod = load(DOD)
    quotas = dod.setdefault("quotas", {})
    quotas["playwrightE2eScenarios"] = WEB_SCENARIO_FLOOR
    quotas["composeE2eScenarios"] = COMPOSE_SCENARIO_FLOOR
    quotas["deeplinkPanelAliases"] = PANEL_ALIAS_FLOOR
    dod["notes"] = (
        "Finish 5.0 Phase 26 deeplink-e2e-5 complete (Playwright ≥12 / Compose ≥14 + Finish 5 aliases); "
        "Phases 1–25 remain green. Content stays 4.0.0 / schema 26. deeplinkE2e5Thin closed. "
        "Deploy/tag remain manual."
    )
    dod["deeplinkE2e5"] = {
        "phase": 26,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "deeplinkE2e5Marker": MARKER,
        "catalog": "shared/ship/deeplink-e2e-5.json",
        "parityFixture": "shared/fixtures/parity-deeplink-e2e-5.json",
        "validateScript": "npm run deeplinke2e5:validate",
        "checklist": [
            f"≥{WEB_SCENARIO_FLOOR} Playwright / ≥{COMPOSE_SCENARIO_FLOOR} Compose scenarios",
            f"≥{PANEL_ALIAS_FLOOR} panel aliases / ≥{HASH_ALIAS_FLOOR} hash aliases",
            "Kickoff deeplinkE2e5Thin closed",
            "deeplinke2e5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = load(LISTING)
    listing["deeplinkE2e5Phase"] = 26
    listing["deeplinkE2e5Catalog"] = "shared/ship/deeplink-e2e-5.json"
    dump(LISTING, listing)

    pin = load(PIN)
    pin["deeplinkE2e5"] = "shared/ship/deeplink-e2e-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-deeplink-e2e-5.json" not in fixtures:
        fixtures.append("parity-deeplink-e2e-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    panel_count, hash_count = expand_routes()
    uri_count = expand_deep_parity()
    expand_e2e_ships()
    if panel_count < PANEL_ALIAS_FLOOR:
        raise SystemExit(f"panel aliases {panel_count} < {PANEL_ALIAS_FLOOR}")
    if hash_count < HASH_ALIAS_FLOOR:
        raise SystemExit(f"hash aliases {hash_count} < {HASH_ALIAS_FLOOR}")
    if uri_count < URI_VECTOR_FLOOR:
        raise SystemExit(f"uri vectors {uri_count} < {URI_VECTOR_FLOOR}")
    write_ship(panel_count, hash_count, uri_count)
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 26 deeplink-e2e-5: panels={panel_count} hash={hash_count} "
        f"uri={uri_count} webScenarios={len(WEB_SCENARIOS)} compose={len(COMPOSE_SCENARIOS)}"
    )


if __name__ == "__main__":
    main()
