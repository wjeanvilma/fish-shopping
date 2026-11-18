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
internal fun SpeciesBookPanel(
    book: SpeciesBookView,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    var filter by remember { mutableStateOf("all") }
    var selectedId by remember { mutableStateOf<String?>(null) }
    val selected = book.entries.firstOrNull { it.speciesId == selectedId }
    Surface(
        modifier
            .managementSheet(maxWidth = 440.dp, maxHeight = 520.dp)
            .a11yPane(if (selected != null) "codex.detail" else "panels.codex"),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            if (selected != null) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        selected.name,
                        style = MaterialTheme.typography.titleLarge,
                        modifier = Modifier.weight(1f).semantics { heading() },
                    )
                    TextButton(onClick = { selectedId = null }, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text(UiStrings.t("common.back"))
                    }
                }
                Text(
                    buildString {
                        append(selected.family)
                        append(" · ")
                        append(selected.rarityBand)
                        if (selected.discovered) append(" · base ${formatCoins(selected.baseValue)}")
                    },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                )
                Spacer(Modifier.height(8.dp))
                if (selected.discovered) {
                    selected.lore?.let {
                        Text(it, style = MaterialTheme.typography.bodyMedium)
                        Spacer(Modifier.height(6.dp))
                    }
                    selected.journalTip?.let {
                        Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                        Spacer(Modifier.height(6.dp))
                    }
                    Text(
                        buildString {
                            append("Mastery Lv ${selected.masteryLevel}")
                            val toNext = selected.masteryXpToNext
                            if (toNext != null) append(" · ${selected.masteryXp} XP · $toNext to next")
                            else append(" · ${selected.masteryXp} XP · max")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                    )
                    Spacer(Modifier.height(6.dp))
                    Text(
                        buildString {
                            append("${selected.catches} caught")
                            if (selected.catchValueEstimate > 0) {
                                append(" · ~${formatCoins(selected.catchValueEstimate)} dock value")
                            }
                            selected.trophyBestSizePermille?.let { size ->
                                append(" · best $size%")
                                selected.trophyBestValueCoins?.let { append(" · ${formatCoins(it)}") }
                            }
                        },
                        style = Tabular,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                    )
                    if (selected.harborNames.isNotEmpty()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            buildString {
                                append("Harbors: ")
                                append(selected.harborNames.joinToString(" · "))
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                        )
                    }
                    if (selected.recipeNames.isNotEmpty()) {
                        Spacer(Modifier.height(6.dp))
                        Text(
                            buildString {
                                append("Recipes: ")
                                append(selected.recipeNames.joinToString(" · "))
                            },
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                        )
                    }
                    if (selected.baseSpeciesId != null) {
                        Spacer(Modifier.height(6.dp))
                        Text(UiStrings.t("codex.rareForm"), style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.primary)
                    }
                } else {
                    Text(UiStrings.t("codex.notDiscovered"), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f))
                    selected.habitatHint?.let {
                        Spacer(Modifier.height(6.dp))
                        Text(UiStrings.t("bag.hintLine", mapOf("hint" to it)), style = MaterialTheme.typography.bodyMedium)
                    }
                }
                return@Column
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    UiStrings.t("panels.codex"),
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f).semantics { heading() },
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("common.close")) }
            }
            Text(buildString { append((book.discovered).toString()); append("/"); append((book.total).toString()); append(" discovered") },
                style = Tabular,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
            )
            Spacer(Modifier.height(8.dp))
            FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                listOf("all", "logged", "hidden").forEach { f ->
                    val label = when (f) {
                        "logged" -> "Logged"
                        "hidden" -> "Hidden"
                        else -> "All"
                    }
                    OutlinedButton(
                        onClick = { filter = f },
                        modifier = Modifier.heightIn(min = 40.dp),
                    ) { Text(if (filter == f) "· $label" else label) }
                }
                book.families.forEach { fam ->
                    OutlinedButton(
                        onClick = { filter = fam },
                        modifier = Modifier.heightIn(min = 40.dp),
                    ) { Text(if (filter == fam) "· $fam" else fam) }
                }
            }
            Spacer(Modifier.height(8.dp))
            if (book.empty) {
                Text(UiStrings.t("codex.empty"),
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                )
                Spacer(Modifier.height(8.dp))
            }
            val filtered = book.entries.filter { entry ->
                when (filter) {
                    "all" -> true
                    "logged" -> entry.discovered
                    "hidden" -> !entry.discovered
                    else -> entry.family == filter
                }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(filtered, key = { it.speciesId }) { entry ->
                    Row(
                        verticalAlignment = Alignment.Top,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { selectedId = entry.speciesId }
                            .padding(vertical = 2.dp),
                    ) {
                        Column(Modifier.weight(1f)) {
                            Text(entry.name, fontWeight = FontWeight.SemiBold)
                            if (entry.discovered) {
                                Text(buildString { append((entry.catches).toString()); append(" caught · "); append((entry.rarityBand).toString()) },
                                    style = Tabular,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                )
                                entry.lore?.let {
                                    Text(
                                        it,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.65f),
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            } else {
                                Text(buildString { append("Not discovered · "); append((entry.family).toString()) },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f),
                                )
                                entry.habitatHint?.let {
                                    Text(UiStrings.t("bag.hintLine", mapOf("hint" to it)),
                                        style = MaterialTheme.typography.bodySmall,
                                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f),
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                        Text(
                            if (entry.discovered) "Open" else "—",
                            style = Tabular,
                            color = if (entry.discovered) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f),
                        )
                    }
                }
            }
        }
    }
}
