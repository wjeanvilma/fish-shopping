package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 5 — configuration-cache-safe release signing gate contracts from
 * `shared/ship/release-signing-cc.json`.
 */
object ReleaseSigningCc {
    const val PHASE = 5
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.release_signing_cc.v1"
    const val CATALOG = "shared/ship/release-signing-cc.json"
    const val GRADLE_FILE = "app/build.gradle.kts"
    const val FAIL_TASK = "checkReleaseUploadSigning"
    const val FAIL_MESSAGE_NEEDLE = "Release signing not configured"
    const val CONFIG_CACHE_PROP = "org.gradle.configuration-cache"
    const val SCHEMA_VERSION = 21

    val REQUIRED_GRADLE_NEEDLES: List<String> = listOf(
        "checkReleaseUploadSigning",
        "dependsOn(checkReleaseUploadSigning)",
        "tasks.register(\"checkReleaseUploadSigning\")",
    )

    val FORBIDDEN_GRADLE_NEEDLES: List<String> = listOf(
        "tasks.findByName(\"packageRelease\")?.doFirst",
        "tasks.findByName(\"assembleRelease\")?.doFirst",
    )

    val GUARD_TASKS: List<String> = listOf("packageRelease", "bundleRelease")
}
