package com.willio.jeanvilma.fishshopping.render

import kotlin.math.cos
import kotlin.math.sin

/**
 * Finish 4.0 Phase 6 — HarborRenderer matrix helpers + GLB scale constants
 * (extracted companion cleanup).
 */
internal object HarborRendererMath {
    val FLY_SLOT = Regex("""^Fly_(\d+)_(fish|portion)$""")
    val BURST_SLOT = Regex("""^VfxBurst_(\d+)$""")
    // Phase 15 character modules bake extents; presenters only tweak T/R (scale = 1).
    const val BODY_SX = 1f
    const val BODY_SY = 1f
    const val BODY_SZ = 1f
    const val PLAYER_NOSE_SX = 0.18f
    const val PLAYER_NOSE_SY = 0.12f
    const val PLAYER_NOSE_SZ = 0.12f
    const val WATER_SX = 80f
    const val WATER_SY = 0.1f
    const val WATER_SZ = 80f
    const val WATER_REST_X = -20.0
    const val WATER_REST_Y = -0.65
    const val WATER_REST_Z = 0.0

    /** Column-major 4x4: rotation about +y by [yaw] (0 faces +z), then translation. */
    fun yawTranslation(yaw: Double, x: Double, y: Double, z: Double): FloatArray {
        val c = cos(yaw).toFloat()
        val s = sin(yaw).toFloat()
        return floatArrayOf(
            c, 0f, -s, 0f,
            0f, 1f, 0f, 0f,
            s, 0f, c, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Column-major 4x4: Ry(yaw) * uniform S, then translation (flying transfer spin/pulse). */
    fun yawScaleTranslation(yaw: Double, x: Double, y: Double, z: Double, scale: Float): FloatArray {
        val c = cos(yaw).toFloat() * scale
        val s = sin(yaw).toFloat() * scale
        return floatArrayOf(
            c, 0f, -s, 0f,
            0f, scale, 0f, 0f,
            s, 0f, c, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Local body: T(0,y,0) * Rx(lean) * Rz(sway) * S — Phase 15 clip lean + walk sway. */
    fun localBody(
        y: Double,
        lean: Double,
        sway: Double,
        sx: Float,
        sy: Float,
        sz: Float,
    ): FloatArray {
        val cl = cos(lean).toFloat()
        val sl = sin(lean).toFloat()
        val cz = cos(sway).toFloat()
        val szr = sin(sway).toFloat()
        return floatArrayOf(
            cz * sx, cl * szr * sx, sl * szr * sx, 0f,
            -szr * sy, cl * cz * sy, sl * cz * sy, 0f,
            0f, -sl * sz, cl * sz, 0f,
            0f, y.toFloat(), 0f, 1f,
        )
    }

    /** Local nose: T(0,y,z) * Rz(sway) * S. */
    fun localNose(y: Double, z: Double, sway: Double, sx: Float, sy: Float, sz: Float): FloatArray {
        val c = cos(sway).toFloat()
        val s = sin(sway).toFloat()
        return floatArrayOf(
            c * sx, s * sx, 0f, 0f,
            -s * sy, c * sy, 0f, 0f,
            0f, 0f, sz, 0f,
            0f, y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Local rod: T(x,y,z) * Rx(tip) * Rz(sway). */
    fun localRod(x: Double, y: Double, z: Double, tip: Double, sway: Double): FloatArray {
        val cl = cos(tip).toFloat()
        val sl = sin(tip).toFloat()
        val cz = cos(sway).toFloat()
        val szr = sin(sway).toFloat()
        return floatArrayOf(
            cz, cl * szr, sl * szr, 0f,
            -szr, cl * cz, sl * cz, 0f,
            0f, -sl, cl, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }

    /** Uniform-axes scale then translation (for Water slab). */
    fun scaleTranslation(x: Double, y: Double, z: Double, sx: Float, sy: Float, sz: Float): FloatArray {
        return floatArrayOf(
            sx, 0f, 0f, 0f,
            0f, sy, 0f, 0f,
            0f, 0f, sz, 0f,
            x.toFloat(), y.toFloat(), z.toFloat(), 1f,
        )
    }
}
