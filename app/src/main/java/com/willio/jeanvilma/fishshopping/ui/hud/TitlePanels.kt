package com.willio.jeanvilma.fishshopping.ui.hud

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.ui.res.painterResource
import com.willio.jeanvilma.fishshopping.R
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.unit.IntSize
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.LiveRegionMode
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.heading
import androidx.compose.ui.semantics.liveRegion
import androidx.compose.ui.semantics.paneTitle
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
import com.willio.jeanvilma.fishshopping.core.store.LicensesNotice
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import com.willio.jeanvilma.fishshopping.core.sim.ContextCard
import com.willio.jeanvilma.fishshopping.core.sim.DailyGoalView
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.ActiveContractView
import com.willio.jeanvilma.fishshopping.core.sim.BankView
import com.willio.jeanvilma.fishshopping.core.sim.BaitOfferView
import com.willio.jeanvilma.fishshopping.core.sim.ContractOfferView
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticIapOfferView
import com.willio.jeanvilma.fishshopping.core.sim.DecorOfferView
import com.willio.jeanvilma.fishshopping.core.sim.HarborMapEntryView
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.PrestigeView
import com.willio.jeanvilma.fishshopping.core.sim.QuestView
import com.willio.jeanvilma.fishshopping.core.sim.SeasonalEventBannerView
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.CosmeticPresentation
import com.willio.jeanvilma.fishshopping.core.sim.TutorialFriction
import com.willio.jeanvilma.fishshopping.core.sim.StaffHireView
import com.willio.jeanvilma.fishshopping.core.sim.WorkerView
import com.willio.jeanvilma.fishshopping.core.sim.StationView
import com.willio.jeanvilma.fishshopping.core.sim.TrophySetView
import com.willio.jeanvilma.fishshopping.core.sim.UpgradeView
import com.willio.jeanvilma.fishshopping.core.sim.BusinessDashboardView
import com.willio.jeanvilma.fishshopping.core.sim.SpeciesBookView
import com.willio.jeanvilma.fishshopping.core.sim.WarehouseView
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.game.CameraRig
import com.willio.jeanvilma.fishshopping.game.CloudConflictView
import com.willio.jeanvilma.fishshopping.game.GameUiState
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.game.LocalRecoveryView
import com.willio.jeanvilma.fishshopping.game.SnapshotChoiceRow
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.HarborView
import com.willio.jeanvilma.fishshopping.ui.ControlQa
import kotlinx.coroutines.delay

/**
 * Finish 3.0 Phase 21 — testable title menu (callbacks, no ViewModel).
 */
@Composable
fun TitleMenuContent(
    hasSave: Boolean,
    onContinue: () -> Unit,
    onNewGameRequest: () -> Unit,
    onPlay: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier
            .testTag(ComposeUiTags.TITLE_ROOT)
            .widthIn(min = 280.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(id = R.drawable.ic_brand_mark),
            contentDescription = null,
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            UiStrings.t("common.brandName"),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.testTag(ComposeUiTags.TITLE_BRAND),
        )
        Spacer(Modifier.height(6.dp))
        Text(
            UiStrings.t("landing.tagline"),
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
        )
        Spacer(Modifier.height(16.dp))
        if (hasSave) {
            Button(
                onClick = onContinue,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.TITLE_CONTINUE),
            ) { Text(UiStrings.t("common.continue")) }
            Spacer(Modifier.height(8.dp))
            OutlinedButton(
                onClick = onNewGameRequest,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.TITLE_NEW_GAME),
            ) { Text(UiStrings.t("common.newGame")) }
        } else {
            Button(
                onClick = onPlay,
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .testTag(ComposeUiTags.TITLE_PLAY),
            ) { Text(UiStrings.t("common.play")) }
            Spacer(Modifier.height(10.dp))
            Text(
                UiStrings.t("title.firstSessionHint"),
                style = MaterialTheme.typography.bodySmall,
                color = Color.Gray,
            )
        }
    }
}

/**
 * Finish 3.0 Phase 21 — testable analytics consent gate.
 */
@Composable
fun TitleAnalyticsConsentContent(
    onAllow: () -> Unit,
    onDecline: () -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier.widthIn(min = 280.dp, max = 400.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(
            painter = painterResource(id = R.drawable.ic_brand_mark),
            contentDescription = null,
            modifier = Modifier.size(72.dp),
        )
        Spacer(Modifier.height(12.dp))
        Text(
            UiStrings.t("common.brandName"),
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            modifier = Modifier.testTag(ComposeUiTags.TITLE_BRAND),
        )
        Spacer(Modifier.height(6.dp))
        Text(
            UiStrings.t("title.analyticsPrompt"),
            style = MaterialTheme.typography.bodyMedium,
            color = Color.Gray,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            UiStrings.t("title.analyticsBody"),
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
        )
        Spacer(Modifier.height(16.dp))
        Button(
            onClick = onAllow,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .testTag(ComposeUiTags.TITLE_ANALYTICS_ALLOW),
        ) { Text(UiStrings.t("title.allowAnalytics")) }
        Spacer(Modifier.height(8.dp))
        OutlinedButton(
            onClick = onDecline,
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(min = 48.dp)
                .testTag(ComposeUiTags.TITLE_ANALYTICS_DECLINE),
        ) { Text(UiStrings.t("title.noThanks")) }
    }
}

