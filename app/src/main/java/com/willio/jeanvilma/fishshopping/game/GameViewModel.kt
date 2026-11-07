package com.willio.jeanvilma.fishshopping.game

import android.app.Application
import android.content.Context
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.willio.jeanvilma.fishshopping.analytics.AnalyticsBus
import com.willio.jeanvilma.fishshopping.audio.AudioBus
import com.willio.jeanvilma.fishshopping.audio.SfxCue
import com.willio.jeanvilma.fishshopping.audio.sfxFromEvent
import com.willio.jeanvilma.fishshopping.billing.EntitlementBillings
import com.willio.jeanvilma.fishshopping.billing.PendingEntitlementLedger
import com.willio.jeanvilma.fishshopping.billing.PurchaseOutcome
import com.willio.jeanvilma.fishshopping.billing.RestoredEntitlement
import com.willio.jeanvilma.fishshopping.core.lifecycle.AndroidDeviceLifecycle
import com.willio.jeanvilma.fishshopping.core.progression.DailyGoalsSystem
import com.willio.jeanvilma.fishshopping.core.progression.EntitlementReconcile
import com.willio.jeanvilma.fishshopping.cloud.CloudSyncCoordinator
import com.willio.jeanvilma.fishshopping.core.content.BalanceExport
import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.persistence.CloudConflictOffer
import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.NewerSaveException
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.FixedStepClock
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflinePolicy
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Telemetry
import com.willio.jeanvilma.fishshopping.core.sim.applyOffline
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.persistence.SettingsStore
import com.willio.jeanvilma.fishshopping.persistence.SnapshotStore
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.ShakeKind
import com.willio.jeanvilma.fishshopping.render.WorldBurstCue
import com.willio.jeanvilma.fishshopping.render.resolveAchievementBurst
import com.willio.jeanvilma.fishshopping.render.resolveCatchBurst
import com.willio.jeanvilma.fishshopping.render.resolveCelebrateBurst
import com.willio.jeanvilma.fishshopping.render.resolveContractDoneBurst
import com.willio.jeanvilma.fishshopping.render.resolveFestivalBurst
import com.willio.jeanvilma.fishshopping.render.resolveFlyingTransfer
import com.willio.jeanvilma.fishshopping.render.resolveGoalClaimBurst
import com.willio.jeanvilma.fishshopping.render.resolveMachineDoneBurst
import com.willio.jeanvilma.fishshopping.render.resolvePayBurst
import com.willio.jeanvilma.fishshopping.ui.hud.TapTarget
import com.willio.jeanvilma.fishshopping.ui.hud.stickFromTapTarget
import kotlin.math.hypot
import kotlinx.coroutines.Job
import kotlinx.coroutines.asCoroutineDispatcher
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import java.util.UUID
import java.util.concurrent.ConcurrentLinkedQueue
import java.util.concurrent.CountDownLatch
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt
import kotlin.random.Random

sealed interface GameUiState {
    data object Loading : GameUiState
    data class Title(
        val hasSave: Boolean,
        val cloudConflict: CloudConflictView? = null,
        val localRecovery: LocalRecoveryView? = null,
        val settings: GameSettings = GameSettings(),
    ) : GameUiState
    data class Ready(
        val view: SimView,
        val upgradesOpen: Boolean,
        val staffOpen: Boolean,
        val questsOpen: Boolean = false,
        val contractsOpen: Boolean = false,
        val mapOpen: Boolean = false,
        val warehouseOpen: Boolean = false,
        val speciesBookOpen: Boolean = false,
        val dashboardOpen: Boolean = false,
        val pauseOpen: Boolean = false,
        val settingsOpen: Boolean = false,
        val bagOpen: Boolean = false,
        val stationOpen: Boolean = false,
        val offlineReport: OfflineReport? = null,
        val settings: GameSettings = GameSettings(),
    ) : GameUiState
    data class Failed(val message: String) : GameUiState
}

/**
 * Hosts the canonical simulation on one dedicated thread (blueprint "Concurrency").
 * The UI sends intent as [Command]s; it never mutates game state directly.
 *
 * - The renderer reads [latestView] every frame (updated every tick).
 * - The HUD observes [ui], published ~10 times per second and immediately after transactions.
 * - One-off feedback (coins earned, rejected purchases) goes through [messages].
 */
class GameViewModel(app: Application) : AndroidViewModel(app) {

    private val simExecutor = Executors.newSingleThreadExecutor { Thread(it, "fish-sim") }
    private val simDispatcher = simExecutor.asCoroutineDispatcher()
    // Plain executors (not viewModelScope) so a final save still completes while the ViewModel is cleared.
    private val ioExecutor = Executors.newSingleThreadExecutor { Thread(it, "fish-save") }
    private val store = SnapshotStore(app.filesDir)
    private val settingsStore = SettingsStore(app)
    private val audio = AudioBus(app)
    private val cloud = CloudSyncCoordinator(app)
    private val billing = EntitlementBillings.create(app)
    private val pendingEntitlements = PendingEntitlementLedger(app)

    private val _ui = MutableStateFlow<GameUiState>(GameUiState.Loading)
    val ui: StateFlow<GameUiState> = _ui

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val messages: SharedFlow<String> = _messages

    @Volatile
    var latestView: SimView? = null
        private set

    /** Presentation-only flying transfer cues for the harbor renderer (drained each frame). */
    private val flyingTransfers = ConcurrentLinkedQueue<FlyingTransferCue>()
    /** Phase 16/21 world bursts (catch / pay / celebrate / machine_done). */
    private val worldBursts = ConcurrentLinkedQueue<WorldBurstCue>()
    /** Phase 21 screen-shake kinds (drained each frame by the renderer). */
    private val pendingShakes = ConcurrentLinkedQueue<ShakeKind>()

    private val commands = ConcurrentLinkedQueue<Command>()

    /** Drain queued transfer arcs for the renderer (main thread). */
    fun drainFlyingTransfers(): List<FlyingTransferCue> {
        if (flyingTransfers.isEmpty()) return emptyList()
        val out = ArrayList<FlyingTransferCue>()
        while (true) {
            val next = flyingTransfers.poll() ?: break
            out += next
        }
        return out
    }

    /** Drain Phase 16/21 world burst cues for the renderer (main thread). */
    fun drainWorldBursts(): List<WorldBurstCue> {
        if (worldBursts.isEmpty()) return emptyList()
        val out = ArrayList<WorldBurstCue>()
        while (true) {
            val next = worldBursts.poll() ?: break
            out += next
        }
        return out
    }

    /** Drain Phase 21 shake cues for the renderer (main thread). */
    fun drainShakes(): List<ShakeKind> {
        if (pendingShakes.isEmpty()) return emptyList()
        val out = ArrayList<ShakeKind>()
        while (true) {
            val next = pendingShakes.poll() ?: break
            out += next
        }
        return out
    }

    /** Quality preset for the Filament renderer (presentation-only; includes title screen). */
    fun renderQuality(): QualityPreset = settings.quality

    /** Phase 10 a11y: snap camera / skip transfer VFX. */
    fun settingsReducedMotion(): Boolean = settings.reducedMotion

