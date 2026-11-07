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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.store.LicensesNotice
import com.willio.jeanvilma.fishshopping.core.store.StoreListing
import com.willio.jeanvilma.fishshopping.core.sim.ContextCard
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
import com.willio.jeanvilma.fishshopping.ui.theme.Action
import com.willio.jeanvilma.fishshopping.ui.theme.Danger
import com.willio.jeanvilma.fishshopping.ui.theme.Ink
import com.willio.jeanvilma.fishshopping.ui.theme.OnAction
import com.willio.jeanvilma.fishshopping.ui.theme.PanelSurface
import com.willio.jeanvilma.fishshopping.ui.theme.Reward
import kotlinx.coroutines.delay

private val PanelShape = RoundedCornerShape(16.dp)
private val Tabular = TextStyle(fontFeatureSettings = "tnum")

/** Portrait-friendly sheet sizing: prefers ~94% width, caps at [maxWidth]/[maxHeight]. */
private fun Modifier.managementSheet(
    maxWidth: Dp = 440.dp,
    maxHeight: Dp = 480.dp,
): Modifier = fillMaxWidth(0.94f).widthIn(max = maxWidth).heightIn(max = maxHeight)

/** The harbor is the home screen; management panels open over it (blueprint "Navigation rules"). */
@Composable
fun GameScreen(vm: GameViewModel) {
    val ui by vm.ui.collectAsState()
    val sceneAsset = when (val s = ui) {
        is GameUiState.Ready -> "models/${s.view.blockoutAsset}"
        else -> vm.latestView?.let { "models/${it.blockoutAsset}" } ?: "models/sunrise_pier_blockout.glb"
    }
    Box(Modifier.fillMaxSize().background(Color(0xFF9FD3EA))) {
        HarborView(
            viewProvider = { vm.latestView },
            transferProvider = {
                val cues = vm.drainFlyingTransfers()
                if (vm.settingsReducedMotion()) emptyList() else cues
            },
            burstProvider = {
                val cues = vm.drainWorldBursts()
                if (vm.settingsReducedMotion()) emptyList() else cues
            },
            shakeProvider = {
                val cues = vm.drainShakes()
                if (vm.settingsReducedMotion()) emptyList() else cues
            },
            qualityProvider = { vm.renderQuality() },
            reducedMotionProvider = { vm.settingsReducedMotion() },
            modifier = Modifier.fillMaxSize(),
            sceneAsset = sceneAsset,
        )
        when (val s = ui) {
            GameUiState.Loading -> CenterCard {
                CircularProgressIndicator(color = Action)
                Spacer(Modifier.height(12.dp))
                Text("Loading harbor...")
            }
            is GameUiState.Failed -> CenterCard {
                Text("Something went wrong", style = MaterialTheme.typography.titleMedium, color = Danger)
                Spacer(Modifier.height(8.dp))
                Text(s.message)
            }
            is GameUiState.Title -> TitleScreen(s, vm)
            is GameUiState.Ready -> Hud(s, vm)
        }
        MessageTicker(vm)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun Hud(state: GameUiState.Ready, vm: GameViewModel) {
    val tutorialStepId = state.view.objective?.tutorialStepId
    var tutorialDwellMs by remember(tutorialStepId) { mutableStateOf(0L) }
    LaunchedEffect(tutorialStepId) {
        tutorialDwellMs = 0L
        if (tutorialStepId == null) return@LaunchedEffect
        val started = System.currentTimeMillis()
        while (true) {
            delay(500)
            tutorialDwellMs = System.currentTimeMillis() - started
        }
    }
    val frictionNudge = TutorialFriction.nudgeText(tutorialStepId, tutorialDwellMs)
    val v = state.view
    val focus = remember { FocusRequester() }
    val keys = remember { mutableStateListOf<Key>() }
    var harborSize by remember { mutableStateOf(IntSize.Zero) }
    var harborOrigin by remember { mutableStateOf(Offset.Zero) }
    var tapZoneOrigin by remember { mutableStateOf(Offset.Zero) }
    val settings = state.settings
    var previewCosmeticId by remember { mutableStateOf<String?>(null) }
    val unlockedCosmeticSet = remember(v.unlockedCosmetics) { v.unlockedCosmetics.toSet() }
    val equippedCosmeticId = CosmeticPresentation.sanitizeEquipped(
        settings.equippedCosmeticId,
        unlockedCosmeticSet,
    )
    LaunchedEffect(equippedCosmeticId, settings.equippedCosmeticId) {
        if (equippedCosmeticId != settings.equippedCosmeticId) {
            vm.updateSettings(equippedCosmeticId = equippedCosmeticId)
        }
    }
    val visibleCosmeticId = CosmeticPresentation.resolveVisible(
        equippedCosmeticId,
        previewCosmeticId,
        unlockedCosmeticSet,
    )
    val anyPanel = state.offlineReport != null || state.pauseOpen || state.settingsOpen
        || state.bagOpen || state.stationOpen || state.upgradesOpen || state.staffOpen
        || state.questsOpen || state.contractsOpen || state.mapOpen || state.warehouseOpen
        || state.speciesBookOpen || state.dashboardOpen

    BackHandler {
        when {
            state.offlineReport != null -> vm.dismissOfflineReport()
            state.pauseOpen -> vm.setPauseOpen(false)
            state.settingsOpen -> vm.setSettingsOpen(false)
            state.bagOpen -> vm.setBagOpen(false)
            state.stationOpen -> vm.setStationOpen(false)
            state.upgradesOpen -> vm.setUpgradesOpen(false)
            state.staffOpen -> vm.setStaffOpen(false)
            state.questsOpen -> vm.setQuestsOpen(false)
            state.contractsOpen -> vm.setContractsOpen(false)
            state.mapOpen -> vm.setMapOpen(false)
            state.warehouseOpen -> vm.setWarehouseOpen(false)
            state.speciesBookOpen -> vm.setSpeciesBookOpen(false)
            state.dashboardOpen -> vm.setDashboardOpen(false)
            else -> vm.setPauseOpen(true)
        }
    }
    LaunchedEffect(Unit) { focus.requestFocus() }

    val hudScale = settings.hudTextScale.coerceIn(1f, 1.3f)
    val scaledTypography = MaterialTheme.typography.copy(
        bodyLarge = MaterialTheme.typography.bodyLarge.copy(
            fontSize = MaterialTheme.typography.bodyLarge.fontSize * hudScale,
        ),
        bodyMedium = MaterialTheme.typography.bodyMedium.copy(
            fontSize = MaterialTheme.typography.bodyMedium.fontSize * hudScale,
        ),
        bodySmall = MaterialTheme.typography.bodySmall.copy(
            fontSize = MaterialTheme.typography.bodySmall.fontSize * hudScale,
        ),
        titleLarge = MaterialTheme.typography.titleLarge.copy(
            fontSize = MaterialTheme.typography.titleLarge.fontSize * hudScale,
        ),
        titleMedium = MaterialTheme.typography.titleMedium.copy(
            fontSize = MaterialTheme.typography.titleMedium.fontSize * hudScale,
        ),
        labelLarge = MaterialTheme.typography.labelLarge.copy(
            fontSize = MaterialTheme.typography.labelLarge.fontSize * hudScale,
        ),
    )

    MaterialTheme(colorScheme = MaterialTheme.colorScheme, typography = scaledTypography) {
    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned {
                harborSize = IntSize(it.size.width, it.size.height)
                harborOrigin = it.positionInRoot()
            },
    ) {
    BoxWithConstraints(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(16.dp)
            .focusRequester(focus)
            .focusable()
            // Hardware keyboard (emulators, Chromebooks): WASD / arrows, like the web client.
            .onKeyEvent { e ->
                val k = e.key
                if (e.type == KeyEventType.KeyDown && (k == Key.Spacebar || k == Key.F) && e.nativeKeyEvent.repeatCount == 0) {
                    vm.reel()
                    return@onKeyEvent true
                }
                if (e.type == KeyEventType.KeyDown && k == Key.I && e.nativeKeyEvent.repeatCount == 0) {
                    vm.setWarehouseOpen(!state.warehouseOpen)
                    return@onKeyEvent true
                }
                if (e.type == KeyEventType.KeyDown && k == Key.B && e.nativeKeyEvent.repeatCount == 0) {
                    vm.setSpeciesBookOpen(!state.speciesBookOpen)
                    return@onKeyEvent true
                }
                if (e.type == KeyEventType.KeyDown && k == Key.Y && e.nativeKeyEvent.repeatCount == 0) {
                    vm.setDashboardOpen(!state.dashboardOpen)
                    return@onKeyEvent true
                }
                if (k !in MOVE_KEYS) return@onKeyEvent false
                if (e.type == KeyEventType.KeyDown && k !in keys) keys += k
                if (e.type == KeyEventType.KeyUp) keys -= k
                val x = (if (keys.any { it == Key.D || it == Key.DirectionRight }) 1f else 0f) -
                    (if (keys.any { it == Key.A || it == Key.DirectionLeft }) 1f else 0f)
                val y = (if (keys.any { it == Key.S || it == Key.DirectionDown }) 1f else 0f) -
                    (if (keys.any { it == Key.W || it == Key.DirectionUp }) 1f else 0f)
                vm.setMove(x, y)
                true
            },
    ) {
        val portrait = maxWidth < maxHeight
        // Phase 20: always meet design-token minTouchTargetDp (48).
        val actionMinHeight = 48.dp
        val stickWidthFraction = if (portrait) 0.56f else 0.42f
        val stickHeightFraction = if (portrait) 0.36f else 0.48f
        val harborMetaMax = if (portrait) maxWidth * 0.46f else maxWidth * 0.42f
        val actionsMax = if (portrait) maxWidth * 0.50f else maxWidth * 0.52f
        // Tap-to-move zone opposite the stick so it does not fight the floating pad.
        if (settings.tapToMove && !anyPanel) {
            val tapAlign = if (settings.joystickSide == JoystickSide.LEFT) {
                Alignment.CenterEnd
            } else {
                Alignment.CenterStart
            }
            Box(
                Modifier
                    .align(tapAlign)
                    .fillMaxWidth(0.55f)
                    .fillMaxHeight()
                    .onGloballyPositioned { tapZoneOrigin = it.positionInRoot() }
                    .pointerInput(v.player.xMm, v.player.zMm, harborSize, tapZoneOrigin, harborOrigin) {
                        detectTapGestures { local ->
                            val w = harborSize.width.coerceAtLeast(1)
                            val h = harborSize.height.coerceAtLeast(1)
                            val x = (tapZoneOrigin.x - harborOrigin.x) + local.x
                            val y = (tapZoneOrigin.y - harborOrigin.y) + local.y
                            val ndcX = (2f * x / w) - 1f
                            val ndcY = 1f - (2f * y / h)
                            val hit = CameraRig.groundFromNdc(
                                ndcX, ndcY, w.toFloat() / h.toFloat(),
                                v.player.xMm, v.player.zMm,
                            ) ?: return@detectTapGestures
                            vm.setTapMove(hit.first, hit.second)
                        }
                    },
            )
        }
        // Top left: current harbor + rating stars (prestige-lite).
        Pill(Modifier.align(Alignment.TopStart).widthIn(max = harborMetaMax)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                Text(
                    v.harborName,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
                if (!portrait) {
                    v.harborSpecializationName?.let { spec ->
                        Text(
                            "· $spec",
                            style = Tabular,
                            fontWeight = FontWeight.SemiBold,
                            color = Ink.copy(alpha = 0.78f),
                            maxLines = 1,
                        )
                    }
                }
                if (v.harborRating > 0) {
                    Text(
                        "★".repeat(v.harborRating),
                        style = Tabular,
                        color = Reward,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(
                    "· Rep ${v.reputationScorePermille / 10}%",
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = Ink.copy(alpha = 0.78f),
                    maxLines = 1,
                )
                if (!portrait) {
                    Text(
                        "· ${v.dayPartName}" +
                            (if (v.tideChartOwned) " · tides" else "") +
                            (if (v.preferredBaitId != null) " · bait set" else ""),
                        style = Tabular,
                        fontWeight = FontWeight.SemiBold,
                        color = Ink.copy(alpha = 0.72f),
                        maxLines = 1,
                    )
                }
            }
        }
        // Top centre: coins.
        Pill(Modifier.align(Alignment.TopCenter), background = Reward) {
            Text("${formatCoins(v.coins)} coins", style = Tabular, fontWeight = FontWeight.Bold, color = Ink)
        }
        v.rush?.let { rush ->
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 52.dp),
                background = Action,
            ) {
                Text(
                    "${rush.name} · ${formatRushSeconds(rush.ticksRemaining)}s",
                    style = Tabular,
                    fontWeight = FontWeight.Bold,
                    color = OnAction,
                )
            }
        }
        v.seasonalEvent?.let { seasonal ->
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = if (v.rush != null) 96.dp else 52.dp),
                background = Color(0xFF1A6B6B),
            ) {
                Text(
                    "${seasonal.name} · ${formatRushSeconds(seasonal.ticksRemaining)}s",
                    style = Tabular,
                    fontWeight = FontWeight.Bold,
                    color = Color(0xFFF4FFFE),
                )
            }
        }
        visibleCosmeticId?.let { cosmeticId ->
            val bannerTop = when {
                v.rush != null && v.seasonalEvent != null -> 140.dp
                v.rush != null || v.seasonalEvent != null -> 96.dp
                else -> 52.dp
            }
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = bannerTop),
                background = Color(0xFF4A3A2A),
            ) {
                val label = if (previewCosmeticId != null) "Preview" else "Banner"
                Text(
                    "$label · ${CosmeticPresentation.titleFor(cosmeticId)}",
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFFFF6EA),
                )
            }
        }
        if (v.supervisorOnDuty) {
            val supervisorTop = when {
                visibleCosmeticId != null && v.rush != null && v.seasonalEvent != null -> 184.dp
                visibleCosmeticId != null && (v.rush != null || v.seasonalEvent != null) -> 140.dp
                visibleCosmeticId != null -> 96.dp
                v.rush != null && v.seasonalEvent != null -> 140.dp
                v.rush != null || v.seasonalEvent != null -> 96.dp
                else -> 52.dp
            }
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = supervisorTop),
                background = PanelSurface,
            ) {
                Text("Supervisor on duty", style = Tabular, fontWeight = FontWeight.SemiBold, color = Ink)
            }
        }
        if (state.settings.showBalanceStrip) {
            val rates = v.telemetryRates
            val stripTop = when {
                v.supervisorOnDuty && v.rush != null && v.seasonalEvent != null -> 184.dp
                v.supervisorOnDuty && (v.rush != null || v.seasonalEvent != null) -> 140.dp
                v.supervisorOnDuty || (v.rush != null && v.seasonalEvent != null) -> 96.dp
                v.rush != null || v.seasonalEvent != null -> 96.dp
                else -> 52.dp
            }
            val topName = rates.topSpecies.firstOrNull()?.let {
                " · Top ${it.name} ${it.sharePermille / 10}%"
            }.orEmpty()
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = stripTop),
                background = Color(0xFF2A3A4A),
            ) {
                Text(
                    "Abandon ${rates.abandonPermille / 10}% · Wage ${rates.wageRatioPermille / 10}%$topName",
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFE8F0F8),
                )
            }
        }
        // Top right: management (wraps in portrait — Phase 28).
        FlowRow(
            Modifier
                .align(Alignment.TopEnd)
                .widthIn(max = actionsMax),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Button(onClick = { vm.setPauseOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Pause")
            }
            Button(onClick = { vm.setMapOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Map")
            }
            Button(onClick = { vm.setWarehouseOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Warehouse")
            }
            Button(onClick = { vm.setQuestsOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Goals")
            }
            Button(onClick = { vm.setContractsOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Jobs")
            }
            Button(onClick = { vm.setStaffOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Staff")
            }
            Button(onClick = { vm.setDashboardOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Dash")
            }
            Button(onClick = { vm.setUpgradesOpen(true) }, modifier = Modifier.heightIn(min = actionMinHeight)) {
                Text("Upgrades")
            }
        }
        // Coaching: mid-left in landscape; above the stick in portrait (Phase 28).
        v.objective?.let { obj ->
            val objectiveAlign = if (portrait) Alignment.BottomStart else Alignment.CenterStart
            val objectiveMod = if (portrait) {
                Modifier
                    .align(objectiveAlign)
                    .fillMaxWidth()
                    .padding(bottom = maxHeight * stickHeightFraction + 8.dp)
            } else {
                Modifier.align(objectiveAlign).widthIn(max = 220.dp)
            }
            Surface(
                objectiveMod,
                shape = PanelShape, color = PanelSurface.copy(alpha = 0.92f),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(obj.eyebrow, style = MaterialTheme.typography.labelSmall, color = Action)
                        obj.detail?.let {
                            Text(it, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                        }
                    }
                    Text(obj.text, fontWeight = FontWeight.Medium)
                    frictionNudge?.let { tip ->
                        Spacer(Modifier.height(6.dp))
                        Text(tip, style = MaterialTheme.typography.labelSmall, color = Color.Gray)
                    }
                }
            }
        }
        // Floating joystick pad on the chosen side (appears under the finger).
        val stickAlign = if (settings.joystickSide == JoystickSide.LEFT) {
            Alignment.BottomStart
        } else {
            Alignment.BottomEnd
        }
        Joystick(
            onMove = vm::setMove,
            diameter = (GameSettings.BASE_DIAMETER_DP * settings.joystickScale).dp,
            modifier = Modifier
                .align(stickAlign)
                .fillMaxWidth(stickWidthFraction)
                .fillMaxHeight(stickHeightFraction),
        )
        // Phase 20: HUD tap-to-move tip (never a world texture).
        if (settings.tapToMove && !anyPanel) {
            val tipAlign = if (settings.joystickSide == JoystickSide.LEFT) {
                Alignment.BottomEnd
            } else {
                Alignment.BottomStart
            }
            Surface(
                Modifier
                    .align(tipAlign)
                    .padding(12.dp),
                shape = PanelShape,
                color = PanelSurface.copy(alpha = 0.92f),
            ) {
                Text(
                    ControlQa.tapToMoveHint(),
                    Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
                    style = MaterialTheme.typography.labelMedium,
                )
            }
        }
        // Bottom centre: station card, only in range.
        v.context?.let { card ->
            StationCard(
                card,
                stations = v.stations,
                shapeCues = settings.shapeCues,
                onOpen = { vm.setStationOpen(true) },
                onCycleRecipe = card.stationId?.let { id -> { vm.cycleStationRecipe(id) } },
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .then(if (portrait) Modifier.fillMaxWidth(0.92f) else Modifier),
            )
        }
        if (v.fishingCanReel) {
            Column(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = if (portrait) maxHeight * stickHeightFraction else 120.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                if (settings.timingAssist) {
                    TimingMeter(
                        progress01 = v.fishingProgress ?: 0f,
                        goodStart = v.timingGoodStart01,
                        goodEnd = v.timingGoodEnd01,
                        perfectStart = v.timingPerfectStart01,
                        perfectEnd = v.timingPerfectEnd01,
                        tier = v.fishingTimingTier,
                        modifier = Modifier
                            .padding(bottom = 8.dp)
                            .widthIn(min = 180.dp, max = 240.dp)
                            .fillMaxWidth(0.55f)
                            .height(14.dp),
                    )
                }
                Button(
                    onClick = vm::reel,
                    modifier = Modifier.heightIn(min = actionMinHeight),
                    enabled = true,
                ) {
                    val prefix = when {
                        settings.shapeCues && v.fishingTimingTier == "perfect" -> "★ "
                        settings.shapeCues && v.fishingTimingTier == "good" -> "● "
                        else -> ""
                    }
                    Text(
                        prefix + when (v.fishingTimingTier) {
                            "perfect" -> "Perfect!"
                            "good" -> "Good!"
                            else -> if (v.fishingTimingWindow) "Reel!" else "Reel"
                        },
                    )
                }
            }
        }
        // Bottom right: carry indicator.
        CarryIndicator(v, onOpen = { vm.setBagOpen(true) }, modifier = Modifier.align(Alignment.BottomEnd))

        if (state.upgradesOpen) {
            UpgradePanel(
                upgrades = v.upgrades,
                coins = v.coins,
                onBuy = vm::purchase,
                onClose = { vm.setUpgradesOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.staffOpen) {
            StaffPanel(
                staff = v.staff,
                workers = v.workers,
                staffGear = v.staffGear,
                automationIssues = v.automationIssues,
                onShiftCount = v.onShiftCount,
                freeOnShiftSlots = v.freeOnShiftSlots,
                overtimeOnShiftCount = v.overtimeOnShiftCount,
                wagePerWorkerPerHour = v.workerWagePerWorkerPerHour,
                maintenanceCoinsPerStation = v.maintenanceCoinsPerStation,
                economyUnlocked = v.economyUnlocked,
                bagFishSpoilActive = v.bagFishSpoilActive,
                coins = v.coins,
                onOpenDashboard = { vm.setDashboardOpen(true) },
                onHire = vm::hire,
                onSetShift = vm::setWorkerShift,
                onAssignGear = vm::assignWorkerGear,
                onUnequipGear = vm::unequipWorkerGear,
                onClose = { vm.setStaffOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.dashboardOpen) {
            BusinessDashboardPanel(
                dash = v.businessDashboard,
                onClose = { vm.setDashboardOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.questsOpen) {
            QuestLogPanel(
                quests = v.quests,
                prestigeUnlocked = v.prestigeUnlocked,
                prestigeLockedReason = v.prestigeLockedReason,
                harborRating = v.harborRating,
                prestige = v.prestige,
                unlockedCosmetics = v.unlockedCosmetics,
                seasonalEvent = v.seasonalEvent,
                bank = v.bank,
                coins = v.coins,
                decorOffers = v.decorOffers,
                cosmeticIapOffers = v.cosmeticIapOffers,
                decorPatienceBonusTicks = v.decorPatienceBonusTicks,
                trophySets = v.trophySets,
                trophiesCount = v.trophies.size,
                speciesDiscovered = v.speciesBook.discovered,
                speciesTotal = v.speciesBook.total,
                onOpenSpeciesBook = { vm.setSpeciesBookOpen(true) },
                onPurchaseDecor = vm::purchaseDecor,
                onPurchaseIapCosmetic = vm::purchaseIapCosmetic,
                onRestorePurchases = vm::restorePurchases,
                equippedCosmeticId = equippedCosmeticId,
                previewCosmeticId = previewCosmeticId,
                onEquipCosmetic = { id ->
                    previewCosmeticId = null
                    vm.updateSettings(equippedCosmeticId = id)
                },
                onUnequipCosmetic = { vm.updateSettings(equippedCosmeticId = null) },
                onPreviewCosmetic = { id -> previewCosmeticId = id },
                onClearPreview = { previewCosmeticId = null },
                onTakeLoan = vm::takeLoan,
                onRepayLoan = vm::repayLoan,
                onSetCoinGoal = vm::setCoinGoal,
                onClose = {
                    previewCosmeticId = null
                    vm.setQuestsOpen(false)
                },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.speciesBookOpen) {
            SpeciesBookPanel(
                book = v.speciesBook,
                onClose = { vm.setSpeciesBookOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.contractsOpen) {
            ContractsPanel(
                unlocked = v.contractsUnlocked,
                lockedReason = v.contractsLockedReason,
                offers = v.contractOffers,
                active = v.activeContracts,
                refreshTicksLeft = v.contractRefreshTicksLeft,
                onAccept = vm::acceptContract,
                onDeliver = vm::deliverContract,
                onClose = { vm.setContractsOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.mapOpen) {
            HarborMapPanel(
                harbors = v.harbors,
                fullHarborUnlock = v.fullHarborUnlock,
                onTravel = vm::travelToHarbor,
                onUnlockAll = vm::purchaseFullHarborUnlock,
                onRestoreUnlock = vm::restoreFullHarborUnlock,
                onClose = { vm.setMapOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.warehouseOpen) {
            WarehousePanel(
                warehouse = v.warehouse,
                onClose = { vm.setWarehouseOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
    }
        if (state.pauseOpen) {
            OverlayScrim(onDismiss = { vm.setPauseOpen(false) }) {
                PausePanel(
                    onResume = { vm.setPauseOpen(false) },
                    onSettings = { vm.setSettingsOpen(true) },
                    onTitle = vm::returnToTitle,
                )
            }
        }
        if (state.settingsOpen) {
            OverlayScrim(onDismiss = { vm.setSettingsOpen(false) }) {
                SettingsPanel(
                    settings = state.settings,
                    cloudAvailable = vm.cloudAvailable(),
                    saveStatus = vm.saveStatus(),
                    onMuted = { vm.updateSettings(muted = it) },
                    onMusicVolume = { vm.updateSettings(musicVolume = it) },
                    onSfxVolume = { vm.updateSettings(sfxVolume = it) },
                    onHaptics = { vm.updateSettings(hapticsEnabled = it) },
                    onQuality = { vm.updateSettings(quality = it) },
                    onJoystickSide = { vm.updateSettings(joystickSide = it) },
                    onJoystickScale = { vm.updateSettings(joystickScale = it) },
                    onTapToMove = { vm.updateSettings(tapToMove = it) },
                    onCloudSync = { vm.updateSettings(cloudSyncEnabled = it) },
                    onAnalyticsConsent = { vm.setAnalyticsConsent(it) },
                    onBalanceStrip = { vm.updateSettings(showBalanceStrip = it) },
                    onReducedMotion = { vm.updateSettings(reducedMotion = it) },
                    onCaptions = { vm.updateSettings(captionsEnabled = it) },
                    onHudTextScale = { vm.updateSettings(hudTextScale = it) },
                    onShapeCues = { vm.updateSettings(shapeCues = it) },
                    onTimingAssist = { vm.updateSettings(timingAssist = it) },
                    onAccessibilityPreset = { vm.applyAccessibilityPreset() },
                    telemetryRates = v.telemetryRates,
                    analyticsAlertActive = vm.hasAnalyticsDashboardAlerts(),
                    onExportTelemetry = { vm.exportTelemetryJson() },
                    onExportBalance = { vm.exportBalanceJson() },
                    onExportAnalyticsDashboard = { vm.exportAnalyticsDashboardJson() },
                    onClose = { vm.setSettingsOpen(false) },
                )
            }
        }
        if (state.bagOpen) {
            OverlayScrim(onDismiss = { vm.setBagOpen(false) }) {
                BagDetailPanel(
                    v = v,
                    onSelectBait = vm::selectBait,
                    onClose = { vm.setBagOpen(false) },
                )
            }
        }
        val stationCard = v.context
        if (state.stationOpen && v.baitOffers.isNotEmpty()) {
            OverlayScrim(onDismiss = { vm.setStationOpen(false) }) {
                BaitKioskPanel(
                    offers = v.baitOffers,
                    preferredBaitId = v.preferredBaitId,
                    coins = v.coins,
                    onBuy = vm::buyBait,
                    onSelect = vm::selectBait,
                    onClose = { vm.setStationOpen(false) },
                )
            }
        } else if (state.stationOpen && stationCard != null) {
            OverlayScrim(onDismiss = { vm.setStationOpen(false) }) {
                StationDetailPanel(
                    card = stationCard,
                    stations = v.stations,
                    coins = v.coins,
                    onCycleRecipe = stationCard.stationId?.let { id -> { vm.cycleStationRecipe(id) } },
                    onSetPaused = vm::setMachinePaused,
                    onRepair = vm::repairMachine,
                    onBuildPlot = stationCard.plotId?.let { { vm.buildPlot(it) } },
                    onClose = { vm.setStationOpen(false) },
                )
            }
        }
        state.offlineReport?.let { report ->
            OfflineSummaryPanel(
                report = report,
                onContinue = vm::dismissOfflineReport,
                modifier = Modifier.align(Alignment.Center),
            )
        }
    }
    }
}

private val MOVE_KEYS = setOf(
    Key.W, Key.A, Key.S, Key.D, Key.DirectionUp, Key.DirectionDown, Key.DirectionLeft, Key.DirectionRight,
)

@Composable
private fun StationCard(
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
        color = PanelSurface.copy(alpha = 0.95f),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(
                if (shape != null) "$shape ${card.title}" else card.title,
                fontWeight = FontWeight.Bold,
            )
            if (shapeCues && station != null) {
                Text(
                    "${com.willio.jeanvilma.fishshopping.ui.statusShapeGlyph(com.willio.jeanvilma.fishshopping.ui.statusShapeFor(station.status))} ${station.statusText}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Ink.copy(alpha = 0.75f),
                )
            }
            card.lines.forEach { Text(it, style = Tabular) }
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(progress = { it.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = Action)
            }
            if (onCycleRecipe != null && card.recipeModeLabel != null) {
                Spacer(Modifier.height(8.dp))
                Button(onClick = onCycleRecipe, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                    Text("Recipe: ${card.recipeModeLabel}")
                }
            }
        }
    }
}

@Composable
private fun TimingMeter(
    progress01: Float,
    goodStart: Float,
    goodEnd: Float,
    perfectStart: Float,
    perfectEnd: Float,
    tier: String?,
    modifier: Modifier = Modifier,
) {
    val border = when (tier) {
        "perfect" -> Reward
        "good" -> Action
        else -> Ink.copy(alpha = 0.25f)
    }
    androidx.compose.foundation.Canvas(
        modifier = modifier.background(Ink.copy(alpha = 0.18f), RoundedCornerShape(999.dp)),
    ) {
        val w = size.width
        val h = size.height
        val goodL = goodStart.coerceIn(0f, 1f) * w
        val goodR = goodEnd.coerceIn(0f, 1f) * w
        val perfectL = perfectStart.coerceIn(0f, 1f) * w
        val perfectR = perfectEnd.coerceIn(0f, 1f) * w
        drawRect(
            color = Action.copy(alpha = 0.45f),
            topLeft = androidx.compose.ui.geometry.Offset(goodL, 0f),
            size = androidx.compose.ui.geometry.Size((goodR - goodL).coerceAtLeast(0f), h),
        )
        drawRect(
            color = Reward.copy(alpha = 0.7f),
            topLeft = androidx.compose.ui.geometry.Offset(perfectL, 0f),
            size = androidx.compose.ui.geometry.Size((perfectR - perfectL).coerceAtLeast(0f), h),
        )
        val needleX = progress01.coerceIn(0f, 1f) * w
        drawRect(
            color = Ink,
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
private fun CarryIndicator(v: SimView, onOpen: () -> Unit, modifier: Modifier) {
    Surface(
        modifier.widthIn(min = 140.dp).clickable(onClick = onOpen),
        shape = PanelShape,
        color = PanelSurface.copy(alpha = 0.92f),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text("Bag ${v.bagUsedUnits}/${v.bagCapacityUnits}", fontWeight = FontWeight.Bold, style = Tabular)
            if (v.bag.isEmpty()) Text("Empty", color = Ink.copy(alpha = 0.6f))
            v.bag.forEach { Text("${it.count} x ${it.name}", style = Tabular) }
        }
    }
}

@Composable
private fun TitleScreen(state: GameUiState.Title, vm: GameViewModel) {
    var confirmNew by remember { mutableStateOf(false) }
    val conflict = state.cloudConflict
    val recovery = state.localRecovery
    when {
        conflict != null -> CloudConflictPanel(conflict, vm)
        recovery != null -> LocalRecoveryPanel(recovery, vm)
        !state.settings.analyticsConsentDecided -> CenterCard {
            Column(Modifier.widthIn(min = 280.dp, max = 400.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Image(
                    painter = painterResource(id = R.drawable.ic_brand_mark),
                    contentDescription = null,
                    modifier = Modifier.size(72.dp),
                )
                Spacer(Modifier.height(12.dp))
                Text("Fish Shopping", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Help improve the game with privacy-safe analytics?",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                )
                Spacer(Modifier.height(8.dp))
                Text(
                    "Events cover tutorial steps, first sale, harbor unlocks, offline claims, save recovery, and frame timing. No account ids, positions, bag contents, or full saves are ever sent. You can change this later in Settings.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Ink.copy(alpha = 0.7f),
                )
                Spacer(Modifier.height(16.dp))
                Button(
                    onClick = { vm.setAnalyticsConsent(true) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                ) { Text("Allow analytics") }
                Spacer(Modifier.height(8.dp))
                OutlinedButton(
                    onClick = { vm.setAnalyticsConsent(false) },
                    modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                ) { Text("No thanks") }
            }
        }
        else -> CenterCard {
            Column(Modifier.widthIn(min = 280.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                Image(
                    painter = painterResource(id = R.drawable.ic_brand_mark),
                    contentDescription = null,
                    modifier = Modifier.size(72.dp),
                )
                Spacer(Modifier.height(12.dp))
                Text("Fish Shopping", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
                Spacer(Modifier.height(6.dp))
                Text(
                    "Catch, cut, sell — run your harbor market",
                    style = MaterialTheme.typography.bodyMedium,
                    color = Color.Gray,
                )
                Spacer(Modifier.height(16.dp))
                if (state.hasSave) {
                    Button(
                        onClick = vm::continueGame,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) { Text("Continue") }
                    Spacer(Modifier.height(8.dp))
                    OutlinedButton(
                        onClick = { confirmNew = true },
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) { Text("New Game") }
                } else {
                    Button(
                        onClick = vm::newGame,
                        modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                    ) { Text("Play") }
                    Spacer(Modifier.height(10.dp))
                    Text(
                        "First session: fish → cut → stock → sell",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.Gray,
                    )
                }
            }
        }
    }
    if (confirmNew && conflict == null && recovery == null) {
        AlertDialog(
            onDismissRequest = { confirmNew = false },
            title = { Text("New Game") },
            text = { Text("Start a new game? Your saved harbor will be erased.") },
            confirmButton = {
                TextButton(onClick = {
                    confirmNew = false
                    vm.newGame()
                }) { Text("New Game") }
            },
            dismissButton = {
                TextButton(onClick = { confirmNew = false }) { Text("Cancel") }
            },
        )
    }
}

@Composable
private fun CloudConflictPanel(conflict: CloudConflictView, vm: GameViewModel) {
    CenterCard {
        Column(Modifier.widthIn(min = 300.dp, max = 420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Choose a save", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                "This device and the cloud both have valid saves that differ (${conflict.reason}).",
                style = MaterialTheme.typography.bodyMedium,
                color = Ink.copy(alpha = 0.75f),
            )
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
                    if (conflict.recommended == SyncSource.REMOTE) "Use cloud (recommended)"
                    else "Use this device (recommended)",
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
                    if (conflict.recommended == SyncSource.REMOTE) "Use this device instead"
                    else "Use cloud instead",
                )
            }
        }
    }
}

@Composable
private fun LocalRecoveryPanel(recovery: LocalRecoveryView, vm: GameViewModel) {
    CenterCard {
        Column(Modifier.widthIn(min = 300.dp, max = 420.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text("Recover save", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(recovery.reason, style = MaterialTheme.typography.bodyMedium, color = Ink.copy(alpha = 0.75f))
            SnapshotChoiceCard(recovery.previous)
            Button(
                onClick = vm::confirmLocalRecovery,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text("Recover previous backup") }
            OutlinedButton(
                onClick = vm::dismissLocalRecovery,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text("Cancel") }
        }
    }
}

@Composable
private fun SnapshotChoiceCard(row: SnapshotChoiceRow) {
    Surface(
        Modifier.fillMaxWidth(),
        shape = PanelShape,
        color = if (row.recommended) Action.copy(alpha = 0.12f) else PanelSurface.copy(alpha = 0.9f),
    ) {
        Column(Modifier.padding(12.dp), verticalArrangement = Arrangement.spacedBy(2.dp)) {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(row.sourceLabel, fontWeight = FontWeight.Bold)
                if (row.recommended) {
                    Text("Recommended", style = MaterialTheme.typography.bodySmall, color = Action)
                }
            }
            Text(row.harborName, style = Tabular)
            Text("${formatCoins(row.coins)} coins · ${row.playtimeLabel} play", style = Tabular)
            Text(row.savedAtLabel, style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = 0.7f))
        }
    }
}

@Composable
private fun OverlayScrim(onDismiss: () -> Unit, content: @Composable () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    Box(Modifier.fillMaxSize()) {
        Box(
            Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable(interactionSource = interaction, indication = null, onClick = onDismiss),
        )
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun rememberSheetClicks(): Modifier {
    val interaction = remember { MutableInteractionSource() }
    return Modifier.clickable(interactionSource = interaction, indication = null, onClick = {})
}

@Composable
private fun PausePanel(onResume: () -> Unit, onSettings: () -> Unit, onTitle: () -> Unit) {
    Surface(
        Modifier.widthIn(min = 280.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("Paused", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Button(onClick = onResume, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Resume") }
            Button(onClick = onSettings, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Settings") }
            OutlinedButton(onClick = onTitle, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) { Text("Title") }
        }
    }
}

@Composable
private fun SettingsPanel(
    settings: GameSettings,
    cloudAvailable: Boolean,
    saveStatus: com.willio.jeanvilma.fishshopping.persistence.SaveStatusView,
    onMuted: (Boolean) -> Unit,
    onMusicVolume: (Float) -> Unit,
    onSfxVolume: (Float) -> Unit,
    onHaptics: (Boolean) -> Unit,
    onQuality: (QualityPreset) -> Unit,
    onJoystickSide: (JoystickSide) -> Unit,
    onJoystickScale: (Float) -> Unit,
    onTapToMove: (Boolean) -> Unit,
    onCloudSync: (Boolean) -> Unit,
    onAnalyticsConsent: (Boolean) -> Unit,
    onBalanceStrip: (Boolean) -> Unit,
    onReducedMotion: (Boolean) -> Unit,
    onCaptions: (Boolean) -> Unit,
    onHudTextScale: (Float) -> Unit,
    onShapeCues: (Boolean) -> Unit,
    onTimingAssist: (Boolean) -> Unit,
    onAccessibilityPreset: () -> Unit,
    telemetryRates: com.willio.jeanvilma.fishshopping.core.sim.TelemetryRatesView,
    analyticsAlertActive: Boolean,
    onExportTelemetry: () -> String?,
    onExportBalance: () -> String?,
    onExportAnalyticsDashboard: () -> String,
    onClose: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var exportNote by remember { mutableStateOf<String?>(null) }
    var showLicenses by remember { mutableStateOf(false) }
    if (showLicenses) {
        LicensesPanel(onClose = { showLicenses = false })
        return
    }
    Surface(
        Modifier.managementSheet(maxWidth = 400.dp, maxHeight = 520.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Settings", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Mute", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Master silence for music beds and stingers. Haptics stay independent.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.muted, onCheckedChange = onMuted)
            }
            Text("Music")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.VOLUME_OPTIONS.forEach { step ->
                    val label = when (step) {
                        0f -> "Off"
                        0.35f -> "Low"
                        0.7f -> "Med"
                        else -> "High"
                    }
                    val selected = settings.musicVolume == step
                    if (selected) {
                        Button(onClick = { onMusicVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onMusicVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Text("SFX")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.VOLUME_OPTIONS.forEach { step ->
                    val label = when (step) {
                        0f -> "Off"
                        0.35f -> "Low"
                        0.7f -> "Med"
                        else -> "High"
                    }
                    val selected = settings.sfxVolume == step
                    if (selected) {
                        Button(onClick = { onSfxVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onSfxVolume(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Haptics", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Short vibration on catch and sale.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.hapticsEnabled, onCheckedChange = onHaptics)
            }
            Text("Quality")
            Text(
                "Targets ~30 FPS on mid-tier Android. Soft-downgrades if frames stay over budget.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                QualityPreset.entries.forEach { preset ->
                    val label = when (preset) {
                        QualityPreset.LOW -> "Low"
                        QualityPreset.MEDIUM -> "Medium"
                        QualityPreset.HIGH -> "High"
                    }
                    val selected = settings.quality == preset
                    if (selected) {
                        Button(
                            onClick = { onQuality(preset) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(label) }
                    } else {
                        OutlinedButton(
                            onClick = { onQuality(preset) },
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(label) }
                    }
                }
            }
            Text("Joystick side")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                JoystickSide.entries.forEach { side ->
                    val label = if (side == JoystickSide.LEFT) "Left" else "Right"
                    val selected = settings.joystickSide == side
                    if (selected) {
                        Button(onClick = { onJoystickSide(side) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onJoystickSide(side) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Text("Joystick size")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.SCALE_OPTIONS.forEach { scale ->
                    val label = when (scale) {
                        0.75f -> "S"
                        1.25f -> "L"
                        else -> "M"
                    }
                    val selected = settings.joystickScale == scale
                    if (selected) {
                        Button(onClick = { onJoystickScale(scale) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onJoystickScale(scale) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Tap to move", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Tap the harbor to walk there. Stick and keys still work.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.tapToMove, onCheckedChange = onTapToMove)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        if (saveStatus.cloudPendingUpload) "Cloud sync · pending" else "Cloud sync",
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        buildString {
                            append(
                                if (cloudAvailable) {
                                    "Optional anonymous link. Newest checksummed save wins; local play works with this off."
                                } else {
                                    "Optional. Add fish.firebase.* to local.properties (see local.properties.example). Local saves still work offline."
                                },
                            )
                            if (saveStatus.cloudPendingUpload) {
                                append(" Pending upload will retry when online.")
                            }
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.cloudSyncEnabled, onCheckedChange = onCloudSync)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text(
                        if (settings.analyticsConsent && analyticsAlertActive) {
                            "Analytics · alert"
                        } else {
                            "Analytics"
                        },
                        fontWeight = FontWeight.SemiBold,
                    )
                    Text(
                        buildString {
                            append(
                                "Privacy-safe events only (tutorial, first sale, harbors, offline, save recovery, frame timing, sessions). Never includes account ids, bag contents, or full saves.",
                            )
                            if (settings.analyticsConsent && analyticsAlertActive) {
                                append(" Stability alert: crash-free session rate below 99%.")
                            }
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.analyticsConsent, onCheckedChange = onAnalyticsConsent)
            }
            OutlinedButton(
                onClick = onAccessibilityPreset,
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) {
                Text("Apply accessibility preset")
            }
            Text(
                "Reduced motion, captions, larger HUD text, shape status cues, and reel timing meter. Timing Sights / Master Reel upgrades still widen the sim window.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Reduced motion", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Snaps the camera follow and skips flying transfer VFX.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.reducedMotion, onCheckedChange = onReducedMotion)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Captions", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Toast text for sales, alerts, and other one-off feedback.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.captionsEnabled, onCheckedChange = onCaptions)
            }
            Text("HUD text size")
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GameSettings.HUD_TEXT_SCALE_OPTIONS.forEach { step ->
                    val label = when (step) {
                        1.15f -> "Med"
                        1.3f -> "Large"
                        else -> "Default"
                    }
                    val selected = settings.hudTextScale == step
                    if (selected) {
                        Button(onClick = { onHudTextScale(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    } else {
                        OutlinedButton(onClick = { onHudTextScale(step) }, modifier = Modifier.heightIn(min = 48.dp)) {
                            Text(label)
                        }
                    }
                }
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Shape cues", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Adds ▶ ■ ◆ glyphs beside station and reel status so colour is not the only signal.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.shapeCues, onCheckedChange = onShapeCues)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Timing meter", fontWeight = FontWeight.SemiBold)
                    Text(
                        "Shows Good / Perfect bands while casting. Buy Timing Sights or Master Reel to widen the window.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.timingAssist, onCheckedChange = onTimingAssist)
            }
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Balance strip", fontWeight = FontWeight.SemiBold)
                    Text(
                        "In-dev HUD rates: abandon, wage ratio, top catch share.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.showBalanceStrip, onCheckedChange = onBalanceStrip)
            }
            Text("Save status", fontWeight = FontWeight.SemiBold)
            Text(
                buildString {
                    append(if (saveStatus.persistent) "Local slots: latest + previous backup." else "Memory-only (storage unavailable).")
                    append(" ")
                    append(saveStatus.lastSavedLabel)
                    append(
                        when {
                            !saveStatus.cloudEnabled -> " · Cloud off"
                            !saveStatus.cloudAvailable -> " · Cloud on, keys missing"
                            saveStatus.cloudLinked && saveStatus.cloudPendingUpload ->
                                " · Cloud linked · pending upload"
                            saveStatus.cloudLinked -> " · Cloud linked"
                            else -> " · Cloud on, linking…"
                        },
                    )
                },
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Text("Controls", fontWeight = FontWeight.SemiBold)
            Text(
                ControlQa.controlsHelpLine(),
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Text("Telemetry", fontWeight = FontWeight.SemiBold)
            Text(
                "Privacy-safe counters (fish.telemetry.v2) and content balance knobs. Copied as JSON.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Text(
                buildString {
                    append("Abandon ${telemetryRates.abandonPermille / 10}%")
                    append(" · Wage ${telemetryRates.wageRatioPermille / 10}%")
                    val top = telemetryRates.topSpecies.firstOrNull()
                    if (top != null) append(" · Top ${top.name} ${top.sharePermille / 10}%")
                    else append(" · No catches yet")
                },
                style = MaterialTheme.typography.bodySmall,
                color = Reward,
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = {
                        val json = onExportTelemetry()
                        exportNote = if (json != null) {
                            copyTextToClipboard(context, "Fish Shopping telemetry", json)
                            "Play stats copied"
                        } else {
                            "Start a harbor to export play stats"
                        }
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text("Copy stats") }
                OutlinedButton(
                    onClick = {
                        val json = onExportBalance()
                        exportNote = if (json != null) {
                            copyTextToClipboard(context, "Fish Shopping balance", json)
                            "Balance knobs copied"
                        } else {
                            "Balance export unavailable"
                        }
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text("Copy balance") }
            }
            OutlinedButton(
                onClick = {
                    val json = onExportAnalyticsDashboard()
                    copyTextToClipboard(context, "Fish Shopping analytics dashboard", json)
                    exportNote = "Analytics dashboard copied"
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text("Copy analytics") }
            exportNote?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Action) }
            Text("Legal", fontWeight = FontWeight.SemiBold)
            Text(
                StoreListing.SHORT_DESCRIPTION,
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Text(
                com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.RESTORE_HELP_LINE,
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
            )
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Button(
                    onClick = { openHttpUrl(context, StoreListing.PRIVACY_POLICY_URL) },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) { Text("Privacy") }
                OutlinedButton(
                    onClick = {
                        openHttpUrl(
                            context,
                            com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.SUPPORT_RESTORE_URL,
                        )
                    },
                    modifier = Modifier.weight(1f).heightIn(min = 48.dp),
                ) {
                    Text(com.willio.jeanvilma.fishshopping.core.store.SupportRunbook.SETTINGS_SUPPORT_LABEL)
                }
            }
            OutlinedButton(
                onClick = { showLicenses = true },
                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
            ) { Text("Licenses") }
        }
    }
}

@Composable
private fun LicensesPanel(onClose: () -> Unit) {
    Surface(
        Modifier.managementSheet(maxWidth = 400.dp, maxHeight = 520.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    LicensesNotice.SCREEN_TITLE,
                    style = MaterialTheme.typography.titleLarge,
                    modifier = Modifier.weight(1f),
                )
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(
                modifier = Modifier.fillMaxWidth().heightIn(max = 420.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                item {
                    Text(
                        LicensesNotice.SCREEN_INTRO,
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.75f),
                    )
                }
                item {
                    Text("First-party assets", fontWeight = FontWeight.SemiBold)
                    Text(
                        "LicenseRef-FishShopping-Proprietary-Ship",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                items(LicensesNotice.OSS_NOTICES, key = { it.id }) { notice ->
                    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                        Text(notice.headline(), fontWeight = FontWeight.SemiBold)
                        Text(notice.notice, style = MaterialTheme.typography.bodySmall)
                        Text(
                            notice.url,
                            style = MaterialTheme.typography.bodySmall,
                            color = Action,
                        )
                    }
                }
            }
        }
    }
}

private fun openHttpUrl(context: android.content.Context, url: String) {
    runCatching {
        context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
    }
}

private fun copyTextToClipboard(context: android.content.Context, label: String, text: String) {
    val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
    clipboard.setPrimaryClip(android.content.ClipData.newPlainText(label, text))
}

@Composable
private fun BagDetailPanel(
    v: SimView,
    onSelectBait: (String?) -> Unit,
    onClose: () -> Unit,
) {
    Surface(
        Modifier.managementSheet(maxWidth = 400.dp, maxHeight = 360.dp).then(rememberSheetClicks()),
        shape = PanelShape,
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Bag", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Text("${v.bagUsedUnits}/${v.bagCapacityUnits}", style = Tabular)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            if (v.bagFishSpoilActive) {
                Text(
                    "Fish in your bag can spoil.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                )
            }
            if (v.preferredBaitId != null) {
                TextButton(onClick = { onSelectBait(null) }, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text("Use auto bait")
                }
            }
            Spacer(Modifier.height(8.dp))
            if (v.bag.isEmpty()) {
                Text("Empty", color = Ink.copy(alpha = 0.6f))
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(v.bag, key = { it.itemId }) { item ->
                        val bait = item.itemId.startsWith("bait.")
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(item.name, fontWeight = FontWeight.SemiBold)
                                if (bait && v.preferredBaitId == item.itemId) {
                                    Text("Preferred for casts", style = MaterialTheme.typography.bodySmall)
                                }
                            }
                            Text("${item.count}", style = Tabular)
                            if (bait && v.preferredBaitId != item.itemId) {
                                TextButton(
                                    onClick = { onSelectBait(item.itemId) },
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text("Prefer") }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BaitKioskPanel(
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
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Bait kiosk", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Text("${formatCoins(coins)} coins", style = Tabular)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Text(
                "Buy packs for rare bites. Prefer one for the next cast, or auto.",
                style = MaterialTheme.typography.bodySmall,
            )
            TextButton(
                onClick = { onSelect(null) },
                enabled = preferredBaitId != null,
                modifier = Modifier.heightIn(min = 48.dp),
            ) { Text("Auto bait") }
            Spacer(Modifier.height(8.dp))
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(offers, key = { it.id }) { offer ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(offer.name, fontWeight = FontWeight.SemiBold)
                            Text(offer.description, style = MaterialTheme.typography.bodySmall)
                            Text(
                                "Owned ${offer.ownedCount} · pack of ${offer.packQuantity}",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            if (offer.preferred) {
                                Text("Preferred", style = MaterialTheme.typography.bodySmall)
                            }
                            offer.reason?.let {
                                Text(it, style = MaterialTheme.typography.bodySmall, color = Danger)
                            }
                        }
                        if (offer.ownedCount > 0 && !offer.preferred) {
                            TextButton(
                                onClick = { onSelect(offer.id) },
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text("Prefer") }
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
private fun StationDetailPanel(
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
        color = PanelSurface,
        shadowElevation = 8.dp,
    ) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(card.title, style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
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
                    color = Danger,
                )
            }
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { it.coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth(),
                    color = Action,
                )
            }
            if (onCycleRecipe != null || card.stationId != null || onBuildPlot != null) {
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onCycleRecipe != null && card.recipeModeLabel != null) {
                        Button(
                            onClick = onCycleRecipe,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text("Recipe: ${card.recipeModeLabel}") }
                    }
                    card.stationId?.let { id ->
                        if (station?.needsRepair == true) {
                            Button(
                                onClick = { onRepair(id) },
                                enabled = coins >= station.repairCost,
                                modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                            ) { Text("Repair · ${formatCoins(station.repairCost)}") }
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
                        ) { Text("Build · ${formatCoins(plotCost)}") }
                    }
                }
            }
        }
    }
}

@Composable
private fun UpgradePanel(
    upgrades: List<UpgradeView>,
    coins: Long,
    onBuy: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxHeight = 320.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Upgrades", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Text("${formatCoins(coins)} coins", style = Tabular, color = Ink)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(upgrades, key = { it.id }) { u ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(u.name, fontWeight = FontWeight.SemiBold)
                            Text(u.description, style = MaterialTheme.typography.bodySmall)
                            // A disabled upgrade always explains the missing condition.
                            u.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                        }
                        when {
                            u.owned -> Text("Owned", color = Action, modifier = Modifier.padding(horizontal = 12.dp))
                            else -> Button(
                                onClick = { onBuy(u.id) },
                                enabled = u.purchasable,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text("${formatCoins(u.cost)}", style = Tabular) }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StaffPanel(
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
    onClose: () -> Unit,
    modifier: Modifier,
) {
    val freeGear = staffGear.filter { it.equippedOnWorkerId == null }
    Surface(modifier.managementSheet(maxHeight = 400.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Staff", style = MaterialTheme.typography.titleLarge)
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
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Text("${formatCoins(coins)} coins", style = Tabular, color = Ink)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Button(
                onClick = onOpenDashboard,
                modifier = Modifier.heightIn(min = 48.dp).padding(bottom = 8.dp),
            ) { Text("Business dashboard") }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                if (workers.isNotEmpty()) {
                    items(workers, key = { it.id }) { w ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("${w.roleName} · Lv ${w.level}", fontWeight = FontWeight.SemiBold)
                                Text(
                                    buildString {
                                        append(if (w.xpToNext == null) "Max level" else "${w.xpToNext} XP to next")
                                        if (w.traitNames.isNotEmpty()) {
                                            append(" · ")
                                            append(w.traitNames.joinToString(", "))
                                        }
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.7f),
                                )
                                w.blockedReason?.let {
                                    Text(it, style = MaterialTheme.typography.bodySmall, color = Danger)
                                }
                                w.equipment.forEach { eq ->
                                    TextButton(
                                        onClick = { onUnequipGear(w.id, eq.slotId) },
                                        modifier = Modifier.heightIn(min = 40.dp),
                                    ) { Text("${eq.slotName}: ${eq.upgradeName} ×") }
                                }
                                freeGear.forEach { g ->
                                    TextButton(
                                        onClick = { onAssignGear(w.id, g.upgradeId) },
                                        modifier = Modifier.heightIn(min = 40.dp),
                                    ) { Text("Equip ${g.slotName}") }
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
                            color = Ink.copy(alpha = 0.7f),
                        )
                    }
                }
                if (automationIssues.isNotEmpty()) {
                    items(automationIssues, key = { "${it.kind}:${it.id}" }) { issue ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(issue.label, fontWeight = FontWeight.SemiBold)
                                Text(issue.reason, style = MaterialTheme.typography.bodySmall, color = Danger)
                            }
                            Text(issue.kind, style = MaterialTheme.typography.bodySmall, color = Ink.copy(alpha = 0.7f))
                        }
                    }
                }
                items(staff, key = { it.roleId }) { row ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(row.name, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${row.roleKind} · ${row.hired}/${row.maxHired} hired",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            row.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                        }
                        Button(
                            onClick = { onHire(row.roleId) },
                            enabled = row.purchasable,
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text("${formatCoins(row.cost)}", style = Tabular) }
                    }
                }
            }
        }
    }
}

@Composable
private fun ContractsPanel(
    unlocked: Boolean,
    lockedReason: String?,
    offers: List<ContractOfferView>,
    active: List<ActiveContractView>,
    refreshTicksLeft: Int,
    onAccept: (String) -> Unit,
    onDeliver: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxWidth = 460.dp, maxHeight = 400.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Jobs", style = MaterialTheme.typography.titleLarge)
                    if (unlocked && refreshTicksLeft > 0) {
                        Text(
                            "Board refreshes in ${formatRushSeconds(refreshTicksLeft)}s",
                            style = MaterialTheme.typography.bodySmall,
                            color = Ink.copy(alpha = 0.7f),
                        )
                    }
                }
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            if (!unlocked) {
                Text(lockedReason ?: "Locked", color = Danger)
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    if (active.isNotEmpty()) {
                        item { Text("Active", fontWeight = FontWeight.SemiBold) }
                        items(active, key = { it.contractId }) { job ->
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Column(Modifier.weight(1f)) {
                                    Text(job.name, fontWeight = FontWeight.SemiBold)
                                    if (job.standing) {
                                        Text(
                                            "Standing · streak ${job.standingStreak}",
                                            style = MaterialTheme.typography.bodySmall,
                                            color = Ink.copy(alpha = 0.65f),
                                        )
                                    }
                                    Text(
                                        "${job.delivered}/${job.quantity} ${job.itemName} · ${formatRushSeconds(job.ticksRemaining)}s left",
                                        style = MaterialTheme.typography.bodySmall,
                                    )
                                    Text(
                                        "Pay ${formatCoins(job.payout)} · fail −${formatCoins(job.penalty)}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Reward,
                                    )
                                }
                                Button(
                                    onClick = { onDeliver(job.contractId) },
                                    enabled = job.deliverEnabled,
                                    modifier = Modifier.heightIn(min = 48.dp),
                                ) { Text("Deliver") }
                            }
                        }
                    }
                    item { Text("Board", fontWeight = FontWeight.SemiBold) }
                    if (offers.isEmpty()) {
                        item { Text("No offers right now", style = MaterialTheme.typography.bodySmall) }
                    }
                    items(offers, key = { it.offerId }) { offer ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(offer.name, fontWeight = FontWeight.SemiBold)
                                if (offer.standing) {
                                    Text(
                                        if (offer.standingStreak > 0) "Standing · streak ${offer.standingStreak}" else "Standing",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Ink.copy(alpha = 0.65f),
                                    )
                                }
                                Text(offer.description, style = MaterialTheme.typography.bodySmall)
                                Text(
                                    "${offer.quantity}× ${offer.itemName} · ${formatRushSeconds(offer.durationTicks)}s",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Text(
                                    "+${formatCoins(offer.payout)} / −${formatCoins(offer.penalty)}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Reward,
                                )
                                offer.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                            }
                            Button(
                                onClick = { onAccept(offer.offerId) },
                                enabled = offer.acceptEnabled,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text("Accept") }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun BusinessDashboardPanel(
    dash: BusinessDashboardView,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxWidth = 440.dp, maxHeight = 480.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Business dashboard", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Text(
                "Session ${dash.sessionLabel} · rates ${dash.rateIntervalLabel}",
                style = Tabular,
                color = Ink.copy(alpha = 0.7f),
            )
            Text(
                "Committed sales only — wallet coins are not counted as revenue.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.65f),
            )
            Spacer(Modifier.height(8.dp))
            if (dash.empty) {
                Text(
                    "No committed sales yet — serve customers or complete a contract.",
                    color = Ink.copy(alpha = 0.6f),
                )
                Spacer(Modifier.height(8.dp))
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                if (!dash.empty) {
                    item {
                        Row(verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f)) {
                                Text("Committed revenue", fontWeight = FontWeight.SemiBold)
                                Text(
                                    buildString {
                                        append("${formatCoins(dash.committedRevenue)} sales")
                                        if (dash.contractRevenue > 0L) {
                                            append(" · ${formatCoins(dash.contractRevenue)} contracts")
                                        }
                                    },
                                    style = Tabular,
                                    color = Ink.copy(alpha = 0.7f),
                                )
                                Text(
                                    "${dash.salesCount} sales · ${dash.itemsSold} items · ${formatCoins(dash.revenuePerMinute)} ${dash.rateIntervalLabel}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text(
                                formatCoins(dash.committedRevenue + dash.contractRevenue),
                                style = Tabular,
                            )
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Abandon rate", fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${dash.lostCustomers} lost customers",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("${dash.abandonPermille / 10}%", style = Tabular)
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Wage ratio", fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${formatCoins(dash.wagesPaid)} wages vs sales revenue",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("${dash.wageRatioPermille / 10}%", style = Tabular)
                        }
                    }
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Sales pace", fontWeight = FontWeight.SemiBold)
                                Text(
                                    dash.rateIntervalLabel,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("${dash.salesPerMinute}/min", style = Tabular)
                        }
                    }
                    items(dash.topSpecies, key = { it.speciesId }) { sp ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(sp.name, fontWeight = FontWeight.SemiBold)
                                Text(
                                    "${sp.catches} catches",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("${sp.sharePermille / 10}%", style = Tabular)
                        }
                    }
                }
                if (dash.bottlenecks.isEmpty()) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Bottlenecks", fontWeight = FontWeight.SemiBold)
                                Text(
                                    "None right now",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("Clear", style = Tabular, color = Action)
                        }
                    }
                } else {
                    items(dash.bottlenecks, key = { "${it.kind}:${it.id}" }) { b ->
                        Row(verticalAlignment = Alignment.Top) {
                            Column(Modifier.weight(1f)) {
                                Text(b.label, fontWeight = FontWeight.SemiBold)
                                Text(b.reason, style = MaterialTheme.typography.bodySmall, color = Danger)
                                Text(
                                    b.kind,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                            Text("Issue", style = Tabular)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun SpeciesBookPanel(
    book: SpeciesBookView,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxWidth = 440.dp, maxHeight = 480.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Species book", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Text(
                "${book.discovered}/${book.total} discovered",
                style = Tabular,
                color = Ink.copy(alpha = 0.7f),
            )
            Spacer(Modifier.height(8.dp))
            if (book.empty) {
                Text(
                    "No catches yet — cast from a pier to fill the book.",
                    color = Ink.copy(alpha = 0.6f),
                )
                Spacer(Modifier.height(8.dp))
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(book.entries, key = { it.speciesId }) { entry ->
                    Row(verticalAlignment = Alignment.Top) {
                        Column(Modifier.weight(1f)) {
                            Text(entry.name, fontWeight = FontWeight.SemiBold)
                            if (entry.discovered) {
                                Text(
                                    buildString {
                                        append("${entry.catches} caught")
                                        entry.trophyBestSizePermille?.let { size ->
                                            append(" · best $size%")
                                            entry.trophyBestValueCoins?.let { append(" · ${formatCoins(it)}") }
                                        }
                                    },
                                    style = Tabular,
                                    color = Ink.copy(alpha = 0.7f),
                                )
                                if (entry.harborNames.isNotEmpty()) {
                                    Text(
                                        "Zones: ${entry.harborNames.joinToString(" · ")}",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Ink.copy(alpha = 0.65f),
                                    )
                                }
                                if (entry.recipeNames.isNotEmpty()) {
                                    val shown = entry.recipeNames.take(3)
                                    val more = entry.recipeNames.size - shown.size
                                    Text(
                                        buildString {
                                            append("Recipes: ${shown.joinToString(" · ")}")
                                            if (more > 0) append(" · +$more more")
                                        },
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Ink.copy(alpha = 0.65f),
                                    )
                                }
                                if (entry.baseSpeciesId != null) {
                                    Text(
                                        "Rare upgrade form",
                                        style = MaterialTheme.typography.bodySmall,
                                        color = Action,
                                    )
                                }
                            } else {
                                Text(
                                    "Not discovered",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.6f),
                                )
                            }
                        }
                        Text(
                            if (entry.discovered) "Logged" else "—",
                            style = Tabular,
                            color = if (entry.discovered) Action else Ink.copy(alpha = 0.5f),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun WarehousePanel(
    warehouse: WarehouseView,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxWidth = 440.dp, maxHeight = 420.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Warehouse", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            Text(
                "Available ${warehouse.available} · Reserved ${warehouse.reserved} · Total ${warehouse.quantity}",
                style = Tabular,
                color = Ink.copy(alpha = 0.7f),
            )
            if (!warehouse.reconcileOk) {
                Text(
                    "Inventory mismatch${warehouse.reconcileError?.let { ": $it" } ?: ""}",
                    style = MaterialTheme.typography.bodySmall,
                    color = Danger,
                )
            }
            Spacer(Modifier.height(8.dp))
            if (warehouse.empty) {
                Text(
                    "No stock yet — catch fish, run stations, or stock a counter.",
                    color = Ink.copy(alpha = 0.6f),
                )
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(warehouse.lines, key = { it.itemId }) { line ->
                        Column {
                            Text(line.name, fontWeight = FontWeight.SemiBold)
                            Text(
                                buildString {
                                    append("${line.available} available")
                                    if (line.reserved > 0) append(" · ${line.reserved} reserved")
                                    append(" · ${line.quantity} total")
                                },
                                style = Tabular,
                                color = Ink.copy(alpha = 0.7f),
                            )
                            if (!line.reconcileOk) {
                                Text(
                                    "Location totals do not match",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Danger,
                                )
                            }
                            for (loc in line.locations) {
                                Text(
                                    buildString {
                                        append("${loc.label}: ${loc.available}")
                                        if (loc.reserved > 0) append(" (${loc.reserved} reserved)")
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.65f),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HarborMapPanel(
    harbors: List<HarborMapEntryView>,
    fullHarborUnlock: Boolean,
    onTravel: (String) -> Unit,
    onUnlockAll: () -> Unit,
    onRestoreUnlock: () -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxWidth = 420.dp, maxHeight = 420.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Harbor map", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.weight(1f, fill = false)) {
                items(harbors, key = { it.harborId }) { h ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(h.name, fontWeight = FontWeight.SemiBold)
                            h.specializationName?.let { spec ->
                                Text(
                                    buildString {
                                        append(spec)
                                        h.specializationDescription?.let { append(" — ").append(it) }
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.7f),
                                )
                            }
                            Text(
                                when {
                                    h.current -> "You are here"
                                    h.unlocked -> "Ready to travel"
                                    else -> h.reason ?: "Locked"
                                },
                                style = MaterialTheme.typography.bodySmall,
                                color = when {
                                    h.current -> Action
                                    h.unlocked -> Ink.copy(alpha = 0.7f)
                                    else -> Danger
                                },
                            )
                        }
                        Button(
                            onClick = { onTravel(h.harborId) },
                            enabled = h.travelEnabled,
                            modifier = Modifier.heightIn(min = 48.dp),
                        ) { Text(if (h.current) "Here" else "Travel") }
                    }
                }
            }
            Text(
                "Sunrise Pier is free. Full unlock opens every harbor — access only, no rate boosts.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
                modifier = Modifier.padding(top = 12.dp),
            )
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.padding(top = 8.dp),
            ) {
                if (fullHarborUnlock) {
                    Text("All harbors unlocked", color = Reward, modifier = Modifier.align(Alignment.CenterVertically))
                } else {
                    Button(onClick = onUnlockAll, modifier = Modifier.heightIn(min = 48.dp)) {
                        Text("Unlock all harbors")
                    }
                }
                OutlinedButton(onClick = onRestoreUnlock, modifier = Modifier.heightIn(min = 48.dp)) {
                    Text("Restore")
                }
            }
        }
    }
}

@Composable
private fun QuestLogPanel(
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
    onTakeLoan: () -> Unit,
    onRepayLoan: () -> Unit,
    onSetCoinGoal: (Long) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.managementSheet(maxHeight = 480.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Goals", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Reward,
                                )
                            }
                            Text("Event", style = Tabular, color = Action)
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Pier bank", fontWeight = FontWeight.SemiBold)
                            if (!bank.unlocked) {
                                Text(
                                    bank.lockedReason ?: "Locked",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Danger,
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
                                    Text("Repay · up to ${formatCoins(minOf(coins, bank.loanOwed))}")
                                }
                            } else {
                                Text(
                                    "Borrow ${formatCoins(bank.loanPrincipal)} · repay ${formatCoins(bank.repayAmount)} in ${formatRushSeconds(bank.termTicks)}s",
                                    style = MaterialTheme.typography.bodySmall,
                                )
                                Button(
                                    onClick = onTakeLoan,
                                    enabled = bank.canTakeLoan,
                                    modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp),
                                ) {
                                    Text("Take loan · ${formatCoins(bank.loanPrincipal)}")
                                }
                            }
                        }
                        Text("Bank", style = Tabular, color = Action)
                    }
                }
                item {
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text("Coin goal", fontWeight = FontWeight.SemiBold)
                                Text(
                                    when {
                                        bank.coinGoal <= 0L -> "Pick a savings target"
                                        bank.coinGoalCelebrated -> "Reached ${formatCoins(bank.coinGoal)}"
                                        else -> "${formatCoins(coins)} / ${formatCoins(bank.coinGoal)}"
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                )
                            }
                            Text("Goal", style = Tabular, color = Action)
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
                                        color = if (selected) Action else Ink,
                                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
                                    )
                                }
                            }
                            if (bank.coinGoal > 0L) {
                                TextButton(
                                    onClick = { onSetCoinGoal(0L) },
                                    modifier = Modifier.heightIn(min = 40.dp),
                                ) { Text("Clear") }
                            }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Species book", fontWeight = FontWeight.SemiBold)
                            Text(
                                "$speciesDiscovered/$speciesTotal discovered",
                                style = MaterialTheme.typography.bodySmall,
                            )
                            Button(
                                onClick = onOpenSpeciesBook,
                                modifier = Modifier.heightIn(min = 48.dp).padding(top = 4.dp),
                            ) { Text("Open book") }
                        }
                        Text("$speciesDiscovered/$speciesTotal", style = Tabular)
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Trophy board", fontWeight = FontWeight.SemiBold)
                            Text("$trophiesCount species mounted", style = MaterialTheme.typography.bodySmall)
                        }
                        Text("$trophiesCount", style = Tabular)
                    }
                }
                items(trophySets, key = { it.id }) { set ->
                    Column {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(set.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text(
                                if (set.completed) "Done" else "${set.mounted}/${set.total}",
                                style = Tabular,
                                color = if (set.completed) Action else Ink,
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
                                    "completed" -> Action
                                    "locked" -> Ink.copy(alpha = 0.5f)
                                    else -> Ink
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
                        q.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                        val rewardBits = buildList {
                            if (q.rewardCoins > 0) add("${formatCoins(q.rewardCoins)} coins")
                            addAll(q.rewardUnlockNames.map { "Unlock $it" })
                        }
                        if (rewardBits.isNotEmpty()) {
                            Text(
                                "Reward: ${rewardBits.joinToString(" · ")}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Reward,
                            )
                        }
                    }
                }
                item {
                    Text("Prestige", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    if (!prestigeUnlocked) {
                        Text(
                            prestigeLockedReason ?: "Locked",
                            style = MaterialTheme.typography.bodySmall,
                            color = Danger,
                        )
                    } else {
                        Text(
                            "Harbor rating ${"★".repeat(harborRating.coerceIn(0, 5))}",
                            style = MaterialTheme.typography.bodySmall,
                            color = Reward,
                        )
                        if (unlockedCosmetics.isNotEmpty()) {
                            Text(
                                "Banners: ${unlockedCosmetics.joinToString(", ")}",
                                style = MaterialTheme.typography.bodySmall,
                                color = Ink.copy(alpha = 0.7f),
                            )
                        }
                    }
                }
                item {
                    Text("Shop decor", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Text(
                        buildString {
                            append("Placable cosmetics")
                            if (decorPatienceBonusTicks > 0) append(" · +$decorPatienceBonusTicks customer patience")
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                items(decorOffers, key = { it.id }) { d ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(d.name, fontWeight = FontWeight.SemiBold)
                            Text(d.description, style = MaterialTheme.typography.bodySmall)
                            Text(
                                "+${d.patienceBonusTicks} patience · ${formatCoins(d.cost)} coins",
                                style = MaterialTheme.typography.bodySmall,
                                color = Reward,
                            )
                            d.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                        }
                        if (d.status == "owned") {
                            Text("Owned", style = Tabular, color = Action)
                        } else {
                            Button(
                                onClick = { onPurchaseDecor(d.id) },
                                enabled = d.canAfford,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text("Buy") }
                        }
                    }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text("Harbor cosmetics", fontWeight = FontWeight.SemiBold)
                            Text(
                                "Optional paid banners · visual only · never change rates",
                                style = MaterialTheme.typography.bodySmall,
                                color = Ink.copy(alpha = 0.7f),
                            )
                            Text(
                                "Equip one banner · Preview before buy · power-neutral",
                                style = MaterialTheme.typography.bodySmall,
                                color = Ink.copy(alpha = 0.7f),
                            )
                            TextButton(
                                onClick = onRestorePurchases,
                                modifier = Modifier.padding(top = 4.dp).heightIn(min = 48.dp),
                            ) { Text("Restore purchases") }
                        }
                        Text("IAP", style = Tabular, color = Action)
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
                                    Text("Equipped", style = MaterialTheme.typography.bodySmall, color = Reward)
                                } else if (previewing) {
                                    Text("Preview", style = MaterialTheme.typography.bodySmall, color = Reward)
                                }
                            }
                            Text(
                                if (owned) "Owned" else "IAP",
                                style = Tabular,
                                color = Action,
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
                                ) { Text("Buy") }
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
                                Text(
                                    "Unlocked banner · visual only",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Ink.copy(alpha = 0.7f),
                                )
                                if (equipped) {
                                    Text("Equipped", style = MaterialTheme.typography.bodySmall, color = Reward)
                                } else if (previewing) {
                                    Text("Preview", style = MaterialTheme.typography.bodySmall, color = Reward)
                                }
                            }
                            Text("Owned", style = Tabular, color = Action)
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
                                        "completed" -> Action
                                        "locked" -> Ink.copy(alpha = 0.5f)
                                        else -> Ink
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
                            p.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                            val rewardBits = prestigeRewardBits(p)
                            if (rewardBits.isNotEmpty()) {
                                Text(
                                    "Reward: ${rewardBits.joinToString(" · ")}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Reward,
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private fun prestigeRewardBits(p: PrestigeView): List<String> = buildList {
    if (p.rewardCoins > 0) add("${formatCoins(p.rewardCoins)} coins")
    if (p.catchSpeedPermille > 1000) add("+${(p.catchSpeedPermille - 1000) / 10}% catch")
    if (p.priceBonusPermille > 1000) add("+${(p.priceBonusPermille - 1000) / 10}% prices")
    p.cosmetic?.let { add("Unlock $it") }
}

@Composable
private fun OfflineSummaryPanel(report: OfflineReport, onContinue: () -> Unit, modifier: Modifier) {
    Surface(modifier.managementSheet(maxWidth = 400.dp, maxHeight = 520.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text("While you were away", style = MaterialTheme.typography.titleLarge, fontWeight = FontWeight.Bold)
            Text(
                buildString {
                    append(formatAwayDuration(report.elapsedMillis))
                    if (report.capped) append(" · capped at max offline time")
                },
                style = MaterialTheme.typography.bodyMedium,
                color = Ink.copy(alpha = 0.75f),
            )
            Text(
                "Your staff kept the harbor running.",
                style = MaterialTheme.typography.bodyMedium,
            )
            val lines = buildList {
                if (report.coinsDelta != 0L) add("${if (report.coinsDelta > 0) "+" else ""}${formatCoins(report.coinsDelta)} coins")
                if (report.sales > 0) add("${report.sales} sales")
                if (report.workerFishCaught > 0) add("${report.workerFishCaught} fish caught by staff")
                if (report.workerItemsMoved > 0) add("${report.workerItemsMoved} items moved by staff")
                if (isEmpty() && !report.hadActivity) add("Quiet shift — hire staff to earn while away")
            }
            lines.forEach { Text(it, style = Tabular, fontWeight = FontWeight.SemiBold) }
            Spacer(Modifier.height(8.dp))
            Button(onClick = onContinue, modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp)) {
                Text("Continue")
            }
        }
    }
}

private fun formatAwayDuration(elapsedMillis: Long): String {
    val totalSec = (elapsedMillis / 1000L).coerceAtLeast(0L)
    val h = totalSec / 3600
    val m = (totalSec % 3600) / 60
    val s = totalSec % 60
    return when {
        h > 0 -> "Away ${h}h ${m}m"
        m > 0 -> "Away ${m}m ${s}s"
        else -> "Away ${s}s"
    }
}

/** Short-lived feedback for committed transactions and rejected actions. */
@Composable
private fun MessageTicker(vm: GameViewModel) {
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
            Pill(background = Ink) { Text(it, color = Color.White) }
        }
    }
}

@Composable
private fun Pill(
    modifier: Modifier = Modifier,
    background: Color = PanelSurface.copy(alpha = 0.92f),
    content: @Composable () -> Unit,
) {
    Surface(modifier.heightIn(min = 40.dp), shape = RoundedCornerShape(50), color = background) {
        Box(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun CenterCard(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Surface(shape = PanelShape, color = PanelSurface) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) { content() }
        }
    }
}

/** Compact notation for display only; stored values keep full precision. */
fun formatCoins(c: Long): String = when {
    c >= 1_000_000_000 -> "%.1fB".format(c / 1e9)
    c >= 1_000_000 -> "%.1fM".format(c / 1e6)
    c >= 10_000 -> "%.1fK".format(c / 1e3)
    else -> c.toString()
}

private fun formatRushSeconds(ticksRemaining: Int): Int =
    (ticksRemaining + SimConstants.TICKS_PER_SECOND - 1) / SimConstants.TICKS_PER_SECOND
