#!/usr/bin/env python3
"""
Finish 6.0 Phase 19 — tutorial friction + retention hooks 6 (nest deepen).

Usage:
  python3 shared/tools/author_tutorial_retention_6.py
"""
from __future__ import annotations

import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
FRICTION = ROOT / "content" / "tutorial-friction.json"
WEEKLY = ROOT / "content" / "weekly-retention.json"
WEEKLY_PUSH = ROOT / "push" / "local-weekly-goal-reminders.json"
SHIP = ROOT / "ship" / "tutorial-retention-6.json"
PARITY = ROOT / "fixtures" / "parity-tutorial-retention-6.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
I18N_PATHS = {
    "en": ROOT / "i18n" / "content-strings.en.json",
    "es": ROOT / "i18n" / "content-strings.es.json",
    "pt": ROOT / "i18n" / "content-strings.pt.json",
    "fr": ROOT / "i18n" / "content-strings.fr.json",
    "ht": ROOT / "i18n" / "content-strings.ht.json",
    "it": ROOT / "i18n" / "content-strings.it.json",
    "ca": ROOT / "i18n" / "content-strings.ca.json",
    "ru": ROOT / "i18n" / "content-strings.ru.json",
}
TUTORIAL_FRICTION_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/TutorialFriction.kt"
)
WEEKLY_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/WeeklyGoals.kt"
)

MARKER = "authored-finish-6.0-phase-19"
OPEN_GAP_MIN = 10

HIGH_FRICTION = [
    "tutorial.catch_three",
    "tutorial.deliver_cutter",
    "tutorial.buy_upgrade",
    "tutorial.first_contract",
    "tutorial.hire_staff",
    "tutorial.grill_line",
    "tutorial.plot_marker",
    "tutorial.roast_nest",
    "tutorial.ferment_line",
]

NEW_TUTORIAL_STEPS = [
    {
        "id": "tutorial.roast_nest",
        "text": "Feed the harbor roaster — walk stock onto the roast In pad to start the nest line",
        "advanceOn": {"kind": "enter_zone", "zone": "zone.roaster_in"},
    },
    {
        "id": "tutorial.ferment_line",
        "text": "Start the ferment nest — walk goods onto the fermenter In pad",
        "advanceOn": {"kind": "enter_zone", "zone": "zone.fermenter_in"},
    },
]

COPY_PATCHES = [
    {"stepId": "tutorial.walk_to_pier", "text": "Walk to the pier tip — stand where the boards meet the water"},
    {"stepId": "tutorial.catch_three", "text": "Catch 3 fish: hold Cast to charge, then tap Reel in the green window"},
    {"stepId": "tutorial.deliver_cutter", "text": "Carry fish onto the teal In pad on the cutter's left — nearby drops do not count"},
    {"stepId": "tutorial.collect_output", "text": "Pick up portions from the Out pad on the cutter's right"},
    {"stepId": "tutorial.stock_counter", "text": "Stock the counter pad so waiting customers can buy"},
    {"stepId": "tutorial.serve_customer", "text": "Stay at the counter — sales ring up when the pad has stock"},
    {"stepId": "tutorial.buy_upgrade", "text": "Open Upgrades (U) and buy Bag capacity with your sale coins"},
    {"stepId": "tutorial.first_contract", "text": "Open Jobs, accept a harbor contract, then deliver the listed goods"},
    {"stepId": "tutorial.hire_staff", "text": "After Make 10 sales unlocks hiring, open Staff and hire your first hand"},
    {"stepId": "tutorial.grill_line", "text": "When the grill unlocks, walk fish onto the charcoal In pad — that starts the mid-game line"},
    {"stepId": "tutorial.plot_marker", "text": "Stand on an expansion marker and confirm spend to place a new pad"},
    {"stepId": "tutorial.roast_nest", "text": "Feed the harbor roaster — walk stock onto the roast In pad to start the nest line"},
    {"stepId": "tutorial.ferment_line", "text": "Start the ferment nest — walk goods onto the fermenter In pad"},
]

