package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 6.0 Phase 27 — content authoring CLI wave 6 + modular packs ship constants
 * (mirrors shared/ship/content-cli-6.json).
 *
 * Runtime scaffolds remain TypeScript under shared/tools/content_cli/.
 */
object ContentCli6 {
    const val PHASE = 27
    const val PLAN = "30_finish_6.0"
    const val SCHEMA = "fish.ship.content_cli_6.v1"
    const val CONTENT_VERSION = "5.0.0"
    const val SCHEMA_VERSION = 27
    const val CONTENT_CLI_6_MARKER = "authored-finish-6.0-phase-27"
    const val CLOSES_GAP = "contentCli6Missing"
    const val CATALOG = "shared/ship/content-cli-6.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-cli-6.json"
    const val EXTENDS_CONTENT_CLI_5 = "shared/ship/content-cli-5.json"
    const val MODULE_ROOT = "shared/tools/content_cli/"
    const val MODPACKS_DIR = "shared/content/scaffolds/modpacks"
    const val SCAFFOLD_KIND_MIN = 14
    const val EXAMPLE_FILE_MIN = 14
    const val FEATURE_MIN = 11
    const val MODPACK_FLOOR = 1
    const val SIM_HZ_INVARIANT = 20
    const val PACK_FLOOR_SPECIES = 150
    const val PACK_FLOOR_QUESTS = 100
    const val PACK_FLOOR_HARBORS = 14
    const val PACK_FLOOR_MACHINES = 16
    const val PACK_FLOOR_RIVALS = 20
    const val PACK_FLOOR_BAITS = 20
    const val PACK_FLOOR_SEASONAL = 20
    const val PACK_FLOOR_COSMETICS = 30
    const val PACK_FLOOR_CHAINS = 9
    const val VALIDATE_SCRIPT = "contentcli6:validate"
    const val SOFT_CONTENT_CLI_5_VALIDATE = "contentcli5:validate"

    val SCAFFOLD_KINDS: List<String> = listOf(
        "species",
        "quest",
        "harbor",
        "contract",
        "bait",
        "decor",
        "machine",
        "rival",
        "seasonal",
        "endgame",
        "cosmetic",
        "chain",
        "sigil",
        "modpack",
    )

    val WAVE6_KINDS: List<String> = listOf("chain", "sigil", "modpack")

    val FEATURES: List<String> = listOf(
        "list",
        "check-pack",
        "check-floors",
        "list-modpacks",
        "check-modpacks",
        "machine",
        "rival",
        "seasonal",
        "endgame",
        "cosmetic",
        "chain",
        "sigil",
        "modpack",
    )

    val EXAMPLE_FILES: List<String> = listOf(
        "shared/content/scaffolds/examples/species.scaffold_tide_perch.json",
        "shared/content/scaffolds/examples/quest.scaffold_morning_haul.json",
        "shared/content/scaffolds/examples/harbor.scaffold_mist_cove.json",
        "shared/content/scaffolds/examples/contract.scaffold_dawn_crate.json",
        "shared/content/scaffolds/examples/bait.scaffold_kelp_chunk.json",
        "shared/content/scaffolds/examples/decor.scaffold_pier_bunting.json",
        "shared/content/scaffolds/examples/machine.scaffold_dock_press.json",
        "shared/content/scaffolds/examples/rival.scaffold_mist_hawker.json",
        "shared/content/scaffolds/examples/event.scaffold_aurora_tide.json",
        "shared/content/scaffolds/examples/endgame.tier.scaffold_crest_harbor.json",
        "shared/content/scaffolds/examples/entitlement.cosmetic.scaffold_aurora_bunting.json",
        "shared/content/scaffolds/examples/chain.scaffold_nest_relay.json",
        "shared/content/scaffolds/examples/endgame.sigil.scaffold_nest_ember.json",
        "shared/content/scaffolds/examples/pack.scaffold_nest_saffron.json",
    )
}
