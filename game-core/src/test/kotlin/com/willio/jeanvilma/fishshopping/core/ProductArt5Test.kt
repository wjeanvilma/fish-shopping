package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.ship.Finish5Kickoff
import com.willio.jeanvilma.fishshopping.core.ship.ProductArt5
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ProductArt5Test {
    private fun repoRoot(): File = generateSequence(File(System.getProperty("user.dir"))) { it.parentFile }
        .first { File(it, ProductArt5.CATALOG).isFile }

    @Test
    fun locksPhase10CatalogFloors() {
        assertEquals(10, ProductArt5.PHASE)
        assertEquals("authored-finish-5.0-phase-10", ProductArt5.MARKER)
        assertEquals("product-art-5", ProductArt5.PRODUCT_FINISH5_MARKER)
        assertEquals(40, ProductArt5.AUTHORED_PRODUCT_TARGET)
        assertEquals(18, ProductArt5.COSMETIC_BANNER_TARGET)
        assertFalse(Finish5Kickoff.OPEN_GAP_FLAGS.contains("productArt5Incomplete"))
        assertTrue(Finish5Kickoff.PHASES.any { it.phase == 10 && it.validate == "productart5:validate" })
    }

    @Test
    fun catalogAndAssetsExist() {
        val root = repoRoot()
        assertTrue(File(root, ProductArt5.CATALOG).isFile)
        assertTrue(File(root, ProductArt5.PARITY_FIXTURE).isFile)
        assertTrue(File(root, "shared/assets/models/product_basic_portion.glb").isFile)
        assertTrue(File(root, "shared/assets/models/cosmetic_banner_sunset_bunting.glb").isFile)
    }
}
