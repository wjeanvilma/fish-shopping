#!/usr/bin/env python3
"""
Finish 6.0 Phase 17 — economy/bank/dashboard depth 4
(nest loans/goals deepen + nest treasury analytics UX).

Usage:
  python3 shared/tools/author_economy_4.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "economy-bank-4.json"
PARITY = ROOT / "fixtures" / "parity-economy-bank-4.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
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

MARKER = "authored-finish-6.0-phase-17"
OPEN_GAP_MIN = 12

GOAL_PRESETS = [
    150,
    300,
    600,
    1200,
    2400,
    4800,
    9600,
    15000,
    22000,
    32000,
    45000,
    60000,
    80000,
    110000,
    150000,
    200000,
]

NEW_LOANS = [
    {
        "id": "loan.nest_ember",
        "name": "Nest ember note",
        "description": "Roast-nest float after the nest admiral clears fourteen harbors.",
        "principal": 2200,
        "repayPermille": 1400,
        "termTicks": 16000,
        "requires": ["quest.nest_admiral"],
    },
    {
        "id": "loan.saffron_crest",
        "name": "Saffron crest credit",
        "description": "Late nest credit after the saffron curator seals roast/ferment lines.",
        "principal": 3200,
        "repayPermille": 1420,
        "termTicks": 18000,
        "requires": ["quest.saffron_curator"],
    },
]

# Wave-4 nest treasury analytics (in addition to economy-3 ledger fields).
DASHBOARD_FIELDS = [
    "wageBurdenPermille",
    "loanCoveragePermille",
    "rivalLossCoins",
    "endgameSigilsEarned",
    "coinGoalsReached",
    "nestTreasuryLines",
]

CONTENT_I18N = {
    "en": {
        "loan.nest_ember": "Nest ember note",
        "loan.saffron_crest": "Saffron crest credit",
    },
    "es": {
        "loan.nest_ember": "Pagaré brasa del nido",
        "loan.saffron_crest": "Crédito cresta azafrán",
    },
    "pt": {
        "loan.nest_ember": "Nota brasa do ninho",
        "loan.saffron_crest": "Crédito crista açafrão",
    },
    "fr": {
        "loan.nest_ember": "Billet braise du nid",
        "loan.saffron_crest": "Crédit crête safran",
    },
    "ht": {
        "loan.nest_ember": "Nòt braise nich",
        "loan.saffron_crest": "Kredi krèt safran",
    },
    "it": {
        "loan.nest_ember": "Nota brace del nido",
        "loan.saffron_crest": "Credito cresta zafferano",
    },
    "ca": {
        "loan.nest_ember": "Pagarè brasa del niu",
        "loan.saffron_crest": "Crèdit cresta safrà",
    },
    "ru": {
        "loan.nest_ember": "Вексель углей гнезда",
        "loan.saffron_crest": "Кредит шафранового гребня",
    },
}

UI_I18N = {
    "en": {
        "dashboard.nestTreasury": "Nest treasury",
        "dashboard.wageBurden": "Wage burden",
        "dashboard.loanCoverage": "Loan coverage",
        "dashboard.rivalLoss": "Rival loss",
        "dashboard.sigilsEarned": "Sigils earned",
        "dashboard.coinGoalsHit": "Coin goals hit",
    },
    "es": {
        "dashboard.nestTreasury": "Tesoro del nido",
        "dashboard.wageBurden": "Carga salarial",
        "dashboard.loanCoverage": "Cobertura de préstamo",
        "dashboard.rivalLoss": "Pérdida rival",
        "dashboard.sigilsEarned": "Sigilos ganados",
        "dashboard.coinGoalsHit": "Metas de monedas",
    },
    "pt": {
        "dashboard.nestTreasury": "Tesouro do ninho",
        "dashboard.wageBurden": "Carga salarial",
        "dashboard.loanCoverage": "Cobertura do empréstimo",
        "dashboard.rivalLoss": "Perda rival",
        "dashboard.sigilsEarned": "Sinais ganhos",
        "dashboard.coinGoalsHit": "Metas de moedas",
    },
    "fr": {
        "dashboard.nestTreasury": "Trésor du nid",
        "dashboard.wageBurden": "Charge salariale",
        "dashboard.loanCoverage": "Couverture du prêt",
        "dashboard.rivalLoss": "Perte rivale",
        "dashboard.sigilsEarned": "Sigilles gagnés",
        "dashboard.coinGoalsHit": "Objectifs de pièces",
    },
    "ht": {
        "dashboard.nestTreasury": "Trezò nich",
        "dashboard.wageBurden": "Chaj salè",
        "dashboard.loanCoverage": "Kouvèti prè",
        "dashboard.rivalLoss": "Pèt rival",
        "dashboard.sigilsEarned": "Sigil genyen",
        "dashboard.coinGoalsHit": "Objektif pyès",
    },
    "it": {
        "dashboard.nestTreasury": "Tesoro del nido",
        "dashboard.wageBurden": "Carico salari",
        "dashboard.loanCoverage": "Copertura prestito",
        "dashboard.rivalLoss": "Perdita rivale",
        "dashboard.sigilsEarned": "Sigilli guadagnati",
        "dashboard.coinGoalsHit": "Obiettivi monete",
    },
    "ca": {
        "dashboard.nestTreasury": "Tresor del niu",
        "dashboard.wageBurden": "Càrrega salarial",
        "dashboard.loanCoverage": "Cobertura del préstec",
        "dashboard.rivalLoss": "Pèrdua rival",
        "dashboard.sigilsEarned": "Sigils guanyats",
        "dashboard.coinGoalsHit": "Objectius de monedes",
    },
    "ru": {
        "dashboard.nestTreasury": "Казна гнезда",
        "dashboard.wageBurden": "Нагрузка зарплат",
        "dashboard.loanCoverage": "Покрытие займа",
        "dashboard.rivalLoss": "Потери от соперников",
        "dashboard.sigilsEarned": "Сигилы получены",
        "dashboard.coinGoalsHit": "Цели монет",
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
        "phase": 17,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.economy_bank_4.v1",
        "description": (
            "Finish 6.0 Phase 17 — economy/bank/dashboard depth 4. "
            "Loans → ≥7 (nest_ember + saffron_crest), coin goals → ≥16, "
            "nest treasury analytics + UX on web/Android dashboards. "
            "Schema stays 27 / content 5.0.0 (stats + view fields only)."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "economy4Marker": MARKER,
        "extendsEconomy3": "shared/ship/economy-bank-3.json",
        "loanProductMin": 7,
        "goalPresetMin": 16,
        "loanProductIds": loan_ids,
        "newLoanProductIds": [p["id"] for p in NEW_LOANS],
        "goalPresets": GOAL_PRESETS,
        "dashboardFields": DASHBOARD_FIELDS,
        "parityFixture": "shared/fixtures/parity-economy-bank-4.json",
        "authorTool": "shared/tools/author_economy_4.py",
        "validateScript": "npm run economy4:validate",
        "softEconomy3Validate": "npm run economy3:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "≥7 loan products including nest_ember + saffron_crest",
            "≥16 coin goal presets",
            "Dashboard nest treasury analytics fields",
            "Web↔Android nest treasury UX",
            "kickoff economy4Incomplete=false",
            "economy4:validate green in CI",
            "economy3:validate soft-green",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 13→12",
        ],
        "preflightGates": [
            "shared/ship/economy-bank-4.json",
            "shared/fixtures/parity-economy-bank-4.json",
            "shared/ship/economy-bank-3.json",
            "shared/content/content-pack.json",
            "shared/tools/author_economy_4.py",
            "web/src/engine/businessDashboard.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/BusinessDashboard.kt",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/economy/Bank.kt",
            "web/src/ui/BusinessDashboardPanel.tsx",
            "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/BusinessDashboardPanel.kt",
            "web/src/ship/economy4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Economy4.kt",
            "web/scripts/validate-economy-4.ts",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_economy_bank_4.v1",
        "economy4Marker": MARKER,
        "phase": 17,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 17: nest_ember/saffron_crest loans + 16 goal presets + "
            "dashboard nestTreasuryLines / wageBurdenPermille surfaces."
        ),
        "sampleLoanId": "loan.nest_ember",
        "sampleGoalPreset": 110000,
        "sampleDashboardField": "nestTreasuryLines",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "loanProductMin": 7,
            "goalPresetMin": 16,
            "dashboardFieldCount": 6,
            "economy4Incomplete": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "loan_products_7",
                "goal_presets_16",
                "nest_treasury_fields",
                "nest_treasury_ux",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin() -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["economy4Incomplete"] = False
    dump(KICKOFF6, kick)

    p6 = json.loads(PARITY6.read_text(encoding="utf-8"))
    p6.setdefault("expect", {})["openGapFlagMin"] = OPEN_GAP_MIN
    dump(PARITY6, p6)

    for rel in (
        "parity-quests-contracts-6.json",
        "parity-atmosphere-6.json",
        "parity-species-150.json",
        "parity-audio-pack-6.json",
        "parity-product-art-6.json",
        "parity-machines-15-16.json",
        "parity-vfx-juice-6.json",
        "parity-endgame-4.json",
        "parity-rivals-seasonal-6.json",
        "parity-staff-ai-4.json",
    ):
        path = ROOT / "fixtures" / rel
        if not path.is_file():
            continue
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 6.0 Phase 17 economy-bank-4 complete (nest loans/goals/treasury analytics); "
        "Phases 1–16 remain green. Content stays 5.0.0 / schema 27. economy4Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["economy4"] = {
        "phase": 17,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "economy4Marker": MARKER,
        "catalog": "shared/ship/economy-bank-4.json",
        "parityFixture": "shared/fixtures/parity-economy-bank-4.json",
        "validateScript": "npm run economy4:validate",
        "checklist": [
            "loans ≥7 / goals ≥16",
            "dashboard nest treasury analytics",
            "web↔Android nest treasury UX",
            "kickoff economy4Incomplete=false",
            "economy4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["economy4Phase"] = 17
    listing["economy4Catalog"] = "shared/ship/economy-bank-4.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["economy4"] = "shared/ship/economy-bank-4.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-economy-bank-4.json" not in fixtures:
        fixtures.append("parity-economy-bank-4.json")
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
        f"OK Phase 17 economy-bank-4: loans={len(loan_ids)} goals={len(GOAL_PRESETS)} "
        f"dashboardFields={len(DASHBOARD_FIELDS)} openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
