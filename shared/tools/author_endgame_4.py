#!/usr/bin/env python3
"""
Finish 6.0 Phase 14 — endgame deepen + schema 27.

Usage:
  python3 shared/tools/author_endgame_4.py
"""
from __future__ import annotations

import json
import subprocess
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "endgame-4.json"
PARITY = ROOT / "fixtures" / "parity-endgame-4.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
PREP = ROOT / "ship" / "schema-27-prep.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
LIFECYCLE = ROOT / "lifecycle" / "browser-lifecycle.json"
PARITY_LOCK = ROOT / "fixtures" / "parity-lock.json"
STARTER = ROOT / "fixtures" / "snapshot-starter-line-t2500.json"
LEGACY_V26 = ROOT / "fixtures" / "legacy" / "snapshot-v26-starter-line-t2500.json"
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

MARKER = "authored-finish-6.0-phase-14"
OPEN_GAP_MIN = 15

NEW_TIERS = [
    {
        "id": "endgame.tier.saffron_nest",
        "name": "Saffron Nest",
        "description": (
            "Hold every crest, fourteen challenges, and one nest sigil past Tideglass Ascendant."
        ),
        "requiresPrestigeCount": 26,
        "requiresRivalBeats": 12,
        "requiresChallenges": 14,
        "requiresMarks": 4,
        "requiresCrests": 4,
        "requiresSigils": 1,
        "catchSpeedPermille": 1350,
        "priceBonusPermille": 1350,
        "coins": 7500,
    },
    {
        "id": "endgame.tier.cobalt_covenant",
        "name": "Cobalt Covenant",
        "description": (
            "Sweep sixteen challenges, every crest, and three nest sigils on the cobalt circuit."
        ),
        "requiresPrestigeCount": 28,
        "requiresRivalBeats": 12,
        "requiresChallenges": 16,
        "requiresMarks": 4,
        "requiresCrests": 4,
        "requiresSigils": 3,
        "catchSpeedPermille": 1400,
        "priceBonusPermille": 1400,
        "coins": 9000,
    },
]

NEW_CHALLENGES = [
    {
        "id": "endgame.challenge.nest_circuit",
        "name": "Nest Circuit",
        "description": "Travel between harbors fourteen times across the nest prestige map.",
        "stat": "stat.harbors_traveled",
        "atLeast": 14,
        "rewardCoins": 750,
        "grantsSigil": "endgame.sigil.nest_circuit",
    },
    {
        "id": "endgame.challenge.quest_covenant",
        "name": "Quest Covenant",
        "description": "Complete one hundred authored quests on the nest covenant circuit.",
        "stat": "stat.quests_completed",
        "atLeast": 100,
        "rewardCoins": 800,
        "grantsSigil": "endgame.sigil.quest_covenant",
    },
    {
        "id": "endgame.challenge.roast_ascendant",
        "name": "Roast Ascendant",
        "description": "Feed two hundred eighty machine inputs across the nest lines.",
        "stat": "stat.machine_inputs",
        "atLeast": 280,
        "rewardCoins": 780,
        "grantsSigil": "endgame.sigil.roast_ascendant",
    },
    {
        "id": "endgame.challenge.nest_revenue",
        "name": "Nest Revenue",
        "description": "Bank seventy-five thousand lifetime revenue at the counters.",
        "stat": "stat.revenue",
        "atLeast": 75000,
        "rewardCoins": 850,
        "grantsSigil": "endgame.sigil.nest_revenue",
    },
]

