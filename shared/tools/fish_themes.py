"""
Finish 2.0 Phase 20 + Finish 3.0 Phase 9/12 — authored low-poly fish themes.

All content-pack species get multi-part FishArt_* meshes + distinct
palettes while keeping the models/fish_*.glb path contract.
Finish 4.0 Phase 8 raises the authored floor to 100 (species 76–100).
"""
from __future__ import annotations

from glb_geometry import add_box, fish_silhouette, mesh_bounds, normalize_mesh

FISH_ART_MARKER = "authored-phase-20"
FISH_ART_MIN = 100  # Finish 4.0 Phase 8 floor (meshes 76–100 locked)
FISH_FINISH5_MARKER = "fish-art-5"  # Finish 5.0 Phase 9
FISH_ART_FINISH5_MIN = 125
FISH_FINISH6_MARKER = "fish-art-6"  # Finish 6.0 Phase 8
FISH_ART_FINISH6_MIN = 150
FINISH6_SPECIES_IDS = frozenset({
    "species.saffron_sprat",
    "species.gilt_saffron",
    "species.quay_mullet",
    "species.bronze_quay",
    "species.cobalt_smelt",
    "species.aurora_cobalt",
    "species.sound_char",
    "species.crystal_sound",
    "species.lantern_scad",
    "species.prism_scad",
    "species.tide_wrasse",
    "species.glass_tide",
    "species.dock_blenny",
    "species.opal_dock",
    "species.cove_drum",
    "species.thunder_cove",
    "species.reef_jack",
    "species.gilt_reef",
    "species.kiln_shad",
    "species.magma_kiln",
    "species.mist_goby",
    "species.veil_goby",
    "species.plaza_bass",
    "species.gilt_bass",
    "species.cobalt_tuna",
})
FINISH5_ART_AHEAD_IDS = frozenset(
    {
        "species.mist_sprat",
        "species.gilt_mist",
        "species.veil_shad",
        "species.prism_veil",
        "species.dusk_mullet",
        "species.bronze_dusk",
        "species.shelf_blenny",
        "species.opal_shelf",
        "species.coral_scad",
        "species.gilt_scad",
        "species.storm_drum",
        "species.thunder_storm",
        "species.ember_ray",
        "species.magma_ember",
        "species.north_smelt",
        "species.aurora_north",
        "species.marina_jack",
        "species.gilt_marina",
        "species.lantern_pike",
        "species.prism_lantern",
        "species.brine_goby",
        "species.crystal_brine",
        "species.plaza_wrasse",
        "species.crown_plaza",
        "species.mist_tuna",
    }
)

# species.id → theme key (must be unique; specialty geometry + palette differ).
AUTHORED_SPECIES = {
    "species.dawn_anchovy": "pier_slender",
    "species.silver_sprat": "pier_silver",
    "species.harbor_herring": "pier_herring",
    "species.sail_needlefish": "pier_needle",
    "species.blue_mackerel": "pier_mackerel",
    "species.copper_mullet": "pier_copper",
    "species.tide_bass": "pier_bass",
    "species.amber_snapper": "pier_snapper",
    "species.king_grouper": "pier_grouper",
    "species.reef_perch": "pier_reef",
    "species.moon_flounder": "moon_flat",
    "species.ink_squid": "ink_tentacle",
    "species.lava_eel": "lava_ribbon",
    "species.ghost_lanternfish": "ghost_glow",
    "species.golden_sprat": "gold_sprat",
    "species.gilt_mackerel": "gilt_stripe",
    "species.bronze_mullet": "bronze_bulk",
    "species.ruby_snapper": "ruby_jaw",
    "species.silver_dawn_anchovy": "silver_slender",
    "species.sapphire_needlefish": "sapphire_needle",
    "species.crown_bass": "crown_bass",
    "species.opal_flounder": "opal_flat",
    "species.ember_eel": "ember_ribbon",
    "species.prism_lanternfish": "prism_glow",
    "species.frost_smelt": "frost_long",
    "species.arctic_cod": "arctic_cod",
    "species.ice_char": "ice_char",
    "species.polar_herring": "polar_herring",
    "species.crystal_smelt": "crystal_long",
    "species.aurora_cod": "aurora_cod",
    "species.marina_tuna": "marina_tuna",
    "species.saffron_sole": "saffron_flat",
    "species.pearl_grouper": "pearl_grouper",
    "species.harbor_pompano": "harbor_pompano",
    "species.gilt_tuna": "gilt_tuna",
    "species.gilt_sole": "gilt_flat",
    "species.coral_wrasse": "coral_wrasse",
    "species.gilt_wrasse": "gilt_wrasse",
    "species.lagoon_tang": "lagoon_tang",
    "species.opal_tang": "opal_tang",
    "species.gale_jack": "gale_jack",
    "species.thunder_jack": "thunder_jack",
    "species.squall_bass": "squall_bass",
    "species.prism_squall": "prism_squall",
    "species.cinder_carp": "cinder_carp",
    "species.gilt_cinder": "gilt_cinder",
    "species.ash_pike": "ash_pike",
    "species.magma_pike": "magma_pike",
    "species.tropic_ray": "tropic_ray",
    "species.pearl_ray": "pearl_ray",
    # Finish 3.0 Phase 12 — species 51–75
    "species.mangrove_snapper": "mangrove_snapper",
    "species.gilt_mangrove": "gilt_mangrove",
    "species.glass_goby": "glass_goby",
    "species.prism_goby": "prism_goby",
    "species.shear_drum": "shear_drum",
    "species.thunder_drum": "thunder_drum",
    "species.foam_skater": "foam_skater",
    "species.crystal_skater": "crystal_skater",
    "species.slag_loach": "slag_loach",
    "species.magma_loach": "magma_loach",
    "species.kiln_perch": "kiln_perch",
    "species.gilt_kiln": "gilt_kiln",
    "species.drift_icefish": "drift_icefish",
    "species.aurora_icefish": "aurora_icefish",
    "species.rime_bream": "rime_bream",
    "species.crystal_bream": "crystal_bream",
    "species.silk_amberjack": "silk_amberjack",
    "species.gilt_amberjack": "gilt_amberjack",
    "species.parade_scad": "parade_scad",
    "species.opal_scad": "opal_scad",
    "species.veil_skate": "veil_skate",
    "species.pearl_skate": "pearl_skate",
    "species.dusk_cuttle": "dusk_cuttle",
    "species.opal_cuttle": "opal_cuttle",
    "species.basalt_gurnard": "basalt_gurnard",
    # Finish 4.0 Phase 8 — species 76–100
    "species.cedar_smelt": "cedar_smelt",
    "species.gilt_cedar": "gilt_cedar",
    "species.lantern_shad": "lantern_shad",
    "species.prism_shad": "prism_shad",
    "species.brine_mullet": "brine_mullet",
    "species.bronze_brine": "bronze_brine",
    "species.canyon_bass": "canyon_bass",
    "species.crown_canyon": "crown_canyon",
    "species.tidepool_blenny": "tidepool_blenny",
    "species.opal_blenny": "opal_blenny",
    "species.reef_hawkfish": "reef_hawkfish",
    "species.ruby_hawk": "ruby_hawk",
    "species.squall_smelt": "squall_smelt",
    "species.thunder_smelt": "thunder_smelt",
    "species.gale_herring": "gale_herring",
    "species.prism_gale": "prism_gale",
    "species.cinder_smelt": "cinder_smelt",
    "species.magma_cinder": "magma_cinder",
    "species.slag_perch": "slag_perch",
    "species.gilt_slag": "gilt_slag",
    "species.frost_jack": "frost_jack",
    "species.aurora_jack": "aurora_jack",
    "species.rime_herring": "rime_herring",
    "species.crystal_rime": "crystal_rime",
    "species.plaza_tuna": "plaza_tuna",
    # Finish 5.0 Phase 9 — species 101–125 (art-ahead)
    "species.mist_sprat": "mist_sprat",
    "species.gilt_mist": "gilt_mist",
    "species.veil_shad": "veil_shad",
    "species.prism_veil": "prism_veil",
    "species.dusk_mullet": "dusk_mullet",
    "species.bronze_dusk": "bronze_dusk",
    "species.shelf_blenny": "shelf_blenny",
    "species.opal_shelf": "opal_shelf",
    "species.coral_scad": "coral_scad",
    "species.gilt_scad": "gilt_scad",
    "species.storm_drum": "storm_drum",
    "species.thunder_storm": "thunder_storm",
    "species.ember_ray": "ember_ray",
    "species.magma_ember": "magma_ember",
    "species.north_smelt": "north_smelt",
    "species.aurora_north": "aurora_north",
    "species.marina_jack": "marina_jack",
    "species.gilt_marina": "gilt_marina",
    "species.lantern_pike": "lantern_pike",
    "species.prism_lantern": "prism_lantern",
    "species.brine_goby": "brine_goby",
    "species.crystal_brine": "crystal_brine",
    "species.plaza_wrasse": "plaza_wrasse",
    "species.crown_plaza": "crown_plaza",
    "species.mist_tuna": "mist_tuna",
    # Finish 6.0 Phase 8 — species 126–150
    "species.saffron_sprat": "saffron_sprat",
    "species.gilt_saffron": "gilt_saffron",
    "species.quay_mullet": "quay_mullet",
    "species.bronze_quay": "bronze_quay",
    "species.cobalt_smelt": "cobalt_smelt",
    "species.aurora_cobalt": "aurora_cobalt",
    "species.sound_char": "sound_char",
    "species.crystal_sound": "crystal_sound",
    "species.lantern_scad": "lantern_scad",
    "species.prism_scad": "prism_scad",
    "species.tide_wrasse": "tide_wrasse",
    "species.glass_tide": "glass_tide",
    "species.dock_blenny": "dock_blenny",
    "species.opal_dock": "opal_dock",
    "species.cove_drum": "cove_drum",
    "species.thunder_cove": "thunder_cove",
    "species.reef_jack": "reef_jack",
    "species.gilt_reef": "gilt_reef",
    "species.kiln_shad": "kiln_shad",
    "species.magma_kiln": "magma_kiln",
    "species.mist_goby": "mist_goby",
    "species.veil_goby": "veil_goby",
    "species.plaza_bass": "plaza_bass",
    "species.gilt_bass": "gilt_bass",
    "species.cobalt_tuna": "cobalt_tuna",
}

