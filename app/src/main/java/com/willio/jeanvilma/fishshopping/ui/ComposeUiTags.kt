package com.willio.jeanvilma.fishshopping.ui

/**
 * Finish 3.0 Phase 21 — stable Compose test tags for UI integration tests.
 * Finish 5.0 Phase 26 expands Finish 5 surface tags (soft-floor ≥32).
 * Finish 6.0 Phase 23 expands nest/deep-link surface tags (soft-floor ≥32, live ≥40).
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
    const val GOALS_WEEKLY = "goals.weekly"
    const val GOALS_ENDGAME = "goals.endgame"
    const val DASH_LEDGER = "dash.ledger"
    const val WAREHOUSE_PANEL = "warehouse.panel"
    const val FRICTION_NUDGE = "friction.nudge"
    const val BAG_PANEL = "bag.panel"
    const val NEST_TREASURY = "nest.treasury"
    const val NEST_LOANS = "nest.loans"
    const val SPECIES_BOOK = "species.book"
    const val CONTRACTS_PANEL = "contracts.panel"
    const val MAP_PANEL = "map.panel"
    const val STAFF_TRAIN = "staff.train"
    const val DASH_ROOT = "dash.root"

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
        GOALS_WEEKLY,
        GOALS_ENDGAME,
        DASH_LEDGER,
        WAREHOUSE_PANEL,
        FRICTION_NUDGE,
        BAG_PANEL,
        NEST_TREASURY,
        NEST_LOANS,
        SPECIES_BOOK,
        CONTRACTS_PANEL,
        MAP_PANEL,
        STAFF_TRAIN,
        DASH_ROOT,
    )
}
