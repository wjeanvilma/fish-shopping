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
internal fun StationCard(
    card: ContextCard,
    stations: List<com.willio.jeanvilma.fishshopping.core.sim.StationView>,
    shapeCues: Boolean,
    onOpen: () -> Unit,
    onCycleRecipe: (() -> Unit)?,
    modifier: Modifier,
) {
    val station = card.stationId?.let { id -> stations.firstOrNull { it.stationId == id } }
    val shape = if (shapeCues && station != null) {
        com.willio.jeanvilma.fishshopping.ui.statusShapeGlyph(
            com.willio.jeanvilma.fishshopping.ui.statusShapeFor(station.status),
        )
    } else {
        null
    }
    Surface(
        modifier.widthIn(min = 220.dp, max = 320.dp).clickable(onClick = onOpen),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(
                if (shape != null) "$shape ${card.title}" else card.title,
                fontWeight = FontWeight.Bold,
            )
            if (shapeCues && station != null) {
                Text(buildString { append((com.willio.jeanvilma.fishshopping.ui.statusShapeGlyph(com.willio.jeanvilma.fishshopping.ui.statusShapeFor(station.status))).toString()); append(" "); append((station.statusText).toString()) },
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.75f),
                )
            }
            card.lines.forEach { Text(it, style = Tabular) }
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(progress = { it.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = MaterialTheme.colorScheme.primary)
            }
            if (onCycleRecipe != null && card.recipeModeLabel != null) {
                Spacer(Modifier.height(8.dp))
                Button(onClick = onCycleRecipe, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text(UiStrings.t("hud.recipeLabel", mapOf("label" to (card.recipeModeLabel ?: ""))))
                }
            }
        }
    }
}

@Composable
internal fun TimingMeter(
    progress01: Float,
    goodStart: Float,
    goodEnd: Float,
    perfectStart: Float,
    perfectEnd: Float,
    tier: String?,
    modifier: Modifier = Modifier,
    /** Finish 5.0 Phase 4 — cast strike band overlay (0..1 of cast duration). */
    strikeStart: Float? = null,
    strikeEnd: Float? = null,
) {
    val scheme = MaterialTheme.colorScheme
    val border = when (tier) {
        "perfect" -> scheme.secondary
        "good" -> scheme.primary
        else -> scheme.onSurface.copy(alpha = 0.25f)
    }
    val goodBand = scheme.primary.copy(alpha = 0.45f)
    val perfectBand = scheme.secondary.copy(alpha = 0.7f)
    val strikeBand = scheme.tertiary.copy(alpha = 0.28f)
    val needle = scheme.onSurface
    androidx.compose.foundation.Canvas(
        modifier = modifier.background(scheme.onSurface.copy(alpha = 0.18f), RoundedCornerShape(999.dp)),
    ) {
        val w = size.width
        val h = size.height
        if (strikeStart != null && strikeEnd != null) {
            val strikeL = strikeStart.coerceIn(0f, 1f) * w
            val strikeR = strikeEnd.coerceIn(0f, 1f) * w
            drawRect(
                color = strikeBand,
                topLeft = androidx.compose.ui.geometry.Offset(strikeL, 0f),
                size = androidx.compose.ui.geometry.Size((strikeR - strikeL).coerceAtLeast(0f), h),
            )
        }
        val goodL = goodStart.coerceIn(0f, 1f) * w
        val goodR = goodEnd.coerceIn(0f, 1f) * w
        val perfectL = perfectStart.coerceIn(0f, 1f) * w
        val perfectR = perfectEnd.coerceIn(0f, 1f) * w
        drawRect(
            color = goodBand,
            topLeft = androidx.compose.ui.geometry.Offset(goodL, 0f),
            size = androidx.compose.ui.geometry.Size((goodR - goodL).coerceAtLeast(0f), h),
        )
        drawRect(
            color = perfectBand,
            topLeft = androidx.compose.ui.geometry.Offset(perfectL, 0f),
            size = androidx.compose.ui.geometry.Size((perfectR - perfectL).coerceAtLeast(0f), h),
        )
        val needleX = progress01.coerceIn(0f, 1f) * w
        drawRect(
            color = needle,
            topLeft = androidx.compose.ui.geometry.Offset(needleX - 1.5f, -2f),
            size = androidx.compose.ui.geometry.Size(3f, h + 4f),
        )
        drawRoundRect(
            color = border,
            topLeft = androidx.compose.ui.geometry.Offset.Zero,
            size = size,
            cornerRadius = androidx.compose.ui.geometry.CornerRadius(h / 2f, h / 2f),
            style = androidx.compose.ui.graphics.drawscope.Stroke(width = 2.dp.toPx()),
        )
    }
}

@Composable
internal fun CarryIndicator(v: SimView, onOpen: () -> Unit, modifier: Modifier) {
    Surface(
        modifier.widthIn(min = 140.dp).clickable(onClick = onOpen),
        shape = PanelShape,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(UiStrings.t("hud.bagFill", mapOf("used" to v.bagUsedUnits, "cap" to v.bagCapacityUnits)), fontWeight = FontWeight.Bold, style = Tabular)
            if (v.bag.isEmpty()) Text(UiStrings.t("common.empty"), color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
            v.bag.forEach { Text(UiStrings.t("hud.bagItemRow", mapOf("count" to it.count, "name" to it.name)), style = Tabular) }
        }
    }
}

@Composable
internal fun MessageTicker(vm: GameViewModel) {
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(vm) {
        vm.messages.collect {
            if (vm.settingsCaptionsEnabled()) message = it
        }
    }
    LaunchedEffect(message) {
        if (message != null) {
            delay(1800)
            message = null
        }
    }
    if (!vm.settingsCaptionsEnabled()) return
    message?.let {
        Box(Modifier.fillMaxSize().safeDrawingPadding().padding(top = 120.dp), contentAlignment = Alignment.TopCenter) {
            Pill(background = MaterialTheme.colorScheme.onSurface) { Text(it, color = Color.White) }
        }
    }
}
