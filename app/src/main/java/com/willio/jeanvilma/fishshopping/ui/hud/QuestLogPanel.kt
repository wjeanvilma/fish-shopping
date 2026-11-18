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
internal fun QuestLogPanel(
    quests: List<QuestView>,
    prestigeUnlocked: Boolean,
    prestigeLockedReason: String?,
    harborRating: Int,
    prestige: List<PrestigeView>,
    unlockedCosmetics: List<String>,
    seasonalEvent: SeasonalEventBannerView?,
    bank: BankView,
    coins: Long,
    decorOffers: List<DecorOfferView>,
    cosmeticIapOffers: List<CosmeticIapOfferView>,
    decorPatienceBonusTicks: Int,
    trophySets: List<TrophySetView>,
    trophiesCount: Int,
    speciesDiscovered: Int,
    speciesTotal: Int,
    onOpenSpeciesBook: () -> Unit,
    onPurchaseDecor: (String) -> Unit,
    onPurchaseIapCosmetic: (String) -> Unit,
    onRestorePurchases: () -> Unit,
    equippedCosmeticId: String?,
    previewCosmeticId: String?,
    onEquipCosmetic: (String) -> Unit,
    onUnequipCosmetic: () -> Unit,
    onPreviewCosmetic: (String) -> Unit,
    onClearPreview: () -> Unit,
    onTakeLoan: (String?) -> Unit,
    onRepayLoan: () -> Unit,
    onSetCoinGoal: (Long) -> Unit,
    dailyLoginStreak: Int,
    dailyGoals: List<DailyGoalView>,
    onClaimDailyGoal: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(
        modifier.managementSheet(maxHeight = 480.dp).a11yPane("nav.goals"),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    UiStrings.t("nav.goals"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text(UiStrings.t("common.close"))
                }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(UiStrings.t("a11y.dailyGoalsSection"), fontWeight = FontWeight.SemiBold)
                            Text(
                                if (dailyLoginStreak > 0) {
                                    "Login streak: $dailyLoginStreak day${if (dailyLoginStreak == 1) "" else "s"}"
                                } else {
                                    "Open each day to build a streak"
                                },
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        Text(
                            if (dailyLoginStreak > 0) "$dailyLoginStreak" else "—",
                            style = Tabular,
                        )
                    }
                }
                if (dailyGoals.isEmpty()) {
                    item {
                        Text(UiStrings.t("goals.syncClock"),
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                        )
                    }
                } else {
                    items(dailyGoals, key = { it.objectiveId }) { g ->
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(g.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                when {
                                    g.claimed -> Text(UiStrings.t("common.claimed"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                                    g.claimEnabled -> Button(
                                        onClick = { onClaimDailyGoal(g.objectiveId) },
                                        modifier = Modifier.heightIn(min = 48.dp),
                                    ) { Text(UiStrings.t("common.claim")) }
                                    else -> Text(buildString { append((g.progress).toString()); append("/"); append((g.target).toString()) }, style = Tabular)
                                }
                            }
                            Text(g.description, style = MaterialTheme.typography.bodySmall)
                            Text(
                                buildString {
                                    append("Reward: ")
                                    append(formatCoins(g.rewardCoins))
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                            if (!g.claimed) {
                                LinearProgressIndicator(
                                    progress = {
                                        (g.progress.toFloat() / g.target.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)
                                    },
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                )
                            }
                        }
                    }
                }
                seasonalEvent?.let { event ->
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(event.name, fontWeight = FontWeight.SemiBold)
                                Text(event.description, style = MaterialTheme.typography.bodySmall)
                                Text(
                                    buildString {
                                        append("${formatRushSeconds(event.ticksRemaining)}s left")
                                        event.banner?.let { append(" · $it") }
                                        append(" · Crowd ×${"%.2f".format(event.customerSpawnMultPermille / 1000.0)}")
                                        append(" · Prices ×${"%.2f".format(event.priceMultPermille / 1000.0)}")
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                            }
                            Text(UiStrings.t("quest.event"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                        }
                    }
                }
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.semantics {
                            contentDescription = UiStrings.t("a11y.bankSection")
                        },
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(UiStrings.t("bank.title"), fontWeight = FontWeight.SemiBold)
                            if (!bank.unlocked) {
                                Text(
                                    bank.lockedReason ?: "Locked",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.error,
                                )
                            } else if (bank.loanOwed > 0L) {
                                Text(
                                    buildString {
                                        append("Owed ${formatCoins(bank.loanOwed)}")
                                        if (bank.loanOverdue) append(" · overdue (auto-collect)")
                                        else append(" · due in ${formatRushSeconds(bank.loanDueTicksLeft)}s")
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Button(
                                    onClick = onRepayLoan,
                                    enabled = bank.canRepayLoan,
                                    modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp),
                                ) {
                                    Text(buildString { append("Repay · up to "); append((formatCoins(minOf(coins, bank.loanOwed))).toString()) })
                                }
                            } else {
                                val products = bank.loanProducts.ifEmpty {
                                    listOf(
                                        com.willio.jeanvilma.fishshopping.core.sim.BankLoanProductView(
                                            id = "loan.legacy",
                                            name = "Pier loan",
                                            description = "",
                                            principal = bank.loanPrincipal,
                                            repayAmount = bank.repayAmount,
                                            termTicks = bank.termTicks,
                                            unlocked = bank.canTakeLoan,
                                            lockedReason = null,
                                            canTake = bank.canTakeLoan,
                                        ),
                                    )
                                }
                                products.forEach { product ->
                                    Text(
                                        buildString {
                                            append(product.name)
                                            append(" · borrow ")
                                            append(formatCoins(product.principal))
                                            append(" · repay ")
                                            append(formatCoins(product.repayAmount))
                                            append(" in ")
                                            append(formatRushSeconds(product.termTicks))
                                            append("s")
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        modifier = Modifier.padding(top = 4.dp),
                                    )
                                    product.lockedReason?.let { reason ->
                                        Text(
                                            reason,
                                            style = MaterialTheme.typography.bodySmall,
                                            color = MaterialTheme.colorScheme.error,
                                        )
                                    }
                                    Button(
                                        onClick = { onTakeLoan(product.id) },
                                        enabled = product.canTake,
                                        modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp),
                                    ) {
                                        Text(buildString {
                                            append("Take ")
                                            append(product.name)
                                            append(" · ")
                                            append(formatCoins(product.principal))
                                        })
                                    }
                                }
                            }
                        }
                        Text(UiStrings.t("bank.section"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                    }
                }
                item {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(UiStrings.t("bank.coinGoal"), fontWeight = FontWeight.SemiBold)
                                Text(
                                    when {
                                        bank.coinGoal <= 0L -> "Pick a savings target"
                                        bank.coinGoalCelebrated -> "Reached ${formatCoins(bank.coinGoal)}"
                                        else -> "${formatCoins(coins)} / ${formatCoins(bank.coinGoal)}"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            Text(UiStrings.t("quest.goal"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                        }
                        if (bank.coinGoal > 0L && !bank.coinGoalCelebrated) {
                            LinearProgressIndicator(
                                progress = {
                                    (coins.toFloat() / bank.coinGoal.coerceAtLeast(1L).toFloat()).coerceIn(0f, 1f)
                                },
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                            )
                        }
                        Row(
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            modifier = Modifier.padding(top = 6.dp),
                        ) {
                            bank.goalPresets.forEach { amount ->
                                val selected = bank.coinGoal == amount
                                TextButton(
                                    onClick = { onSetCoinGoal(amount) },
                                    modifier = Modifier.heightIn(min = 40.dp),
                                ) {
                                    Text(
                                        formatCoins(amount),
                                        color = if (selected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                }
                            }
                            if (bank.coinGoal > 0L) {
                                TextButton(
                                    onClick = { onSetCoinGoal(0L) },
                                    modifier = Modifier.heightIn(min = 40.dp),
                                ) { Text(UiStrings.t("common.clear")) }
                            }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(UiStrings.t("panels.codex"), fontWeight = FontWeight.SemiBold)
                            Text(buildString { append((speciesDiscovered).toString()); append("/"); append((speciesTotal).toString()); append(" discovered") },
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Button(
                                onClick = onOpenSpeciesBook,
                                modifier = Modifier.heightIn(min = 48.dp).padding(top = 4.dp),
                            ) { Text(UiStrings.t("codex.openJournal")) }
                        }
                        Text(buildString { append((speciesDiscovered).toString()); append("/"); append((speciesTotal).toString()) }, style = Tabular)
                    }
                }
                item {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier.semantics {
                            contentDescription = UiStrings.t("a11y.trophySection")
                        },
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(UiStrings.t("trophy.title"), fontWeight = FontWeight.SemiBold)
                            Text(buildString { append((trophiesCount).toString()); append(" species mounted") }, style = MaterialTheme.typography.bodySmall)
                        }
                        Text(buildString { append((trophiesCount).toString()) }, style = Tabular)
                    }
                }
                items(trophySets, key = { it.id }) { set ->
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(set.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text(
                                if (set.completed) "Done" else "${set.mounted}/${set.total}",
                                style = Tabular,
                                color = if (set.completed) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
                            )
                        }
                        Text(set.description, style = MaterialTheme.typography.bodySmall)
                        LinearProgressIndicator(
                            progress = {
                                (set.mounted.toFloat() / set.total.coerceAtLeast(1).toFloat()).coerceIn(0f, 1f)
                            },
                            modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                        )
                    }
                }
                items(quests, key = { it.id }) { q ->
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(q.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text(
                                when (q.status) {
                                    "completed" -> "Done"
                                    "locked" -> "Locked"
                                    else -> "${q.progress}/${q.goalAtLeast}"
                                },
                                style = Tabular,
                                color = when (q.status) {
                                    "completed" -> MaterialTheme.colorScheme.primary
                                    "locked" -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                    else -> MaterialTheme.colorScheme.onSurface
                                },
                            )
                        }
                        Text(q.description, style = MaterialTheme.typography.bodySmall)
                        if (q.status == "active") {
                            LinearProgressIndicator(
                                progress = { (q.progress.toFloat() / q.goalAtLeast.toFloat()).coerceIn(0f, 1f) },
                                modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                            )
                        }
                        q.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                        val rewardBits = buildList {
                            if (q.rewardCoins > 0) add("${formatCoins(q.rewardCoins)} coins")
                            addAll(q.rewardUnlockNames.map { "Unlock $it" })
                        }
                        if (rewardBits.isNotEmpty()) {
                            Text(
                                UiStrings.t("goals.reward", mapOf("bits" to rewardBits.joinToString(" · "))),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                        }
                    }
                }
                item {
                    Text(UiStrings.t("prestige.title"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (!prestigeUnlocked) {
                        Text(
                            prestigeLockedReason ?: "Locked",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.error,
                        )
                    } else {
                        Text(
                            buildString {
                                append("Harbor rating ")
                                append(UiStrings.t("hud.star").repeat(harborRating.coerceIn(0, 5)))
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.secondary,
                        )
                        if (unlockedCosmetics.isNotEmpty()) {
                            Text(
                                buildString {
                                    append("Banners: ")
                                    append(unlockedCosmetics.joinToString(" · "))
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                        }
                    }
                }
                item {
                    Column(
                        modifier = Modifier.semantics {
                            contentDescription = UiStrings.t("a11y.decorSection")
                        },
                    ) {
                        Text(UiStrings.t("decor.title"), style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                        Text(
                            buildString {
                                append("Placable cosmetics")
                                if (decorPatienceBonusTicks > 0) append(" · +$decorPatienceBonusTicks customer patience")
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                        )
                    }
                }
                items(decorOffers, key = { it.id }) { d ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(d.name, fontWeight = FontWeight.SemiBold)
                            Text(d.description, style = MaterialTheme.typography.bodySmall)
                            Text(buildString { append("+"); append((d.patienceBonusTicks).toString()); append(" patience · "); append((formatCoins(d.cost)).toString()); append(" coins") },
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.secondary,
                            )
                            d.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                        }
                        if (d.status == "owned") {
                            Text(UiStrings.t("common.owned"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                        } else {
                            Button(
                                onClick = { onPurchaseDecor(d.id) },
                                enabled = d.canAfford,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(UiStrings.t("common.buy")) }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(UiStrings.t("cosmetics.title"), fontWeight = FontWeight.SemiBold)
                            Text(UiStrings.t("cosmetics.iapHint"),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            Text(UiStrings.t("cosmetics.hint"),
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                            )
                            TextButton(
                                onClick = onRestorePurchases,
                                modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp),
                            ) { Text(UiStrings.t("settings.restorePurchases")) }
                        }
                        Text(UiStrings.t("cosmetics.iap"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                    }
                }
                items(cosmeticIapOffers, key = { it.id }) { c ->
                    val owned = c.status == "owned"
                    val equipped = equippedCosmeticId == c.grantsCosmetic
                    val previewing = previewCosmeticId == c.grantsCosmetic
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(c.title, fontWeight = FontWeight.SemiBold)
                                Text(c.description, style = MaterialTheme.typography.bodySmall)
                                if (equipped) {
                                    Text(UiStrings.t("common.equipped"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                                } else if (previewing) {
                                    Text(UiStrings.t("common.preview"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                                }
                            }
                            Text(
                                if (owned) "Owned" else "IAP",
                                style = Tabular,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    if (previewing) onClearPreview() else onPreviewCosmetic(c.grantsCosmetic)
                                },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(if (previewing) "Clear preview" else "Preview") }
                            if (owned) {
                                Button(
                                    onClick = {
                                        if (equipped) onUnequipCosmetic() else onEquipCosmetic(c.grantsCosmetic)
                                    },
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text(if (equipped) "Unequip" else "Equip") }
                            } else {
                                Button(
                                    onClick = { onPurchaseIapCosmetic(c.sku) },
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text(UiStrings.t("common.buy")) }
                            }
                        }
                    }
                }
                items(
                    unlockedCosmetics.filter { id -> cosmeticIapOffers.none { it.grantsCosmetic == id } },
                    key = { it },
                ) { id ->
                    val equipped = equippedCosmeticId == id
                    val previewing = previewCosmeticId == id
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(CosmeticPresentation.titleFor(id), fontWeight = FontWeight.SemiBold)
                                Text(UiStrings.t("cosmetics.unlockedBanner"),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                )
                                if (equipped) {
                                    Text(UiStrings.t("common.equipped"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                                } else if (previewing) {
                                    Text(UiStrings.t("common.preview"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.secondary)
                                }
                            }
                            Text(UiStrings.t("common.owned"), style = Tabular, color = MaterialTheme.colorScheme.primary)
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(
                                onClick = {
                                    if (previewing) onClearPreview() else onPreviewCosmetic(id)
                                },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(if (previewing) "Clear preview" else "Preview") }
                            Button(
                                onClick = {
                                    if (equipped) onUnequipCosmetic() else onEquipCosmetic(id)
                                },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text(if (equipped) "Unequip" else "Equip") }
                        }
                    }
                }
                if (prestigeUnlocked) {
                    items(prestige, key = { it.id }) { p ->
                        Column {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text(p.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                                Text(
                                    when (p.status) {
                                        "completed" -> "Done"
                                        "locked" -> "Locked"
                                        else -> "${p.progress}/${p.goalAtLeast}"
                                    },
                                    style = Tabular,
                                    color = when (p.status) {
                                        "completed" -> MaterialTheme.colorScheme.primary
                                        "locked" -> MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f)
                                        else -> MaterialTheme.colorScheme.onSurface
                                    },
                                )
                            }
                            Text(p.description, style = MaterialTheme.typography.bodySmall)
                            if (p.status == "active") {
                                LinearProgressIndicator(
                                    progress = { (p.progress.toFloat() / p.goalAtLeast.toFloat()).coerceIn(0f, 1f) },
                                    modifier = Modifier.fillMaxWidth().padding(top = 4.dp),
                                )
                            }
                            p.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.error) }
                            val rewardBits = prestigeRewardBits(p)
                            if (rewardBits.isNotEmpty()) {
                                Text(
                                    UiStrings.t("goals.reward", mapOf("bits" to rewardBits.joinToString(" · "))),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.secondary,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
