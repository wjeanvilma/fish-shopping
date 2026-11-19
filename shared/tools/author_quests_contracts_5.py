#!/usr/bin/env python3
"""
Finish 5.0 Phase 16 — quests→75, delivery chains→7, contracts depth.

Usage:
  python3 shared/tools/author_quests_contracts_5.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
SHIP = ROOT / "shared/ship/quests-contracts-5.json"
PARITY = ROOT / "shared/fixtures/parity-quests-contracts-5.json"
KICKOFF = ROOT / "shared/ship/finish-5.0-kickoff.json"
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
CONTENT_STRINGS_KT = (
    ROOT
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/ContentStrings.kt"
)

MARKER = "authored-finish-5.0-phase-16"
PRIOR_QUEST = "quest.market_legend"

NEW_QUESTS = [
    {
        "id": "quest.poach_line",
        "name": "Poach line",
        "description": "Feed the harbor poacher — log machine inputs on the new bath line.",
        "goal": {"stat": "stat.machine_inputs", "atLeast": 55},
        "reward": {"coins": 720, "unlockUpgrades": []},
    },
    {
        "id": "quest.can_line",
        "name": "Can line",
        "description": "Run the canner through a full board of retort batches.",
        "goal": {"stat": "stat.outputs_collected", "atLeast": 40},
        "reward": {"coins": 740, "unlockUpgrades": []},
    },
    {
        "id": "quest.aurora_curator",
        "name": "Aurora curator",
        "description": "Complete the Aurora Inlet trophy gallery.",
        "goal": {"stat": "stat.trophy_set_aurora_inlet", "atLeast": 1},
        "reward": {"coins": 760, "unlockUpgrades": []},
    },
    {
        "id": "quest.tideglass_curator",
        "name": "Tideglass curator",
        "description": "Complete the Tideglass Bay trophy gallery.",
        "goal": {"stat": "stat.trophy_set_tideglass_bay", "atLeast": 1},
        "reward": {"coins": 780, "unlockUpgrades": []},
    },
    {
        "id": "quest.harbor_dozen",
        "name": "Harbor dozen",
        "description": "Travel the full twelve-harbor circuit.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 12},
        "reward": {"coins": 800, "unlockUpgrades": []},
    },
    {
        "id": "quest.chain_commodore",
        "name": "Chain commodore",
        "description": "Finish five full delivery chains.",
        "goal": {"stat": "stat.contract_chains_completed", "atLeast": 5},
        "reward": {"coins": 820, "unlockUpgrades": []},
    },
    {
        "id": "quest.poach_gourmet",
        "name": "Poach gourmet",
        "description": "Sell premium plates after the poacher comes online.",
        "goal": {"stat": "stat.premium_sales", "atLeast": 28},
        "reward": {"coins": 760, "unlockUpgrades": []},
    },
    {
        "id": "quest.can_stockist",
        "name": "Can stockist",
        "description": "Move canned SKUs through wholesale buyers.",
        "goal": {"stat": "stat.wholesaler_sales", "atLeast": 12},
        "reward": {"coins": 780, "unlockUpgrades": []},
    },
    {
        "id": "quest.board_marshal",
        "name": "Board marshal",
        "description": "Clear a long run of delivery contracts from the board.",
        "goal": {"stat": "stat.contracts_completed", "atLeast": 20},
        "reward": {"coins": 840, "unlockUpgrades": []},
    },
    {
        "id": "quest.perfect_circuit",
        "name": "Perfect circuit",
        "description": "Land a disciplined run of perfect reels across the network.",
        "goal": {"stat": "stat.perfect_reels", "atLeast": 30},
        "reward": {"coins": 800, "unlockUpgrades": []},
    },
    {
        "id": "quest.cast_strike_wave",
        "name": "Cast strike wave",
        "description": "Hit strike-window reels during the cast FSM push.",
        "goal": {"stat": "stat.cast_strike_reels", "atLeast": 12},
        "reward": {"coins": 760, "unlockUpgrades": []},
    },
    {
        "id": "quest.pressure_cook",
        "name": "Pressure cook",
        "description": "Keep counters stocked through spoil pressure rushes.",
        "goal": {"stat": "stat.counter_stocked", "atLeast": 40},
        "reward": {"coins": 740, "unlockUpgrades": []},
    },
    {
        "id": "quest.spoil_watch",
        "name": "Spoil watch",
        "description": "Survive the floor without runaway spoilage — keep selling.",
        "goal": {"stat": "stat.sales", "atLeast": 80},
        "reward": {"coins": 720, "unlockUpgrades": []},
    },
    {
        "id": "quest.critic_salon",
        "name": "Critic salon",
        "description": "Serve harbor critics without a miss on the new lines.",
        "goal": {"stat": "stat.critic_sales", "atLeast": 8},
        "reward": {"coins": 820, "unlockUpgrades": []},
    },
    {
        "id": "quest.tourist_armada",
        "name": "Tourist armada",
        "description": "Catch a larger tourist wave at retail.",
        "goal": {"stat": "stat.tourist_sales", "atLeast": 18},
        "reward": {"coins": 780, "unlockUpgrades": []},
    },
    {
        "id": "quest.night_armada",
        "name": "Night armada",
        "description": "Ring up a deep night-side sales push.",
        "goal": {"stat": "stat.night_sales", "atLeast": 22},
        "reward": {"coins": 800, "unlockUpgrades": []},
    },
    {
        "id": "quest.staff_maestro",
        "name": "Staff maestro",
        "description": "Level workers across the expanded kitchen.",
        "goal": {"stat": "stat.worker_level_ups", "atLeast": 8},
        "reward": {"coins": 760, "unlockUpgrades": []},
    },
    {
        "id": "quest.branch_trainer",
        "name": "Branch trainer",
        "description": "Train staff specialization branches for the late game.",
        "goal": {"stat": "stat.staff_branch_training", "atLeast": 3},
        "reward": {"coins": 780, "unlockUpgrades": []},
    },
    {
        "id": "quest.rival_rout",
        "name": "Rival rout",
        "description": "Beat rival stalls across the circuit.",
        "goal": {"stat": "stat.rival_beats", "atLeast": 4},
        "reward": {"coins": 840, "unlockUpgrades": []},
    },
    {
        "id": "quest.endgame_marks",
        "name": "Endgame marks",
        "description": "Earn legend marks from deepen challenges.",
        "goal": {"stat": "stat.endgame_marks_earned", "atLeast": 2},
        "reward": {"coins": 880, "unlockUpgrades": []},
    },
    {
        "id": "quest.bank_sovereign",
        "name": "Bank sovereign",
        "description": "Clear pier bank loans after the expansion spend.",
        "goal": {"stat": "stat.loan_repaid", "atLeast": 2},
        "reward": {"coins": 820, "unlockUpgrades": []},
    },
    {
        "id": "quest.revenue_crown",
        "name": "Revenue crown",
        "description": "Bank a crown-tier run of harbor revenue.",
        "goal": {"stat": "stat.revenue", "atLeast": 40000},
        "reward": {"coins": 1000, "unlockUpgrades": []},
    },
    {
        "id": "quest.legend_circuit",
        "name": "Legend circuit",
        "description": "Seal the Finish 5 quest spine with a legendary sales streak.",
        "goal": {"stat": "stat.items_sold", "atLeast": 200},
        "reward": {"coins": 1100, "unlockUpgrades": []},
    },
]

NEW_CHAINS = {
    "chain.aurora_run": [
        {
            "id": "contract.chain_aurora_catch",
            "name": "Aurora run · catch",
            "description": "Chain step 1/3 — aurora cod for the inlet ferry.",
            "item": "species.aurora_cod",
            "quantity": 5,
            "durationTicks": 1550,
            "payout": 62,
            "penalty": 16,
            "weight": 47,
            "chainId": "chain.aurora_run",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_aurora_poach",
            "name": "Aurora run · poach",
            "description": "Chain step 2/3 — poached fillets for the aurora pantry.",
            "item": "product.poached_fillet",
            "quantity": 2,
            "durationTicks": 1400,
            "payout": 90,
            "penalty": 20,
            "weight": 1,
            "chainId": "chain.aurora_run",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_aurora_crate",
            "name": "Aurora run · crate",
            "description": "Chain step 3/3 — poach carton to close the aurora run.",
            "item": "product.poach_carton",
            "quantity": 1,
            "durationTicks": 1200,
            "payout": 120,
            "penalty": 26,
            "weight": 1,
            "chainId": "chain.aurora_run",
            "chainStep": 3,
        },
    ],
    "chain.tideglass_ferry": [
        {
            "id": "contract.chain_tide_catch",
            "name": "Tideglass ferry · catch",
            "description": "Chain step 1/3 — tide bass for the glass bay ferry.",
            "item": "species.tide_bass",
            "quantity": 6,
            "durationTicks": 1500,
            "payout": 64,
            "penalty": 16,
            "weight": 45,
            "chainId": "chain.tideglass_ferry",
            "chainStep": 1,
        },
        {
            "id": "contract.chain_tide_can",
            "name": "Tideglass ferry · can",
            "description": "Chain step 2/3 — canned fillets for the ferry pantry.",
            "item": "product.canned_fillet",
            "quantity": 2,
            "durationTicks": 1350,
            "payout": 92,
            "penalty": 21,
            "weight": 1,
            "chainId": "chain.tideglass_ferry",
            "chainStep": 2,
        },
        {
            "id": "contract.chain_tide_crate",
            "name": "Tideglass ferry · crate",
            "description": "Chain step 3/3 — can carton to seal the ferry.",
            "item": "product.can_carton",
            "quantity": 1,
            "durationTicks": 1150,
            "payout": 125,
            "penalty": 27,
            "weight": 1,
            "chainId": "chain.tideglass_ferry",
            "chainStep": 3,
        },
    ],
}

NEW_REP_GATED = [
    {
        "id": "contract.poach_trust",
        "name": "Trusted poach tray",
        "description": "Good reputation only — poached fillets for the co-op kitchen.",
        "item": "product.poached_fillet",
        "quantity": 4,
        "durationTicks": 1700,
        "payout": 120,
        "penalty": 28,
        "weight": 78,
        "requiresReputationBand": 2,
    },
    {
        "id": "contract.aurora_vip",
        "name": "Aurora VIP north",
        "description": "Great reputation only — aurora north for the VIP lounge.",
        "item": "species.aurora_north",
        "quantity": 3,
        "durationTicks": 1600,
        "payout": 150,
        "penalty": 34,
        "weight": 70,
        "requiresReputationBand": 3,
    },
    {
        "id": "contract.can_legend",
        "name": "Legend can carton",
        "description": "Excellent reputation only — can cartons for the legend lounge.",
        "item": "product.can_carton",
        "quantity": 2,
        "durationTicks": 1500,
        "payout": 200,
        "penalty": 44,
        "weight": 58,
        "requiresReputationBand": 4,
    },
]

NEW_BOARD = [
    {
        "id": "contract.poach_broth_order",
        "name": "Poach broth order",
        "description": "Dockside diners want warm poach broth bowls.",
        "item": "product.poach_broth",
        "quantity": 3,
        "durationTicks": 1300,
        "payout": 78,
        "penalty": 18,
        "weight": 87,
    },
    {
        "id": "contract.can_medley_platter",
        "name": "Can medley platter",
        "description": "Festival stalls want canned medleys by dusk.",
        "item": "product.can_medley",
        "quantity": 4,
        "durationTicks": 1250,
        "payout": 82,
        "penalty": 19,
        "weight": 85,
    },
    {
        "id": "contract.aurora_jack_basket",
        "name": "Aurora jack basket",
        "description": "Inlet buyers need a quick aurora jack basket.",
        "item": "species.aurora_jack",
        "quantity": 6,
        "durationTicks": 1450,
        "payout": 74,
        "penalty": 17,
        "weight": 83,
    },
    {
        "id": "contract.brine_goby_crate",
        "name": "Brine goby crate",
        "description": "Tideglass kitchens want brine goby for the canner queue.",
        "item": "species.brine_goby",
        "quantity": 7,
        "durationTicks": 1400,
        "payout": 76,
        "penalty": 17,
        "weight": 82,
    },
]

# EN from authored names; localized overlays below.
I18N: dict[str, dict[str, str]] = {loc: {} for loc in I18N_PATHS}
for q in NEW_QUESTS:
    I18N["en"][q["id"]] = q["name"]
for chain in NEW_CHAINS.values():
    for t in chain:
        I18N["en"][t["id"]] = t["name"]
for t in NEW_REP_GATED + NEW_BOARD:
    I18N["en"][t["id"]] = t["name"]

I18N["es"].update(
    {
        "quest.poach_line": "Línea de escalfado",
        "quest.can_line": "Línea de enlatado",
        "quest.aurora_curator": "Curador aurora",
        "quest.tideglass_curator": "Curador cristal de marea",
        "quest.harbor_dozen": "Docena de puertos",
        "quest.chain_commodore": "Comodoro de cadenas",
        "quest.poach_gourmet": "Gourmet escalfado",
        "quest.can_stockist": "Proveedor de latas",
        "quest.board_marshal": "Mariscal del tablero",
        "quest.perfect_circuit": "Circuito perfecto",
        "quest.cast_strike_wave": "Ola de lance",
        "quest.pressure_cook": "Cocción a presión",
        "quest.spoil_watch": "Vigilancia de merma",
        "quest.critic_salon": "Salón de críticos",
        "quest.tourist_armada": "Armada turística",
        "quest.night_armada": "Armada nocturna",
        "quest.staff_maestro": "Maestro de personal",
        "quest.branch_trainer": "Entrenador de ramas",
        "quest.rival_rout": "Derrota rival",
        "quest.endgame_marks": "Marcas finales",
        "quest.bank_sovereign": "Soberano del banco",
        "quest.revenue_crown": "Corona de ingresos",
        "quest.legend_circuit": "Circuito leyenda",
        "contract.chain_aurora_catch": "Ruta aurora · captura",
        "contract.chain_aurora_poach": "Ruta aurora · escalfado",
        "contract.chain_aurora_crate": "Ruta aurora · caja",
        "contract.chain_tide_catch": "Ferry cristal · captura",
        "contract.chain_tide_can": "Ferry cristal · lata",
        "contract.chain_tide_crate": "Ferry cristal · caja",
        "contract.poach_trust": "Bandeja escalfada de confianza",
        "contract.aurora_vip": "Norte VIP aurora",
        "contract.can_legend": "Cartón de latas leyenda",
        "contract.poach_broth_order": "Pedido de caldo escalfado",
        "contract.can_medley_platter": "Bandeja de mezcla enlatada",
        "contract.aurora_jack_basket": "Cesta de jurel aurora",
        "contract.brine_goby_crate": "Caja de gobio de salmuera",
    }
)
I18N["pt"].update(
    {
        "quest.poach_line": "Linha de escalfado",
        "quest.can_line": "Linha de enlatado",
        "quest.aurora_curator": "Curador aurora",
        "quest.tideglass_curator": "Curador cristal de maré",
        "quest.harbor_dozen": "Dúzia de portos",
        "quest.chain_commodore": "Comodoro de cadeias",
        "quest.poach_gourmet": "Gourmet escalfado",
        "quest.can_stockist": "Estoque de latas",
        "quest.board_marshal": "Marechal do quadro",
        "quest.perfect_circuit": "Circuito perfeito",
        "quest.cast_strike_wave": "Onda de lance",
        "quest.pressure_cook": "Cozimento sob pressão",
        "quest.spoil_watch": "Vigilância de perda",
        "quest.critic_salon": "Salão de críticos",
        "quest.tourist_armada": "Armada turística",
        "quest.night_armada": "Armada noturna",
        "quest.staff_maestro": "Maestro da equipe",
        "quest.branch_trainer": "Treinador de ramos",
        "quest.rival_rout": "Derrota rival",
        "quest.endgame_marks": "Marcas finais",
        "quest.bank_sovereign": "Soberano do banco",
        "quest.revenue_crown": "Coroa de receita",
        "quest.legend_circuit": "Circuito lenda",
        "contract.chain_aurora_catch": "Rota aurora · captura",
        "contract.chain_aurora_poach": "Rota aurora · escalfado",
        "contract.chain_aurora_crate": "Rota aurora · caixa",
        "contract.chain_tide_catch": "Balsa cristal · captura",
        "contract.chain_tide_can": "Balsa cristal · lata",
        "contract.chain_tide_crate": "Balsa cristal · caixa",
        "contract.poach_trust": "Bandeja escalfada confiável",
        "contract.aurora_vip": "Norte VIP aurora",
        "contract.can_legend": "Cartão de latas lenda",
        "contract.poach_broth_order": "Pedido de caldo escalfado",
        "contract.can_medley_platter": "Bandeja de mistura enlatada",
        "contract.aurora_jack_basket": "Cesta de xaréu aurora",
        "contract.brine_goby_crate": "Caixa de gobídeo salmoura",
    }
)
I18N["fr"].update(
    {
        "quest.poach_line": "Ligne de pochage",
        "quest.can_line": "Ligne de conserve",
        "quest.aurora_curator": "Conservateur aurore",
        "quest.tideglass_curator": "Conservateur marée de verre",
        "quest.harbor_dozen": "Douzaine de ports",
        "quest.chain_commodore": "Commodore des chaînes",
        "quest.poach_gourmet": "Gourmet poché",
        "quest.can_stockist": "Stockeur de conserves",
        "quest.board_marshal": "Maréchal du tableau",
        "quest.perfect_circuit": "Circuit parfait",
        "quest.cast_strike_wave": "Vague de frappe",
        "quest.pressure_cook": "Cuisson sous pression",
        "quest.spoil_watch": "Veille du gaspillage",
        "quest.critic_salon": "Salon des critiques",
        "quest.tourist_armada": "Armada touristique",
        "quest.night_armada": "Armada nocturne",
        "quest.staff_maestro": "Maestro du personnel",
        "quest.branch_trainer": "Formateur de branches",
        "quest.rival_rout": "Déroute rivale",
        "quest.endgame_marks": "Marques de fin",
        "quest.bank_sovereign": "Souverain de la banque",
        "quest.revenue_crown": "Couronne de revenus",
        "quest.legend_circuit": "Circuit légende",
        "contract.chain_aurora_catch": "Course aurore · prise",
        "contract.chain_aurora_poach": "Course aurore · poché",
        "contract.chain_aurora_crate": "Course aurore · caisse",
        "contract.chain_tide_catch": "Ferry verre · prise",
        "contract.chain_tide_can": "Ferry verre · conserve",
        "contract.chain_tide_crate": "Ferry verre · caisse",
        "contract.poach_trust": "Plateau poché de confiance",
        "contract.aurora_vip": "Nord VIP aurore",
        "contract.can_legend": "Carton conserve légende",
        "contract.poach_broth_order": "Commande de bouillon poché",
        "contract.can_medley_platter": "Plateau mélange en conserve",
        "contract.aurora_jack_basket": "Panier de sériole aurore",
        "contract.brine_goby_crate": "Caisse de gobie saumure",
    }
)
I18N["ht"].update(
    {
        "quest.poach_line": "Liyn poché",
        "quest.can_line": "Liyn kan",
        "quest.aurora_curator": "Kiratè aurora",
        "quest.tideglass_curator": "Kiratè cristal mare",
        "quest.harbor_dozen": "Douzèn pò",
        "quest.chain_commodore": "Komodò chèn",
        "quest.poach_gourmet": "Gourmet poché",
        "quest.can_stockist": "Stòk kan",
        "quest.board_marshal": "Maréchal tablo",
        "quest.perfect_circuit": "Sikwi pafè",
        "quest.cast_strike_wave": "Vag frape",
        "quest.pressure_cook": "Kwit anba presyon",
        "quest.spoil_watch": "Vey spoilage",
        "quest.critic_salon": "Salon kritik",
        "quest.tourist_armada": "Armada touris",
        "quest.night_armada": "Armada lannuit",
        "quest.staff_maestro": "Maestro anplwaye",
        "quest.branch_trainer": "Antrenè branch",
        "quest.rival_rout": "Defèt rival",
        "quest.endgame_marks": "Mak final",
        "quest.bank_sovereign": "Sovren bank",
        "quest.revenue_crown": "Kouwòn revni",
        "quest.legend_circuit": "Sikwi lejand",
        "contract.chain_aurora_catch": "Kous aurora · trape",
        "contract.chain_aurora_poach": "Kous aurora · poché",
        "contract.chain_aurora_crate": "Kous aurora · bwat",
        "contract.chain_tide_catch": "Feribò cristal · trape",
        "contract.chain_tide_can": "Feribò cristal · kan",
        "contract.chain_tide_crate": "Feribò cristal · bwat",
        "contract.poach_trust": "Plat poché konfyans",
        "contract.aurora_vip": "Nò VIP aurora",
        "contract.can_legend": "Katòn kan lejand",
        "contract.poach_broth_order": "Lòd bouyon poché",
        "contract.can_medley_platter": "Plat melanj kan",
        "contract.aurora_jack_basket": "Panyen jack aurora",
        "contract.brine_goby_crate": "Bwat gobi salin",
    }
)
I18N["it"].update(
    {
        "quest.poach_line": "Linea di poché",
        "quest.can_line": "Linea di conserve",
        "quest.aurora_curator": "Curatore aurora",
        "quest.tideglass_curator": "Curatore vetro di marea",
        "quest.harbor_dozen": "Dozzina di porti",
        "quest.chain_commodore": "Commodoro delle catene",
        "quest.poach_gourmet": "Gourmet poché",
        "quest.can_stockist": "Stock di conserve",
        "quest.board_marshal": "Maresciallo del tabellone",
        "quest.perfect_circuit": "Circuito perfetto",
        "quest.cast_strike_wave": "Onda di strike",
        "quest.pressure_cook": "Cottura a pressione",
        "quest.spoil_watch": "Vigilanza sullo spreco",
        "quest.critic_salon": "Salone dei critici",
        "quest.tourist_armada": "Armata turistica",
        "quest.night_armada": "Armata notturna",
        "quest.staff_maestro": "Maestro del personale",
        "quest.branch_trainer": "Addestratore rami",
        "quest.rival_rout": "Sconfitta rivale",
        "quest.endgame_marks": "Marchi finali",
        "quest.bank_sovereign": "Sovrano della banca",
        "quest.revenue_crown": "Corona dei ricavi",
        "quest.legend_circuit": "Circuito leggenda",
        "contract.chain_aurora_catch": "Corsa aurora · cattura",
        "contract.chain_aurora_poach": "Corsa aurora · poché",
        "contract.chain_aurora_crate": "Corsa aurora · cassa",
        "contract.chain_tide_catch": "Traghetto vetro · cattura",
        "contract.chain_tide_can": "Traghetto vetro · scatola",
        "contract.chain_tide_crate": "Traghetto vetro · cassa",
        "contract.poach_trust": "Vassoio poché fidato",
        "contract.aurora_vip": "Nord VIP aurora",
        "contract.can_legend": "Cartone conserve leggenda",
        "contract.poach_broth_order": "Ordine di brodo poché",
        "contract.can_medley_platter": "Vassoio misto in scatola",
        "contract.aurora_jack_basket": "Cesto di jack aurora",
        "contract.brine_goby_crate": "Cassa di ghiozzo in salamoia",
    }
)
I18N["ca"].update(
    {
        "quest.poach_line": "Línia d'escalfat",
        "quest.can_line": "Línia d'enllaunat",
        "quest.aurora_curator": "Conservador aurora",
        "quest.tideglass_curator": "Conservador vidre de marea",
        "quest.harbor_dozen": "Dotzena de ports",
        "quest.chain_commodore": "Comodor de cadenes",
        "quest.poach_gourmet": "Gourmet escalfat",
        "quest.can_stockist": "Estoc de llaunes",
        "quest.board_marshal": "Mariscal del tauler",
        "quest.perfect_circuit": "Circuit perfecte",
        "quest.cast_strike_wave": "Onada de llançament",
        "quest.pressure_cook": "Cuina a pressió",
        "quest.spoil_watch": "Vigilància de merma",
        "quest.critic_salon": "Saló de crítics",
        "quest.tourist_armada": "Armada turística",
        "quest.night_armada": "Armada nocturna",
        "quest.staff_maestro": "Mestre del personal",
        "quest.branch_trainer": "Entrenador de branques",
        "quest.rival_rout": "Derrota rival",
        "quest.endgame_marks": "Marques finals",
        "quest.bank_sovereign": "Sobirà del banc",
        "quest.revenue_crown": "Corona d'ingressos",
        "quest.legend_circuit": "Circuit llegenda",
        "contract.chain_aurora_catch": "Cursa aurora · captura",
        "contract.chain_aurora_poach": "Cursa aurora · escalfat",
        "contract.chain_aurora_crate": "Cursa aurora · caixa",
        "contract.chain_tide_catch": "Ferri vidre · captura",
        "contract.chain_tide_can": "Ferri vidre · llauna",
        "contract.chain_tide_crate": "Ferri vidre · caixa",
        "contract.poach_trust": "Safata escalfada de confiança",
        "contract.aurora_vip": "Nord VIP aurora",
        "contract.can_legend": "Cartró de llaunes llegenda",
        "contract.poach_broth_order": "Comanda de brou escalfat",
        "contract.can_medley_platter": "Safata de mescla enllaunada",
        "contract.aurora_jack_basket": "Cistella de jack aurora",
        "contract.brine_goby_crate": "Caixa de gòbid de salmorra",
    }
)
I18N["ru"].update(
    {
        "quest.poach_line": "Линия пашота",
        "quest.can_line": "Линия консервов",
        "quest.aurora_curator": "Куратор Авроры",
        "quest.tideglass_curator": "Куратор Приливного Стекла",
        "quest.harbor_dozen": "Дюжина гаваней",
        "quest.chain_commodore": "Коммодор цепочек",
        "quest.poach_gourmet": "Гурме пашот",
        "quest.can_stockist": "Склад консервов",
        "quest.board_marshal": "Маршал доски",
        "quest.perfect_circuit": "Идеальный круг",
        "quest.cast_strike_wave": "Волна заброса",
        "quest.pressure_cook": "Готовка под давлением",
        "quest.spoil_watch": "Дозор порчи",
        "quest.critic_salon": "Салон критиков",
        "quest.tourist_armada": "Туристическая армада",
        "quest.night_armada": "Ночная армада",
        "quest.staff_maestro": "Маэстро персонала",
        "quest.branch_trainer": "Тренер ветвей",
        "quest.rival_rout": "Разгром соперника",
        "quest.endgame_marks": "Метки эндгейма",
        "quest.bank_sovereign": "Владыка банка",
        "quest.revenue_crown": "Корона выручки",
        "quest.legend_circuit": "Круг легенды",
        "contract.chain_aurora_catch": "Рейс авроры · улов",
        "contract.chain_aurora_poach": "Рейс авроры · пашот",
        "contract.chain_aurora_crate": "Рейс авроры · ящик",
        "contract.chain_tide_catch": "Паром стекла · улов",
        "contract.chain_tide_can": "Паром стекла · банка",
        "contract.chain_tide_crate": "Паром стекла · ящик",
        "contract.poach_trust": "Доверенный поднос пашот",
        "contract.aurora_vip": "Север VIP авроры",
        "contract.can_legend": "Коробка консервов легенды",
        "contract.poach_broth_order": "Заказ бульона пашот",
        "contract.can_medley_platter": "Поднос консервного микса",
        "contract.aurora_jack_basket": "Корзина джека авроры",
        "contract.brine_goby_crate": "Ящик бычка в рассоле",
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


def upsert_quests(quests: list) -> None:
    new_ids = {q["id"] for q in NEW_QUESTS}
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
    """Prefer full sync so all 8 locale maps stay compilable."""
    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        import subprocess

        subprocess.check_call(["python3", str(sync)], cwd=str(ROOT.parent))
        return
    if not CONTENT_STRINGS_KT.is_file():
        return
    text = CONTENT_STRINGS_KT.read_text(encoding="utf-8")
    locale_for = {
        "EN": I18N["en"],
        "ES": I18N["es"],
        "PT": I18N["pt"],
        "FR": I18N["fr"],
        "HT": I18N["ht"],
        "IT": I18N["it"],
        "CA": I18N["ca"],
        "RU": I18N["ru"],
    }

    def patch_map(src: str, map_name: str, locale_keys: dict[str, str]) -> str:
        if map_name == "RU":
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
            esc = v.replace("\\", "\\\\").replace('"', '\\"').replace("$", "\\$")
            if k not in merged:
                merged[k] = esc
                changed = True
        if not changed:
            return src
        lines = [f'        "{k}" to "{merged[k]}",' for k in sorted(merged)]
        new_body = "\n" + "\n".join(lines)
        return src[: m.start(2)] + new_body + src[m.end(2) :]

    for name in ("EN", "ES", "PT", "FR", "HT", "IT", "CA", "RU"):
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
        "phase": 16,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.quests_contracts_5.v1",
        "description": (
            "Finish 5.0 Phase 16 — raise authored quests to ≥75, delivery chains to ≥7 "
            "(aurora run + tideglass ferry), and deepen reputation-gated / board contracts. "
            "Schema stays 25 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 25,
        "questsContracts5Marker": MARKER,
        "questsMin": 75,
        "deliveryChainsMin": 7,
        "reputationGatedMin": 9,
        "contractTemplatesMin": 70,
        "newQuests": new_quest_ids,
        "newChains": new_chain_ids,
        "newChainHeads": chain_heads,
        "newReputationGated": new_rep_ids,
        "newBoardContracts": [t["id"] for t in NEW_BOARD],
        "extendsQuestsContracts4": "shared/ship/quests-contracts-4.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-5.json",
        "authorTool": "shared/tools/author_quests_contracts_5.py",
        "validateScript": "npm run quests5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "≥75 authored quests chained past market_legend",
            "≥7 delivery chains including aurora_run + tideglass_ferry",
            "≥9 reputation-gated contract templates",
            "≥70 contract templates with board depth SKUs",
            "content-strings 8 locales + ContentStrings.kt for new ids",
            "Finish 4.0 quests4:validate still green (historical floors)",
            "parity-quests-contracts-5 + quests5:validate green",
            "CI runs quests5:validate",
            "kickoff baseline.quests=75 / deliveryChains=7 / questsRemaining=0",
            "schema stays 25 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/quests-contracts-5.json",
            "shared/fixtures/parity-quests-contracts-5.json",
            "shared/ship/quests-contracts-4.json",
            "shared/content/content-pack.json",
            "shared/i18n/content-strings.en.json",
            "shared/i18n/content-strings.es.json",
            "shared/i18n/content-strings.pt.json",
            "shared/tools/author_quests_contracts_5.py",
            "web/src/ship/questsContracts5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/QuestsContracts5.kt",
            "web/scripts/validate-quests-contracts-5.ts",
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
        "schema": "fish.fixture.parity_quests_contracts_5.v1",
        "description": (
            "Finish 5.0 Phase 16: quest floor 75 + aurora/tideglass chains + rep-gate depth."
        ),
        "questsContracts5Marker": MARKER,
        "phase": 16,
        "plan": "30_finish_5.0",
        "questsMin": 75,
        "deliveryChainsMin": 7,
        "reputationGatedMin": 9,
        "contractTemplatesMin": 70,
        "newChainIds": new_chain_ids,
        "newChainHeadIds": chain_heads,
        "newChainLength": 3,
        "newRepGatedId": "contract.poach_trust",
        "newRepGatedBand": 2,
        "terminalQuestId": "quest.legend_circuit",
        "simHzInvariant": 20,
        "expect": {
            "contentVersion": "4.0.0",
            "schemaVersion": 25,
            "newQuests": len(new_quest_ids),
            "newChains": len(new_chain_ids),
            "gates": [
                "quests_75",
                "chains_7",
                "rep_gated_9",
                "templates_70",
                "kickoff_quests_met",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing(data: dict) -> None:
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
    quotas = dod.setdefault("quotas", {})
    quotas["quests"] = max(int(quotas.get("quests") or 0), 75)
    quotas["deliveryChains"] = max(int(quotas.get("deliveryChains") or 0), 7)
    dod["questsContracts5"] = {
        "phase": 16,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "questsContracts5Marker": MARKER,
        "catalog": "shared/ship/quests-contracts-5.json",
        "parityFixture": "shared/fixtures/parity-quests-contracts-5.json",
        "validateScript": "npm run quests5:validate",
        "checklist": [
            "≥75 quests chained past market_legend",
            "≥7 delivery chains (aurora_run + tideglass_ferry)",
            "≥9 reputation-gated contracts + board depth",
            "kickoff questsRemaining = 0",
            "quests5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["questsContracts5Phase"] = 16
    listing["questsContracts5Catalog"] = "shared/ship/quests-contracts-5.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["questsContracts5"] = "shared/ship/quests-contracts-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-quests-contracts-5.json" not in fixtures:
        fixtures.append("parity-quests-contracts-5.json")
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

    phase16 = next((p for p in json.loads(KICKOFF.read_text()).get("phases", []) if p.get("phase") == 16), None)
    if not phase16 or phase16.get("validate") != "quests5:validate":
        raise SystemExit("kickoff phase 16 must validate via quests5:validate")

    templates = data["contracts"]["templates"]
    chains = {t.get("chainId") for t in templates if t.get("chainId")}
    rep = sum(1 for t in templates if t.get("requiresReputationBand") is not None)
    print(
        f"OK Phase 16 quests/contracts: quests={len(data['quests'])} "
        f"chains={len(chains)} repGated={rep} templates={len(templates)} "
        f"terminal={data['quests'][-1]['id']}"
    )


if __name__ == "__main__":
    main()
