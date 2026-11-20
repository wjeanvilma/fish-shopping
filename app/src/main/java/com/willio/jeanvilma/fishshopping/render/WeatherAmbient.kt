package com.willio.jeanvilma.fishshopping.render

/**
 * Finish 2.0 Phase 22 — weather ambient profiles for harbor presentation.
 * Finish 3.0 Phase 24 adds tide + rival ambient mixes (still not burst-pool).
 * Finish 4.0 Phase 23 adds endgame ambient modes (still not burst-pool).
 * Finish 5.0 Phase 12 adds pressure ambient modes (still not burst-pool).
 * Finish 6.0 Phase 12 adds nest ambient modes (still not burst-pool).
 * Presentation-only; does not consume the VfxBurst pool or change 20 Hz sim.
 */
enum class WeatherAmbientId {
    CLEAR, OVERCAST, RAIN, FOG, GALE, DEFAULT,
}

enum class TideAmbientId {
    DAWN, DAY, DUSK, NIGHT,
}

enum class EndgameAmbientId {
    LOCKED, ACTIVE, CROWNED,
}

enum class PressureAmbientId {
    CALM, RISING, CRITICAL,
}

enum class NestAmbientId {
    IDLE, ROOSTING, SETTLED,
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

private data class TideMix(
    val sky: Int,
    val water: Int,
    val amount: Float,
    val bob: Double,
)

private data class EndgameMix(
    val sky: Int,
    val water: Int,
    val amount: Float,
)

private data class PressureMix(
    val sky: Int,
    val water: Int,
    val amount: Float,
)

private data class NestMix(
    val sky: Int,
    val water: Int,
    val amount: Float,
)

private val PROFILES = mapOf(
    WeatherAmbientId.CLEAR to AmbientBase(WeatherAmbientId.CLEAR, 0x9fd3ea, 0x1a5f7a, 0x3a9fc4, 1.0, 0.18f),
    WeatherAmbientId.OVERCAST to AmbientBase(WeatherAmbientId.OVERCAST, 0x8aa0b0, 0x2a4a5a, 0x4a7080, 0.7, 0.12f),
    WeatherAmbientId.RAIN to AmbientBase(WeatherAmbientId.RAIN, 0x5a7088, 0x143848, 0x2a6080, 1.45, 0.10f),
    WeatherAmbientId.FOG to AmbientBase(WeatherAmbientId.FOG, 0xc8d0d4, 0x4a6068, 0x7a9098, 0.4, 0.08f),
    WeatherAmbientId.GALE to AmbientBase(WeatherAmbientId.GALE, 0x4a5a70, 0x102838, 0x285870, 1.85, 0.06f),
    WeatherAmbientId.DEFAULT to AmbientBase(WeatherAmbientId.DEFAULT, 0x9fd3ea, 0x1a5f7a, 0x3a9fc4, 1.0, 0.15f),
)

private val TIDE_MIX = mapOf(
    TideAmbientId.DAWN to TideMix(0xf2c4a0, 0x3a7a90, 0.22f, 0.95),
    TideAmbientId.DAY to TideMix(0x9fd3ea, 0x1a5f7a, 0.0f, 1.0),
    TideAmbientId.DUSK to TideMix(0xe08958, 0x2a4860, 0.28f, 0.9),
    TideAmbientId.NIGHT to TideMix(0x1a2848, 0x0c2030, 0.42f, 0.75),
)

private val ENDGAME_MIX = mapOf(
    EndgameAmbientId.LOCKED to EndgameMix(0x9fd3ea, 0x1a5f7a, 0.0f),
    EndgameAmbientId.ACTIVE to EndgameMix(0xc8a060, 0x3a5068, 0.16f),
    EndgameAmbientId.CROWNED to EndgameMix(0xe8c878, 0x4a6080, 0.24f),
)

private val PRESSURE_MIX = mapOf(
    PressureAmbientId.CALM to PressureMix(0x9fd3ea, 0x1a5f7a, 0.0f),
    PressureAmbientId.RISING to PressureMix(0xc07050, 0x3a4058, 0.14f),
    PressureAmbientId.CRITICAL to PressureMix(0xa04038, 0x2a3048, 0.22f),
)

private val NEST_MIX = mapOf(
    NestAmbientId.IDLE to NestMix(0x9fd3ea, 0x1a5f7a, 0.0f),
    NestAmbientId.ROOSTING to NestMix(0xd8b878, 0x3a5860, 0.12f),
    NestAmbientId.SETTLED to NestMix(0xe8c898, 0x4a6870, 0.2f),
)

val WEATHER_AMBIENT_PATTERN_IDS = listOf(
    "weather.clear",
    "weather.overcast",
    "weather.rain",
    "weather.fog",
    "weather.gale",
)

val TIDE_AMBIENT_PHASE_IDS = listOf("dawn", "day", "dusk", "night")
val ENDGAME_AMBIENT_MODE_IDS = listOf("locked", "active", "crowned")
val PRESSURE_AMBIENT_MODE_IDS = listOf("calm", "rising", "critical")
val NEST_AMBIENT_MODE_IDS = listOf("idle", "roosting", "settled")

fun weatherAmbientIdForWeatherId(weatherId: String): WeatherAmbientId = when {
    weatherId.contains("gale") -> WeatherAmbientId.GALE
    weatherId.contains("rain") -> WeatherAmbientId.RAIN
    weatherId.contains("fog") -> WeatherAmbientId.FOG
    weatherId.contains("overcast") -> WeatherAmbientId.OVERCAST
    weatherId.contains("clear") -> WeatherAmbientId.CLEAR
    else -> WeatherAmbientId.DEFAULT
}

fun tideAmbientIdForPhaseId(tidePhaseId: String): TideAmbientId = when (tidePhaseId) {
    "dawn" -> TideAmbientId.DAWN
    "dusk" -> TideAmbientId.DUSK
    "night" -> TideAmbientId.NIGHT
    else -> TideAmbientId.DAY
}

fun endgameAmbientIdForView(endgameUnlocked: Boolean, endgameMarkCount: Int): EndgameAmbientId = when {
    !endgameUnlocked -> EndgameAmbientId.LOCKED
    endgameMarkCount > 0 -> EndgameAmbientId.CROWNED
    else -> EndgameAmbientId.ACTIVE
}

fun pressureAmbientIdForView(
    bagSpoilPressurePermille: Int,
    serviceQueuePressurePermille: Int,
    ticksUntilNearestContractDeadline: Int?,
    nextQuestProgressPermille: Int?,
    risingPermille: Int = 700,
    criticalPermille: Int = 1000,
    contractDeadlineWarnTicks: Int = 200,
    questNearCompletePermille: Int = 800,
): PressureAmbientId {
    val maxPressure = maxOf(bagSpoilPressurePermille, serviceQueuePressurePermille)
    val deadlineCritical =
        ticksUntilNearestContractDeadline != null &&
            ticksUntilNearestContractDeadline <= contractDeadlineWarnTicks / 2
    val deadlineRising =
        ticksUntilNearestContractDeadline != null &&
            ticksUntilNearestContractDeadline <= contractDeadlineWarnTicks
    val questRising =
        nextQuestProgressPermille != null && nextQuestProgressPermille >= questNearCompletePermille
    return when {
        maxPressure >= criticalPermille || deadlineCritical -> PressureAmbientId.CRITICAL
        maxPressure >= risingPermille || deadlineRising || questRising -> PressureAmbientId.RISING
        else -> PressureAmbientId.CALM
    }
}

fun nestAmbientIdForView(
    decorPlacementCount: Int,
    nightActive: Boolean = false,
    roostingMinPlacements: Int = 1,
    settledMinPlacements: Int = 3,
): NestAmbientId = when {
    decorPlacementCount >= settledMinPlacements -> NestAmbientId.SETTLED
    decorPlacementCount >= roostingMinPlacements || nightActive -> NestAmbientId.ROOSTING
    else -> NestAmbientId.IDLE
}

fun weatherAmbientProfile(
    weatherId: String,
    festivalActive: Boolean = false,
    quality: PresenterQuality = PresenterQuality.MEDIUM,
    reducedMotion: Boolean = false,
    tidePhaseId: String = "day",
    rivalActive: Boolean = false,
    endgameMode: EndgameAmbientId = EndgameAmbientId.LOCKED,
    pressureMode: PressureAmbientId = PressureAmbientId.CALM,
    nestMode: NestAmbientId = NestAmbientId.IDLE,
): WeatherAmbientProfile {
    val base = PROFILES.getValue(weatherAmbientIdForWeatherId(weatherId))
    val qScale = when (quality) {
        PresenterQuality.LOW -> 0.55f
        PresenterQuality.MEDIUM -> 0.85f
        PresenterQuality.HIGH -> 1.0f
    }
    val tide = TIDE_MIX.getValue(tideAmbientIdForPhaseId(tidePhaseId))
    val bob = if (reducedMotion) 0.0 else base.bobScale * qScale * tide.bob
    var sky = unpackRgb(base.sky)
    var deep = unpackRgb(base.deep)
    var shallow = unpackRgb(base.shallow)
    if (tide.amount > 0f) {
        sky = mixRgb(base.sky, tide.sky, tide.amount * qScale)
        deep = mixRgb(base.deep, tide.water, tide.amount * 0.65f * qScale)
        shallow = mixRgb(base.shallow, tide.water, tide.amount * 0.45f * qScale)
    }
    if (festivalActive) {
        sky = mixRgb(
            packRgb(sky),
            0xf0c878,
            base.festivalWarmth * qScale,
        )
    }
    if (rivalActive) {
        sky = mixRgb(packRgb(sky), 0x8a4068, 0.18f * qScale)
        deep = mixRgb(packRgb(deep), 0x3a2040, 0.12f * qScale)
    }
    val endgame = ENDGAME_MIX.getValue(endgameMode)
    if (endgame.amount > 0f) {
        sky = mixRgb(packRgb(sky), endgame.sky, endgame.amount * qScale)
        deep = mixRgb(packRgb(deep), endgame.water, endgame.amount * 0.55f * qScale)
        shallow = mixRgb(packRgb(shallow), endgame.water, endgame.amount * 0.35f * qScale)
    }
    val pressure = PRESSURE_MIX.getValue(pressureMode)
    if (pressure.amount > 0f) {
        sky = mixRgb(packRgb(sky), pressure.sky, pressure.amount * qScale)
        deep = mixRgb(packRgb(deep), pressure.water, pressure.amount * 0.55f * qScale)
        shallow = mixRgb(packRgb(shallow), pressure.water, pressure.amount * 0.35f * qScale)
    }
    val nest = NEST_MIX.getValue(nestMode)
    if (nest.amount > 0f) {
        sky = mixRgb(packRgb(sky), nest.sky, nest.amount * qScale)
        deep = mixRgb(packRgb(deep), nest.water, nest.amount * 0.55f * qScale)
        shallow = mixRgb(packRgb(shallow), nest.water, nest.amount * 0.35f * qScale)
    }
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

private fun packRgb(rgb: FloatArray): Int {
    val r = (rgb[0].coerceIn(0f, 1f) * 255).toInt()
    val g = (rgb[1].coerceIn(0f, 1f) * 255).toInt()
    val b = (rgb[2].coerceIn(0f, 1f) * 255).toInt()
    return (r shl 16) or (g shl 8) or b
}

private fun mixRgb(a: Int, b: Int, t: Float): FloatArray {
    val A = unpackRgb(a)
    val B = unpackRgb(b)
    return floatArrayOf(
        A[0] + (B[0] - A[0]) * t,
        A[1] + (B[1] - A[1]) * t,
        A[2] + (B[2] - A[2]) * t,
    )
}
