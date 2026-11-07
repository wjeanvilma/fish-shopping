package com.willio.jeanvilma.fishshopping.core.ship

/**
 * Finish 2.0 Phase 13 — weather + tide contracts from
 * `shared/ship/weather-tide.json`.
 */
object WeatherTide {
    const val PHASE = 13
    const val PLAN = "30_finish_2.0"
    const val SCHEMA = "fish.ship.weather_tide.v1"
    const val CATALOG = "shared/ship/weather-tide.json"
    const val WEATHER_PATTERN_COUNT = 5
    const val TIDE_PHASE_COUNT = 4
    const val PARITY_FIXTURE = "shared/fixtures/parity-weather-tide.json"
    const val CONTENT_VERSION = "1.0.1"
    const val SCHEMA_VERSION = 21

    val PATTERN_IDS: List<String> = listOf(
        "weather.clear",
        "weather.overcast",
        "weather.rain",
        "weather.fog",
        "weather.gale",
    )

    val TIDE_PHASE_IDS: List<String> = listOf(
        "tide.low",
        "tide.rising",
        "tide.high",
        "tide.falling",
    )
}