    /** Phase 10 a11y: toast captions for alerts. */
    fun settingsCaptionsEnabled(): Boolean = settings.captionsEnabled

    /** Phase 10 Settings save/cloud status row. */
    fun saveStatus(): com.willio.jeanvilma.fishshopping.persistence.SaveStatusView =
        com.willio.jeanvilma.fishshopping.persistence.SaveStatusView(
            persistent = true,
            lastSavedLabel = GameSettings.formatLastSavedLabel(lastCheckpointEpochMs),
            cloudEnabled = settings.cloudSyncEnabled,
            cloudAvailable = cloud.available,
            cloudLinked = !settings.cloudAccountId.isNullOrBlank(),
            cloudPendingUpload = cloud.hasPendingOfflinePush(),
        )

    // Owned by the sim thread only.
    private var content: ContentPack? = null
    private var sim: Simulation? = null
    private var booting = false
    @Volatile
    private var settings: GameSettings = settingsStore.load()
    private var allowSaving = true
    /** False after recovering from the backup, so the corrupt latest never overwrites it. */
    private var rotateOnNextSave = true
    private var lastHudPublishNanos = 0L

    @Volatile
    private var upgradesOpen = false
    @Volatile
    private var staffOpen = false
    @Volatile
    private var questsOpen = false
    @Volatile
    private var contractsOpen = false
    @Volatile
    private var mapOpen = false
    @Volatile
    private var warehouseOpen = false
    @Volatile
    private var speciesBookOpen = false
    @Volatile
    private var dashboardOpen = false
    @Volatile
    private var pauseOpen = false
    @Volatile
    private var settingsOpen = false
    @Volatile
    private var bagOpen = false
    @Volatile
    private var stationOpen = false
    private var lastMove = Command.Move(0, 0)
    private var loopJob: Job? = null
    /** Wall clock of the last checkpoint; used for offline catch-up on resume/load. */
    private var lastCheckpointEpochMs: Long? = null
    private var pendingOfflineReport: OfflineReport? = null
    /** Phase 11: parked dual-snapshot choice (texts kept until the player picks). */
    private var pendingConflict: CloudConflictOffer? = null
    private var cloudConflictView: CloudConflictView? = null
    /** Phase 11: parked corrupt-latest → previous recovery. */
    private var pendingRecoveryText: String? = null
    private var localRecoveryView: LocalRecoveryView? = null
    /** Presentation-only tap-to-move destination (cleared by stick/keys or on arrival). */
    @Volatile
    private var tapTarget: TapTarget? = null
    /** True while joystick/keyboard is holding a non-zero stick. */
    @Volatile
    private var stickActive = false

    private val panelOpen get() = upgradesOpen || staffOpen || questsOpen || contractsOpen || mapOpen
        || warehouseOpen || speciesBookOpen || dashboardOpen || pauseOpen || settingsOpen || bagOpen || stationOpen
        || pendingOfflineReport != null

    /** Phase 25: flush offline cloud queue when connectivity returns (online_event). */
    private val connectivityManager =
        app.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    private val networkCallback = object : ConnectivityManager.NetworkCallback() {
        override fun onAvailable(network: Network) {
            flushCloudOfflineQueue()
        }
    }

    init {
        // Phase 26: attach local analytics dashboard ledger once per process.
        AnalyticsBus.install(app)
        applyAudioSettings()
        applyAnalyticsConsent()
        runCatching {
            connectivityManager.registerNetworkCallback(
                NetworkRequest.Builder()
                    .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
                    .build(),
                networkCallback,
            )
        }
        viewModelScope.launch(simDispatcher) { load() }
    }

    /** Content and save presence only. The simulation is created from the title screen. */
    private fun load() {
        try {
            val pack = getApplication<Application>().assets.open(CONTENT_ASSET).use {
                ContentLoader.load(it.readBytes().decodeToString())
            }
            content = pack
            settings = settingsStore.load()
            applyAudioSettings()
            applyAnalyticsConsent()
            publishTitle(store.readCandidates().isNotEmpty())
        } catch (e: NewerSaveException) {
            allowSaving = false
            _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start", e)
            _ui.value = GameUiState.Failed("Could not load game content: ${e.message}")
        }
    }

    /** Continue from the newest usable save, or a fresh harbor if every slot is unusable. */
    fun continueGame() {
        viewModelScope.launch(simDispatcher) {
            val title = _ui.value as? GameUiState.Title ?: return@launch
            if (booting || title.cloudConflict != null || title.localRecovery != null) return@launch
            val pack = content ?: return@launch
            booting = true
            try {
                val restored = restoreOrCreate(pack) ?: return@launch // parked for choice/recovery UI
                bootSim(restored.state, restored.savedAtEpochMs)
                reconcileEntitlementsFromStore()
            } catch (e: NewerSaveException) {
                allowSaving = false
                _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to continue", e)
                _ui.value = GameUiState.Failed(e.message ?: "Could not continue.")
            } finally {
                booting = false
            }
        }
    }

    /** Phase 11: apply the player's dual-snapshot choice. */
    fun resolveCloudConflict(source: SyncSource) {
        viewModelScope.launch(simDispatcher) {
            if (booting || _ui.value !is GameUiState.Title) return@launch
            val pack = content ?: return@launch
            val offer = pendingConflict ?: return@launch
            if (source != SyncSource.LOCAL && source != SyncSource.REMOTE) return@launch
            booting = true
            try {
                val text = if (source == SyncSource.REMOTE) offer.remoteText else offer.localText
                store.write(text, rotate = true)
                val decoded = SnapshotCodec.decodeEnvelope(pack, text)
                clearSaveChoiceUi()
                AnalyticsBus.shared.onSaveRecovery(
                    if (source == SyncSource.REMOTE) "cloud_remote" else "cloud_local",
                )
                _messages.tryEmit(if (source == SyncSource.REMOTE) "Restored cloud save" else "Kept this device's save")
                bootSim(decoded.state, decoded.savedAtEpochMs)
                // Phase 3: store IAP remains SoT after local/remote choice.
                reconcileEntitlementsFromStore()
            } catch (e: NewerSaveException) {
                allowSaving = false
                clearSaveChoiceUi()
                _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to resolve cloud conflict", e)
                clearSaveChoiceUi()
                _ui.value = GameUiState.Failed(e.message ?: "Could not apply save choice.")
            } finally {
                booting = false
            }
        }
    }

    /** Phase 11: load the previous backup after a corrupt latest. */
    fun confirmLocalRecovery() {
        viewModelScope.launch(simDispatcher) {
            if (booting || _ui.value !is GameUiState.Title) return@launch
            val pack = content ?: return@launch
            val text = pendingRecoveryText ?: return@launch
            booting = true
            try {
                val decoded = SnapshotCodec.decodeEnvelope(pack, text)
                rotateOnNextSave = false
                clearSaveChoiceUi()
                AnalyticsBus.shared.onSaveRecovery("local_previous")
                _messages.tryEmit("Recovered your previous save")
                bootSim(decoded.state, decoded.savedAtEpochMs)
                reconcileEntitlementsFromStore()
            } catch (e: NewerSaveException) {
                allowSaving = false
                clearSaveChoiceUi()
                _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
            } catch (e: Exception) {
                Log.e(TAG, "Failed to recover previous save", e)
                clearSaveChoiceUi()
                _ui.value = GameUiState.Failed(e.message ?: "Could not recover save.")
            } finally {
                booting = false
            }
        }
    }

