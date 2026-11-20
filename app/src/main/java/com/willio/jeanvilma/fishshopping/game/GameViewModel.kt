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
import com.willio.jeanvilma.fishshopping.billing.EntitlementBillings
import com.willio.jeanvilma.fishshopping.billing.PendingEntitlementLedger
import com.willio.jeanvilma.fishshopping.billing.PurchaseOutcome
import com.willio.jeanvilma.fishshopping.billing.RestoredEntitlement
import com.willio.jeanvilma.fishshopping.core.lifecycle.AndroidDeviceLifecycle
import com.willio.jeanvilma.fishshopping.core.progression.EntitlementReconcile
import com.willio.jeanvilma.fishshopping.cloud.CloudSyncCoordinator
import com.willio.jeanvilma.fishshopping.core.content.BalanceExport
import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.ship.LoadtestBanks
import com.willio.jeanvilma.fishshopping.core.persistence.CloudConflictOffer
import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.NewerSaveException
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.FixedStepClock
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.deeplink.DeepLinkRoutes
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId
import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelController
import com.willio.jeanvilma.fishshopping.core.shell.ShellModalPolicy
import com.willio.jeanvilma.fishshopping.core.shell.ShellHudPolicy
import com.willio.jeanvilma.fishshopping.core.shell.OfflineShell
import com.willio.jeanvilma.fishshopping.game.vm.VmEconomyIntents
import com.willio.jeanvilma.fishshopping.game.vm.VmFishingIntents
import com.willio.jeanvilma.fishshopping.game.vm.VmIapIntentHost
import com.willio.jeanvilma.fishshopping.game.vm.VmIapIntents
import com.willio.jeanvilma.fishshopping.game.vm.VmShellIntentHost
import com.willio.jeanvilma.fishshopping.game.vm.VmShellIntents
import com.willio.jeanvilma.fishshopping.game.vm.VmStationIntentHost
import com.willio.jeanvilma.fishshopping.game.vm.VmTravelIntentHost
import com.willio.jeanvilma.fishshopping.game.vm.VmTravelIntents
import com.willio.jeanvilma.fishshopping.game.vm.VmStepBus
import com.willio.jeanvilma.fishshopping.game.vm.VmStepSink
import com.willio.jeanvilma.fishshopping.game.vm.VmCloudBoot
import com.willio.jeanvilma.fishshopping.game.vm.VmCloudBootHost
import com.willio.jeanvilma.fishshopping.game.vm.VmRestored
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.Telemetry
import com.willio.jeanvilma.fishshopping.core.sim.applyOffline
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.JoystickSide
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.persistence.ThemePreference
import com.willio.jeanvilma.fishshopping.persistence.SettingsStore
import com.willio.jeanvilma.fishshopping.persistence.SnapshotStore
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.ShakeKind
import com.willio.jeanvilma.fishshopping.render.WorldBurstCue
import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice5
import com.willio.jeanvilma.fishshopping.core.ship.VfxJuice6
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

/**
 * Hosts the canonical simulation on one dedicated thread (blueprint "Concurrency").
 * The UI sends intent as [Command]s; it never mutates game state directly.
 *
 * Finish 4.0 Phase 4: shell / economy / travel / IAP intents live under game/vm/.
 * - The renderer reads [latestView] every frame (updated every tick).
 * - The HUD observes [ui], published ~10 times per second and immediately after transactions.
 * - One-off feedback (coins earned, rejected purchases) goes through [messages].
 */
