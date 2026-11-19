#!/usr/bin/env python3
"""
Finish 5.0 Phase 17 — endgame deepen + schema 26.

Usage:
  python3 shared/tools/author_endgame_3.py
"""
from __future__ import annotations

import json
import shutil
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "endgame-3.json"
PARITY = ROOT / "fixtures" / "parity-endgame-3.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
PREP = ROOT / "ship" / "schema-26-prep.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LIFECYCLE = ROOT / "lifecycle" / "browser-lifecycle.json"
PARITY_LOCK = ROOT / "fixtures" / "parity-lock.json"
STARTER = ROOT / "fixtures" / "snapshot-starter-line-t2500.json"
LEGACY_V25 = ROOT / "fixtures" / "legacy" / "snapshot-v25-starter-line-t2500.json"
PACK_SCHEMA = ROOT / "schema" / "content-pack.schema.json"
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

MARKER = "authored-finish-5.0-phase-17"

NEW_TIERS = [
    {
        "id": "endgame.tier.aurora_throne",
        "name": "Aurora Throne",
        "description": (
            "Hold every deepen mark, ten challenges, and one crest past Prism Crown."
        ),
        "requiresPrestigeCount": 22,
        "requiresRivalBeats": 12,
        "requiresChallenges": 10,
        "requiresMarks": 4,
        "requiresCrests": 1,
        "catchSpeedPermille": 1250,
        "priceBonusPermille": 1250,
        "coins": 4500,
    },
    {
        "id": "endgame.tier.tideglass_ascendant",
        "name": "Tideglass Ascendant",
        "description": (
            "Sweep twelve challenges, every legend mark, and three crests on the tideglass circuit."
        ),
        "requiresPrestigeCount": 24,
        "requiresRivalBeats": 12,
        "requiresChallenges": 12,
        "requiresMarks": 4,
        "requiresCrests": 3,
        "catchSpeedPermille": 1300,
        "priceBonusPermille": 1300,
        "coins": 6000,
    },
]

NEW_CHALLENGES = [
    {
        "id": "endgame.challenge.harbor_circuit",
        "name": "Harbor Circuit",
        "description": "Travel between harbors twelve times across the full prestige map.",
        "stat": "stat.harbors_traveled",
        "atLeast": 12,
        "rewardCoins": 600,
        "grantsCrest": "endgame.crest.harbor_circuit",
    },
    {
        "id": "endgame.challenge.quest_sovereign",
        "name": "Quest Sovereign",
        "description": "Complete sixty authored quests on the legend circuit.",
        "stat": "stat.quests_completed",
        "atLeast": 60,
        "rewardCoins": 650,
        "grantsCrest": "endgame.crest.quest_sovereign",
    },
    {
        "id": "endgame.challenge.machine_ascendant",
        "name": "Machine Ascendant",
        "description": "Feed two hundred machine inputs across the harbor lines.",
        "stat": "stat.machine_inputs",
        "atLeast": 200,
        "rewardCoins": 620,
        "grantsCrest": "endgame.crest.machine_ascendant",
    },
    {
        "id": "endgame.challenge.revenue_crest",
        "name": "Revenue Crest",
        "description": "Bank fifty thousand lifetime revenue at the counters.",
        "stat": "stat.revenue",
        "atLeast": 50000,
        "rewardCoins": 700,
        "grantsCrest": "endgame.crest.revenue_crest",
    },
]

