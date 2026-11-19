package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 21 — Compose UI integration tests
 * (mirrors shared/ship/compose-ui-tests.json).
 */
object ComposeUiTests {
    const val PHASE = 21
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.compose_ui_tests.v1"
    const val CATALOG = "shared/ship/compose-ui-tests.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-compose-ui-tests.json"
    const val MARKER = "authored-finish-3.0-phase-21"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CLOSES_GAP = "composeUiTestsMissing"
    const val VALIDATE_SCRIPT = "npm run composeui:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val TAGS_MODULE = "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ComposeUiTags.kt"
    const val ROBOLECTRIC_SUITE =
        "app/src/test/java/com/willio/jeanvilma/fishshopping/ComposeUiIntegrationTest.kt"
    const val INSTRUMENTED_SUITE =
        "app/src/androidTest/java/com/willio/jeanvilma/fishshopping/TitleMenuInstrumentedTest.kt"
    const val GRADLE_UNIT_TEST_TASK = ":app:testDebugUnitTest"
    const val GRADLE_UNIT_TEST_FILTER = "*ComposeUiIntegrationTest*"
    /** Finish 5.0 Phase 26 soft-floor (was 24). */
    const val MIN_TAG_COUNT = 32
}
