#!/usr/bin/env python3
"""
Finish 4.0 Phase 14 — quests→50, delivery chains→5, contracts depth.

Usage:
  python3 shared/tools/author_quests_contracts_4.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "quests-contracts-4.json"
PARITY = ROOT / "fixtures" / "parity-quests-contracts-4.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
EN = ROOT / "i18n" / "content-strings.en.json"
ES = ROOT / "i18n" / "content-strings.es.json"
PT = ROOT / "i18n" / "content-strings.pt.json"
CONTENT_STRINGS_KT = (
    ROOT.parent
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/ContentStrings.kt"
)

MARKER = "authored-finish-4.0-phase-14"
PRIOR_QUEST = "quest.endgame_beacon"

NEW_QUESTS = [
    {
        "id": "quest.braise_line",
        "name": "Braise line",
        "description": "Feed the harbor braiser — log machine inputs on the new line.",
        "goal": {"stat": "stat.machine_inputs", "atLeast": 40},
        "reward": {"coins": 520, "unlockUpgrades": []},
    },
    {
        "id": "quest.glaze_glamour",
        "name": "Glaze glamour",
        "description": "Sell glazed and premium plates from the new counter.",
        "goal": {"stat": "stat.premium_sales", "atLeast": 20},
        "reward": {"coins": 540, "unlockUpgrades": []},
    },
    {
        "id": "quest.mist_curator",
        "name": "Mist curator",
        "description": "Complete the Mist Cove trophy set.",
        "goal": {"stat": "stat.trophy_set_mist_cove", "atLeast": 1},
        "reward": {"coins": 560, "unlockUpgrades": []},
    },
    {
        "id": "quest.prism_curator",
        "name": "Prism curator",
        "description": "Complete the Prism Reach trophy set.",
        "goal": {"stat": "stat.trophy_set_prism_reach", "atLeast": 1},
        "reward": {"coins": 580, "unlockUpgrades": []},
    },
    {
        "id": "quest.bulk_board",
        "name": "Bulk board",
        "description": "Clear a run of delivery contracts from the board.",
        "goal": {"stat": "stat.contracts_completed", "atLeast": 12},
        "reward": {"coins": 600, "unlockUpgrades": []},
    },
    {
        "id": "quest.chain_admiral",
        "name": "Chain admiral",
        "description": "Finish three full delivery chains.",
        "goal": {"stat": "stat.contract_chains_completed", "atLeast": 3},
        "reward": {"coins": 640, "unlockUpgrades": []},
    },
    {
        "id": "quest.harbor_decade",
        "name": "Harbor decade",
        "description": "Travel across every open harbor in the network.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 10},
        "reward": {"coins": 620, "unlockUpgrades": []},
    },
    {
        "id": "quest.bait_stockist",
        "name": "Bait stockist",
        "description": "Stock specialty baits for the pier anglers.",
        "goal": {"stat": "stat.bait_bought", "atLeast": 5},
        "reward": {"coins": 500, "unlockUpgrades": []},
    },
    {
        "id": "quest.night_shift",
        "name": "Night shift",
        "description": "Ring up night-side sales after the lanterns light.",
        "goal": {"stat": "stat.night_sales", "atLeast": 15},
        "reward": {"coins": 560, "unlockUpgrades": []},
    },
    {
        "id": "quest.wholesaler_wave",
        "name": "Wholesaler wave",
        "description": "Move wholesale cartons through the dock buyers.",
        "goal": {"stat": "stat.wholesaler_sales", "atLeast": 8},
        "reward": {"coins": 580, "unlockUpgrades": []},
    },
    {
        "id": "quest.staff_academy",
        "name": "Staff academy",
        "description": "Level up workers across the floor.",
        "goal": {"stat": "stat.worker_level_ups", "atLeast": 5},
        "reward": {"coins": 540, "unlockUpgrades": []},
    },
    {
        "id": "quest.ice_logistics",
        "name": "Ice logistics",
        "description": "Keep counters stocked through busy rushes.",
        "goal": {"stat": "stat.counter_stocked", "atLeast": 25},
        "reward": {"coins": 520, "unlockUpgrades": []},
    },
    {
        "id": "quest.critic_table",
        "name": "Critic table",
        "description": "Serve the harbor critics without a miss.",
        "goal": {"stat": "stat.critic_sales", "atLeast": 5},
        "reward": {"coins": 600, "unlockUpgrades": []},
    },
    {
        "id": "quest.tourist_tide",
        "name": "Tourist tide",
        "description": "Catch the tourist wave at the retail counter.",
        "goal": {"stat": "stat.tourist_sales", "atLeast": 10},
        "reward": {"coins": 560, "unlockUpgrades": []},
    },
    {
        "id": "quest.loan_cleared",
        "name": "Loan cleared",
        "description": "Repay a pier bank loan in full.",
        "goal": {"stat": "stat.loan_repaid", "atLeast": 1},
        "reward": {"coins": 580, "unlockUpgrades": []},
    },
    {
        "id": "quest.endgame_trials",
        "name": "Endgame trials",
        "description": "Clear endgame challenges on the prestige board.",
        "goal": {"stat": "stat.endgame_challenges_completed", "atLeast": 2},
        "reward": {"coins": 700, "unlockUpgrades": []},
    },
    {
        "id": "quest.rival_undercut",
        "name": "Rival undercut",
        "description": "Outmaneuver rival stalls with undercut plays.",
        "goal": {"stat": "stat.rival_undercuts", "atLeast": 3},
        "reward": {"coins": 620, "unlockUpgrades": []},
    },
    {
        "id": "quest.market_legend",
        "name": "Market legend",
        "description": "Bank a legendary run of harbor revenue.",
        "goal": {"stat": "stat.revenue", "atLeast": 25000},
        "reward": {"coins": 800, "unlockUpgrades": []},
    },
]

NEW_CHAINS = {
    "chain.mist_runner": [
        {
            "id": "contract.chain_mist_catch",
            "name": "Mist runner · catch",
            "description": "Chain step 1/3 — brine mullet for the mist ferry.",
            "item": "species.brine_mullet",
            "quantity": 6,
            "durationTicks": 1600,
            "payout": 55,
            "penalty": 14,
            "weight": 48,
            "chainId": "chain.mist_runner",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_mist_braise",
            "name": "Mist runner · braise",
            "description": "Chain step 2/3 — braised fillets for the fog pantry.",
            "item": "product.braised_fillet",
            "quantity": 2,
            "durationTicks": 1400,
            "payout": 80,
            "penalty": 18,
            "weight": 1,
            "chainId": "chain.mist_runner",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_mist_crate",
            "name": "Mist runner · crate",
            "description": "Chain step 3/3 — braise carton to close the mist run.",
            "item": "product.braise_carton",
            "quantity": 1,
            "durationTicks": 1200,
            "payout": 110,
            "penalty": 24,
            "weight": 1,
            "chainId": "chain.mist_runner",
            "chainStep": 3,
        },
    ],
    "chain.prism_relay": [
        {
            "id": "contract.chain_prism_catch",
            "name": "Prism relay · catch",
            "description": "Chain step 1/3 — prism goby for the shelf relay.",
            "item": "species.prism_goby",
            "quantity": 5,
            "durationTicks": 1500,
            "payout": 58,
            "penalty": 15,
            "weight": 46,
            "chainId": "chain.prism_relay",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_prism_glaze",
            "name": "Prism relay · glaze",
            "description": "Chain step 2/3 — glazed fillets for the prism buffet.",
            "item": "product.glazed_fillet",
            "quantity": 2,
            "durationTicks": 1350,
            "payout": 85,
            "penalty": 19,
            "weight": 1,
            "chainId": "chain.prism_relay",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_prism_crate",
            "name": "Prism relay · crate",
            "description": "Chain step 3/3 — glaze carton to seal the relay.",
            "item": "product.glaze_carton",
            "quantity": 1,
            "durationTicks": 1150,
            "payout": 115,
            "penalty": 25,
            "weight": 1,
            "chainId": "chain.prism_relay",
            "chainStep": 3,
        },
    ],
}

NEW_REP_GATED = [
    {
        "id": "contract.braise_trust",
        "name": "Trusted braise tray",
        "description": "Good reputation only — braised fillets for the co-op kitchen.",
        "item": "product.braised_fillet",
        "quantity": 4,
        "durationTicks": 1700,
        "payout": 110,
        "penalty": 26,
        "weight": 80,
        "requiresReputationBand": 2,
    },
    {
        "id": "contract.plaza_vip",
        "name": "Plaza VIP tuna",
        "description": "Great reputation only — plaza tuna for the VIP lounge.",
        "item": "species.plaza_tuna",
        "quantity": 3,
        "durationTicks": 1600,
        "payout": 140,
        "penalty": 32,
        "weight": 72,
        "requiresReputationBand": 3,
    },
    {
        "id": "contract.glaze_legend",
        "name": "Legend glaze carton",
        "description": "Excellent reputation only — glaze cartons for the legend lounge.",
        "item": "product.glaze_carton",
        "quantity": 2,
        "durationTicks": 1500,
        "payout": 190,
        "penalty": 42,
        "weight": 60,
        "requiresReputationBand": 4,
    },
]

NEW_BOARD = [
    {
        "id": "contract.braise_stew_order",
        "name": "Braise stew order",
        "description": "Dockside diners want warm braise stew bowls.",
        "item": "product.braise_stew",
        "quantity": 3,
        "durationTicks": 1300,
        "payout": 70,
        "penalty": 16,
        "weight": 88,
    },
    {
        "id": "contract.glaze_skewer_platter",
        "name": "Glaze skewer platter",
        "description": "Festival stalls want glazed skewers by dusk.",
        "item": "product.glaze_skewer",
        "quantity": 4,
        "durationTicks": 1250,
        "payout": 75,
        "penalty": 17,
        "weight": 86,
    },
    {
        "id": "contract.prism_shad_basket",
        "name": "Prism shad basket",
        "description": "Shelf buyers need a quick prism shad basket.",
        "item": "species.prism_shad",
        "quantity": 7,
        "durationTicks": 1450,
        "payout": 68,
        "penalty": 15,
        "weight": 84,
    },
]

I18N = {
    "en": {},
    "es": {},
    "pt": {},
}

# Fill EN from authored English names; localized overlays below.
for q in NEW_QUESTS:
    I18N["en"][q["id"]] = q["name"]
for chain in NEW_CHAINS.values():
    for t in chain:
        I18N["en"][t["id"]] = t["name"]
for t in NEW_REP_GATED + NEW_BOARD:
    I18N["en"][t["id"]] = t["name"]

I18N["es"].update(
    {
        "quest.braise_line": "Línea de braseado",
        "quest.glaze_glamour": "Glaseado glamuroso",
        "quest.mist_curator": "Curador de niebla",
        "quest.prism_curator": "Curador prisma",
        "quest.bulk_board": "Tablero a granel",
        "quest.chain_admiral": "Almirante de cadenas",
        "quest.harbor_decade": "Década de puertos",
        "quest.bait_stockist": "Proveedor de cebo",
        "quest.night_shift": "Turno nocturno",
        "quest.wholesaler_wave": "Ola mayorista",
        "quest.staff_academy": "Academia de personal",
        "quest.ice_logistics": "Logística de hielo",
        "quest.critic_table": "Mesa de críticos",
        "quest.tourist_tide": "Marea turística",
        "quest.loan_cleared": "Préstamo saldado",
        "quest.endgame_trials": "Pruebas finales",
        "quest.rival_undercut": "Rival socavado",
        "quest.market_legend": "Leyenda del mercado",
        "contract.chain_mist_catch": "Corredor niebla · captura",
        "contract.chain_mist_braise": "Corredor niebla · braseado",
        "contract.chain_mist_crate": "Corredor niebla · caja",
        "contract.chain_prism_catch": "Relevo prisma · captura",
        "contract.chain_prism_glaze": "Relevo prisma · glaseado",
        "contract.chain_prism_crate": "Relevo prisma · caja",
        "contract.braise_trust": "Bandeja braseada de confianza",
        "contract.plaza_vip": "Atún VIP de plaza",
        "contract.glaze_legend": "Cartón glaseado leyenda",
        "contract.braise_stew_order": "Pedido de guiso braseado",
        "contract.glaze_skewer_platter": "Bandeja de brochetas glaseadas",
        "contract.prism_shad_basket": "Cesta de sábalo prisma",
    }
)
I18N["pt"].update(
    {
        "quest.braise_line": "Linha de braseado",
        "quest.glaze_glamour": "Glacê glamouroso",
        "quest.mist_curator": "Curador da névoa",
        "quest.prism_curator": "Curador prisma",
        "quest.bulk_board": "Quadro a granel",
        "quest.chain_admiral": "Almirante de cadeias",
        "quest.harbor_decade": "Década de portos",
        "quest.bait_stockist": "Estoque de iscas",
        "quest.night_shift": "Turno noturno",
        "quest.wholesaler_wave": "Onda atacadista",
        "quest.staff_academy": "Academia de equipe",
        "quest.ice_logistics": "Logística de gelo",
        "quest.critic_table": "Mesa de críticos",
        "quest.tourist_tide": "Maré turística",
        "quest.loan_cleared": "Empréstimo quitado",
        "quest.endgame_trials": "Provas finais",
        "quest.rival_undercut": "Rival sob corte",
        "quest.market_legend": "Lenda do mercado",
        "contract.chain_mist_catch": "Corredor névoa · captura",
        "contract.chain_mist_braise": "Corredor névoa · braseado",
        "contract.chain_mist_crate": "Corredor névoa · caixa",
        "contract.chain_prism_catch": "Revezamento prisma · captura",
        "contract.chain_prism_glaze": "Revezamento prisma · glacê",
        "contract.chain_prism_crate": "Revezamento prisma · caixa",
        "contract.braise_trust": "Bandeja braseada confiável",
        "contract.plaza_vip": "Atum VIP da praça",
        "contract.glaze_legend": "Cartão glaceado lenda",
        "contract.braise_stew_order": "Pedido de ensopado braseado",
        "contract.glaze_skewer_platter": "Bandeja de espetos glaceados",
        "contract.prism_shad_basket": "Cesta de sável prisma",
    }
)


def dump(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {x[key]: i for i, x in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def upsert_quests(quests: list) -> None:
    """Chain NEW_QUESTS after PRIOR_QUEST; replace if re-run."""
    new_ids = {q["id"] for q in NEW_QUESTS}
    quests[:] = [q for q in quests if q["id"] not in new_ids]
    prev = PRIOR_QUEST
    authored = []
    for q in NEW_QUESTS:
        entry = {
            "id": q["id"],
            "name": q["name"],
            "description": q["description"],
            "requires": [prev],
            "goal": q["goal"],
            "reward": q["reward"],
        }
        authored.append(entry)
        prev = q["id"]
    quests.extend(authored)


def upsert_content_strings_kt() -> None:
    """Insert missing EN/ES/PT entries into ContentStrings.kt maps (sorted)."""
    if not CONTENT_STRINGS_KT.is_file():
        return
    text = CONTENT_STRINGS_KT.read_text(encoding="utf-8")
    locale_for = {"EN": I18N["en"], "ES": I18N["es"], "PT": I18N["pt"]}

    def patch_map(src: str, map_name: str, locale_keys: dict[str, str]) -> str:
        # EN/ES end before the next private val; PT ends before bundles.
        if map_name == "PT":
            pattern = rf'(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val bundles)'
        else:
            pattern = rf'(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val )'
        m = re.search(pattern, src, re.S)
        if not m:
            raise SystemExit(f"ContentStrings.kt missing {map_name}")
        body = m.group(2)
        pairs = re.findall(r'"([^"]+)" to "((?:\\.|[^"\\])*)"', body)
        merged = {k: v for k, v in pairs}
        changed = False
        for k, v in locale_keys.items():
            esc = v.replace("\\", "\\\\").replace('"', '\\"')
            if k not in merged:
                merged[k] = esc
                changed = True
        if not changed:
            return src
        lines = [f'        "{k}" to "{merged[k]}",' for k in sorted(merged)]
        new_body = "\n" + "\n".join(lines)
        return src[: m.start(2)] + new_body + src[m.end(2) :]

    for name in ("EN", "ES", "PT"):
        text = patch_map(text, name, locale_for[name])
    CONTENT_STRINGS_KT.write_text(text, encoding="utf-8")


def write_ship(data: dict) -> None:
    new_quest_ids = [q["id"] for q in NEW_QUESTS]
    new_chain_ids = list(NEW_CHAINS.keys())
    new_rep_ids = [t["id"] for t in NEW_REP_GATED]
    chain_heads = [NEW_CHAINS[c][0]["id"] for c in new_chain_ids]
    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    rep = [t for t in templates if t.get("requiresReputationBand") is not None]

    catalog = {
        "phase": 14,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.quests_contracts_4.v1",
        "description": (
            "Finish 4.0 Phase 14 — raise authored quests to ≥50, delivery chains to ≥5 "
            "(mist runner + prism relay), and deepen reputation-gated / board contracts. "
            "Schema stays 24 / content 3.0.0."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 24,
        "questsContracts4Marker": MARKER,
        "questsMin": 50,
        "deliveryChainsMin": 5,
        "reputationGatedMin": 6,
        "contractTemplatesMin": 55,
        "newQuests": new_quest_ids,
        "newChains": new_chain_ids,
        "newChainHeads": chain_heads,
        "newReputationGated": new_rep_ids,
        "newBoardContracts": [t["id"] for t in NEW_BOARD],
        "extendsQuestsContracts3": "shared/ship/quests-contracts-3.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-4.json",
        "authorTool": "shared/tools/author_quests_contracts_4.py",
        "validateScript": "npm run quests4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "checklist": [
            "≥50 authored quests chained past endgame_beacon",
            "≥5 delivery chains including mist_runner + prism_relay",
            "≥6 reputation-gated contract templates",
            "≥55 contract templates with board depth SKUs",
            "content-strings en/es/pt + ContentStrings.kt for new ids",
            "Finish 3.0 quests3:validate still green (historical floors)",
            "parity-quests-contracts-4 + quests4:validate green",
            "CI runs quests4:validate",
            "kickoff baseline.quests=50 / deliveryChains=5 / questsRemaining=0",
            "schema stays 24 / content 3.0.0",
        ],
        "preflightGates": [
            "shared/ship/quests-contracts-4.json",
            "shared/fixtures/parity-quests-contracts-4.json",
            "shared/ship/quests-contracts-3.json",
            "shared/content/content-pack.json",
            "shared/i18n/content-strings.en.json",
            "shared/i18n/content-strings.es.json",
            "shared/i18n/content-strings.pt.json",
            "shared/tools/author_quests_contracts_4.py",
            "web/src/ship/questsContracts4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts4.kt",
            "web/scripts/validate-quests-contracts-4.ts",
        ],
        "measured": {
            "quests": len(data["quests"]),
            "deliveryChains": len(chains),
            "reputationGated": len(rep),
            "contractTemplates": len(templates),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_quests_contracts_4.v1",
        "description": (
            "Finish 4.0 Phase 14: quest floor 50 + mist/prism chains + rep-gate depth."
        ),
        "questsContracts4Marker": MARKER,
        "phase": 14,
        "plan": "30_finish_4.0",
        "questsMin": 50,
        "deliveryChainsMin": 5,
        "reputationGatedMin": 6,
        "contractTemplatesMin": 55,
        "newChainIds": new_chain_ids,
        "newChainHeadIds": chain_heads,
        "newChainLength": 3,
        "newRepGatedId": "contract.braise_trust",
        "newRepGatedBand": 2,
        "terminalQuestId": "quest.market_legend",
        "simHzInvariant": 20,
        "expect": {
            "contentVersion": "3.0.0",
            "schemaVersion": 24,
            "newQuests": len(new_quest_ids),
            "newChains": len(new_chain_ids),
            "gates": [
                "quests_50",
                "chains_5",
                "rep_gated_6",
                "templates_55",
                "kickoff_quests_met",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    kick["baseline"]["quests"] = len(data["quests"])
    kick["baseline"]["deliveryChains"] = len(chains)
    kick["gaps"]["questsRemaining"] = max(
        0, kick["gapTargets"]["questsMin"] - kick["baseline"]["quests"]
    )
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["quotas"]["quests"] = max(dod.get("quotas", {}).get("quests", 0), 50)
    dod["notes"] = (
        "Finish 4.0 Phase 14 quests-contracts-4 complete (quests≥50, chains≥5, contracts depth); "
        "Phases 1–13 remain green. Frozen 3.0.0 / schema 24. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 14,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "questsContracts4Marker": MARKER,
        "catalog": "shared/ship/quests-contracts-4.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-4.json",
        "validateScript": "npm run quests4:validate",
        "checklist": [
            "≥50 quests chained past endgame_beacon",
            "≥5 delivery chains (mist_runner + prism_relay)",
            "≥6 reputation-gated contracts + board depth",
            "kickoff questsRemaining = 0",
            "quests4:validate green in CI",
        ],
    }
    if "questsContracts4" not in dod:
        out = {}
        for k, v in dod.items():
            if k == "questsContracts3":
                out["questsContracts4"] = block
            out[k] = v
        if "questsContracts4" not in out:
            out["questsContracts4"] = block
        dod = out
    else:
        dod["questsContracts4"] = block
    dump(DOD, dod)


def main() -> None:
    data = json.loads(PACK.read_text(encoding="utf-8"))

    upsert_quests(data["quests"])

    new_templates: list[dict] = []
    for chain in NEW_CHAINS.values():
        new_templates.extend(chain)
    new_templates.extend(NEW_REP_GATED)
    new_templates.extend(NEW_BOARD)
    upsert_list(data["contracts"]["templates"], new_templates)

    dump(PACK, data)

    for locale, path in (("en", EN), ("es", ES), ("pt", PT)):
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    upsert_content_strings_kt()
    write_ship(data)
    update_kickoff_dod(data)

    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    rep = sum(1 for t in templates if t.get("requiresReputationBand") is not None)
    print(
        f"OK Phase 14 quests/contracts: quests={len(data['quests'])} "
        f"chains={len(chains)} repGated={rep} templates={len(templates)} "
        f"terminal={data['quests'][-1]['id']}"
    )


if __name__ == "__main__":
    main()
