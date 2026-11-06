package com.willio.jeanvilma.fishshopping

import com.willio.jeanvilma.fishshopping.render.OCCLUSION_FAR_M
import com.willio.jeanvilma.fishshopping.render.OCCLUSION_NEAR_M
import com.willio.jeanvilma.fishshopping.render.isOcclusionFadeName
import com.willio.jeanvilma.fishshopping.render.occlusionOpacity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class OcclusionFadeTest {
    @Test
    fun zonePadsFadeBetweenNearAndFar() {
        assertTrue(isOcclusionFadeName("Zone_pier_end"))
        assertFalse(isOcclusionFadeName("Player"))
        assertEquals(1.0, occlusionOpacity(0.0), 1e-9)
        assertEquals(1.0, occlusionOpacity(OCCLUSION_NEAR_M), 1e-9)
        assertEquals(0.0, occlusionOpacity(OCCLUSION_FAR_M), 1e-9)
        assertEquals(0.5, occlusionOpacity((OCCLUSION_NEAR_M + OCCLUSION_FAR_M) / 2.0), 1e-9)
    }
}
