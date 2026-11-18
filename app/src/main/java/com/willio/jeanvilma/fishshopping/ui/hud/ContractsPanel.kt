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
internal fun ContractsPanel(
    unlocked: Boolean,
    lockedReason: String?,
    offers: List<ContractOfferView>,
    active: List<ActiveContractView>,
    refreshTicksLeft: Int,
    failStreak: Int,
    failStreakThreshold: Int,
    onAccept: (String) -> Unit,
    onDeliver: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(
        modifier.managementSheet(maxWidth = 460.dp, maxHeight = 400.dp).a11yPane("nav.jobs"),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        UiStrings.t("nav.jobs"),
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.semantics { heading() },
                    )
                    if (unlocked && refreshTicksLeft > 0) {
                        Text(buildString { append("Board refreshes in "); append((formatRushSeconds(refreshTicksLeft)).toString()); append("s") },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                    if (unlocked && failStreak > 0) {
                        Text(
                            buildString {
                                append(UiStrings.t("a11y.failStreak", mapOf("count" to failStreak)))
                                if (failStreak >= failStreakThreshold) append(" · board pressure on")
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = if (failStreak >= failStreakThreshold) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            modifier = Modifier.semantics {
                                contentDescription = UiStrings.t("a11y.failStreak", mapOf("count" to failStreak))
                            },
                        )
                    }
                }
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(UiStrings.t("common.close"))
                }
            }
            if (!unlocked) {
                Text(lockedReason ?: "Locked", color = MaterialTheme.colorScheme.error)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (active.isNotEmpty()) {
                        item { Text(UiStrings.t("common.active"), fontWeight = FontWeight.SemiBold) }
                        items(active, key = { it.contractId }) { job ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(job.name, fontWeight = FontWeight.SemiBold)
                                    if (job.standing) {
                                        Text(buildString { append("Standing · streak "); append((job.standingStreak).toString()) },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                        )
                                    }
                                    if (job.chainId != null) {
                                        Text(buildString { append("Chain step "); append((job.chainStep).toString()); append("/"); append((job.chainLength).toString()) },
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                        )
                                    }
                                    Text(buildString { append((job.delivered).toString()); append("/"); append((job.quantity).toString()); append(" "); append((job.itemName).toString()); append(" · "); append((formatRushSeconds(job.ticksRemaining)).toString()); append("s left") },
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    Text(buildString { append("Pay "); append((formatCoins(job.payout)).toString()); append(" · fail −"); append((formatCoins(job.penalty)).toString()) },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.secondary,
                                    )
                                }
                                Button(
                                    onClick = { onDeliver(job.contractId) },
                                    enabled = job.deliverEnabled,
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text(UiStrings.t("common.deliver")) }
                            }
                        }
                    }
                    item { Text(UiStrings.t("contracts.board"), fontWeight = FontWeight.SemiBold) }
                    if (offers.isEmpty()) {
                        item { Text(UiStrings.t("contracts.noOffers"), style = MaterialTheme.typography.bodySmall) }
                    }
                    items(offers, key = { it.offerId }) { offer ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(offer.name, fontWeight = FontWeight.SemiBold)
                                if (offer.standing) {
                                    Text(
                                        if (offer.standingStreak > 0) "Standing · streak ${offer.standingStreak}" else "Standing",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                    )
                                }
                                if (offer.chainId != null) {
                                    Text(buildString { append("Delivery chain · "); append((offer.chainLength).toString()); append(" steps") },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                    )
                                }
                                offer.requiresReputationBand?.let { band ->
                                    Text(buildString { append("Needs reputation band "); append((band).toString()); append("+") },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                    )
                                }
                                Text(offer.description, style = MaterialTheme.typography.bodySmall)
                                Text(buildString { append((offer.quantity).toString()); append("× "); append((offer.itemName).toString()); append(" · "); append((formatRushSeconds(offer.durationTicks)).toString()); append("s") },
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Text(buildString { append("+"); append((formatCoins(offer.payout)).toString()); append(" / −"); append((formatCoins(offer.penalty)).toString()) },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                                offer.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                            }
                            Button(
                                onClick = { onAccept(offer.offerId) },
                                enabled = offer.acceptEnabled,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(UiStrings.t("common.accept")) }
                        }
                    }
                }
            }
        }
    }
}
