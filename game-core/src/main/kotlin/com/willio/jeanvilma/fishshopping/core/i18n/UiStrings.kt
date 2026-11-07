package com.willio.jeanvilma.fishshopping.core.i18n

import com.willio.jeanvilma.fishshopping.core.ship.I18nScaffold

/**
 * Finish 2.0 Phase 23 — UI chrome string resolver (en + es).
 * Mirrors shared/i18n/ui-strings.*.json. Presentation-only.
 * Phase 24 adds a11y panel / filter / weather keys.
 */
object UiStrings {
    const val DEFAULT_LOCALE = I18nScaffold.DEFAULT_LOCALE
    const val SECOND_LOCALE = I18nScaffold.SECOND_LOCALE

    val SUPPORTED_LOCALES: List<String> = I18nScaffold.SUPPORTED_LOCALES
    val KEYS: Set<String> get() = EN.keys

    private val EN = mapOf(
        "a11y.achievementLocked" to "Locked",
        "a11y.achievementUnlocked" to "Unlocked",
        "a11y.dailyGoalsSection" to "Daily goals",
        "a11y.failStreak" to "Fail streak {count}",
        "a11y.festivalSection" to "Festival weekend",
        "a11y.filterAll" to "All",
        "a11y.filterHidden" to "Hidden",
        "a11y.filterLogged" to "Logged",
        "a11y.languageGroup" to "Language",
        "achievements.close" to "Close",
        "achievements.count" to "{unlocked}/{total}",
        "achievements.title" to "Achievements",
        "codex.detail" to "Species detail",
        "common.back" to "Back",
        "common.cancel" to "Cancel",
        "common.close" to "Close",
        "common.confirm" to "Confirm",
        "common.loading" to "Loading harbor…",
        "common.resume" to "Resume",
        "hud.coins" to "Coins",
        "hud.toolbar" to "Harbor actions",
        "hud.weatherTide" to "Weather and tide",
        "landing.ctaPlay" to "Play in browser",
        "landing.ctaPrivacy" to "Privacy",
        "landing.ctaSupport" to "Support",
        "landing.tagline" to "Catch, cut, sell — run your harbor market",
        "lifecycle.contextLoss" to "Graphics context lost — recovering scene…",
        "lifecycle.storageUnavailable" to "Saving is unavailable in this browser window",
        "lifecycle.storageUnavailableSettings" to "Memory-only (storage unavailable).",
        "lifecycle.webgl2Gate" to "Fish Shopping needs a browser with WebGL 2. Try a current version of Chrome, Firefox, Edge or Safari, and make sure hardware acceleration is turned on.",
        "nav.dash" to "Dash",
        "nav.goals" to "Goals",
        "nav.jobs" to "Jobs",
        "nav.map" to "Map",
        "nav.pause" to "Pause",
        "nav.settings" to "Settings",
        "nav.staff" to "Staff",
        "nav.upgrades" to "Upgrades",
        "nav.warehouse" to "Warehouse",
        "panels.bag" to "Bag",
        "panels.codex" to "Species journal",
        "panels.contracts" to "Jobs",
        "panels.dailyGoals" to "Daily goals",
        "panels.festivals" to "Festival",
        "panels.map" to "Harbor map",
        "panels.staff" to "Staff",
        "panels.upgrades" to "Upgrades",
        "pause.resume" to "Resume",
        "pause.settings" to "Settings",
        "pause.title" to "Paused",
        "pause.titleScreen" to "Title",
        "settings.achievements" to "Achievements",
        "settings.captions" to "Captions",
        "settings.close" to "Close",
        "settings.haptics" to "Haptics",
        "settings.language" to "Language",
        "settings.languageEn" to "English",
        "settings.languageEs" to "Español",
        "settings.languageHint" to "UI language for chrome and store listing keys. Content names stay English.",
        "settings.music" to "Music",
        "settings.mute" to "Mute",
        "settings.off" to "Off",
        "settings.on" to "On",
        "settings.quality" to "Quality",
        "settings.reducedMotion" to "Reduced motion",
        "settings.sfx" to "SFX",
        "settings.title" to "Settings"
    )

