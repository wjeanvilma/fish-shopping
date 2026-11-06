package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.sim.ContextCard
import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.ActiveContractView
import com.willio.jeanvilma.fishshopping.core.sim.ContractOfferView
import com.willio.jeanvilma.fishshopping.core.sim.HarborMapEntryView
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.PrestigeView
import com.willio.jeanvilma.fishshopping.core.sim.QuestView
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.StaffHireView
import com.willio.jeanvilma.fishshopping.core.sim.StationView
import com.willio.jeanvilma.fishshopping.core.sim.UpgradeView
import com.willio.jeanvilma.fishshopping.game.CameraRig
import com.willio.jeanvilma.fishshopping.game.GameUiState
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.render.HarborView
import com.willio.jeanvilma.fishshopping.ui.theme.Action
import com.willio.jeanvilma.fishshopping.ui.theme.Danger
import com.willio.jeanvilma.fishshopping.ui.theme.Ink
import com.willio.jeanvilma.fishshopping.ui.theme.OnAction
import com.willio.jeanvilma.fishshopping.ui.theme.PanelSurface
import com.willio.jeanvilma.fishshopping.ui.theme.Reward
import kotlinx.coroutines.delay

private val PanelShape = RoundedCornerShape(16.dp)
private val Tabular = TextStyle(fontFeatureSettings = "tnum")

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
            transferProvider = { vm.drainFlyingTransfers() },
            qualityProvider = { vm.renderQuality() },
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
            is GameUiState.Title -> TitleScreen(s.hasSave, vm)
            is GameUiState.Ready -> Hud(s, vm)
        }
        MessageTicker(vm)
    }
}

