package com.willio.jeanvilma.fishshopping

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
import com.willio.jeanvilma.fishshopping.ui.hud.TitleMenuContent
import com.willio.jeanvilma.fishshopping.ui.theme.FishShoppingTheme
import org.junit.Assert.assertEquals
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Finish 3.0 Phase 21 — device/emulator Compose smoke for title menu.
 * CI gates the Robolectric twin; this covers the instrumented path locally.
 */
@RunWith(AndroidJUnit4::class)
class TitleMenuInstrumentedTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun titleMenuPlayIsClickable() {
        var play = 0
        composeRule.setContent {
            FishShoppingTheme {
                TitleMenuContent(
                    hasSave = false,
                    onContinue = {},
                    onNewGameRequest = {},
                    onPlay = { play++ },
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_PLAY).assertIsDisplayed().performClick()
        assertEquals(1, play)
    }
}
