package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 16 — festival weekends ship constants
 * (mirrors shared/ship/festival-weekends.json).
 */
object FestivalWeekends {
    const val PHASE = 16
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.festival_weekends.v1"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 23
    const val WEEKEND_EVENT_COUNT = 8
    const val PARITY_FIXTURE = "shared/fixtures/parity-festival-weekends.json"
    const val CATALOG = "shared/ship/festival-weekends.json"

    val EVENT_IDS = listOf(
        "event.harvest_moon_pier",
        "event.coral_carnival",
        "event.northlight_freeze",
        "event.storm_regatta",
        "event.silver_tide",
        "event.ember_night_market",
        "event.moonlit_market",
        "event.grand_regatta",
    )

    val FESTIVAL_CUSTOMER_IDS = listOf(
        "customer.harvest_pier_regular",
        "customer.coral_carnival_tourist",
        "customer.northlight_critic",
        "customer.storm_quay_bulk",
        "customer.silver_tide_buyer",
        "customer.ember_night_wanderer",
        "customer.moonlit_lantern_guest",
        "customer.regatta_vip",
    )
}