    /** Phase 11: dismiss recovery dialog and stay on the title screen. */
    fun dismissLocalRecovery() {
        viewModelScope.launch(simDispatcher) {
            if (_ui.value !is GameUiState.Title) return@launch
            clearSaveChoiceUi()
            publishTitle(store.readCandidates().isNotEmpty())
        }
    }

    private fun clearSaveChoiceUi() {
        pendingConflict = null
        cloudConflictView = null
        pendingRecoveryText = null
        localRecoveryView = null
    }

    /** Wipe slots and start a new harbor. The title screen confirms before calling this. */
    fun newGame() {
        viewModelScope.launch(simDispatcher) {
            if (booting || _ui.value !is GameUiState.Title) return@launch
            val pack = content ?: return@launch
            booting = true
            try {
                clearSaveChoiceUi()
                cloud.clearRemote(settings)
                store.clear()
                rotateOnNextSave = true
                val state = GameState.newGame(pack, START_HARBOR, Random.nextInt())
                bootSim(state, null)
                // Phase 3: paid unlocks survive new-game wipe of harbor progress.
                reconcileEntitlementsFromStore()
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start a new game", e)
                _ui.value = GameUiState.Failed(e.message ?: "Could not start a new game.")
            } finally {
                booting = false
            }
        }
    }

    /** Checkpoint and leave the harbor. The simulation stays until the next boot. */
    fun returnToTitle() {
        viewModelScope.launch(simDispatcher) {
            loopJob?.cancel()
            loopJob = null
            enqueueMove(0f, 0f)
            val s = sim
            if (s != null && commands.isNotEmpty()) step(s)
            save()
            closeAllPanels()
            clearSaveChoiceUi()
            pendingOfflineReport = null
            commands.clear()
            flyingTransfers.clear()
            lastMove = Command.Move(0, 0)
            awaitQueuedSaves()
            val hasSave = runCatching { store.readCandidates().isNotEmpty() }.getOrDefault(allowSaving)
            publishTitle(hasSave)
        }
    }

    private fun bootSim(state: GameState, savedAtEpochMs: Long?) {
        val pack = content ?: return
        commands.clear()
        lastMove = Command.Move(0, 0)
        flyingTransfers.clear()
        pendingOfflineReport = null
        closeAllPanels()
        AnalyticsBus.shared.resetSessionFlags()
        applyAnalyticsConsent()
        sim = Simulation(pack, state)
        lastCheckpointEpochMs = savedAtEpochMs
        applyPendingOffline(System.currentTimeMillis())
        pushWallClock(System.currentTimeMillis())
        // Stamp a fresh checkpoint so a crash before the next pause cannot re-credit.
        if (pendingOfflineReport != null || savedAtEpochMs != null) save()
        latestView = sim?.view()
        publish(force = true)
        resume()
    }

    private fun publishTitle(hasSave: Boolean) {
        _ui.value = GameUiState.Title(
            hasSave = hasSave,
            cloudConflict = cloudConflictView,
            localRecovery = localRecoveryView,
            settings = settings,
        )
    }

    /** Block until saves queued before this call have been written. */
    private fun awaitQueuedSaves() {
        val done = CountDownLatch(1)
        ioExecutor.execute { done.countDown() }
        runCatching { done.await(2, TimeUnit.SECONDS) }
    }

    private data class Restored(val state: GameState, val savedAtEpochMs: Long?)

    /**
     * Latest valid snapshot, falling back to the previous one (blueprint "Recovery").
     * Returns null when Phase 11 parks a cloud-conflict or corrupt-latest dialog.
     */
    private fun restoreOrCreate(pack: ContentPack): Restored? {
        val candidates = store.readCandidates()
        val localLatest = candidates.firstOrNull { it.first == "latest" }?.second
        val pull = cloud.pullMerge(settings, localLatest)
        if (pull.settings != settings) {
            settings = pull.settings
            settingsStore.save(settings)
        }
        val conflict = pull.conflict
        if (conflict != null) {
            pendingConflict = conflict
            cloudConflictView = SnapshotChoice.conflictView(conflict, pack)
            localRecoveryView = null
            pendingRecoveryText = null
            publishTitle(hasSave = true)
            return null
        }
        if (pull.decision.source == SyncSource.REMOTE && pull.decision.text != null) {
            runCatching {
                store.write(pull.decision.text!!, rotate = true)
                val decoded = SnapshotCodec.decodeEnvelope(pack, pull.decision.text!!)
                _messages.tryEmit("Restored newer cloud save")
                return Restored(decoded.state, decoded.savedAtEpochMs)
            }.onFailure { Log.w(TAG, "Cloud save unusable: ${it.message}") }
        }
        var latestCorrupt = false
        for ((label, text) in candidates) {
            try {
                val decoded = SnapshotCodec.decodeEnvelope(pack, text)
                if (label != "latest") {
                    if (latestCorrupt) {
                        val peeked = CloudSync.peek(text)
                        if (peeked != null) {
                            pendingRecoveryText = text
                            localRecoveryView = SnapshotChoice.recoveryView(
                                CloudSync.summaryOf(peeked, SyncSource.LOCAL),
                                pack,
                            )
                            pendingConflict = null
                            cloudConflictView = null
                            publishTitle(hasSave = true)
                            return null
                        }
                    }
                    rotateOnNextSave = false
                    _messages.tryEmit("Recovered your previous save")
                }
                return Restored(decoded.state, decoded.savedAtEpochMs)
            } catch (e: NewerSaveException) {
                throw e // never overwrite a save from a newer app
            } catch (e: Exception) {
                if (label == "latest") latestCorrupt = true
                Log.w(TAG, "Save '$label' unusable: ${e.message}")
            }
        }
        return Restored(GameState.newGame(pack, START_HARBOR, Random.nextInt()), null)
    }

    /** Called from Activity.onStart. No-ops until a harbor simulation is on screen. */
    fun resume() {
        // Phase 28: reclaim USAGE_GAME focus when returning to the foreground.
        audio.requestFocus()
        // Phase 25: flush offline cloud queue on app resume.
        flushCloudOfflineQueue()
        // Phase 26: resume consent-gated analytics session.
        if (settings.analyticsConsent) AnalyticsBus.shared.onSessionStart()
        if (loopJob?.isActive == true) return
        loopJob = viewModelScope.launch(simDispatcher) {
            if (sim != null && _ui.value is GameUiState.Ready) {
                applyPendingOffline(System.currentTimeMillis())
                publish(force = true)
            }
            val clock = FixedStepClock()
            while (isActive) {
                val s = sim
                if (s != null && _ui.value is GameUiState.Ready && !panelOpen) {
                    applyTapToMove()
                    val ticks = clock.advance(System.nanoTime())
                    repeat(ticks) { step(s) }
                    if (ticks > 0) publish(force = false)
                } else {
                    clock.reset()
                }
                delay(FRAME_DELAY_MS)
            }
        }
    }