@Composable
private fun Hud(state: GameUiState.Ready, vm: GameViewModel) {
    val v = state.view
    val focus = remember { FocusRequester() }
    val keys = remember { mutableStateListOf<Key>() }
    var harborSize by remember { mutableStateOf(IntSize.Zero) }
    var harborOrigin by remember { mutableStateOf(Offset.Zero) }
    var tapZoneOrigin by remember { mutableStateOf(Offset.Zero) }
    val settings = state.settings
    val anyPanel = state.offlineReport != null || state.pauseOpen || state.settingsOpen
        || state.bagOpen || state.stationOpen || state.upgradesOpen || state.staffOpen
        || state.questsOpen || state.contractsOpen || state.mapOpen

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
            else -> vm.setPauseOpen(true)
        }
    }
    LaunchedEffect(Unit) { focus.requestFocus() }

    Box(
        Modifier
            .fillMaxSize()
            .onGloballyPositioned {
                harborSize = IntSize(it.size.width, it.size.height)
                harborOrigin = it.positionInRoot()
            },
    ) {
    Box(
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
        Pill(Modifier.align(Alignment.TopStart)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Text(v.harborName, fontWeight = FontWeight.SemiBold)
                if (v.harborRating > 0) {
                    Text(
                        "★".repeat(v.harborRating),
                        style = Tabular,
                        color = Reward,
                        fontWeight = FontWeight.Bold,
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
        if (v.supervisorOnDuty) {
            Pill(
                Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = if (v.rush != null) 96.dp else 52.dp),
                background = PanelSurface,
            ) {
                Text("Supervisor on duty", style = Tabular, fontWeight = FontWeight.SemiBold, color = Ink)
            }
        }
        // Top right: management.
        Row(
            Modifier.align(Alignment.TopEnd),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Button(onClick = { vm.setPauseOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Pause")
            }
            Button(onClick = { vm.setMapOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Map")
            }
            Button(onClick = { vm.setQuestsOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Goals")
            }
            Button(onClick = { vm.setContractsOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Jobs")
            }
            Button(onClick = { vm.setStaffOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Staff")
            }
            Button(onClick = { vm.setUpgradesOpen(true) }, modifier = Modifier.heightIn(min = 48.dp)) {
                Text("Upgrades")
            }
        }
        // Left edge: tutorial / quest / empty-state coaching (Phase 30).
        v.objective?.let { obj ->
            Surface(
                Modifier.align(Alignment.CenterStart).widthIn(max = 220.dp),
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
                .fillMaxWidth(0.42f)
                .fillMaxHeight(0.48f),
        )
        // Bottom centre: station card, only in range.
        v.context?.let { card ->
            StationCard(
                card,
                onOpen = { vm.setStationOpen(true) },
                onCycleRecipe = card.stationId?.let { id -> { vm.cycleStationRecipe(id) } },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
        if (v.fishingCanReel) {
            Button(
                onClick = vm::reel,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 120.dp)
                    .heightIn(min = 48.dp),
                enabled = true,
            ) {
                Text(if (v.fishingTimingWindow) "Reel!" else "Reel")
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
                workersOnDuty = v.workers.size,
                wagePerWorkerPerHour = v.workerWagePerWorkerPerHour,
                maintenanceCoinsPerStation = v.maintenanceCoinsPerStation,
                economyUnlocked = v.economyUnlocked,
                bagFishSpoilActive = v.bagFishSpoilActive,
                coins = v.coins,
                onHire = vm::hire,
                onClose = { vm.setStaffOpen(false) },
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
                onClose = { vm.setQuestsOpen(false) },
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
                onTravel = vm::travelToHarbor,
                onClose = { vm.setMapOpen(false) },
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
                    onMuted = { vm.updateSettings(muted = it) },
                    onQuality = { vm.updateSettings(quality = it) },
                    onJoystickSide = { vm.updateSettings(joystickSide = it) },
                    onJoystickScale = { vm.updateSettings(joystickScale = it) },
                    onTapToMove = { vm.updateSettings(tapToMove = it) },
                    onCloudSync = { vm.updateSettings(cloudSyncEnabled = it) },
                    onExportTelemetry = { vm.exportTelemetryJson() },
                    onExportBalance = { vm.exportBalanceJson() },
                    onClose = { vm.setSettingsOpen(false) },
                )
            }
        }
        if (state.bagOpen) {
            OverlayScrim(onDismiss = { vm.setBagOpen(false) }) {
                BagDetailPanel(v, onClose = { vm.setBagOpen(false) })
            }
        }
        val stationCard = v.context
        if (state.stationOpen && stationCard != null) {
            OverlayScrim(onDismiss = { vm.setStationOpen(false) }) {
                StationDetailPanel(
                    card = stationCard,
                    stations = v.stations,
                    onCycleRecipe = stationCard.stationId?.let { id -> { vm.cycleStationRecipe(id) } },
                    onSetPaused = vm::setMachinePaused,
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

private val MOVE_KEYS = setOf(
    Key.W, Key.A, Key.S, Key.D, Key.DirectionUp, Key.DirectionDown, Key.DirectionLeft, Key.DirectionRight,
)

@Composable
private fun StationCard(
    card: ContextCard,
    onOpen: () -> Unit,
    onCycleRecipe: (() -> Unit)?,
    modifier: Modifier,
) {
    Surface(
        modifier.widthIn(min = 220.dp, max = 320.dp).clickable(onClick = onOpen),
        shape = PanelShape,
        color = PanelSurface.copy(alpha = 0.95f),
    ) {
        Column(Modifier.padding(12.dp)) {
            Text(card.title, fontWeight = FontWeight.Bold)
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
private fun TitleScreen(hasSave: Boolean, vm: GameViewModel) {
    var confirmNew by remember { mutableStateOf(false) }
    CenterCard {
        Column(Modifier.widthIn(min = 280.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Text("Fish Shopping", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Bold)
            Spacer(Modifier.height(6.dp))
            Text(
                "Catch, cut, sell — run your harbor market",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.Gray,
            )
            Spacer(Modifier.height(16.dp))
            if (hasSave) {
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
    if (confirmNew) {
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
    onMuted: (Boolean) -> Unit,
    onQuality: (QualityPreset) -> Unit,
    onJoystickSide: (JoystickSide) -> Unit,
    onJoystickScale: (Float) -> Unit,
    onTapToMove: (Boolean) -> Unit,
    onCloudSync: (Boolean) -> Unit,
    onExportTelemetry: () -> String?,
    onExportBalance: () -> String?,
    onClose: () -> Unit,
) {
    val context = androidx.compose.ui.platform.LocalContext.current
    var exportNote by remember { mutableStateOf<String?>(null) }
    Surface(
        Modifier.width(400.dp).heightIn(max = 520.dp).then(rememberSheetClicks()),
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
                        "Silences catch, sale, machine, rush, and upgrade stingers.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.muted, onCheckedChange = onMuted)
            }
            Text("Quality")
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
                    Text("Cloud sync", fontWeight = FontWeight.SemiBold)
                    Text(
                        if (cloudAvailable) {
                            "Optional. Newest checksummed save wins across devices."
                        } else {
                            "Optional. Add fish.firebase.* to local.properties to link a remote."
                        },
                        style = MaterialTheme.typography.bodySmall,
                        color = Ink.copy(alpha = 0.7f),
                    )
                }
                Switch(checked = settings.cloudSyncEnabled, onCheckedChange = onCloudSync)
            }
            Text("Telemetry", fontWeight = FontWeight.SemiBold)
            Text(
                "Privacy-safe counters and content balance knobs. Copied as JSON.",
                style = MaterialTheme.typography.bodySmall,
                color = Ink.copy(alpha = 0.7f),
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
            exportNote?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Action) }
        }
    }
}

private fun copyTextToClipboard(context: android.content.Context, label: String, text: String) {
    val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
    clipboard.setPrimaryClip(android.content.ClipData.newPlainText(label, text))
}

@Composable
private fun BagDetailPanel(v: SimView, onClose: () -> Unit) {
    Surface(
        Modifier.width(400.dp).heightIn(max = 360.dp).then(rememberSheetClicks()),
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
            Spacer(Modifier.height(8.dp))
            if (v.bag.isEmpty()) {
                Text("Empty", color = Ink.copy(alpha = 0.6f))
            } else {
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(v.bag, key = { it.itemId }) { item ->
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(item.name, fontWeight = FontWeight.SemiBold, modifier = Modifier.weight(1f))
                            Text("${item.count}", style = Tabular)
                        }
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
    onCycleRecipe: (() -> Unit)?,
    onSetPaused: (String, Boolean) -> Unit,
    onClose: () -> Unit,
) {
    val station = card.stationId?.let { id -> stations.firstOrNull { it.stationId == id } }
    val paused = station?.status == MachineStatus.PAUSED || station?.statusText == "Paused"
    Surface(
        Modifier.width(400.dp).then(rememberSheetClicks()),
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
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(
                    progress = { it.coerceIn(0f, 1f) },
                    modifier = Modifier.fillMaxWidth(),
                    color = Action,
                )
            }
            if (onCycleRecipe != null || card.stationId != null) {
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (onCycleRecipe != null && card.recipeModeLabel != null) {
                        Button(
                            onClick = onCycleRecipe,
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text("Recipe: ${card.recipeModeLabel}") }
                    }
                    card.stationId?.let { id ->
                        Button(
                            onClick = { onSetPaused(id, !paused) },
                            modifier = Modifier.fillMaxWidth().heightIn(min = 48.dp),
                        ) { Text(if (paused) "Resume machine" else "Pause machine") }
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
    Surface(modifier.width(440.dp).heightIn(max = 320.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
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
    workersOnDuty: Int,
    wagePerWorkerPerHour: Int,
    maintenanceCoinsPerStation: Int,
    economyUnlocked: Boolean,
    bagFishSpoilActive: Boolean,
    coins: Long,
    onHire: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.width(440.dp).heightIn(max = 320.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(Modifier.weight(1f)) {
                    Text("Staff", style = MaterialTheme.typography.titleLarge)
                    Text(
                        buildString {
                            append("$workersOnDuty on duty")
                            if (wagePerWorkerPerHour > 0) append(" · $wagePerWorkerPerHour coins/hr each")
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
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
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
    Surface(modifier.width(460.dp).heightIn(max = 400.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
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
private fun HarborMapPanel(
    harbors: List<HarborMapEntryView>,
    onTravel: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.width(420.dp).heightIn(max = 360.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Harbor map", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(harbors, key = { it.harborId }) { h ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(h.name, fontWeight = FontWeight.SemiBold)
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
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.width(440.dp).heightIn(max = 480.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Goals", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
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
    Surface(modifier.width(400.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
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
        vm.messages.collect { message = it }
    }
    LaunchedEffect(message) {
        if (message != null) {
            delay(1800)
            message = null
        }
    }
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
