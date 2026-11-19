package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 5.0 Phase 28 — content authoring CLI wave 5 ship constants
 * (mirrors shared/ship/content-cli-5.json).
 *
 * Runtime scaffolds remain TypeScript under shared/tools/content_cli/.
 */
object ContentCli5 {
    const val PHASE = 28
    const val PLAN = "30_finish_5.0"
    const val SCHEMA = "fish.ship.content_cli_5.v1"
    const val CONTENT_VERSION = "4.0.0"
    const val SCHEMA_VERSION = 26
    const val CONTENT_CLI_5_MARKER = "authored-finish-5.0-phase-28"
    const val CLOSES_GAP = "contentCli5Missing"
    const val CATALOG = "shared/ship/content-cli-5.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-cli-5.json"
    const val EXTENDS_CONTENT_CLI_3 = "shared/ship/content-cli-3.json"
    const val EXTENDS_CONTENT_CLI_2 = "shared/ship/content-cli-2.json"
    const val EXTENDS_CONTENT_CLI = "shared/ship/content-authoring-cli.json"
    const val MODULE_ROOT = "shared/tools/content_cli/"
    const val SCAFFOLD_KIND_MIN = 11
    const val EXAMPLE_FILE_MIN = 11
    const val FEATURE_MIN = 8
    const val SIM_HZ_INVARIANT = 20
    const val PACK_FLOOR_SPECIES = 125
    const val PACK_FLOOR_QUESTS = 75
    const val PACK_FLOOR_HARBORS = 12
    const val PACK_FLOOR_MACHINES = 14
    const val PACK_FLOOR_RIVALS = 16
    const val PACK_FLOOR_BAITS = 16
    const val PACK_FLOOR_SEASONAL = 16
    const val PACK_FLOOR_COSMETICS = 24
    const val PACK_FLOOR_CHAINS = 7
    const val VALIDATE_SCRIPT = "contentcli5:validate"
    const val SOFT_CONTENT_CLI_3_VALIDATE = "contentcli3:validate"

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
    )

    val WAVE5_KINDS: List<String> = listOf("seasonal", "endgame", "cosmetic")

    val FEATURES: List<String> = listOf(
        "list",
        "check-pack",
        "check-floors",
        "machine",
        "rival",
        "seasonal",
        "endgame",
        "cosmetic",
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
    )
}
