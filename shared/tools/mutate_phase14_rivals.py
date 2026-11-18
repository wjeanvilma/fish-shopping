#!/usr/bin/env python3
"""Finish 3.0 Phase 14 — inject rivalMarkets catalog + i18n strings."""
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

RIVALS = [
    {
        "id": "rival.dockside_dolly",
        "name": "Dockside Dolly",
        "description": "Sunrise pier hawker undercutting basic portions and fillets at dawn.",
        "harbors": ["harbor.sunrise_pier"],
        "aggressionPermille": 420,
        "specialtyProducts": ["product.basic_portion", "product.fillet"],
        "undercutPriceMultPermille": 900,
        "activeDayParts": ["dawn", "day"],
    },
    {
        "id": "rival.moon_mariner",
        "name": "Moon Mariner Stall",
        "description": "Moon cove night stall chasing smoked and grilled fillets.",
        "harbors": ["harbor.moon_cove"],
        "aggressionPermille": 450,
        "specialtyProducts": ["product.smoked_fillet", "product.grilled_fillet"],
        "undercutPriceMultPermille": 910,
        "activeDayParts": ["dusk", "night"],
    },
    {
        "id": "rival.obsidian_cart",
        "name": "Obsidian Cart Co.",
        "description": "Jetty cart siphoning chilled fillets and fried portions.",
        "harbors": ["harbor.obsidian_jetty"],
        "aggressionPermille": 480,
        "specialtyProducts": ["product.chilled_fillet", "product.fried_portion"],
        "undercutPriceMultPermille": 880,
        "activeDayParts": ["day", "dusk"],
    },
    {
        "id": "rival.northlight_nook",
        "name": "Northlight Nook",
        "description": "Cold-harbor nook competing on ice crates and steamed fillets.",
        "harbors": ["harbor.northlight_harbor"],
        "aggressionPermille": 400,
        "specialtyProducts": ["product.ice_packed_crate", "product.steamed_fillet"],
        "undercutPriceMultPermille": 920,
        "activeDayParts": ["dawn", "night"],
    },
    {
        "id": "rival.marina_monger",
        "name": "Marina Monger",
        "description": "Grand marina wholesale rival for press and steam cartons.",
        "harbors": ["harbor.grand_marina"],
        "aggressionPermille": 460,
        "specialtyProducts": ["product.press_carton", "product.steam_carton"],
        "undercutPriceMultPermille": 890,
        "activeDayParts": ["day"],
    },
    {
        "id": "rival.coral_crock",
        "name": "Coral Crock",
        "description": "Lagoon crock trading pickled fillets and relish jars.",
        "harbors": ["harbor.coral_lagoon"],
        "aggressionPermille": 430,
        "specialtyProducts": ["product.pickled_fillet", "product.relish_jar"],
        "undercutPriceMultPermille": 905,
        "activeDayParts": ["dawn", "day"],
    },
    {
        "id": "rival.storm_hawker",
        "name": "Storm Hawker",
        "description": "Quay hawker pushing cured fillets and dried strips in rough weather.",
        "harbors": ["harbor.storm_quay"],
        "aggressionPermille": 500,
        "specialtyProducts": ["product.cured_fillet", "product.dried_strip"],
        "undercutPriceMultPermille": 870,
        "activeDayParts": ["dusk", "night"],
    },
    {
        "id": "rival.ember_emporium",
        "name": "Ember Emporium",
        "description": "Wharf emporium competing on fish cakes and kiln cartons.",
        "harbors": ["harbor.ember_wharf"],
        "aggressionPermille": 470,
        "specialtyProducts": ["product.fish_cake", "product.kiln_carton"],
        "undercutPriceMultPermille": 885,
        "activeDayParts": ["day", "dusk"],
    },
]

CATALOG = {
    "tickInterval": 40,
    "emptyStockSiphonChancePermille": 350,
    "lowRepSiphonBonusPermille": 150,
    "minReputationBandToResist": 3,
    "wellStockedUnits": 3,
    "pressureSpawnMultPermille": 780,
    "rivals": RIVALS,
}


def main() -> int:
    pack = json.loads(PACK.read_text())
    product_ids = {p["id"] for p in pack["products"]}
    harbor_ids = {h["id"] for h in pack["harbors"]}
    day_parts = {p["id"] for p in pack["ecology"]["parts"]}
    for rival in RIVALS:
        assert set(rival["harbors"]) <= harbor_ids, rival["id"]
        assert set(rival["specialtyProducts"]) <= product_ids, rival["id"]
        assert set(rival["activeDayParts"]) <= day_parts, rival["id"]
    pack["rivalMarkets"] = CATALOG
    PACK.write_text(json.dumps(pack, indent=2) + "\n")

    for path in I18N:
        data = json.loads(path.read_text())
        strings = data.setdefault("strings", {})
        for rival in RIVALS:
            strings[rival["id"]] = rival["name"]
        path.write_text(json.dumps(data, indent=2) + "\n")
    print(f"OK phase14 rivals={len(RIVALS)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
