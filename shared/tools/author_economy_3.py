#!/usr/bin/env python3
"""
Finish 5.0 Phase 21 — economy/bank/dashboard depth 3
(loans/goals deepen + ledger analytics UX).

Usage:
  python3 shared/tools/author_economy_3.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "economy-bank-3.json"
PARITY = ROOT / "fixtures" / "parity-economy-bank-3.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
I18N_CONTENT = {
    "en": ROOT / "i18n" / "content-strings.en.json",
    "es": ROOT / "i18n" / "content-strings.es.json",
    "pt": ROOT / "i18n" / "content-strings.pt.json",
    "fr": ROOT / "i18n" / "content-strings.fr.json",
    "ht": ROOT / "i18n" / "content-strings.ht.json",
    "it": ROOT / "i18n" / "content-strings.it.json",
    "ca": ROOT / "i18n" / "content-strings.ca.json",
    "ru": ROOT / "i18n" / "content-strings.ru.json",
}
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

MARKER = "authored-finish-5.0-phase-21"

GOAL_PRESETS = [150, 300, 600, 1200, 2400, 4800, 9600, 15000, 22000, 32000, 45000, 60000]

NEW_LOANS = [
    {
        "id": "loan.tideglass",
        "name": "Tideglass note",
        "description": "Mid-harbor float after clearing your first ledger loan.",
        "principal": 900,
        "repayPermille": 1340,
        "termTicks": 11000,
        "requires": ["quest.loan_cleared"],
    },
    {
        "id": "loan.aurora",
        "name": "Aurora credit",
        "description": "Late-game pier credit for twelve-harbor scale.",
        "principal": 1600,
        "repayPermille": 1380,
        "termTicks": 14000,
        "requires": ["quest.harbor_dozen"],
    },
]

DASHBOARD_FIELDS = [
    "loanOwed",
    "loansTaken",
    "loanRepaid",
    "coinGoal",
    "coinGoalProgressPermille",
    "ledgerNetCashflow",
    "contractRevenueSharePermille",
    "ledgerLines",
]

CONTENT_I18N = {
    "en": {
        "loan.tideglass": "Tideglass note",
        "loan.aurora": "Aurora credit",
    },
    "es": {
        "loan.tideglass": "Pagaré Tideglass",
        "loan.aurora": "Crédito Aurora",
    },
    "pt": {
        "loan.tideglass": "Nota Tideglass",
        "loan.aurora": "Crédito Aurora",
    },
    "fr": {
        "loan.tideglass": "Billet Tideglass",
        "loan.aurora": "Crédit Aurora",
    },
    "ht": {
        "loan.tideglass": "Nòt Tideglass",
        "loan.aurora": "Kredi Aurora",
    },
    "it": {
        "loan.tideglass": "Nota Tideglass",
        "loan.aurora": "Credito Aurora",
    },
    "ca": {
        "loan.tideglass": "Pagarè Tideglass",
        "loan.aurora": "Crèdit Aurora",
    },
    "ru": {
        "loan.tideglass": "Вексель Tideglass",
        "loan.aurora": "Кредит Aurora",
    },
}

UI_I18N = {
    "en": {
        "dashboard.pierLedger": "Pier ledger",
        "dashboard.loanBook": "Loan book",
        "dashboard.coinGoalProgress": "Coin goal",
        "dashboard.ledgerCashflow": "Ledger cashflow",
        "dashboard.contractShare": "Contract share",
    },
    "es": {
        "dashboard.pierLedger": "Libro del muelle",
        "dashboard.loanBook": "Libro de préstamos",
        "dashboard.coinGoalProgress": "Meta de monedas",
        "dashboard.ledgerCashflow": "Flujo del libro",
        "dashboard.contractShare": "Cuota de contratos",
    },
    "pt": {
        "dashboard.pierLedger": "Livro do cais",
        "dashboard.loanBook": "Livro de empréstimos",
        "dashboard.coinGoalProgress": "Meta de moedas",
        "dashboard.ledgerCashflow": "Fluxo do livro",
        "dashboard.contractShare": "Parcela de contratos",
    },
    "fr": {
        "dashboard.pierLedger": "Grand livre du quai",
        "dashboard.loanBook": "Carnet de prêts",
        "dashboard.coinGoalProgress": "Objectif de pièces",
        "dashboard.ledgerCashflow": "Flux du grand livre",
        "dashboard.contractShare": "Part des contrats",
    },
    "ht": {
        "dashboard.pierLedger": "Liv waf",
        "dashboard.loanBook": "Liv prè",
        "dashboard.coinGoalProgress": "Objektif pyès",
        "dashboard.ledgerCashflow": "Kachflow liv",
        "dashboard.contractShare": "Pati kontra",
    },
    "it": {
        "dashboard.pierLedger": "Libro del molo",
        "dashboard.loanBook": "Libro prestiti",
        "dashboard.coinGoalProgress": "Obiettivo monete",
        "dashboard.ledgerCashflow": "Flusso del libro",
        "dashboard.contractShare": "Quota contratti",
    },
    "ca": {
        "dashboard.pierLedger": "Llibre del moll",
        "dashboard.loanBook": "Llibre de préstecs",
        "dashboard.coinGoalProgress": "Objectiu de monedes",
        "dashboard.ledgerCashflow": "Flux del llibre",
        "dashboard.contractShare": "Quota de contractes",
    },
    "ru": {
        "dashboard.pierLedger": "Книга пирса",
        "dashboard.loanBook": "Книга займов",
        "dashboard.coinGoalProgress": "Цель монет",
        "dashboard.ledgerCashflow": "Поток книги",
        "dashboard.contractShare": "Доля контрактов",
    },
}


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {item[key]: i for i, item in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def write_ship(loan_ids: list[str]) -> None:
    catalog = {
        "phase": 21,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.economy_bank_3.v1",
        "description": (
            "Finish 5.0 Phase 21 — economy/bank/dashboard depth 3. "
            "Loans → ≥5, coin goals → ≥12, pier ledger analytics + UX on web/Android dashboards. "
            "Schema stays 26 / content 4.0.0 (stats + view fields only)."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "economy3Marker": MARKER,
        "extendsEconomy2": "shared/ship/economy-bank-2.json",
        "loanProductMin": 5,
        "goalPresetMin": 12,
        "loanProductIds": loan_ids,
        "newLoanProductIds": [p["id"] for p in NEW_LOANS],
        "goalPresets": GOAL_PRESETS,
        "dashboardFields": DASHBOARD_FIELDS,
        "parityFixture": "shared/fixtures/parity-economy-bank-3.json",
        "authorTool": "shared/tools/author_economy_3.py",
        "validateScript": "npm run economy3:validate",
        "softEconomy2Validate": "npm run economy2:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "≥5 loan products including tideglass + aurora",
            "≥12 coin goal presets",
            "Dashboard ledger analytics fields (loan book + cashflow + ledger lines)",
            "Web↔Android pier ledger UX",
            "kickoff economy3Incomplete=false",
            "economy3:validate green in CI",
            "economy2:validate soft-green",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/economy-bank-3.json",
            "shared/fixtures/parity-economy-bank-3.json",
            "shared/ship/economy-bank-2.json",
            "shared/content/content-pack.json",
            "shared/tools/author_economy_3.py",
            "web/src/engine/businessDashboard.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/economy/Bank.kt",
            "web/src/ui/BusinessDashboardPanel.tsx",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
            "web/src/ship/economy3.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Economy3.kt",
            "web/scripts/validate-economy-3.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_economy_bank_3.v1",
        "economy3Marker": MARKER,
        "phase": 21,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 21: tideglass/aurora loans + 12 goal presets + "
            "dashboard ledgerLines / ledgerNetCashflow surfaces."
        ),
        "sampleLoanId": "loan.tideglass",
        "sampleGoalPreset": 22000,
        "sampleDashboardField": "ledgerLines",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "loanProductMin": 5,
            "goalPresetMin": 12,
            "dashboardFieldCount": 8,
            "economy3Incomplete": False,
            "gates": [
                "loan_products_5",
                "goal_presets_12",
                "ledger_fields",
                "ledger_ux",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["economy3Incomplete"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 5.0 Phase 21 economy-bank-3 complete (loans/goals/ledger analytics); "
        "Phases 1–20 remain green. Content stays 4.0.0 / schema 26. economy3Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["economy3"] = {
        "phase": 21,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "economy3Marker": MARKER,
        "catalog": "shared/ship/economy-bank-3.json",
        "parityFixture": "shared/fixtures/parity-economy-bank-3.json",
        "validateScript": "npm run economy3:validate",
        "checklist": [
            "loans ≥5 / goals ≥12",
            "dashboard ledger analytics",
            "web↔Android ledger UX",
            "kickoff economy3Incomplete=false",
            "economy3:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["economy3Phase"] = 21
    listing["economy3Catalog"] = "shared/ship/economy-bank-3.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["economy3"] = "shared/ship/economy-bank-3.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-economy-bank-3.json" not in fixtures:
        fixtures.append("parity-economy-bank-3.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    data = json.loads(PACK.read_text(encoding="utf-8"))
    bank = data.setdefault("bank", {})
    products = bank.setdefault("loanProducts", [])
    upsert_list(products, NEW_LOANS)
    bank["goalPresets"] = GOAL_PRESETS
    dump(PACK, data)

    for locale, path in I18N_CONTENT.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in CONTENT_I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    for locale, path in I18N_UI.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in UI_I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    loan_ids = [p["id"] for p in products]
    write_ship(loan_ids)
    update_kickoff_dod_listing_pin()
    print(
        f"OK Phase 21 economy-bank-3: loans={len(loan_ids)} goals={len(GOAL_PRESETS)} "
        f"dashboardFields={len(DASHBOARD_FIELDS)}"
    )


if __name__ == "__main__":
    main()
