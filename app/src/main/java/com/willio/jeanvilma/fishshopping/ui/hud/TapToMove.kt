package com.willio.jeanvilma.fishshopping.ui.hud

/**
 * Presentation-only tap-to-move: converts a ground destination into a screen-space
 * stick vector that [com.willio.jeanvilma.fishshopping.game.CameraRig.screenToWorld]
 * maps back to the same world direction. Arrival clears the target — no new sim APIs.
 */
data class TapTarget(val xMm: Int, val zMm: Int)

/** Distance (mm) at which we consider the player arrived and clear the target. */
const val TAP_ARRIVE_MM = 400

data class StickVec(val sx: Float, val sy: Float)

/**
 * Returns screen-space stick components in [-1, 1], or null when arrived / no target.
 * Screen axes match CameraRig: screen right → world −x, screen up → world −z.
 */
fun stickFromTapTarget(
    playerXMm: Int,
    playerZMm: Int,
    target: TapTarget?,
    arriveMm: Int = TAP_ARRIVE_MM,
): StickVec? {
    if (target == null) return null
    val dx = (target.xMm - playerXMm).toDouble()
    val dz = (target.zMm - playerZMm).toDouble()
    val len = kotlin.math.hypot(dx, dz)
    if (len <= arriveMm) return null
    val nx = (dx / len).toFloat()
    val nz = (dz / len).toFloat()
    // Inverse of screenToWorld: world (nx, nz) ← screen (−nx, −nz)
    return StickVec(sx = -nx, sy = -nz)
}
