package com.willio.jeanvilma.fishshopping.core.deeplink

import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId

/**
 * Finish 3.0 Phase 20 — pure deep-link parse math (Android App Links + web).
 */
object DeepLinkRoutes {
    const val PACKAGE_NAME = "com.willio.jeanvilma.fishshopping"
    const val HOST = "wjeanvilma.github.io"
    const val PATH_PREFIX = "/fish-shopping/play"
    const val PLAY_URL = "https://wjeanvilma.github.io/fish-shopping/play/"
    const val CUSTOM_SCHEME = "fishshopping"
    const val CUSTOM_HOST = "open"
    const val ASSET_LINKS_PATH = ".well-known/assetlinks.json"

    /** Finish 5.0 Phase 26 soft-floor: expanded aliases (≥40). Mirrors routes.json. */
    val PANEL_ALIASES: Map<String, ShellPanelId> = mapOf(
        "goals" to ShellPanelId.QUESTS,
        "daily" to ShellPanelId.QUESTS,
        "quests" to ShellPanelId.QUESTS,
        "objectives" to ShellPanelId.QUESTS,
        "weekly" to ShellPanelId.QUESTS,
        "weeklygoals" to ShellPanelId.QUESTS,
        "endgame" to ShellPanelId.QUESTS,
        "retention" to ShellPanelId.QUESTS,
        "jobs" to ShellPanelId.CONTRACTS,
        "contracts" to ShellPanelId.CONTRACTS,
        "staff" to ShellPanelId.STAFF,
        "crew" to ShellPanelId.STAFF,
        "map" to ShellPanelId.MAP,
        "travel" to ShellPanelId.MAP,
        "harbors" to ShellPanelId.MAP,
        "upgrades" to ShellPanelId.UPGRADES,
        "shop" to ShellPanelId.UPGRADES,
        "dash" to ShellPanelId.DASHBOARD,
        "dashboard" to ShellPanelId.DASHBOARD,
        "bank" to ShellPanelId.DASHBOARD,
        "business" to ShellPanelId.DASHBOARD,
        "ledger" to ShellPanelId.DASHBOARD,
        "pierledger" to ShellPanelId.DASHBOARD,
        "cashflow" to ShellPanelId.DASHBOARD,
        "settings" to ShellPanelId.SETTINGS,
        "options" to ShellPanelId.SETTINGS,
        "cosmetics" to ShellPanelId.SETTINGS,
        "licenses" to ShellPanelId.SETTINGS,
        "decor" to ShellPanelId.SETTINGS,
        "codex" to ShellPanelId.SPECIES_BOOK,
        "species" to ShellPanelId.SPECIES_BOOK,
        "journal" to ShellPanelId.SPECIES_BOOK,
        "book" to ShellPanelId.SPECIES_BOOK,
        "encyclopedia" to ShellPanelId.SPECIES_BOOK,
        "warehouse" to ShellPanelId.WAREHOUSE,
        "stock" to ShellPanelId.WAREHOUSE,
        "inventory" to ShellPanelId.WAREHOUSE,
        "bag" to ShellPanelId.BAG,
        "pack" to ShellPanelId.BAG,
        "station" to ShellPanelId.STATION,
        "pier" to ShellPanelId.STATION,
        "pause" to ShellPanelId.PAUSE,
        "menu" to ShellPanelId.PAUSE,
        "friction" to ShellPanelId.PAUSE,
        "photo" to ShellPanelId.PAUSE,
    )

    data class Intent(
        val panel: ShellPanelId? = null,
        val harborId: String? = null,
        val source: String = "none",
        val raw: String = "",
    ) {
        val isEmpty: Boolean get() = panel == null && harborId.isNullOrBlank()
    }

    fun resolvePanelAlias(raw: String?): ShellPanelId? {
        if (raw.isNullOrBlank()) return null
        return PANEL_ALIASES[raw.trim().lowercase()]
    }

