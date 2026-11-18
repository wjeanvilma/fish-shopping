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
                CircularProgressIndicator(color = MaterialTheme.colorScheme.primary)
                Spacer(Modifier.height(12.dp))
                Text(UiStrings.t("common.loading"))
            }
            is GameUiState.Failed -> CenterCard {
                Text(UiStrings.t("common.errorGeneric"), style = MaterialTheme.typography.titleMedium, color = MaterialTheme.colorScheme.error)
                Spacer(Modifier.height(8.dp))
                Text(s.message)
            }
            is GameUiState.Title -> TitleScreen(s, vm)
            is GameUiState.Ready -> Hud(s, vm)
        }
        MessageTicker(vm)
    }
}

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
    // Cozy art pass 5: photo / decorate modes replace the HUD while active.
    var cozyMode by remember { mutableStateOf(CozyMode.PLAY) }
    when (cozyMode) {
        CozyMode.PHOTO -> { PhotoModeOverlay(v, vm) { cozyMode = CozyMode.PLAY }; return }
        CozyMode.DECOR -> {
            DecorModeOverlay(v, vm, onExit = { cozyMode = CozyMode.PLAY }) {
                cozyMode = CozyMode.PLAY
                vm.setQuestsOpen(true)
            }
            return
        }
        CozyMode.PLAY -> Unit
    }
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
                        Text(buildString { append("· "); append((spec).toString()) },
                            style = Tabular,
                            fontWeight = FontWeight.SemiBold,
                            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.78f),
                            maxLines = 1,
                        )
                    }
                }
                if (v.harborRating > 0) {
                    Text(
                        UiStrings.t("hud.star").repeat(v.harborRating),
                        style = Tabular,
                        color = MaterialTheme.colorScheme.secondary,
                        fontWeight = FontWeight.Bold,
                    )
                }
                Text(buildString { append("· Rep "); append((v.reputationScorePermille / 10).toString()); append("%") },
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.78f),
                    maxLines = 1,
                )
                if (!portrait) {
                    val weatherLine =
                        "· ${v.dayPartName} · ${v.weatherName} · ${v.tidePhaseName} · ${v.activeTechniqueName}" +
                            (if (v.tideChartOwned) " · chart" else "") +
                            (if (v.preferredBaitId != null) " · bait set" else "")
                    Text(
                        weatherLine,
                        style = Tabular,
                        fontWeight = FontWeight.SemiBold,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.72f),
                        maxLines = 1,
                        modifier = Modifier.semantics {
                            contentDescription =
                                "${UiStrings.t("hud.weatherTide")}: ${v.weatherName}, ${v.tidePhaseName}"
                            liveRegion = LiveRegionMode.Polite
                        },
                    )
                }
            }
        }
        val rivalPressuring = v.rivalPressureActive || v.activeRivalIds.isNotEmpty()
        if (rivalPressuring) {
            Pill(
                Modifier
                    .align(Alignment.TopStart)
                    .padding(top = 52.dp)
                    .semantics {
                        contentDescription = UiStrings.t("a11y.rivalPressureActive")
                        liveRegion = LiveRegionMode.Polite
                    },
                background = MaterialTheme.colorScheme.errorContainer,
            ) {
                Text(
                    UiStrings.t("hud.rivalPressure"),
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = MaterialTheme.colorScheme.onErrorContainer,
                    maxLines = 1,
                )
            }
        }
        // Top centre: coins.
        Pill(Modifier.align(Alignment.TopCenter), background = MaterialTheme.colorScheme.secondary) {
            Text(UiStrings.t("hud.coinsAmount", mapOf("amount" to formatCoins(v.coins))), style = Tabular, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.onSurface)
        }
        v.rush?.let { rush ->
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 52.dp),
                background = MaterialTheme.colorScheme.primary,
            ) {
                Text(buildString { append((rush.name).toString()); append(" · "); append((formatRushSeconds(rush.ticksRemaining)).toString()); append("s") },
                    style = Tabular,
                    fontWeight = FontWeight.Bold,
                    color = MaterialTheme.colorScheme.onPrimary,
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
                Text(buildString { append((seasonal.name).toString()); append(" · "); append((formatRushSeconds(seasonal.ticksRemaining)).toString()); append("s") },
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
                Text(buildString { append((label).toString()); append(" · "); append((CosmeticPresentation.titleFor(cosmeticId)).toString()) },
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
                background = MaterialTheme.colorScheme.surface,
            ) {
                Text(UiStrings.t("hud.supervisorOnDuty"), style = Tabular, fontWeight = FontWeight.SemiBold, color = MaterialTheme.colorScheme.onSurface)
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
                Text(buildString { append("Abandon "); append((rates.abandonPermille / 10).toString()); append("% · Wage "); append((rates.wageRatioPermille / 10).toString()); append("%"); append((topName).toString()) },
                    style = Tabular,
                    fontWeight = FontWeight.SemiBold,
                    color = Color(0xFFE8F0F8),
                )
            }
        }
        // Top right: management (wraps in portrait — Phase 28). Finish 4.0 Phase 26 extract.
        HudNavToolbarContent(
            onPause = { vm.setPauseOpen(true) },
            onMap = { vm.setMapOpen(true) },
            onWarehouse = { vm.setWarehouseOpen(true) },
            onGoals = { vm.setQuestsOpen(true) },
            onJobs = { vm.setContractsOpen(true) },
            onStaff = { vm.setStaffOpen(true) },
            onDash = { vm.setDashboardOpen(true) },
            onUpgrades = { vm.setUpgradesOpen(true) },
            modifier = Modifier.align(Alignment.TopEnd),
            actionsMax = actionsMax,
            actionMinHeight = actionMinHeight,
            onDecor = { cozyMode = CozyMode.DECOR },
            onPhoto = { cozyMode = CozyMode.PHOTO },
            compact = portrait,
        )
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
                shape = PanelShape, color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Text(obj.eyebrow, style = MaterialTheme.typography.labelSmall, color = MaterialTheme.colorScheme.primary)
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
                color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
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
                onTrainBranch = vm::trainWorkerBranch,
                onSelectBranch = vm::selectWorkerBranch,
                onSetSchedule = vm::setWorkerSchedule,
                onClose = { vm.setStaffOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
        if (state.dashboardOpen) {
            BusinessDashboardPanel(
                dash = v.businessDashboard,
                journalLines = state.offlineReport?.journalLines.orEmpty(),
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
                dailyLoginStreak = v.dailyLoginStreak,
                dailyGoals = v.dailyGoals,
                onClaimDailyGoal = vm::claimDailyGoal,
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
                failStreak = v.contractFailStreak,
                failStreakThreshold = v.contractFailStreakThreshold,
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
                    achievements = v.achievements,
                    unlockedAchievementsCount = v.unlockedAchievementsCount,
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
                    onDailyGoalReminders = { vm.updateSettings(dailyGoalRemindersEnabled = it) },
                    onBalanceStrip = { vm.updateSettings(showBalanceStrip = it) },
                    onReducedMotion = { vm.updateSettings(reducedMotion = it) },
                    onCaptions = { vm.updateSettings(captionsEnabled = it) },
                    onHudTextScale = { vm.updateSettings(hudTextScale = it) },
                    onShapeCues = { vm.updateSettings(shapeCues = it) },
                    onTimingAssist = { vm.updateSettings(timingAssist = it) },
                    onAccessibilityPreset = { vm.applyAccessibilityPreset() },
                    onLocale = { vm.updateSettings(locale = it) },
                    onThemePreference = { vm.updateSettings(themePreference = it) },
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
                    onSelectTechnique = vm::selectTechnique,
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

