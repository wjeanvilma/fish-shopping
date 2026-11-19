#!/usr/bin/env python3
"""
Finish 5.0 Phase 23 — Web↔Android panel parity depth 5
(tutorial/retention/endgame panel pairs + catalog growth).

Usage:
  python3 shared/tools/author_ui_parity_5.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
SHIP = ROOT / "ship" / "ui-parity-5.json"
PARITY = ROOT / "fixtures" / "parity-ui-parity-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
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

MARKER = "authored-finish-5.0-phase-23"

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
]

NEW_FEATURE_FLOORS = [
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

# Carry prior Finish 4.0 floors forward so soft-floor validates still see them locked.
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
]

UI_I18N = {
    "en": {
        "a11y.weeklyGoalsSection": "Weekly goals",
        "a11y.endgameSection": "Endgame board",
        "goals.weeklyEmpty": "Weekly board rolls with your wall clock.",
        "endgame.locked": "Endgame board locked",
        "endgame.marks": "Marks",
        "endgame.crests": "Crests",
    },
    "es": {
        "a11y.weeklyGoalsSection": "Objetivos semanales",
        "a11y.endgameSection": "Tablero de endgame",
        "goals.weeklyEmpty": "El tablero semanal se renueva con el reloj.",
        "endgame.locked": "Tablero de endgame bloqueado",
        "endgame.marks": "Marcas",
        "endgame.crests": "Crestas",
    },
    "pt": {
        "a11y.weeklyGoalsSection": "Objetivos semanais",
        "a11y.endgameSection": "Painel de endgame",
        "goals.weeklyEmpty": "O quadro semanal rola com o relógio.",
        "endgame.locked": "Painel de endgame bloqueado",
        "endgame.marks": "Marcas",
        "endgame.crests": "Brasões",
    },
    "fr": {
        "a11y.weeklyGoalsSection": "Objectifs hebdomadaires",
        "a11y.endgameSection": "Plateau de fin de partie",
        "goals.weeklyEmpty": "Le plateau hebdo suit votre horloge.",
        "endgame.locked": "Plateau de fin de partie verrouillé",
        "endgame.marks": "Marques",
        "endgame.crests": "Écussons",
    },
    "ht": {
        "a11y.weeklyGoalsSection": "Objektif semèn",
        "a11y.endgameSection": "Tablo endgame",
        "goals.weeklyEmpty": "Tablo semènlan woule ak revèy ou.",
        "endgame.locked": "Tablo endgame fèmen",
        "endgame.marks": "Mak",
        "endgame.crests": "Krèt",
    },
    "it": {
        "a11y.weeklyGoalsSection": "Obiettivi settimanali",
        "a11y.endgameSection": "Tabellone endgame",
        "goals.weeklyEmpty": "Il tabellone settimanale segue l'orologio.",
        "endgame.locked": "Tabellone endgame bloccato",
        "endgame.marks": "Marchi",
        "endgame.crests": "Cresti",
    },
    "ca": {
        "a11y.weeklyGoalsSection": "Objectius setmanals",
        "a11y.endgameSection": "Tauler d'endgame",
        "goals.weeklyEmpty": "El tauler setmanal segueix el rellotge.",
        "endgame.locked": "Tauler d'endgame bloquejat",
        "endgame.marks": "Marques",
        "endgame.crests": "Escuts",
    },
    "ru": {
        "a11y.weeklyGoalsSection": "Недельные цели",
        "a11y.endgameSection": "Доска эндгейма",
        "goals.weeklyEmpty": "Недельная доска обновляется по часам.",
        "endgame.locked": "Доска эндгейма закрыта",
        "endgame.marks": "Метки",
        "endgame.crests": "Гребни",
    },
}


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def write_ship() -> None:
    feature_floors = PRIOR_FEATURE_FLOORS + NEW_FEATURE_FLOORS
    catalog = {
        "phase": 23,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.ui_parity_5.v1",
        "description": (
            "Finish 5.0 Phase 23 — Web↔Android panel parity depth 5. "
            "Adds weekly retention + endgame board surfaces, tutorial friction parity, "
            "ledger/conflict severity floors, and grows paired HUD panel catalog. "
            "Schema stays 26 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "uiParity5Marker": MARKER,
        "extendsUiParity": "shared/ship/ui-parity-depth.json",
        "panelPairMin": 14,
        "featureFloorMin": 18,
        "panelPairs": PANEL_PAIRS,
        "newPanelPairIds": ["hud_chrome", "hud_shell"],
        "newFeatureFloorIds": [f["id"] for f in NEW_FEATURE_FLOORS],
        "featureFloors": feature_floors,
        "goalPresetMin": 12,
        "loanProductMin": 5,
        "dailyObjectiveMin": 14,
        "parityFixture": "shared/fixtures/parity-ui-parity-5.json",
        "authorTool": "shared/tools/author_ui_parity_5.py",
        "validateScript": "npm run uiparity5:validate",
        "softUiParityValidate": "npm run uiparity:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "≥14 paired web↔Android panel paths",
            "≥18 feature marker floors including weekly/endgame/tutorial/ledger/conflict",
            "Weekly goals claim UX web↔Android",
            "Endgame board surface web↔Android",
            "Tutorial friction nudge parity host↔GameScreen",
            "kickoff uiParity5Incomplete=false",
            "uiparity5:validate green in CI",
            "uiparity:validate soft-green",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/ui-parity-5.json",
            "shared/fixtures/parity-ui-parity-5.json",
            "shared/ship/ui-parity-depth.json",
            "shared/tools/author_ui_parity_5.py",
            "web/src/ui/QuestLogPanel.tsx",
            "web/src/ui/App.tsx",
            "web/src/ui/HudChrome.tsx",
            "web/src/ui/HudShell.tsx",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/QuestLogPanel.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/GameScreen.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudChrome.kt",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/HudNavToolbar.kt",
            "web/src/ship/uiParity5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/UiParity5.kt",
            "web/scripts/validate-ui-parity-5.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_ui_parity_5.v1",
        "uiParity5Marker": MARKER,
        "phase": 23,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 23: weekly/endgame/tutorial panel parity + catalog growth "
            "to ≥14 pairs / ≥18 feature floors."
        ),
        "sampleNewPanelPair": "hud_chrome",
        "sampleNewFeatureFloor": "weekly_goals_claim",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "panelPairMin": 14,
            "featureFloorMin": 18,
            "goalPresetMin": 12,
            "loanProductMin": 5,
            "dailyObjectiveMin": 14,
            "uiParity5Incomplete": False,
            "gates": [
                "panel_pairs",
                "feature_markers",
                "weekly_endgame_ux",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["uiParity5Incomplete"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 5.0 Phase 23 ui-parity-5 complete (weekly/endgame/tutorial panel parity); "
        "Phases 1–22 remain green. Content stays 4.0.0 / schema 26. uiParity5Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["uiParity5"] = {
        "phase": 23,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "uiParity5Marker": MARKER,
        "catalog": "shared/ship/ui-parity-5.json",
        "parityFixture": "shared/fixtures/parity-ui-parity-5.json",
        "validateScript": "npm run uiparity5:validate",
        "checklist": [
            "≥14 panel pairs / ≥18 feature floors",
            "weekly + endgame Goals surfaces",
            "tutorial friction host parity",
            "kickoff uiParity5Incomplete=false",
            "uiparity5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["uiParity5Phase"] = 23
    listing["uiParity5Catalog"] = "shared/ship/ui-parity-5.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["uiParity5"] = "shared/ship/ui-parity-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-ui-parity-5.json" not in fixtures:
        fixtures.append("parity-ui-parity-5.json")
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
        f"OK Phase 23 ui-parity-5: pairs={len(PANEL_PAIRS)} "
        f"floors={len(PRIOR_FEATURE_FLOORS) + len(NEW_FEATURE_FLOORS)} "
        f"newFloors={len(NEW_FEATURE_FLOORS)}"
    )


if __name__ == "__main__":
    main()
