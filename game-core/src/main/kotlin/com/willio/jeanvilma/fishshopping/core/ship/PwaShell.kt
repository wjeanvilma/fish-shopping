package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 3.0 Phase 19 — web PWA / service worker shell
 * (mirrors shared/ship/pwa-shell.json).
 */
object PwaShell {
    const val PHASE = 19
    const val PLAN = "30_finish_3.0"
    const val SCHEMA = "fish.ship.pwa_shell.v1"
    const val CATALOG = "shared/ship/pwa-shell.json"
    const val PARITY_FIXTURE = "shared/fixtures/parity-pwa-shell.json"
    const val POLICY_CATALOG = "shared/pwa/pwa-shell.json"
    const val MARKER = "authored-finish-3.0-phase-19"
    const val CONTENT_VERSION = "2.0.0"
    const val SCHEMA_VERSION = 24
    const val CLOSES_GAP = "pwaMissing"
    const val VALIDATE_SCRIPT = "npm run pwa:validate"
    const val KICKOFF_CATALOG = "shared/ship/finish-3.0-kickoff.json"
    const val SW_SCRIPT = "sw.js"
    const val OFFLINE_FALLBACK = "offline.html"
    const val MANIFEST_PATH = "web/public/manifest.webmanifest"
    const val REGISTER_MODULE = "web/src/pwa/registerServiceWorker.ts"
    const val CACHE_NAME = "fish-shopping-pwa-v1"
    const val DISPLAY = "standalone"
}