THEME_COLORS = {
    "pier_slender": {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
    "pier_silver": {"body": "#C5D0D8", "fin": "#9AA8B4", "accent": "#E8F0F4"},
    "pier_herring": {"body": "#6A8FA0", "fin": "#4A7080", "accent": "#B8D0D8"},
    "pier_needle": {"body": "#4A8FA8", "fin": "#2F6A80", "accent": "#A8D0E0"},
    "pier_mackerel": {"body": "#3A7CA5", "fin": "#2A5A78", "accent": "#7AB0D0"},
    "pier_copper": {"body": "#B87333", "fin": "#8A5520", "accent": "#E0A060"},
    "pier_bass": {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
    "pier_snapper": {"body": "#E09A3E", "fin": "#B07020", "accent": "#F0C070"},
    "pier_grouper": {"body": "#4F7A5A", "fin": "#355540", "accent": "#90B090"},
    "pier_reef": {"body": "#2F8F7A", "fin": "#1A6A58", "accent": "#60C8B0"},
    "moon_flat": {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
    "ink_tentacle": {"body": "#2A2438", "fin": "#1A1428", "accent": "#6A5080"},
    "lava_ribbon": {"body": "#C45C26", "fin": "#8A3010", "accent": "#F08040"},
    "ghost_glow": {"body": "#D7E6F0", "fin": "#A8C0D0", "accent": "#F0F8FF"},
    "gold_sprat": {"body": "#E8AF4A", "fin": "#C09030", "accent": "#FFE08A"},
    "gilt_stripe": {"body": "#D4A84B", "fin": "#A88030", "accent": "#F0D080"},
    "bronze_bulk": {"body": "#CD7F32", "fin": "#9A5A20", "accent": "#E0A060"},
    "ruby_jaw": {"body": "#C23B4B", "fin": "#8A2030", "accent": "#E07080"},
    "silver_slender": {"body": "#D0D8E0", "fin": "#A0A8B0", "accent": "#F0F4F8"},
    "sapphire_needle": {"body": "#2F6FED", "fin": "#1A4AB0", "accent": "#80A8FF"},
    "crown_bass": {"body": "#C9A227", "fin": "#907018", "accent": "#E8C850"},
    "opal_flat": {"body": "#9AD0C5", "fin": "#68A898", "accent": "#C8F0E8"},
    "ember_ribbon": {"body": "#D4552A", "fin": "#902010", "accent": "#F09050"},
    "prism_glow": {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
    "frost_long": {"body": "#B8D4E8", "fin": "#88A8C0", "accent": "#E0F0FF"},
    "arctic_cod": {"body": "#7FA8C4", "fin": "#507890", "accent": "#B0D0E0"},
    "ice_char": {"body": "#9CC8E0", "fin": "#6890A8", "accent": "#D0ECF8"},
    "polar_herring": {"body": "#A0B8C8", "fin": "#708898", "accent": "#D0E0E8"},
    "crystal_long": {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
    "aurora_cod": {"body": "#6BC4C8", "fin": "#409098", "accent": "#A0E8E8"},
    "marina_tuna": {"body": "#2E6B8A", "fin": "#1A4860", "accent": "#60A0C0"},
    "saffron_flat": {"body": "#D4A017", "fin": "#A07810", "accent": "#F0C840"},
    "pearl_grouper": {"body": "#E8E0D5", "fin": "#B8B0A0", "accent": "#FFF8F0"},
    "harbor_pompano": {"body": "#D2B48C", "fin": "#A08860", "accent": "#F0D8B0"},
    "gilt_tuna": {"body": "#C9A040", "fin": "#907028", "accent": "#E8C060"},
    "gilt_flat": {"body": "#D8B060", "fin": "#A88840", "accent": "#F0D890"},
    "coral_wrasse": {"body": "#E07070", "fin": "#A04040", "accent": "#F0A0A0"},
    "gilt_wrasse": {"body": "#D0A050", "fin": "#987830", "accent": "#E8C880"},
    "lagoon_tang": {"body": "#2FA8A0", "fin": "#1A7870", "accent": "#60D8D0"},
    "opal_tang": {"body": "#80C8B8", "fin": "#509888", "accent": "#B0E8D8"},
    "gale_jack": {"body": "#5A7A98", "fin": "#385870", "accent": "#90B0C8"},
    "thunder_jack": {"body": "#6A5ACD", "fin": "#4038A0", "accent": "#A090F0"},
    "squall_bass": {"body": "#4A6080", "fin": "#304060", "accent": "#8098B0"},
    "prism_squall": {"body": "#8870C0", "fin": "#584890", "accent": "#B8A0E0"},
    "cinder_carp": {"body": "#C06040", "fin": "#803020", "accent": "#E09070"},
    "gilt_cinder": {"body": "#C87840", "fin": "#905028", "accent": "#E0A870"},
    "ash_pike": {"body": "#8A8A8A", "fin": "#606060", "accent": "#C0C0C0"},
    "magma_pike": {"body": "#E04020", "fin": "#A02010", "accent": "#F07050"},
    "tropic_ray": {"body": "#F0A040", "fin": "#C07020", "accent": "#FFC870"},
    "pearl_ray": {"body": "#E8D8C8", "fin": "#B8A898", "accent": "#FFF0E0"},
    "mangrove_snapper": {"body": "#C87840", "fin": "#8A5020", "accent": "#E0A060"},
    "gilt_mangrove": {"body": "#D4A84B", "fin": "#A07830", "accent": "#F0D080"},
    "glass_goby": {"body": "#C8E0E8", "fin": "#90B0B8", "accent": "#E8F8FF"},
    "prism_goby": {"body": "#A090D8", "fin": "#6858A8", "accent": "#D0C0F8"},
    "shear_drum": {"body": "#5A7088", "fin": "#384858", "accent": "#90A8C0"},
    "thunder_drum": {"body": "#6A58C8", "fin": "#4038A0", "accent": "#A898F0"},
    "foam_skater": {"body": "#A8C8D8", "fin": "#7090A0", "accent": "#D8F0F8"},
    "crystal_skater": {"body": "#B8E8F0", "fin": "#78B8C8", "accent": "#E8FFFF"},
    "slag_loach": {"body": "#A06040", "fin": "#704028", "accent": "#C88860"},
    "magma_loach": {"body": "#E04828", "fin": "#A02810", "accent": "#F07850"},
    "kiln_perch": {"body": "#C07050", "fin": "#884030", "accent": "#E09870"},
    "gilt_kiln": {"body": "#D09048", "fin": "#A06828", "accent": "#F0B870"},
    "drift_icefish": {"body": "#B0D0E0", "fin": "#7898A8", "accent": "#D8F0FF"},
    "aurora_icefish": {"body": "#70C8C0", "fin": "#409890", "accent": "#A0E8E0"},
    "rime_bream": {"body": "#98B8C8", "fin": "#688898", "accent": "#C8E0F0"},
    "crystal_bream": {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
    "silk_amberjack": {"body": "#E0A050", "fin": "#B07830", "accent": "#F0C880"},
    "gilt_amberjack": {"body": "#D4A040", "fin": "#A07820", "accent": "#F0D070"},
    "parade_scad": {"body": "#4A90A8", "fin": "#286878", "accent": "#80C0D0"},
    "opal_scad": {"body": "#80C8B8", "fin": "#509888", "accent": "#B0E8D8"},
    "veil_skate": {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
    "pearl_skate": {"body": "#E8E0D5", "fin": "#B8B0A0", "accent": "#FFF8F0"},
    "dusk_cuttle": {"body": "#6A5080", "fin": "#403060", "accent": "#A080C0"},
    "opal_cuttle": {"body": "#90C0B0", "fin": "#609080", "accent": "#C0E8D8"},
    "basalt_gurnard": {"body": "#5A5858", "fin": "#3A3838", "accent": "#8A8888"},
    "cedar_smelt": {"body": "#C8A070", "fin": "#907050", "accent": "#E0C090"},
    "gilt_cedar": {"body": "#D4B060", "fin": "#A08840", "accent": "#F0D080"},
    "lantern_shad": {"body": "#E0C070", "fin": "#A89040", "accent": "#FFF0A0"},
    "prism_shad": {"body": "#C0A0E0", "fin": "#8060B0", "accent": "#E0D0F8"},
    "brine_mullet": {"body": "#8AA0A8", "fin": "#607880", "accent": "#C0D0D8"},
    "bronze_brine": {"body": "#C89050", "fin": "#906030", "accent": "#E0B070"},
    "canyon_bass": {"body": "#5A7060", "fin": "#3A5040", "accent": "#90B090"},
    "crown_canyon": {"body": "#C9A040", "fin": "#907028", "accent": "#E8C860"},
    "tidepool_blenny": {"body": "#70B0A0", "fin": "#408878", "accent": "#A0E0D0"},
    "opal_blenny": {"body": "#90D0C0", "fin": "#609890", "accent": "#C0F0E8"},
    "reef_hawkfish": {"body": "#E07060", "fin": "#A04030", "accent": "#F0A090"},
    "ruby_hawk": {"body": "#C03040", "fin": "#801020", "accent": "#E07080"},
    "squall_smelt": {"body": "#7090A8", "fin": "#486878", "accent": "#A0C0D0"},
    "thunder_smelt": {"body": "#7060C8", "fin": "#4838A0", "accent": "#A898F0"},
    "gale_herring": {"body": "#608098", "fin": "#405868", "accent": "#90B0C0"},
    "prism_gale": {"body": "#9080C0", "fin": "#6050A0", "accent": "#C0B0E8"},
    "cinder_smelt": {"body": "#C07050", "fin": "#904030", "accent": "#E09870"},
    "magma_cinder": {"body": "#E04020", "fin": "#A02010", "accent": "#F07050"},
    "slag_perch": {"body": "#A07050", "fin": "#704830", "accent": "#C09870"},
    "gilt_slag": {"body": "#D09848", "fin": "#A07028", "accent": "#F0B870"},
    "frost_jack": {"body": "#90B8D0", "fin": "#608898", "accent": "#C0E0F0"},
    "aurora_jack": {"body": "#60C0C0", "fin": "#389090", "accent": "#A0E8E0"},
    "rime_herring": {"body": "#A0B8C8", "fin": "#708898", "accent": "#D0E8F0"},
    "crystal_rime": {"body": "#B0E0F0", "fin": "#78B0C0", "accent": "#E0F8FF"},
    "plaza_tuna": {"body": "#2E6080", "fin": "#1A4058", "accent": "#6098B8"},
    # Finish 5.0 Phase 9 colors
    "mist_sprat": {"body": "#A8C0D0", "fin": "#7890A0", "accent": "#D8E8F0"},
    "gilt_mist": {"body": "#D4B060", "fin": "#A08840", "accent": "#F0D890"},
    "veil_shad": {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
    "prism_veil": {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
    "dusk_mullet": {"body": "#6A5080", "fin": "#4A3060", "accent": "#A080C0"},
    "bronze_dusk": {"body": "#CD7F32", "fin": "#9A5A20", "accent": "#E0A060"},
    "shelf_blenny": {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
    "opal_shelf": {"body": "#9AD0C5", "fin": "#68A898", "accent": "#C8F0E8"},
    "coral_scad": {"body": "#E07070", "fin": "#A04040", "accent": "#F0A0A0"},
    "gilt_scad": {"body": "#D0A050", "fin": "#987830", "accent": "#E8C880"},
    "storm_drum": {"body": "#5A7088", "fin": "#3A5068", "accent": "#90A8C0"},
    "thunder_storm": {"body": "#6A5ACD", "fin": "#4A3A9D", "accent": "#A090F0"},
    "ember_ray": {"body": "#D4552A", "fin": "#902010", "accent": "#F09050"},
    "magma_ember": {"body": "#E04020", "fin": "#A02010", "accent": "#F07040"},
    "north_smelt": {"body": "#B8D4E8", "fin": "#88A8C0", "accent": "#E0F0FF"},
    "aurora_north": {"body": "#6BC4C8", "fin": "#409098", "accent": "#A0E8E8"},
    "marina_jack": {"body": "#2E6B8A", "fin": "#1A4860", "accent": "#60A0C0"},
    "gilt_marina": {"body": "#C9A040", "fin": "#907028", "accent": "#E8C060"},
    "lantern_pike": {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
    "prism_lantern": {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
    "brine_goby": {"body": "#C8E0E8", "fin": "#90B0C0", "accent": "#E8F4F8"},
    "crystal_brine": {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
    "plaza_wrasse": {"body": "#E07070", "fin": "#A04040", "accent": "#F0A0A0"},
    "crown_plaza": {"body": "#C9A227", "fin": "#907018", "accent": "#E8C850"},
    "mist_tuna": {"body": "#7FA8C4", "fin": "#507890", "accent": "#B0D0E0"},
    # Finish 6.0 Phase 8 colors
    "saffron_sprat": {"body": "#D4A017", "fin": "#A07810", "accent": "#F0C840"},
    "gilt_saffron": {"body": "#E8C050", "fin": "#B09030", "accent": "#FFE080"},
    "quay_mullet": {"body": "#C09050", "fin": "#906838", "accent": "#E0B070"},
    "bronze_quay": {"body": "#CD7F32", "fin": "#9A5A20", "accent": "#E0A060"},
    "cobalt_smelt": {"body": "#3A6AB0", "fin": "#284878", "accent": "#70A0E0"},
    "aurora_cobalt": {"body": "#5090D0", "fin": "#3068A0", "accent": "#90C8F0"},
    "sound_char": {"body": "#4A7098", "fin": "#304868", "accent": "#80A8C8"},
    "crystal_sound": {"body": "#A8E0F0", "fin": "#70B0C0", "accent": "#E0F8FF"},
    "lantern_scad": {"body": "#E8C07A", "fin": "#D4A84B", "accent": "#F5E6C8"},
    "prism_scad": {"body": "#9B7ED9", "fin": "#6A50A0", "accent": "#C8B0F0"},
    "tide_wrasse": {"body": "#3D7A6A", "fin": "#2A5A4A", "accent": "#70B0A0"},
    "glass_tide": {"body": "#C8E0E8", "fin": "#90B0C0", "accent": "#E8F4F8"},
    "dock_blenny": {"body": "#6A8FA0", "fin": "#486878", "accent": "#A0C0D0"},
    "opal_dock": {"body": "#9AD0C5", "fin": "#68A898", "accent": "#C8F0E8"},
    "cove_drum": {"body": "#5A7088", "fin": "#3A5068", "accent": "#90A8C0"},
    "thunder_cove": {"body": "#6A5ACD", "fin": "#4A3A9D", "accent": "#A090F0"},
    "reef_jack": {"body": "#2F8F7A", "fin": "#1A6050", "accent": "#60C0A8"},
    "gilt_reef": {"body": "#C9A040", "fin": "#907028", "accent": "#E8C060"},
    "kiln_shad": {"body": "#C07050", "fin": "#904830", "accent": "#E0A080"},
    "magma_kiln": {"body": "#E04020", "fin": "#A02010", "accent": "#F07040"},
    "mist_goby": {"body": "#A8C0D0", "fin": "#7890A0", "accent": "#D8E8F0"},
    "veil_goby": {"body": "#8A9BB0", "fin": "#6A7A90", "accent": "#C8D4E0"},
    "plaza_bass": {"body": "#2E6B8A", "fin": "#1A4860", "accent": "#60A0C0"},
    "gilt_bass": {"body": "#D4B060", "fin": "#A08840", "accent": "#F0D890"},
    "cobalt_tuna": {"body": "#1A4A88", "fin": "#103060", "accent": "#5080C0"},
}

# Unique specialty box layouts — ensures pairwise-distinct authored digests.
THEME_SPECIALTY = {
    "pier_slender": [((0.20, 0.04, 0.0), (0.16, 0.08, 0.08)), ((-0.10, -0.06, 0.0), (0.20, 0.05, 0.10))],
    "pier_silver": [((-0.12, 0.06, 0.0), (0.06, 0.04, 0.18)), ((0.0, 0.06, 0.0), (0.06, 0.04, 0.18)), ((0.12, 0.06, 0.0), (0.06, 0.04, 0.18))],
    "pier_herring": [((0.0, -0.10, 0.0), (0.35, 0.06, 0.12))],
    "pier_needle": [((0.28, 0.0, 0.0), (0.35, 0.06, 0.06)), ((0.42, 0.0, 0.0), (0.12, 0.04, 0.04))],
    "pier_mackerel": [((0.05, 0.08, -0.08), (0.30, 0.03, 0.04)), ((0.05, 0.08, 0.0), (0.30, 0.03, 0.04)), ((0.05, 0.08, 0.08), (0.30, 0.03, 0.04))],
    "pier_copper": [((0.10, 0.0, 0.0), (0.16, 0.20, 0.20)), ((0.18, 0.05, 0.0), (0.08, 0.10, 0.10))],
    "pier_bass": [((0.05, 0.0, 0.12), (0.18, 0.16, 0.08)), ((0.05, 0.0, -0.12), (0.18, 0.16, 0.08))],
    "pier_snapper": [((0.18, 0.02, 0.0), (0.14, 0.14, 0.14)), ((0.24, -0.04, 0.0), (0.08, 0.08, 0.10))],
    "pier_grouper": [((0.0, 0.0, 0.0), (0.45, 0.35, 0.30)), ((0.15, 0.10, 0.0), (0.12, 0.12, 0.20))],
    "pier_reef": [((0.0, 0.12, 0.0), (0.20, 0.10, 0.22)), ((-0.05, 0.18, 0.08), (0.08, 0.12, 0.08))],
    "moon_flat": [((0.0, 0.02, 0.16), (0.40, 0.04, 0.20)), ((0.0, 0.02, -0.16), (0.40, 0.04, 0.20))],
    "ink_tentacle": [((-0.20, -0.08, 0.08), (0.08, 0.30, 0.06)), ((-0.20, -0.08, -0.08), (0.08, 0.30, 0.06)), ((-0.28, -0.12, 0.0), (0.08, 0.24, 0.06))],
    "lava_ribbon": [((0.15, 0.0, 0.0), (0.50, 0.08, 0.08)), ((-0.20, 0.04, 0.0), (0.30, 0.05, 0.05))],
    "ghost_glow": [((0.22, 0.08, 0.0), (0.12, 0.12, 0.12)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.18))],
    "gold_sprat": [((0.0, 0.10, 0.0), (0.28, 0.05, 0.10)), ((0.12, 0.0, 0.0), (0.10, 0.14, 0.08))],
    "gilt_stripe": [((0.0, 0.06, -0.06), (0.36, 0.03, 0.03)), ((0.0, 0.06, 0.06), (0.36, 0.03, 0.03)), ((0.08, 0.10, 0.0), (0.20, 0.03, 0.03))],
    "bronze_bulk": [((0.08, 0.0, 0.0), (0.22, 0.22, 0.22)), ((0.16, 0.08, 0.0), (0.10, 0.10, 0.12))],
    "ruby_jaw": [((0.22, -0.02, 0.0), (0.16, 0.12, 0.12)), ((0.28, -0.06, 0.0), (0.08, 0.08, 0.08))],
    "silver_slender": [((0.18, 0.05, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.05, 0.0), (0.18, 0.04, 0.08))],
    "sapphire_needle": [((0.30, 0.0, 0.0), (0.38, 0.05, 0.05)), ((0.44, 0.02, 0.0), (0.10, 0.03, 0.03))],
    "crown_bass": [((0.0, 0.16, 0.0), (0.16, 0.12, 0.16)), ((0.0, 0.24, 0.0), (0.08, 0.10, 0.08))],
    "opal_flat": [((0.05, 0.03, 0.14), (0.32, 0.04, 0.16)), ((0.05, 0.03, -0.14), (0.32, 0.04, 0.16))],
    "ember_ribbon": [((0.12, 0.02, 0.0), (0.48, 0.07, 0.07)), ((-0.18, -0.03, 0.0), (0.28, 0.05, 0.05))],
    "prism_glow": [((0.20, 0.10, 0.0), (0.10, 0.10, 0.10)), ((0.20, 0.10, 0.08), (0.06, 0.06, 0.14)), ((0.20, 0.10, -0.08), (0.06, 0.06, 0.14))],
    "frost_long": [((0.25, 0.03, 0.0), (0.22, 0.05, 0.05)), ((-0.15, -0.04, 0.0), (0.24, 0.04, 0.08))],
    "arctic_cod": [((0.0, 0.08, 0.0), (0.30, 0.08, 0.14)), ((0.10, -0.06, 0.0), (0.16, 0.08, 0.10))],
    "ice_char": [((0.05, 0.10, 0.0), (0.24, 0.08, 0.10)), ((-0.12, 0.0, 0.08), (0.12, 0.10, 0.06))],
    "polar_herring": [((0.0, -0.08, 0.0), (0.32, 0.05, 0.10)), ((0.10, 0.08, 0.0), (0.14, 0.06, 0.08))],
    "crystal_long": [((0.26, 0.02, 0.0), (0.20, 0.05, 0.05)), ((0.0, 0.08, 0.0), (0.16, 0.04, 0.12))],
    "aurora_cod": [((0.0, 0.10, 0.0), (0.28, 0.06, 0.16)), ((0.12, 0.0, 0.10), (0.10, 0.12, 0.06))],
    "marina_tuna": [((0.05, 0.0, 0.0), (0.40, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.10, 0.10))],
    "saffron_flat": [((0.0, 0.02, 0.18), (0.36, 0.03, 0.18)), ((0.0, 0.02, -0.18), (0.36, 0.03, 0.18))],
    "pearl_grouper": [((0.0, 0.0, 0.0), (0.42, 0.32, 0.28)), ((0.12, 0.12, 0.0), (0.10, 0.10, 0.16))],
    "harbor_pompano": [((0.08, 0.06, 0.0), (0.26, 0.10, 0.16)), ((-0.10, -0.04, 0.0), (0.18, 0.08, 0.12))],
    "gilt_tuna": [((0.04, 0.02, 0.0), (0.38, 0.20, 0.16)), ((0.16, 0.10, 0.0), (0.10, 0.08, 0.08))],
    "gilt_flat": [((0.02, 0.02, 0.15), (0.34, 0.03, 0.16)), ((0.02, 0.02, -0.15), (0.34, 0.03, 0.16))],
    "coral_wrasse": [((0.0, 0.12, 0.0), (0.18, 0.14, 0.10)), ((0.10, 0.0, 0.10), (0.12, 0.10, 0.08))],
    "gilt_wrasse": [((0.0, 0.11, 0.0), (0.20, 0.12, 0.10)), ((-0.08, 0.0, 0.10), (0.12, 0.10, 0.08))],
    "lagoon_tang": [((0.0, 0.14, 0.0), (0.16, 0.18, 0.06)), ((0.08, -0.04, 0.0), (0.14, 0.08, 0.14))],
    "opal_tang": [((0.0, 0.13, 0.0), (0.15, 0.16, 0.06)), ((-0.06, -0.04, 0.0), (0.14, 0.08, 0.14))],
    "gale_jack": [((0.10, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.10, 0.08))],
    "thunder_jack": [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.10, 0.10, 0.10))],
    "squall_bass": [((0.04, 0.0, 0.10), (0.16, 0.14, 0.08)), ((0.04, 0.0, -0.10), (0.16, 0.14, 0.08)), ((0.0, 0.12, 0.0), (0.12, 0.08, 0.08))],
    "prism_squall": [((0.06, 0.08, 0.0), (0.22, 0.08, 0.12)), ((0.0, 0.0, 0.12), (0.10, 0.12, 0.06))],
    "cinder_carp": [((0.0, 0.0, 0.0), (0.32, 0.24, 0.20)), ((0.12, 0.08, 0.0), (0.10, 0.10, 0.10))],
    "gilt_cinder": [((0.02, 0.0, 0.0), (0.30, 0.22, 0.18)), ((0.14, 0.06, 0.0), (0.10, 0.10, 0.10))],
    "ash_pike": [((0.22, 0.0, 0.0), (0.30, 0.08, 0.08)), ((-0.16, 0.04, 0.0), (0.20, 0.06, 0.06))],
    "magma_pike": [((0.24, 0.0, 0.0), (0.32, 0.08, 0.08)), ((-0.14, -0.04, 0.0), (0.18, 0.06, 0.06))],
    "tropic_ray": [((0.0, 0.0, 0.20), (0.36, 0.04, 0.24)), ((0.0, 0.0, -0.20), (0.36, 0.04, 0.24)), ((-0.22, 0.0, 0.0), (0.14, 0.04, 0.10))],
    "pearl_ray": [((0.0, 0.0, 0.18), (0.34, 0.04, 0.22)), ((0.0, 0.0, -0.18), (0.34, 0.04, 0.22)), ((-0.20, 0.0, 0.0), (0.12, 0.04, 0.10))],
    "mangrove_snapper": [((0.16, 0.04, 0.0), (0.14, 0.12, 0.12)), ((-0.10, -0.06, 0.08), (0.12, 0.08, 0.08))],
    "gilt_mangrove": [((0.18, 0.05, 0.0), (0.14, 0.12, 0.12)), ((-0.08, -0.05, -0.08), (0.12, 0.08, 0.08))],
    "glass_goby": [((0.20, 0.02, 0.0), (0.10, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))],
    "prism_goby": [((0.18, 0.06, 0.04), (0.10, 0.06, 0.06)), ((0.18, 0.06, -0.04), (0.10, 0.06, 0.06))],
    "shear_drum": [((0.0, 0.0, 0.0), (0.34, 0.26, 0.22)), ((0.12, 0.10, 0.0), (0.10, 0.10, 0.12))],
    "thunder_drum": [((0.02, 0.02, 0.0), (0.32, 0.24, 0.20)), ((0.0, 0.14, 0.0), (0.12, 0.10, 0.10))],
    "foam_skater": [((0.22, 0.0, 0.0), (0.20, 0.05, 0.05)), ((-0.16, 0.04, 0.0), (0.18, 0.04, 0.08))],
    "crystal_skater": [((0.24, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))],
    "slag_loach": [((0.15, -0.04, 0.0), (0.40, 0.08, 0.08)), ((-0.18, 0.03, 0.0), (0.24, 0.05, 0.05))],
    "magma_loach": [((0.16, -0.03, 0.0), (0.42, 0.08, 0.08)), ((-0.16, 0.04, 0.0), (0.22, 0.05, 0.05))],
    "kiln_perch": [((0.0, 0.12, 0.0), (0.18, 0.12, 0.16)), ((0.10, -0.04, 0.0), (0.12, 0.10, 0.10))],
    "gilt_kiln": [((0.0, 0.13, 0.0), (0.18, 0.12, 0.16)), ((-0.08, -0.04, 0.0), (0.12, 0.10, 0.10))],
    "drift_icefish": [((0.24, 0.02, 0.0), (0.22, 0.05, 0.05)), ((-0.14, -0.04, 0.0), (0.20, 0.04, 0.08))],
    "aurora_icefish": [((0.22, 0.04, 0.0), (0.20, 0.05, 0.05)), ((0.0, 0.10, 0.0), (0.14, 0.04, 0.12))],
    "rime_bream": [((0.0, 0.08, 0.0), (0.28, 0.08, 0.14)), ((0.12, -0.05, 0.0), (0.14, 0.08, 0.10))],
    "crystal_bream": [((0.0, 0.09, 0.0), (0.26, 0.08, 0.14)), ((0.10, 0.0, 0.10), (0.10, 0.10, 0.06))],
    "silk_amberjack": [((0.08, 0.0, 0.0), (0.36, 0.16, 0.14)), ((-0.12, 0.06, 0.0), (0.12, 0.10, 0.08))],
    "gilt_amberjack": [((0.06, 0.02, 0.0), (0.34, 0.16, 0.14)), ((0.0, 0.14, 0.0), (0.10, 0.10, 0.10))],
    "parade_scad": [((0.10, 0.04, 0.0), (0.24, 0.10, 0.12)), ((-0.12, -0.04, 0.0), (0.16, 0.06, 0.10))],
    "opal_scad": [((0.08, 0.05, 0.0), (0.22, 0.10, 0.12)), ((-0.10, 0.0, 0.08), (0.12, 0.08, 0.08))],
    "veil_skate": [((0.0, 0.0, 0.18), (0.34, 0.04, 0.22)), ((0.0, 0.0, -0.18), (0.34, 0.04, 0.22))],
    "pearl_skate": [((0.0, 0.0, 0.16), (0.32, 0.04, 0.20)), ((0.0, 0.0, -0.16), (0.32, 0.04, 0.20)), ((-0.18, 0.0, 0.0), (0.12, 0.04, 0.10))],
    "dusk_cuttle": [((-0.18, -0.06, 0.06), (0.08, 0.24, 0.05)), ((-0.18, -0.06, -0.06), (0.08, 0.24, 0.05))],
    "opal_cuttle": [((-0.20, -0.08, 0.08), (0.08, 0.26, 0.05)), ((-0.20, -0.08, -0.08), (0.08, 0.26, 0.05)), ((-0.26, -0.10, 0.0), (0.08, 0.20, 0.05))],
    "basalt_gurnard": [((0.12, -0.08, 0.10), (0.10, 0.08, 0.18)), ((0.12, -0.08, -0.10), (0.10, 0.08, 0.18)), ((0.20, 0.04, 0.0), (0.12, 0.10, 0.10))],
    "cedar_smelt": [((0.18, 0.03, 0.0), (0.14, 0.06, 0.06)), ((-0.1, -0.04, 0.0), (0.16, 0.04, 0.08))],
    "gilt_cedar": [((0.2, 0.04, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.03, 0.06), (0.14, 0.04, 0.08))],
    "lantern_shad": [((0.22, 0.08, 0.0), (0.12, 0.12, 0.1)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.16))],
    "prism_shad": [((0.2, 0.1, 0.06), (0.1, 0.1, 0.08)), ((0.2, 0.1, -0.06), (0.1, 0.1, 0.08))],
    "brine_mullet": [((0.1, 0.0, 0.0), (0.18, 0.18, 0.18)), ((0.16, 0.06, 0.0), (0.08, 0.1, 0.1))],
    "bronze_brine": [((0.12, 0.02, 0.0), (0.18, 0.18, 0.18)), ((0.18, 0.08, 0.0), (0.08, 0.1, 0.1))],
    "canyon_bass": [((0.04, 0.0, 0.1), (0.16, 0.14, 0.08)), ((0.04, 0.0, -0.1), (0.16, 0.14, 0.08))],
    "crown_canyon": [((0.0, 0.16, 0.0), (0.16, 0.12, 0.16)), ((0.0, 0.24, 0.0), (0.08, 0.1, 0.08))],
    "tidepool_blenny": [((0.16, 0.06, 0.0), (0.12, 0.1, 0.08)), ((-0.08, -0.04, 0.0), (0.14, 0.06, 0.08))],
    "opal_blenny": [((0.14, 0.08, 0.04), (0.12, 0.1, 0.08)), ((0.14, 0.08, -0.04), (0.12, 0.1, 0.08))],
    "reef_hawkfish": [((0.0, 0.14, 0.0), (0.16, 0.16, 0.08)), ((0.12, 0.0, 0.08), (0.1, 0.1, 0.08))],
    "ruby_hawk": [((0.0, 0.15, 0.0), (0.16, 0.16, 0.08)), ((0.18, -0.02, 0.0), (0.12, 0.1, 0.1))],
    "squall_smelt": [((0.22, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))],
    "thunder_smelt": [((0.2, 0.04, 0.0), (0.18, 0.05, 0.05)), ((0.0, 0.12, 0.0), (0.1, 0.08, 0.08))],
    "gale_herring": [((0.0, -0.08, 0.0), (0.3, 0.05, 0.1)), ((0.1, 0.08, 0.0), (0.12, 0.06, 0.08))],
    "prism_gale": [((0.0, -0.06, 0.0), (0.28, 0.05, 0.1)), ((0.08, 0.1, 0.06), (0.1, 0.06, 0.08))],
    "cinder_smelt": [((0.18, -0.02, 0.0), (0.2, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))],
    "magma_cinder": [((0.2, -0.02, 0.0), (0.22, 0.06, 0.06)), ((-0.1, 0.05, 0.0), (0.14, 0.04, 0.08))],
    "slag_perch": [((0.0, 0.12, 0.0), (0.18, 0.12, 0.14)), ((0.1, -0.04, 0.0), (0.12, 0.1, 0.1))],
    "gilt_slag": [((0.0, 0.13, 0.0), (0.18, 0.12, 0.14)), ((-0.08, -0.04, 0.0), (0.12, 0.1, 0.1))],
    "frost_jack": [((0.1, 0.0, 0.0), (0.3, 0.14, 0.12)), ((-0.12, 0.06, 0.0), (0.12, 0.1, 0.08))],
    "aurora_jack": [((0.08, 0.02, 0.0), (0.28, 0.14, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))],
    "rime_herring": [((0.0, -0.07, 0.0), (0.28, 0.05, 0.1)), ((0.08, 0.07, 0.0), (0.12, 0.06, 0.08))],
    "crystal_rime": [((0.0, -0.05, 0.0), (0.26, 0.05, 0.1)), ((0.0, 0.1, 0.0), (0.14, 0.04, 0.12))],
    "plaza_tuna": [((0.05, 0.0, 0.0), (0.42, 0.24, 0.2)), ((0.18, 0.1, 0.0), (0.12, 0.12, 0.12))],
    # Finish 5.0 Phase 9 specialty
    "mist_sprat": [((0.18, 0.03, 0.0), (0.14, 0.06, 0.06)), ((-0.1, -0.04, 0.0), (0.16, 0.04, 0.08))],
    "gilt_mist": [((0.2, 0.04, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.03, 0.06), (0.14, 0.04, 0.08))],
    "veil_shad": [((0.22, 0.08, 0.0), (0.12, 0.12, 0.1)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.16))],
    "prism_veil": [((0.2, 0.1, 0.06), (0.1, 0.1, 0.08)), ((0.2, 0.1, -0.06), (0.1, 0.1, 0.08))],
    "dusk_mullet": [((0.1, 0.0, 0.0), (0.18, 0.18, 0.18)), ((0.16, 0.06, 0.0), (0.08, 0.1, 0.1))],
    "bronze_dusk": [((0.12, 0.02, 0.0), (0.18, 0.18, 0.18)), ((0.18, 0.08, 0.0), (0.08, 0.1, 0.1))],
    "shelf_blenny": [((0.16, 0.06, 0.0), (0.12, 0.1, 0.08)), ((-0.08, -0.04, 0.0), (0.14, 0.06, 0.08))],
    "opal_shelf": [((0.14, 0.08, 0.04), (0.12, 0.1, 0.08)), ((0.14, 0.08, -0.04), (0.12, 0.1, 0.08))],
    "coral_scad": [((0.1, 0.04, 0.0), (0.24, 0.1, 0.12)), ((-0.12, -0.04, 0.0), (0.16, 0.06, 0.1))],
    "gilt_scad": [((0.08, 0.05, 0.0), (0.22, 0.1, 0.12)), ((-0.1, 0.0, 0.08), (0.12, 0.08, 0.08))],
    "storm_drum": [((0.0, 0.0, 0.0), (0.34, 0.26, 0.22)), ((0.12, 0.1, 0.0), (0.1, 0.1, 0.12))],
    "thunder_storm": [((0.02, 0.02, 0.0), (0.32, 0.24, 0.2)), ((0.0, 0.14, 0.0), (0.12, 0.1, 0.1))],
    "ember_ray": [((0.0, 0.0, 0.2), (0.36, 0.04, 0.24)), ((0.0, 0.0, -0.2), (0.36, 0.04, 0.24))],
    "magma_ember": [((0.0, 0.0, 0.18), (0.34, 0.04, 0.22)), ((-0.2, 0.0, 0.0), (0.12, 0.04, 0.1))],
    "north_smelt": [((0.22, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))],
    "aurora_north": [((0.2, 0.04, 0.0), (0.18, 0.05, 0.05)), ((0.0, 0.12, 0.0), (0.1, 0.08, 0.08))],
    "marina_jack": [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))],
    "gilt_marina": [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))],
    "lantern_pike": [((0.22, 0.0, 0.0), (0.3, 0.08, 0.08)), ((-0.16, 0.04, 0.0), (0.2, 0.06, 0.06))],
    "prism_lantern": [((0.24, 0.0, 0.0), (0.32, 0.08, 0.08)), ((-0.14, -0.04, 0.0), (0.18, 0.06, 0.06))],
    "brine_goby": [((0.2, 0.02, 0.0), (0.1, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))],
    "crystal_brine": [((0.18, 0.06, 0.04), (0.1, 0.06, 0.06)), ((0.18, 0.06, -0.04), (0.1, 0.06, 0.06))],
    "plaza_wrasse": [((0.0, 0.12, 0.0), (0.18, 0.14, 0.1)), ((0.1, 0.0, 0.1), (0.12, 0.1, 0.08))],
    "crown_plaza": [((0.0, 0.11, 0.0), (0.2, 0.12, 0.1)), ((-0.08, 0.0, 0.1), (0.12, 0.1, 0.08))],
    "mist_tuna": [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))],
    # Finish 6.0 Phase 8 specialty
    "saffron_sprat": [((0.18, 0.03, 0.0), (0.14, 0.06, 0.06)), ((-0.1, -0.04, 0.0), (0.16, 0.04, 0.08))],
    "gilt_saffron": [((0.2, 0.04, 0.0), (0.14, 0.06, 0.06)), ((-0.08, -0.03, 0.06), (0.14, 0.04, 0.08))],
    "quay_mullet": [((0.1, 0.0, 0.0), (0.18, 0.18, 0.18)), ((0.16, 0.06, 0.0), (0.08, 0.1, 0.1))],
    "bronze_quay": [((0.12, 0.02, 0.0), (0.18, 0.18, 0.18)), ((0.18, 0.08, 0.0), (0.08, 0.1, 0.1))],
    "cobalt_smelt": [((0.22, 0.02, 0.0), (0.18, 0.05, 0.05)), ((-0.14, -0.03, 0.0), (0.16, 0.04, 0.08))],
    "aurora_cobalt": [((0.2, 0.04, 0.0), (0.18, 0.05, 0.05)), ((0.0, 0.12, 0.0), (0.1, 0.08, 0.08))],
    "sound_char": [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))],
    "crystal_sound": [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))],
    "lantern_scad": [((0.1, 0.04, 0.0), (0.24, 0.1, 0.12)), ((-0.12, -0.04, 0.0), (0.16, 0.06, 0.1))],
    "prism_scad": [((0.08, 0.05, 0.0), (0.22, 0.1, 0.12)), ((-0.1, 0.0, 0.08), (0.12, 0.08, 0.08))],
    "tide_wrasse": [((0.0, 0.12, 0.0), (0.18, 0.14, 0.1)), ((0.1, 0.0, 0.1), (0.12, 0.1, 0.08))],
    "glass_tide": [((0.0, 0.11, 0.0), (0.2, 0.12, 0.1)), ((-0.08, 0.0, 0.1), (0.12, 0.1, 0.08))],
    "dock_blenny": [((0.16, 0.06, 0.0), (0.12, 0.1, 0.08)), ((-0.08, -0.04, 0.0), (0.14, 0.06, 0.08))],
    "opal_dock": [((0.14, 0.08, 0.04), (0.12, 0.1, 0.08)), ((0.14, 0.08, -0.04), (0.12, 0.1, 0.08))],
    "cove_drum": [((0.0, 0.0, 0.0), (0.34, 0.26, 0.22)), ((0.12, 0.1, 0.0), (0.1, 0.1, 0.12))],
    "thunder_cove": [((0.02, 0.02, 0.0), (0.32, 0.24, 0.2)), ((0.0, 0.14, 0.0), (0.12, 0.1, 0.1))],
    "reef_jack": [((0.1, 0.0, 0.0), (0.28, 0.14, 0.12)), ((-0.14, 0.06, 0.0), (0.12, 0.1, 0.08))],
    "gilt_reef": [((0.08, 0.04, 0.0), (0.26, 0.12, 0.12)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))],
    "kiln_shad": [((0.22, 0.08, 0.0), (0.12, 0.12, 0.1)), ((0.22, 0.08, 0.0), (0.06, 0.06, 0.16))],
    "magma_kiln": [((0.2, 0.1, 0.06), (0.1, 0.1, 0.08)), ((0.2, 0.1, -0.06), (0.1, 0.1, 0.08))],
    "mist_goby": [((0.2, 0.02, 0.0), (0.1, 0.06, 0.06)), ((-0.12, 0.04, 0.0), (0.16, 0.04, 0.08))],
    "veil_goby": [((0.18, 0.06, 0.04), (0.1, 0.06, 0.06)), ((0.18, 0.06, -0.04), (0.1, 0.06, 0.06))],
    "plaza_bass": [((0.05, 0.0, 0.0), (0.36, 0.2, 0.16)), ((0.16, 0.08, 0.0), (0.12, 0.1, 0.1))],
    "gilt_bass": [((0.04, 0.02, 0.0), (0.34, 0.18, 0.16)), ((0.0, 0.14, 0.0), (0.1, 0.1, 0.1))],
    "cobalt_tuna": [((0.05, 0.0, 0.0), (0.4, 0.22, 0.18)), ((0.18, 0.08, 0.0), (0.12, 0.1, 0.1))],
}


