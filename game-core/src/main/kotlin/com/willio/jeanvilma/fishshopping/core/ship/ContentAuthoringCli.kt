package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 27 — content authoring CLI ship constants
 * (mirrors shared/ship/content-authoring-cli.json).
 *
 * Runtime scaffolds are TypeScript under shared/tools/content_cli/.
 */
object ContentAuthoringCli {
    const val PHASE = 27
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.content_authoring_cli.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val CONTENT_CLI_MARKER = "authored-finish-2.0-phase-27"
    const val SCAFFOLD_KIND_MIN = 3
    const val EXAMPLE_FILE_MIN = 3
    const val MODULE_ROOT = "shared/tools/content_cli/"
    const val PYTHON_WRAPPER = "shared/tools/content_scaffold.py"
    const val EXAMPLES_DIR = "shared/content/scaffolds/examples"
    const val PARITY_FIXTURE = "shared/fixtures/parity-content-authoring-cli.json"
    const val CATALOG = "shared/ship/content-authoring-cli.json"
    val SCAFFOLD_KINDS = listOf("species", "quest", "harbor")
    val EXAMPLE_FILES = listOf(
        "shared/content/scaffolds/examples/species.scaffold_tide_perch.json",
        "shared/content/scaffolds/examples/quest.scaffold_morning_haul.json",
        "shared/content/scaffolds/examples/harbor.scaffold_mist_cove.json",
    )
}
