package com.willio.jeanvilma.fishshopping.render

/**
 * Finish 2.0 Phase 22 — weather ambient profiles for harbor presentation.
 * Presentation-only; does not consume the VfxBurst pool or change 20 Hz sim.
 */
enum class WeatherAmbientId {
    CLEAR, OVERCAST, RAIN, FOG, GALE, DEFAULT,
}

data class WeatherAmbientProfile(
    val id: WeatherAmbientId,
    /** Scene background RGB 0..1. */
    val skyR: Float,
    val skyG: Float,
    val skyB: Float,
    val waterDeepR: Float,
    val waterDeepG: Float,
    val waterDeepB: Float,
    val waterShallowR: Float,
    val waterShallowG: Float,
    val waterShallowB: Float,
    /** Multiplier on water bob amplitude (1 = default). */
    val bobScale: Double,
    val festivalWarmth: Float,
)

private data class AmbientBase(
    val id: WeatherAmbientId,
    val sky: Int,
    val deep: Int,
    val shallow: Int,
    val bobScale: Double,
    val festivalWarmth: Float,
)

private val PROFILES = mapOf(
    WeatherAmbientId.CLEAR to AmbientBase(WeatherAmbientId.CLEAR, 0x9fd3ea, 0x1a5f7a, 0x3a9fc4, 1.0, 0.18f),
    WeatherAmbientId.OVERCAST to AmbientBase(WeatherAmbientId.OVERCAST, 0x8aa0b0, 0x2a4a5a, 0x4a7080, 0.7, 0.12f),
    WeatherAmbientId.RAIN to AmbientBase(WeatherAmbientId.RAIN, 0x5a7088, 0x143848, 0x2a6080, 1.45, 0.10f),
    WeatherAmbientId.FOG to AmbientBase(WeatherAmbientId.FOG, 0xc8d0d4, 0x4a6068, 0x7a9098, 0.4, 0.08f),
    WeatherAmbientId.GALE to AmbientBase(WeatherAmbientId.GALE, 0x4a5a70, 0x102838, 0x285870, 1.85, 0.06f),
    WeatherAmbientId.DEFAULT to AmbientBase(WeatherAmbientId.DEFAULT, 0x9fd3ea, 0x1a5f7a, 0x3a9fc4, 1.0, 0.15f),
)

val WEATHER_AMBIENT_PATTERN_IDS = listOf(
    "weather.clear",
    "weather.overcast",
    "weather.rain",
    "weather.fog",
    "weather.gale",
)

fun weatherAmbientIdForWeatherId(weatherId: String): WeatherAmbientId = when {
    weatherId.contains("gale") -> WeatherAmbientId.GALE
    weatherId.contains("rain") -> WeatherAmbientId.RAIN
    weatherId.contains("fog") -> WeatherAmbientId.FOG
    weatherId.contains("overcast") -> WeatherAmbientId.OVERCAST
    weatherId.contains("clear") -> WeatherAmbientId.CLEAR
    else -> WeatherAmbientId.DEFAULT
}

fun weatherAmbientProfile(
    weatherId: String,
    festivalActive: Boolean = false,
    quality: PresenterQuality = PresenterQuality.MEDIUM,
    reducedMotion: Boolean = false,
): WeatherAmbientProfile {
    val base = PROFILES.getValue(weatherAmbientIdForWeatherId(weatherId))
    val qScale = when (quality) {
        PresenterQuality.LOW -> 0.55f
        PresenterQuality.MEDIUM -> 0.85f
        PresenterQuality.HIGH -> 1.0f
    }
    val bob = if (reducedMotion) 0.0 else base.bobScale * qScale
    val sky = if (festivalActive) {
        mixRgb(base.sky, 0xf0c878, base.festivalWarmth * qScale)
    } else {
        unpackRgb(base.sky)
    }
    val deep = unpackRgb(base.deep)
    val shallow = unpackRgb(base.shallow)
    return WeatherAmbientProfile(
        id = base.id,
        skyR = sky[0], skyG = sky[1], skyB = sky[2],
        waterDeepR = deep[0], waterDeepG = deep[1], waterDeepB = deep[2],
        waterShallowR = shallow[0], waterShallowG = shallow[1], waterShallowB = shallow[2],
        bobScale = bob,
        festivalWarmth = base.festivalWarmth,
    )
}

private fun unpackRgb(hex: Int): FloatArray = floatArrayOf(
    ((hex shr 16) and 0xff) / 255f,
    ((hex shr 8) and 0xff) / 255f,
    (hex and 0xff) / 255f,
)

private fun mixRgb(a: Int, b: Int, t: Float): FloatArray {
    val A = unpackRgb(a)
    val B = unpackRgb(b)
    return floatArrayOf(
        A[0] + (B[0] - A[0]) * t,
        A[1] + (B[1] - A[1]) * t,
        A[2] + (B[2] - A[2]) * t,
    )
}
