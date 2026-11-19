#!/usr/bin/env python3
"""
Finish 5.0 Phase 20 — staff/worker AI depth wave 3
(scheduling, specialties, failure modes).

Usage:
  python3 shared/tools/author_staff_ai_3.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
STAFF_TREES_SHIP = ROOT / "ship" / "staff-trees.json"
SHIP = ROOT / "ship" / "staff-ai-3.json"
PARITY = ROOT / "fixtures" / "parity-staff-ai-3.json"
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

MARKER = "authored-finish-5.0-phase-20"

NEW_BRANCHES = [
    {
        "id": "branch.supervisor.rush_marshal",
        "role": "supervisor",
        "name": "Rush marshal",
        "description": "Floor lead who re-posts faster during rushes and broken-machine scrambles.",
        "parentId": "branch.supervisor.floor_lead",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 95,
        "trainingXpRequired": 28,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1180,
        "carryBonus": 0,
        "transferIntervalMultPermille": 1000,
        "wageMultPermille": 1200,
    },
    {
        "id": "branch.operator.circuit_boss",
        "role": "operator",
        "name": "Circuit boss",
        "description": "Pad-link specialist who scores starving multi-pad circuits first.",
        "parentId": "branch.operator.pad_link",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 90,
        "trainingXpRequired": 26,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1160,
        "carryBonus": 0,
        "transferIntervalMultPermille": 760,
        "wageMultPermille": 1160,
    },
    {
        "id": "branch.smoker_specialist.smoke_queue",
        "role": "smoker_specialist",
        "name": "Smoke queue",
        "description": "Kiln focus that feeds OUTPUT_FULL / waiting smoker queues first.",
        "parentId": "branch.smoker_specialist.kiln_focus",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 88,
        "trainingXpRequired": 24,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1120,
        "carryBonus": 0,
        "transferIntervalMultPermille": 720,
        "wageMultPermille": 1180,
    },
]

NEW_SCHEDULE = {
    "id": "schedule.peak_tide",
    "name": "Peak tide",
    "description": "Auto on-shift at day and dusk peak traffic.",
    "dayParts": ["day", "dusk"],
    "autoOnShift": True,
    "wageMultPermille": 1050,
}

I18N = {
    "en": {
        "branch.supervisor.rush_marshal": "Rush marshal",
        "branch.operator.circuit_boss": "Circuit boss",
        "branch.smoker_specialist.smoke_queue": "Smoke queue",
        "schedule.peak_tide": "Peak tide",
    },
    "es": {
        "branch.supervisor.rush_marshal": "Mariscal de prisa",
        "branch.operator.circuit_boss": "Jefe de circuito",
        "branch.smoker_specialist.smoke_queue": "Cola de ahumado",
        "schedule.peak_tide": "Marea pico",
    },
    "pt": {
        "branch.supervisor.rush_marshal": "Marechal da corrida",
        "branch.operator.circuit_boss": "Chefe de circuito",
        "branch.smoker_specialist.smoke_queue": "Fila de defumação",
        "schedule.peak_tide": "Maré de pico",
    },
    "fr": {
        "branch.supervisor.rush_marshal": "Maréchal de rush",
        "branch.operator.circuit_boss": "Chef de circuit",
        "branch.smoker_specialist.smoke_queue": "File de fumage",
        "schedule.peak_tide": "Marée de pointe",
    },
    "ht": {
        "branch.supervisor.rush_marshal": "Marshal rush",
        "branch.operator.circuit_boss": "Chèf sikwi",
        "branch.smoker_specialist.smoke_queue": "Fil fimen",
        "schedule.peak_tide": "Mare pik",
    },
    "it": {
        "branch.supervisor.rush_marshal": "Maresciallo rush",
        "branch.operator.circuit_boss": "Capo circuito",
        "branch.smoker_specialist.smoke_queue": "Coda affumicatura",
        "schedule.peak_tide": "Marea di picco",
    },
    "ca": {
        "branch.supervisor.rush_marshal": "Mariscal de pressa",
        "branch.operator.circuit_boss": "Cap de circuit",
        "branch.smoker_specialist.smoke_queue": "Cua de fumats",
        "schedule.peak_tide": "Marea punta",
    },
    "ru": {
        "branch.supervisor.rush_marshal": "Маршал ажиотажа",
        "branch.operator.circuit_boss": "Начальник контура",
        "branch.smoker_specialist.smoke_queue": "Очередь копчения",
        "schedule.peak_tide": "Пиковый прилив",
    },
}

DEPTH_BEHAVIORS = [
    {
        "branchId": "branch.supervisor.rush_marshal",
        "role": "supervisor",
        "markers": [
            "rush_marshal",
            "rush_marshal_patrol",
            "SUPERVISOR_RUSH_MARSHALS",
            "floor_lead",
        ],
    },
    {
        "branchId": "branch.operator.circuit_boss",
        "role": "operator",
        "markers": [
            "circuit_boss",
            "circuit_boss_link",
            "OPERATOR_CIRCUIT_LINKS",
            "pad_link",
        ],
    },
    {
        "branchId": "branch.smoker_specialist.smoke_queue",
        "role": "smoker_specialist",
        "markers": [
            "smoke_queue",
            "smoke_queue_feed",
            "SMOKER_QUEUE_FEEDS",
            "kiln_focus",
        ],
    },
    {
        "branchId": "schedule.peak_tide",
        "role": "schedule",
        "markers": [
            "schedule_daypart_boost",
            "SCHEDULE_TASK_BOOSTS",
            "peak_tide",
            "scheduleDaypartBoost",
        ],
    },
    {
        "branchId": "failure.recover",
        "role": "failure",
        "markers": [
            "failure_recover",
            "WORKER_FAILURE_RECOVERIES",
            "attemptFailureRecover",
            "scheduleDaypartBoost",
        ],
    },
]

DEPTH_STATS = [
    "stat.supervisor_rush_marshals",
    "stat.operator_circuit_links",
    "stat.smoker_queue_feeds",
    "stat.schedule_task_boosts",
    "stat.worker_failure_recoveries",
]

DECISION_REASONS = [
    "rush_marshal_patrol",
    "circuit_boss_link",
    "smoke_queue_feed",
    "schedule_daypart_boost",
    "failure_recover",
]


def dump(path: Path, data: object) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def upsert_list(items: list, new_items: list, key: str = "id") -> None:
    by_id = {item[key]: i for i, item in enumerate(items)}
    for item in new_items:
        if item[key] in by_id:
            items[by_id[item[key]]] = item
        else:
            items.append(item)


def write_ship() -> None:
    catalog = {
        "phase": 20,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.staff_ai_3.v1",
        "description": (
            "Finish 5.0 Phase 20 — staff/worker AI depth wave 3. "
            "Adds rush_marshal / circuit_boss / smoke_queue specialties, "
            "peak_tide schedule + day-part scoring, and blockedReason failure recovery. "
            "Schema stays 26 / content 4.0.0 (stats + decision traces only)."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "staffAi3Marker": MARKER,
        "extendsStaffAi2": "shared/ship/staff-ai-2.json",
        "extendsWorkerAiDepth": "shared/ship/worker-ai-depth.json",
        "staffTreesCatalog": "shared/ship/staff-trees.json",
        "depthStats": DEPTH_STATS,
        "depthBehaviors": DEPTH_BEHAVIORS,
        "decisionReasons": DECISION_REASONS,
        "newBranchIds": [b["id"] for b in NEW_BRANCHES],
        "newScheduleIds": [NEW_SCHEDULE["id"]],
        "branchesMin": 13,
        "schedulesMin": 3,
        "webWorkersPath": "web/src/engine/systems.ts",
        "kotlinWorkersPath": "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
        "webStatsPath": "web/src/engine/state.ts",
        "kotlinStatsPath": "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt",
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-staff-ai-3.json",
        "validateScript": "npm run staffai3:validate",
        "softStaffAi2Validate": "npm run staffai2:validate",
        "softWorkerAiValidate": "npm run workerai:validate",
        "softStaffTreesValidate": "npm run stafftrees:validate",
        "authorTool": "shared/tools/author_staff_ai_3.py",
        "checklist": [
            "Supervisor rush_marshal specialty + SUPERVISOR_RUSH_MARSHALS",
            "Operator circuit_boss specialty + OPERATOR_CIRCUIT_LINKS",
            "Smoker smoke_queue specialty + SMOKER_QUEUE_FEEDS",
            "schedule.peak_tide + schedule_daypart_boost scoring",
            "blockedReason failure_recover + WORKER_FAILURE_RECOVERIES",
            "staff-trees ≥13 branches / ≥3 schedules soft floors",
            "kickoff staffAi3Incomplete=false",
            "staffai3:validate green in CI",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/staff-ai-3.json",
            "shared/fixtures/parity-staff-ai-3.json",
            "shared/ship/staff-ai-2.json",
            "shared/ship/worker-ai-depth.json",
            "shared/ship/staff-trees.json",
            "shared/content/content-pack.json",
            "shared/tools/author_staff_ai_3.py",
            "web/src/ship/staffAi3.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffAi3.kt",
            "web/scripts/validate-staff-ai-3.ts",
            "web/src/engine/systems.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
            "web/src/engine/state.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_staff_ai_3.v1",
        "staffAi3Marker": MARKER,
        "phase": 20,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 20: rush_marshal patrol during rush + peak_tide schedule "
            "day-part boost + failure_recover from blockedReason."
        ),
        "sampleBranchId": "branch.supervisor.rush_marshal",
        "sampleScheduleId": "schedule.peak_tide",
        "sampleDecisionReason": "failure_recover",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "depthBehaviorCount": 5,
            "depthStatCount": 5,
            "decisionReasonCount": 5,
            "branchesMin": 13,
            "schedulesMin": 3,
            "staffAi3Incomplete": False,
            "gates": [
                "rush_marshal",
                "circuit_boss",
                "smoke_queue",
                "schedule_daypart",
                "failure_recover",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(branch_count: int, schedule_count: int) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["gaps"]["staffAi3Incomplete"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["staffBranches"] = max(int(quotas.get("staffBranches") or 0), branch_count)
    quotas["staffSchedules"] = max(int(quotas.get("staffSchedules") or 0), schedule_count)
    dod["notes"] = (
        "Finish 5.0 Phase 20 staff-ai-3 complete (scheduling/specialties/failure recovery); "
        "Phases 1–19 remain green. Content stays 4.0.0 / schema 26. staffAi3Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["staffAi3"] = {
        "phase": 20,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "staffAi3Marker": MARKER,
        "catalog": "shared/ship/staff-ai-3.json",
        "parityFixture": "shared/fixtures/parity-staff-ai-3.json",
        "validateScript": "npm run staffai3:validate",
        "checklist": [
            "rush_marshal / circuit_boss / smoke_queue specialties",
            "peak_tide schedule + day-part boost",
            "failure_recover from blockedReason",
            "kickoff staffAi3Incomplete=false",
            "staffai3:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["staffAi3Phase"] = 20
    listing["staffAi3Catalog"] = "shared/ship/staff-ai-3.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["staffAi3"] = "shared/ship/staff-ai-3.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-staff-ai-3.json" not in fixtures:
        fixtures.append("parity-staff-ai-3.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def update_staff_trees_ship(branch_ids: list[str], schedule_ids: list[str]) -> None:
    ship = json.loads(STAFF_TREES_SHIP.read_text(encoding="utf-8"))
    ship["branchCount"] = len(branch_ids)
    ship["scheduleCount"] = len(schedule_ids)
    ship["rootBranchCount"] = max(int(ship.get("rootBranchCount") or 0), 8)
    ship["branches"] = branch_ids
    ship["schedules"] = schedule_ids
    ship["definitionOfDoneStaffBranches"] = len(branch_ids)
    ship["definitionOfDoneStaffSchedules"] = len(schedule_ids)
    ship["description"] = (
        "Finish 2.0 Phase 15 + Finish 3.0 Phase 10 + Finish 5.0 Phase 20 — "
        "staff specialization trees for all hireable roles; wave-3 child specialties "
        f"and peak_tide schedule (≥{len(branch_ids)} branches / ≥{len(schedule_ids)} schedules)."
    )
    dump(STAFF_TREES_SHIP, ship)


def main() -> None:
    data = json.loads(PACK.read_text(encoding="utf-8"))
    trees = data.setdefault("staffTrees", {})
    branches = trees.setdefault("branches", [])
    schedules = trees.setdefault("schedules", [])
    upsert_list(branches, NEW_BRANCHES)
    upsert_list(schedules, [NEW_SCHEDULE])
    dump(PACK, data)

    branch_ids = [b["id"] for b in branches]
    schedule_ids = [s["id"] for s in schedules]
    update_staff_trees_ship(branch_ids, schedule_ids)

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    write_ship()
    update_kickoff_dod_listing_pin(len(branch_ids), len(schedule_ids))

    print(
        f"OK Phase 20 staff-ai-3: branches={len(branch_ids)} schedules={len(schedule_ids)} "
        f"wave3={len(NEW_BRANCHES)}+1 schedule"
    )


if __name__ == "__main__":
    main()