    fun parseQuery(query: String?): Map<String, String> {
        if (query.isNullOrBlank()) return emptyMap()
        val q = query.trim().removePrefix("?")
        if (q.isEmpty()) return emptyMap()
        val out = linkedMapOf<String, String>()
        for (part in q.split("&")) {
            if (part.isEmpty()) continue
            val eq = part.indexOf('=')
            if (eq <= 0) continue
            val key = decode(part.substring(0, eq))
            val value = decode(part.substring(eq + 1))
            if (key.isNotEmpty()) out[key] = value
        }
        return out
    }

    fun parseHash(hash: String?): ShellPanelId? {
        if (hash.isNullOrBlank()) return null
        val token = hash.trim().removePrefix("#").substringBefore("?").substringBefore("&")
        return resolvePanelAlias(token)
    }

    fun parsePathPanel(path: String?): ShellPanelId? {
        if (path.isNullOrBlank()) return null
        var p = path.trim()
        if (p.startsWith(PATH_PREFIX)) p = p.removePrefix(PATH_PREFIX)
        p = p.trim('/').lowercase()
        if (p.isEmpty() || p == "play") return null
        val segment = p.substringBefore("/").substringBefore("?")
        return resolvePanelAlias(segment)
    }

    /**
     * Parse a deep link from URI pieces. Query `panel`/`go` wins over path, then hash.
     */
    fun parse(
        scheme: String? = null,
        host: String? = null,
        path: String? = null,
        query: String? = null,
        fragment: String? = null,
        raw: String = "",
    ): Intent {
        val params = parseQuery(query)
        val panelFromQuery = resolvePanelAlias(params["panel"] ?: params["go"])
        val harbor = params["harbor"]?.trim()?.takeIf { it.isNotEmpty() }
        val panelFromPath = parsePathPanel(path)
        val panelFromHash = parseHash(fragment)
        val panel = panelFromQuery ?: panelFromPath ?: panelFromHash

        val source = when {
            panelFromQuery != null || !harbor.isNullOrBlank() -> "query"
            panelFromPath != null -> "path"
            panelFromHash != null -> "hash"
            scheme.equals(CUSTOM_SCHEME, ignoreCase = true) -> "custom"
            host.equals(HOST, ignoreCase = true) -> "applink"
            else -> "none"
        }
        return Intent(panel = panel, harborId = harbor, source = source, raw = raw)
    }

    fun parseUriString(uri: String): Intent {
        val trimmed = uri.trim()
        if (trimmed.isEmpty()) return Intent(raw = uri)
        // Minimal URI split without android.net.Uri dependency (works in JVM tests).
        val schemeSplit = trimmed.split("://", limit = 2)
        val scheme = if (schemeSplit.size == 2) schemeSplit[0] else null
        val rest = if (schemeSplit.size == 2) schemeSplit[1] else trimmed
        val hashIdx = rest.indexOf('#')
        val fragment = if (hashIdx >= 0) rest.substring(hashIdx + 1) else null
        val beforeHash = if (hashIdx >= 0) rest.substring(0, hashIdx) else rest
        val qIdx = beforeHash.indexOf('?')
        val query = if (qIdx >= 0) beforeHash.substring(qIdx + 1) else null
        val beforeQuery = if (qIdx >= 0) beforeHash.substring(0, qIdx) else beforeHash
        val slash = beforeQuery.indexOf('/')
        val host = if (slash >= 0) beforeQuery.substring(0, slash) else beforeQuery
        val path = if (slash >= 0) beforeQuery.substring(slash) else "/"
        return parse(scheme = scheme, host = host, path = path, query = query, fragment = fragment, raw = uri)
    }

    private fun decode(raw: String): String =
        try {
            java.net.URLDecoder.decode(raw.replace("+", "%20"), Charsets.UTF_8)
        } catch (_: Exception) {
            raw
        }
}
