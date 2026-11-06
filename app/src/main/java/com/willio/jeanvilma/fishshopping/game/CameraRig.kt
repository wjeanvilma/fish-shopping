package com.willio.jeanvilma.fishshopping.game

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
}
