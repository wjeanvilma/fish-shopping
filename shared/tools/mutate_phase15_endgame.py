#!/usr/bin/env python3
"""Finish 3.0 Phase 15 — inject endgame catalog + i18n; bump saveSchemaVersion to 24."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK = ROOT / "shared/content/content-pack.json"
I18N = [
    ROOT / "shared/i18n/content-strings.en.json",
    ROOT / "shared/i18n/content-strings.es.json",
    ROOT / "shared/i18n/content-strings.pt.json",
]

ENDGAME = {
    "requiresPrestigeCount": 8,
    "tiers": [
        {
            "id": "endgame.tier.deep_harbor",
            "name": "Deep Harbor",
            "description": "Clear eight prestige milestones to open the endgame board.",
            "requiresPrestigeCount": 8,
            "requiresRivalBeats": 0,
            "requiresChallenges": 0,
            "catchSpeedPermille": 1025,
            "priceBonusPermille": 1025,
            "coins": 400,
        },
        {
            "id": "endgame.tier.rival_warden",
            "name": "Rival Warden",
            "description": "Beat three rival stalls while holding Deep Harbor.",
            "requiresPrestigeCount": 8,
            "requiresRivalBeats": 3,
            "requiresChallenges": 0,
            "catchSpeedPermille": 1050,
            "priceBonusPermille": 1050,
            "coins": 600,
        },
        {
            "id": "endgame.tier.legend_pier",
            "name": "Legend Pier",
            "description": "Finish two endgame challenges after Rival Warden.",
            "requiresPrestigeCount": 12,
            "requiresRivalBeats": 5,
            "requiresChallenges": 2,
            "catchSpeedPermille": 1080,
            "priceBonusPermille": 1080,
            "coins": 900,
        },
        {
            "id": "endgame.tier.crown_market",
            "name": "Crown Market",
            "description": "Sweep all eight rivals and every endgame challenge.",
            "requiresPrestigeCount": 16,
            "requiresRivalBeats": 8,
            "requiresChallenges": 4,
            "catchSpeedPermille": 1120,
            "priceBonusPermille": 1120,
            "coins": 1500,
        },
    ],
    "challenges": [
        {
            "id": "endgame.challenge.rival_sweep",
            "name": "Rival Sweep",
            "description": "Beat every harbor rival at least once.",
            "stat": "stat.rival_beats",
            "atLeast": 8,
            "rewardCoins": 350,
        },
        {
            "id": "endgame.challenge.prestige_surge",
            "name": "Prestige Surge",
            "description": "Complete sixteen prestige milestones.",
            "stat": "stat.prestige_completed",
            "atLeast": 16,
            "rewardCoins": 400,
        },
        {
            "id": "endgame.challenge.codex_depth",
            "name": "Codex Depth",
            "description": "Log seventy-five species catches across the roster.",
            "stat": "stat.fish_caught",
            "atLeast": 200,
            "rewardCoins": 300,
        },
        {
            "id": "endgame.challenge.market_master",
            "name": "Market Master",
            "description": "Ring up five hundred counter sales.",
            "stat": "stat.sales",
            "atLeast": 500,
            "rewardCoins": 450,
        },
    ],
}


def main() -> int:
    pack = json.loads(PACK.read_text())
    pack["saveSchemaVersion"] = 24
    pack["endgame"] = ENDGAME
    PACK.write_text(json.dumps(pack, indent=2) + "\n")

    for path in I18N:
        data = json.loads(path.read_text())
        strings = data.setdefault("strings", {})
        for tier in ENDGAME["tiers"]:
            strings[tier["id"]] = tier["name"]
        for ch in ENDGAME["challenges"]:
            strings[ch["id"]] = ch["name"]
        path.write_text(json.dumps(data, indent=2) + "\n")
    print(
        f"OK phase15 endgame tiers={len(ENDGAME['tiers'])} "
        f"challenges={len(ENDGAME['challenges'])} saveSchema=24"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
