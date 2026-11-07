package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 1 — Pages legal live contracts from
 * `shared/ship/pages-legal-live.json`.
 */
object PagesLegalLive {
    const val PHASE = 1
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.pages_legal_live.v1"
    const val CATALOG = "shared/ship/pages-legal-live.json"
    const val CANONICAL_HOST = "https://wjeanvilma.github.io/fish-shopping"
    const val WORKFLOW = ".github/workflows/pages.yml"
    const val NPM_SCRIPT = "pages:legal"
    const val EXPECT_STATUS = 200
    const val SCHEMA_VERSION = 20

    val LIVE_URLS: List<String> = listOf(
        "https://wjeanvilma.github.io/fish-shopping/",
        "https://wjeanvilma.github.io/fish-shopping/support.html",
        "https://wjeanvilma.github.io/fish-shopping/privacy.html",
    )
}
