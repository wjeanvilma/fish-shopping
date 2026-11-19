#!/usr/bin/env python3
"""
Finish 4.0 Phase 17 — endgame deepen + schema 25.

Usage:
  python3 shared/tools/author_endgame_2.py
"""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "endgame-2.json"
PARITY = ROOT / "fixtures" / "parity-endgame-2.json"
KICKOFF = ROOT / "ship" / "finish-4.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
PREP = ROOT / "ship" / "schema-25-prep.json"
EN = ROOT / "i18n" / "content-strings.en.json"
ES = ROOT / "i18n" / "content-strings.es.json"
PT = ROOT / "i18n" / "content-strings.pt.json"
FR = ROOT / "i18n" / "content-strings.fr.json"
HT = ROOT / "i18n" / "content-strings.ht.json"
IT = ROOT / "i18n" / "content-strings.it.json"
CA = ROOT / "i18n" / "content-strings.ca.json"
RU = ROOT / "i18n" / "content-strings.ru.json"
CONTENT_STRINGS_KT = (
    ROOT.parent
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/i18n/ContentStrings.kt"
)

MARKER = "authored-finish-4.0-phase-17"

NEW_TIERS = [
    {
        "id": "endgame.tier.mist_sovereign",
        "name": "Mist Sovereign",
        "description": "Hold ten rival beats, five challenges, and one legend mark past Crown Market.",
        "requiresPrestigeCount": 18,
        "requiresRivalBeats": 10,
        "requiresChallenges": 5,
        "requiresMarks": 1,
        "catchSpeedPermille": 1150,
        "priceBonusPermille": 1150,
        "coins": 2000,
    },
    {
        "id": "endgame.tier.prism_crown",
        "name": "Prism Crown",
        "description": "Sweep all twelve rivals, every deepen challenge, and three legend marks.",
        "requiresPrestigeCount": 20,
        "requiresRivalBeats": 12,
        "requiresChallenges": 8,
        "requiresMarks": 3,
        "catchSpeedPermille": 1200,
        "priceBonusPermille": 1200,
        "coins": 3500,
    },
]

NEW_CHALLENGES = [
    {
        "id": "endgame.challenge.rival_armada",
        "name": "Rival Armada",
        "description": "Beat all twelve rival stalls across the harbor circuit.",
        "stat": "stat.rival_beats",
        "atLeast": 12,
        "rewardCoins": 500,
        "grantsMark": "endgame.mark.rival_armada",
    },
    {
        "id": "endgame.challenge.chain_admiral",
        "name": "Chain Admiral",
        "description": "Finish five delivery-chain contracts end to end.",
        "stat": "stat.contract_chains_completed",
        "atLeast": 5,
        "rewardCoins": 450,
        "grantsMark": "endgame.mark.chain_admiral",
    },
    {
        "id": "endgame.challenge.harbor_decade",
        "name": "Harbor Decade",
        "description": "Travel between harbors ten times on the prestige circuit.",
        "stat": "stat.harbors_traveled",
        "atLeast": 10,
        "rewardCoins": 400,
        "grantsMark": "endgame.mark.harbor_decade",
    },
    {
        "id": "endgame.challenge.mastery_legend",
        "name": "Mastery Legend",
        "description": "Bank two thousand fishing mastery XP across the roster.",
        "stat": "stat.mastery_xp",
        "atLeast": 2000,
        "rewardCoins": 550,
        "grantsMark": "endgame.mark.mastery_legend",
    },
]

