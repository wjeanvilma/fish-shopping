package com.willio.jeanvilma.fishshopping.ui

/**
 * Finish 3.0 Phase 21 — stable Compose test tags for UI integration tests.
 * Finish 4.0 Phase 26 expands nav/chrome tags (soft-floor ≥24).
 * Presentation-only; never affects sim.
 */
object ComposeUiTags {
    const val TITLE_ROOT = "title.root"
    const val TITLE_BRAND = "title.brand"
    const val TITLE_CONTINUE = "title.continue"
    const val TITLE_NEW_GAME = "title.newGame"
    const val TITLE_PLAY = "title.play"
    const val TITLE_ANALYTICS_ALLOW = "title.analytics.allow"
    const val TITLE_ANALYTICS_DECLINE = "title.analytics.decline"

    const val OFFLINE_ROOT = "offline.root"
    const val OFFLINE_CONTINUE = "offline.continue"

    const val PAUSE_ROOT = "pause.root"
    const val PAUSE_RESUME = "pause.resume"
    const val PAUSE_SETTINGS = "pause.settings"
    const val PAUSE_TITLE = "pause.titleScreen"

    const val NAV_PAUSE = "nav.pause"
    const val NAV_MAP = "nav.map"
    const val NAV_WAREHOUSE = "nav.warehouse"
    const val NAV_GOALS = "nav.goals"
    const val NAV_JOBS = "nav.jobs"
    const val NAV_STAFF = "nav.staff"
    const val NAV_DASH = "nav.dash"
    const val NAV_UPGRADES = "nav.upgrades"
    const val NAV_BAG = "nav.bag"
    const val NAV_MENU = "nav.menu"
    const val NAV_PHOTO = "nav.photo"
    const val NAV_DECOR = "nav.decor"
    const val PHOTO_SNAP = "photo.snap"
    const val DECOR_PLACE = "decor.place"
    const val HUD_TOOLBAR = "hud.toolbar"
    const val DEEPLINK_READY = "deeplink.ready"

    val ALL: List<String> = listOf(
        TITLE_ROOT,
        TITLE_BRAND,
        TITLE_CONTINUE,
        TITLE_NEW_GAME,
        TITLE_PLAY,
        TITLE_ANALYTICS_ALLOW,
        TITLE_ANALYTICS_DECLINE,
        OFFLINE_ROOT,
        OFFLINE_CONTINUE,
        PAUSE_ROOT,
        PAUSE_RESUME,
        PAUSE_SETTINGS,
        PAUSE_TITLE,
        NAV_PAUSE,
        NAV_MAP,
        NAV_WAREHOUSE,
        NAV_GOALS,
        NAV_JOBS,
        NAV_STAFF,
        NAV_DASH,
        NAV_UPGRADES,
        NAV_BAG,
        NAV_MENU,
        NAV_PHOTO,
        NAV_DECOR,
        PHOTO_SNAP,
        DECOR_PLACE,
        HUD_TOOLBAR,
        DEEPLINK_READY,
    )
}