    /** Called from Activity.onStop: stop simulating and checkpoint. */
    fun pause() {
        loopJob?.cancel()
        loopJob = null
        enqueueMove(0f, 0f)
        // Phase 26: clean analytics session end (crash-free bookkeeping).
        AnalyticsBus.shared.onSessionEndClean()
        // Phase 28: abandon focus + AtomicFile checkpoint (survives process death).
        audio.abandonFocus()
        simExecutor.execute { save() }
    }

    /**
     * Phase 13: low-memory pressure while Activity may still be visible.
     * Checkpoint AtomicFile slots without tearing down the sim loop (onStop still owns pause).
     */
    fun onTrimMemory(level: Int) {
        if (!AndroidDeviceLifecycle.shouldCheckpointForTrimLevel(level)) return
        Log.i(TAG, "onTrimMemory level=$level → AtomicFile checkpoint")
        simExecutor.execute { save() }
    }

    fun dismissOfflineReport() {
        viewModelScope.launch(simDispatcher) {
            pendingOfflineReport = null
            publish(force = true)
        }
    }

    private fun applyPendingOffline(nowEpochMs: Long) {
        val s = sim ?: return
        val since = lastCheckpointEpochMs ?: return
        val elapsed = nowEpochMs - since
        lastCheckpointEpochMs = nowEpochMs
        var report: OfflineReport? = null
        if (elapsed > 0L) {
            report = applyOffline(s, elapsed)
        }
        pushWallClock(nowEpochMs)
        if (report != null) {
            val enriched = report.copy(
                journalLines = DailyGoalsSystem.journalLines(s.content, s.state, report),
            )
            if (OfflinePolicy.shouldShowSummary(s.content, enriched)) {
                pendingOfflineReport = enriched
                AnalyticsBus.shared.onOfflineClaimed(enriched)
            } else {
                pendingOfflineReport = null
            }
        }
        latestView = s.view()
    }

    private fun pushWallClock(epochMs: Long) {
        val s = sim ?: return
        commands += Command.SyncWallClock(epochMs)
        step(s)
    }

    fun syncWallClock(epochMs: Long = System.currentTimeMillis()) {
        pushWallClock(epochMs)
        viewModelScope.launch(simDispatcher) { publish(force = true) }
    }