I18N = {
    "en": {},
    "es": {
        "endgame.tier.aurora_throne": "Trono Aurora",
        "endgame.tier.tideglass_ascendant": "Ascendente Tideglass",
        "endgame.challenge.harbor_circuit": "Circuito de Puertos",
        "endgame.challenge.quest_sovereign": "Soberano de Misiones",
        "endgame.challenge.machine_ascendant": "Ascendente de Máquinas",
        "endgame.challenge.revenue_crest": "Cimera de Ingresos",
        "endgame.crest.harbor_circuit": "Cimera Circuito",
        "endgame.crest.quest_sovereign": "Cimera Soberano",
        "endgame.crest.machine_ascendant": "Cimera Máquinas",
        "endgame.crest.revenue_crest": "Cimera Ingresos",
    },
    "pt": {
        "endgame.tier.aurora_throne": "Trono Aurora",
        "endgame.tier.tideglass_ascendant": "Ascendente Tideglass",
        "endgame.challenge.harbor_circuit": "Circuito de Portos",
        "endgame.challenge.quest_sovereign": "Soberano de Missões",
        "endgame.challenge.machine_ascendant": "Ascendente de Máquinas",
        "endgame.challenge.revenue_crest": "Crista de Receita",
        "endgame.crest.harbor_circuit": "Crista Circuito",
        "endgame.crest.quest_sovereign": "Crista Soberano",
        "endgame.crest.machine_ascendant": "Crista Máquinas",
        "endgame.crest.revenue_crest": "Crista Receita",
    },
    "fr": {
        "endgame.tier.aurora_throne": "Trône Aurore",
        "endgame.tier.tideglass_ascendant": "Ascendant Tideglass",
        "endgame.challenge.harbor_circuit": "Circuit des ports",
        "endgame.challenge.quest_sovereign": "Souverain des quêtes",
        "endgame.challenge.machine_ascendant": "Ascendant des machines",
        "endgame.challenge.revenue_crest": "Cimier des recettes",
        "endgame.crest.harbor_circuit": "Cimier Circuit",
        "endgame.crest.quest_sovereign": "Cimier Souverain",
        "endgame.crest.machine_ascendant": "Cimier Machines",
        "endgame.crest.revenue_crest": "Cimier Recettes",
    },
    "ht": {
        "endgame.tier.aurora_throne": "Twòn Aurora",
        "endgame.tier.tideglass_ascendant": "Asandan Tideglass",
        "endgame.challenge.harbor_circuit": "Sikui Pò",
        "endgame.challenge.quest_sovereign": "Souveren Misyon",
        "endgame.challenge.machine_ascendant": "Asandan Machin",
        "endgame.challenge.revenue_crest": "Krèt Revni",
        "endgame.crest.harbor_circuit": "Krèt Sikui",
        "endgame.crest.quest_sovereign": "Krèt Souveren",
        "endgame.crest.machine_ascendant": "Krèt Machin",
        "endgame.crest.revenue_crest": "Krèt Revni",
    },
    "it": {
        "endgame.tier.aurora_throne": "Trono Aurora",
        "endgame.tier.tideglass_ascendant": "Ascendente Tideglass",
        "endgame.challenge.harbor_circuit": "Circuito dei porti",
        "endgame.challenge.quest_sovereign": "Sovrano delle missioni",
        "endgame.challenge.machine_ascendant": "Ascendente delle macchine",
        "endgame.challenge.revenue_crest": "Cimiero delle entrate",
        "endgame.crest.harbor_circuit": "Cimiero Circuito",
        "endgame.crest.quest_sovereign": "Cimiero Sovrano",
        "endgame.crest.machine_ascendant": "Cimiero Macchine",
        "endgame.crest.revenue_crest": "Cimiero Entrate",
    },
    "ca": {
        "endgame.tier.aurora_throne": "Tron Aurora",
        "endgame.tier.tideglass_ascendant": "Ascendent Tideglass",
        "endgame.challenge.harbor_circuit": "Circuit de ports",
        "endgame.challenge.quest_sovereign": "Sobirà de missions",
        "endgame.challenge.machine_ascendant": "Ascendent de màquines",
        "endgame.challenge.revenue_crest": "Cresta d’ingressos",
        "endgame.crest.harbor_circuit": "Cresta Circuit",
        "endgame.crest.quest_sovereign": "Cresta Sobirà",
        "endgame.crest.machine_ascendant": "Cresta Màquines",
        "endgame.crest.revenue_crest": "Cresta Ingressos",
    },
    "ru": {
        "endgame.tier.aurora_throne": "Трон Авроры",
        "endgame.tier.tideglass_ascendant": "Восхождение Тайдгласс",
        "endgame.challenge.harbor_circuit": "Гаванный контур",
        "endgame.challenge.quest_sovereign": "Суверен квестов",
        "endgame.challenge.machine_ascendant": "Восхождение машин",
        "endgame.challenge.revenue_crest": "Гребень выручки",
        "endgame.crest.harbor_circuit": "Гребень контура",
        "endgame.crest.quest_sovereign": "Гребень суверена",
        "endgame.crest.machine_ascendant": "Гребень машин",
        "endgame.crest.revenue_crest": "Гребень выручки",
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


def fill_en_i18n() -> None:
    for t in NEW_TIERS:
        I18N["en"][t["id"]] = t["name"]
    for c in NEW_CHALLENGES:
        I18N["en"][c["id"]] = c["name"]
        crest = c.get("grantsCrest")
        if crest:
            I18N["en"][crest] = crest.split(".")[-1].replace("_", " ").title() + " Crest"


def write_ship(data: dict) -> None:
    endgame = data["endgame"]
    crest_ids = [c["grantsCrest"] for c in NEW_CHALLENGES if c.get("grantsCrest")]
    catalog = {
        "phase": 17,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.endgame_3.v1",
        "description": (
            "Finish 5.0 Phase 17 — deepen endgame (≥8 tiers / ≥12 challenges + crests) "
            "and bump live save schema 25→26 with endgameCrests persistence + v25→v26 migration."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "fromSchema": 25,
        "toSchema": 26,
        "endgame3Marker": MARKER,
        "tierCountMin": 8,
        "challengeCountMin": 12,
        "markCountMin": 3,
        "crestCountMin": 3,
        "tierIds": [t["id"] for t in endgame["tiers"]],
        "challengeIds": [c["id"] for c in endgame["challenges"]],
        "newTierIds": [t["id"] for t in NEW_TIERS],
        "newChallengeIds": [c["id"] for c in NEW_CHALLENGES],
        "crestIds": crest_ids,
        "stats": [
            "stat.endgame_tiers_unlocked",
            "stat.endgame_challenges_completed",
            "stat.endgame_marks_earned",
            "stat.endgame_crests_earned",
        ],
        "migration": {
            "fields": [
                {"field": "endgameCrests", "type": "string[]", "default": []},
            ]
        },
        "extendsEndgame2": "shared/ship/endgame-2.json",
        "schema26Prep": "shared/ship/schema-26-prep.json",
        "parityFixture": "shared/fixtures/parity-endgame-3.json",
        "authorTool": "shared/tools/author_endgame_3.py",
        "validateScript": "npm run endgame3:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "legacyFixture": "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json",
        "checklist": [
            "≥8 endgame tiers including aurora_throne + tideglass_ascendant",
            "≥12 endgame challenges with grantsCrest crests",
            "SCHEMA_VERSION / saveSchemaVersion / RELEASE_PIN / lifecycle = 26",
            "v25→v26 migration defaults endgameCrests=[]",
            "endgame2:validate soft floors (≥6 tiers/challenges, schema≥25)",
            "kickoff gaps.endgameSchema26Pending = false",
            "parity-endgame-3 + endgame3:validate green",
            "CI runs endgame3:validate",
            "content stays 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/endgame-3.json",
            "shared/fixtures/parity-endgame-3.json",
            "shared/ship/endgame-2.json",
            "shared/ship/schema-26-prep.json",
            "shared/fixtures/legacy/snapshot-v25-starter-line-t2500.json",
            "shared/fixtures/snapshot-starter-line-t2500.json",
            "shared/content/content-pack.json",
            "shared/tools/author_endgame_3.py",
            "web/src/ship/endgame3.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame3.kt",
            "web/scripts/validate-endgame-3.ts",
        ],
        "measured": {
            "tiers": len(endgame["tiers"]),
            "challenges": len(endgame["challenges"]),
            "marks": len([c for c in endgame["challenges"] if c.get("grantsMark")]),
            "crests": len([c for c in endgame["challenges"] if c.get("grantsCrest")]),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_endgame_3.v1",
        "endgame3Marker": MARKER,
        "phase": 17,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 17: schema 26 persists endgameCrests; Aurora Throne requires "
            "crests after Prism Crown deepen."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 1717,
        "firstNewTierId": "endgame.tier.aurora_throne",
        "sampleCrestId": "endgame.crest.harbor_circuit",
        "expect": {
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "tierCountMin": 8,
            "challengeCountMin": 12,
            "crestCountMin": 3,
            "fromSchema": 25,
            "toSchema": 26,
            "gates": [
                "schema_26",
                "endgame_deepen",
                "crests_persist",
                "legacy_v25",
                "kickoff_phase17",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_prep_listing_pin(data: dict) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["schemaVersion"] = 26
    kick["baseline"]["schemaVersion"] = 26
    kick["gaps"]["endgameSchema26Pending"] = False
    dump(KICKOFF, kick)

    prep = {
        "phase": 17,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.schema_26_prep.v1",
        "description": (
            "Finish 5.0 Phase 17 applied — live SCHEMA_VERSION is 26. endgame-3 owns the bump "
            "(endgameCrests + deepen tiers/challenges)."
        ),
        "contentVersion": "4.0.0",
        "currentSchemaVersion": 26,
        "targetSchemaVersion": 26,
        "status": "applied",
        "ownedByPhase": 17,
        "ownedByValidate": "endgame3:validate",
        "plannedConsumers": [
            "endgame crest gates past Prism Crown",
            "aurora/tideglass prestige deepen",
        ],
        "nonGoals": [
            "Do not bump contentVersion to 5.0.0 yet",
            "Do not grow rivals/seasonal/cosmetics (Phase 18)",
        ],
        "validateScript": "npm run endgame3:validate",
        "appliedBy": "endgame3:validate",
        "appliedMarker": MARKER,
    }
    dump(PREP, prep)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 5.0 Phase 17 endgame-3 complete (schema 26 + ≥8 tiers / ≥12 challenges + crests); "
        "Phases 1–16 remain green. Content stays 4.0.0; live schema now 26. Finish 4.0 freeze stays "
        "ready_for_release_tag. Deploy/tag remain manual."
    )
    dod["endgame3"] = {
        "phase": 17,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "endgame3Marker": MARKER,
        "catalog": "shared/ship/endgame-3.json",
        "parityFixture": "shared/fixtures/parity-endgame-3.json",
        "validateScript": "npm run endgame3:validate",
        "checklist": [
            "schema 26 live + v25→v26 migration",
            "≥8 tiers / ≥12 challenges + crests",
            "kickoff endgameSchema26Pending = false",
            "endgame3:validate green in CI",
        ],
    }
    quotas = dod.setdefault("quotas", {})
    quotas["endgameTiers"] = max(int(quotas.get("endgameTiers") or 0), 8)
    quotas["endgameChallenges"] = max(int(quotas.get("endgameChallenges") or 0), 12)
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["endgame3Phase"] = 17
    listing["endgame3Catalog"] = "shared/ship/endgame-3.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["schemaVersion"] = 26
    pin["endgame3"] = "shared/ship/endgame-3.json"
    fixtures = list(pin.get("fixtures") or [])
    for f in (
        "parity-endgame-3.json",
        "legacy/snapshot-v25-starter-line-t2500.json",
    ):
        if f not in fixtures:
            fixtures.append(f)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    life = json.loads(LIFECYCLE.read_text(encoding="utf-8"))
    life["fixtures"]["currentSchema"] = 26
    life["fixtures"]["migrateThroughSchema"] = 25
    legacy = list(life["fixtures"].get("requiredLegacyVersions") or [])
    if 25 not in legacy:
        legacy.append(25)
    life["fixtures"]["requiredLegacyVersions"] = legacy
    dump(LIFECYCLE, life)

    lock = json.loads(PARITY_LOCK.read_text(encoding="utf-8"))
    lock["schemaVersion"] = max(int(lock.get("schemaVersion") or 0), 26)
    dump(PARITY_LOCK, lock)

    schema = json.loads(PACK_SCHEMA.read_text(encoding="utf-8"))
    schema["properties"]["saveSchemaVersion"]["const"] = 26
    schema["properties"]["saveSchemaVersion"]["description"] = (
        "Finish 5.0 Phase 17 — save schema this content pack targets (migrations from ≤25)."
    )
    tier_props = schema["properties"]["endgame"]["properties"]["tiers"]["items"]["properties"]
    tier_props["requiresCrests"] = {
        "type": "integer",
        "minimum": 0,
        "description": "Finish 5.0 Phase 17 — crests required to unlock.",
    }
    ch_props = schema["properties"]["endgame"]["properties"]["challenges"]["items"]["properties"]
    ch_props["grantsCrest"] = {
        "type": "string",
        "pattern": "^endgame\\.crest\\.",
        "description": "Finish 5.0 Phase 17 — optional crest granted on complete.",
    }
    dump(PACK_SCHEMA, schema)


def bump_snapshots() -> None:
    if not LEGACY_V25.is_file():
        LEGACY_V25.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(STARTER, LEGACY_V25)
        legacy = json.loads(LEGACY_V25.read_text(encoding="utf-8"))
        legacy["schemaVersion"] = 25
        # Ensure v25 fixture does not yet carry crests.
        if isinstance(legacy.get("state"), dict):
            legacy["state"].pop("endgameCrests", None)
            legacy["state"].setdefault("endgameMarks", [])
        dump(LEGACY_V25, legacy)

    starter = json.loads(STARTER.read_text(encoding="utf-8"))
    starter["schemaVersion"] = 26
    if isinstance(starter.get("state"), dict):
        starter["state"].setdefault("endgameMarks", [])
        starter["state"]["endgameCrests"] = []
    dump(STARTER, starter)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))
    data["saveSchemaVersion"] = 26

    endgame = data["endgame"]
    for tier in endgame["tiers"]:
        tier.setdefault("requiresMarks", 0)
        tier.setdefault("requiresCrests", 0)
    for ch in endgame["challenges"]:
        if ch.get("grantsMark") is None:
            ch.pop("grantsMark", None)
        if ch.get("grantsCrest") is None:
            ch.pop("grantsCrest", None)

    upsert_list(endgame["tiers"], NEW_TIERS)
    upsert_list(endgame["challenges"], NEW_CHALLENGES)

    for tier in endgame["tiers"]:
        if tier["id"] == "endgame.tier.prism_crown":
            tier["description"] = (
                "Sweep all twelve rivals, every Finish-4 deepen challenge, and three legend marks "
                "before crest tiers."
            )

    dump(PACK, data)

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
    update_kickoff_dod_prep_listing_pin(data)
    bump_snapshots()

    print(
        f"OK Phase 17 endgame-3: tiers={len(endgame['tiers'])} "
        f"challenges={len(endgame['challenges'])} saveSchema=26"
    )


if __name__ == "__main__":
    main()
