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
import androidx.compose.ui.platform.testTag
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags
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
internal fun StaffPanel(
    staff: List<StaffHireView>,
    workers: List<WorkerView>,
    staffGear: List<com.willio.jeanvilma.fishshopping.core.sim.StaffGearView>,
    automationIssues: List<com.willio.jeanvilma.fishshopping.core.sim.AutomationIssueView>,
    onShiftCount: Int,
    freeOnShiftSlots: Int,
    overtimeOnShiftCount: Int,
    wagePerWorkerPerHour: Int,
    maintenanceCoinsPerStation: Int,
    economyUnlocked: Boolean,
    bagFishSpoilActive: Boolean,
    coins: Long,
    onOpenDashboard: () -> Unit,
    onHire: (String) -> Unit,
    onSetShift: (String, Boolean) -> Unit,
    onAssignGear: (String, String) -> Unit,
    onUnequipGear: (String, String) -> Unit,
    onTrainBranch: (String, String) -> Unit,
    onSelectBranch: (String, String?) -> Unit,
    onSetSchedule: (String, String?) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    val freeGear = staffGear.filter { it.equippedOnWorkerId == null }
    Surface(
        modifier.managementSheet(maxHeight = 400.dp).a11yPane("nav.staff"),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        UiStrings.t("nav.staff"),
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.semantics { heading() },
                    )
                    Text(
                        buildString {
                            append("$onShiftCount on shift · $freeOnShiftSlots free slots")
                            if (overtimeOnShiftCount > 0) append(" · $overtimeOnShiftCount overtime")
                            if (wagePerWorkerPerHour > 0) append(" · $wagePerWorkerPerHour coins/hr")
                            if (economyUnlocked && maintenanceCoinsPerStation > 0) {
                                append(" · upkeep $maintenanceCoinsPerStation/station")
                            }
                            if (bagFishSpoilActive) append(" · bag fish spoil")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                }
                Text(UiStrings.t("hud.coinsAmount", mapOf("amount" to formatCoins(coins))), style = Tabular, color = MaterialTheme.colorScheme.onSurface)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("common.close")) }
            }
            Button(
                onClick = onOpenDashboard,
                modifier = Modifier.heightIn(min = 48.dp).padding(bottom = 8.dp),
            ) { Text(UiStrings.t("panels.dashboard")) }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (workers.isNotEmpty()) {
                    items(workers, key = { it.id }) { w ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(buildString { append((w.roleName).toString()); append(" · Lv "); append((w.level).toString()) }, fontWeight = FontWeight.SemiBold)
                                Text(
                                    buildString {
                                        append(if (w.xpToNext == null) "Max level" else "${w.xpToNext} XP to next")
                                        if (w.traitNames.isNotEmpty()) {
                                            append(" · ")
                                            append(w.traitNames.joinToString(", "))
                                        }
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                )
                                w.blockedReason?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                                }
                                w.equipment.forEach { eq ->
                                    TextButton(
                                        onClick = { onUnequipGear(w.id, eq.slotId) },
                                        modifier = Modifier.heightIn(min = 40.dp),
                                    ) { Text(buildString { append((eq.slotName).toString()); append(": "); append((eq.upgradeName).toString()); append(" ×") }) }
                                }
                                freeGear.forEach { g ->
                                    TextButton(
                                        onClick = { onAssignGear(w.id, g.upgradeId) },
                                        modifier = Modifier.heightIn(min = 40.dp),
                                    ) { Text(buildString { append("Equip "); append((g.slotName).toString()) }) }
                                }
                                if (w.branches.isNotEmpty()) {
                                    Text(
                                        buildString {
                                            append(UiStrings.t("staff.trainSection"))
                                            w.activeBranchName?.let { append(": $it") }
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                        modifier = Modifier
                                            .testTag(ComposeUiTags.STAFF_TRAIN)
                                            .semantics {
                                                contentDescription = UiStrings.t("a11y.staffTrainSection")
                                            },
                                    )
                                    w.branches.forEach { b ->
                                        TextButton(
                                            onClick = {
                                                if (b.unlocked) onSelectBranch(w.id, if (b.active) null else b.id)
                                                else onTrainBranch(w.id, b.id)
                                            },
                                            enabled = b.active || b.unlocked || b.canTrain,
                                            modifier = Modifier.heightIn(min = 40.dp),
                                        ) {
                                            Text(
                                                when {
                                                    b.active -> "Using ${b.name}"
                                                    b.unlocked -> "Use ${b.name}"
                                                    else -> "Train ${b.name} · ${formatCoins(b.trainingCostCoins.toLong())}"
                                                },
                                            )
                                        }
                                        if (!b.unlocked && !b.canTrain && !b.trainReason.isNullOrBlank()) {
                                            Text(
                                                b.trainReason!!,
                                                style = MaterialTheme.typography.bodySmall,
                                                color = MaterialTheme.colorScheme.error,
                                            )
                                        }
                                    }
                                }
                                if (w.schedules.isNotEmpty()) {
                                    Text(
                                        buildString {
                                            append("Schedule")
                                            w.scheduleName?.let { append(": $it") }
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                    )
                                    w.schedules.forEach { sch ->
                                        TextButton(
                                            onClick = { onSetSchedule(w.id, if (sch.active) null else sch.id) },
                                            modifier = Modifier.heightIn(min = 40.dp),
                                        ) { Text(if (sch.active) "Using ${sch.name}" else sch.name) }
                                    }
                                }
                            }
                            TextButton(
                                onClick = { onSetShift(w.id, !w.onShift) },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(if (w.onShift) "On shift" else "Off shift") }
                        }
                    }
                }
                if (staffGear.isNotEmpty()) {
                    item {
                        Text(
                            staffGear.joinToString(" · ") { g ->
                                if (g.equippedOnRoleName != null) "${g.name} → ${g.equippedOnRoleName}"
                                else "${g.name} (free)"
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                }
                if (automationIssues.isNotEmpty()) {
                    items(automationIssues, key = { "${it.kind}:${it.id}" }) { issue ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(issue.label, fontWeight = FontWeight.SemiBold)
                                Text(issue.reason, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error)
                            }
                            Text(issue.kind, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
                        }
                    }
                }
                items(staff, key = { it.roleId }) { row ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(row.name, fontWeight = FontWeight.SemiBold)
                            Text(buildString { append((row.roleKind).toString()); append(" · "); append((row.hired).toString()); append("/"); append((row.maxHired).toString()); append(" hired") },
                                style = MaterialTheme.typography.bodySmall,
                            )
                            row.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                        }
                        Button(
                            onClick = { onHire(row.roleId) },
                            enabled = row.purchasable,
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(UiStrings.t("upgrade.cost", mapOf("cost" to formatCoins(row.cost))), style = Tabular) }
                    }
                }
            }
        }
    }
}
