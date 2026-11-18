package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 28 — content authoring CLI expansion ship constants
 * (mirrors shared/ship/content-cli-2.json).
 *
 * Runtime scaffolds remain TypeScript under shared/tools/content_cli/.
 */
object ContentCli2 {
    const val PHASE = 28
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.content_cli_2.v1"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CONTENT_CLI_2_MARKER = "authored-finish-3.0-phase-28"
    const val CATALOG = "shared/ship/content-cli-2.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-cli-2.json"
    const val EXTENDS_CONTENT_CLI = "shared/ship/content-authoring-cli.json"
    const val MODULE_ROOT = "shared/tools/content_cli/"
    const val SCAFFOLD_KIND_MIN = 6
    const val EXAMPLE_FILE_MIN = 6
    const val FEATURE_MIN = 5
    const val SIM_HZ_INVARIANT = 20

    val SCAFFOLD_KINDS: List<String> = listOf(
        "species",
        "quest",
        "harbor",
        "contract",
        "bait",
        "decor",
    )

    val EXPANSION_KINDS: List<String> = listOf("contract", "bait", "decor")

    val FEATURES: List<String> = listOf("list", "check-pack", "contract", "bait", "decor")

    val EXAMPLE_FILES: List<String> = listOf(
        "shared/content/scaffolds/examples/species.scaffold_tide_perch.json",
        "shared/content/scaffolds/examples/quest.scaffold_morning_haul.json",
        "shared/content/scaffolds/examples/harbor.scaffold_mist_cove.json",
        "shared/content/scaffolds/examples/contract.scaffold_dawn_crate.json",
        "shared/content/scaffolds/examples/bait.scaffold_kelp_chunk.json",
        "shared/content/scaffolds/examples/decor.scaffold_pier_bunting.json",
    )
}