NUDGES = [
    {"stepId": "tutorial.catch_three", "hintAfterMs": 7000, "nudge": "Tip: hold Cast to charge, release into the green Reel window — early taps miss"},
    {"stepId": "tutorial.deliver_cutter", "hintAfterMs": 8000, "nudge": "Tip: walk fully onto the left teal In pad — dropping beside it does nothing"},
    {"stepId": "tutorial.buy_upgrade", "hintAfterMs": 9000, "nudge": "Tip: tap Upgrades (or press U) — Bag capacity is the first buy"},
    {"stepId": "tutorial.first_contract", "hintAfterMs": 10000, "nudge": "Tip: Jobs lists contracts; accept one, then carry the goods to the drop"},
    {"stepId": "tutorial.hire_staff", "hintAfterMs": 11000, "nudge": "Tip: keep selling until Make 10 sales, then Staff unlocks Hire"},
    {"stepId": "tutorial.grill_line", "hintAfterMs": 10000, "nudge": "Tip: the grill In pad is charcoal-side — walk onto it with fish in the bag"},
    {"stepId": "tutorial.plot_marker", "hintAfterMs": 11000, "nudge": "Tip: stand centered on the glowing expansion marker, then confirm the spend"},
    {"stepId": "tutorial.roast_nest", "hintAfterMs": 11000, "nudge": "Tip: the roast nest In pad unlocks with the harbor roaster — walk onto it with stock"},
    {"stepId": "tutorial.ferment_line", "hintAfterMs": 12000, "nudge": "Tip: fermenter In is on the nest ferment line — carry goods onto that pad"},
]

NEW_DAILY = [
    {
        "id": "daily.roast_plate",
        "name": "Roast plate",
        "description": "Ring up 3 premium sales today.",
        "goal": {"stat": "stat.premium_sales", "atLeast": 3},
        "rewardCoins": 30,
        "weight": 15,
    },
    {
        "id": "daily.nest_haul",
        "name": "Nest haul",
        "description": "Move 8 worker hauls today.",
        "goal": {"stat": "stat.worker_items_moved", "atLeast": 8},
        "rewardCoins": 28,
        "weight": 15,
    },
    {
        "id": "daily.ember_loan",
        "name": "Ember loan",
        "description": "Repay any loan principal today.",
        "goal": {"stat": "stat.loan_repaid", "atLeast": 1},
        "rewardCoins": 34,
        "weight": 12,
    },
    {
        "id": "daily.sigil_seek",
        "name": "Sigil seek",
        "description": "Earn 1 endgame sigil today.",
        "goal": {"stat": "stat.endgame_sigils_earned", "atLeast": 1},
        "rewardCoins": 40,
        "weight": 12,
    },
]

NEW_WEEKLY = [
    {
        "id": "weekly.nest_ember",
        "name": "Nest ember week",
        "description": "Earn 2 endgame sigils this week.",
        "goal": {"stat": "stat.endgame_sigils_earned", "atLeast": 2},
        "rewardCoins": 120,
        "weight": 28,
    },
    {
        "id": "weekly.saffron_circuit",
        "name": "Saffron circuit",
        "description": "Travel between harbors 6 times this week.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 6},
        "rewardCoins": 115,
        "weight": 28,
    },
]

# Full weekly pool = prior wave-5 + nest weeklies (author rewrites weekly catalog).
WEEKLY_OBJECTIVES = [
    {
        "id": "weekly.rival_week",
        "name": "Rival week",
        "description": "Beat 3 rival markets this week.",
        "goal": {"stat": "stat.rival_beats", "atLeast": 3},
        "rewardCoins": 90,
        "weight": 40,
    },
    {
        "id": "weekly.chain_week",
        "name": "Chain week",
        "description": "Complete 2 delivery chains this week.",
        "goal": {"stat": "stat.contract_chains_completed", "atLeast": 2},
        "rewardCoins": 100,
        "weight": 35,
    },
    {
        "id": "weekly.harbor_circuit",
        "name": "Harbor circuit",
        "description": "Travel between harbors 4 times this week.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 4},
        "rewardCoins": 85,
        "weight": 35,
    },
    {
        "id": "weekly.quest_surge",
        "name": "Quest surge",
        "description": "Complete 5 quests this week.",
        "goal": {"stat": "stat.quests_completed", "atLeast": 5},
        "rewardCoins": 110,
        "weight": 30,
    },
    *NEW_WEEKLY,
]