    private val ES = mapOf(
        "a11y.achievementLocked" to "Bloqueado",
        "a11y.achievementUnlocked" to "Desbloqueado",
        "a11y.dailyGoalsSection" to "Metas diarias",
        "a11y.failStreak" to "Racha de fallos {count}",
        "a11y.festivalSection" to "Fin de semana festival",
        "a11y.filterAll" to "Todas",
        "a11y.filterHidden" to "Ocultas",
        "a11y.filterLogged" to "Registradas",
        "a11y.languageGroup" to "Idioma",
        "achievements.close" to "Cerrar",
        "achievements.count" to "{unlocked}/{total}",
        "achievements.title" to "Logros",
        "codex.detail" to "Detalle de especie",
        "common.back" to "Atrás",
        "common.cancel" to "Cancelar",
        "common.close" to "Cerrar",
        "common.confirm" to "Confirmar",
        "common.loading" to "Cargando puerto…",
        "common.resume" to "Continuar",
        "hud.coins" to "Monedas",
        "hud.toolbar" to "Acciones del puerto",
        "hud.weatherTide" to "Clima y marea",
        "landing.ctaPlay" to "Jugar en el navegador",
        "landing.ctaPrivacy" to "Privacidad",
        "landing.ctaSupport" to "Soporte",
        "landing.tagline" to "Pesca, corta, vende — dirige tu mercado del puerto",
        "lifecycle.contextLoss" to "Se perdió el contexto gráfico — recuperando la escena…",
        "lifecycle.storageUnavailable" to "No se puede guardar en esta ventana del navegador",
        "lifecycle.storageUnavailableSettings" to "Solo en memoria (almacenamiento no disponible).",
        "lifecycle.webgl2Gate" to "Fish Shopping necesita un navegador con WebGL 2. Prueba una versión actual de Chrome, Firefox, Edge o Safari y activa la aceleración por hardware.",
        "nav.dash" to "Panel",
        "nav.goals" to "Metas",
        "nav.jobs" to "Trabajos",
        "nav.map" to "Mapa",
        "nav.pause" to "Pausa",
        "nav.settings" to "Ajustes",
        "nav.staff" to "Personal",
        "nav.upgrades" to "Mejoras",
        "nav.warehouse" to "Almacén",
        "panels.bag" to "Bolsa",
        "panels.codex" to "Diario de especies",
        "panels.contracts" to "Trabajos",
        "panels.dailyGoals" to "Metas diarias",
        "panels.festivals" to "Festival",
        "panels.map" to "Mapa del puerto",
        "panels.staff" to "Personal",
        "panels.upgrades" to "Mejoras",
        "pause.resume" to "Continuar",
        "pause.settings" to "Ajustes",
        "pause.title" to "En pausa",
        "pause.titleScreen" to "Título",
        "settings.achievements" to "Logros",
        "settings.captions" to "Subtítulos",
        "settings.close" to "Cerrar",
        "settings.haptics" to "Háptica",
        "settings.language" to "Idioma",
        "settings.languageEn" to "English",
        "settings.languageEs" to "Español",
        "settings.languageHint" to "Idioma de la interfaz y claves de la ficha de tienda. Los nombres del contenido siguen en inglés.",
        "settings.music" to "Música",
        "settings.mute" to "Silencio",
        "settings.off" to "No",
        "settings.on" to "Sí",
        "settings.quality" to "Calidad",
        "settings.reducedMotion" to "Menos movimiento",
        "settings.sfx" to "Efectos",
        "settings.title" to "Ajustes"
    )

    private val bundles = mapOf(
        "en" to EN,
        "es" to ES,
    )

    @Volatile
    private var activeLocale: String = DEFAULT_LOCALE

    fun isSupported(locale: String?): Boolean =
        locale != null && locale in SUPPORTED_LOCALES

    fun resolveLocale(preferred: String? = null): String {
        if (isSupported(preferred)) return preferred!!
        return DEFAULT_LOCALE
    }

    fun getLocale(): String = activeLocale

    fun setLocale(locale: String): String {
        activeLocale = resolveLocale(locale)
        return activeLocale
    }

    fun t(key: String, params: Map<String, Any> = emptyMap(), locale: String = activeLocale): String {
        val primary = bundles[resolveLocale(locale)]?.get(key)
        val fallback = EN[key]
        var out = primary ?: fallback ?: key
        for ((k, v) in params) {
            out = out.replace("{$k}", v.toString())
        }
        return out
    }

    fun keyCount(locale: String = DEFAULT_LOCALE): Int =
        bundles[resolveLocale(locale)]?.size ?: 0
}
