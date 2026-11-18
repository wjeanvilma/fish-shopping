package com.willio.jeanvilma.fishshopping.render

import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Cozy art pass 5 — continuous day/night + weather atmosphere (presentation only).
 *
 * Mirror of web/src/render/atmosphere.ts: turns the sim's day progress (0..999 permille of
 * ecology.dayLengthTicks) and weather id into light, sky, fog, lamp-glow and rain values so both
 * renderers light the harbor the same way. Never feeds back into the 20 Hz simulation.
 */
data class AtmosphereFrame(
    val skyHex: String,
    val sunHex: String,
    val sunIntensity: Double,
    /** Unit vector the light travels along (sky → ground). */
    val sunDir: DoubleArray,
    val hemiSkyHex: String,
    val hemiGroundHex: String,
    val hemiIntensity: Double,
    val fogHex: String,
    val fogNear: Double,
    val fogFar: Double,
    /** 0..1 lamp glow / emissive strength. */
    val lampGlow: Double,
    /** 0..1 rain particle density. */
    val rain: Double,
    /** 0..1 wind. */
    val wind: Double,
    val night: Boolean,
)

private data class AtmKey(
    val p: Double,
    val sky: String,
    val sun: String,
    val sunI: Double,
    val hemiSky: String,
    val hemiGround: String,
    val hemiI: Double,
    val fog: String,
    val lamp: Double,
)

private data class WeatherMod(
    val sun: Double,
    val hemi: Double,
    val grey: Double,
    val greyHex: String,
    val fogNear: Double,
    val fogFar: Double,
    val rain: Double,
    val wind: Double,
)

object Atmosphere {
    private val KEYS = listOf(
        AtmKey(0.0, "#f1b48e", "#ffb27a", 1.3, "#f6d2b8", "#6e5a4a", 0.85, "#efc3a4", 0.55),
        AtmKey(0.12, "#cfe4ee", "#ffe2b8", 2.3, "#e6f0f6", "#8a7a5a", 1.15, "#d6e6ee", 0.0),
        AtmKey(0.4, "#9fd3ea", "#fff6e4", 2.9, "#dcefff", "#8a7a5a", 1.3, "#b9dff0", 0.0),
        AtmKey(0.6, "#f3cf98", "#ffcf8c", 2.2, "#f7e2c2", "#7a6448", 1.05, "#f2d4a6", 0.15),
        AtmKey(0.71, "#e48a5c", "#ff8a52", 1.25, "#e9a27c", "#4e3e3a", 0.8, "#d98a66", 0.75),
        AtmKey(0.8, "#3b4070", "#a9bcff", 0.55, "#5f6c9c", "#2a2a3a", 0.6, "#3a4068", 1.0),
        AtmKey(0.93, "#1b2848", "#9db0ff", 0.45, "#41507c", "#1c1e2a", 0.5, "#1f2a48", 1.0),
        AtmKey(1.0, "#f1b48e", "#ffb27a", 1.3, "#f6d2b8", "#6e5a4a", 0.85, "#efc3a4", 0.55),
    )

    private val WEATHER = mapOf(
        "clear" to WeatherMod(1.0, 1.0, 0.0, "#9fb4c2", 34.0, 85.0, 0.0, 0.2),
        "overcast" to WeatherMod(0.55, 1.05, 0.45, "#9aa8b2", 28.0, 72.0, 0.0, 0.35),
        "rain" to WeatherMod(0.4, 0.9, 0.55, "#62788c", 20.0, 58.0, 1.0, 0.5),
        "fog" to WeatherMod(0.5, 1.0, 0.6, "#c8d0d4", 6.0, 32.0, 0.0, 0.1),
        "gale" to WeatherMod(0.45, 0.85, 0.6, "#4e5e72", 18.0, 55.0, 0.65, 1.0),
    )

    fun weatherKey(weatherId: String): String = when {
        "gale" in weatherId -> "gale"
        "rain" in weatherId -> "rain"
        "fog" in weatherId -> "fog"
        "overcast" in weatherId -> "overcast"
        else -> "clear"
    }

