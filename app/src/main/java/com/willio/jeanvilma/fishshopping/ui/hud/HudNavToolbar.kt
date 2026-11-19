package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.widthIn
import androidx.compose.material3.Button
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags

private data class NavEntry(val tag: String, val label: String, val onClick: () -> Unit)

/**
 * Finish 4.0 Phase 26 — ViewModel-free HUD nav toolbar for Compose E2E.
 * Wired into GameScreen; testable without GameViewModel.
 *
 * Cozy art pass 5: tonal secondary buttons with Upgrades as the one primary action, optional
 * Decorate / Photo entries, and a [compact] layout (Upgrades + Menu dropdown) for portrait phones.
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
    onDecor: (() -> Unit)? = null,
    onPhoto: (() -> Unit)? = null,
    compact: Boolean = false,
) {
    val entries = buildList {
        add(NavEntry(ComposeUiTags.NAV_PAUSE, UiStrings.t("nav.pause"), onPause))
        add(NavEntry(ComposeUiTags.NAV_MAP, UiStrings.t("nav.map"), onMap))
        add(NavEntry(ComposeUiTags.NAV_WAREHOUSE, UiStrings.t("nav.warehouse"), onWarehouse))
        add(NavEntry(ComposeUiTags.NAV_GOALS, UiStrings.t("nav.goals"), onGoals))
        add(NavEntry(ComposeUiTags.NAV_JOBS, UiStrings.t("nav.jobs"), onJobs))
        add(NavEntry(ComposeUiTags.NAV_STAFF, UiStrings.t("nav.staff"), onStaff))
        add(NavEntry(ComposeUiTags.NAV_DASH, UiStrings.t("nav.dash"), onDash))
        onDecor?.let { add(NavEntry(ComposeUiTags.NAV_DECOR, UiStrings.t("nav.decor"), it)) }
        onPhoto?.let { add(NavEntry(ComposeUiTags.NAV_PHOTO, UiStrings.t("nav.photo"), it)) }
    }
    if (compact) {
        var open by remember { mutableStateOf(false) }
        Row(
            modifier.testTag(ComposeUiTags.HUD_TOOLBAR),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Button(
                onClick = onUpgrades,
                modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_UPGRADES),
            ) {
                Text(UiStrings.t("nav.upgrades"))
            }
            Box {
                FilledTonalButton(
                    onClick = { open = true },
                    modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_MENU),
                ) {
                    Text(UiStrings.t("nav.menu"))
                }
                DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
                    for (e in entries) {
                        DropdownMenuItem(
                            text = { Text(e.label) },
                            onClick = {
                                open = false
                                e.onClick()
                            },
                            modifier = Modifier.heightIn(min = 48.dp).testTag(e.tag),
                        )
                    }
                }
            }
        }
        return
    }
    FlowRow(
        modifier
            .testTag(ComposeUiTags.HUD_TOOLBAR)
            .widthIn(max = actionsMax),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        for (e in entries) {
            FilledTonalButton(
                onClick = e.onClick,
                modifier = Modifier.heightIn(min = actionMinHeight).testTag(e.tag),
            ) {
                Text(e.label)
            }
        }
        Button(
            onClick = onUpgrades,
            modifier = Modifier.heightIn(min = actionMinHeight).testTag(ComposeUiTags.NAV_UPGRADES),
        ) {
            Text(UiStrings.t("nav.upgrades"))
        }
    }
}
