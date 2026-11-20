package com.willio.jeanvilma.fishshopping

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.performClick
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
import com.willio.jeanvilma.fishshopping.ui.hud.HudNavToolbarContent
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
 * Finish 4.0 Phase 26 — HUD nav toolbar + expanded tag floor.
 * Finish 5.0 Phase 26 — Finish 5 surface tags + ≥14 scenarios.
 * Finish 6.0 Phase 24 — nest surface tags + ≥20 scenarios.
 * Covers title menu, analytics consent, offline summary, pause, HUD nav, and nest tags.
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
        assertTrue(ComposeUiTags.ALL.size >= 24)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.TITLE_CONTINUE))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NAV_PAUSE))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NAV_JOBS))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NAV_DASH))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.HUD_TOOLBAR))
        assertEquals(ComposeUiTags.ALL.size, ComposeUiTags.ALL.toSet().size)
    }

    @Test
    fun hudNavToolbarTagsFire() {
        var pause = 0
        var map = 0
        var jobs = 0
        var dash = 0
        composeRule.setContent {
            FishShoppingTheme {
                HudNavToolbarContent(
                    onPause = { pause++ },
                    onMap = { map++ },
                    onWarehouse = {},
                    onGoals = {},
                    onJobs = { jobs++ },
                    onStaff = {},
                    onDash = { dash++ },
                    onUpgrades = {},
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.HUD_TOOLBAR).assertIsDisplayed()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_PAUSE).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_MAP).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_JOBS).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_DASH).performClick()
        assertEquals(1, pause)
        assertEquals(1, map)
        assertEquals(1, jobs)
        assertEquals(1, dash)
    }

    @Test
    fun hudNavWarehouseGoalsFire() {
        var warehouse = 0
        var goals = 0
        composeRule.setContent {
            FishShoppingTheme {
                HudNavToolbarContent(
                    onPause = {},
                    onMap = {},
                    onWarehouse = { warehouse++ },
                    onGoals = { goals++ },
                    onJobs = {},
                    onStaff = {},
                    onDash = {},
                    onUpgrades = {},
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.NAV_WAREHOUSE).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_GOALS).performClick()
        assertEquals(1, warehouse)
        assertEquals(1, goals)
    }

    @Test
    fun hudNavStaffUpgradesFire() {
        var staff = 0
        var upgrades = 0
        composeRule.setContent {
            FishShoppingTheme {
                HudNavToolbarContent(
                    onPause = {},
                    onMap = {},
                    onWarehouse = {},
                    onGoals = {},
                    onJobs = {},
                    onStaff = { staff++ },
                    onDash = {},
                    onUpgrades = { upgrades++ },
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.NAV_STAFF).performClick()
        composeRule.onNodeWithTag(ComposeUiTags.NAV_UPGRADES).performClick()
        assertEquals(1, staff)
        assertEquals(1, upgrades)
    }

    @Test
    fun composeUiTagsFinish5Floor() {
        assertTrue(ComposeUiTags.ALL.size >= 32)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.GOALS_WEEKLY))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.GOALS_ENDGAME))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DASH_LEDGER))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.WAREHOUSE_PANEL))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.FRICTION_NUDGE))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DEEPLINK_READY))
        assertEquals(ComposeUiTags.ALL.size, ComposeUiTags.ALL.toSet().size)
    }

    @Test
    fun titleBrandDisplayed() {
        composeRule.setContent {
            FishShoppingTheme {
                TitleMenuContent(
                    hasSave = false,
                    onContinue = {},
                    onNewGameRequest = {},
                    onPlay = {},
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.TITLE_BRAND).assertIsDisplayed()
    }

    @Test
    fun pauseRootStable() {
        composeRule.setContent {
            FishShoppingTheme {
                PausePanel(onResume = {}, onSettings = {}, onTitle = {})
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.PAUSE_ROOT).assertIsDisplayed()
    }

    @Test
    fun offlineRootStable() {
        val report = OfflineReport(
            elapsedMillis = 1_000L,
            ticksCredited = 20L,
            capped = false,
            coinsDelta = 1L,
            fishCaught = 0L,
            sales = 0L,
            itemsSold = 0L,
            workerFishCaught = 0L,
            workerItemsMoved = 0L,
        )
        composeRule.setContent {
            FishShoppingTheme {
                OfflineSummaryPanel(
                    report = report,
                    onContinue = {},
                    modifier = androidx.compose.ui.Modifier,
                )
            }
        }
        composeRule.onNodeWithTag(ComposeUiTags.OFFLINE_ROOT).assertIsDisplayed()
    }

    @Test
    fun deeplinkReadyTagPresent() {
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DEEPLINK_READY))
        assertEquals("deeplink.ready", ComposeUiTags.DEEPLINK_READY)
    }

    @Test
    fun composeUiTagsNestFloor() {
        assertTrue(ComposeUiTags.ALL.size >= 40)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NEST_TREASURY))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NEST_LOANS))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.BAG_PANEL))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DASH_ROOT))
        assertEquals(ComposeUiTags.ALL.size, ComposeUiTags.ALL.toSet().size)
    }

    @Test
    fun nestTreasuryTagPresent() {
        assertEquals("nest.treasury", ComposeUiTags.NEST_TREASURY)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NEST_TREASURY))
    }

    @Test
    fun nestLoansTagPresent() {
        assertEquals("nest.loans", ComposeUiTags.NEST_LOANS)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.NEST_LOANS))
    }

    @Test
    fun bagPanelTagPresent() {
        assertEquals("bag.panel", ComposeUiTags.BAG_PANEL)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.BAG_PANEL))
    }

    @Test
    fun nestPanelTagsWired() {
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.CONTRACTS_PANEL))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.MAP_PANEL))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.SPECIES_BOOK))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.STAFF_TRAIN))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DASH_ROOT))
        assertEquals("contracts.panel", ComposeUiTags.CONTRACTS_PANEL)
        assertEquals("map.panel", ComposeUiTags.MAP_PANEL)
        assertEquals("species.book", ComposeUiTags.SPECIES_BOOK)
        assertEquals("staff.train", ComposeUiTags.STAFF_TRAIN)
        assertEquals("dash.root", ComposeUiTags.DASH_ROOT)
    }

    @Test
    fun photoDecorTagsStable() {
        assertEquals("photo.snap", ComposeUiTags.PHOTO_SNAP)
        assertEquals("decor.place", ComposeUiTags.DECOR_PLACE)
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.PHOTO_SNAP))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.DECOR_PLACE))
        assertTrue(ComposeUiTags.ALL.contains(ComposeUiTags.FRICTION_NUDGE))
    }
}