I18N = {
    "en": {},
    "es": {
        "endgame.tier.mist_sovereign": "Soberano de la Niebla",
        "endgame.tier.prism_crown": "Corona Prisma",
        "endgame.challenge.rival_armada": "Armada Rival",
        "endgame.challenge.chain_admiral": "Almirante de Cadenas",
        "endgame.challenge.harbor_decade": "Década de Puertos",
        "endgame.challenge.mastery_legend": "Leyenda de Maestría",
        "endgame.mark.rival_armada": "Marca Armada Rival",
        "endgame.mark.chain_admiral": "Marca Almirante",
        "endgame.mark.harbor_decade": "Marca Década",
        "endgame.mark.mastery_legend": "Marca Leyenda",
    },
    "pt": {
        "endgame.tier.mist_sovereign": "Soberano da Névoa",
        "endgame.tier.prism_crown": "Coroa Prisma",
        "endgame.challenge.rival_armada": "Armada Rival",
        "endgame.challenge.chain_admiral": "Almirante de Cadeias",
        "endgame.challenge.harbor_decade": "Década de Portos",
        "endgame.challenge.mastery_legend": "Lenda da Maestria",
        "endgame.mark.rival_armada": "Marca Armada Rival",
        "endgame.mark.chain_admiral": "Marca Almirante",
        "endgame.mark.harbor_decade": "Marca Década",
        "endgame.mark.mastery_legend": "Marca Lenda",
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
        mark = c.get("grantsMark")
        if mark:
            I18N["en"][mark] = mark.split(".")[-1].replace("_", " ").title() + " Mark"


def upsert_content_strings_kt() -> None:
    if not CONTENT_STRINGS_KT.is_file():
        return
    text = CONTENT_STRINGS_KT.read_text(encoding="utf-8")
    locale_for = {"EN": I18N["en"], "ES": I18N["es"], "PT": I18N["pt"]}

    def patch_map(src: str, map_name: str, locale_keys: dict[str, str]) -> str:
        if map_name == "PT":
            pattern = rf"(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val bundles)"
        else:
            pattern = rf"(private val {map_name} = mapOf\()(.*?)(\n    \)\n\n    private val )"
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
    endgame = data["endgame"]
    catalog = {
        "phase": 17,
        "plan": "30_finish_4.0",
        "schema": "fish.ship.endgame_2.v1",
        "description": (
            "Finish 4.0 Phase 17 — deepen endgame (6 tiers / 8 challenges + legend marks) "
            "and bump live save schema 24→25 with endgameMarks persistence + v24→v25 migration."
        ),
        "contentVersion": "3.0.0",
        "schemaVersion": 25,
        "fromSchema": 24,
        "toSchema": 25,
        "endgame2Marker": MARKER,
        "tierCountMin": 6,
        "challengeCountMin": 8,
        "markCountMin": 3,
        "tierIds": [t["id"] for t in endgame["tiers"]],
        "challengeIds": [c["id"] for c in endgame["challenges"]],
        "newTierIds": [t["id"] for t in NEW_TIERS],
        "newChallengeIds": [c["id"] for c in NEW_CHALLENGES],
        "markIds": [c["grantsMark"] for c in NEW_CHALLENGES if c.get("grantsMark")],
        "stats": [
            "stat.endgame_tiers_unlocked",
            "stat.endgame_challenges_completed",
            "stat.endgame_marks_earned",
        ],
        "migration": {
            "fields": [
                {"field": "endgameMarks", "type": "string[]", "default": []},
            ]
        },
        "extendsSchema24Endgame": "shared/ship/schema-24-endgame.json",
        "schema25Prep": "shared/ship/schema-25-prep.json",
        "parityFixture": "shared/fixtures/parity-endgame-2.json",
        "authorTool": "shared/tools/author_endgame_2.py",
        "validateScript": "npm run endgame2:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-4.0-kickoff.json",
        "legacyFixture": "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json",
        "checklist": [
            "≥6 endgame tiers including mist_sovereign + prism_crown",
            "≥8 endgame challenges with grantsMark legend marks",
            "SCHEMA_VERSION / saveSchemaVersion / RELEASE_PIN / lifecycle = 25",
            "v24→v25 migration defaults endgameMarks=[]",
            "schema24:validate soft floors (≥4 tiers/challenges, schema≥24)",
            "kickoff gaps.endgameSchema25Pending = false",
            "parity-endgame-2 + endgame2:validate green",
            "CI runs endgame2:validate",
            "content stays 3.0.0",
        ],
        "preflightGates": [
            "shared/ship/endgame-2.json",
            "shared/fixtures/parity-endgame-2.json",
            "shared/ship/schema-24-endgame.json",
            "shared/ship/schema-25-prep.json",
            "shared/fixtures/legacy/snapshot-v24-starter-line-t2500.json",
            "shared/fixtures/snapshot-starter-line-t2500.json",
            "shared/content/content-pack.json",
            "shared/tools/author_endgame_2.py",
            "web/src/ship/endgame2.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/Endgame2.kt",
            "web/scripts/validate-endgame-2.ts",
        ],
        "measured": {
            "tiers": len(endgame["tiers"]),
            "challenges": len(endgame["challenges"]),
            "marks": len([c for c in endgame["challenges"] if c.get("grantsMark")]),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_endgame_2.v1",
        "endgame2Marker": MARKER,
        "phase": 17,
        "plan": "30_finish_4.0",
        "description": (
            "Finish 4.0 Phase 17: schema 25 persists endgameMarks; Mist Sovereign requires "
            "marks after Crown Market deepen."
        ),
        "harborId": "harbor.sunrise_pier",
        "seed": 1717,
        "firstNewTierId": "endgame.tier.mist_sovereign",
        "sampleMarkId": "endgame.mark.rival_armada",
        "expect": {
            "schemaVersion": 25,
            "contentVersion": "3.0.0",
            "tierCountMin": 6,
            "challengeCountMin": 8,
            "markCountMin": 3,
            "fromSchema": 24,
            "toSchema": 25,
            "gates": [
                "schema_25",
                "endgame_deepen",
                "marks_persist",
                "legacy_v24",
                "kickoff_phase17",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_prep() -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["schemaVersion"] = 25
    kick["baseline"]["schemaVersion"] = 25
    kick["gaps"]["endgameSchema25Pending"] = False
    dump(KICKOFF, kick)

    prep = json.loads(PREP.read_text(encoding="utf-8"))
    prep["status"] = "applied"
    prep["currentSchemaVersion"] = 25
    prep["description"] = (
        "Finish 4.0 Phase 17 applied — live SCHEMA_VERSION is 25. Phase 11 prep notes retained; "
        "endgame-2 owns the bump (endgameMarks + deepen tiers/challenges)."
    )
    prep["appliedBy"] = "endgame2:validate"
    prep["appliedMarker"] = MARKER
    dump(PREP, prep)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    dod["notes"] = (
        "Finish 4.0 Phase 17 endgame-2 complete (schema 25 + ≥6 tiers / ≥8 challenges + marks); "
        "Phases 1–16 remain green. Content stays 3.0.0; live schema now 25. Finish 3.0 freeze stays "
        "ready_for_release_tag; Finish 2.0 historical. LOC freeze floors anti-regression at 3.0 cut; "
        "Finish 4.0 plan targets 32k/20k/48k/100k. Deploy/tag remain manual."
    )
    block = {
        "phase": 17,
        "plan": "30_finish_4.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "endgame2Marker": MARKER,
        "catalog": "shared/ship/endgame-2.json",
        "parityFixture": "shared/fixtures/parity-endgame-2.json",
        "validateScript": "npm run endgame2:validate",
        "checklist": [
            "schema 25 live + v24→v25 migration",
            "≥6 tiers / ≥8 challenges + legend marks",
            "kickoff endgameSchema25Pending = false",
            "endgame2:validate green in CI",
        ],
    }
    if "endgame2" not in dod:
        out = {}
        for k, v in dod.items():
            if k == "seasonalBait4":
                out[k] = v
                out["endgame2"] = block
            else:
                out[k] = v
        if "endgame2" not in out:
            out["endgame2"] = block
        dod = out
    else:
        dod["endgame2"] = block
    dump(DOD, dod)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))
    data["saveSchemaVersion"] = 25

    endgame = data["endgame"]
    # Ensure historical tiers default requiresMarks=0 when absent.
    for tier in endgame["tiers"]:
        tier.setdefault("requiresMarks", 0)
    for ch in endgame["challenges"]:
        ch.setdefault("grantsMark", None)
        if ch["grantsMark"] is None:
            ch.pop("grantsMark", None)

    upsert_list(endgame["tiers"], NEW_TIERS)
    upsert_list(endgame["challenges"], NEW_CHALLENGES)

    # Soften Crown Market copy for 12-rival world while keeping historical thresholds.
    for tier in endgame["tiers"]:
        if tier["id"] == "endgame.tier.crown_market":
            tier["description"] = (
                "Sweep eight rival beats and every Phase-15 endgame challenge before deepen tiers."
            )

    dump(PACK, data)

    for locale, path in (("en", EN), ("es", ES), ("pt", PT)):
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    upsert_content_strings_kt()
    write_ship(data)
    update_kickoff_dod_prep()

    print(
        f"OK Phase 17 endgame-2: tiers={len(endgame['tiers'])} "
        f"challenges={len(endgame['challenges'])} saveSchema=25"
    )


if __name__ == "__main__":
    main()
