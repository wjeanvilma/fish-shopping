#!/usr/bin/env python3
"""
Finish 6.0 Phase 15 — rivals→20, seasonal→20, baits→20, cosmetics→30.

Usage:
  python3 shared/tools/author_rivals_seasonal_6.py
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
PACK = ROOT / "content" / "content-pack.json"
SHIP = ROOT / "ship" / "rivals-seasonal-6.json"
PARITY = ROOT / "fixtures" / "parity-rivals-seasonal-6.json"
KICKOFF6 = ROOT / "ship" / "finish-6.0-kickoff.json"
PARITY6 = ROOT / "fixtures" / "parity-finish-6.0-kickoff.json"
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

import sys

sys.path.insert(0, str(ROOT / "tools"))
from generate_fish_stubs import write_cosmetic_banner  # noqa: E402

MARKER = "authored-finish-6.0-phase-15"
PERIOD = 25200
OPEN_GAP_MIN = 14

NEW_RIVALS = [
    {
        "id": "rival.saffron_hawker",
        "name": "Saffron Hawker",
        "description": "Quay hawker siphoning roasted fillets and chips at Saffron Quay.",
        "harbors": ["harbor.saffron_quay"],
        "aggressionPermille": 510,
        "specialtyProducts": ["product.roasted_fillet", "product.roast_chip"],
        "undercutPriceMultPermille": 860,
        "activeDayParts": ["dawn", "day", "dusk"],
        "aiProfile": "siphon",
    },
    {
        "id": "rival.cobalt_trader",
        "name": "Cobalt Trader",
        "description": "Sound trader undercutting fermented fillets and paste at Cobalt Sound.",
        "harbors": ["harbor.cobalt_sound"],
        "aggressionPermille": 520,
        "specialtyProducts": ["product.fermented_fillet", "product.ferment_paste"],
        "undercutPriceMultPermille": 850,
        "activeDayParts": ["day", "dusk", "night"],
        "aiProfile": "undercut",
    },
    {
        "id": "rival.nest_roamer",
        "name": "Nest Roamer",
        "description": "Roaming stall hopping Saffron Quay and Cobalt Sound for roast/ferment trays.",
        "harbors": ["harbor.saffron_quay", "harbor.cobalt_sound"],
        "aggressionPermille": 490,
        "specialtyProducts": ["product.roast_chip", "product.ferment_paste"],
        "undercutPriceMultPermille": 875,
        "activeDayParts": ["dusk", "night"],
        "aiProfile": "roamer",
    },
    {
        "id": "rival.covenant_syndicate",
        "name": "Covenant Syndicate",
        "description": "Adaptive syndicate working saffron/cobalt wholesale cartons after a beat.",
        "harbors": ["harbor.saffron_quay", "harbor.cobalt_sound"],
        "aggressionPermille": 540,
        "specialtyProducts": ["product.roast_carton", "product.ferment_carton"],
        "undercutPriceMultPermille": 840,
        "activeDayParts": ["dawn", "day"],
        "aiProfile": "adaptive",
    },
]

NEW_EVENTS = [
    {
        "id": "event.saffron_quay_ember_fair",
        "name": "Saffron Quay Ember Fair",
        "description": "Ember stalls pack the quay for saffron sole and kiln perch runs.",
        "periodTicks": PERIOD,
        "startTick": 19900,
        "durationTicks": 900,
        "banner": "banner.saffron_quay_ember_fair",
        "customerSpawnMultPermille": 1530,
        "priceMultPermille": 1290,
        "festivalCustomerIds": ["customer.saffron_ember_guest"],
        "speciesWeightMultPermille": {
            "species.saffron_sole": 2000,
            "species.saffron_sprat": 1800,
            "species.kiln_perch": 1600,
            "species.cinder_carp": 1500,
        },
    },
    {
        "id": "event.cobalt_sound_rime_vigil",
        "name": "Cobalt Sound Rime Vigil",
        "description": "Rime lanterns draw cobalt smelt and sound char across the sound.",
        "periodTicks": PERIOD,
        "startTick": 20850,
        "durationTicks": 900,
        "banner": "banner.cobalt_sound_rime_vigil",
        "customerSpawnMultPermille": 1550,
        "priceMultPermille": 1310,
        "festivalCustomerIds": ["customer.cobalt_rime_tourist"],
        "speciesWeightMultPermille": {
            "species.cobalt_smelt": 2000,
            "species.cobalt_tuna": 1900,
            "species.sound_char": 1600,
            "species.frost_jack": 1500,
        },
    },
    {
        "id": "event.roast_nest_week",
        "name": "Roast Nest Week",
        "description": "Roast kitchens draw bulk buyers across the saffron nest circuit.",
        "periodTicks": PERIOD,
        "startTick": 21800,
        "durationTicks": 900,
        "banner": "banner.roast_nest_week",
        "customerSpawnMultPermille": 1490,
        "priceMultPermille": 1330,
        "festivalCustomerIds": ["customer.roast_nest_buyer"],
        "speciesWeightMultPermille": {
            "species.saffron_sole": 1800,
            "species.gilt_mackerel": 1700,
            "species.amber_snapper": 1500,
        },
    },
    {
        "id": "event.ferment_covenant_carnival",
        "name": "Ferment Covenant Carnival",
        "description": "Carnival ferment trays pack the cobalt ferry docks.",
        "periodTicks": PERIOD,
        "startTick": 22750,
        "durationTicks": 1000,
        "banner": "banner.ferment_covenant_carnival",
        "customerSpawnMultPermille": 1510,
        "priceMultPermille": 1350,
        "festivalCustomerIds": ["customer.ferment_carnival_guest"],
        "speciesWeightMultPermille": {
            "species.cobalt_tuna": 1900,
            "species.aurora_cod": 1700,
            "species.ice_char": 1600,
            "species.polar_herring": 1500,
        },
    },
]

NEW_CUSTOMERS = [
    {
        "id": "customer.saffron_ember_guest",
        "name": "Saffron ember guest",
        "kind": "premium",
        "basketMin": 1,
        "basketMax": 3,
        "patienceTicks": 1450,
        "spawnWeight": 72,
        "priceMultPermille": 1600,
        "preferredProducts": [
            {"item": "product.roasted_fillet", "weight": 55},
            {"item": "product.roast_chip", "weight": 45},
        ],
        "unmetPriceMultPermille": 740,
        "unmetPatienceDrainPermille": 1850,
        "requiresSeasonalEvent": "event.saffron_quay_ember_fair",
    },
    {
        "id": "customer.cobalt_rime_tourist",
        "name": "Cobalt rime tourist",
        "kind": "tourist",
        "basketMin": 1,
        "basketMax": 2,
        "patienceTicks": 1350,
        "spawnWeight": 74,
        "priceMultPermille": 1550,
        "preferredProducts": [
            {"item": "product.fermented_fillet", "weight": 55},
            {"item": "product.ferment_paste", "weight": 45},
        ],
        "unmetPriceMultPermille": 735,
        "unmetPatienceDrainPermille": 1900,
        "requiresSeasonalEvent": "event.cobalt_sound_rime_vigil",
    },
    {
        "id": "customer.roast_nest_buyer",
        "name": "Roast nest buyer",
        "kind": "wholesaler",
        "basketMin": 2,
        "basketMax": 4,
        "patienceTicks": 1600,
        "spawnWeight": 66,
        "priceMultPermille": 1650,
        "preferredProducts": [
            {"item": "product.roast_carton", "weight": 60},
            {"item": "product.roasted_fillet", "weight": 40},
        ],
        "unmetPriceMultPermille": 720,
        "unmetPatienceDrainPermille": 1750,
        "requiresSeasonalEvent": "event.roast_nest_week",
    },
    {
        "id": "customer.ferment_carnival_guest",
        "name": "Ferment carnival guest",
        "kind": "tourist",
        "basketMin": 2,
        "basketMax": 3,
        "patienceTicks": 1500,
        "spawnWeight": 70,
        "priceMultPermille": 1580,
        "preferredProducts": [
            {"item": "product.ferment_carton", "weight": 55},
            {"item": "product.ferment_paste", "weight": 45},
        ],
        "unmetPriceMultPermille": 730,
        "unmetPatienceDrainPermille": 1800,
        "requiresSeasonalEvent": "event.ferment_covenant_carnival",
    },
]

NEW_CONTRACTS = [
    {
        "id": "contract.saffron_ember_roast",
        "name": "Saffron ember roast tray",
        "description": "Festival-only — roasted fillets for the quay ember stalls.",
        "item": "product.roasted_fillet",
        "quantity": 3,
        "durationTicks": 1400,
        "payout": 105,
        "penalty": 25,
        "weight": 70,
        "requiresSeasonalEvent": "event.saffron_quay_ember_fair",
    },
    {
        "id": "contract.cobalt_rime_ferment",
        "name": "Cobalt rime ferment platter",
        "description": "Festival-only — fermented fillets for the rime vigil booths.",
        "item": "product.fermented_fillet",
        "quantity": 4,
        "durationTicks": 1350,
        "payout": 100,
        "penalty": 23,
        "weight": 72,
        "requiresSeasonalEvent": "event.cobalt_sound_rime_vigil",
    },
    {
        "id": "contract.roast_nest_haul",
        "name": "Roast nest haul",
        "description": "Festival-only — roast cartons for the nest week kitchens.",
        "item": "product.roast_carton",
        "quantity": 2,
        "durationTicks": 1500,
        "payout": 125,
        "penalty": 29,
        "weight": 68,
        "requiresSeasonalEvent": "event.roast_nest_week",
    },
    {
        "id": "contract.ferment_carnival_crate",
        "name": "Ferment carnival crate",
        "description": "Festival-only — ferment cartons for the carnival docks.",
        "item": "product.ferment_carton",
        "quantity": 2,
        "durationTicks": 1550,
        "payout": 130,
        "penalty": 31,
        "weight": 66,
        "requiresSeasonalEvent": "event.ferment_covenant_carnival",
    },
]

NEW_BAITS = [
    {
        "id": "bait.saffron_nibble",
        "name": "Saffron nibble",
        "description": "Pack of 3. Warm quay nibble for saffron sole and sprat.",
        "carryUnits": 1,
        "packQuantity": 3,
        "cost": 58,
        "rareSpeciesWeightMultPermille": 1420,
        "rareChanceBonusPermille": 85,
        "requires": ["upgrade.bait_pouch"],
    },
    {
        "id": "bait.cobalt_flake",
        "name": "Cobalt flake",
        "description": "Pack of 2. Sound flake that sweetens cobalt smelt and tuna.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 82,
        "rareSpeciesWeightMultPermille": 1580,
        "rareChanceBonusPermille": 105,
        "requires": ["upgrade.rod_speed_2"],
    },
    {
        "id": "bait.roast_paste",
        "name": "Roast paste",
        "description": "Pack of 2. Kitchen paste for rare saffron runs past the roaster line.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 130,
        "rareSpeciesWeightMultPermille": 1720,
        "rareChanceBonusPermille": 135,
        "requires": ["upgrade.harbor_roaster"],
    },
    {
        "id": "bait.ferment_spark",
        "name": "Ferment spark",
        "description": "Pack of 2. Spark tip for cobalt rares after the fermenter unlock.",
        "carryUnits": 1,
        "packQuantity": 2,
        "cost": 180,
        "rareSpeciesWeightMultPermille": 1880,
        "rareChanceBonusPermille": 170,
        "requires": ["upgrade.harbor_fermenter"],
    },
]

NEW_COSMETICS = [
    {
        "id": "entitlement.cosmetic.saffron_bunting",
        "sku": "fish.cosmetic.saffron_bunting",
        "androidProductId": "fish_cosmetic_saffron_bunting",
        "webProductId": "fish.cosmetic.saffron_bunting",
        "grantsCosmetic": "banner.iap_saffron_bunting",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Saffron bunting",
        "description": "Saffron Quay ember bunting. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [220, 140, 70],
    },
    {
        "id": "entitlement.cosmetic.cobalt_pennant",
        "sku": "fish.cosmetic.cobalt_pennant",
        "androidProductId": "fish_cosmetic_cobalt_pennant",
        "webProductId": "fish.cosmetic.cobalt_pennant",
        "grantsCosmetic": "banner.iap_cobalt_pennant",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Cobalt pennant",
        "description": "Cobalt Sound rime pennant. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [70, 120, 190],
    },
    {
        "id": "entitlement.cosmetic.quay_flag",
        "sku": "fish.cosmetic.quay_flag",
        "androidProductId": "fish_cosmetic_quay_flag",
        "webProductId": "fish.cosmetic.quay_flag",
        "grantsCosmetic": "banner.iap_quay_flag",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Quay flag",
        "description": "Saffron quay harbor flag. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [200, 110, 60],
    },
    {
        "id": "entitlement.cosmetic.sound_streamer",
        "sku": "fish.cosmetic.sound_streamer",
        "androidProductId": "fish_cosmetic_sound_streamer",
        "webProductId": "fish.cosmetic.sound_streamer",
        "grantsCosmetic": "banner.iap_sound_streamer",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Sound streamer",
        "description": "Cobalt ferry streamers. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [90, 150, 210],
    },
    {
        "id": "entitlement.cosmetic.roast_ribbon",
        "sku": "fish.cosmetic.roast_ribbon",
        "androidProductId": "fish_cosmetic_roast_ribbon",
        "webProductId": "fish.cosmetic.roast_ribbon",
        "grantsCosmetic": "banner.iap_roast_ribbon",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Roast ribbon",
        "description": "Roast nest ribbon. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [190, 120, 80],
    },
    {
        "id": "entitlement.cosmetic.ferment_crest",
        "sku": "fish.cosmetic.ferment_crest",
        "androidProductId": "fish_cosmetic_ferment_crest",
        "webProductId": "fish.cosmetic.ferment_crest",
        "grantsCosmetic": "banner.iap_ferment_crest",
        "type": "non_consumable",
        "powerNeutral": True,
        "title": "Ferment crest",
        "description": "Ferment covenant crest plaque. Visual only — never changes rates, wages, or sale prices.",
        "swatchRgb": [100, 90, 160],
    },
]

I18N = {
    "en": {},
    "es": {
        "rival.saffron_hawker": "Vendedor azafrán",
        "rival.cobalt_trader": "Comerciante cobalto",
        "rival.nest_roamer": "Errante del nido",
        "rival.covenant_syndicate": "Sindicato del pacto",
        "event.saffron_quay_ember_fair": "Feria ember muelle azafrán",
        "event.cobalt_sound_rime_vigil": "Vigilia rime sonido cobalto",
        "event.roast_nest_week": "Semana nido asado",
        "event.ferment_covenant_carnival": "Carnaval pacto fermentado",
        "customer.saffron_ember_guest": "Invitado ember azafrán",
        "customer.cobalt_rime_tourist": "Turista rime cobalto",
        "customer.roast_nest_buyer": "Comprador nido asado",
        "customer.ferment_carnival_guest": "Invitado carnaval fermentado",
        "contract.saffron_ember_roast": "Bandeja asada ember",
        "contract.cobalt_rime_ferment": "Plato fermentado rime",
        "contract.roast_nest_haul": "Carga nido asado",
        "contract.ferment_carnival_crate": "Caja carnaval fermentado",
        "bait.saffron_nibble": "Bocado azafrán",
        "bait.cobalt_flake": "Escama cobalto",
        "bait.roast_paste": "Pasta asada",
        "bait.ferment_spark": "Chispa fermentada",
        "banner.saffron_quay_ember_fair": "Feria ember azafrán",
        "banner.cobalt_sound_rime_vigil": "Vigilia rime cobalto",
        "banner.roast_nest_week": "Semana nido asado",
        "banner.ferment_covenant_carnival": "Carnaval fermentado",
        "banner.iap_saffron_bunting": "Banderines azafrán",
        "banner.iap_cobalt_pennant": "Gallardete cobalto",
        "banner.iap_quay_flag": "Bandera muelle",
        "banner.iap_sound_streamer": "Serpentinas sonido",
        "banner.iap_roast_ribbon": "Cinta asada",
        "banner.iap_ferment_crest": "Cresta fermentada",
    },
    "pt": {
        "rival.saffron_hawker": "Vendedor açafrão",
        "rival.cobalt_trader": "Comerciante cobalto",
        "rival.nest_roamer": "Errante do ninho",
        "rival.covenant_syndicate": "Sindicato do pacto",
        "event.saffron_quay_ember_fair": "Feira ember cais açafrão",
        "event.cobalt_sound_rime_vigil": "Vigília rime som cobalto",
        "event.roast_nest_week": "Semana ninho assado",
        "event.ferment_covenant_carnival": "Carnaval pacto fermentado",
        "customer.saffron_ember_guest": "Convidado ember açafrão",
        "customer.cobalt_rime_tourist": "Turista rime cobalto",
        "customer.roast_nest_buyer": "Comprador ninho assado",
        "customer.ferment_carnival_guest": "Convidado carnaval fermentado",
        "contract.saffron_ember_roast": "Bandeja assada ember",
        "contract.cobalt_rime_ferment": "Prato fermentado rime",
        "contract.roast_nest_haul": "Carga ninho assado",
        "contract.ferment_carnival_crate": "Caixa carnaval fermentado",
        "bait.saffron_nibble": "Isca açafrão",
        "bait.cobalt_flake": "Floco cobalto",
        "bait.roast_paste": "Pasta assada",
        "bait.ferment_spark": "Faísca fermentada",
        "banner.saffron_quay_ember_fair": "Feira ember açafrão",
        "banner.cobalt_sound_rime_vigil": "Vigília rime cobalto",
        "banner.roast_nest_week": "Semana ninho assado",
        "banner.ferment_covenant_carnival": "Carnaval fermentado",
        "banner.iap_saffron_bunting": "Bandeirinhas açafrão",
        "banner.iap_cobalt_pennant": "Flâmula cobalto",
        "banner.iap_quay_flag": "Bandeira cais",
        "banner.iap_sound_streamer": "Serpentinas som",
        "banner.iap_roast_ribbon": "Fita assada",
        "banner.iap_ferment_crest": "Crista fermentada",
    },
    "fr": {
        "rival.saffron_hawker": "Colporteur safran",
        "rival.cobalt_trader": "Marchand cobalt",
        "rival.nest_roamer": "Vagabond du nid",
        "rival.covenant_syndicate": "Syndicat du pacte",
        "event.saffron_quay_ember_fair": "Foire braise quai safran",
        "event.cobalt_sound_rime_vigil": "Veillée givre son cobalt",
        "event.roast_nest_week": "Semaine nid rôti",
        "event.ferment_covenant_carnival": "Carnaval pacte fermenté",
        "customer.saffron_ember_guest": "Invité braise safran",
        "customer.cobalt_rime_tourist": "Touriste givre cobalt",
        "customer.roast_nest_buyer": "Acheteur nid rôti",
        "customer.ferment_carnival_guest": "Invité carnaval fermenté",
        "contract.saffron_ember_roast": "Plateau rôti braise",
        "contract.cobalt_rime_ferment": "Plat fermenté givre",
        "contract.roast_nest_haul": "Cargaison nid rôti",
        "contract.ferment_carnival_crate": "Caisse carnaval fermenté",
        "bait.saffron_nibble": "Bouchée safran",
        "bait.cobalt_flake": "Flocon cobalt",
        "bait.roast_paste": "Pâte rôtie",
        "bait.ferment_spark": "Étincelle fermentée",
        "banner.saffron_quay_ember_fair": "Foire braise safran",
        "banner.cobalt_sound_rime_vigil": "Veillée givre cobalt",
        "banner.roast_nest_week": "Semaine nid rôti",
        "banner.ferment_covenant_carnival": "Carnaval fermenté",
        "banner.iap_saffron_bunting": "Guirlandes safran",
        "banner.iap_cobalt_pennant": "Fanion cobalt",
        "banner.iap_quay_flag": "Drapeau quai",
        "banner.iap_sound_streamer": "Serpentins son",
        "banner.iap_roast_ribbon": "Ruban rôti",
        "banner.iap_ferment_crest": "Cimier fermenté",
    },
    "ht": {
        "rival.saffron_hawker": "Vandè safran",
        "rival.cobalt_trader": "Komèsan kobal",
        "rival.nest_roamer": "Vagabon nich",
        "rival.covenant_syndicate": "Sendika pak",
        "event.saffron_quay_ember_fair": "Fwa braise ke safran",
        "event.cobalt_sound_rime_vigil": "Vey rime son kobal",
        "event.roast_nest_week": "Semèn nich boukannen",
        "event.ferment_covenant_carnival": "Kanaval pak fermente",
        "customer.saffron_ember_guest": "Envite braise safran",
        "customer.cobalt_rime_tourist": "Touris rime kobal",
        "customer.roast_nest_buyer": "Achtè nich boukannen",
        "customer.ferment_carnival_guest": "Envite kanaval fermente",
        "contract.saffron_ember_roast": "Plat boukannen braise",
        "contract.cobalt_rime_ferment": "Plat fermente rime",
        "contract.roast_nest_haul": "Chaj nich boukannen",
        "contract.ferment_carnival_crate": "Bwat kanaval fermente",
        "bait.saffron_nibble": "Moso safran",
        "bait.cobalt_flake": "Flak kobal",
        "bait.roast_paste": "Pat boukannen",
        "bait.ferment_spark": "Etiçel fermente",
        "banner.saffron_quay_ember_fair": "Fwa braise safran",
        "banner.cobalt_sound_rime_vigil": "Vey rime kobal",
        "banner.roast_nest_week": "Semèn nich boukannen",
        "banner.ferment_covenant_carnival": "Kanaval fermente",
        "banner.iap_saffron_bunting": "Bandwòl safran",
        "banner.iap_cobalt_pennant": "Penan kobal",
        "banner.iap_quay_flag": "Drapo ke",
        "banner.iap_sound_streamer": "Serpantin son",
        "banner.iap_roast_ribbon": "Ribon boukannen",
        "banner.iap_ferment_crest": "Krèt fermente",
    },
    "it": {
        "rival.saffron_hawker": "Venditore zafferano",
        "rival.cobalt_trader": "Commerciante cobalto",
        "rival.nest_roamer": "Vagabondo del nido",
        "rival.covenant_syndicate": "Sindacato del patto",
        "event.saffron_quay_ember_fair": "Fiera brace banchina zafferano",
        "event.cobalt_sound_rime_vigil": "Veglia brina suono cobalto",
        "event.roast_nest_week": "Settimana nido arrostito",
        "event.ferment_covenant_carnival": "Carnevale patto fermentato",
        "customer.saffron_ember_guest": "Ospite brace zafferano",
        "customer.cobalt_rime_tourist": "Turista brina cobalto",
        "customer.roast_nest_buyer": "Acquirente nido arrostito",
        "customer.ferment_carnival_guest": "Ospite carnevale fermentato",
        "contract.saffron_ember_roast": "Vassoio arrostito brace",
        "contract.cobalt_rime_ferment": "Piatto fermentato brina",
        "contract.roast_nest_haul": "Carico nido arrostito",
        "contract.ferment_carnival_crate": "Cassa carnevale fermentato",
        "bait.saffron_nibble": "Boccone zafferano",
        "bait.cobalt_flake": "Fiocco cobalto",
        "bait.roast_paste": "Pasta arrostita",
        "bait.ferment_spark": "Scintilla fermentata",
        "banner.saffron_quay_ember_fair": "Fiera brace zafferano",
        "banner.cobalt_sound_rime_vigil": "Veglia brina cobalto",
        "banner.roast_nest_week": "Settimana nido arrostito",
        "banner.ferment_covenant_carnival": "Carnevale fermentato",
        "banner.iap_saffron_bunting": "Festoni zafferano",
        "banner.iap_cobalt_pennant": "Pennone cobalto",
        "banner.iap_quay_flag": "Bandiera banchina",
        "banner.iap_sound_streamer": "Stelle filanti suono",
        "banner.iap_roast_ribbon": "Nastro arrostito",
        "banner.iap_ferment_crest": "Cimiero fermentato",
    },
    "ca": {
        "rival.saffron_hawker": "Venedor safrà",
        "rival.cobalt_trader": "Comerciant cobalt",
        "rival.nest_roamer": "Errant del niu",
        "rival.covenant_syndicate": "Sindicat del pacte",
        "event.saffron_quay_ember_fair": "Fira brasa moll safrà",
        "event.cobalt_sound_rime_vigil": "Vigília gebre so cobalt",
        "event.roast_nest_week": "Setmana niu torrat",
        "event.ferment_covenant_carnival": "Carnaval pacte fermentat",
        "customer.saffron_ember_guest": "Convidat brasa safrà",
        "customer.cobalt_rime_tourist": "Turista gebre cobalt",
        "customer.roast_nest_buyer": "Comprador niu torrat",
        "customer.ferment_carnival_guest": "Convidat carnaval fermentat",
        "contract.saffron_ember_roast": "Safata torrada brasa",
        "contract.cobalt_rime_ferment": "Plat fermentat gebre",
        "contract.roast_nest_haul": "Càrrega niu torrat",
        "contract.ferment_carnival_crate": "Caixa carnaval fermentat",
        "bait.saffron_nibble": "Mos safrà",
        "bait.cobalt_flake": "Escata cobalt",
        "bait.roast_paste": "Pasta torrada",
        "bait.ferment_spark": "Espurna fermentada",
        "banner.saffron_quay_ember_fair": "Fira brasa safrà",
        "banner.cobalt_sound_rime_vigil": "Vigília gebre cobalt",
        "banner.roast_nest_week": "Setmana niu torrat",
        "banner.ferment_covenant_carnival": "Carnaval fermentat",
        "banner.iap_saffron_bunting": "Banderoles safrà",
        "banner.iap_cobalt_pennant": "Penó cobalt",
        "banner.iap_quay_flag": "Bandera moll",
        "banner.iap_sound_streamer": "Serpentines so",
        "banner.iap_roast_ribbon": "Cinta torrada",
        "banner.iap_ferment_crest": "Cresta fermentada",
    },
    "ru": {
        "rival.saffron_hawker": "Шафрановый торговец",
        "rival.cobalt_trader": "Кобальтовый торговец",
        "rival.nest_roamer": "Странник гнезда",
        "rival.covenant_syndicate": "Синдикат завета",
        "event.saffron_quay_ember_fair": "Ярмарка углей шафрановой пристани",
        "event.cobalt_sound_rime_vigil": "Инеевая стража кобальтового пролива",
        "event.roast_nest_week": "Неделя жареного гнезда",
        "event.ferment_covenant_carnival": "Карнавал ферментного завета",
        "customer.saffron_ember_guest": "Гость шафрановых углей",
        "customer.cobalt_rime_tourist": "Турист кобальтового инея",
        "customer.roast_nest_buyer": "Покупатель жареного гнезда",
        "customer.ferment_carnival_guest": "Гость ферментного карнавала",
        "contract.saffron_ember_roast": "Поднос жареной рыбы",
        "contract.cobalt_rime_ferment": "Блюдо ферментированной рыбы",
        "contract.roast_nest_haul": "Партия жареного гнезда",
        "contract.ferment_carnival_crate": "Ящик ферментного карнавала",
        "bait.saffron_nibble": "Шафрановая наживка",
        "bait.cobalt_flake": "Кобальтовые хлопья",
        "bait.roast_paste": "Жареная паста",
        "bait.ferment_spark": "Ферментная искра",
        "banner.saffron_quay_ember_fair": "Ярмарка шафрановых углей",
        "banner.cobalt_sound_rime_vigil": "Инеевая стража кобальта",
        "banner.roast_nest_week": "Неделя жареного гнезда",
        "banner.ferment_covenant_carnival": "Ферментный карнавал",
        "banner.iap_saffron_bunting": "Шафрановые гирлянды",
        "banner.iap_cobalt_pennant": "Кобальтовый вымпел",
        "banner.iap_quay_flag": "Флаг пристани",
        "banner.iap_sound_streamer": "Серпантин пролива",
        "banner.iap_roast_ribbon": "Лента жарки",
        "banner.iap_ferment_crest": "Гребень ферментации",
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
    anchor = 'grantsCosmetic = "banner.iap_can_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticsIap.kt missing can_crest anchor")
    close = text.find(")", idx)
    comma = text.find(",", close)
    insert_at = comma + 1 if comma > 0 else close + 1
    COSMETICS_KT.write_text(text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:], encoding="utf-8")


def patch_systems_ts() -> None:
    text = SYSTEMS_TS.read_text(encoding="utf-8")
    blocks = [sku_ts_block(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["sku"] not in text]
    if not to_add:
        return
    anchor = 'grantsCosmetic: "banner.iap_can_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("systems.ts missing can_crest anchor")
    close = text.find("},", idx)
    insert_at = close + 2
    SYSTEMS_TS.write_text(text[:insert_at] + "\n" + "\n".join(to_add) + text[insert_at:], encoding="utf-8")


def patch_presentation_kt() -> None:
    text = PRESENTATION_KT.read_text(encoding="utf-8")
    blocks = [presentation_kt_item(c) for c in NEW_COSMETICS]
    to_add = [b for c, b in zip(NEW_COSMETICS, blocks) if c["grantsCosmetic"] not in text]
    if not to_add:
        return
    anchor = 'Item("banner.iap_can_crest"'
    idx = text.find(anchor)
    if idx < 0:
        raise SystemExit("CosmeticPresentation.kt missing can_crest anchor")
    end = text.find("\n", text.find("),", idx))
    if end < 0:
        raise SystemExit("CosmeticPresentation.kt can_crest line terminator missing")
    PRESENTATION_KT.write_text(text[:end] + "\n" + "\n".join(to_add) + text[end:], encoding="utf-8")


def write_ship(data: dict, cosmetics: list) -> None:
    rivals = data["rivalMarkets"]["rivals"]
    events = data["seasonalEvents"]["events"]
    baits = data["bait"]
    catalog = {
        "phase": 15,
        "plan": "30_finish_6.0",
        "schema": "fish.ship.rivals_seasonal_6.v1",
        "description": (
            "Finish 6.0 Phase 15 — raise rivals→20, seasonal→20, baits→20, cosmetics→30 "
            "with saffron/cobalt nest coverage. Schema stays 27 / content 5.0.0."
        ),
        "contentVersion": "5.0.0",
        "schemaVersion": 27,
        "rivalsSeasonal6Marker": MARKER,
        "rivalsMin": 20,
        "seasonalEventsMin": 20,
        "baitsMin": 20,
        "cosmeticsMin": 30,
        "newRivalIds": [r["id"] for r in NEW_RIVALS],
        "newEventIds": [e["id"] for e in NEW_EVENTS],
        "newBaitIds": [b["id"] for b in NEW_BAITS],
        "newCosmeticIds": [c["grantsCosmetic"] for c in NEW_COSMETICS],
        "newCosmeticSkus": [c["sku"] for c in NEW_COSMETICS],
        "periodTicks": PERIOD,
        "extendsRivalsSeasonal5": "shared/ship/rivals-seasonal-5.json",
        "parityFixture": "shared/fixtures/parity-rivals-seasonal-6.json",
        "authorTool": "shared/tools/author_rivals_seasonal_6.py",
        "validateScript": "npm run rivalsseasonal6:validate",
        "simHzInvariant": 20,
        "kickoffCatalog": "shared/ship/finish-6.0-kickoff.json",
        "checklist": [
            "≥20 rivals covering all 14 harbors including saffron_quay + cobalt_sound",
            "≥20 seasonal events (periodTicks≥21000) + festival customers/contracts",
            "≥20 baits including saffron/cobalt/roast/ferment gated tips",
            "≥30 power-neutral cosmetics + banner meshes",
            "kickoff contentFloorsShort=false + openGapFlagMin 15→14",
            "rivalsseasonal5 soft floors stay green",
            "parity + rivalsseasonal6:validate green in CI",
            "schema stays 27 / content 5.0.0",
        ],
        "preflightGates": [
            "shared/ship/rivals-seasonal-6.json",
            "shared/fixtures/parity-rivals-seasonal-6.json",
            "shared/ship/rivals-seasonal-5.json",
            "shared/content/content-pack.json",
            "shared/billing/entitlements.json",
            "shared/content/cosmetic-presentation.json",
            "shared/tools/author_rivals_seasonal_6.py",
            "web/src/ship/rivalsSeasonal6.ts",
            "game-core/src/main/kotlin/com/willio/jeanvilma/fishshopping/core/ship/RivalsSeasonal6.kt",
            "web/scripts/validate-rivals-seasonal-6.ts",
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
        "schema": "fish.fixture.parity_rivals_seasonal_6.v1",
        "rivalsSeasonal6Marker": MARKER,
        "phase": 15,
        "plan": "30_finish_6.0",
        "description": (
            "Finish 6.0 Phase 15: saffron dawn activates Saffron Hawker + Covenant Syndicate; "
            "floors rivals/seasonal/baits/cosmetics met; contentFloorsShort closed."
        ),
        "harborId": "harbor.saffron_quay",
        "seed": 1515,
        "sampleRivalId": "rival.saffron_hawker",
        "sampleEventId": "event.saffron_quay_ember_fair",
        "sampleBaitId": "bait.saffron_nibble",
        "sampleCosmeticId": "banner.iap_saffron_bunting",
        "expect": {
            "rivalsMin": 20,
            "seasonalEventsMin": 20,
            "baitsMin": 20,
            "cosmeticsMin": 30,
            "schemaVersion": 27,
            "contentVersion": "5.0.0",
            "contentFloorsShort": False,
            "openGapFlagMin": OPEN_GAP_MIN,
            "gates": [
                "rivals_20",
                "seasonal_20",
                "baits_20",
                "cosmetics_30",
                "harbors_covered",
                "kickoff_floors",
                "ci_gate",
            ],
        },
    }
    dump(PARITY, parity)


def update_kickoff_dod_listing_pin(data: dict, cosmetics_count: int) -> None:
    kick = json.loads(KICKOFF6.read_text(encoding="utf-8"))
    kick["gaps"]["contentFloorsShort"] = False
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
    quotas["rivalMarkets"] = max(int(quotas.get("rivalMarkets") or 0), 20)
    quotas["seasonalEvents"] = max(int(quotas.get("seasonalEvents") or 0), 20)
    quotas["baits"] = max(int(quotas.get("baits") or 0), 20)
    quotas["cosmetics"] = max(int(quotas.get("cosmetics") or 0), 30)
    dod["notes"] = (
        "Finish 6.0 Phase 15 rivals-seasonal-6 complete (rivals/seasonal/baits/cosmetics floors); "
        "Phases 1–14 remain green. Content stays 5.0.0 / schema 27. contentFloorsShort closed. "
        "Deploy/tag remain manual."
    )
    dod["rivalsSeasonal6"] = {
        "phase": 15,
        "plan": "30_finish_6.0",
        "status": "complete",
        "statusValues": ["pending", "complete"],
        "rivalsSeasonal6Marker": MARKER,
        "catalog": "shared/ship/rivals-seasonal-6.json",
        "parityFixture": "shared/fixtures/parity-rivals-seasonal-6.json",
        "validateScript": "npm run rivalsseasonal6:validate",
        "checklist": [
            "rivals≥20 / seasonal≥20 / baits≥20 / cosmetics≥30",
            "all 14 harbors rival-covered",
            "kickoff contentFloorsShort=false",
            "rivalsseasonal6:validate green in CI",
        ],
    }
    dump(DOD, dod)

    listing = json.loads(LISTING.read_text(encoding="utf-8"))
    listing["rivalsSeasonal6Phase"] = 15
    listing["rivalsSeasonal6Catalog"] = "shared/ship/rivals-seasonal-6.json"
    dump(LISTING, listing)

    pin = json.loads(PIN.read_text(encoding="utf-8"))
    pin["rivalsSeasonal6"] = "shared/ship/rivals-seasonal-6.json"
    fixtures = list(pin.get("fixtures") or [])
    if "parity-rivals-seasonal-6.json" not in fixtures:
        fixtures.append("parity-rivals-seasonal-6.json")
    pin["fixtures"] = fixtures
    dump(PIN, pin)


def main() -> None:
    fill_en_i18n()
    data = json.loads(PACK.read_text(encoding="utf-8"))

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
        "harbor.saffron_quay": [
            "product.roasted_fillet",
            "product.roast_chip",
            "product.roast_carton",
            "product.ferment_paste",
            "product.ferment_carton",
        ],
        "harbor.cobalt_sound": [
            "product.fermented_fillet",
            "product.ferment_paste",
            "product.ferment_carton",
            "product.roast_chip",
            "product.roast_carton",
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

    for e in data["seasonalEvents"]["events"]:
        e["periodTicks"] = PERIOD
    upsert_list(data["seasonalEvents"]["events"], NEW_EVENTS)
    upsert_list(data["customers"], NEW_CUSTOMERS)
    upsert_list(data["contracts"]["templates"], NEW_CONTRACTS)
    upsert_list(data["bait"], NEW_BAITS)

    dump(PACK, data)

    ent = json.loads(ENTITLEMENTS.read_text(encoding="utf-8"))
    upsert_list(ent["cosmetics"], [entitlement_row(c) for c in NEW_COSMETICS])
    dump(ENTITLEMENTS, ent)

    pres = json.loads(PRESENTATION.read_text(encoding="utf-8"))
    upsert_list(pres["items"], [presentation_row(c) for c in NEW_COSMETICS], key="cosmeticId")
    dump(PRESENTATION, pres)

    product = json.loads(PRODUCT_ART.read_text(encoding="utf-8"))
    product["cosmeticBannerTarget"] = max(int(product.get("cosmeticBannerTarget", 0)), 30)
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
        f"OK Phase 15 rivals-seasonal-6: rivals={len(data['rivalMarkets']['rivals'])} "
        f"events={len(data['seasonalEvents']['events'])} baits={len(data['bait'])} "
        f"cosmetics={len(ent['cosmetics'])} covered={len(covered)}/{len(harbor_ids)} "
        f"openGapFlagMin={OPEN_GAP_MIN} period={PERIOD}"
    )


if __name__ == "__main__":
    main()
