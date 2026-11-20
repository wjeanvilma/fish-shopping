#!/usr/bin/env python3
"""
Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures.

Usage:
  python3 shared/tools/author_staff_ai_4.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
STAFF_TREES_SHIP = ROOT / "ship" / "staff-trees.json"
SHIP = ROOT / "ship" / "staff-ai-4.json"
PARITY = ROOT / "fixtures" / "parity-staff-ai-4.json"
TRACE_FIXTURE = ROOT / "fixtures" / "decision-traces-staff-ai-4.json"
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

MARKER = "authored-finish-6.0-phase-16"
OPEN_GAP_MIN = 13

NEW_BRANCHES = [
    {
        "id": "branch.ice_runner.nest_chill",
        "role": "ice_runner",
        "name": "Nest chill",
        "description": "Chains roast/ferment fragile pickups on the nest ice circuit.",
        "parentId": "branch.ice_runner.chill_haul",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 92,
        "trainingXpRequired": 26,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1140,
        "carryBonus": 1,
        "transferIntervalMultPermille": 780,
        "wageMultPermille": 1170,
    },
    {
        "id": "branch.greeter.nest_host",
        "role": "greeter",
        "name": "Nest host",
        "description": "Entry host who top-ups nest guests faster during ember hours.",
        "parentId": "branch.greeter.welcome_desk",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 85,
        "trainingXpRequired": 24,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1100,
        "carryBonus": 0,
        "transferIntervalMultPermille": 1000,
        "wageMultPermille": 1140,
    },
    {
        "id": "branch.porter.nest_haul",
        "role": "porter",
        "name": "Nest haul",
        "description": "Clears roast/ferment jammed outputs first on the nest cart line.",
        "parentId": "branch.porter.cargo_sprint",
        "requiresWorkerLevel": 4,
        "trainingCostCoins": 94,
        "trainingXpRequired": 27,
        "catchSpeedMultPermille": 1000,
        "moveSpeedMultPermille": 1200,
        "carryBonus": 1,
        "transferIntervalMultPermille": 740,
        "wageMultPermille": 1180,
    },
]

NEW_SCHEDULE = {
    "id": "schedule.nest_ember",
    "name": "Nest ember",
    "description": "Auto on-shift at dawn and day for the roast/ferment nest circuit.",
    "dayParts": ["dawn", "day"],
    "autoOnShift": True,
    "wageMultPermille": 1060,
}

I18N = {
    "en": {
        "branch.ice_runner.nest_chill": "Nest chill",
        "branch.greeter.nest_host": "Nest host",
        "branch.porter.nest_haul": "Nest haul",
        "schedule.nest_ember": "Nest ember",
    },
    "es": {
        "branch.ice_runner.nest_chill": "Frío del nido",
        "branch.greeter.nest_host": "Anfitrión del nido",
        "branch.porter.nest_haul": "Carga del nido",
        "schedule.nest_ember": "Braise del nido",
    },
    "pt": {
        "branch.ice_runner.nest_chill": "Frio do ninho",
        "branch.greeter.nest_host": "Anfitrião do ninho",
        "branch.porter.nest_haul": "Carga do ninho",
        "schedule.nest_ember": "Brasa do ninho",
    },
    "fr": {
        "branch.ice_runner.nest_chill": "Froid du nid",
        "branch.greeter.nest_host": "Hôte du nid",
        "branch.porter.nest_haul": "Transport du nid",
        "schedule.nest_ember": "Braise du nid",
    },
    "ht": {
        "branch.ice_runner.nest_chill": "Frèt nich",
        "branch.greeter.nest_host": "Otè nich",
        "branch.porter.nest_haul": "Chaj nich",
        "schedule.nest_ember": "Braise nich",
    },
    "it": {
        "branch.ice_runner.nest_chill": "Freddo del nido",
        "branch.greeter.nest_host": "Ospite del nido",
        "branch.porter.nest_haul": "Trasporto del nido",
        "schedule.nest_ember": "Brace del nido",
    },
    "ca": {
        "branch.ice_runner.nest_chill": "Fred del niu",
        "branch.greeter.nest_host": "Amfitrió del niu",
        "branch.porter.nest_haul": "Càrrega del niu",
        "schedule.nest_ember": "Brasa del niu",
    },
    "ru": {
        "branch.ice_runner.nest_chill": "Холод гнезда",
        "branch.greeter.nest_host": "Хозяин гнезда",
        "branch.porter.nest_haul": "Перевозка гнезда",
        "schedule.nest_ember": "Угли гнезда",
    },
}

DEPTH_BEHAVIORS = [
    {
        "branchId": "branch.ice_runner.nest_chill",
        "role": "ice_runner",
        "markers": [
            "nest_chill",
            "nest_chill_chain",
            "ICE_RUNNER_NEST_CHILLS",
            "chill_haul",
        ],
    },
    {
        "branchId": "branch.greeter.nest_host",
        "role": "greeter",
        "markers": [
            "nest_host",
            "nest_host_welcome",
            "GREETER_NEST_HOSTS",
            "welcome_desk",
        ],
    },
    {
        "branchId": "branch.porter.nest_haul",
        "role": "porter",
        "markers": [
            "nest_haul",
            "nest_haul_urgency",
            "PORTER_NEST_HAULS",
            "cargo_sprint",
        ],
    },
    {
        "branchId": "schedule.nest_ember",
        "role": "schedule",
        "markers": [
            "schedule_nest_ember_boost",
            "SCHEDULE_TASK_BOOSTS",
            "nest_ember",
            "scheduleDaypartBoost",
        ],
    },
    {
        "branchId": "decision_trace.fixtures",
        "role": "trace",
        "markers": [
            "decision-traces-staff-ai-4",
            "WorkerDecisionHooks",
            "lastForWorker",
            "nest_decision_fixture",
        ],
    },
]

DEPTH_STATS = [
    "stat.ice_runner_nest_chills",
    "stat.greeter_nest_hosts",
    "stat.porter_nest_hauls",
    "stat.schedule_task_boosts",
    "stat.worker_failure_recoveries",
]

DECISION_REASONS = [
    "nest_chill_chain",
    "nest_host_welcome",
    "nest_haul_urgency",
    "schedule_nest_ember_boost",
    "nest_decision_fixture",
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


def write_trace_fixture() -> None:
    fixture = {
        "schema": "fish.fixture.decision_traces_staff_ai_4.v1",
        "staffAi4Marker": MARKER,
        "phase": 16,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 16 decision-trace fixtures for nest_chill / nest_host / "
            "nest_haul / nest_ember / nest_decision_fixture reasons."
        ),
        "maxTraces": 32,
        "reasons": DECISION_REASONS,
        "samples": [
            {
                "workerId": "worker.nest_chill",
                "role": "ice_runner",
                "kind": "haul",
                "reason": "nest_chill_chain",
                "score": 42,
                "candidatesConsidered": 2,
                "tick": 1600,
            },
            {
                "workerId": "worker.nest_host",
                "role": "greeter",
                "kind": "welcome",
                "reason": "nest_host_welcome",
                "score": 60,
                "candidatesConsidered": 3,
                "tick": 1675,
            },
            {
                "workerId": "worker.nest_haul",
                "role": "porter",
                "kind": "haul",
                "reason": "nest_haul_urgency",
                "score": 95,
                "candidatesConsidered": 4,
                "tick": 1720,
            },
            {
                "workerId": "worker.nest_ember",
                "role": "porter",
                "kind": "schedule",
                "reason": "schedule_nest_ember_boost",
                "score": 26,
                "candidatesConsidered": 1,
                "tick": 1800,
            },
            {
                "workerId": "worker.fixture",
                "role": "trace",
                "kind": "fixture",
                "reason": "nest_decision_fixture",
                "score": None,
                "candidatesConsidered": 5,
                "tick": 1900,
            },
        ],
    }
    dump(TRACE_FIXTURE, fixture)


def write_ship() -> None:
    catalog = {
        "phase": 16,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.staff_ai_4.v1",
        "description": (
            "Finish 6.0 Phase 16 — staff/worker AI depth wave 4 + decision-trace fixtures. "
            "Adds nest_chill / nest_host / nest_haul specialties, nest_ember schedule, and "
            "decision-traces-staff-ai-4 fixtures. Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "staffAi4Marker": MARKER,
        "extendsStaffAi3": "shared/ship/staff-ai-3.json",
        "staffTreesCatalog": "shared/ship/staff-trees.json",
        "decisionTraceFixture": "shared/fixtures/decision-traces-staff-ai-4.json",
        "depthStats": DEPTH_STATS,
        "depthBehaviors": DEPTH_BEHAVIORS,
        "decisionReasons": DECISION_REASONS,
        "newBranchIds": [b["id"] for b in NEW_BRANCHES],
        "newScheduleIds": [NEW_SCHEDULE["id"]],
        "branchesMin": 16,
        "schedulesMin": 4,
        "webWorkersPath": "web/src/engine/systems/workers.ts",
        "kotlinWorkersPath": "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
        "webStatsPath": "web/src/engine/state.ts",
        "kotlinStatsPath": "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt",
        "webDecisionHooksPath": "web/src/engine/systems/workerDecisionHooks.ts",
        "kotlinDecisionHooksPath": (
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerDecisionHooks.kt"
        ),
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "parityFixture": "shared/fixtures/parity-staff-ai-4.json",
        "validateScript": "npm run staffai4:validate",
        "softStaffAi3Validate": "npm run staffai3:validate",
        "softStaffTreesValidate": "npm run stafftrees:validate",
        "authorTool": "shared/tools/author_staff_ai_4.py",
        "checklist": [
            "Ice runner nest_chill specialty + ICE_RUNNER_NEST_CHILLS",
            "Greeter nest_host specialty + GREETER_NEST_HOSTS",
            "Porter nest_haul specialty + PORTER_NEST_HAULS",
            "schedule.nest_ember + schedule_nest_ember_boost scoring",
            "decision-traces-staff-ai-4 fixtures for wave-4 reasons",
            "staff-trees ≥16 branches / ≥4 schedules",
            "kickoff staffAi4Incomplete=false",
            "staffai4:validate green in CI",
            "schema stays 27 / content 5.0.0",
            "openGapFlagMin 14→13",
        ],
        "preflightGates": [
            "shared/ship/staff-ai-4.json",
            "shared/fixtures/parity-staff-ai-4.json",
            "shared/fixtures/decision-traces-staff-ai-4.json",
            "shared/ship/staff-ai-3.json",
            "shared/ship/staff-trees.json",
            "shared/content/content-pack.json",
            "shared/tools/author_staff_ai_4.py",
            "web/src/ship/staffAi4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/StaffAi4.kt",
            "web/scripts/validate-staff-ai-4.ts",
            "web/src/engine/systems/workers.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/workers/WorkerAi.kt",
            "web/src/engine/state.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/GameState.kt",
        ],
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_staff_ai_4.v1",
        "staffAi4Marker": MARKER,
        "phase": 16,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 16: nest_chill chain + nest_host welcome + nest_haul urgency + "
            "nest_ember schedule boost + decision-trace fixtures."
        ),
        "sampleBranchId": "branch.ice_runner.nest_chill",
        "sampleScheduleId": "schedule.nest_ember",
        "sampleDecisionReason": "nest_decision_fixture",
        "decisionTraceFixture": "shared/fixtures/decision-traces-staff-ai-4.json",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "depthBehaviorCount": 5,
            "depthStatCount": 5,
            "decisionReasonCount": 5,
            "branchesMin": 16,
            "schedulesMin": 4,
            "staffAi4Incomplete": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "traceSampleCount": 5,
            "gates": [
                "nest_chill",
                "nest_host",
                "nest_haul",
                "schedule_nest_ember",
                "decision_trace_fixtures",
                "kickoff_closed",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(branch_count: int, schedule_count: int) -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["staffAi4Incomplete"] = False
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
    quotas["staffBranches"] = max(int(quotas.get("staffBranches") or 0), branch_count)
    quotas["staffSchedules"] = max(int(quotas.get("staffSchedules") or 0), schedule_count)
    dod["notes"] = (
        "Finish 6.0 Phase 16 staff-ai-4 complete (nest specialties + decision-trace fixtures); "
        "Phases 1–15 remain green. Content stays 5.0.0 / schema 27. staffAi4Incomplete closed. "
        "Deploy/tag remain manual."
    )
    dod["staffAi4"] = {
        "phase": 16,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "staffAi4Marker": MARKER,
        "catalog": "shared/ship/staff-ai-4.json",
        "parityFixture": "shared/fixtures/parity-staff-ai-4.json",
        "decisionTraceFixture": "shared/fixtures/decision-traces-staff-ai-4.json",
        "validateScript": "npm run staffai4:validate",
        "checklist": [
            "nest_chill / nest_host / nest_haul specialties",
            "nest_ember schedule + day-part boost",
            "decision-traces-staff-ai-4 fixtures",
            "kickoff staffAi4Incomplete=false",
            "staffai4:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["staffAi4Phase"] = 16
    listing["staffAi4Catalog"] = "shared/ship/staff-ai-4.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["staffAi4"] = "shared/ship/staff-ai-4.json"
    fixtures = list(pin.get("fixtures") or [])
    for f in ("parity-staff-ai-4.json", "decision-traces-staff-ai-4.json"):
        if f not in fixtures:
            fixtures.append(f)
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
        "Finish 2.0–6.0 staff specialization trees; wave-4 nest child specialties "
        f"and nest_ember schedule (≥{len(branch_ids)} branches / ≥{len(schedule_ids)} schedules)."
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

    write_trace_fixture()
    write_ship()
    update_kickoff_dod_listing_pin(len(branch_ids), len(schedule_ids))

    print(
        f"OK Phase 16 staff-ai-4: branches={len(branch_ids)} schedules={len(schedule_ids)} "
        f"wave4={len(NEW_BRANCHES)}+1 schedule openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
