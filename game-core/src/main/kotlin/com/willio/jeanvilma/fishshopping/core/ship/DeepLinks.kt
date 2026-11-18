package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 20 — Android App Links + web deep links
 * (mirrors shared/ship/deep-links.json).
 */
object DeepLinks {
    const val PHASE = 20
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.deep_links.v1"
    const val CATALOG = "shared/ship/deep-links.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-deep-links.json"
    const val ROUTES_CATALOG = "shared/deep-links/routes.json"
    const val MARKER = "authored-finish-3.0-phase-20"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CLOSES_GAP = "deepLinksMissing"
    const val VALIDATE_SCRIPT = "npm run deeplink:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val ASSET_LINKS_PATH = "web/public/.well-known/assetlinks.json"
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val HOST = "wjeanvilma.github.io"
    const val PATH_PREFIX = "/fish-shopping/play"
    const val CUSTOM_SCHEME = "fishshopping"
    const val CUSTOM_HOST = "open"
}
