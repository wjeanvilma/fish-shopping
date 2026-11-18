package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags

/**
 * Finish 4.0 Phase 26 — ViewModel-free HUD nav toolbar for Compose E2E.
 * Wired into GameScreen; testable without GameViewModel.
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun HudNavToolbarContent(
    onPause: () -> Unit,
    onMap: () -> Unit,
    onWarehouse: () -> Unit,
    onGoals: () -> Unit,
    onJobs: () -> Unit,
    onStaff: () -> Unit,
    onDash: () -> Unit,
    onUpgrades: () -> Unit,
    modifier: Modifier = Modifier,
    actionsMax: Dp = 360.dp,
    actionMinHeight: Dp = 40.dp,
) {
    FlowRow(
        modifier
            .testTag(ComposeUiTags.HUD_TOOLBAR)
            .widthIn(max = actionsMax),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Button(
            onClick = onPause,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_PAUSE),
        ) {
            Text(UiStrings.t("nav.pause"))
        }
        Button(
            onClick = onMap,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_MAP),
        ) {
            Text(UiStrings.t("nav.map"))
        }
        Button(
            onClick = onWarehouse,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_WAREHOUSE),
        ) {
            Text(UiStrings.t("nav.warehouse"))
        }
        Button(
            onClick = onGoals,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_GOALS),
        ) {
            Text(UiStrings.t("nav.goals"))
        }
        Button(
            onClick = onJobs,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_JOBS),
        ) {
            Text(UiStrings.t("nav.jobs"))
        }
        Button(
            onClick = onStaff,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_STAFF),
        ) {
            Text(UiStrings.t("nav.staff"))
        }
        Button(
            onClick = onDash,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_DASH),
        ) {
            Text(UiStrings.t("nav.dash"))
        }
        Button(
            onClick = onUpgrades,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_UPGRADES),
        ) {
            Text(UiStrings.t("nav.upgrades"))
        }
    }
}
