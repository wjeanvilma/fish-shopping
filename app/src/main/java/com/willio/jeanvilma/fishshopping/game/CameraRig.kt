package com.willio.jeanvilma.fishshopping.game

import kotlin.math.sqrt
import kotlin.math.tan

/**
 * Fixed-rotation follow camera (blueprint "Camera behavior": rotation locked by default).
 * The camera sits behind the player on -z, looking toward +z, so on screen
 * right = world -x and up = world +z. Input mapping and rendering both use this
 * object so they can never disagree.
 */
object CameraRig {
    const val HEIGHT_M = 13.0
    const val BACK_M = 11.0
    const val LOOK_AHEAD_M = 1.0
    const val FOV_DEGREES = 45.0

    /** Converts joystick/keyboard input in screen space (x right, y down) to world x/z. */
    fun screenToWorld(screenX: Float, screenY: Float): Pair<Float, Float> = -screenX to -screenY

    /**
     * Ray from the follow camera through NDC onto the y=0 ground plane.
     * [ndcX]/[-1,1] right, [ndcY]/[-1,1] up (compose/touch y-down must be flipped by the caller).
     * Returns millimetres, or null if the ray misses the ground.
     */
    fun groundFromNdc(
        ndcX: Float,
        ndcY: Float,
        aspect: Float,
        playerXMm: Int,
        playerZMm: Int,
    ): Pair<Int, Int>? {
        val px = playerXMm / 1000.0
        val pz = playerZMm / 1000.0
        val eyeX = px
        val eyeY = HEIGHT_M
        val eyeZ = pz - BACK_M
        val targetX = px
        val targetY = 0.0
        val targetZ = pz + LOOK_AHEAD_M

        // Camera +Z points from target toward eye (Three.js / Filament lookAt convention).
        var czX = eyeX - targetX
        var czY = eyeY - targetY
        var czZ = eyeZ - targetZ
        val czLen = hypot3(czX, czY, czZ)
        if (czLen < 1e-8) return null
        czX /= czLen; czY /= czLen; czZ /= czLen

        // Camera +X = normalize(worldUp × camZ) → world −x for this follow pose.
        var cxX = czZ
        var cxY = 0.0
        var cxZ = -czX
        val cxLen = hypot3(cxX, cxY, cxZ)
        if (cxLen < 1e-8) return null
        cxX /= cxLen; cxY /= cxLen; cxZ /= cxLen

        // Camera +Y = camZ × camX
        val cyX = czY * cxZ - czZ * cxY
        val cyY = czZ * cxX - czX * cxZ
        val cyZ = czX * cxY - czY * cxX

        val tanHalf = tan(Math.toRadians(FOV_DEGREES) / 2.0)
        var dx = ndcX * aspect * tanHalf
        var dy = ndcY * tanHalf
        var dz = -1.0
        val dLen = hypot3(dx, dy, dz)
        dx /= dLen; dy /= dLen; dz /= dLen

        val dirX = cxX * dx + cyX * dy + czX * dz
        val dirY = cxY * dx + cyY * dy + czY * dz
        val dirZ = cxZ * dx + cyZ * dy + czZ * dz

        if (kotlin.math.abs(dirY) < 1e-8) return null
        val t = -eyeY / dirY
        if (t <= 0.0) return null
        val hitX = eyeX + t * dirX
        val hitZ = eyeZ + t * dirZ
        return (hitX * 1000.0).toInt() to (hitZ * 1000.0).toInt()
    }

    private fun hypot3(x: Double, y: Double, z: Double): Double = sqrt(x * x + y * y + z * z)
}