class GameViewModel(app: Application) :
    AndroidViewModel(app),
    VmShellIntentHost,
    VmTravelIntentHost,
    VmStationIntentHost,
    VmIapIntentHost,
    VmStepSink,
    VmCloudBootHost {

    // Finish 4.0 Phase 4 — intent modules (shell / economy / travel / IAP).
    private val shellIntents = VmShellIntents(this)
    private val economyIntents = VmEconomyIntents(this)
    private val fishingIntents = VmFishingIntents(this)
    private val travelIntents = VmTravelIntents(this, shellIntents)
    private val iapIntents = VmIapIntents(this)


    private val simExecutor = Executors.newSingleThreadExecutor { Thread(it, "fish-sim") }
    private val simDispatcher = simExecutor.asCoroutineDispatcher()
    // Plain executors (not viewModelScope) so a final save still completes while the ViewModel is cleared.
    private val ioExecutor = Executors.newSingleThreadExecutor { Thread(it, "fish-save") }
    override val store = SnapshotStore(app.filesDir)
    override val settingsStore = SettingsStore(app)
    override val audio = AudioBus(app)
    override val cloud = CloudSyncCoordinator(app)
    override val billing = EntitlementBillings.create(app)
    override val pendingEntitlements = PendingEntitlementLedger(app)

    private val _ui = MutableStateFlow<GameUiState>(GameUiState.Loading)
    val ui: StateFlow<GameUiState> = _ui

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val messages: SharedFlow<String> = _messages

    @Volatile
    override var latestView: SimView? = null

    /** Presentation-only flying transfer cues for the harbor renderer (drained each frame). */
    override val flyingTransfers = ConcurrentLinkedQueue<FlyingTransferCue>()
    /** Phase 16/21 world bursts (catch / pay / celebrate / machine_done). */
    override val worldBursts = ConcurrentLinkedQueue<WorldBurstCue>()
    /** Phase 21 screen-shake kinds (drained each frame by the renderer). */
    override val pendingShakes = ConcurrentLinkedQueue<ShakeKind>()

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
    /** Finish 3.0 Phase 20 — deep link queued until Ready after boot. */
    private var pendingDeepLink: DeepLinkRoutes.Intent? = null
    @Volatile
    override var settings: GameSettings = settingsStore.load()
    private var allowSaving = true
    /** False after recovering from the backup, so the corrupt latest never overwrites it. */
    override var rotateOnNextSave = true
    private var lastHudPublishNanos = 0L

    override val panels = ShellPanelController()
    private var lastMove = Command.Move(0, 0)
    private var loopJob: Job? = null
    /** Wall clock of the last checkpoint; used for offline catch-up on resume/load. */
    private var lastCheckpointEpochMs: Long? = null
    private var pendingOfflineReport: OfflineReport? = null
    /** Phase 11: parked dual-snapshot choice (texts kept until the player picks). */
    override var pendingConflict: CloudConflictOffer? = null
    override var cloudConflictView: CloudConflictView? = null
    /** Phase 11: parked corrupt-latest → previous recovery. */
    override var pendingRecoveryText: String? = null
    override var localRecoveryView: LocalRecoveryView? = null
    /** Presentation-only tap-to-move destination (cleared by stick/keys or on arrival). */
    @Volatile
    private var tapTarget: TapTarget? = null
    /** True while joystick/keyboard is holding a non-zero stick. */
    @Volatile
    private var stickActive = false

    private val panelOpen get() = worldHold || ShellModalPolicy.blocksWorldInput(
        panels.snapshot(),
        pendingOfflineReport != null,
    )

    /** Cozy art pass 5: photo / decorate modes freeze the world without opening a shell panel. */
    @Volatile private var worldHold = false

    fun setWorldHold(on: Boolean) {
        if (on) setMove(0f, 0f)
        worldHold = on
    }

    /** Why [decorId] cannot stand at (x, z) mm right now, or null if it can (presentation preview). */
    fun decorPlacementProblem(decorId: String, xMm: Int, zMm: Int): String? {
        val s = sim ?: return "Loading"
        return com.willio.jeanvilma.fishshopping.core.world.DecorSystem.placementProblem(s.content, s.state, decorId, xMm, zMm)
    }

    fun placeDecor(decorId: String, xMm: Int, zMm: Int, rotationQuarter: Int) =
        commitNow(Command.PlaceDecor(decorId, xMm, zMm, rotationQuarter))

    fun storeDecor(decorId: String) = commitNow(Command.StoreDecor(decorId))

    /** Apply one command immediately even while the world is held (decorating). */
    private fun commitNow(command: Command) {
        commands += command
        viewModelScope.launch(simDispatcher) { sim?.let { step(it); publish(force = true) } }
    }


    // --- Finish 4.0 Phase 4 intent-host surface ---
    override fun enqueueCommand(command: Command) {
        commands += command
    }

    override fun enqueuePanelCommand(command: Command) {
        commands += command
        if (ShellModalPolicy.shouldCommitPanelCommand(panels.snapshot(), pendingOfflineReport != null)) {
            viewModelScope.launch(simDispatcher) {
                sim?.let { step(it); publish(force = true) }
            }
        }
    }

    override fun launchSim(block: suspend () -> Unit) {
        viewModelScope.launch(simDispatcher) { block() }
    }

    override fun launchMain(block: suspend () -> Unit) {
        viewModelScope.launch { block() }
    }

    override fun emitMessage(text: String) {
        _messages.tryEmit(text)
    }

    override fun panelBlocksWorld(): Boolean = panelOpen

    override fun hasPendingOffline(): Boolean = pendingOfflineReport != null

    override fun isPanelOpen(id: ShellPanelId): Boolean = panels.isOpen(id)

    override fun syncWallClockNow() = syncWallClock(System.currentTimeMillis())

    override fun cloudAccountId(): String? = settings.cloudAccountId

    override fun travelToHarbor(harborId: String) = travelIntents.travelToHarbor(harborId)

    override fun continueGameFromTitle() = continueGame()

    override fun isReadyWithSim(): Boolean = _ui.value is GameUiState.Ready && sim != null

    override fun launchSimConsume(block: suspend () -> Unit) = launchSim(block)

    override fun withSimOnSimThread(block: suspend (Simulation) -> Unit) {
        viewModelScope.launch(simDispatcher) {
            val s = sim ?: return@launch
            block(s)
            latestView = s.view()
            publish(force = true)
        }
    }

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

    /** Latest probe of the shared ~90MB loadtest banks (null if assets missing). */
    @Volatile
    private var loadtestProbes: Pair<LoadtestBanks.Probe, LoadtestBanks.Probe>? = null

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
            syncDailyGoalReminders()
            loadtestProbes = probeLoadtestBanks()
            publishTitle(store.readCandidates().isNotEmpty())
        } catch (e: NewerSaveException) {
            allowSaving = false
            _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start", e)
            _ui.value = GameUiState.Failed("Could not load game content: ${e.message}")
        }
    }

    /** Header/size probe of packaged loadtest banks (does not parse the full ~90MB). */
    fun loadtestBankProbes(): Pair<LoadtestBanks.Probe, LoadtestBanks.Probe>? = loadtestProbes

    private fun probeLoadtestBanks(): Pair<LoadtestBanks.Probe, LoadtestBanks.Probe>? = try {
        val assets = getApplication<Application>().assets
        val save = probeAssetBank(assets, LoadtestBanks.SAVE_ASSET, LoadtestBanks.SAVE_SCHEMA)
        val tele = probeAssetBank(assets, LoadtestBanks.TELEMETRY_ASSET, LoadtestBanks.TELEMETRY_SCHEMA)
        val floors = save.floorsMet && tele.floorsMet
        Log.i(TAG, "Loadtest banks ready save=${save.bytes} tele=${tele.bytes} floors=$floors")
        // Finish 6.0 Phase 26 — nest analytics + loadtest probe telemetry.
        AnalyticsBus.shared.onLoadtestBankProbed("save", save.floorsMet)
        AnalyticsBus.shared.onLoadtestBankProbed("telemetry", tele.floorsMet)
        AnalyticsBus.shared.onLoadtestBankProbed("dual", floors)
        save to tele
    } catch (e: Exception) {
        Log.w(TAG, "Loadtest banks not packaged or unreadable", e)
        null
    }

    private fun probeAssetBank(
        assets: android.content.res.AssetManager,
        asset: String,
        expectedSchema: String,
    ): LoadtestBanks.Probe = try {
        assets.openFd(asset).use { fd ->
            fd.createInputStream().use { stream ->
                LoadtestBanks.probeStream(asset, fd.length, stream, expectedSchema)
            }
        }
    } catch (_: Exception) {
        // Compressed asset fallback: header-only probe with known floor size.
        assets.open(asset).use { stream ->
            LoadtestBanks.probeStream(asset, LoadtestBanks.MIN_BYTES, stream, expectedSchema)
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
        flushPendingDeepLink()
    }

    /**
     * Finish 3.0 Phase 20 — apply App Link / custom-scheme intent.
     * Queues until Ready; soft auto-continues from Title when a save exists.
     */
    fun applyDeepLink(intent: DeepLinkRoutes.Intent) {
        val title = _ui.value as? GameUiState.Title
        val canAuto = title != null &&
            title.hasSave &&
            title.cloudConflict == null &&
            title.localRecovery == null &&
            !booting
        travelIntents.applyDeepLink(intent, canAuto) { pendingDeepLink = it }
    }

    private fun flushPendingDeepLink() {
        val pending = pendingDeepLink ?: return
        pendingDeepLink = null
        if (!pending.isEmpty) consumeDeepLink(pending)
    }

    private fun consumeDeepLink(intent: DeepLinkRoutes.Intent) {
        travelIntents.consumeDeepLink(intent)
    }

    override fun publishTitle(hasSave: Boolean) {
        _ui.value = GameUiState.Title(
            hasSave = hasSave,
            cloudConflict = cloudConflictView,
            localRecovery = localRecoveryView,
            settings = settings,
        )
        // Finish 3.0 Phase 20 — App Link may arrive during Loading; continue once Title is up.
        if (pendingDeepLink != null &&
            hasSave &&
            cloudConflictView == null &&
            localRecoveryView == null &&
            !booting
        ) {
            continueGame()
        }
    }

    /** Block until saves queued before this call have been written. */
    private fun awaitQueuedSaves() {
        val done = CountDownLatch(1)
        ioExecutor.execute { done.countDown() }
        runCatching { done.await(2, TimeUnit.SECONDS) }
    }

    private fun restoreOrCreate(pack: ContentPack): VmRestored? =
        VmCloudBoot.restoreOrCreate(this, pack, START_HARBOR)


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
            val pending = OfflineShell.decidePendingReport(s.content, s.state, report)
            pendingOfflineReport = pending
            if (pending != null) AnalyticsBus.shared.onOfflineClaimed(pending)
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

    fun claimDailyGoal(objectiveId: String) = economyIntents.claimDailyGoal(objectiveId)

    fun claimWeeklyGoal(objectiveId: String) = economyIntents.claimWeeklyGoal(objectiveId)

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

    fun setUpgradesOpen(open: Boolean) = shellIntents.setUpgradesOpen(open)
    fun setStaffOpen(open: Boolean) = shellIntents.setStaffOpen(open)
    fun setQuestsOpen(open: Boolean) = shellIntents.setQuestsOpen(open)
    fun setContractsOpen(open: Boolean) = shellIntents.setContractsOpen(open)
    fun setMapOpen(open: Boolean) = shellIntents.setMapOpen(open)
    fun setWarehouseOpen(open: Boolean) = shellIntents.setWarehouseOpen(open)
    fun setSpeciesBookOpen(open: Boolean) = shellIntents.setSpeciesBookOpen(open)
    fun setDashboardOpen(open: Boolean) = shellIntents.setDashboardOpen(open)
    fun setPauseOpen(open: Boolean) = shellIntents.setPauseOpen(open)
    fun setSettingsOpen(open: Boolean) = shellIntents.setSettingsOpen(open)
    fun setBagOpen(open: Boolean) = shellIntents.setBagOpen(open)
    fun setStationOpen(open: Boolean) = shellIntents.setStationOpen(open)

    /** Opening one panel closes the others. Closing only clears that panel. */
    override fun setPanelOpen(which: ShellPanelId, open: Boolean) {
        if (open) {
            panels.open(which)
            tapTarget = null
            stickActive = false
            enqueueMove(0f, 0f)
            // Phase 19: authored UI click when a management panel opens.
            audio.play(SfxCue.UI)
        } else {
            panels.close(which)
        }
        syncMusicBed()
        viewModelScope.launch(simDispatcher) { publish(force = true) }
    }

    private fun closeAllPanels() {
        panels.closeAll()
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
        themePreference: ThemePreference = settings.themePreference,
        dailyGoalRemindersEnabled: Boolean = settings.dailyGoalRemindersEnabled,
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
            themePreference = themePreference,
            dailyGoalRemindersEnabled = dailyGoalRemindersEnabled,
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
        syncDailyGoalReminders()
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

    /** Finish 3.0 Phase 18 — keep local daily-goal reminder alarm in sync with settings + board. */
    fun syncDailyGoalReminders() {
        val unclaimed = when (val ui = _ui.value) {
            is GameUiState.Ready -> ui.view.dailyGoals.count { !it.claimed }
            else -> 0
        }
        com.willio.jeanvilma.fishshopping.push.DailyGoalReminderScheduler.sync(
            getApplication(),
            settings.dailyGoalRemindersEnabled,
            unclaimed,
        )
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

    /** Finish 2.0/3.0/4.0/5.0/6.0: festival/storm/rival/night/endgame/ledger/pressure/nest beds; ducking unchanged. */
    override fun syncMusicBed() {
        val v = latestView
        val festivalActive = v?.seasonalEvent != null
        val weatherId = v?.weatherId.orEmpty()
        val stormActive = weatherId.contains("rain") || weatherId.contains("gale")
        val rivalActive = v?.rivalPressureActive == true || (v?.activeRivalIds?.isNotEmpty() == true)
        val tide = v?.tidePhaseId.orEmpty()
        val nightActive = tide == "night" || tide == "dusk"
        val endgameActive = v?.endgameUnlocked == true
        val ledgerActive = (v?.bank?.loanOwed ?: 0L) > 0L
        val pressureActive =
            (v?.bagSpoilPressurePermille ?: 0) > VfxJuice5.CRITICAL_PERMILLE ||
                (v?.serviceQueuePressurePermille ?: 0) >= VfxJuice5.RISING_PERMILLE ||
                ((v?.ticksUntilNearestContractDeadline ?: Int.MAX_VALUE) <= VfxJuice5.CONTRACT_DEADLINE_WARN_TICKS) ||
                ((v?.nextQuestProgressPermille ?: 0) >= VfxJuice5.QUEST_NEAR_COMPLETE_PERMILLE)
        val placements = v?.decorPlacements?.size ?: 0
        val nestActive =
            placements >= VfxJuice6.SETTLED_MIN_PLACEMENTS ||
                (nightActive && placements >= VfxJuice6.ROOSTING_MIN_PLACEMENTS)
        audio.syncMusicBedFromPanels(
            panels.isOpen(ShellPanelId.STATION),
            festivalActive,
            stormActive,
            rivalActive,
            nightActive,
            endgameActive,
            ledgerActive,
            pressureActive,
            nestActive,
        )
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

    fun setMachinePaused(stationId: String, paused: Boolean) =
        economyIntents.setMachinePaused(stationId, paused)

    fun purchase(upgradeId: String) = economyIntents.purchase(upgradeId)

    /** Phase 6: confirm spend while standing on an expansion plot marker. */
    fun buildPlot(plotId: String) = economyIntents.buildPlot(plotId)

    fun purchaseDecor(decorId: String) = economyIntents.purchaseDecor(decorId)

    /** Phase 23 / post-1.0 Phase 1: one-time full-harbor unlock via Play Billing (stub on debug). */
    fun purchaseFullHarborUnlock() = iapIntents.purchaseFullHarborUnlock()

    /** Phase 23: restore purchases and grant if the store says owned. */
    fun restoreFullHarborUnlock() = iapIntents.restoreFullHarborUnlock()

    /** Phase 24: purchase a power-neutral cosmetic SKU. */
    fun purchaseIapCosmetic(sku: String) = iapIntents.purchaseIapCosmetic(sku)

    /** Phase 24 / post-1.0 Phase 1+3: restore all entitlements (full unlock + cosmetics). */
    fun restorePurchases() = iapIntents.restorePurchases()

    /**
     * Phase 3: store is SoT for paid SKUs — merge restore + pending ledger into the live save,
     * apply only missing flags/receipts, checkpoint, then ack the ledger.
     */
    private suspend fun reconcileEntitlementsFromStore() {
        val owned = runCatching { billing.restoreAll(settings.cloudAccountId) }.getOrDefault(emptyList())
        applyStoreOwned(owned, announceRestore = false)
    }

    override fun applyStoreOwned(owned: List<RestoredEntitlement>, announceRestore: Boolean) {

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

    fun repairMachine(stationId: String) = economyIntents.repairMachine(stationId)

    fun takeLoan(productId: String? = null) = economyIntents.takeLoan(productId)

    fun repayLoan() = economyIntents.repayLoan()

    fun setCoinGoal(amount: Long) = economyIntents.setCoinGoal(amount)

    fun hire(roleId: String) = economyIntents.hire(roleId)

    fun setWorkerShift(workerId: String, onShift: Boolean) =
        economyIntents.setWorkerShift(workerId, onShift)

    fun assignWorkerGear(workerId: String, upgradeId: String) =
        economyIntents.assignWorkerGear(workerId, upgradeId)

    fun unequipWorkerGear(workerId: String, slotId: String) =
        economyIntents.unequipWorkerGear(workerId, slotId)

    fun acceptContract(offerId: String) = economyIntents.acceptContract(offerId)

    fun deliverContract(contractId: String) = economyIntents.deliverContract(contractId)

    fun buyBait(baitId: String) = fishingIntents.buyBait(baitId)

    fun selectBait(baitId: String?) = fishingIntents.selectBait(baitId)

    fun selectTechnique(techniqueId: String?) = fishingIntents.selectTechnique(techniqueId)

    /** Finish 5.0 Phase 4 — loop HUD snapshot from latest SimView. */
    fun loopHudSnapshot(): LoopHudSnapshot? {
        val view = latestView ?: return null
        return LoopHudSnapshot.from(view)
    }

    fun trainWorkerBranch(workerId: String, branchId: String) =
        economyIntents.trainWorkerBranch(workerId, branchId)

    fun selectWorkerBranch(workerId: String, branchId: String?) =
        economyIntents.selectWorkerBranch(workerId, branchId)

    fun setWorkerSchedule(workerId: String, scheduleId: String?) =
        economyIntents.setWorkerSchedule(workerId, scheduleId)

    fun reel() = fishingIntents.reel()

    /** Cycle Auto → each recipe → Auto for a station (no tick advance). */
    fun cycleStationRecipe(stationId: String) = economyIntents.cycleStationRecipe(stationId)

    private fun step(s: Simulation) {
        VmStepBus.process(s, commands, this)
    }

    /** Encodes on the sim thread (one consistent tick), writes on the IO thread. */
    override fun save() {
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

    override fun publish(force: Boolean) {
        val s = sim ?: return
        val now = System.nanoTime()
        if (!force && now - lastHudPublishNanos < ShellHudPolicy.PUBLISH_INTERVAL_NANOS) return
        lastHudPublishNanos = now
        val v = latestView ?: s.view().also { latestView = it }
        val flags = panels.snapshot()
        _ui.value = GameUiState.Ready(
            view = v,
            upgradesOpen = flags.upgradesOpen,
            staffOpen = flags.staffOpen,
            questsOpen = flags.questsOpen,
            contractsOpen = flags.contractsOpen,
            mapOpen = flags.mapOpen,
            warehouseOpen = flags.warehouseOpen,
            speciesBookOpen = flags.speciesBookOpen,
            dashboardOpen = flags.dashboardOpen,
            pauseOpen = flags.pauseOpen,
            settingsOpen = flags.settingsOpen,
            bagOpen = flags.bagOpen,
            stationOpen = flags.stationOpen,
            offlineReport = pendingOfflineReport,
            settings = settings,
        )
        if (settings.dailyGoalRemindersEnabled) {
            com.willio.jeanvilma.fishshopping.push.DailyGoalReminderScheduler.updateUnclaimed(
                getApplication(),
                v.dailyGoals.count { !it.claimed },
            )
        }
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


    private companion object {
        const val TAG = "FishShopping"
        const val CONTENT_ASSET = "content-pack.json"
        const val START_HARBOR = "harbor.sunrise_pier"
        const val FRAME_DELAY_MS = 8L
    }
}
