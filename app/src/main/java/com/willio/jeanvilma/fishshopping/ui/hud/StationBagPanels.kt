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

@Composable
internal fun BagDetailPanel(
    v: SimView,
    onSelectBait: (String?) -> Unit,
    onSelectTechnique: (String?) -> Unit,
    onClose: () -> Unit,
) {
    Surface(
        Modifier
            .managementSheet(maxWidth = 400.dp, maxHeight = 360.dp)
            .a11yPane("panels.bag")
            .then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    UiStrings.t("panels.bag"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                Text(buildString { append((v.bagUsedUnits).toString()); append("/"); append((v.bagCapacityUnits).toString()) }, style = Tabular)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(UiStrings.t("common.close"))
                }
            }
            if (v.bagFishSpoilActive) {
                Text(UiStrings.t("bag.spoilHint"),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            if (v.preferredBaitId != null) {
                TextButton(onClick = { onSelectBait(null) }, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(UiStrings.t("bait.useAuto"))
                }
            }
            Text(buildString { append("Rod technique · mastery "); append((v.masteryGlobalLevel).toString()) },
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Spacer(Modifier.height(4.dp))
            v.techniques.forEach { tech ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text(tech.name, fontWeight = FontWeight.SemiBold)
                        Text(tech.description, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f))
                        if (!tech.unlocked) {
                            Text(buildString { append("Unlocks at mastery "); append((tech.requiresMasteryLevel).toString()) },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.55f),
                            )
                        }
                    }
                    when {
                        tech.active -> Text(UiStrings.t("common.active"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        tech.unlocked -> TextButton(
                            onClick = { onSelectTechnique(tech.id) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(UiStrings.t("common.use")) }
                        else -> Text(UiStrings.t("common.locked"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.45f))
                    }
                }
                Spacer(Modifier.height(6.dp))
            }
            Spacer(Modifier.height(8.dp))
            if (v.bag.isEmpty()) {
                Text(UiStrings.t("common.empty"), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(v.bag, key = { it.itemId }) { item ->
                        val bait = item.itemId.startsWith("bait.")
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(item.name, fontWeight = FontWeight.SemiBold)
                                if (bait && v.preferredBaitId == item.itemId) {
                                    Text(UiStrings.t("bait.preferredCasts"), style = MaterialTheme.typography.bodySmall)
                                }
                            }
                            Text(buildString { append((item.count).toString()) }, style = Tabular)
                            if (bait && v.preferredBaitId != item.itemId) {
                                TextButton(
                                    onClick = { onSelectBait(item.itemId) },
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text(UiStrings.t("common.prefer")) }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun BaitKioskPanel(
    offers: List<BaitOfferView>,
    preferredBaitId: String?,
    coins: Long,
    onBuy: (String) -> Unit,
    onSelect: (String?) -> Unit,
    onClose: () -> Unit,
) {
    Surface(
        Modifier.managementSheet(maxWidth = 420.dp, maxHeight = 480.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(UiStrings.t("panels.baitKiosk"), style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Text(UiStrings.t("hud.coinsAmount", mapOf("amount" to formatCoins(coins))), style = Tabular)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("common.close")) }
            }
            Text(UiStrings.t("bait.kioskHint"),
                style = MaterialTheme.typography.bodySmall,
            )
            TextButton(
                onClick = { onSelect(null) },
                enabled = preferredBaitId != null,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text(UiStrings.t("bait.auto")) }
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(offers, key = { it.id }) { offer ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(offer.name, fontWeight = FontWeight.SemiBold)
                            Text(offer.description, style = MaterialTheme.typography.bodySmall)
                            Text(buildString { append("Owned "); append((offer.ownedCount).toString()); append(" · pack of "); append((offer.packQuantity).toString()) },
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (offer.preferred) {
                                Text(UiStrings.t("common.preferred"), style = MaterialTheme.typography.bodySmall)
                            }
                            offer.reason?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                            }
                        }
                        if (offer.ownedCount > 0 && !offer.preferred) {
                            TextButton(
                                onClick = { onSelect(offer.id) },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(UiStrings.t("common.prefer")) }
                        }
                        Button(
                            onClick = { onBuy(offer.id) },
                            enabled = offer.purchasable,
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(formatCoins(offer.cost)) }
                    }
                }
            }
        }
    }
}

@Composable
internal fun StationDetailPanel(
    card: ContextCard,
    stations: List<StationView>,
    coins: Long,
    onCycleRecipe: (() -> Unit)?,
    onSetPaused: (String, Boolean) -> Unit,
    onRepair: (String) -> Unit,
    onBuildPlot: (() -> Unit)?,
    onClose: () -> Unit,
) {
    val station = card.stationId?.let { id -> stations.firstOrNull { it.stationId == id } }
    val paused = station?.status == MachineStatus.PAUSED || station?.statusText == "Paused"
    Surface(
        Modifier.managementSheet(maxWidth = 400.dp, maxHeight = 520.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(card.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("common.close")) }
            }
            card.lines.forEach { Text(it, style = Tabular) }
            if (station?.needsRepair == true) {
                Text(
                    buildString {
                        append(
                            if (station.status == MachineStatus.NEEDS_REPAIR) {
                                "Broken — pay for a repair to resume."
                            } else {
                                "Running slow — repair clears the fault early."
                            },
                        )
                        if (station.slowTicksRemaining > 0) {
                            append(" · ${formatRushSeconds(station.slowTicksRemaining)}s left")
                        }
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.error,
                )
            }
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { it.coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth(),
                    color = MaterialTheme.colorScheme.primary,
                )
            }
            if (onCycleRecipe != null || card.stationId != null || onBuildPlot != null) {
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onCycleRecipe != null && card.recipeModeLabel != null) {
                        Button(
                            onClick = onCycleRecipe,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text(UiStrings.t("hud.recipeLabel", mapOf("label" to (card.recipeModeLabel ?: "")))) }
                    }
                    card.stationId?.let { id ->
                        if (station?.needsRepair == true) {
                            Button(
                                onClick = { onRepair(id) },
                                enabled = coins >= station.repairCost,
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                            ) { Text(UiStrings.t("station.repairCost", mapOf("cost" to formatCoins(station.repairCost)))) }
                        }
                        Button(
                            onClick = { onSetPaused(id, !paused) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text(if (paused) "Resume machine" else "Pause machine") }
                    }
                    val plotCost = card.plotCost
                    if (onBuildPlot != null && plotCost != null) {
                        Button(
                            onClick = onBuildPlot,
                            enabled = card.plotBuildable,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text(buildString { append("Build · "); append((formatCoins(plotCost)).toString()) }) }
                    }
                }
            }
        }
    }
}
