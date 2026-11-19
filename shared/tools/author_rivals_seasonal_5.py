#!/usr/bin/env python3
"""
Finish 5.0 Phase 18 — rivals→16, seasonal→16, baits→16, cosmetics→24.

Usage:
  python3 shared/tools/author_rivals_seasonal_5.py
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "rivals-seasonal-5.json"
PARITY = ROOT / "fixtures" / "parity-rivals-seasonal-5.json"
KICKOFF = ROOT / "ship" / "finish-5.0-kickoff.json"
DOD = ROOT / "ship" / "definition-of-done.json"
LISTING = ROOT / "store" / "listing.json"
PIN = ROOT / "fixtures" / "RELEASE_PIN.json"
ENTITLEMENTS = ROOT / "billing" / "entitlements.json"
PRESENTATION = ROOT / "content" / "cosmetic-presentation.json"
PRODUCT_ART = ROOT / "ship" / "product-art.json"
SUPPORT = ROOT / "ops" / "support-runbook.json"
SYSTEMS_TS = REPO / "web/src/engine/systems.ts"
COSMETICS_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/progression/CosmeticsIap.kt"
)
PRESENTATION_KT = (
    REPO
    / "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/sim/CosmeticPresentation.kt"
)
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

sys.path.insert(0, str(ROOT / "tools"))
from generate_fish_stubs import write_cosmetic_banner  # noqa: E402

MARKER = "authored-finish-5.0-phase-18"
PERIOD = 21000

NEW_RIVALS = [
    {
        "id": "rival.aurora_hawker",
        "name": "Aurora Hawker",
        "description": "Inlet hawker siphoning poached fillets and broth at Aurora Inlet.",
        "harbors": ["harbor.aurora_inlet"],
        "aggressionPermille": 500,
        "specialtyProducts": ["product.poached_fillet", "product.poach_broth"],
        "undercutPriceMultPermille": 870,
        "activeDayParts": ["dawn", "day", "dusk"],
        "aiProfile": "siphon",
    },
    {
        "id": "rival.tideglass_trader",
        "name": "Tideglass Trader",
        "description": "Bay trader undercutting canned fillets and medleys at Tideglass Bay.",
        "harbors": ["harbor.tideglass_bay"],
        "aggressionPermille": 515,
        "specialtyProducts": ["product.canned_fillet", "product.can_medley"],
        "undercutPriceMultPermille": 855,
        "activeDayParts": ["day", "dusk", "night"],
        "aiProfile": "undercut",
    },
    {
        "id": "rival.northern_roamer",
        "name": "Northern Roamer",
        "description": "Roaming stall hopping Aurora Inlet and Tideglass Bay for poach/can trays.",
        "harbors": ["harbor.aurora_inlet", "harbor.tideglass_bay"],
        "aggressionPermille": 480,
        "specialtyProducts": ["product.poach_broth", "product.can_medley"],
        "undercutPriceMultPermille": 885,
        "activeDayParts": ["dusk", "night"],
        "aiProfile": "roamer",
    },
    {
        "id": "rival.glass_syndicate",
        "name": "Glass Syndicate",
        "description": "Adaptive syndicate working aurora/tideglass wholesale cartons after a beat.",
        "harbors": ["harbor.aurora_inlet", "harbor.tideglass_bay"],
        "aggressionPermille": 530,
        "specialtyProducts": ["product.poach_carton", "product.can_carton"],
        "undercutPriceMultPermille": 845,
        "activeDayParts": ["dawn", "day"],
        "aiProfile": "adaptive",
    },
]

NEW_EVENTS = [
    {
        "id": "event.aurora_inlet_lights",
        "name": "Aurora Inlet Lights",
        "description": "Northern lights over the inlet favor aurora cod and icefish runs.",
        "periodTicks": PERIOD,
        "startTick": 16000,
        "durationTicks": 900,
        "banner": "banner.aurora_inlet_lights",
        "customerSpawnMultPermille": 1520,
        "priceMultPermille": 1280,
        "festivalCustomerIds": ["customer.aurora_lights_guest"],
        "speciesWeightMultPermille": {
            "species.aurora_cod": 2000,
            "species.aurora_icefish": 1800,
            "species.aurora_jack": 1600,
            "species.aurora_north": 1500,
        },
    },
    {
        "id": "event.tideglass_mirror_fair",
        "name": "Tideglass Mirror Fair",
        "description": "Mirror stalls pack the bay for glass gobies and tide bass.",
        "periodTicks": PERIOD,
        "startTick": 16950,
        "durationTicks": 900,
        "banner": "banner.tideglass_mirror_fair",
        "customerSpawnMultPermille": 1540,
        "priceMultPermille": 1300,
        "festivalCustomerIds": ["customer.tideglass_fair_tourist"],
        "speciesWeightMultPermille": {
            "species.glass_goby": 2000,
            "species.tide_bass": 1900,
            "species.crystal_smelt": 1600,
            "species.tidepool_blenny": 1500,
        },
    },
    {
        "id": "event.poach_pantry_week",
        "name": "Poach Pantry Week",
        "description": "Poach kitchens draw bulk buyers across the aurora pantry circuit.",
        "periodTicks": PERIOD,
        "startTick": 17900,
        "durationTicks": 900,
        "banner": "banner.poach_pantry_week",
        "customerSpawnMultPermille": 1480,
        "priceMultPermille": 1320,
        "festivalCustomerIds": ["customer.poach_pantry_buyer"],
        "speciesWeightMultPermille": {
            "species.aurora_cod": 1800,
            "species.north_smelt": 1700,
            "species.brine_mullet": 1500,
        },
    },
    {
        "id": "event.can_circuit_carnival",
        "name": "Can Circuit Carnival",
        "description": "Carnival cans and medleys pack the tideglass ferry docks.",
        "periodTicks": PERIOD,
        "startTick": 18850,
        "durationTicks": 1000,
        "banner": "banner.can_circuit_carnival",
        "customerSpawnMultPermille": 1500,
        "priceMultPermille": 1340,
        "festivalCustomerIds": ["customer.can_carnival_guest"],
        "speciesWeightMultPermille": {
            "species.tide_bass": 1900,
            "species.crystal_bream": 1700,
            "species.brine_goby": 1600,
            "species.crystal_brine": 1500,
        },
    },
]

NEW_CUSTOMERS = [
    {
        "id": "customer.aurora_lights_guest",
        "name": "Aurora lights guest",
        "kind": "premium",
        "basketMin": 1,
        "basketMax": 3,
        "patienceTicks": 1450,
        "spawnWeight": 72,
        "priceMultPermille": 1600,
        "preferredProducts": [
            {"item": "product.poached_fillet", "weight": 55},
            {"item": "product.poach_broth", "weight": 45},
        ],
        "unmetPriceMultPermille": 740,
        "unmetPatienceDrainPermille": 1850,
        "requiresSeasonalEvent": "event.aurora_inlet_lights",
    },
    {
        "id": "customer.tideglass_fair_tourist",
        "name": "Tideglass fair tourist",
        "kind": "tourist",
        "basketMin": 1,
        "basketMax": 2,
        "patienceTicks": 1350,
        "spawnWeight": 74,
        "priceMultPermille": 1550,
        "preferredProducts": [
            {"item": "product.canned_fillet", "weight": 55},
            {"item": "product.can_medley", "weight": 45},
        ],
        "unmetPriceMultPermille": 735,
        "unmetPatienceDrainPermille": 1900,
        "requiresSeasonalEvent": "event.tideglass_mirror_fair",
    },
    {
        "id": "customer.poach_pantry_buyer",
        "name": "Poach pantry buyer",
        "kind": "wholesaler",
        "basketMin": 2,
        "basketMax": 4,
        "patienceTicks": 1600,
        "spawnWeight": 66,
        "priceMultPermille": 1650,
        "preferredProducts": [
            {"item": "product.poach_carton", "weight": 60},
            {"item": "product.poached_fillet", "weight": 40},
        ],
        "unmetPriceMultPermille": 720,
        "unmetPatienceDrainPermille": 1750,
        "requiresSeasonalEvent": "event.poach_pantry_week",
    },
    {
        "id": "customer.can_carnival_guest",
        "name": "Can carnival guest",
        "kind": "tourist",
        "basketMin": 2,
        "basketMax": 3,
        "patienceTicks": 1500,
        "spawnWeight": 70,
        "priceMultPermille": 1580,
        "preferredProducts": [
            {"item": "product.can_carton", "weight": 55},
            {"item": "product.can_medley", "weight": 45},
        ],
        "unmetPriceMultPermille": 730,
        "unmetPatienceDrainPermille": 1800,
        "requiresSeasonalEvent": "event.can_circuit_carnival",
    },
]

NEW_CONTRACTS = [
    {
        "id": "contract.aurora_lights_poach",
        "name": "Aurora lights poach tray",
        "description": "Festival-only — poached fillets for the inlet light stalls.",
        "item": "product.poached_fillet",
        "quantity": 3,
        "durationTicks": 1400,
        "payout": 100,
        "penalty": 24,
        "weight": 70,
        "requiresSeasonalEvent": "event.aurora_inlet_lights",
    },
    {
        "id": "contract.tideglass_fair_can",
        "name": "Tideglass fair can platter",
        "description": "Festival-only — canned fillets for the mirror fair booths.",
        "item": "product.canned_fillet",
        "quantity": 4,
        "durationTicks": 1350,
        "payout": 95,
        "penalty": 22,
        "weight": 72,
        "requiresSeasonalEvent": "event.tideglass_mirror_fair",
    },
    {
        "id": "contract.poach_pantry_haul",
        "name": "Poach pantry haul",
        "description": "Festival-only — poach cartons for the pantry week kitchens.",
        "item": "product.poach_carton",
        "quantity": 2,
        "durationTicks": 1500,
        "payout": 120,
        "penalty": 28,
        "weight": 68,
        "requiresSeasonalEvent": "event.poach_pantry_week",
    },
    {
        "id": "contract.can_carnival_crate",
        "name": "Can carnival crate",
        "description": "Festival-only — can cartons for the carnival docks.",
        "item": "product.can_carton",
        "quantity": 2,
        "durationTicks": 1550,
        "payout": 125,
        "penalty": 30,
        "weight": 66,
        "requiresSeasonalEvent": "event.can_circuit_carnival",
    },
]

NEW_BAITS = [
    {
        "id": "bait.aurora_nibble",
        "name": "Aurora nibble",
        "description": "Pack of 3. Soft northern nibble for aurora cod and icefish.",
        "carryUnits": 1,
        "packQuantity": 3,
        "cost": 55,
        "rareSpeciesWeightMultPermille": 1400,
        "rareChanceBonusPermille": 80,
        "requires": ["upgrade.bait_pouch"],
    },
    {
        "id": "bait.tideglass_flake",
        "name": "Tideglass flake",
        "description": "Pack of 2. Mirror flake that sweetens glass goby and tide bass.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 78,
        "rareSpeciesWeightMultPermille": 1550,
        "rareChanceBonusPermille": 100,
        "requires": ["upgrade.rod_speed_2"],
    },
    {
        "id": "bait.poach_paste",
        "name": "Poach paste",
        "description": "Pack of 2. Kitchen paste for rare aurora runs past the poacher line.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 125,
        "rareSpeciesWeightMultPermille": 1700,
        "rareChanceBonusPermille": 130,
        "requires": ["upgrade.harbor_poacher"],
    },
    {
        "id": "bait.can_spark",
        "name": "Can spark",
        "description": "Pack of 2. Spark tip for tideglass rares after the canner unlock.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 175,
        "rareSpeciesWeightMultPermille": 1850,
        "rareChanceBonusPermille": 165,
        "requires": ["upgrade.harbor_canner"],
    },
]

NEW_COSMETICS = [
    {
        "id": "entitlement.cosmetic.aurora_bunting",
        "sku": "fish.cosmetic.aurora_bunting",
        "androidProductId": "fish_cosmetic_aurora_bunting",
        "webProductId": "fish.cosmetic.aurora_bunting",
        "grantsCosmetic": "banner.iap_aurora_bunting",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Aurora bunting",
        "description": "Aurora Inlet light bunting. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [90, 200, 180],
    },
    {
        "id": "entitlement.cosmetic.tideglass_pennant",
        "sku": "fish.cosmetic.tideglass_pennant",
        "androidProductId": "fish_cosmetic_tideglass_pennant",
        "webProductId": "fish.cosmetic.tideglass_pennant",
        "grantsCosmetic": "banner.iap_tideglass_pennant",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Tideglass pennant",
        "description": "Tideglass Bay mirror pennant. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [120, 190, 220],
    },
    {
        "id": "entitlement.cosmetic.inlet_flag",
        "sku": "fish.cosmetic.inlet_flag",
        "androidProductId": "fish_cosmetic_inlet_flag",
        "webProductId": "fish.cosmetic.inlet_flag",
        "grantsCosmetic": "banner.iap_inlet_flag",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Inlet flag",
        "description": "Northern inlet harbor flag. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [70, 140, 200],
    },
    {
        "id": "entitlement.cosmetic.bay_streamer",
        "sku": "fish.cosmetic.bay_streamer",
        "androidProductId": "fish_cosmetic_bay_streamer",
        "webProductId": "fish.cosmetic.bay_streamer",
        "grantsCosmetic": "banner.iap_bay_streamer",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Bay streamer",
        "description": "Tideglass ferry streamers. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [160, 210, 230],
    },
    {
        "id": "entitlement.cosmetic.poach_ribbon",
        "sku": "fish.cosmetic.poach_ribbon",
        "androidProductId": "fish_cosmetic_poach_ribbon",
        "webProductId": "fish.cosmetic.poach_ribbon",
        "grantsCosmetic": "banner.iap_poach_ribbon",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Poach ribbon",
        "description": "Poach pantry ribbon. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [210, 170, 110],
    },
    {
        "id": "entitlement.cosmetic.can_crest",
        "sku": "fish.cosmetic.can_crest",
        "androidProductId": "fish_cosmetic_can_crest",
        "webProductId": "fish.cosmetic.can_crest",
        "grantsCosmetic": "banner.iap_can_crest",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Can crest",
        "description": "Can circuit crest plaque. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [180, 140, 90],
    },
]

I18N = {
    "en": {},
    "es": {
        "rival.aurora_hawker": "Vendedor aurora",
        "rival.tideglass_trader": "Comerciante Tideglass",
        "rival.northern_roamer": "Errante del norte",
        "rival.glass_syndicate": "Sindicato de cristal",
        "event.aurora_inlet_lights": "Luces del inlet aurora",
        "event.tideglass_mirror_fair": "Feria espejo Tideglass",
        "event.poach_pantry_week": "Semana despensa pochada",
        "event.can_circuit_carnival": "Carnaval circuito lata",
        "customer.aurora_lights_guest": "Invitado luces aurora",
        "customer.tideglass_fair_tourist": "Turista feria Tideglass",
        "customer.poach_pantry_buyer": "Comprador despensa pochada",
        "customer.can_carnival_guest": "Invitado carnaval lata",
        "contract.aurora_lights_poach": "Bandeja pochada luces",
        "contract.tideglass_fair_can": "Plato lata feria",
        "contract.poach_pantry_haul": "Carga despensa pochada",
        "contract.can_carnival_crate": "Caja carnaval lata",
        "bait.aurora_nibble": "Bocado aurora",
        "bait.tideglass_flake": "Escama Tideglass",
        "bait.poach_paste": "Pasta pochada",
        "bait.can_spark": "Chispa lata",
        "banner.aurora_inlet_lights": "Luces inlet aurora",
        "banner.tideglass_mirror_fair": "Feria espejo Tideglass",
        "banner.poach_pantry_week": "Semana despensa",
        "banner.can_circuit_carnival": "Carnaval lata",
        "banner.iap_aurora_bunting": "Banderines aurora",
        "banner.iap_tideglass_pennant": "Gallardete Tideglass",
        "banner.iap_inlet_flag": "Bandera inlet",
        "banner.iap_bay_streamer": "Serpentinas bahía",
        "banner.iap_poach_ribbon": "Cinta pochada",
        "banner.iap_can_crest": "Cresta lata",
    },
    "pt": {
        "rival.aurora_hawker": "Vendedor aurora",
        "rival.tideglass_trader": "Comerciante Tideglass",
        "rival.northern_roamer": "Errante do norte",
        "rival.glass_syndicate": "Sindicato de vidro",
        "event.aurora_inlet_lights": "Luzes do inlet aurora",
        "event.tideglass_mirror_fair": "Feira espelho Tideglass",
        "event.poach_pantry_week": "Semana despensa pochada",
        "event.can_circuit_carnival": "Carnaval circuito lata",
        "customer.aurora_lights_guest": "Convidado luzes aurora",
        "customer.tideglass_fair_tourist": "Turista feira Tideglass",
        "customer.poach_pantry_buyer": "Comprador despensa pochada",
        "customer.can_carnival_guest": "Convidado carnaval lata",
        "contract.aurora_lights_poach": "Bandeja pochada luzes",
        "contract.tideglass_fair_can": "Prato lata feira",
        "contract.poach_pantry_haul": "Carga despensa pochada",
        "contract.can_carnival_crate": "Caixa carnaval lata",
        "bait.aurora_nibble": "Isca aurora",
        "bait.tideglass_flake": "Floco Tideglass",
        "bait.poach_paste": "Pasta pochada",
        "bait.can_spark": "Faísca lata",
        "banner.aurora_inlet_lights": "Luzes inlet aurora",
        "banner.tideglass_mirror_fair": "Feira espelho Tideglass",
        "banner.poach_pantry_week": "Semana despensa",
        "banner.can_circuit_carnival": "Carnaval lata",
        "banner.iap_aurora_bunting": "Bandeirinhas aurora",
        "banner.iap_tideglass_pennant": "Flâmula Tideglass",
        "banner.iap_inlet_flag": "Bandeira inlet",
        "banner.iap_bay_streamer": "Serpentinas baía",
        "banner.iap_poach_ribbon": "Fita pochada",
        "banner.iap_can_crest": "Crista lata",
    },
    "fr": {
        "rival.aurora_hawker": "Colporteur aurore",
        "rival.tideglass_trader": "Marchand Tideglass",
        "rival.northern_roamer": "Vagabond du nord",
        "rival.glass_syndicate": "Syndicat de verre",
        "event.aurora_inlet_lights": "Lumières de l’anse aurore",
        "event.tideglass_mirror_fair": "Foire miroir Tideglass",
        "event.poach_pantry_week": "Semaine garde-manger poché",
        "event.can_circuit_carnival": "Carnaval circuit conserve",
        "customer.aurora_lights_guest": "Invité lumières aurore",
        "customer.tideglass_fair_tourist": "Touriste foire Tideglass",
        "customer.poach_pantry_buyer": "Acheteur garde-manger poché",
        "customer.can_carnival_guest": "Invité carnaval conserve",
        "contract.aurora_lights_poach": "Plateau poché lumières",
        "contract.tideglass_fair_can": "Plat conserve foire",
        "contract.poach_pantry_haul": "Cargaison garde-manger",
        "contract.can_carnival_crate": "Caisse carnaval conserve",
        "bait.aurora_nibble": "Bouchée aurore",
        "bait.tideglass_flake": "Flocon Tideglass",
        "bait.poach_paste": "Pâte pochée",
        "bait.can_spark": "Étincelle conserve",
        "banner.aurora_inlet_lights": "Lumières anse aurore",
        "banner.tideglass_mirror_fair": "Foire miroir Tideglass",
        "banner.poach_pantry_week": "Semaine garde-manger",
        "banner.can_circuit_carnival": "Carnaval conserve",
        "banner.iap_aurora_bunting": "Guirlandes aurore",
        "banner.iap_tideglass_pennant": "Fanion Tideglass",
        "banner.iap_inlet_flag": "Drapeau anse",
        "banner.iap_bay_streamer": "Serpentins baie",
        "banner.iap_poach_ribbon": "Ruban poché",
        "banner.iap_can_crest": "Cimier conserve",
    },
    "ht": {
        "rival.aurora_hawker": "Vandè Aurora",
        "rival.tideglass_trader": "Komèsan Tideglass",
        "rival.northern_roamer": "Vagabon nò",
        "rival.glass_syndicate": "Sendika vè",
        "event.aurora_inlet_lights": "Limyè inlet aurora",
        "event.tideglass_mirror_fair": "Fwa mirwa Tideglass",
        "event.poach_pantry_week": "Semèn depo poché",
        "event.can_circuit_carnival": "Kanaval sikui bwat",
        "customer.aurora_lights_guest": "Envite limyè aurora",
        "customer.tideglass_fair_tourist": "Touris fwa Tideglass",
        "customer.poach_pantry_buyer": "Achtè depo poché",
        "customer.can_carnival_guest": "Envite kanaval bwat",
        "contract.aurora_lights_poach": "Plat poché limyè",
        "contract.tideglass_fair_can": "Plat bwat fwa",
        "contract.poach_pantry_haul": "Chaj depo poché",
        "contract.can_carnival_crate": "Bwat kanaval",
        "bait.aurora_nibble": "Moso aurora",
        "bait.tideglass_flake": "Flak Tideglass",
        "bait.poach_paste": "Pat poché",
        "bait.can_spark": "Etiçel bwat",
        "banner.aurora_inlet_lights": "Limyè inlet aurora",
        "banner.tideglass_mirror_fair": "Fwa mirwa Tideglass",
        "banner.poach_pantry_week": "Semèn depo",
        "banner.can_circuit_carnival": "Kanaval bwat",
        "banner.iap_aurora_bunting": "Bandwòl aurora",
        "banner.iap_tideglass_pennant": "Penan Tideglass",
        "banner.iap_inlet_flag": "Drapo inlet",
        "banner.iap_bay_streamer": "Serpantin bè",
        "banner.iap_poach_ribbon": "Ribon poché",
        "banner.iap_can_crest": "Krèt bwat",
    },
    "it": {
        "rival.aurora_hawker": "Venditore aurora",
        "rival.tideglass_trader": "Commerciante Tideglass",
        "rival.northern_roamer": "Vagabondo del nord",
        "rival.glass_syndicate": "Sindacato di vetro",
        "event.aurora_inlet_lights": "Luci dell’insenatura aurora",
        "event.tideglass_mirror_fair": "Fiera specchio Tideglass",
        "event.poach_pantry_week": "Settimana dispensa lessata",
        "event.can_circuit_carnival": "Carnevale circuito lattina",
        "customer.aurora_lights_guest": "Ospite luci aurora",
        "customer.tideglass_fair_tourist": "Turista fiera Tideglass",
        "customer.poach_pantry_buyer": "Acquirente dispensa lessata",
        "customer.can_carnival_guest": "Ospite carnevale lattina",
        "contract.aurora_lights_poach": "Vassoio lessato luci",
        "contract.tideglass_fair_can": "Piatto lattina fiera",
        "contract.poach_pantry_haul": "Carico dispensa lessata",
        "contract.can_carnival_crate": "Cassa carnevale lattina",
        "bait.aurora_nibble": "Boccone aurora",
        "bait.tideglass_flake": "Fiocco Tideglass",
        "bait.poach_paste": "Pasta lessata",
        "bait.can_spark": "Scintilla lattina",
        "banner.aurora_inlet_lights": "Luci insenatura aurora",
        "banner.tideglass_mirror_fair": "Fiera specchio Tideglass",
        "banner.poach_pantry_week": "Settimana dispensa",
        "banner.can_circuit_carnival": "Carnevale lattina",
        "banner.iap_aurora_bunting": "Festoni aurora",
        "banner.iap_tideglass_pennant": "Pennone Tideglass",
        "banner.iap_inlet_flag": "Bandiera insenatura",
        "banner.iap_bay_streamer": "Stelle filanti baia",
        "banner.iap_poach_ribbon": "Nastro lessato",
        "banner.iap_can_crest": "Cimiero lattina",
    },
    "ca": {
        "rival.aurora_hawker": "Venedor aurora",
        "rival.tideglass_trader": "Comerciant Tideglass",
        "rival.northern_roamer": "Errant del nord",
        "rival.glass_syndicate": "Sindicat de vidre",
        "event.aurora_inlet_lights": "Llums de l’inlet aurora",
        "event.tideglass_mirror_fair": "Fira mirall Tideglass",
        "event.poach_pantry_week": "Setmana rebost bullit",
        "event.can_circuit_carnival": "Carnaval circuit llauna",
        "customer.aurora_lights_guest": "Convidat llums aurora",
        "customer.tideglass_fair_tourist": "Turista fira Tideglass",
        "customer.poach_pantry_buyer": "Comprador rebost bullit",
        "customer.can_carnival_guest": "Convidat carnaval llauna",
        "contract.aurora_lights_poach": "Safata bullida llums",
        "contract.tideglass_fair_can": "Plat llauna fira",
        "contract.poach_pantry_haul": "Càrrega rebost bullit",
        "contract.can_carnival_crate": "Caixa carnaval llauna",
        "bait.aurora_nibble": "Mos aurora",
        "bait.tideglass_flake": "Escata Tideglass",
        "bait.poach_paste": "Pasta bullida",
        "bait.can_spark": "Espurna llauna",
        "banner.aurora_inlet_lights": "Llums inlet aurora",
        "banner.tideglass_mirror_fair": "Fira mirall Tideglass",
        "banner.poach_pantry_week": "Setmana rebost",
        "banner.can_circuit_carnival": "Carnaval llauna",
        "banner.iap_aurora_bunting": "Banderoles aurora",
        "banner.iap_tideglass_pennant": "Penó Tideglass",
        "banner.iap_inlet_flag": "Bandera inlet",
        "banner.iap_bay_streamer": "Serpentines badia",
        "banner.iap_poach_ribbon": "Cinta bullida",
        "banner.iap_can_crest": "Cresta llauna",
    },
    "ru": {
        "rival.aurora_hawker": "Аврора-торговец",
        "rival.tideglass_trader": "Торговец Тайдгласс",
        "rival.northern_roamer": "Северный странник",
        "rival.glass_syndicate": "Стеклянный синдикат",
        "event.aurora_inlet_lights": "Огни аврора-залива",
        "event.tideglass_mirror_fair": "Зеркальная ярмарка Тайдгласс",
        "event.poach_pantry_week": "Неделя припущенной кладовой",
        "event.can_circuit_carnival": "Карнавал консервного контура",
        "customer.aurora_lights_guest": "Гость огней авроры",
        "customer.tideglass_fair_tourist": "Турист ярмарки Тайдгласс",
        "customer.poach_pantry_buyer": "Покупатель припущенной кладовой",
        "customer.can_carnival_guest": "Гость консервного карнавала",
        "contract.aurora_lights_poach": "Поднос припущенной рыбы",
        "contract.tideglass_fair_can": "Блюдо консервов ярмарки",
        "contract.poach_pantry_haul": "Партия припущенной кладовой",
        "contract.can_carnival_crate": "Ящик консервного карнавала",
        "bait.aurora_nibble": "Аврора-наживка",
        "bait.tideglass_flake": "Хлопья Тайдгласс",
        "bait.poach_paste": "Припущенная паста",
        "bait.can_spark": "Искра консервов",
        "banner.aurora_inlet_lights": "Огни аврора-залива",
        "banner.tideglass_mirror_fair": "Зеркальная ярмарка",
        "banner.poach_pantry_week": "Неделя кладовой",
        "banner.can_circuit_carnival": "Карнавал консервов",
        "banner.iap_aurora_bunting": "Гирлянды авроры",
        "banner.iap_tideglass_pennant": "Вымпел Тайдгласс",
        "banner.iap_inlet_flag": "Флаг залива",
        "banner.iap_bay_streamer": "Серпантин бухты",
        "banner.iap_poach_ribbon": "Лента припуска",
        "banner.iap_can_crest": "Гребень консервов",
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
    for r in NEW_RIVALS:
        I18N["en"][r["id"]] = r["name"]
    for e in NEW_EVENTS:
        I18N["en"][e["id"]] = e["name"]
        I18N["en"][e["banner"]] = e["name"]
    for c in NEW_CUSTOMERS:
        I18N["en"][c["id"]] = c["name"]
    for t in NEW_CONTRACTS:
        I18N["en"][t["id"]] = t["name"]
    for b in NEW_BAITS:
        I18N["en"][b["id"]] = b["name"]
    for c in NEW_COSMETICS:
        I18N["en"][c["grantsCosmetic"]] = c["title"]


def entitlement_row(c: dict) -> dict:
    return {k: c[k] for k in (
        "id", "sku", "androidProductId", "webProductId", "grantsCosmetic",
        "type", "powerNeutral", "title", "description",
    )}


def presentation_row(c: dict) -> dict:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    return {
        "cosmeticId": c["grantsCosmetic"],
        "sku": c["sku"],
        "title": c["title"],
        "swatchRgb": c["swatchRgb"],
        "source": "iap",
        "powerNeutral": True,
        "meshAsset": f"models/cosmetic_banner_{short}.glb",
        "minCosmeticArtNodes": 4,
    }


def banner_asset_row(c: dict) -> dict:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    return {
        "cosmeticId": c["grantsCosmetic"],
        "asset": f"shared/assets/models/cosmetic_banner_{short}.glb",
    }


def sku_kt_block(c: dict) -> str:
    return f'''        Sku(
            id = "{c["id"]}",
            sku = "{c["sku"]}",
            androidProductId = "{c["androidProductId"]}",
            webProductId = "{c["webProductId"]}",
            grantsCosmetic = "{c["grantsCosmetic"]}",
            title = "{c["title"]}",
            description = "{c["description"]}",
        ),'''


def sku_ts_block(c: dict) -> str:
    return f'''    {{
      id: "{c["id"]}",
      sku: "{c["sku"]}",
      webProductId: "{c["webProductId"]}",
      androidProductId: "{c["androidProductId"]}",
      grantsCosmetic: "{c["grantsCosmetic"]}",
      title: "{c["title"]}",
      description: "{c["description"]}",
    }},'''


def presentation_kt_item(c: dict) -> str:
    short = c["grantsCosmetic"].replace("banner.iap_", "")
    r, g, b = c["swatchRgb"]
    return (
        f'        Item("{c["grantsCosmetic"]}", "{c["sku"]}", "{c["title"]}", '
        f'intArrayOf({r}, {g}, {b}), "iap", "models/cosmetic_banner_{short}.glb"),'
    )


def patch_cosmetics_iap_kt() -> None:
    text = COSMETICS_KT.read_text(encoding="utf-8")
    blocks = [sku_kt_block(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["sku"] not in text]
    if not to_add:
        return
    anchor = 'grantsCosmetic = "banner.iap_aurora_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticsIap.kt missing aurora_crest anchor")
    close = text.find(")", idx)
    comma = text.find(",", close)
    insert_at = comma + 1
    COSMETICS_KT.write_text(text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:], encoding="utf-8")


def patch_systems_ts() -> None:
    text = SYSTEMS_TS.read_text(encoding="utf-8")
    blocks = [sku_ts_block(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["sku"] not in text]
    if not to_add:
        return
    anchor = 'grantsCosmetic: "banner.iap_aurora_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("systems.ts missing aurora_crest anchor")
    close = text.find("},", idx)
    insert_at = close + 2
    SYSTEMS_TS.write_text(text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:], encoding="utf-8")


def patch_presentation_kt() -> None:
    text = PRESENTATION_KT.read_text(encoding="utf-8")
    blocks = [presentation_kt_item(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["grantsCosmetic"] not in text]
    if not to_add:
        return
    anchor = 'Item("banner.iap_aurora_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticPresentation.kt missing aurora_crest anchor")
    end = text.find("\n", text.find("),", idx))
    if end < 0:
        raise SystemExit("CosmeticPresentation.kt aurora_crest line terminator missing")
    PRESENTATION_KT.write_text(text[:end] + "\n" + "\n".join(to_add) + text[end:], encoding="utf-8")


def write_ship(data: dict, cosmetics: list) -> None:
    rivals = data["rivalMarkets"]["rivals"]
    events = data["seasonalEvents"]["events"]
    baits = data["bait"]
    catalog = {
        "phase": 18,
        "plan": "30_finish_5.0",
        "schema": "fish.ship.rivals_seasonal_5.v1",
        "description": (
            "Finish 5.0 Phase 18 — raise rivals→16, seasonal→16, baits→16, cosmetics→24 "
            "with aurora/tideglass coverage. Schema stays 26 / content 4.0.0."
        ),
        "contentVersion": "4.0.0",
        "schemaVersion": 26,
        "rivalsSeasonal5Marker": MARKER,
        "rivalsMin": 16,
        "seasonalEventsMin": 16,
        "baitsMin": 16,
        "cosmeticsMin": 24,
        "newRivalIds": [r["id"] for r in NEW_RIVALS],
        "newEventIds": [e["id"] for e in NEW_EVENTS],
        "newBaitIds": [b["id"] for b in NEW_BAITS],
        "newCosmeticIds": [c["grantsCosmetic"] for c in NEW_COSMETICS],
        "newCosmeticSkus": [c["sku"] for c in NEW_COSMETICS],
        "periodTicks": PERIOD,
        "extendsRivalMarkets2": "shared/ship/rival-markets-2.json",
        "extendsSeasonalBait4": "shared/ship/seasonal-bait-4.json",
        "extendsCosmetics4": "shared/ship/cosmetics-iap-4.json",
        "parityFixture": "shared/fixtures/parity-rivals-seasonal-5.json",
        "authorTool": "shared/tools/author_rivals_seasonal_5.py",
        "validateScript": "npm run rivalsseasonal5:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-5.0-kickoff.json",
        "checklist": [
            "≥16 rivals covering all 12 harbors including aurora_inlet + tideglass_bay",
            "≥16 seasonal events (periodTicks≥21000) + festival customers/contracts",
            "≥16 baits including aurora/tideglass/poach/can gated tips",
            "≥24 power-neutral cosmetics + banner meshes",
            "kickoff baselines met + contentFloorsShort=false",
            "rivals2/seasonalbait4/cosmetics4 soft floors stay green",
            "parity + rivalsseasonal5:validate green in CI",
            "schema stays 26 / content 4.0.0",
        ],
        "preflightGates": [
            "shared/ship/rivals-seasonal-5.json",
            "shared/fixtures/parity-rivals-seasonal-5.json",
            "shared/ship/rival-markets-2.json",
            "shared/ship/seasonal-bait-4.json",
            "shared/ship/cosmetics-iap-4.json",
            "shared/content/content-pack.json",
            "shared/billing/entitlements.json",
            "shared/content/cosmetic-presentation.json",
            "shared/tools/author_rivals_seasonal_5.py",
            "web/src/ship/rivalsSeasonal5.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalsSeasonal5.kt",
            "web/scripts/validate-rivals-seasonal-5.ts",
        ],
        "measured": {
            "rivals": len(rivals),
            "seasonalEvents": len(events),
            "baits": len(baits),
            "cosmetics": len(cosmetics),
            "harborsCovered": len({h for r in rivals for h in r["harbors"]}),
        },
    }
    dump(SHIP, catalog)

    parity = {
        "schema": "fish.fixture.parity_rivals_seasonal_5.v1",
        "rivalsSeasonal5Marker": MARKER,
        "phase": 18,
        "plan": "30_finish_5.0",
        "description": (
            "Finish 5.0 Phase 18: aurora dawn activates Aurora Hawker + Glass Syndicate; "
            "floors rivals/seasonal/baits/cosmetics met; contentFloorsShort closed."
        ),
        "harborId": "harbor.aurora_inlet",
        "seed": 1818,
        "sampleRivalId": "rival.aurora_hawker",
        "sampleEventId": "event.aurora_inlet_lights",
        "sampleBaitId": "bait.aurora_nibble",
        "sampleCosmeticId": "banner.iap_aurora_bunting",
        "expect": {
            "rivalsMin": 16,
            "seasonalEventsMin": 16,
            "baitsMin": 16,
            "cosmeticsMin": 24,
            "schemaVersion": 26,
            "contentVersion": "4.0.0",
            "contentFloorsShort": False,
            "gates": [
                "rivals_16",
                "seasonal_16",
                "baits_16",
                "cosmetics_24",
                "harbors_covered",
                "kickoff_floors",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(data: dict, cosmetics_count: int) -> None:
    kick = json.loads(KICKOFF.read_text(encoding="utf-8"))
    kick["baseline"]["rivalMarkets"] = len(data["rivalMarkets"]["rivals"])
    kick["baseline"]["seasonalEvents"] = len(data["seasonalEvents"]["events"])
    kick["baseline"]["baits"] = len(data["bait"])
    kick["baseline"]["cosmetics"] = cosmetics_count
    kick["gaps"]["contentFloorsShort"] = False
    dump(KICKOFF, kick)

    dod = json.loads(DOD.read_text(encoding="utf-8"))
    quotas = dod.setdefault("quotas", {})
    quotas["rivalMarkets"] = max(int(quotas.get("rivalMarkets") or 0), 16)
    quotas["seasonalEvents"] = max(int(quotas.get("seasonalEvents") or 0), 16)
    quotas["baits"] = max(int(quotas.get("baits") or 0), 16)
    quotas["cosmetics"] = max(int(quotas.get("cosmetics") or 0), 24)
    dod["notes"] = (
        "Finish 5.0 Phase 18 rivals-seasonal-5 complete (rivals/seasonal/baits/cosmetics floors); "
        "Phases 1–17 remain green. Content stays 4.0.0 / schema 26. contentFloorsShort closed. "
        "Deploy/tag remain manual."
    )
    dod["rivalsSeasonal5"] = {
        "phase": 18,
        "plan": "30_finish_5.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "rivalsSeasonal5Marker": MARKER,
        "catalog": "shared/ship/rivals-seasonal-5.json",
        "parityFixture": "shared/fixtures/parity-rivals-seasonal-5.json",
        "validateScript": "npm run rivalsseasonal5:validate",
        "checklist": [
            "rivals≥16 / seasonal≥16 / baits≥16 / cosmetics≥24",
            "all 12 harbors rival-covered",
            "kickoff contentFloorsShort=false",
            "rivalsseasonal5:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["rivalsSeasonal5Phase"] = 18
    listing["rivalsSeasonal5Catalog"] = "shared/ship/rivals-seasonal-5.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["rivalsSeasonal5"] = "shared/ship/rivals-seasonal-5.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-rivals-seasonal-5.json" not in fixtures:
        fixtures.append("parity-rivals-seasonal-5.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))

    # --- rivals ---
    rm = data["rivalMarkets"]
    by_id = {r["id"]: r for r in rm["rivals"]}
    for rival in NEW_RIVALS:
        by_id[rival["id"]] = rival
    ordered = []
    seen = set()
    for r in rm["rivals"]:
        ordered.append(by_id[r["id"]])
        seen.add(r["id"])
    for rival in NEW_RIVALS:
        if rival["id"] not in seen:
            ordered.append(rival)
    rm["rivals"] = ordered

    product_ids = {p["id"] for p in data["products"]}
    harbor_ids = {h["id"] for h in data["harbors"]}
    day_parts = {p["id"] for p in data["ecology"]["parts"]}
    for rival in rm["rivals"]:
        assert set(rival["harbors"]) <= harbor_ids, rival["id"]
        assert set(rival["specialtyProducts"]) <= product_ids, rival["id"]
        assert set(rival["activeDayParts"]) <= day_parts, rival["id"]

    specialty_by_harbor = {
        "harbor.aurora_inlet": [
            "product.poached_fillet",
            "product.poach_broth",
            "product.poach_carton",
            "product.can_medley",
            "product.can_carton",
        ],
        "harbor.tideglass_bay": [
            "product.canned_fillet",
            "product.can_medley",
            "product.can_carton",
            "product.poach_broth",
            "product.poach_carton",
        ],
    }
    for h in data["harbors"]:
        add = specialty_by_harbor.get(h["id"])
        if not add:
            continue
        for c in h.get("counters", []):
            kind = c.get("kind", "retail")
            prods = c.setdefault("products", [])
            for item in add:
                wholesale = "carton" in item
                if wholesale and kind != "wholesale":
                    continue
                if not wholesale and kind == "wholesale":
                    continue
                if item not in prods:
                    prods.append(item)

    # --- seasonal + baits ---
    for e in data["seasonalEvents"]["events"]:
        e["periodTicks"] = PERIOD
    upsert_list(data["seasonalEvents"]["events"], NEW_EVENTS)
    upsert_list(data["customers"], NEW_CUSTOMERS)
    upsert_list(data["contracts"]["templates"], NEW_CONTRACTS)
    upsert_list(data["bait"], NEW_BAITS)

    dump(PACK, data)

    # --- cosmetics ---
    ent = json.loads(ENTITLEMENTS.read_text(encoding="utf-8"))
    upsert_list(ent["cosmetics"], [entitlement_row(c) for c in NEW_COSMETICS])
    dump(ENTITLEMENTS, ent)

    pres = json.loads(PRESENTATION.read_text(encoding="utf-8"))
    upsert_list(pres["items"], [presentation_row(c) for c in NEW_COSMETICS], key="cosmeticId")
    dump(PRESENTATION, pres)

    product = json.loads(PRODUCT_ART.read_text(encoding="utf-8"))
    product["cosmeticBannerTarget"] = max(int(product.get("cosmeticBannerTarget", 0)), 24)
    upsert_list(product["cosmeticBanners"], [banner_asset_row(c) for c in NEW_COSMETICS], key="cosmeticId")
    dump(PRODUCT_ART, product)

    support = json.loads(SUPPORT.read_text(encoding="utf-8"))
    skus = support.setdefault("restore", {}).setdefault("skus", [])
    for c in NEW_COSMETICS:
        if c["sku"] not in skus:
            skus.append(c["sku"])
    dump(SUPPORT, support)

    out_dir = ROOT / "assets" / "models"
    out_dir.mkdir(parents=True, exist_ok=True)
    for c in NEW_COSMETICS:
        write_cosmetic_banner(out_dir, c["grantsCosmetic"], c["swatchRgb"])

    patch_cosmetics_iap_kt()
    patch_systems_ts()
    patch_presentation_kt()

    for locale, path in I18N_PATHS.items():
        doc = json.loads(path.read_text(encoding="utf-8"))
        strings = doc.setdefault("strings", {})
        for k, v in I18N[locale].items():
            strings[k] = v
        dump(path, doc)

    sync = ROOT / "tools" / "sync_i18n_kotlin.py"
    if sync.is_file():
        subprocess.check_call(["python3", str(sync)], cwd=str(REPO))

    write_ship(data, ent["cosmetics"])
    update_kickoff_dod_listing_pin(data, len(ent["cosmetics"]))

    covered = {h for r in data["rivalMarkets"]["rivals"] for h in r["harbors"]}
    print(
        f"OK Phase 18 rivals-seasonal-5: rivals={len(data['rivalMarkets']['rivals'])} "
        f"events={len(data['seasonalEvents']['events'])} baits={len(data['bait'])} "
        f"cosmetics={len(ent['cosmetics'])} covered={len(covered)}/{len(harbor_ids)} "
        f"period={PERIOD}"
    )


if __name__ == "__main__":
    main()