def _finish_part(pos, nrm, idx):
    (x0, y0, z0), (x1, y1, z1) = mesh_bounds(pos)
    cx, cy, cz = (x0 + x1) * 0.5, (y0 + y1) * 0.5, (z0 + z1) * 0.5
    out = [((x - cx), (y - cy), (z - cz)) for x, y, z in pos]
    return out, nrm, idx, mesh_bounds(out)


def part_dorsal(theme: str):
    pos, nrm, idx = [], [], []
    if "needle" in theme or "slender" in theme or "long" in theme or "pike" in theme:
        add_box(pos, nrm, idx, (0.05, 0.22, 0.0), (0.35, 0.28, 0.04))
        add_box(pos, nrm, idx, (-0.05, 0.18, 0.0), (0.18, 0.16, 0.03))
    elif "grouper" in theme or "bass" in theme or "tuna" in theme or "carp" in theme:
        add_box(pos, nrm, idx, (0.0, 0.28, 0.0), (0.40, 0.32, 0.06))
        add_box(pos, nrm, idx, (0.12, 0.38, 0.0), (0.12, 0.18, 0.04))
    elif "flat" in theme or "ray" in theme or "skate" in theme:
        add_box(pos, nrm, idx, (0.0, 0.08, 0.0), (0.28, 0.10, 0.08))
    elif "ribbon" in theme or "tentacle" in theme or "cuttle" in theme:
        add_box(pos, nrm, idx, (0.0, 0.12, 0.0), (0.40, 0.10, 0.04))
    else:
        add_box(pos, nrm, idx, (0.0, 0.24, 0.0), (0.38, 0.26, 0.05))
        add_box(pos, nrm, idx, (0.10, 0.34, 0.0), (0.10, 0.14, 0.03))
    return _finish_part(pos, nrm, idx)


