#!/usr/bin/env python3
"""
Finish 6.0 Phase 20 — Web↔Android panel parity depth 6 (nest deepen).

Usage:
  python3 shared/tools/author_ui_parity_6.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "ui-parity-6.json"
PARITY = ROOT / "fixtures" / "parity-ui-parity-6.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
I18N_UI = {
    "en": ROOT / "i18n" / "ui-strings.en.json",
    "es": ROOT / "i18n" / "ui-strings.es.json",
    "pt": ROOT / "i18n" / "ui-strings.pt.json",
    "fr": ROOT / "i18n" / "ui-strings.fr.json",
    "ht": ROOT / "i18n" / "ui-strings.ht.json",
    "it": ROOT / "i18n" / "ui-strings.it.json",
    "ca": ROOT / "i18n" / "ui-strings.ca.json",
    "ru": ROOT / "i18n" / "ui-strings.ru.json",
}

MARKER = "authored-finish-6.0-phase-20"
OPEN_GAP_MIN = 9

PANEL_PAIRS = [
    {"id": "goals", "web": "web/src/ui/QuestLogPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt"},
    {"id": "dashboard", "web": "web/src/ui/BusinessDashboardPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt"},
    {"id": "staff", "web": "web/src/ui/StaffPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StaffPanel.kt"},
    {"id": "contracts", "web": "web/src/ui/ContractsPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/ContractsPanel.kt"},
    {"id": "offline", "web": "web/src/ui/OfflineSummaryPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt"},
    {"id": "settings", "web": "web/src/ui/PauseSettingsPanels.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/PauseSettingsPanels.kt"},
    {"id": "map", "web": "web/src/ui/MapWarehousePanels.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/MapWarehousePanels.kt"},
    {"id": "species", "web": "web/src/ui/SpeciesBookPanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/SpeciesBookPanel.kt"},
    {"id": "upgrades", "web": "web/src/ui/UpgradePanel.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/UpgradePanel.kt"},
    {"id": "title", "web": "web/src/ui/TitlePanels.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt"},
    {"id": "stations", "web": "web/src/ui/StationBagPanels.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StationBagPanels.kt"},
    {"id": "host", "web": "web/src/ui/App.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt"},
    {"id": "hud_chrome", "web": "web/src/ui/HudChrome.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudChrome.kt"},
    {"id": "hud_shell", "web": "web/src/ui/HudShell.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudNavToolbar.kt"},
    {"id": "hud_primitives", "web": "web/src/ui/HudPrimitives.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudPrimitives.kt"},
    {"id": "joystick", "web": "web/src/ui/Joystick.tsx", "android": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/Joystick.kt"},
]

NEW_FEATURE_FLOORS = [
    {
        "id": "nest_treasury",
        "webFile": "web/src/ui/BusinessDashboardPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
        "webMarkers": ["nestTreasuryLines", "dashboard.nestTreasury", "endgameSigilsEarned", "loanRepaid"],
        "androidMarkers": ["nestTreasuryLines", "dashboard.nestTreasury", "endgameSigilsEarned", "loanRepaid"],
    },
    {
        "id": "nest_conflict_hint",
        "webFile": "web/src/ui/TitlePanels.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt",
        "webMarkers": ["preferredSide", "conflictScore", "nestConflictHint", "cloud.nestConflictHint"],
        "androidMarkers": ["preferredSide", "conflictScore", "nestConflictHint", "cloud.nestConflictHint"],
    },
    {
        "id": "staff_branch_schedule",
        "webFile": "web/src/ui/StaffPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StaffPanel.kt",
        "webMarkers": ["onTrainBranch", "onSetSchedule", "branches", "schedules"],
        "androidMarkers": ["onTrainBranch", "onSetSchedule", "branches", "schedules"],
    },
    {
        "id": "nest_loan_products",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["loan.nest_ember", "loan.saffron_crest", "bank.nestLoanBadge"],
        "androidMarkers": ["loan.nest_ember", "loan.saffron_crest", "bank.nestLoanBadge"],
    },
    {
        "id": "offline_nest_journal",
        "webFile": "web/src/ui/OfflineSummaryPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt",
        "webMarkers": ["loanRepaid", "contractRevenue", "rivalSalesStolen", "endgameSigilsEarned", "offline.nestJournal"],
        "androidMarkers": ["loanRepaid", "contractRevenue", "rivalSalesStolen", "endgameSigilsEarned", "offline.nestJournal"],
    },
]

# Carry Finish 5.0 floors forward.
PRIOR_FEATURE_FLOORS = [
    {
        "id": "bank_loan_products",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["loanProducts", "lockedReason", "formatRushSeconds(product.termTicks)", "onTakeLoan"],
        "androidMarkers": ["loanProducts", "lockedReason", "formatRushSeconds(product.termTicks)", "onTakeLoan"],
    },
    {
        "id": "bank_goal_presets",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["goalPresets", "onSetCoinGoal"],
        "androidMarkers": ["goalPresets", "onSetCoinGoal"],
    },
    {
        "id": "daily_goals_claim",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["onClaimDailyGoal", "aria-valuenow"],
        "androidMarkers": ["onClaimDailyGoal", "LinearProgressIndicator"],
    },
    {
        "id": "cosmetics_equip",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["onEquipCosmetic", "onPreviewCosmetic", "onUnequipCosmetic"],
        "androidMarkers": ["onEquipCosmetic", "onPreviewCosmetic", "onUnequipCosmetic"],
    },
    {
        "id": "dashboard_cashflow",
        "webFile": "web/src/ui/BusinessDashboardPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
        "webMarkers": [
            "loanInterestAccrued",
            "loanCollected",
            "maintenancePaid",
            "netOperatingProfit",
            "activeScarcityTipPermille",
            "reputationLabel",
        ],
        "androidMarkers": [
            "loanInterestAccrued",
            "loanCollected",
            "maintenancePaid",
            "netOperatingProfit",
            "activeScarcityTipPermille",
            "reputationLabel",
        ],
    },
    {
        "id": "dashboard_journal",
        "webFile": "web/src/ui/BusinessDashboardPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
        "webMarkers": ["journalLines", "offlineJournalLines"],
        "androidMarkers": ["journalLines", "offlineJournalLines"],
    },
    {
        "id": "staff_train_reason",
        "webFile": "web/src/ui/StaffPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/StaffPanel.kt",
        "webMarkers": ["trainReason"],
        "androidMarkers": ["trainReason"],
    },
    {
        "id": "cloud_conflict",
        "webFile": "web/src/ui/TitlePanels.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt",
        "webMarkers": ["diffHints", "reasonCode"],
        "androidMarkers": ["diffHints", "reasonCode"],
    },
    {
        "id": "offline_journal",
        "webFile": "web/src/ui/OfflineSummaryPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt",
        "webMarkers": ["journalLines"],
        "androidMarkers": ["journalLines"],
    },
    {
        "id": "map_specialty",
        "webFile": "web/src/ui/MapWarehousePanels.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/MapWarehousePanels.kt",
        "webMarkers": ["specializationName"],
        "androidMarkers": ["specializationName"],
    },
    {
        "id": "contracts_reputation",
        "webFile": "web/src/ui/ContractsPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/ContractsPanel.kt",
        "webMarkers": ["requiresReputationBand"],
        "androidMarkers": ["requiresReputationBand"],
    },
    {
        "id": "hud_rival",
        "webFile": "web/src/ui/App.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
        "webMarkers": ["rivalPressureActive", "activeRivalIds"],
        "androidMarkers": ["rivalPressureActive", "activeRivalIds"],
    },
    {
        "id": "licenses",
        "webFile": "web/src/ui/PauseSettingsPanels.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/PauseSettingsPanels.kt",
        "webMarkers": ["licensesCatalog", "showLicenses"],
        "androidMarkers": ["LicensesPanel", "showLicenses"],
    },
    {
        "id": "weekly_goals_claim",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["weeklyGoals", "onClaimWeeklyGoal", "a11y.weeklyGoalsSection"],
        "androidMarkers": ["weeklyGoals", "onClaimWeeklyGoal", "a11y.weeklyGoalsSection"],
    },
    {
        "id": "endgame_board",
        "webFile": "web/src/ui/QuestLogPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
        "webMarkers": ["endgameUnlocked", "endgameTiers", "endgameChallenges", "a11y.endgameSection"],
        "androidMarkers": ["endgameUnlocked", "endgameTiers", "endgameChallenges", "a11y.endgameSection"],
    },
    {
        "id": "tutorial_friction_nudge",
        "webFile": "web/src/ui/App.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
        "webMarkers": ["frictionNudge", "tutorialDwellMs", "frictionNudgeText"],
        "androidMarkers": ["frictionNudge", "tutorialDwellMs", "TutorialFriction.nudgeText"],
    },
    {
        "id": "dashboard_ledger",
        "webFile": "web/src/ui/BusinessDashboardPanel.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
        "webMarkers": ["ledgerLines", "dashboard.pierLedger", "dashboard.loanBook", "ledgerNetCashflow"],
        "androidMarkers": ["ledgerLines", "dashboard.pierLedger", "dashboard.loanBook", "ledgerNetCashflow"],
    },
    {
        "id": "cloud_conflict_severity",
        "webFile": "web/src/ui/TitlePanels.tsx",
        "androidFile": "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/TitlePanels.kt",
        "webMarkers": ["severity", "ageSkewMs", "syncDiagnostics", "cloud.severity"],
        "androidMarkers": ["severity", "ageSkewMs", "syncDiagnostics", "cloud.severity"],
    },
]

UI_I18N = {
    "en": {
        "bank.nestLoanBadge": "Nest loan",
        "offline.nestJournal": "Nest journal deltas recorded while away",
        "a11y.offlineNestJournal": "Offline nest journal",
        "a11y.hudPrimitives": "HUD primitives",
        "a11y.joystick": "Movement joystick",
    },
    "es": {
        "bank.nestLoanBadge": "Préstamo del nido",
        "offline.nestJournal": "Deltas del diario del nido registrados en ausencia",
        "a11y.offlineNestJournal": "Diario offline del nido",
        "a11y.hudPrimitives": "Primitivas del HUD",
        "a11y.joystick": "Joystick de movimiento",
    },
    "pt": {
        "bank.nestLoanBadge": "Empréstimo do ninho",
        "offline.nestJournal": "Deltas do diário do ninho registados na ausência",
        "a11y.offlineNestJournal": "Diário offline do ninho",
        "a11y.hudPrimitives": "Primitivas do HUD",
        "a11y.joystick": "Joystick de movimento",
    },
    "fr": {
        "bank.nestLoanBadge": "Prêt du nid",
        "offline.nestJournal": "Deltas du journal du nid enregistrés pendant l'absence",
        "a11y.offlineNestJournal": "Journal hors ligne du nid",
        "a11y.hudPrimitives": "Primitives HUD",
        "a11y.joystick": "Joystick de déplacement",
    },
    "ht": {
        "bank.nestLoanBadge": "Prè nich",
        "offline.nestJournal": "Delta jounal nich anrejistre pandan ou te ale",
        "a11y.offlineNestJournal": "Jounal offline nich",
        "a11y.hudPrimitives": "Primitiv HUD",
        "a11y.joystick": "Joystick mouvman",
    },
    "it": {
        "bank.nestLoanBadge": "Prestito del nido",
        "offline.nestJournal": "Delta del diario del nido registrati durante l'assenza",
        "a11y.offlineNestJournal": "Diario offline del nido",
        "a11y.hudPrimitives": "Primitive HUD",
        "a11y.joystick": "Joystick di movimento",
    },
    "ca": {
        "bank.nestLoanBadge": "Préstec del niu",
        "offline.nestJournal": "Deltres del diari del niu enregistrats durant l'absència",
        "a11y.offlineNestJournal": "Diari offline del niu",
        "a11y.hudPrimitives": "Primitives HUD",
        "a11y.joystick": "Joystick de moviment",
    },
    "ru": {
        "bank.nestLoanBadge": "Заём гнезда",
        "offline.nestJournal": "Дельты журнала гнезда записаны за время отсутствия",
        "a11y.offlineNestJournal": "Офлайн-журнал гнезда",
        "a11y.hudPrimitives": "Примитивы HUD",
        "a11y.joystick": "Джойстик движения",
    },
}


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    feature_floors = PRIOR_FEATURE_FLOORS + NEW_FEATURE_FLOORS
    catalog = {
        "phase": 20,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.ui_parity_6.v1",
        "description": (
            "Finish 6.0 Phase 20 — Web↔Android panel parity depth 6. "
            "Adds nest treasury/conflict/loan/offline journal floors + hud_primitives/joystick pairs. "
            "Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "uiParity6Marker": MARKER,
        "extendsUiParity": "shared/ship/ui-parity-depth.json",
        "extendsUiParity5": "shared/ship/ui-parity-5.json",
        "panelPairMin": 16,
        "featureFloorMin": 23,
        "panelPairs": PANEL_PAIRS,
        "newPanelPairIds": ["hud_primitives", "joystick"],
        "newFeatureFloorIds": [f["id"] for f in NEW_FEATURE_FLOORS],
        "featureFloors": feature_floors,
        "goalPresetMin": 16,
        "loanProductMin": 7,
        "dailyObjectiveMin": 18,
        "parityFixture": "shared/fixtures/parity-ui-parity-6.json",
        "authorTool": "shared/tools/author_ui_parity_6.py",
        "validateScript": "npm run uiparity6:validate",
        "softUiParity5Validate": "npm run uiparity5:validate",
        "softUiParityValidate": "npm run uiparity:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "≥16 paired web↔Android panel paths including hud_primitives + joystick",
            "≥23 feature marker floors including nest treasury/conflict/loans/offline journal",
            "Nest loan badge UX web↔Android",
            "Offline nest journal surface web↔Android",
            "kickoff uiParity6Incomplete=false",
            "uiparity6:validate green in CI",
            "uiparity5:validate soft-green",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 10→9",
        ],
        "preflightGates": [
            "shared/ship/ui-parity-6.json",
            "shared/fixtures/parity-ui-parity-6.json",
            "shared/ship/ui-parity-5.json",
            "shared/ship/ui-parity-depth.json",
            "shared/tools/author_ui_parity_6.py",
            "web/src/ui/QuestLogPanel.tsx",
            "web/src/ui/App.tsx",
            "web/src/ui/HudPrimitives.tsx",
            "web/src/ui/Joystick.tsx",
            "web/src/ui/OfflineSummaryPanel.tsx",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudPrimitives.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/Joystick.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/OfflineSummaryPanel.kt",
            "web/src/ship/uiParity6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/UiParity6.kt",
            "web/scripts/validate-ui-parity-6.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_ui_parity_6.v1",
        "uiParity6Marker": MARKER,
        "phase": 20,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 20: nest treasury/conflict/loan/offline panel parity + "
            "catalog growth to ≥16 pairs / ≥23 feature floors."
        ),
        "sampleNewPanelPair": "hud_primitives",
        "sampleNewFeatureFloor": "nest_treasury",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "panelPairMin": 16,
            "featureFloorMin": 23,
            "goalPresetMin": 16,
            "loanProductMin": 7,
            "dailyObjectiveMin": 18,
            "uiParity6Incomplete": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "panel_pairs",
                "feature_markers",
                "nest_ux",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["uiParity6Incomplete"] = False
    dump(KICKOFF6, kick)

    p6 = json.loads(PARITY6.read_text(encoding="utf-8"))
    p6.setdefault("expect", {})["openGapFlagMin"] = OPEN_GAP_MIN
    dump(PARITY6, p6)

    for path in (ROOT / "fixtures").glob("parity-*.json"):
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 6.0 Phase 20 ui-parity-6 complete (nest treasury/conflict/loan/offline panel parity); "
        "Phases 1–19 remain green. Content stays 5.0.0 / schema 27. uiParity6Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["uiParity6"] = {
        "phase": 20,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "uiParity6Marker": MARKER,
        "catalog": "shared/ship/ui-parity-6.json",
        "parityFixture": "shared/fixtures/parity-ui-parity-6.json",
        "validateScript": "npm run uiparity6:validate",
        "checklist": [
            "≥16 panel pairs / ≥23 feature floors",
            "nest treasury + conflict + loans + offline journal",
            "kickoff uiParity6Incomplete=false",
            "uiparity6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["uiParity6Phase"] = 20
    listing["uiParity6Catalog"] = "shared/ship/ui-parity-6.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["uiParity6"] = "shared/ship/ui-parity-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-ui-parity-6.json" not in fixtures:
        fixtures.append("parity-ui-parity-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    for locale, path in I18N_UI.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in UI_I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    write_ship()
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 20 ui-parity-6: pairs={len(PANEL_PAIRS)} "
        f"floors={len(PRIOR_FEATURE_FLOORS) + len(NEW_FEATURE_FLOORS)} "
        f"newFloors={len(NEW_FEATURE_FLOORS)} openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