I18N = {
    "en": {},
    "es": {
        "daily.roast_plate": "Plato asado",
        "daily.nest_haul": "Carga del nido",
        "daily.ember_loan": "Préstamo brasa",
        "daily.sigil_seek": "Busca de sigilo",
        "weekly.nest_ember": "Semana brasa del nido",
        "weekly.saffron_circuit": "Circuito azafrán",
        "tutorial.roast_nest": "Nido asado",
        "tutorial.ferment_line": "Línea de fermento",
    },
    "pt": {
        "daily.roast_plate": "Prato assado",
        "daily.nest_haul": "Carga do ninho",
        "daily.ember_loan": "Empréstimo brasa",
        "daily.sigil_seek": "Busca de sigilo",
        "weekly.nest_ember": "Semana brasa do ninho",
        "weekly.saffron_circuit": "Circuito açafrão",
        "tutorial.roast_nest": "Ninho assado",
        "tutorial.ferment_line": "Linha de fermento",
    },
    "fr": {
        "daily.roast_plate": "Assiette rôtie",
        "daily.nest_haul": "Transport du nid",
        "daily.ember_loan": "Prêt braise",
        "daily.sigil_seek": "Quête de sigille",
        "weekly.nest_ember": "Semaine braise du nid",
        "weekly.saffron_circuit": "Circuit safran",
        "tutorial.roast_nest": "Nid rôti",
        "tutorial.ferment_line": "Ligne de ferment",
    },
    "ht": {
        "daily.roast_plate": "Plat griye",
        "daily.nest_haul": "Chaj nich",
        "daily.ember_loan": "Prè braise",
        "daily.sigil_seek": "Chèche sigil",
        "weekly.nest_ember": "Semèn braise nich",
        "weekly.saffron_circuit": "Sikui safran",
        "tutorial.roast_nest": "Nich griye",
        "tutorial.ferment_line": "Liy ferment",
    },
    "it": {
        "daily.roast_plate": "Piatto arrostito",
        "daily.nest_haul": "Trasporto del nido",
        "daily.ember_loan": "Prestito brace",
        "daily.sigil_seek": "Cerca sigillo",
        "weekly.nest_ember": "Settimana brace del nido",
        "weekly.saffron_circuit": "Circuito zafferano",
        "tutorial.roast_nest": "Nido arrosto",
        "tutorial.ferment_line": "Linea fermento",
    },
    "ca": {
        "daily.roast_plate": "Plat rostit",
        "daily.nest_haul": "Càrrega del niu",
        "daily.ember_loan": "Préstec brasa",
        "daily.sigil_seek": "Cerca de sigil",
        "weekly.nest_ember": "Setmana brasa del niu",
        "weekly.saffron_circuit": "Circuit safrà",
        "tutorial.roast_nest": "Niu rostit",
        "tutorial.ferment_line": "Línia de ferment",
    },
    "ru": {
        "daily.roast_plate": "Жареная тарелка",
        "daily.nest_haul": "Перевозка гнезда",
        "daily.ember_loan": "Заём углей",
        "daily.sigil_seek": "Поиск сигила",
        "weekly.nest_ember": "Неделя углей гнезда",
        "weekly.saffron_circuit": "Шафрановый контур",
        "tutorial.roast_nest": "Жареное гнездо",
        "tutorial.ferment_line": "Линия фермента",
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


def fill_en() -> None:
    for o in NEW_DAILY:
        I18N["en"][o["id"]] = o["name"]
    for o in NEW_WEEKLY:
        I18N["en"][o["id"]] = o["name"]
    for s in NEW_TUTORIAL_STEPS:
        I18N["en"][s["id"]] = s["id"].split(".")[-1].replace("_", " ").title()


def write_friction() -> None:
    friction = json.loads(FRICTION.read_text(encoding="utf-8"))
    friction["description"] = (
        "Finish 6.0 Phase 19 — nest mid-game tutorial friction deepen. "
        "Adds roast_nest / ferment_line friction + nudges; prior steps stay."
    )
    friction["phaseNote"] = "finish-6.0-phase-19"
    # Keep Phase-22 freeze stamps; live pack is 5.0.0 / schema 27.
    friction["contentVersion"] = "1.0.0"
    friction["schemaVersion"] = 21
    friction["funnel"]["highFrictionStepIds"] = list(HIGH_FRICTION)
    friction["funnel"]["dropHypotheses"] = [
        {"stepId": "tutorial.catch_three", "reason": "Cast/reel timing window unclear"},
        {"stepId": "tutorial.deliver_cutter", "reason": "Teal In pad vs nearby drop confusion"},
        {"stepId": "tutorial.buy_upgrade", "reason": "Upgrades panel undiscovered"},
        {"stepId": "tutorial.first_contract", "reason": "Jobs panel opaque after first sale"},
        {"stepId": "tutorial.hire_staff", "reason": "Hire gated behind Make 10 sales"},
        {"stepId": "tutorial.grill_line", "reason": "Mid-game grill In pad not obvious after hire"},
        {"stepId": "tutorial.plot_marker", "reason": "Expansion marker confirm spend missed"},
        {"stepId": "tutorial.roast_nest", "reason": "Roaster In pad not obvious after nest unlock"},
        {"stepId": "tutorial.ferment_line", "reason": "Fermenter In pad missed on nest line"},
    ]
    friction["copyPatches"] = COPY_PATCHES
    friction["timing"]["defaultHintAfterMs"] = 9000
    friction["timing"]["nudges"] = NUDGES
    frozen = friction.setdefault("frozenAdvanceOn", {})
    for step in NEW_TUTORIAL_STEPS:
        frozen[step["id"]] = step["advanceOn"]
    # Soft-floor: nest steps are intentional additions for Finish 6.0 Phase 19.
    constraints = friction.setdefault("constraints", {})
    constraints["noSchemaBreak"] = True
    constraints["noAdvanceOnChanges"] = True
    constraints["noStepIdChanges"] = True
    constraints["noContentVersionBump"] = True
    constraints["note"] = (
        "Finish 6.0 Phase 19 may append nest tutorial steps; prior advanceOn stay frozen. "
        "tutorial:validate soft-floors step-id appends after Phase 19."
    )
    dump(FRICTION, friction)


def write_weekly_catalog() -> None:
    catalog = {
        "phase": 19,
        "plan": "30_finish_6.0",
        "schema": "fish.content.weekly_retention.v1",
        "description": (
            "Finish 6.0 Phase 19 — weekly retention deepen (nest ember + saffron circuit). "
            "Week state lives in GameState.stats (no save-schema bump)."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "weekLengthDays": 7,
        "boardSlots": 3,
        "weekBonusCoins": 50,
        "objectivesMin": 6,
        "objectives": WEEKLY_OBJECTIVES,
        "reminder": {
            "catalog": "shared/push/local-weekly-goal-reminders.json",
            "defaultLocalHour": 17,
            "defaultLocalMinute": 30,
            "channelId": "weekly_goals",
        },
        "stats": [
            "stat.weekly_goals_claimed",
            "stat.weekly_goals_week_id",
        ],
    }
    dump(WEEKLY, catalog)

    push = json.loads(WEEKLY_PUSH.read_text(encoding="utf-8"))
    push["phase"] = 19
    push["plan"] = "30_finish_6.0"
    push["description"] = (
        "Finish 6.0 Phase 19 — local weekly-goal push reminder policy (opt-in). "
        "Extends Finish 5.0 weekly reminders; no remote FCM."
    )
    dump(WEEKLY_PUSH, push)


def patch_tutorial_friction_kt() -> None:
    if not TUTORIAL_FRICTION_KT.is_file():
        return
    text = TUTORIAL_FRICTION_KT.read_text(encoding="utf-8")
    high = ",\n".join(f'        "{s}"' for s in HIGH_FRICTION)
    text = re.sub(
        r"val HIGH_FRICTION_STEP_IDS: List<String> = listOf\([\s\S]*?\)",
        f"val HIGH_FRICTION_STEP_IDS: List<String> = listOf(\n{high},\n    )",
        text,
        count=1,
    )
    nudge_blocks = []
    for n in NUDGES:
        nudge = n["nudge"].replace('\\', '\\\\').replace('"', '\\"')
        nudge_blocks.append(
            f'        Nudge("{n["stepId"]}", {n["hintAfterMs"]}, "{nudge}"),'
        )
    nudges = "\n".join(nudge_blocks)
    text = re.sub(
        r"val NUDGES: List<Nudge> = listOf\([\s\S]*?\)\n",
        f"val NUDGES: List<Nudge> = listOf(\n{nudges}\n    )\n",
        text,
        count=1,
    )
    TUTORIAL_FRICTION_KT.write_text(text, encoding="utf-8")


def patch_weekly_goals_kt() -> None:
    if not WEEKLY_KT.is_file():
        return
    text = WEEKLY_KT.read_text(encoding="utf-8")
    text = text.replace("const val BOARD_SLOTS = 2", "const val BOARD_SLOTS = 3")
    text = text.replace("const val WEEK_BONUS_COINS = 40L", "const val WEEK_BONUS_COINS = 50L")
    blocks = []
    for o in WEEKLY_OBJECTIVES:
        stat = o["goal"]["stat"].replace("stat.", "Stats.").upper()
        # Map known stats to Kotlin constants
        stat_map = {
            "stat.rival_beats": "Stats.RIVAL_BEATS",
            "stat.contract_chains_completed": "Stats.CONTRACT_CHAINS_COMPLETED",
            "stat.harbors_traveled": "Stats.HARBORS_TRAVELED",
            "stat.quests_completed": "Stats.QUESTS_COMPLETED",
            "stat.endgame_sigils_earned": "Stats.ENDGAME_SIGILS_EARNED",
        }
        stat_kt = stat_map.get(o["goal"]["stat"], "Stats.QUESTS_COMPLETED")
        blocks.append(
            "        WeeklyObjectiveDef(\n"
            f'            "{o["id"]}", "{o["name"]}", "{o["description"]}",\n'
            f'            {stat_kt}, {o["goal"]["atLeast"]}, {o["rewardCoins"]}, {o["weight"]},\n'
            "        ),"
        )
    objectives = "\n".join(blocks)
    text = re.sub(
        r"val OBJECTIVES: List<WeeklyObjectiveDef> = listOf\([\s\S]*?\)\n",
        f"val OBJECTIVES: List<WeeklyObjectiveDef> = listOf(\n{objectives}\n    )\n",
        text,
        count=1,
    )
    WEEKLY_KT.write_text(text, encoding="utf-8")


def write_ship(data: dict) -> None:
    daily = data["dailyGoals"]
    catalog = {
        "phase": 19,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.tutorial_retention_6.v1",
        "description": (
            "Finish 6.0 Phase 19 — nest mid-game tutorial friction + retention deepen. "
            "roast_nest/ferment_line friction, daily ≥18 / boardSlots ≥6, weekly ≥6 / slots ≥3. "
            "Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "tutorialRetention6Marker": MARKER,
        "tutorialStepsMin": 13,
        "highFrictionMin": 9,
        "nudgesMin": 9,
        "dailyObjectivesMin": 18,
        "boardSlotsMin": 6,
        "weeklyObjectivesMin": 6,
        "weeklyBoardSlotsMin": 3,
        "maxStreakBonusDaysMin": 21,
        "newDailyObjectiveIds": [o["id"] for o in NEW_DAILY],
        "newWeeklyObjectiveIds": [o["id"] for o in NEW_WEEKLY],
        "newTutorialStepIds": [s["id"] for s in NEW_TUTORIAL_STEPS],
        "midGameFrictionIds": ["tutorial.roast_nest", "tutorial.ferment_line"],
        "extendsTutorialFriction": "shared/content/tutorial-friction.json",
        "extendsTutorialRetention5": "shared/ship/tutorial-retention-5.json",
        "weeklyRetentionCatalog": "shared/content/weekly-retention.json",
        "weeklyPushCatalog": "shared/push/local-weekly-goal-reminders.json",
        "parityFixture": "shared/fixtures/parity-tutorial-retention-6.json",
        "authorTool": "shared/tools/author_tutorial_retention_6.py",
        "validateScript": "npm run tutorialretention6:validate",
        "softTutorialRetention5Validate": "npm run tutorialretention5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "≥9 high-friction tutorial steps including roast_nest + ferment_line",
            "≥9 dwell nudges + nest mid-game copy",
            "≥18 daily objectives / boardSlots ≥6 / streak bonus days ≥21",
            "≥6 weekly retention objectives / boardSlots ≥3",
            "kickoff tutorialRetention6Incomplete=false",
            "tutorialretention5:validate soft-green",
            "tutorialretention6:validate green in CI",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 11→10",
        ],
        "preflightGates": [
            "shared/ship/tutorial-retention-6.json",
            "shared/fixtures/parity-tutorial-retention-6.json",
            "shared/ship/tutorial-retention-5.json",
            "shared/content/tutorial-friction.json",
            "shared/content/weekly-retention.json",
            "shared/push/local-weekly-goal-reminders.json",
            "shared/content/content-pack.json",
            "shared/tools/author_tutorial_retention_6.py",
            "web/src/ship/tutorialRetention6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/TutorialRetention6.kt",
            "web/scripts/validate-tutorial-retention-6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/WeeklyGoals.kt",
            "web/src/engine/weeklyGoals.ts",
        ],
        "measured": {
            "tutorialSteps": len(data["tutorial"]),
            "highFriction": len(HIGH_FRICTION),
            "nudges": len(NUDGES),
            "dailyObjectives": len(daily["objectives"]),
            "boardSlots": daily["boardSlots"],
            "weeklyObjectives": len(WEEKLY_OBJECTIVES),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_tutorial_retention_6.v1",
        "tutorialRetention6Marker": MARKER,
        "phase": 19,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 19: nest roast_nest/ferment_line friction + nest dailies/weeklies; "
            "daily boardSlots ≥6 / weekly slots ≥3."
        ),
        "sampleFrictionStepId": "tutorial.roast_nest",
        "sampleWeeklyObjectiveId": "weekly.nest_ember",
        "sampleDailyObjectiveId": "daily.roast_plate",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "highFrictionMin": 9,
            "nudgesMin": 9,
            "dailyObjectivesMin": 18,
            "boardSlotsMin": 6,
            "weeklyObjectivesMin": 6,
            "weeklyBoardSlotsMin": 3,
            "tutorialRetention6Incomplete": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "friction_nest",
                "daily_18",
                "weekly_6",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(data: dict) -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["tutorialRetention6Incomplete"] = False
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
        "parity-economy-bank-4.json",
        "parity-offline-cloud-4.json",
    ):
        path = ROOT / "fixtures" / rel
        if not path.is_file():
            continue
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["dailyObjectives"] = max(int(quotas.get("dailyObjectives") or 0), 18)
    quotas["weeklyObjectives"] = max(int(quotas.get("weeklyObjectives") or 0), 6)
    dod["notes"] = (
        "Finish 6.0 Phase 19 tutorial-retention-6 complete (nest friction + daily/weekly deepen); "
        "Phases 1–18 remain green. Content stays 5.0.0 / schema 27. tutorialRetention6Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["tutorialRetention6"] = {
        "phase": 19,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "tutorialRetention6Marker": MARKER,
        "catalog": "shared/ship/tutorial-retention-6.json",
        "parityFixture": "shared/fixtures/parity-tutorial-retention-6.json",
        "validateScript": "npm run tutorialretention6:validate",
        "checklist": [
            "nest roast/ferment friction",
            "daily ≥18 / boardSlots ≥6",
            "weekly ≥6 / slots ≥3",
            "kickoff tutorialRetention6Incomplete=false",
            "tutorialretention6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["tutorialRetention6Phase"] = 19
    listing["tutorialRetention6Catalog"] = "shared/ship/tutorial-retention-6.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["tutorialRetention6"] = "shared/ship/tutorial-retention-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-tutorial-retention-6.json" not in fixtures:
        fixtures.append("parity-tutorial-retention-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    fill_en()
    data = json.loads(PACK.read_text(encoding="utf-8"))

    by_patch = {p["stepId"]: p["text"] for p in COPY_PATCHES}
    for step in data["tutorial"]:
        if step["id"] in by_patch:
            step["text"] = by_patch[step["id"]]
    upsert_list(data["tutorial"], NEW_TUTORIAL_STEPS)

    upsert_list(data["dailyGoals"]["objectives"], NEW_DAILY)
    data["dailyGoals"]["boardSlots"] = max(int(data["dailyGoals"]["boardSlots"]), 6)
    data["dailyGoals"]["maxStreakBonusDays"] = max(
        int(data["dailyGoals"]["maxStreakBonusDays"]), 21
    )
    data["dailyGoals"]["streakBonusCoinsPerDay"] = max(
        int(data["dailyGoals"]["streakBonusCoinsPerDay"]), 10
    )

    dump(PACK, data)
    write_friction()
    write_weekly_catalog()
    patch_tutorial_friction_kt()
    patch_weekly_goals_kt()

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    write_ship(data)
    update_kickoff_dod_listing_pin(data)

    print(
        f"OK Phase 19 tutorial-retention-6: tutorial={len(data['tutorial'])} "
        f"friction={len(HIGH_FRICTION)} daily={len(data['dailyGoals']['objectives'])} "
        f"slots={data['dailyGoals']['boardSlots']} weekly={len(WEEKLY_OBJECTIVES)} "
        f"openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
