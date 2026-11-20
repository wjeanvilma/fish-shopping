#!/usr/bin/env python3
"""
Finish 6.0 Phase 13 — quests→100, delivery chains→9, contracts depth.

Keeps Finish 6 Phase-1 baseline.quests=75 / deliveryChains=7 soft-floor;
closes gaps.questsRemaining → 0. Does not close contentFloorsShort.

Usage:
  python3 shared/tools/author_quests_contracts_6.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/quests-contracts-6.json"
PARITY = ROOT / "shared/fixtures/parity-quests-contracts-6.json"
KICKOFF = ROOT / "shared/ship/finish-6.0-kickoff.json"
DOD = ROOT / "shared/ship/definition-of-done.json"
LISTING = ROOT / "shared/store/listing.json"
PIN = ROOT / "shared/fixtures/RELEASE_PIN.json"
I18N_PATHS = {
    "en": ROOT / "shared/i18n/content-strings.en.json",
    "es": ROOT / "shared/i18n/content-strings.es.json",
    "pt": ROOT / "shared/i18n/content-strings.pt.json",
    "fr": ROOT / "shared/i18n/content-strings.fr.json",
    "ht": ROOT / "shared/i18n/content-strings.ht.json",
    "it": ROOT / "shared/i18n/content-strings.it.json",
    "ca": ROOT / "shared/i18n/content-strings.ca.json",
    "ru": ROOT / "shared/i18n/content-strings.ru.json",
}

MARKER = "authored-finish-6.0-phase-13"
PRIOR_QUEST = "quest.legend_circuit"
TERMINAL_QUEST = "quest.nest_covenant"

NEW_QUESTS = [
    {
        "id": "quest.roast_line",
        "name": "Roast line",
        "description": "Feed the harbor roaster — log machine inputs on the new roast line.",
        "goal": {"stat": "stat.machine_inputs", "atLeast": 70},
        "reward": {"coins": 900, "unlockUpgrades": []},
    },
    {
        "id": "quest.ferment_line",
        "name": "Ferment line",
        "description": "Run the fermenter through a full board of culture batches.",
        "goal": {"stat": "stat.outputs_collected", "atLeast": 50},
        "reward": {"coins": 920, "unlockUpgrades": []},
    },
    {
        "id": "quest.saffron_curator",
        "name": "Saffron curator",
        "description": "Complete trophy galleries across the saffron circuit harbors.",
        "goal": {"stat": "stat.trophy_sets_complete", "atLeast": 6},
        "reward": {"coins": 940, "unlockUpgrades": []},
    },
    {
        "id": "quest.cobalt_curator",
        "name": "Cobalt curator",
        "description": "Seal cobalt sound galleries with rare catches.",
        "goal": {"stat": "stat.rare_catches", "atLeast": 18},
        "reward": {"coins": 960, "unlockUpgrades": []},
    },
    {
        "id": "quest.harbor_fourteen",
        "name": "Harbor fourteen",
        "description": "Travel the full fourteen-harbor Finish 6 circuit.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 14},
        "reward": {"coins": 980, "unlockUpgrades": []},
    },
    {
        "id": "quest.nest_admiral",
        "name": "Nest admiral",
        "description": "Finish seven full delivery chains across the network.",
        "goal": {"stat": "stat.contract_chains_completed", "atLeast": 7},
        "reward": {"coins": 1000, "unlockUpgrades": []},
    },
    {
        "id": "quest.roast_gourmet",
        "name": "Roast gourmet",
        "description": "Sell premium plates after the roaster comes online.",
        "goal": {"stat": "stat.premium_sales", "atLeast": 36},
        "reward": {"coins": 940, "unlockUpgrades": []},
    },
    {
        "id": "quest.ferment_stockist",
        "name": "Ferment stockist",
        "description": "Move fermented SKUs through wholesale buyers.",
        "goal": {"stat": "stat.wholesaler_sales", "atLeast": 16},
        "reward": {"coins": 960, "unlockUpgrades": []},
    },
    {
        "id": "quest.board_regent",
        "name": "Board regent",
        "description": "Clear a deep run of delivery contracts from the board.",
        "goal": {"stat": "stat.contracts_completed", "atLeast": 28},
        "reward": {"coins": 1020, "unlockUpgrades": []},
    },
    {
        "id": "quest.perfect_nest",
        "name": "Perfect nest",
        "description": "Land a disciplined run of perfect reels across the nest circuit.",
        "goal": {"stat": "stat.perfect_reels", "atLeast": 40},
        "reward": {"coins": 980, "unlockUpgrades": []},
    },
    {
        "id": "quest.school_flash_wave",
        "name": "School flash wave",
        "description": "Hit strike-window reels during the nest school push.",
        "goal": {"stat": "stat.cast_strike_reels", "atLeast": 18},
        "reward": {"coins": 940, "unlockUpgrades": []},
    },
    {
        "id": "quest.nest_pressure",
        "name": "Nest pressure",
        "description": "Keep counters stocked through nest spoil pressure rushes.",
        "goal": {"stat": "stat.counter_stocked", "atLeast": 55},
        "reward": {"coins": 920, "unlockUpgrades": []},
    },
    {
        "id": "quest.spoil_sentinel",
        "name": "Spoil sentinel",
        "description": "Survive the floor without runaway spoilage — keep selling.",
        "goal": {"stat": "stat.sales", "atLeast": 110},
        "reward": {"coins": 900, "unlockUpgrades": []},
    },
    {
        "id": "quest.critic_nest",
        "name": "Critic nest",
        "description": "Serve harbor critics without a miss on the roast/ferment lines.",
        "goal": {"stat": "stat.critic_sales", "atLeast": 12},
        "reward": {"coins": 1000, "unlockUpgrades": []},
    },
    {
        "id": "quest.tourist_nest",
        "name": "Tourist nest",
        "description": "Catch a larger tourist wave at the nest harbors.",
        "goal": {"stat": "stat.tourist_sales", "atLeast": 24},
        "reward": {"coins": 960, "unlockUpgrades": []},
    },
    {
        "id": "quest.night_nest",
        "name": "Night nest",
        "description": "Ring up a deep night-side sales push across the circuit.",
        "goal": {"stat": "stat.night_sales", "atLeast": 30},
        "reward": {"coins": 980, "unlockUpgrades": []},
    },
    {
        "id": "quest.staff_nest",
        "name": "Staff nest",
        "description": "Level workers across the expanded roast/ferment kitchen.",
        "goal": {"stat": "stat.worker_level_ups", "atLeast": 12},
        "reward": {"coins": 940, "unlockUpgrades": []},
    },
    {
        "id": "quest.branch_nest",
        "name": "Branch nest",
        "description": "Train staff specialization branches for the nest late game.",
        "goal": {"stat": "stat.staff_branch_training", "atLeast": 5},
        "reward": {"coins": 960, "unlockUpgrades": []},
    },
    {
        "id": "quest.rival_nest",
        "name": "Rival nest",
        "description": "Beat rival stalls across the fourteen-harbor nest.",
        "goal": {"stat": "stat.rival_beats", "atLeast": 6},
        "reward": {"coins": 1020, "unlockUpgrades": []},
    },
    {
        "id": "quest.endgame_nest",
        "name": "Endgame nest",
        "description": "Earn legend marks from deepen challenges in the nest era.",
        "goal": {"stat": "stat.endgame_marks_earned", "atLeast": 3},
        "reward": {"coins": 1080, "unlockUpgrades": []},
    },
    {
        "id": "quest.bank_nest",
        "name": "Bank nest",
        "description": "Clear pier bank loans after the nest expansion spend.",
        "goal": {"stat": "stat.loan_repaid", "atLeast": 3},
        "reward": {"coins": 1000, "unlockUpgrades": []},
    },
    {
        "id": "quest.revenue_nest",
        "name": "Revenue nest",
        "description": "Bank a nest-tier run of harbor revenue.",
        "goal": {"stat": "stat.revenue", "atLeast": 55000},
        "reward": {"coins": 1200, "unlockUpgrades": []},
    },
    {
        "id": "quest.mastery_nest",
        "name": "Mastery nest",
        "description": "Level species mastery across the nest circuit.",
        "goal": {"stat": "stat.mastery_level_ups", "atLeast": 20},
        "reward": {"coins": 1100, "unlockUpgrades": []},
    },
    {
        "id": TERMINAL_QUEST,
        "name": "Nest covenant",
        "description": "Seal the Finish 6 quest spine with a nest covenant sales streak.",
        "goal": {"stat": "stat.items_sold", "atLeast": 280},
        "reward": {"coins": 1400, "unlockUpgrades": []},
    },
]

NEW_CHAINS = {
    "chain.saffron_roast": [
        {
            "id": "contract.chain_saffron_catch",
            "name": "Saffron roast · catch",
            "description": "Chain step 1/3 — saffron sprat for the roast pantry.",
            "item": "species.saffron_sprat",
            "quantity": 6,
            "durationTicks": 1500,
            "payout": 68,
            "penalty": 17,
            "weight": 46,
            "chainId": "chain.saffron_roast",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_saffron_roast",
            "name": "Saffron roast · roast",
            "description": "Chain step 2/3 — roasted fillets for the saffron board.",
            "item": "product.roasted_fillet",
            "quantity": 2,
            "durationTicks": 1350,
            "payout": 96,
            "penalty": 22,
            "weight": 1,
            "chainId": "chain.saffron_roast",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_saffron_crate",
            "name": "Saffron roast · crate",
            "description": "Chain step 3/3 — roast carton to close the saffron run.",
            "item": "product.roast_carton",
            "quantity": 1,
            "durationTicks": 1180,
            "payout": 130,
            "penalty": 28,
            "weight": 1,
            "chainId": "chain.saffron_roast",
            "chainStep": 3,
        },
    ],
    "chain.cobalt_ferment": [
        {
            "id": "contract.chain_cobalt_catch",
            "name": "Cobalt ferment · catch",
            "description": "Chain step 1/3 — cobalt smelt for the ferment bay.",
            "item": "species.cobalt_smelt",
            "quantity": 6,
            "durationTicks": 1480,
            "payout": 70,
            "penalty": 17,
            "weight": 44,
            "chainId": "chain.cobalt_ferment",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_cobalt_ferment",
            "name": "Cobalt ferment · ferment",
            "description": "Chain step 2/3 — fermented fillets for the cobalt pantry.",
            "item": "product.fermented_fillet",
            "quantity": 2,
            "durationTicks": 1320,
            "payout": 98,
            "penalty": 23,
            "weight": 1,
            "chainId": "chain.cobalt_ferment",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_cobalt_crate",
            "name": "Cobalt ferment · crate",
            "description": "Chain step 3/3 — ferment carton to seal the cobalt ferry.",
            "item": "product.ferment_carton",
            "quantity": 1,
            "durationTicks": 1140,
            "payout": 132,
            "penalty": 29,
            "weight": 1,
            "chainId": "chain.cobalt_ferment",
            "chainStep": 3,
        },
    ],
}

NEW_REP_GATED = [
    {
        "id": "contract.roast_trust",
        "name": "Trusted roast tray",
        "description": "Good reputation only — roasted fillets for the co-op kitchen.",
        "item": "product.roasted_fillet",
        "quantity": 4,
        "durationTicks": 1680,
        "payout": 128,
        "penalty": 30,
        "weight": 76,
        "requiresReputationBand": 2,
    },
    {
        "id": "contract.saffron_vip",
        "name": "Saffron VIP quay",
        "description": "Great reputation only — gilt saffron for the VIP lounge.",
        "item": "species.gilt_saffron",
        "quantity": 3,
        "durationTicks": 1580,
        "payout": 160,
        "penalty": 36,
        "weight": 68,
        "requiresReputationBand": 3,
    },
    {
        "id": "contract.ferment_legend",
        "name": "Legend ferment carton",
        "description": "Excellent reputation only — ferment cartons for the legend lounge.",
        "item": "product.ferment_carton",
        "quantity": 2,
        "durationTicks": 1480,
        "payout": 210,
        "penalty": 46,
        "weight": 56,
        "requiresReputationBand": 4,
    },
]

NEW_BOARD = [
    {
        "id": "contract.roast_chip_order",
        "name": "Roast chip order",
        "description": "Dockside diners want crisp roast chips by noon.",
        "item": "product.roast_chip",
        "quantity": 4,
        "durationTicks": 1280,
        "payout": 84,
        "penalty": 19,
        "weight": 86,
    },
    {
        "id": "contract.ferment_paste_platter",
        "name": "Ferment paste platter",
        "description": "Festival stalls want ferment paste bowls by dusk.",
        "item": "product.ferment_paste",
        "quantity": 3,
        "durationTicks": 1240,
        "payout": 88,
        "penalty": 20,
        "weight": 84,
    },
    {
        "id": "contract.cobalt_tuna_basket",
        "name": "Cobalt tuna basket",
        "description": "Sound buyers need a quick cobalt tuna basket.",
        "item": "species.cobalt_tuna",
        "quantity": 5,
        "durationTicks": 1420,
        "payout": 80,
        "penalty": 18,
        "weight": 81,
    },
    {
        "id": "contract.plaza_bass_crate",
        "name": "Plaza bass crate",
        "description": "Plaza kitchens want plaza bass for the roast queue.",
        "item": "species.plaza_bass",
        "quantity": 7,
        "durationTicks": 1380,
        "payout": 82,
        "penalty": 18,
        "weight": 80,
    },
    {
        "id": "contract.sound_char_order",
        "name": "Sound char order",
        "description": "Cobalt sound diners want crystal-fresh sound char.",
        "item": "species.sound_char",
        "quantity": 6,
        "durationTicks": 1360,
        "payout": 86,
        "penalty": 19,
        "weight": 79,
    },
]

# EN from authored names; other locales start as EN then get overlays.
I18N: dict[str, dict[str, str]] = {loc: {} for loc in I18N_PATHS}
for q in NEW_QUESTS:
    I18N["en"][q["id"]] = q["name"]
for chain in NEW_CHAINS.values():
    for t in chain:
        I18N["en"][t["id"]] = t["name"]
for t in NEW_REP_GATED + NEW_BOARD:
    I18N["en"][t["id"]] = t["name"]

for loc in I18N_PATHS:
    if loc == "en":
        continue
    I18N[loc].update(I18N["en"])

I18N["es"].update(
    {
        "quest.roast_line": "Línea de asado",
        "quest.ferment_line": "Línea de fermentación",
        "quest.saffron_curator": "Curador azafrán",
        "quest.cobalt_curator": "Curador cobalto",
        "quest.harbor_fourteen": "Catorce puertos",
        "quest.nest_admiral": "Almirante del nido",
        "quest.roast_gourmet": "Gourmet asado",
        "quest.ferment_stockist": "Proveedor de fermentos",
        "quest.board_regent": "Regente del tablero",
        "quest.perfect_nest": "Nido perfecto",
        "quest.school_flash_wave": "Ola de cardumen",
        "quest.nest_pressure": "Presión del nido",
        "quest.spoil_sentinel": "Centinela de merma",
        "quest.critic_nest": "Nido de críticos",
        "quest.tourist_nest": "Nido turístico",
        "quest.night_nest": "Nido nocturno",
        "quest.staff_nest": "Nido de personal",
        "quest.branch_nest": "Nido de ramas",
        "quest.rival_nest": "Nido rival",
        "quest.endgame_nest": "Nido final",
        "quest.bank_nest": "Nido bancario",
        "quest.revenue_nest": "Nido de ingresos",
        "quest.mastery_nest": "Nido de maestría",
        "quest.nest_covenant": "Pacto del nido",
        "contract.chain_saffron_catch": "Asado azafrán · captura",
        "contract.chain_saffron_roast": "Asado azafrán · asado",
        "contract.chain_saffron_crate": "Asado azafrán · caja",
        "contract.chain_cobalt_catch": "Fermento cobalto · captura",
        "contract.chain_cobalt_ferment": "Fermento cobalto · fermento",
        "contract.chain_cobalt_crate": "Fermento cobalto · caja",
        "contract.roast_trust": "Bandeja asada de confianza",
        "contract.saffron_vip": "Muelle VIP azafrán",
        "contract.ferment_legend": "Cartón fermento leyenda",
        "contract.roast_chip_order": "Pedido de chips asados",
        "contract.ferment_paste_platter": "Bandeja de pasta fermentada",
        "contract.cobalt_tuna_basket": "Cesta de atún cobalto",
        "contract.plaza_bass_crate": "Caja de lubina plaza",
        "contract.sound_char_order": "Pedido de salvelino sound",
    }
)
I18N["pt"].update(
    {
        "quest.roast_line": "Linha de assado",
        "quest.ferment_line": "Linha de fermentação",
        "quest.saffron_curator": "Curador açafrão",
        "quest.cobalt_curator": "Curador cobalto",
        "quest.harbor_fourteen": "Quatorze portos",
        "quest.nest_admiral": "Almirante do ninho",
        "quest.roast_gourmet": "Gourmet assado",
        "quest.ferment_stockist": "Estoquista de fermentos",
        "quest.board_regent": "Regente do tabuleiro",
        "quest.perfect_nest": "Ninho perfeito",
        "quest.school_flash_wave": "Onda de cardume",
        "quest.nest_pressure": "Pressão do ninho",
        "quest.spoil_sentinel": "Sentinela de desperdício",
        "quest.critic_nest": "Ninho dos críticos",
        "quest.tourist_nest": "Ninho turístico",
        "quest.night_nest": "Ninho noturno",
        "quest.staff_nest": "Ninho da equipe",
        "quest.branch_nest": "Ninho de ramos",
        "quest.rival_nest": "Ninho rival",
        "quest.endgame_nest": "Ninho final",
        "quest.bank_nest": "Ninho bancário",
        "quest.revenue_nest": "Ninho de receita",
        "quest.mastery_nest": "Ninho de maestria",
        "quest.nest_covenant": "Pacto do ninho",
        "contract.chain_saffron_catch": "Assado açafrão · captura",
        "contract.chain_saffron_roast": "Assado açafrão · assado",
        "contract.chain_saffron_crate": "Assado açafrão · caixa",
        "contract.chain_cobalt_catch": "Fermento cobalto · captura",
        "contract.chain_cobalt_ferment": "Fermento cobalto · fermento",
        "contract.chain_cobalt_crate": "Fermento cobalto · caixa",
        "contract.roast_trust": "Bandeja assada confiável",
        "contract.saffron_vip": "Cais VIP açafrão",
        "contract.ferment_legend": "Caixa fermento lenda",
        "contract.roast_chip_order": "Pedido de chips assados",
        "contract.ferment_paste_platter": "Travessa de pasta fermentada",
        "contract.cobalt_tuna_basket": "Cesta de atum cobalto",
        "contract.plaza_bass_crate": "Caixa de robalo plaza",
        "contract.sound_char_order": "Pedido de salvelino sound",
    }
)


def dump(path: Path, data) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {x[key]: i for i, x in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def restore_original_chain_admiral(quests: list) -> None:
    """Prior author run collided with Finish-4 quest.chain_admiral; restore from git HEAD."""
    import subprocess

    head = json.loads(
        subprocess.check_output(["git", "show", "HEAD:shared/content/content-pack.json"], cwd=str(ROOT))
    )
    original = next((q for q in head["quests"] if q["id"] == "quest.chain_admiral"), None)
    if not original:
        return
    # Drop any late-spine collision copy, then restore original early-spine quest.
    quests[:] = [q for q in quests if q["id"] != "quest.chain_admiral"]
    # Insert after its required predecessor when present.
    prev = (original.get("requires") or [None])[0]
    insert_at = next((i + 1 for i, q in enumerate(quests) if q["id"] == prev), len(quests))
    quests.insert(insert_at, original)


def upsert_quests(quests: list) -> None:
    restore_original_chain_admiral(quests)
    new_ids = {q["id"] for q in NEW_QUESTS}
    # Never clobber historical quest.chain_admiral (Finish 4 spine).
    new_ids.discard("quest.chain_admiral")
    quests[:] = [q for q in quests if q["id"] not in new_ids]
    prev = PRIOR_QUEST
    for q in NEW_QUESTS:
        quests.append(
            {
                "id": q["id"],
                "name": q["name"],
                "description": q["description"],
                "requires": [prev],
                "goal": q["goal"],
                "reward": q["reward"],
            }
        )
        prev = q["id"]


def upsert_content_strings_kt() -> None:
    sync = ROOT / "shared" / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(ROOT))
        return
    raise SystemExit("missing shared/tools/sync_i18n_kotlin.py")


def write_ship(data: dict) -> None:
    new_quest_ids = [q["id"] for q in NEW_QUESTS]
    new_chain_ids = list(NEW_CHAINS.keys())
    new_rep_ids = [t["id"] for t in NEW_REP_GATED]
    chain_heads = [NEW_CHAINS[c][0]["id"] for c in new_chain_ids]
    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    rep = [t for t in templates if t.get("requiresReputationBand") is not None]

    catalog = {
        "phase": 13,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.quests_contracts_6.v1",
        "description": (
            "Finish 6.0 Phase 13 — raise authored quests to ≥100, delivery chains to ≥9 "
            "(saffron roast + cobalt ferment), and deepen reputation-gated / board contracts. "
            "Schema stays 26 / content 5.0.0. Closes gaps.questsRemaining; contentFloorsShort stays open."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 26,
        "questsContracts6Marker": MARKER,
        "questsMin": 100,
        "deliveryChainsMin": 9,
        "reputationGatedMin": 12,
        "contractTemplatesMin": 85,
        "newQuests": new_quest_ids,
        "newChains": new_chain_ids,
        "newChainHeads": chain_heads,
        "newReputationGated": new_rep_ids,
        "newBoardContracts": [t["id"] for t in NEW_BOARD],
        "extendsQuestsContracts5": "shared/ship/quests-contracts-5.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-6.json",
        "authorTool": "shared/tools/author_quests_contracts_6.py",
        "validateScript": "npm run quests6:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "gapClosed": "questsRemaining",
        "gapClosedValue": 0,
        "checklist": [
            "≥100 authored quests chained past legend_circuit",
            "≥9 delivery chains including saffron_roast + cobalt_ferment",
            "≥12 reputation-gated contract templates",
            "≥85 contract templates with board depth SKUs",
            "content-strings 8 locales + ContentStrings.kt for new ids",
            "Finish 5.0 quests5:validate still green (historical floors)",
            "parity-quests-contracts-6 + quests6:validate green",
            "CI runs quests6:validate",
            "kickoff questsRemaining=0 (baseline.quests stays 75 Phase-1 soft-floor)",
            "contentFloorsShort stays true",
            "schema stays 26 / content 5.0.0",
        ],
        "preflightGates": [
            "shared/ship/quests-contracts-6.json",
            "shared/fixtures/parity-quests-contracts-6.json",
            "shared/ship/quests-contracts-5.json",
            "shared/content/content-pack.json",
            "shared/i18n/content-strings.en.json",
            "shared/i18n/content-strings.es.json",
            "shared/i18n/content-strings.pt.json",
            "shared/tools/author_quests_contracts_6.py",
            "web/src/ship/questsContracts6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts6.kt",
            "web/scripts/validate-quests-contracts-6.ts",
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
        "schema": "fish.fixtures.parity_quests_contracts_6.v1",
        "description": (
            "Finish 6.0 Phase 13: quest floor 100 + saffron/cobalt chains + rep-gate depth."
        ),
        "questsContracts6Marker": MARKER,
        "phase": 13,
        "plan": "30_finish_6.0",
        "questsMin": 100,
        "deliveryChainsMin": 9,
        "reputationGatedMin": 12,
        "contractTemplatesMin": 85,
        "newChainIds": new_chain_ids,
        "newChainHeadIds": chain_heads,
        "newChainLength": 3,
        "newRepGatedId": "contract.roast_trust",
        "newRepGatedBand": 2,
        "terminalQuestId": TERMINAL_QUEST,
        "simHzInvariant": 20,
        "expect": {
            "contentVersion": "5.0.0",
            "schemaVersion": 26,
            "newQuests": len(new_quest_ids),
            "newChains": len(new_chain_ids),
            "questsRemainingClosed": True,
            "openGapFlagMin": 16,
            "gates": [
                "quests_100",
                "chains_9",
                "rep_gated_12",
                "templates_85",
                "kickoff_quests_met",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    # Soft-floor: keep Phase-1 baseline.quests / deliveryChains; close numeric quest gap.
    kick["gaps"]["questsRemaining"] = 0
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["quests"] = max(int(quotas.get("quests") or 0), 100)
    quotas["deliveryChains"] = max(int(quotas.get("deliveryChains") or 0), 9)
    quotas["questsMin"] = max(int(quotas.get("questsMin") or 0), 100)
    dod["questsContracts6"] = {
        "phase": 13,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "questsContracts6Marker": MARKER,
        "catalog": "shared/ship/quests-contracts-6.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-6.json",
        "validateScript": "npm run quests6:validate",
        "checklist": [
            "≥100 quests chained past legend_circuit",
            "≥9 delivery chains (saffron_roast + cobalt_ferment)",
            "≥12 reputation-gated contracts + board depth",
            "kickoff questsRemaining = 0",
            "quests6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["questsContracts6Phase"] = 13
    listing["questsContracts6Catalog"] = "shared/ship/quests-contracts-6.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["questsContracts6"] = "shared/ship/quests-contracts-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-quests-contracts-6.json" not in fixtures:
        fixtures.append("parity-quests-contracts-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


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

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    upsert_content_strings_kt()
    write_ship(data)
    update_kickoff_dod_listing(data)

    phase13 = next(
        (p for p in json.loads(KICKOFF.read_text()).get("phases", []) if p.get("phase") == 13),
        None,
    )
    if not phase13 or phase13.get("validate") != "quests6:validate":
        raise SystemExit("kickoff phase 13 must validate via quests6:validate")

    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    rep = sum(1 for t in templates if t.get("requiresReputationBand") is not None)
    print(
        f"OK Phase 13 quests/contracts: quests={len(data['quests'])} "
        f"chains={len(chains)} repGated={rep} templates={len(templates)} "
        f"terminal={data['quests'][-1]['id']}"
    )


if __name__ == "__main__":
    main()
