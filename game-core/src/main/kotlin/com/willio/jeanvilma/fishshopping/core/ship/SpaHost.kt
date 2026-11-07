package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 3 — SPA host on GitHub Pages contracts from
 * `shared/ship/spa-host.json`.
 */
object SpaHost {
    const val PHASE = 3
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.spa_host.v1"
    const val CATALOG = "shared/ship/spa-host.json"
    const val CANONICAL_HOST = "https://wjeanvilma.github.io/fish-shopping"
    const val PLAY_PATH = "play/"
    const val PLAY_URL = "https://wjeanvilma.github.io/fish-shopping/play/"
    const val VITE_BASE = "/fish-shopping/play/"
    const val HOST = "github_pages"
    const val SCHEMA_VERSION = 21
    const val FALLBACK_404 = true
    const val STRIP_LEGAL_HTML_FROM_PLAY = true

    val LEGAL_STABLE_PATHS: List<String> = listOf("/", "/privacy.html", "/support.html")
    val REQUIRED_PUBLISHED_FILES: List<String> = listOf(
        "index.html",
        "404.html",
        "manifest.webmanifest",
        "favicon.svg",
    )
}
