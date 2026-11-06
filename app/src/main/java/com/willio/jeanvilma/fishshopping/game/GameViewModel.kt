package com.willio.jeanvilma.fishshopping.game

import android.app.Application
import android.util.Log
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.willio.jeanvilma.fishshopping.core.content.ContentLoader
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.persistence.NewerSaveException
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.sim.Command
import com.willio.jeanvilma.fishshopping.core.sim.FixedStepClock
import com.willio.jeanvilma.fishshopping.core.sim.GameEvent
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.core.sim.OfflinePolicy
import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.applyOffline
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.QualityPreset
import com.willio.jeanvilma.fishshopping.persistence.SettingsStore
import com.willio.jeanvilma.fishshopping.persistence.SnapshotStore
import com.willio.jeanvilma.fishshopping.render.FlyingTransferCue
import com.willio.jeanvilma.fishshopping.render.resolveFlyingTransfer
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
    data class Title(val hasSave: Boolean) : GameUiState
    data class Ready(
        val view: SimView,
        val upgradesOpen: Boolean,
        val staffOpen: Boolean,
        val questsOpen: Boolean = false,
        val contractsOpen: Boolean = false,
        val mapOpen: Boolean = false,
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

    private val _ui = MutableStateFlow<GameUiState>(GameUiState.Loading)
    val ui: StateFlow<GameUiState> = _ui

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val messages: SharedFlow<String> = _messages

    @Volatile
    var latestView: SimView? = null
        private set

    /** Presentation-only flying transfer cues for the harbor renderer (drained each frame). */
    private val flyingTransfers = ConcurrentLinkedQueue<FlyingTransferCue>()

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

    private val panelOpen get() = upgradesOpen || staffOpen || questsOpen || contractsOpen || mapOpen
        || pauseOpen || settingsOpen || bagOpen || stationOpen
        || pendingOfflineReport != null

    init {
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
            if (booting || _ui.value !is GameUiState.Title) return@launch
            val pack = content ?: return@launch
            booting = true
            try {
                val restored = restoreOrCreate(pack)
                bootSim(restored.state, restored.savedAtEpochMs)
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

    /** Wipe slots and start a new harbor. The title screen confirms before calling this. */
    fun newGame() {
        viewModelScope.launch(simDispatcher) {
            if (booting || _ui.value !is GameUiState.Title) return@launch
            val pack = content ?: return@launch
            booting = true
            try {
                store.clear()
                rotateOnNextSave = true
                val state = GameState.newGame(pack, START_HARBOR, Random.nextInt())
                bootSim(state, null)
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
        sim = Simulation(pack, state)
        lastCheckpointEpochMs = savedAtEpochMs
        applyPendingOffline(System.currentTimeMillis())
        // Stamp a fresh checkpoint so a crash before the next pause cannot re-credit.
        if (pendingOfflineReport != null || savedAtEpochMs != null) save()
        latestView = sim?.view()
        publish(force = true)
        resume()
    }

    private fun publishTitle(hasSave: Boolean) {
        _ui.value = GameUiState.Title(hasSave)
    }

    /** Block until saves queued before this call have been written. */
    private fun awaitQueuedSaves() {
        val done = CountDownLatch(1)
        ioExecutor.execute { done.countDown() }
        runCatching { done.await(2, TimeUnit.SECONDS) }
    }

    private data class Restored(val state: GameState, val savedAtEpochMs: Long?)

    /** Latest valid snapshot, falling back to the previous one (blueprint "Recovery"). */
    private fun restoreOrCreate(pack: ContentPack): Restored {
        for ((label, text) in store.readCandidates()) {
            try {
                val decoded = SnapshotCodec.decodeEnvelope(pack, text)
                if (label != "latest") {
                    rotateOnNextSave = false
                    _messages.tryEmit("Recovered your previous save")
                }
                return Restored(decoded.state, decoded.savedAtEpochMs)
            } catch (e: NewerSaveException) {
                throw e // never overwrite a save from a newer app
            } catch (e: Exception) {
                Log.w(TAG, "Save '$label' unusable: ${e.message}")
            }
        }
        return Restored(GameState.newGame(pack, START_HARBOR, Random.nextInt()), null)
    }

    /** Called from Activity.onStart. No-ops until a harbor simulation is on screen. */
    fun resume() {
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
        if (elapsed <= 0L) return
        val report = applyOffline(s, elapsed)
        pendingOfflineReport = if (OfflinePolicy.shouldShowSummary(s.content, report)) report else null
        latestView = s.view()
    }

    /** Joystick in screen space: x right, y down, each -1..1. */
    fun setMove(screenX: Float, screenY: Float) {
        if (panelOpen) return
        enqueueMove(screenX, screenY)
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
    fun setQuestsOpen(open: Boolean) = setPanelOpen(Panel.QUESTS, open)
    fun setContractsOpen(open: Boolean) = setPanelOpen(Panel.CONTRACTS, open)
    fun setMapOpen(open: Boolean) = setPanelOpen(Panel.MAP, open)
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
        pauseOpen = which == Panel.PAUSE
        settingsOpen = which == Panel.SETTINGS
        bagOpen = which == Panel.BAG
        stationOpen = which == Panel.STATION
        enqueueMove(0f, 0f)
    }

    private fun closePanel(which: Panel) {
        when (which) {
            Panel.UPGRADES -> upgradesOpen = false
            Panel.STAFF -> staffOpen = false
            Panel.QUESTS -> questsOpen = false
            Panel.CONTRACTS -> contractsOpen = false
            Panel.MAP -> mapOpen = false
            Panel.PAUSE -> pauseOpen = false
            Panel.SETTINGS -> settingsOpen = false
            Panel.BAG -> bagOpen = false
            Panel.STATION -> stationOpen = false
        }
    }

    private fun closeAllPanels() {
        upgradesOpen = false
        staffOpen = false
        questsOpen = false
        contractsOpen = false
        mapOpen = false
        pauseOpen = false
        settingsOpen = false
        bagOpen = false
        stationOpen = false
    }

    /** Presentation settings (mute, quality). Not part of the parity save. */
    fun updateSettings(muted: Boolean = settings.muted, quality: QualityPreset = settings.quality) {
        val next = GameSettings(muted = muted, quality = quality)
        settings = next
        settingsStore.save(next)
        viewModelScope.launch(simDispatcher) { publish(force = true) }
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

    fun hire(roleId: String) {
        commands += Command.HireWorker(roleId, UUID.randomUUID().toString())
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
        var transaction = false
        val transferred = ArrayList<GameEvent.ItemsTransferred>()
        for (e in events) {
            when (e) {
                is GameEvent.ItemsTransferred -> transferred += e
                is GameEvent.SaleCommitted -> {
                    val tip = when {
                        e.tipped && e.preferenceMet -> " Premium tip!"
                        !e.preferenceMet -> " (substituted)"
                        else -> ""
                    }
                    _messages.tryEmit("+${e.coins} coins$tip")
                    transaction = true
                }
                is GameEvent.FishCaught -> {
                    if (e.timingBonus) {
                        val tip = s.content.speciesById[e.speciesId]?.baseValue ?: 0L
                        _messages.tryEmit("Perfect reel! +$tip")
                        transaction = true
                    }
                    if (e.rareUpgrade) {
                        _messages.tryEmit("Rare catch: ${s.content.speciesById[e.speciesId]?.name ?: e.speciesId}")
                        transaction = true
                    }
                }
                is GameEvent.FishingSpotDepleted -> {
                    _messages.tryEmit("Pier empty — fish are returning")
                    transaction = true
                }
                is GameEvent.RushStarted -> {
                    _messages.tryEmit("${e.name}!")
                    transaction = true
                }
                is GameEvent.UpgradePurchased -> if (!e.replayed) {
                    _messages.tryEmit("Bought ${s.content.upgradesById[e.upgradeId]?.name ?: e.upgradeId}")
                    transaction = true
                }
                is GameEvent.PurchaseRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.WorkerHired -> if (!e.replayed) {
                    _messages.tryEmit("Hired ${s.content.workersById[e.roleId]?.name ?: e.roleId}")
                    transaction = true
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
                is GameEvent.ContractAccepted -> if (!e.replayed) {
                    _messages.tryEmit("Contract accepted")
                    transaction = true
                }
                is GameEvent.ContractCompleted -> {
                    _messages.tryEmit("Contract complete +${e.payout}")
                    transaction = true
                }
                is GameEvent.ContractFailed -> {
                    _messages.tryEmit(
                        if (e.penaltyPaid > 0) "Contract failed −${e.penaltyPaid}" else "Contract failed",
                    )
                    transaction = true
                }
                is GameEvent.ContractRejected -> { _messages.tryEmit(e.reason); transaction = true }
                is GameEvent.HarborTraveled -> if (!e.replayed) {
                    val name = s.content.harborsById[e.toHarborId]?.name ?: e.toHarborId
                    _messages.tryEmit("Traveled to $name")
                    mapOpen = false
                    flyingTransfers.clear()
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
        val view = latestView
        if (view != null) {
            for (e in transferred) {
                resolveFlyingTransfer(view, e.from, e.to, e.itemId)?.let { flyingTransfers.offer(it) }
            }
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
        ioExecutor.execute {
            runCatching { store.write(text, rotate) }.onFailure { Log.e(TAG, "Save failed", it) }
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
            pauseOpen = pauseOpen,
            settingsOpen = settingsOpen,
            bagOpen = bagOpen,
            stationOpen = stationOpen,
            offlineReport = pendingOfflineReport,
            settings = settings,
        )
    }

    override fun onCleared() {
        // shutdown() lets queued work (the final save) finish; no new work is accepted.
        // Wait briefly for the sim thread so its final save is handed to the IO thread first.
        simExecutor.shutdown()
        simExecutor.awaitTermination(500, TimeUnit.MILLISECONDS)
        ioExecutor.shutdown()
    }

    private enum class Panel {
        UPGRADES, STAFF, QUESTS, CONTRACTS, MAP, PAUSE, SETTINGS, BAG, STATION,
    }

    private companion object {
        const val TAG = "FishShopping"
        const val CONTENT_ASSET = "content-pack.json"
        const val START_HARBOR = "harbor.sunrise_pier"
        const val FRAME_DELAY_MS = 8L
        const val HUD_PUBLISH_INTERVAL_NANOS = 100_000_000L
    }
}
