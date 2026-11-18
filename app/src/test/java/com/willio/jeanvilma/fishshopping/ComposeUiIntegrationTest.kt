package com.willio.jeanvilma.fishshopping

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
import com.willio.jeanvilma.fishshopping.ui.hud.OfflineSummaryPanel
import com.willio.jeanvilma.fishshopping.ui.hud.PausePanel
import com.willio.jeanvilma.fishshopping.ui.hud.TitleAnalyticsConsentContent
import com.willio.jeanvilma.fishshopping.ui.hud.TitleMenuContent
import com.willio.jeanvilma.fishshopping.ui.theme.FishShoppingTheme
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Finish 3.0 Phase 21 — Compose UI integration tests (Robolectric / JVM).
 * Covers title menu, analytics consent, offline summary, and pause panel flows.
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [34])
class ComposeUiIntegrationTest {

    @get:Rule
    val composeRule = createComposeRule()

    @Test
    fun titleMenuShowsPlayWhenNoSave() {
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
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_ROOT).assertIsDisplayed()
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_BRAND).assertIsDisplayed()
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_PLAY).assertIsDisplayed().performClick()
        assertEquals(1, play)
    }

    @Test
    fun titleMenuShowsContinueAndNewGameWhenHasSave() {
        var continued = 0
        var newGame = 0
        composeRule.setContent {
            FishShoppingTheme {
                TitleMenuContent(
                    hasSave = true,
                    onContinue = { continued++ },
                    onNewGameRequest = { newGame++ },
                    onPlay = {},
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_CONTINUE).assertIsDisplayed().performClick()
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_NEW_GAME).assertIsDisplayed().performClick()
        assertEquals(1, continued)
        assertEquals(1, newGame)
    }

    @Test
    fun analyticsConsentButtonsFire() {
        var allow = 0
        var decline = 0
        composeRule.setContent {
            FishShoppingTheme {
                TitleAnalyticsConsentContent(
                    onAllow = { allow++ },
                    onDecline = { decline++ },
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_ANALYTICS_ALLOW).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_ANALYTICS_DECLINE).performClick()
        assertEquals(1, allow)
        assertEquals(1, decline)
    }

    @Test
    fun offlineSummaryContinueFires() {
        var continued = 0
        val report = OfflineReport(
            elapsedMillis = 60_000L,
            ticksCredited = 1_200L,
            capped = false,
            coinsDelta = 25L,
            fishCaught = 0L,
            sales = 1L,
            itemsSold = 1L,
            workerFishCaught = 0L,
            workerItemsMoved = 0L,
        )
        composeRule.setContent {
            FishShoppingTheme {
                OfflineSummaryPanel(
                    report = report,
                    onContinue = { continued++ },
                    modifier = androidx.compose.ui.Modifier,
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.OFFLINE_ROOT).assertIsDisplayed()
        composeRule.onNodeWithTag(ComposeUiTags.OFFLINE_CONTINUE).performClick()
        assertEquals(1, continued)
    }

    @Test
    fun pausePanelActionsFire() {
        var resume = 0
        var settings = 0
        var title = 0
        composeRule.setContent {
            FishShoppingTheme {
                PausePanel(
                    onResume = { resume++ },
                    onSettings = { settings++ },
                    onTitle = { title++ },
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.PAUSE_ROOT).assertIsDisplayed()
        composeRule.onNodeWithTag(ComposeUiTags.PAUSE_RESUME).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.PAUSE_SETTINGS).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.PAUSE_TITLE).performClick()
        assertEquals(1, resume)
        assertEquals(1, settings)
        assertEquals(1, title)
    }

    @Test
    fun composeUiTagsCatalogIsStable() {
        assertTrue(ComposeUiTags.ALL.size >= 16)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.TITLE_CONTINUE))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NAV_PAUSE))
        assertEquals(ComposeUiTags.ALL.size, ComposeUiTags.ALL.toSet().size)
    }
}