def part_tail(theme: str):
    pos, nrm, idx = [], [], []
    if "needle" in theme or "long" in theme or "pike" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.18, 0.12, 0.04))
        add_box(pos, nrm, idx, (-0.12, 0.10, 0.0), (0.14, 0.18, 0.03))
        add_box(pos, nrm, idx, (-0.12, -0.10, 0.0), (0.14, 0.18, 0.03))
    elif "grouper" in theme or "tuna" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.22, 0.28, 0.06))
        add_box(pos, nrm, idx, (-0.14, 0.16, 0.0), (0.16, 0.22, 0.04))
        add_box(pos, nrm, idx, (-0.14, -0.16, 0.0), (0.16, 0.22, 0.04))
    elif "flat" in theme or "ray" in theme or "skate" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.14, 0.06, 0.16))
        add_box(pos, nrm, idx, (-0.08, 0.0, 0.10), (0.10, 0.04, 0.12))
        add_box(pos, nrm, idx, (-0.08, 0.0, -0.10), (0.10, 0.04, 0.12))
    elif "ribbon" in theme or "cuttle" in theme:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.16, 0.08, 0.04))
        add_box(pos, nrm, idx, (-0.10, 0.06, 0.0), (0.12, 0.10, 0.03))
    else:
        add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.20, 0.16, 0.05))
        add_box(pos, nrm, idx, (-0.12, 0.12, 0.0), (0.14, 0.20, 0.03))
        add_box(pos, nrm, idx, (-0.12, -0.12, 0.0), (0.14, 0.20, 0.03))
    return _finish_part(pos, nrm, idx)


