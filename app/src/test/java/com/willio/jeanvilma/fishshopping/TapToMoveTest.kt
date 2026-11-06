package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.game.CameraRig
import com.willio.jeanvilma.fishshopping.ui.hud.TapTarget
import com.willio.jeanvilma.fishshopping.ui.hud.stickFromTapTarget
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import kotlin.math.abs
import kotlin.math.hypot

class TapToMoveTest {
    @Test
    fun stickPointsTowardTarget_andClearsOnArrival() {
        val far = stickFromTapTarget(0, 0, TapTarget(5000, 0))
        assertNotNull(far)
        // World +x ← screen −x
        assertEquals(-1f, far!!.sx, 0.01f)
        assertEquals(0f, far.sy, 0.01f)

        val arrived = stickFromTapTarget(0, 0, TapTarget(100, 0))
        assertNull(arrived)
        assertNull(stickFromTapTarget(0, 0, null))
    }

    @Test
    fun groundFromNdc_centerIsNearLookAt() {
        // Screen centre should land near the look-at point ahead of the player.
        val hit = CameraRig.groundFromNdc(0f, 0f, 16f / 9f, 0, 0)
        assertNotNull(hit)
        assertEquals(0, hit!!.first)
        // look-at is at z = LOOK_AHEAD_M = 1m = 1000mm; centre ray is close to that.
        assertTrue(abs(hit.second - 1000) < 2500)
    }

    @Test
    fun groundFromNdc_rightMapsTowardNegativeX() {
        val center = CameraRig.groundFromNdc(0f, 0f, 16f / 9f, 0, 0)!!
        val right = CameraRig.groundFromNdc(0.4f, 0f, 16f / 9f, 0, 0)!!
        assertTrue(right.first < center.first)
    }

    @Test
    fun screenToWorld_inverseMatchesStickMapping() {
        val stick = stickFromTapTarget(0, 0, TapTarget(0, 8000))!!
        val (wx, wz) = CameraRig.screenToWorld(stick.sx, stick.sy)
        assertEquals(0f, wx, 0.01f)
        assertTrue(wz > 0.9f)
        assertEquals(1.0, hypot(wx.toDouble(), wz.toDouble()), 0.01)
    }
}