    fun claimDailyGoal(objectiveId: String) {
        commands += Command.ClaimDailyGoal(objectiveId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    /** Joystick in screen space: x right, y down, each -1..1. */
    fun setMove(screenX: Float, screenY: Float) {
        if (panelOpen) return
        val active = hypot(screenX.toDouble(), screenY.toDouble()) > 0.01
        stickActive = active
        if (active) tapTarget = null
        enqueueMove(screenX, screenY)
    }

    /**
     * Presentation-only tap-to-move. [xMm]/[zMm] are ground millimetres from [CameraRig.groundFromNdc].
     */
    fun setTapMove(xMm: Int, zMm: Int) {
        if (panelOpen || !settings.tapToMove) return
        stickActive = false
        tapTarget = TapTarget(xMm, zMm)
    }

    private fun applyTapToMove() {
        if (stickActive || panelOpen || !settings.tapToMove) return
        val target = tapTarget ?: return
        val view = latestView ?: return
        val stick = stickFromTapTarget(view.player.xMm, view.player.zMm, target)
        if (stick == null) {
            tapTarget = null
            enqueueMove(0f, 0f)
        } else {
            enqueueMove(stick.sx, stick.sy)
        }
    }

    private fun enqueueMove(screenX: Float, screenY: Float) {
        val (wx, wz) = CameraRig.screenToWorld(screenX, screenY)
        val s = SimConstants.INPUT_SCALE
        val move = Command.Move((wx * s).roundToInt().coerceIn(-s, s), (wz * s).roundToInt().coerceIn(-s, s))
        if (move != lastMove) {
            lastMove = move
            commands += move
        }
    }

    fun setUpgradesOpen(open: Boolean) = setPanelOpen(Panel.UPGRADES, open)
    fun setStaffOpen(open: Boolean) = setPanelOpen(Panel.STAFF, open)
    fun setQuestsOpen(open: Boolean) {
        if (open) syncWallClock(System.currentTimeMillis())
        setPanelOpen(Panel.QUESTS, open)
    }
    fun setContractsOpen(open: Boolean) = setPanelOpen(Panel.CONTRACTS, open)
    fun setMapOpen(open: Boolean) = setPanelOpen(Panel.MAP, open)
    fun setWarehouseOpen(open: Boolean) = setPanelOpen(Panel.WAREHOUSE, open)
    fun setSpeciesBookOpen(open: Boolean) = setPanelOpen(Panel.SPECIES_BOOK, open)
    fun setDashboardOpen(open: Boolean) = setPanelOpen(Panel.DASHBOARD, open)
    fun setPauseOpen(open: Boolean) = setPanelOpen(Panel.PAUSE, open)
    fun setSettingsOpen(open: Boolean) = setPanelOpen(Panel.SETTINGS, open)
    fun setBagOpen(open: Boolean) = setPanelOpen(Panel.BAG, open)
    fun setStationOpen(open: Boolean) = setPanelOpen(Panel.STATION, open)

    /** Opening one panel closes the others. Closing only clears that panel. */
    private fun setPanelOpen(which: Panel, open: Boolean) {
        if (open) openPanel(which) else closePanel(which)
        viewModelScope.launch(simDispatcher) { publish(force = true) }
    }

    private fun openPanel(which: Panel) {
        upgradesOpen = which == Panel.UPGRADES
        staffOpen = which == Panel.STAFF
        questsOpen = which == Panel.QUESTS
        contractsOpen = which == Panel.CONTRACTS
        mapOpen = which == Panel.MAP
        warehouseOpen = which == Panel.WAREHOUSE
        speciesBookOpen = which == Panel.SPECIES_BOOK
        dashboardOpen = which == Panel.DASHBOARD
        pauseOpen = which == Panel.PAUSE
        settingsOpen = which == Panel.SETTINGS
        bagOpen = which == Panel.BAG
        stationOpen = which == Panel.STATION
        tapTarget = null
        stickActive = false
        enqueueMove(0f, 0f)
        // Phase 19: authored UI click when a management panel opens.
        audio.play(SfxCue.UI)
        syncMusicBed()
    }

    private fun closePanel(which: Panel) {
        when (which) {
            Panel.UPGRADES -> upgradesOpen = false
            Panel.STAFF -> staffOpen = false
            Panel.QUESTS -> questsOpen = false
            Panel.CONTRACTS -> contractsOpen = false
            Panel.MAP -> mapOpen = false
            Panel.WAREHOUSE -> warehouseOpen = false
            Panel.SPECIES_BOOK -> speciesBookOpen = false
            Panel.DASHBOARD -> dashboardOpen = false
            Panel.PAUSE -> pauseOpen = false
            Panel.SETTINGS -> settingsOpen = false
            Panel.BAG -> bagOpen = false
            Panel.STATION -> stationOpen = false
        }
        syncMusicBed()
    }

    private fun closeAllPanels() {
        upgradesOpen = false
        staffOpen = false
        questsOpen = false
        contractsOpen = false
        mapOpen = false
        warehouseOpen = false
        speciesBookOpen = false
        dashboardOpen = false
        pauseOpen = false
        settingsOpen = false
        bagOpen = false
        stationOpen = false
        syncMusicBed()
    }

    /** Presentation settings (mute, quality, a11y, cloud). Not part of the parity save. */
    fun updateSettings(
        muted: Boolean = settings.muted,
        musicVolume: Float = settings.musicVolume,
        sfxVolume: Float = settings.sfxVolume,
        hapticsEnabled: Boolean = settings.hapticsEnabled,
        quality: QualityPreset = settings.quality,
        joystickSide: JoystickSide = settings.joystickSide,
        joystickScale: Float = settings.joystickScale,
        tapToMove: Boolean = settings.tapToMove,
        cloudSyncEnabled: Boolean = settings.cloudSyncEnabled,
        showBalanceStrip: Boolean = settings.showBalanceStrip,
        reducedMotion: Boolean = settings.reducedMotion,
        captionsEnabled: Boolean = settings.captionsEnabled,
        hudTextScale: Float = settings.hudTextScale,
        shapeCues: Boolean = settings.shapeCues,
        timingAssist: Boolean = settings.timingAssist,
        analyticsConsent: Boolean = settings.analyticsConsent,
        analyticsConsentDecided: Boolean = settings.analyticsConsentDecided,
        equippedCosmeticId: String? = settings.equippedCosmeticId,
        locale: String = settings.locale,
    ) {
        var next = GameSettings(
            muted = muted,
            musicVolume = GameSettings.clampVolume(musicVolume),
            sfxVolume = GameSettings.clampVolume(sfxVolume),
            hapticsEnabled = hapticsEnabled,
            quality = quality,
            joystickSide = joystickSide,
            joystickScale = GameSettings.clampScale(joystickScale),
            tapToMove = tapToMove,
            cloudSyncEnabled = cloudSyncEnabled,
            showBalanceStrip = showBalanceStrip,
            reducedMotion = reducedMotion,
            captionsEnabled = captionsEnabled,
            hudTextScale = GameSettings.clampHudTextScale(hudTextScale),
            shapeCues = shapeCues,
            timingAssist = timingAssist,
            analyticsConsent = analyticsConsent,
            analyticsConsentDecided = analyticsConsentDecided,
            cloudAccountId = settings.cloudAccountId,
            cloudRefreshToken = settings.cloudRefreshToken,
            equippedCosmeticId = equippedCosmeticId?.takeIf { it.isNotBlank() },
            locale = com.willio.jeanvilma.fishshopping.core.i18n.UiStrings.resolveLocale(locale),
        )
        val enablingCloud = next.cloudSyncEnabled && !settings.cloudSyncEnabled
        if (next.cloudSyncEnabled && !cloud.available) {
            // Still allow the opt-in flag; pushes no-op until Firebase keys are configured.
            _messages.tryEmit("Cloud sync on — configure Firebase keys to link a remote save")
        }
        if (next.cloudSyncEnabled) {
            val (withAccount, _) = cloud.ensureAccount(next)
            next = withAccount
        }
        settings = next
        if (!next.tapToMove) tapTarget = null
        applyAudioSettings()
        applyAnalyticsConsent()
        settingsStore.save(next)
        if (enablingCloud) flushCloudOfflineQueue()
        viewModelScope.launch(simDispatcher) {
            if (_ui.value is GameUiState.Title) {
                val hasSave = (_ui.value as GameUiState.Title).hasSave
                publishTitle(hasSave)
            } else {
                publish(force = true)
            }
        }
    }

    /** Phase 25: answer the title consent gate (or Settings toggle). */
    fun setAnalyticsConsent(consent: Boolean) {
        updateSettings(analyticsConsent = consent, analyticsConsentDecided = true)
    }

    private fun applyAnalyticsConsent() {
        AnalyticsBus.shared.setConsent(settings.analyticsConsent)
        if (settings.analyticsConsent) AnalyticsBus.shared.onSessionStart()
    }

    /** Phase 26: consent-gated analytics dashboard JSON (local rolling counters). */
    fun exportAnalyticsDashboardJson(): String = AnalyticsBus.shared.exportDashboardJson()

    fun hasAnalyticsDashboardAlerts(): Boolean = AnalyticsBus.shared.hasDashboardAlerts()

    /** Phase 19: one-tap Accessibility preset (reduced motion, captions, larger HUD, shapes, timing meter). */
    fun applyAccessibilityPreset() {
        val preset = com.willio.jeanvilma.fishshopping.ui.applyAccessibilityPreset(settings)
        updateSettings(
            muted = preset.muted,
            musicVolume = preset.musicVolume,
            sfxVolume = preset.sfxVolume,
            hapticsEnabled = preset.hapticsEnabled,
            quality = preset.quality,
            joystickSide = preset.joystickSide,
            joystickScale = preset.joystickScale,
            tapToMove = preset.tapToMove,
            cloudSyncEnabled = preset.cloudSyncEnabled,
            showBalanceStrip = preset.showBalanceStrip,
            reducedMotion = preset.reducedMotion,
            captionsEnabled = preset.captionsEnabled,
            hudTextScale = preset.hudTextScale,
            shapeCues = preset.shapeCues,
            timingAssist = preset.timingAssist,
        )
        _messages.tryEmit("Accessibility preset on")
    }

    private fun applyAudioSettings() {
        audio.applyLevels(
            muted = settings.muted,
            musicVolume = settings.musicVolume,
            sfxVolume = settings.sfxVolume,
            hapticsEnabled = settings.hapticsEnabled,
        )
        syncMusicBed()
    }

    /** Finish 2.0 Phase 21: festival/storm beds; ducking unchanged. */
    private fun syncMusicBed() {
        val v = latestView
        val festivalActive = v?.seasonalEvent != null
        val weatherId = v?.weatherId.orEmpty()
        val stormActive = weatherId.contains("rain") || weatherId.contains("gale")
        audio.syncMusicBedFromPanels(stationOpen, festivalActive, stormActive)
    }

    /** Whether a remote backend is configured (Firebase keys). Local play never needs this. */
    fun cloudAvailable(): Boolean = cloud.available

    /** Privacy-safe Stats export (Phase 27). Null when no sim is running. */
    fun exportTelemetryJson(): String? {
        val s = sim ?: return null
        return Telemetry.encode(s.content, s.state)
    }

    /** Content-pack balance knobs dump (Phase 27). */
    fun exportBalanceJson(): String? {
        val pack = content ?: sim?.content ?: return null
        return BalanceExport.encode(pack)
    }

    fun setMachinePaused(stationId: String, paused: Boolean) {
        commands += Command.SetMachinePaused(stationId, paused)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun purchase(upgradeId: String) {
        commands += Command.PurchaseUpgrade(upgradeId, UUID.randomUUID().toString())
        // Management panels pause the world; advance a single tick so the command commits now.
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    /** Phase 6: confirm spend while standing on an expansion plot marker. */
    fun buildPlot(plotId: String) {
        commands += Command.BuildPlot(plotId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun purchaseDecor(decorId: String) {
        commands += Command.PurchaseDecor(decorId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    /** Phase 23 / post-1.0 Phase 1: one-time full-harbor unlock via Play Billing (stub on debug). */
    fun purchaseFullHarborUnlock() {
        viewModelScope.launch {
            when (val result = billing.purchaseFullUnlock(settings.cloudAccountId)) {
                is PurchaseOutcome.Err -> _messages.tryEmit(result.reason)
                is PurchaseOutcome.Ok -> {
                    pendingEntitlements.enqueue(
                        sku = com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem.SKU,
                        purchaseToken = result.purchaseToken,
                        grantsCosmetic = null,
                    )
                    viewModelScope.launch(simDispatcher) {
                        applyStoreOwned(
                            listOf(
                                RestoredEntitlement(
                                    sku = com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem.SKU,
                                    purchaseToken = result.purchaseToken,
                                    grantsCosmetic = null,
                                ),
                            ),
                            announceRestore = false,
                        )
                    }
                }
            }
        }
    }

    /** Phase 23: restore purchases and grant if the store says owned. */
    fun restoreFullHarborUnlock() {
        viewModelScope.launch {
            val (owned, token) = billing.restore(settings.cloudAccountId)
            if (!owned || token.isNullOrBlank()) {
                _messages.tryEmit("No harbor unlock to restore")
                return@launch
            }
            pendingEntitlements.enqueue(
                sku = com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem.SKU,
                purchaseToken = token,
                grantsCosmetic = null,
            )
            viewModelScope.launch(simDispatcher) {
                applyStoreOwned(
                    listOf(
                        RestoredEntitlement(
                            sku = com.willio.jeanvilma.fishshopping.core.progression.FullUnlockSystem.SKU,
                            purchaseToken = token,
                            grantsCosmetic = null,
                        ),
                    ),
                    announceRestore = true,
                )
            }
        }
    }

    /** Phase 24: purchase a power-neutral cosmetic SKU. */
    fun purchaseIapCosmetic(sku: String) {
        viewModelScope.launch {
            when (val result = billing.purchaseCosmetic(sku, settings.cloudAccountId)) {
                is PurchaseOutcome.Err -> _messages.tryEmit(result.reason)
                is PurchaseOutcome.Ok -> {
                    val cosmeticId =
                        com.willio.jeanvilma.fishshopping.core.progression.CosmeticsIapSystem.BY_SKU[sku]?.grantsCosmetic
                    if (cosmeticId == null) {
                        _messages.tryEmit("Unknown cosmetic SKU")
                        return@launch
                    }
                    pendingEntitlements.enqueue(sku, result.purchaseToken, cosmeticId)
                    viewModelScope.launch(simDispatcher) {
                        applyStoreOwned(
                            listOf(RestoredEntitlement(sku, result.purchaseToken, cosmeticId)),
                            announceRestore = false,
                        )
                    }
                }
            }
        }
    }

    /** Phase 24 / post-1.0 Phase 1+3: restore all entitlements (full unlock + cosmetics). */
    fun restorePurchases() {
        viewModelScope.launch {
            val owned = billing.restoreAll(settings.cloudAccountId)
            if (owned.isEmpty() && pendingEntitlements.all().isEmpty()) {
                _messages.tryEmit("No purchases to restore")
                return@launch
            }
            for (row in owned) {
                pendingEntitlements.enqueue(row.sku, row.purchaseToken, row.grantsCosmetic)
            }
            viewModelScope.launch(simDispatcher) {
                applyStoreOwned(owned, announceRestore = true)
            }
        }
    }

    /**
     * Phase 3: store is SoT for paid SKUs — merge restore + pending ledger into the live save,
     * apply only missing flags/receipts, checkpoint, then ack the ledger.
     */
    private suspend fun reconcileEntitlementsFromStore() {
        val owned = runCatching { billing.restoreAll(settings.cloudAccountId) }.getOrDefault(emptyList())
        applyStoreOwned(owned, announceRestore = false)
    }

    private fun applyStoreOwned(owned: List<RestoredEntitlement>, announceRestore: Boolean) {
        val s = sim ?: return
        val storeRows = owned.map {
            EntitlementReconcile.StoreOwned(it.sku, it.purchaseToken, it.grantsCosmetic)
        }
        val merged = EntitlementReconcile.mergeStoreAndPending(storeRows, pendingEntitlements.all())
        val needs = EntitlementReconcile.neededGrants(merged, EntitlementReconcile.snapshotOf(s.state))
        if (needs.isEmpty()) {
            ackSatisfiedPending(s.state.purchaseReceipts.keys)
            if (announceRestore) {
                val n = merged.size
                _messages.tryEmit(
                    if (n == 0) "No purchases to restore"
                    else "Restored $n purchase${if (n == 1) "" else "s"}",
                )
            }
            return
        }
        for (need in needs) {
            pendingEntitlements.enqueue(need.sku, need.purchaseToken, need.cosmeticId)
            val cosmeticId = need.cosmeticId
            if (cosmeticId != null) {
                commands += Command.GrantIapCosmetic(cosmeticId, need.requestId)
            } else {
                commands += Command.GrantFullHarborUnlock(need.requestId)
            }
        }
        step(s)
        publish(force = true)
        save()
        ackSatisfiedPending(s.state.purchaseReceipts.keys)
        if (announceRestore) {
            _messages.tryEmit("Restored ${merged.size} purchase${if (merged.size == 1) "" else "s"}")
        } else if (needs.any { it.cosmeticId == null && it.reason.contains("flag") } && s.state.fullHarborUnlock) {
            _messages.tryEmit("Harbor unlock restored")
        }
    }

    private fun ackSatisfiedPending(receiptIds: Set<String>) {
        pendingEntitlements.ackRequestIds(receiptIds)
    }

    fun repairMachine(stationId: String) {
        commands += Command.RepairMachine(stationId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun takeLoan() {
        commands += Command.TakeLoan(UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun repayLoan() {
        commands += Command.RepayLoan(UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun setCoinGoal(amount: Long) {
        commands += Command.SetCoinGoal(amount)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun hire(roleId: String) {
        commands += Command.HireWorker(roleId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun setWorkerShift(workerId: String, onShift: Boolean) {
        commands += Command.SetWorkerShift(workerId, onShift)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun assignWorkerGear(workerId: String, upgradeId: String) {
        commands += Command.AssignWorkerGear(workerId, upgradeId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun unequipWorkerGear(workerId: String, slotId: String) {
        commands += Command.UnequipWorkerGear(workerId, slotId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun acceptContract(offerId: String) {
        commands += Command.AcceptContract(offerId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun deliverContract(contractId: String) {
        commands += Command.DeliverContract(contractId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun travelToHarbor(harborId: String) {
        commands += Command.TravelToHarbor(harborId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun buyBait(baitId: String) {
        commands += Command.BuyBait(baitId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun selectBait(baitId: String?) {
        commands += Command.SelectBait(baitId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun selectTechnique(techniqueId: String?) {
        commands += Command.SelectTechnique(techniqueId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun trainWorkerBranch(workerId: String, branchId: String) {
        commands += Command.TrainWorkerBranch(workerId, branchId, UUID.randomUUID().toString())
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun selectWorkerBranch(workerId: String, branchId: String?) {
        commands += Command.SelectWorkerBranch(workerId, branchId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun setWorkerSchedule(workerId: String, scheduleId: String?) {
        commands += Command.SetWorkerSchedule(workerId, scheduleId)
        if (panelOpen && pendingOfflineReport == null) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun reel() {
        if (panelOpen) return
        commands += Command.Reel
    }

    /** Cycle Auto → each recipe → Auto for a station (no tick advance). */
    fun cycleStationRecipe(stationId: String) {
        if (pendingOfflineReport != null) return
        if (panelOpen && !stationOpen) return
        viewModelScope.launch(simDispatcher) {
            val s = sim ?: return@launch
            val m = s.state.machines.firstOrNull { it.stationId == stationId } ?: return@launch
            com.willio.jeanvilma.fishshopping.core.production.ProductionSystem
                .cyclePreferredRecipe(s.content, m)
            latestView = s.view()
            publish(force = true)
        }
    }

    private fun step(s: Simulation) {
        val batch = ArrayList<Command>()
        var next = commands.poll()
        while (next != null) {
            batch += next
            next = commands.poll()
        }
        val events = s.step(batch)
        AnalyticsBus.shared.onGameEvents(events, s.state)
        var transaction = false
        val transferred = ArrayList<GameEvent.ItemsTransferred>()
        val payCustomers = ArrayList<String>()
        val machineDone = ArrayList<String>()
        var celebrate = false
        var catchCount = 0
        var achievementBurst = false
        var festivalBurst = false
        var contractDoneBurst = false
        var goalClaimBurst = false
        for (e in events) {
            sfxFromEvent(e)?.let { audio.play(it) }
            when (e) {
                is GameEvent.ItemsTransferred -> transferred += e
                is GameEvent.BatchCompleted -> {
                    machineDone += e.stationId
                    pendingShakes.offer(ShakeKind.CUT)
                }
                is GameEvent.SaleCommitted -> {
                    val tip = when {
                        e.tipped && e.preferenceMet -> " Premium tip!"
                        !e.preferenceMet -> " (substituted)"
                        else -> ""
                    }
                    _messages.tryEmit("+${e.coins} coins$tip")
                    payCustomers += e.customerId
                    pendingShakes.offer(ShakeKind.SALE)
                    transaction = true
                }
                is GameEvent.FishCaught -> {
                    catchCount += 1
                    pendingShakes.offer(ShakeKind.CATCH)
                    if (e.personalBest) {
                        val name = s.content.itemName(e.speciesId)
                        _messages.tryEmit("New trophy: $name · ${e.sizePermille}%")
                        celebrate = true
                        transaction = true
                    } else if (e.timingBonus) {
                        val tip = s.content.speciesById[e.speciesId]?.baseValue ?: 0L
                        _messages.tryEmit("Perfect reel! +$tip")
                        celebrate = true
                        transaction = true
                    }
                    if (e.rareUpgrade) {
                        _messages.tryEmit("Rare catch: ${s.content.speciesById[e.speciesId]?.name ?: e.speciesId}")
                        celebrate = true
                        transaction = true
                    }
                }
                is GameEvent.TrophySetCompleted -> {
                    val setName = s.content.trophySetsById[e.setId]?.name ?: e.setId
                    _messages.tryEmit("Gallery complete: $setName")
                    celebrate = true
                    transaction = true
                }
                is GameEvent.CoinGoalReached -> {
                    _messages.tryEmit("Coin goal reached!")
                    celebrate = true
                    transaction = true
                }
                is GameEvent.FishingSpotDepleted -> {
                    _messages.tryEmit("Pier empty — fish are returning")
                    transaction = true
                }
                is GameEvent.RushStarted -> {
                    _messages.tryEmit("${e.name}!")
                    celebrate = true
                    transaction = true
                }
                is GameEvent.MachineIdleAlert -> {
                    val name = s.content.machinesById[e.machineId]?.name ?: e.stationId
                    _messages.tryEmit("$name: ${e.reason}")
                    transaction = true
                }
                is GameEvent.UpgradePurchased -> if (!e.replayed) {
                    _messages.tryEmit("Bought ${s.content.upgradesById[e.upgradeId]?.name ?: e.upgradeId}")
                    transaction = true
                }
                is GameEvent.FullHarborUnlockGranted -> if (!e.replayed) {
                    _messages.tryEmit("All harbors unlocked")
                    transaction = true
                }
                is GameEvent.IapCosmeticGranted -> if (!e.replayed) {
                    _messages.tryEmit("Unlocked ${e.cosmeticId}")
                    transaction = true
                }
                is GameEvent.IapCosmeticRejected -> {
                    _messages.tryEmit(e.reason)
                    transaction = true
                }
                is GameEvent.PurchaseRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.WorkerHired -> if (!e.replayed) {
                    _messages.tryEmit("Hired ${s.content.workersById[e.roleId]?.name ?: e.roleId}")
                    transaction = true
                }
                is GameEvent.WorkerLeveledUp -> {
                    val name = s.content.workersById[e.roleId]?.name ?: e.roleId
                    _messages.tryEmit("$name reached level ${e.level}")
                }
                is GameEvent.WorkerShiftChanged -> {
                    val name = s.content.workersById[e.roleId]?.name ?: e.roleId
                    _messages.tryEmit(if (e.onShift) "$name on shift" else "$name off shift")
                }
                is GameEvent.HireRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.WagesPaid -> {
                    _messages.tryEmit("Paid ${e.coins} coins in wages")
                    transaction = true
                }
                is GameEvent.QuestCompleted -> {
                    val name = s.content.questsById[e.questId]?.name ?: e.questId
                    val tip = buildString {
                        append("Goal complete: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    _messages.tryEmit(tip)
                    transaction = true
                }
                is GameEvent.PrestigeUnlocked -> {
                    val name = s.content.prestigeMilestonesById[e.prestigeId]?.name ?: e.prestigeId
                    val tip = buildString {
                        append("Prestige: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    _messages.tryEmit(tip)
                    transaction = true
                }
                is GameEvent.AchievementUnlocked -> {
                    val name = s.content.achievementsById[e.achievementId]?.name ?: e.achievementId
                    val tip = buildString {
                        append("Achievement: $name")
                        if (e.coinsRewarded > 0) append(" (+${e.coinsRewarded})")
                    }
                    _messages.tryEmit(tip)
                    achievementBurst = true
                    transaction = true
                }
                is GameEvent.SeasonalEventStarted -> {
                    _messages.tryEmit("${e.name}!")
                    festivalBurst = true
                    transaction = true
                }
                is GameEvent.WeatherChanged -> _messages.tryEmit("Weather: ${e.name}")
                is GameEvent.TideChanged -> _messages.tryEmit("Tide: ${e.name}")
                is GameEvent.MasteryLevelUp -> {
                    val name = s.content.speciesById[e.speciesId]?.name ?: e.speciesId
                    _messages.tryEmit("Mastery: $name Lv ${e.level}")
                }
                is GameEvent.WorkerBranchUnlocked -> {
                    val name = s.content.staffBranchesById[e.branchId]?.name ?: e.branchId
                    _messages.tryEmit("Unlocked $name")
                }
                is GameEvent.WorkerBranchTrainRejected -> {
                    _messages.tryEmit(e.reason)
                    transaction = true
                }
                is GameEvent.ContractAccepted -> if (!e.replayed) {
                    _messages.tryEmit("Contract accepted")
                    transaction = true
                }
                is GameEvent.ContractCompleted -> {
                    _messages.tryEmit("Contract complete +${e.payout}")
                    contractDoneBurst = true
                    transaction = true
                }
                is GameEvent.ContractFailed -> {
                    _messages.tryEmit(
                        if (e.penaltyPaid > 0) "Contract failed −${e.penaltyPaid}" else "Contract failed",
                    )
                    transaction = true
                }
                is GameEvent.ContractRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.DailyGoalClaimed -> if (!e.replayed) {
                    val name = s.content.dailyObjectivesById[e.objectiveId]?.name ?: e.objectiveId
                    _messages.tryEmit("Daily claimed: $name (+${e.payout})")
                    goalClaimBurst = true
                    transaction = true
                }
                is GameEvent.DailyGoalRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.HarborTraveled -> if (!e.replayed) {
                    val name = s.content.harborsById[e.toHarborId]?.name ?: e.toHarborId
                    _messages.tryEmit("Traveled to $name")
                    mapOpen = false
                    flyingTransfers.clear()
                    worldBursts.clear()
                    pendingShakes.clear()
                    transaction = true
                }
                is GameEvent.TravelRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.MaintenancePaid -> {
                    _messages.tryEmit("Upkeep −${e.coins} coins")
                    transaction = true
                }
                is GameEvent.ItemsSpoiled -> {
                    val n = e.items.sumOf { it.quantity }
                    val where = if (e.location == "bag") "in bag" else "on counter"
                    _messages.tryEmit("Spoiled $n $where")
                    transaction = true
                }
                is GameEvent.CheckpointRequested -> save()
                else -> Unit
            }
        }
        latestView = s.view()
        syncMusicBed()
        val view = latestView
        if (view != null) {
            for (e in transferred) {
                resolveFlyingTransfer(view, e.from, e.to, e.itemId)?.let { flyingTransfers.offer(it) }
            }
            repeat(catchCount) { worldBursts.offer(resolveCatchBurst(view)) }
            for (customerId in payCustomers) worldBursts.offer(resolvePayBurst(view, customerId))
            for (stationId in machineDone) {
                resolveMachineDoneBurst(view, stationId)?.let { worldBursts.offer(it) }
            }
            if (celebrate) {
                worldBursts.offer(resolveCelebrateBurst(view))
                pendingShakes.offer(ShakeKind.CELEBRATE)
            }
            // Finish 2.0 Phase 22 — weather/festival/achievement visual juice (shared burst pool).
            if (achievementBurst) {
                worldBursts.offer(resolveAchievementBurst(view))
                pendingShakes.offer(ShakeKind.ACHIEVEMENT)
            }
            if (festivalBurst) {
                worldBursts.offer(resolveFestivalBurst(view))
                pendingShakes.offer(ShakeKind.FESTIVAL)
            }
            if (contractDoneBurst) worldBursts.offer(resolveContractDoneBurst(view))
            if (goalClaimBurst) worldBursts.offer(resolveGoalClaimBurst(view))
        }
        if (transaction) publish(force = true)
    }

    /** Encodes on the sim thread (one consistent tick), writes on the IO thread. */
    private fun save() {
        val s = sim ?: return
        if (!allowSaving) return
        val now = System.currentTimeMillis()
        lastCheckpointEpochMs = now
        val text = SnapshotCodec.encode(s.content, s.state, savedAtEpochMs = now)
        val rotate = rotateOnNextSave
        rotateOnNextSave = true
        val syncSettings = settings
        ioExecutor.execute {
            runCatching { store.write(text, rotate) }.onFailure { Log.e(TAG, "Save failed", it) }
            val pushed = cloud.push(syncSettings, text)
            applyCloudPushResult(pushed)
            if (pushed.queued || cloud.hasPendingOfflinePush()) {
                val flushed = cloud.flushOfflineQueue(settings)
                applyCloudPushResult(flushed)
            }
        }
    }

    /** Phase 25: apply auth session updates from a cloud push/flush. */
    private fun applyCloudPushResult(pushed: com.willio.jeanvilma.fishshopping.cloud.CloudPushResult) {
        val next = pushed.settings
        if (
            next.cloudAccountId != settings.cloudAccountId ||
            next.cloudRefreshToken != settings.cloudRefreshToken
        ) {
            settings = next
            settingsStore.save(next)
        }
    }

    /** Phase 25: flush offline cloud queue (resume / settings enable). */
    fun flushCloudOfflineQueue() {
        if (!settings.cloudSyncEnabled) return
        ioExecutor.execute {
            val flushed = cloud.flushOfflineQueue(settings)
            applyCloudPushResult(flushed)
        }
    }

    private fun publish(force: Boolean) {
        val s = sim ?: return
        val now = System.nanoTime()
        if (!force && now - lastHudPublishNanos < HUD_PUBLISH_INTERVAL_NANOS) return
        lastHudPublishNanos = now
        val v = latestView ?: s.view().also { latestView = it }
        _ui.value = GameUiState.Ready(
            view = v,
            upgradesOpen = upgradesOpen,
            staffOpen = staffOpen,
            questsOpen = questsOpen,
            contractsOpen = contractsOpen,
            mapOpen = mapOpen,
            warehouseOpen = warehouseOpen,
            speciesBookOpen = speciesBookOpen,
            dashboardOpen = dashboardOpen,
            pauseOpen = pauseOpen,
            settingsOpen = settingsOpen,
            bagOpen = bagOpen,
            stationOpen = stationOpen,
            offlineReport = pendingOfflineReport,
            settings = settings,
        )
    }

    override fun onCleared() {
        runCatching { connectivityManager.unregisterNetworkCallback(networkCallback) }
        AnalyticsBus.shared.onSessionEndClean()
        // Phase 28 process death / Activity finish: release focus, then flush final save.
        audio.abandonFocus()
        // shutdown() lets queued work (the final save) finish; no new work is accepted.
        // Wait briefly for the sim thread so its final save is handed to the IO thread first.
        simExecutor.shutdown()
        simExecutor.awaitTermination(500, TimeUnit.MILLISECONDS)
        ioExecutor.shutdown()
    }

    private enum class Panel {
        UPGRADES, STAFF, QUESTS, CONTRACTS, MAP, WAREHOUSE, SPECIES_BOOK, DASHBOARD, PAUSE, SETTINGS, BAG, STATION,
    }

    private companion object {
        const val TAG = "FishShopping"
        const val CONTENT_ASSET = "content-pack.json"
        const val START_HARBOR = "harbor.sunrise_pier"
        const val FRAME_DELAY_MS = 8L
        const val HUD_PUBLISH_INTERVAL_NANOS = 100_000_000L
    }
}