I18N = {
    "en": {},
    "es": {
        "endgame.tier.saffron_nest": "Nido Azafrán",
        "endgame.tier.cobalt_covenant": "Pacto Cobalto",
        "endgame.challenge.nest_circuit": "Circuito del Nido",
        "endgame.challenge.quest_covenant": "Pacto de Misiones",
        "endgame.challenge.roast_ascendant": "Ascendente Tostado",
        "endgame.challenge.nest_revenue": "Ingresos del Nido",
        "endgame.sigil.nest_circuit": "Sigilo Circuito",
        "endgame.sigil.quest_covenant": "Sigilo Pacto",
        "endgame.sigil.roast_ascendant": "Sigilo Tostado",
        "endgame.sigil.nest_revenue": "Sigilo Ingresos",
    },
    "pt": {
        "endgame.tier.saffron_nest": "Ninho Açafrão",
        "endgame.tier.cobalt_covenant": "Pacto Cobalto",
        "endgame.challenge.nest_circuit": "Circuito do Ninho",
        "endgame.challenge.quest_covenant": "Pacto de Missões",
        "endgame.challenge.roast_ascendant": "Ascendente Torrado",
        "endgame.challenge.nest_revenue": "Receita do Ninho",
        "endgame.sigil.nest_circuit": "Sigilo Circuito",
        "endgame.sigil.quest_covenant": "Sigilo Pacto",
        "endgame.sigil.roast_ascendant": "Sigilo Torrado",
        "endgame.sigil.nest_revenue": "Sigilo Receita",
    },
    "fr": {
        "endgame.tier.saffron_nest": "Nid Safran",
        "endgame.tier.cobalt_covenant": "Pacte Cobalt",
        "endgame.challenge.nest_circuit": "Circuit du nid",
        "endgame.challenge.quest_covenant": "Pacte des quêtes",
        "endgame.challenge.roast_ascendant": "Ascendant rôti",
        "endgame.challenge.nest_revenue": "Recettes du nid",
        "endgame.sigil.nest_circuit": "Sigille Circuit",
        "endgame.sigil.quest_covenant": "Sigille Pacte",
        "endgame.sigil.roast_ascendant": "Sigille Rôti",
        "endgame.sigil.nest_revenue": "Sigille Recettes",
    },
    "ht": {
        "endgame.tier.saffron_nest": "Nich Safran",
        "endgame.tier.cobalt_covenant": "Pak Kobal",
        "endgame.challenge.nest_circuit": "Sikui Nich",
        "endgame.challenge.quest_covenant": "Pak Misyon",
        "endgame.challenge.roast_ascendant": "Asandan Boukannen",
        "endgame.challenge.nest_revenue": "Revni Nich",
        "endgame.sigil.nest_circuit": "Sigil Sikui",
        "endgame.sigil.quest_covenant": "Sigil Pak",
        "endgame.sigil.roast_ascendant": "Sigil Boukannen",
        "endgame.sigil.nest_revenue": "Sigil Revni",
    },
    "it": {
        "endgame.tier.saffron_nest": "Nido Zafferano",
        "endgame.tier.cobalt_covenant": "Patto Cobalto",
        "endgame.challenge.nest_circuit": "Circuito del nido",
        "endgame.challenge.quest_covenant": "Patto delle missioni",
        "endgame.challenge.roast_ascendant": "Ascendente arrostito",
        "endgame.challenge.nest_revenue": "Entrate del nido",
        "endgame.sigil.nest_circuit": "Sigillo Circuito",
        "endgame.sigil.quest_covenant": "Sigillo Patto",
        "endgame.sigil.roast_ascendant": "Sigillo Arrosto",
        "endgame.sigil.nest_revenue": "Sigillo Entrate",
    },
    "ca": {
        "endgame.tier.saffron_nest": "Niu Safrà",
        "endgame.tier.cobalt_covenant": "Pacte Cobalt",
        "endgame.challenge.nest_circuit": "Circuit del niu",
        "endgame.challenge.quest_covenant": "Pacte de missions",
        "endgame.challenge.roast_ascendant": "Ascendent torrat",
        "endgame.challenge.nest_revenue": "Ingressos del niu",
        "endgame.sigil.nest_circuit": "Sigil Circuit",
        "endgame.sigil.quest_covenant": "Sigil Pacte",
        "endgame.sigil.roast_ascendant": "Sigil Torrat",
        "endgame.sigil.nest_revenue": "Sigil Ingressos",
    },
    "ru": {
        "endgame.tier.saffron_nest": "Шафрановое гнездо",
        "endgame.tier.cobalt_covenant": "Кобальтовый завет",
        "endgame.challenge.nest_circuit": "Контур гнезда",
        "endgame.challenge.quest_covenant": "Завет квестов",
        "endgame.challenge.roast_ascendant": "Обжарочное восхождение",
        "endgame.challenge.nest_revenue": "Выручка гнезда",
        "endgame.sigil.nest_circuit": "Сигил контура",
        "endgame.sigil.quest_covenant": "Сигил завета",
        "endgame.sigil.roast_ascendant": "Сигил обжарки",
        "endgame.sigil.nest_revenue": "Сигил выручки",
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
        sigil = c.get("grantsSigil")
        if sigil:
            I18N["en"][sigil] = sigil.split(".")[-1].replace("_", " ").title() + " Sigil"


def write_ship(data: dict) -> None:
    endgame = data["endgame"]
    sigil_ids = [c["grantsSigil"] for c in NEW_CHALLENGES if c.get("grantsSigil")]
    catalog = {
        "phase": 14,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.endgame_4.v1",
        "description": (
            "Finish 6.0 Phase 14 — deepen endgame (≥10 tiers / ≥16 challenges + sigils) "
            "and bump live save schema 26→27 with endgameSigils persistence + v26→v27 migration."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "fromSchema": 26,
        "toSchema": 27,
        "endgame4Marker": MARKER,
        "tierCountMin": 10,
        "challengeCountMin": 16,
        "markCountMin": 3,
        "crestCountMin": 3,
        "sigilCountMin": 3,
        "tierIds": [t["id"] for t in endgame["tiers"]],
        "challengeIds": [c["id"] for c in endgame["challenges"]],
        "newTierIds": [t["id"] for t in NEW_TIERS],
        "newChallengeIds": [c["id"] for c in NEW_CHALLENGES],
        "sigilIds": sigil_ids,
        "stats": [
            "stat.endgame_tiers_unlocked",
            "stat.endgame_challenges_completed",
            "stat.endgame_marks_earned",
            "stat.endgame_crests_earned",
            "stat.endgame_sigils_earned",
        ],
        "migration": {
            "fields": [
                {"field": "endgameSigils", "type": "string[]", "default": []},
            ]
        },
        "extendsEndgame3": "shared/ship/endgame-3.json",
        "schema27Prep": "shared/ship/schema-27-prep.json",
        "parityFixture": "shared/fixtures/parity-endgame-4.json",
        "authorTool": "shared/tools/author_endgame_4.py",
        "validateScript": "npm run endgame4:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "legacyFixture": "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json",
        "checklist": [
            "≥10 endgame tiers including saffron_nest + cobalt_covenant",
            "≥16 endgame challenges with grantsSigil sigils",
            "SCHEMA_VERSION / saveSchemaVersion / RELEASE_PIN / lifecycle = 27",
            "v26→v27 migration defaults endgameSigils=[]",
            "endgame3:validate soft floors (≥8 tiers/challenges, schema≥26)",
            "kickoff gaps.endgameSchema27Pending = false",
            "parity-endgame-4 + endgame4:validate green",
            "CI runs endgame4:validate",
            "content stays 5.0.0",
            "openGapFlagMin 16→15",
        ],
        "preflightGates": [
            "shared/ship/endgame-4.json",
            "shared/fixtures/parity-endgame-4.json",
            "shared/ship/endgame-3.json",
            "shared/ship/schema-27-prep.json",
            "shared/fixtures/legacy/snapshot-v26-starter-line-t2500.json",
            "shared/fixtures/snapshot-starter-line-t2500.json",
            "shared/content/content-pack.json",
            "shared/tools/author_endgame_4.py",
            "web/src/ship/endgame4.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame4.kt",
            "web/scripts/validate-endgame-4.ts",
        ],
        "measured": {
            "tiers": len(endgame["tiers"]),
            "challenges": len(endgame["challenges"]),
            "marks": len([c for c in endgame["challenges"] if c.get("grantsMark")]),
            "crests": len([c for c in endgame["challenges"] if c.get("grantsCrest")]),
            "sigils": len([c for c in endgame["challenges"] if c.get("grantsSigil")]),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_endgame_4.v1",
        "endgame4Marker": MARKER,
        "phase": 14,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 14: schema 27 persists endgameSigils; Saffron Nest requires "
            "sigils after Tideglass Ascendant deepen."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 1717,
        "firstNewTierId": "endgame.tier.saffron_nest",
        "sampleSigilId": "endgame.sigil.nest_circuit",
        "expect": {
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "tierCountMin": 10,
            "challengeCountMin": 16,
            "sigilCountMin": 3,
            "fromSchema": 26,
            "toSchema": 27,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "schema_27",
                "endgame_deepen",
                "sigils_persist",
                "legacy_v26",
                "kickoff_phase14",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_prep_listing_pin(data: dict) -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["schemaVersion"] = 27
    kick["gaps"]["endgameSchema27Pending"] = False
    dump(KICKOFF6, kick)

    p6 = json.loads(PARITY6.read_text(encoding="utf-8"))
    p6.setdefault("expect", {})["schemaVersion"] = 27
    p6["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
    dump(PARITY6, p6)

    # Soft-floor prior Finish 6 parity fixtures that pin openGapFlagMin.
    for rel in (
        "parity-quests-contracts-6.json",
        "parity-atmosphere-6.json",
        "parity-species-150.json",
        "parity-audio-pack-6.json",
        "parity-product-art-6.json",
        "parity-machines-15-16.json",
        "parity-vfx-juice-6.json",
    ):
        path = ROOT / "fixtures" / rel
        if not path.is_file():
            continue
        fx = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(fx.get("expect"), dict) and "openGapFlagMin" in fx["expect"]:
            fx["expect"]["openGapFlagMin"] = OPEN_GAP_MIN
            dump(path, fx)

    prep = {
        "phase": 14,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.schema_27_prep.v1",
        "description": (
            "Finish 6.0 Phase 14 applied — live SCHEMA_VERSION is 27. endgame-4 owns the bump "
            "(endgameSigils + deepen tiers/challenges)."
        ),
        "contentVersion": "5.0.0",
        "currentSchemaVersion": 27,
        "targetSchemaVersion": 27,
        "status": "applied",
        "ownedByPhase": 14,
        "ownedByValidate": "endgame4:validate",
        "plannedConsumers": [
            "endgame sigil gates past Tideglass Ascendant",
            "saffron/cobalt nest prestige deepen",
        ],
        "nonGoals": [
            "Do not bump contentVersion to 6.0.0 yet",
            "Do not grow rivals/seasonal/cosmetics (Phase 15)",
        ],
        "validateScript": "npm run endgame4:validate",
        "appliedBy": "endgame4:validate",
        "appliedMarker": MARKER,
    }
    dump(PREP, prep)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 6.0 Phase 14 endgame-4 complete (schema 27 + ≥10 tiers / ≥16 challenges + sigils); "
        "Phases 1–13 remain green. Content stays 5.0.0; live schema now 27. Finish 5.0 freeze stays "
        "ready_for_release_tag. Deploy/tag remain manual."
    )
    dod["endgame4"] = {
        "phase": 14,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "endgame4Marker": MARKER,
        "catalog": "shared/ship/endgame-4.json",
        "parityFixture": "shared/fixtures/parity-endgame-4.json",
        "validateScript": "npm run endgame4:validate",
        "checklist": [
            "schema 27 live + v26→v27 migration",
            "≥10 tiers / ≥16 challenges + sigils",
            "kickoff endgameSchema27Pending = false",
            "endgame4:validate green in CI",
        ],
    }
    quotas = dod.setdefault("quotas", {})
    quotas["endgameTiers"] = max(int(quotas.get("endgameTiers") or 0), 10)
    quotas["endgameChallenges"] = max(int(quotas.get("endgameChallenges") or 0), 16)
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["endgame4Phase"] = 14
    listing["endgame4Catalog"] = "shared/ship/endgame-4.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["schemaVersion"] = 27
    pin["endgame4"] = "shared/ship/endgame-4.json"
    fixtures = list(pin.get("fixtures") or [])
    for f in (
        "parity-endgame-4.json",
        "legacy/snapshot-v26-starter-line-t2500.json",
    ):
        if f not in fixtures:
            fixtures.append(f)
    pin["fixtures"] = fixtures
    dump(PIN, pin)

    life = json.loads(LIFECYCLE.read_text(encoding="utf-8"))
    life["fixtures"]["currentSchema"] = 27
    life["fixtures"]["migrateThroughSchema"] = 26
    legacy = list(life["fixtures"].get("requiredLegacyVersions") or [])
    for v in (25, 26):
        if v not in legacy:
            legacy.append(v)
    life["fixtures"]["requiredLegacyVersions"] = legacy
    dump(LIFECYCLE, life)

    lock = json.loads(PARITY_LOCK.read_text(encoding="utf-8"))
    lock["schemaVersion"] = max(int(lock.get("schemaVersion") or 0), 27)
    dump(PARITY_LOCK, lock)

    schema = json.loads(PACK_SCHEMA.read_text(encoding="utf-8"))
    schema["properties"]["saveSchemaVersion"]["const"] = 27
    schema["properties"]["saveSchemaVersion"]["description"] = (
        "Finish 6.0 Phase 14 — save schema this content pack targets (migrations from ≤26)."
    )
    tier_props = schema["properties"]["endgame"]["properties"]["tiers"]["items"]["properties"]
    tier_props["requiresSigils"] = {
        "type": "integer",
        "minimum": 0,
        "description": "Finish 6.0 Phase 14 — sigils required to unlock.",
    }
    ch_props = schema["properties"]["endgame"]["properties"]["challenges"]["items"]["properties"]
    ch_props["grantsSigil"] = {
        "type": "string",
        "pattern": "^endgame\\.sigil\\.",
        "description": "Finish 6.0 Phase 14 — optional sigil granted on complete.",
    }
    dump(PACK_SCHEMA, schema)


def crc32_hex(text: str) -> str:
    return format(zlib.crc32(text.encode("utf-8")) & 0xFFFFFFFF, "08x")


def dump_snapshot(path: Path, schema_version: int, content_version: str, state: dict) -> None:
    # Compact state JSON (no spaces) so checksum matches SnapshotCodec / snapshot.ts.
    state_json = json.dumps(state, ensure_ascii=False, separators=(",", ":"))
    doc = {
        "schemaVersion": schema_version,
        "contentVersion": content_version,
        "checksum": crc32_hex(state_json),
        "state": json.loads(state_json),
    }
    path.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")


def bump_snapshots(content_version: str) -> None:
    starter = json.loads(STARTER.read_text(encoding="utf-8"))
    state = dict(starter.get("state") or {})
    state.setdefault("endgameMarks", [])
    state.setdefault("endgameCrests", [])
    state.pop("endgameSigils", None)

    LEGACY_V26.parent.mkdir(parents=True, exist_ok=True)
    dump_snapshot(LEGACY_V26, 26, content_version, state)

    state27 = dict(state)
    state27["endgameSigils"] = []
    dump_snapshot(STARTER, 27, content_version, state27)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))
    data["saveSchemaVersion"] = 27

    endgame = data["endgame"]
    for tier in endgame["tiers"]:
        tier.setdefault("requiresMarks", 0)
        tier.setdefault("requiresCrests", 0)
        tier.setdefault("requiresSigils", 0)
    for ch in endgame["challenges"]:
        if ch.get("grantsMark") is None:
            ch.pop("grantsMark", None)
        if ch.get("grantsCrest") is None:
            ch.pop("grantsCrest", None)
        if ch.get("grantsSigil") is None:
            ch.pop("grantsSigil", None)

    upsert_list(endgame["tiers"], NEW_TIERS)
    upsert_list(endgame["challenges"], NEW_CHALLENGES)

    for tier in endgame["tiers"]:
        if tier["id"] == "endgame.tier.tideglass_ascendant":
            tier["description"] = (
                "Sweep twelve challenges, every legend mark, and three crests on the tideglass "
                "circuit before nest sigil tiers."
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
    bump_snapshots(data["contentVersion"])

    print(
        f"OK Phase 14 endgame-4: tiers={len(endgame['tiers'])} "
        f"challenges={len(endgame['challenges'])} saveSchema=27 openGapFlagMin={OPEN_GAP_MIN}"
    )


if __name__ == "__main__":
    main()
