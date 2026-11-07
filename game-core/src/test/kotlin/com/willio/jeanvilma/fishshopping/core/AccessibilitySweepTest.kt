package com.willio.jeanvilma.fishshopping.core

import com.willio.jeanvilma.fishshopping.core.a11y.AccessibilitySweep
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

/** Phase 16 (post-1.0) — a11y & controls sweep. */
class AccessibilitySweepTest {
    private val root: File = File(".").canonicalFile.let { dir ->
        generateSequence(dir) { it.parentFile }.first { File(it, AccessibilitySweep.CATALOG).isFile }
    }

    @Test
    fun catalogLocks48dpAndContrastPairsPass() {
        val catalog = Json.parseToJsonElement(File(root, AccessibilitySweep.CATALOG).readText()).jsonObject
        assertEquals(AccessibilitySweep.PHASE, catalog.getValue("phase").jsonPrimitive.content.toInt())
        assertEquals(AccessibilitySweep.SCHEMA, catalog.getValue("schema").jsonPrimitive.content)
        assertEquals(AccessibilitySweep.MIN_TOUCH_TARGET_DP, catalog.getValue("minTouchTargetDp").jsonPrimitive.content.toInt())

        val tokens = Json.parseToJsonElement(File(root, "shared/tokens/design-tokens.json").readText()).jsonObject
        assertEquals(
            AccessibilitySweep.MIN_TOUCH_TARGET_DP,
            tokens.getValue("size").jsonObject.getValue("minTouchTargetDp").jsonPrimitive.content.toInt(),
        )

        assertTrue(AccessibilitySweep.failingPairs().isEmpty())
        for (pair in AccessibilitySweep.CONTRAST_PAIRS) {
            assertTrue(pair.id, AccessibilitySweep.pairPasses(pair))
        }
        assertTrue(AccessibilitySweep.contrastRatio(AccessibilitySweep.INK, AccessibilitySweep.SURFACE) >= 4.5)
        assertTrue(AccessibilitySweep.contrastRatio(AccessibilitySweep.ON_ACTION, AccessibilitySweep.ACTION) >= 3.0)
    }

    @Test
    fun keyboardTalkBackAndGhostButtonPins() {
        val control = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/ControlQa.kt").readText()
        assertTrue(control.contains("MIN_TOUCH_TARGET_DP = 48"))
        for (action in AccessibilitySweep.REQUIRED_KEYBOARD_ACTIONS) {
            assertTrue("missing $action", control.contains(action))
        }
        val joystick = File(root, "app/src/main/java/com/willio/jeanvilma/fishshopping/ui/hud/Joystick.kt").readText()
        assertTrue(joystick.contains(AccessibilitySweep.JOYSTICK_CONTENT_DESCRIPTION))

        val css = File(root, "web/src/ui/styles.css").readText()
        assertTrue(css.contains("--touch: 48px") || css.contains("--touch:48px"))
        val ghost = Regex("""\.button\.ghost\s*\{[^}]+\}""").find(css)?.value
        assertTrue(ghost != null && ghost.contains("--ink"))
        assertTrue(ghost != null && !ghost.contains("var(--action)"))

        val catalog = Json.parseToJsonElement(File(root, AccessibilitySweep.CATALOG).readText()).jsonObject
        assertTrue(catalog.getValue("failCriteria").jsonArray.size >= 3)
        assertTrue(catalog.getValue("manualChecklist").jsonArray.size >= 3)
    }
}