@Composable
internal fun TitleScreen(state: GameUiState.Title, vm: GameViewModel) {
    var confirmNew by remember { mutableStateOf(false) }
    val conflict = state.cloudConflict
    val recovery = state.localRecovery
    when {
        conflict != null -> CloudConflictPanel(conflict, vm)
        recovery != null -> LocalRecoveryPanel(recovery, vm)
        !state.settings.analyticsConsentDecided -> CenterCard {
            TitleAnalyticsConsentContent(
                onAllow = { vm.setAnalyticsConsent(true) },
                onDecline = { vm.setAnalyticsConsent(false) },
            )
        }
        else -> CenterCard {
            TitleMenuContent(
                hasSave = state.hasSave,
                onContinue = vm::continueGame,
                onNewGameRequest = { confirmNew = true },
                onPlay = vm::newGame,
            )
        }
    }
    if (confirmNew && conflict == null && recovery == null) {
        AlertDialog(
            onDismissRequest = { confirmNew = false },
            title = { Text(UiStrings.t("common.newGame")) },
            text = { Text(UiStrings.t("title.newGameConfirm")) },
            confirmButton = {
                TextButton(onClick = {
                    confirmNew = false
                    vm.newGame()
                }) { Text(UiStrings.t("common.newGame")) }
            },
            dismissButton = {
                TextButton(onClick = { confirmNew = false }) { Text(UiStrings.t("common.cancel")) }
            },
        )
    }
}

@Composable
internal fun CloudConflictPanel(conflict: CloudConflictView, vm: GameViewModel) {
    CenterCard {
        Column(
            Modifier
                .widthIn(min = 300.dp, max = 420.dp)
                .semantics {
                    paneTitle = UiStrings.t("cloud.chooseSave")
                    liveRegion = LiveRegionMode.Assertive
                    contentDescription = UiStrings.t("a11y.cloudConflictLive")
                },
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(UiStrings.t("cloud.chooseSave"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            val reasonLabel = buildString {
                append(conflict.reason)
                if (conflict.reasonCode.isNotBlank()) {
                    append(" · ")
                    append(conflict.reasonCode)
                }
            }
            Text(
                UiStrings.t("cloud.differsHint", mapOf("reason" to reasonLabel)),
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                modifier = Modifier.semantics {
                    contentDescription = UiStrings.t("a11y.cloudConflictSection")
                },
            )
            if (conflict.diffHints.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    for (hint in conflict.diffHints) {
                        Text(
                            buildString {
                                append('\u2022')
                                append(' ')
                                append(hint)
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                }
            }
            Text(
                buildString {
                    append(UiStrings.t("cloud.severity"))
                    append(": ")
                    append(conflict.severity)
                    if (conflict.ageSkewMs > 0L) {
                        append(" · ")
                        append(UiStrings.t("cloud.ageSkew"))
                        append(' ')
                        append(conflict.ageSkewMs / 1000L)
                        append('s')
                    }
                },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            if (conflict.syncDiagnostics.isNotEmpty()) {
                Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                    Text(
                        UiStrings.t("cloud.syncDiagnostics"),
                        style = MaterialTheme.typography.labelMedium,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                    )
                    for (line in conflict.syncDiagnostics) {
                        Text(
                            buildString {
                                append('\u2022')
                                append(' ')
                                append(line)
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                }
            }
            SnapshotChoiceCard(conflict.local)
            SnapshotChoiceCard(conflict.remote)
            Button(
                onClick = {
                    vm.resolveCloudConflict(
                        if (conflict.recommended == SyncSource.REMOTE) SyncSource.REMOTE else SyncSource.LOCAL,
                    )
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) {
                Text(
                    if (conflict.recommended == SyncSource.REMOTE) {
                        UiStrings.t("cloud.useCloudRecommended")
                    } else {
                        UiStrings.t("cloud.useDeviceRecommended")
                    },
                )
            }
            OutlinedButton(
                onClick = {
                    vm.resolveCloudConflict(
                        if (conflict.recommended == SyncSource.REMOTE) SyncSource.LOCAL else SyncSource.REMOTE,
                    )
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) {
                Text(
                    if (conflict.recommended == SyncSource.REMOTE) {
                        UiStrings.t("cloud.useDeviceInstead")
                    } else {
                        UiStrings.t("cloud.useCloudInstead")
                    },
                )
            }
        }
    }
}

@Composable
internal fun LocalRecoveryPanel(recovery: LocalRecoveryView, vm: GameViewModel) {
    CenterCard {
        Column(Modifier.widthIn(min = 300.dp, max = 420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(UiStrings.t("title.recoverSave"), style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(recovery.reason, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f))
            SnapshotChoiceCard(recovery.previous)
            Button(
                onClick = vm::confirmLocalRecovery,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text(UiStrings.t("title.recoverPrevious")) }
            OutlinedButton(
                onClick = vm::dismissLocalRecovery,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text(UiStrings.t("common.cancel")) }
        }
    }
}

@Composable
internal fun SnapshotChoiceCard(row: SnapshotChoiceRow) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = PanelShape,
        color = if (row.recommended) MaterialTheme.colorScheme.primary.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(row.sourceLabel, fontWeight = FontWeight.Bold)
                if (row.recommended) {
                    Text(UiStrings.t("common.recommended"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                }
            }
            Text(row.harborName, style = Tabular)
            Text(buildString { append((formatCoins(row.coins)).toString()); append(" coins · "); append((row.playtimeLabel).toString()); append(" play") }, style = Tabular)
            Text(row.savedAtLabel, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
        }
    }
}
