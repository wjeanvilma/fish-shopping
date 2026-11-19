#!/usr/bin/env python3
"""
Finish 5.0 Phase 19 — tutorial friction rewrite + retention hooks.

Usage:
  python3 shared/tools/author_tutorial_retention_5.py
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
SHIP = ROOT / "ship" / "tutorial-retention-5.json"
PARITY = ROOT / "fixtures" / "parity-tutorial-retention-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
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

MARKER = "authored-finish-5.0-phase-19"

HIGH_FRICTION = [
    "tutorial.catch_three",
    "tutorial.deliver_cutter",
    "tutorial.buy_upgrade",
    "tutorial.first_contract",
    "tutorial.hire_staff",
    "tutorial.grill_line",
    "tutorial.plot_marker",
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
]

NUDGES = [
    {"stepId": "tutorial.catch_three", "hintAfterMs": 7000, "nudge": "Tip: hold Cast to charge, release into the green Reel window — early taps miss"},
    {"stepId": "tutorial.deliver_cutter", "hintAfterMs": 8000, "nudge": "Tip: walk fully onto the left teal In pad — dropping beside it does nothing"},
    {"stepId": "tutorial.buy_upgrade", "hintAfterMs": 9000, "nudge": "Tip: tap Upgrades (or press U) — Bag capacity is the first buy"},
    {"stepId": "tutorial.first_contract", "hintAfterMs": 10000, "nudge": "Tip: Jobs lists contracts; accept one, then carry the goods to the drop"},
    {"stepId": "tutorial.hire_staff", "hintAfterMs": 11000, "nudge": "Tip: keep selling until Make 10 sales, then Staff unlocks Hire"},
    {"stepId": "tutorial.grill_line", "hintAfterMs": 10000, "nudge": "Tip: the grill In pad is charcoal-side — walk onto it with fish in the bag"},
    {"stepId": "tutorial.plot_marker", "hintAfterMs": 11000, "nudge": "Tip: stand centered on the glowing expansion marker, then confirm the spend"},
]

NEW_DAILY = [
    {
        "id": "daily.quest_push",
        "name": "Quest push",
        "description": "Complete 1 quest today.",
        "goal": {"stat": "stat.quests_completed", "atLeast": 1},
        "rewardCoins": 26,
        "weight": 16,
    },
    {
        "id": "daily.chain_run",
        "name": "Chain run",
        "description": "Finish 1 delivery-chain contract today.",
        "goal": {"stat": "stat.contract_chains_completed", "atLeast": 1},
        "rewardCoins": 32,
        "weight": 14,
    },
    {
        "id": "daily.harbor_hop",
        "name": "Harbor hop",
        "description": "Travel between harbors once today.",
        "goal": {"stat": "stat.harbors_traveled", "atLeast": 1},
        "rewardCoins": 24,
        "weight": 14,
    },
    {
        "id": "daily.premium_plate",
        "name": "Premium plate",
        "description": "Ring up 2 premium sales today.",
        "goal": {"stat": "stat.premium_sales", "atLeast": 2},
        "rewardCoins": 28,
        "weight": 14,
    },
]

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
]

I18N = {
    "en": {},
    "es": {
        "daily.quest_push": "Empuje de misión",
        "daily.chain_run": "Carrera de cadena",
        "daily.harbor_hop": "Salto de puerto",
        "daily.premium_plate": "Plato premium",
        "weekly.rival_week": "Semana rival",
        "weekly.chain_week": "Semana de cadenas",
        "weekly.harbor_circuit": "Circuito de puertos",
        "weekly.quest_surge": "Oleada de misiones",
    },
    "pt": {
        "daily.quest_push": "Empurrão de missão",
        "daily.chain_run": "Corrida de cadeia",
        "daily.harbor_hop": "Salto de porto",
        "daily.premium_plate": "Prato premium",
        "weekly.rival_week": "Semana rival",
        "weekly.chain_week": "Semana de cadeias",
        "weekly.harbor_circuit": "Circuito de portos",
        "weekly.quest_surge": "Onda de missões",
    },
    "fr": {
        "daily.quest_push": "Poussée de quête",
        "daily.chain_run": "Course de chaîne",
        "daily.harbor_hop": "Saut de port",
        "daily.premium_plate": "Assiette premium",
        "weekly.rival_week": "Semaine rivale",
        "weekly.chain_week": "Semaine de chaînes",
        "weekly.harbor_circuit": "Circuit des ports",
        "weekly.quest_surge": "Vague de quêtes",
    },
    "ht": {
        "daily.quest_push": "Pouse misyon",
        "daily.chain_run": "Kous chèn",
        "daily.harbor_hop": "Sote pò",
        "daily.premium_plate": "Plat premium",
        "weekly.rival_week": "Semèn rival",
        "weekly.chain_week": "Semèn chèn",
        "weekly.harbor_circuit": "Sikui pò",
        "weekly.quest_surge": "Vague misyon",
    },
    "it": {
        "daily.quest_push": "Spinta missione",
        "daily.chain_run": "Corsa catena",
        "daily.harbor_hop": "Salto porto",
        "daily.premium_plate": "Piatto premium",
        "weekly.rival_week": "Settimana rivale",
        "weekly.chain_week": "Settimana catene",
        "weekly.harbor_circuit": "Circuito porti",
        "weekly.quest_surge": "Ondata missioni",
    },
    "ca": {
        "daily.quest_push": "Empenta de missió",
        "daily.chain_run": "Cursa de cadena",
        "daily.harbor_hop": "Salt de port",
        "daily.premium_plate": "Plat premium",
        "weekly.rival_week": "Setmana rival",
        "weekly.chain_week": "Setmana de cadenes",
        "weekly.harbor_circuit": "Circuit de ports",
        "weekly.quest_surge": "Onada de missions",
    },
    "ru": {
        "daily.quest_push": "Рывок квеста",
        "daily.chain_run": "Забег цепи",
        "daily.harbor_hop": "Скачок гавани",
        "daily.premium_plate": "Премиум-блюдо",
        "weekly.rival_week": "Неделя соперников",
        "weekly.chain_week": "Неделя цепей",
        "weekly.harbor_circuit": "Гаванный контур",
        "weekly.quest_surge": "Волна квестов",
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
    for o in WEEKLY_OBJECTIVES:
        I18N["en"][o["id"]] = o["name"]


def write_friction() -> None:
    friction = json.loads(FRICTION.read_text(encoding="utf-8"))
    friction["description"] = (
        "Finish 5.0 Phase 19 — first-session + mid-game tutorial friction rewrite. "
        "Copy + dwell nudges only; advanceOn triggers and step ids stay frozen."
    )
    friction["phaseNote"] = "finish-5.0-phase-19"
    friction["funnel"]["highFrictionStepIds"] = list(HIGH_FRICTION)
    friction["funnel"]["dropHypotheses"] = [
        {"stepId": "tutorial.catch_three", "reason": "Cast/reel timing window unclear"},
        {"stepId": "tutorial.deliver_cutter", "reason": "Teal In pad vs nearby drop confusion"},
        {"stepId": "tutorial.buy_upgrade", "reason": "Upgrades panel undiscovered"},
        {"stepId": "tutorial.first_contract", "reason": "Jobs panel opaque after first sale"},
        {"stepId": "tutorial.hire_staff", "reason": "Hire gated behind Make 10 sales"},
        {"stepId": "tutorial.grill_line", "reason": "Mid-game grill In pad not obvious after hire"},
        {"stepId": "tutorial.plot_marker", "reason": "Expansion marker confirm spend missed"},
    ]
    friction["copyPatches"] = COPY_PATCHES
    friction["timing"]["defaultHintAfterMs"] = 9000
    friction["timing"]["nudges"] = NUDGES
    dump(FRICTION, friction)


def write_weekly_catalog() -> None:
    catalog = {
        "phase": 19,
        "plan": "30_finish_5.0",
        "schema": "fish.content.weekly_retention.v1",
        "description": (
            "Finish 5.0 Phase 19 — weekly retention objectives + reminder policy. "
            "Week state lives in GameState.stats (no save-schema bump)."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "weekLengthDays": 7,
        "boardSlots": 2,
        "weekBonusCoins": 40,
        "objectivesMin": 4,
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

    push = {
        "schema": "fish.push.local_weekly_goal_reminders.v1",
        "phase": 19,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 19 — local weekly-goal push reminder policy (opt-in). "
            "Complements Finish 3.0 daily reminders; no remote FCM."
        ),
        "defaultLocalHour": 17,
        "defaultLocalMinute": 30,
        "channelId": "weekly_goals",
        "channelName": "Weekly goals",
        "notificationId": 1901,
        "requestCode": 1901,
        "titleKey": "push.weeklyGoalTitle",
        "bodyKey": "push.weeklyGoalBody",
        "optInDefault": False,
        "requiresUnclaimedGoals": True,
        "extendsDailyReminders": "shared/push/local-daily-goal-reminders.json",
        "webStorageLastWeekKey": "fish-shopping-weekly-reminder-last-week",
    }
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
        nudge_blocks.append(
            f'        Nudge("{n["stepId"]}", {n["hintAfterMs"]}, "{n["nudge"]}"),'
        )
    nudges = "\n".join(nudge_blocks)
    text = re.sub(
        r"val NUDGES: List<Nudge> = listOf\([\s\S]*?\)\n",
        f"val NUDGES: List<Nudge> = listOf(\n{nudges}\n    )\n",
        text,
        count=1,
    )
    text = text.replace(
        "const val DEFAULT_HINT_AFTER_MS = 10_000",
        "const val DEFAULT_HINT_AFTER_MS = 9_000",
    )
    TUTORIAL_FRICTION_KT.write_text(text, encoding="utf-8")


def write_ship(data: dict) -> None:
    daily = data["dailyGoals"]
    catalog = {
        "phase": 19,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.tutorial_retention_5.v1",
        "description": (
            "Finish 5.0 Phase 19 — first-session + mid-game tutorial friction rewrite, "
            "daily goals deepen (≥14 / boardSlots ≥5), weekly retention objectives + reminder policy. "
            "Schema stays 26 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "tutorialRetention5Marker": MARKER,
        "tutorialStepsMin": 11,
        "highFrictionMin": 7,
        "nudgesMin": 7,
        "dailyObjectivesMin": 14,
        "boardSlotsMin": 5,
        "weeklyObjectivesMin": 4,
        "weeklyBoardSlotsMin": 2,
        "maxStreakBonusDaysMin": 14,
        "newDailyObjectiveIds": [o["id"] for o in NEW_DAILY],
        "newWeeklyObjectiveIds": [o["id"] for o in WEEKLY_OBJECTIVES],
        "midGameFrictionIds": ["tutorial.grill_line", "tutorial.plot_marker"],
        "extendsTutorialFriction": "shared/content/tutorial-friction.json",
        "weeklyRetentionCatalog": "shared/content/weekly-retention.json",
        "weeklyPushCatalog": "shared/push/local-weekly-goal-reminders.json",
        "parityFixture": "shared/fixtures/parity-tutorial-retention-5.json",
        "authorTool": "shared/tools/author_tutorial_retention_5.py",
        "validateScript": "npm run tutorialretention5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "≥7 high-friction tutorial steps including grill_line + plot_marker",
            "≥7 dwell nudges + rewritten first-session/mid-game copy",
            "≥14 daily objectives / boardSlots ≥5 / streak bonus days ≥14",
            "≥4 weekly retention objectives + local weekly reminder policy",
            "kickoff tutorialRetentionIncomplete=false",
            "tutorial:validate / dailygoals:validate / localpush:validate soft-green",
            "tutorialretention5:validate green in CI",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/tutorial-retention-5.json",
            "shared/fixtures/parity-tutorial-retention-5.json",
            "shared/content/tutorial-friction.json",
            "shared/content/weekly-retention.json",
            "shared/push/local-weekly-goal-reminders.json",
            "shared/content/content-pack.json",
            "shared/tools/author_tutorial_retention_5.py",
            "web/src/ship/tutorialRetention5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/TutorialRetention5.kt",
            "web/scripts/validate-tutorial-retention-5.ts",
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
        "schema": "fish.fixture.parity_tutorial_retention_5.v1",
        "tutorialRetention5Marker": MARKER,
        "phase": 19,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 19: mid-game grill_line friction nudge + weekly rival board slot "
            "from week seed; daily boardSlots ≥5."
        ),
        "sampleFrictionStepId": "tutorial.grill_line",
        "sampleWeeklyObjectiveId": "weekly.rival_week",
        "sampleDailyObjectiveId": "daily.quest_push",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "highFrictionMin": 7,
            "nudgesMin": 7,
            "dailyObjectivesMin": 14,
            "boardSlotsMin": 5,
            "weeklyObjectivesMin": 4,
            "tutorialRetentionIncomplete": False,
            "gates": [
                "friction_midgame",
                "daily_14",
                "weekly_4",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["tutorialRetentionIncomplete"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["dailyObjectives"] = max(int(quotas.get("dailyObjectives") or 0), 14)
    quotas["weeklyObjectives"] = max(int(quotas.get("weeklyObjectives") or 0), 4)
    dod["notes"] = (
        "Finish 5.0 Phase 19 tutorial-retention-5 complete (friction rewrite + daily/weekly retention); "
        "Phases 1–18 remain green. Content stays 4.0.0 / schema 26. tutorialRetentionIncomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["tutorialRetention5"] = {
        "phase": 19,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "tutorialRetention5Marker": MARKER,
        "catalog": "shared/ship/tutorial-retention-5.json",
        "parityFixture": "shared/fixtures/parity-tutorial-retention-5.json",
        "validateScript": "npm run tutorialretention5:validate",
        "checklist": [
            "mid-game friction + first-session copy rewrite",
            "daily ≥14 / boardSlots ≥5",
            "weekly ≥4 + reminder policy",
            "kickoff tutorialRetentionIncomplete=false",
            "tutorialretention5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["tutorialRetention5Phase"] = 19
    listing["tutorialRetention5Catalog"] = "shared/ship/tutorial-retention-5.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["tutorialRetention5"] = "shared/ship/tutorial-retention-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-tutorial-retention-5.json" not in fixtures:
        fixtures.append("parity-tutorial-retention-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    fill_en()
    data = json.loads(PACK.read_text(encoding="utf-8"))

    # Sync tutorial step text from rewritten patches.
    by_patch = {p["stepId"]: p["text"] for p in COPY_PATCHES}
    for step in data["tutorial"]:
        if step["id"] in by_patch:
            step["text"] = by_patch[step["id"]]

    # Daily deepen.
    upsert_list(data["dailyGoals"]["objectives"], NEW_DAILY)
    data["dailyGoals"]["boardSlots"] = max(int(data["dailyGoals"]["boardSlots"]), 5)
    data["dailyGoals"]["maxStreakBonusDays"] = max(
        int(data["dailyGoals"]["maxStreakBonusDays"]), 14
    )
    data["dailyGoals"]["streakBonusCoinsPerDay"] = max(
        int(data["dailyGoals"]["streakBonusCoinsPerDay"]), 8
    )

    dump(PACK, data)
    write_friction()
    write_weekly_catalog()
    patch_tutorial_friction_kt()

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
        f"OK Phase 19 tutorial-retention-5: tutorial={len(data['tutorial'])} "
        f"friction={len(HIGH_FRICTION)} daily={len(data['dailyGoals']['objectives'])} "
        f"slots={data['dailyGoals']['boardSlots']} weekly={len(WEEKLY_OBJECTIVES)}"
    )


if __name__ == "__main__":
    main()