def part_pectoral():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.22, 0.08, 0.28))
    add_box(pos, nrm, idx, (0.08, 0.0, 0.10), (0.10, 0.05, 0.16))
    return _finish_part(pos, nrm, idx)


def part_eye():
    pos, nrm, idx = [], [], []
    add_box(pos, nrm, idx, (0.0, 0.0, 0.0), (0.08, 0.08, 0.08))
    add_box(pos, nrm, idx, (0.02, 0.01, 0.03), (0.04, 0.04, 0.04))
    return _finish_part(pos, nrm, idx)


def part_specialty(theme: str):
    """Theme-unique bump so pairwise digests stay distinct."""
    pos, nrm, idx = [], [], []
    boxes = THEME_SPECIALTY.get(theme)
    if not boxes:
        # Deterministic fallback from theme chars (should not hit if catalog complete).
        seed = sum(ord(c) for c in theme) % 17
        add_box(pos, nrm, idx, (0.05 + seed * 0.01, 0.02, 0.0), (0.12 + seed * 0.01, 0.08, 0.08))
    else:
        for center, size in boxes:
            add_box(pos, nrm, idx, center, size)
    return _finish_part(pos, nrm, idx)


def authored_body(silhouette_kind: str):
    """Base body from silhouette, lightly densified with a belly strip."""
    pos, nrm, idx, _ = fish_silhouette(silhouette_kind)
    pos = list(pos)
    nrm = list(nrm)
    idx = list(idx)
    add_box(pos, nrm, idx, (0.0, -0.08, 0.0), (0.55, 0.10, 0.22))
    pos, bounds = normalize_mesh(pos, target_length=1.0)
    return pos, nrm, idx, bounds


