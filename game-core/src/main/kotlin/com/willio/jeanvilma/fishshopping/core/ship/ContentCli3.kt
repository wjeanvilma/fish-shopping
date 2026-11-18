package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 4.0 Phase 28 — content authoring CLI wave 3 ship constants
 * (mirrors shared/ship/content-cli-3.json).
 *
 * Runtime scaffolds remain TypeScript under shared/tools/content_cli/.
 */
object ContentCli3 {
    const val PHASE = 28
    const val PLAN = "30_finish_4.0"
    const val SCHEMA = "fish.ship.content_cli_3.v1"
    const val CONTENT_VERSION = "3.0.0"
    const val SCHEMA_VERSION = 25
    const val CONTENT_CLI_3_MARKER = "authored-finish-4.0-phase-28"
    const val CLOSES_GAP = "contentCli3Missing"
    const val CATALOG = "shared/ship/content-cli-3.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-cli-3.json"
    const val EXTENDS_CONTENT_CLI_2 = "shared/ship/content-cli-2.json"
    const val EXTENDS_CONTENT_CLI = "shared/ship/content-authoring-cli.json"
    const val MODULE_ROOT = "shared/tools/content_cli/"
    const val SCAFFOLD_KIND_MIN = 8
    const val EXAMPLE_FILE_MIN = 8
    const val FEATURE_MIN = 5
    const val SIM_HZ_INVARIANT = 20
    const val PACK_FLOOR_SPECIES = 100
    const val PACK_FLOOR_QUESTS = 50
    const val PACK_FLOOR_HARBORS = 10
    const val PACK_FLOOR_MACHINES = 12
    const val PACK_FLOOR_RIVALS = 12
    const val PACK_FLOOR_BAITS = 12

    val SCAFFOLD_KINDS: List<String> = listOf(
        "species",
        "quest",
        "harbor",
        "contract",
        "bait",
        "decor",
        "machine",
        "rival",
    )

    val WAVE3_KINDS: List<String> = listOf("machine", "rival")

    val FEATURES: List<String> = listOf("list", "check-pack", "check-floors", "machine", "rival")

    val EXAMPLE_FILES: List<String> = listOf(
        "shared/content/scaffolds/examples/species.scaffold_tide_perch.json",
        "shared/content/scaffolds/examples/quest.scaffold_morning_haul.json",
        "shared/content/scaffolds/examples/harbor.scaffold_mist_cove.json",
        "shared/content/scaffolds/examples/contract.scaffold_dawn_crate.json",
        "shared/content/scaffolds/examples/bait.scaffold_kelp_chunk.json",
        "shared/content/scaffolds/examples/decor.scaffold_pier_bunting.json",
        "shared/content/scaffolds/examples/machine.scaffold_dock_press.json",
        "shared/content/scaffolds/examples/rival.scaffold_mist_hawker.json",
    )
}