    private fun rgb(hex: String): IntArray {
        val h = hex.removePrefix("#")
        return intArrayOf(h.substring(0, 2).toInt(16), h.substring(2, 4).toInt(16), h.substring(4, 6).toInt(16))
    }

    private fun hex(r: Double, g: Double, b: Double): String {
        fun to(n: Double) = n.roundToInt().coerceIn(0, 255).toString(16).padStart(2, '0')
        return "#${to(r)}${to(g)}${to(b)}"
    }

    fun mixHex(a: String, b: String, t: Double): String {
        val x = rgb(a)
        val y = rgb(b)
        return hex(x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t)
    }

    /** sRGB hex → linear RGB floats (Filament light / clear colours are linear). */
    fun linear(hex: String): FloatArray {
        val c = rgb(hex)
        return FloatArray(3) { i ->
            val v = c[i] / 255.0
            (if (v <= 0.04045) v / 12.92 else Math.pow((v + 0.055) / 1.055, 2.4)).toFloat()
        }
    }

    private fun smooth(t: Double) = t * t * (3 - 2 * t)

    private fun dayKey(p: Double): AtmKey {
        val q = ((p % 1.0) + 1.0) % 1.0
        var i = 0
        while (i < KEYS.size - 2 && q >= KEYS[i + 1].p) i++
        val a = KEYS[i]
        val b = KEYS[i + 1]
        val t = smooth((q - a.p) / max(1e-6, b.p - a.p))
        fun n(x: Double, y: Double) = x + (y - x) * t
        return AtmKey(
            q,
            mixHex(a.sky, b.sky, t),
            mixHex(a.sun, b.sun, t),
            n(a.sunI, b.sunI),
            mixHex(a.hemiSky, b.hemiSky, t),
            mixHex(a.hemiGround, b.hemiGround, t),
            n(a.hemiI, b.hemiI),
            mixHex(a.fog, b.fog, t),
            n(a.lamp, b.lamp),
        )
    }

    fun sunDirection(p: Double): DoubleArray {
        val q = ((p % 1.0) + 1.0) % 1.0
        val dayT = min(1.0, q / 0.78)
        val isNight = q >= 0.78
        val nightT = if (isNight) (q - 0.78) / 0.22 else 0.0
        val t = if (isNight) nightT else dayT
        val azimuth = -1.1 + 2.2 * t
        val elevation = if (isNight) 0.95 else 0.55 + 0.6 * sin(PI * dayT)
        val cx = cos(elevation) * sin(azimuth)
        val cz = cos(elevation) * cos(azimuth) * 0.6 + 0.35
        val cy = -sin(elevation)
        val len = hypot(hypot(cx, cy), cz).takeIf { it > 0 } ?: 1.0
        return doubleArrayOf(cx / len, cy / len, cz / len)
    }

    fun frame(dayProgressPermille: Int, weatherId: String, reducedMotion: Boolean = false): AtmosphereFrame {
        val p = dayProgressPermille.coerceIn(0, 999) / 1000.0
        val k = dayKey(p)
        val key = weatherKey(weatherId)
        val w = WEATHER.getValue(key)
        val sky = mixHex(k.sky, w.greyHex, w.grey)
        val fog = mixHex(k.fog, w.greyHex, min(1.0, w.grey + if (key == "fog") 0.25 else 0.0))
        val night = p >= 0.76 || p < 0.04
        val lamp = min(1.0, k.lamp + if (w.sun < 0.6) 0.25 else 0.0)
        return AtmosphereFrame(
            skyHex = sky,
            sunHex = mixHex(k.sun, "#dfe6ee", w.grey * 0.6),
            sunIntensity = k.sunI * w.sun,
            sunDir = sunDirection(p),
            hemiSkyHex = mixHex(k.hemiSky, w.greyHex, w.grey * 0.5),
            hemiGroundHex = k.hemiGround,
            hemiIntensity = k.hemiI * w.hemi,
            fogHex = fog,
            fogNear = w.fogNear,
            fogFar = w.fogFar,
            lampGlow = lamp,
            rain = if (reducedMotion) 0.0 else w.rain,
            wind = w.wind,
            night = night,
        )
    }
}