def theme_for_species(species_id: str) -> str | None:
    return AUTHORED_SPECIES.get(species_id)


def placements_for_theme(theme: str) -> list[tuple[str, list[float], list[float]]]:
    """
    Return (mesh_key, translation, scale) for FishArt parts.
    mesh_key maps to builder in generate_fish_stubs.
    """
    if "needle" in theme or "long" in theme or "pike" in theme or "slender" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
            ("dorsal", [0.05, 0.12, 0.0], [0.9, 0.9, 0.9]),
            ("tail", [-0.42, 0.0, 0.0], [0.85, 0.85, 0.85]),
            ("pectoral", [0.05, -0.02, 0.12], [0.7, 0.7, 0.7]),
            ("eye", [0.32, 0.04, 0.06], [1.0, 1.0, 1.0]),
            ("specialty", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ]
    if "grouper" in theme or "tuna" in theme or "carp" in theme or "bulk" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.05, 1.1, 1.1]),
            ("dorsal", [0.0, 0.18, 0.0], [1.0, 1.0, 1.0]),
            ("tail", [-0.38, 0.0, 0.0], [1.0, 1.0, 1.0]),
            ("pectoral", [0.08, -0.04, 0.16], [0.9, 0.9, 0.9]),
            ("eye", [0.28, 0.06, 0.10], [1.1, 1.1, 1.1]),
            ("specialty", [0.0, 0.0, 0.0], [0.55, 0.55, 0.55]),
        ]
    if "flat" in theme or "ray" in theme or "skate" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.1, 0.7, 1.2]),
            ("dorsal", [0.0, 0.06, 0.0], [0.8, 0.8, 0.8]),
            ("tail", [-0.36, 0.0, 0.0], [0.9, 0.9, 0.9]),
            ("pectoral", [0.0, 0.0, 0.18], [1.0, 0.6, 1.1]),
            ("eye", [0.26, 0.04, 0.06], [0.9, 0.9, 0.9]),
            ("specialty", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ]
    if "ribbon" in theme or "tentacle" in theme or "cuttle" in theme:
        return [
            ("body", [0.0, 0.0, 0.0], [1.15, 0.75, 0.75]),
            ("dorsal", [0.0, 0.08, 0.0], [0.9, 0.7, 0.7]),
            ("tail", [-0.44, 0.0, 0.0], [0.8, 0.8, 0.8]),
            ("pectoral", [0.04, -0.02, 0.08], [0.6, 0.6, 0.6]),
            ("eye", [0.34, 0.03, 0.04], [0.9, 0.9, 0.9]),
            ("specialty", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ]
    return [
        ("body", [0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
        ("dorsal", [0.02, 0.14, 0.0], [0.95, 0.95, 0.95]),
        ("tail", [-0.40, 0.0, 0.0], [0.9, 0.9, 0.9]),
        ("pectoral", [0.06, -0.02, 0.14], [0.75, 0.75, 0.75]),
        ("eye", [0.30, 0.05, 0.08], [1.0, 1.0, 1.0]),
        ("specialty", [0.0, 0.02, 0.0], [0.9, 0.9, 0.9]),
    ]
