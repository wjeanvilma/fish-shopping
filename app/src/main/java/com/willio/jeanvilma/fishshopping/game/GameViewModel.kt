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
import com.willio.jeanvilma.fishshopping.core.sim.SimConstants
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.Simulation
import com.willio.jeanvilma.fishshopping.core.sim.view
import com.willio.jeanvilma.fishshopping.persistence.SnapshotStore
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
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import kotlin.math.roundToInt
import kotlin.random.Random

sealed interface GameUiState {
    data object Loading : GameUiState
    data class Ready(val view: SimView, val upgradesOpen: Boolean) : GameUiState
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

    private val _ui = MutableStateFlow<GameUiState>(GameUiState.Loading)
    val ui: StateFlow<GameUiState> = _ui

    private val _messages = MutableSharedFlow<String>(extraBufferCapacity = 16)
    val messages: SharedFlow<String> = _messages

    @Volatile
    var latestView: SimView? = null
        private set

    private val commands = ConcurrentLinkedQueue<Command>()

    // Owned by the sim thread only.
    private var sim: Simulation? = null
    private var allowSaving = true
    /** False after recovering from the backup, so the corrupt latest never overwrites it. */
    private var rotateOnNextSave = true
    private var lastHudPublishNanos = 0L

    @Volatile
    private var upgradesOpen = false
    private var lastMove = Command.Move(0, 0)
    private var loopJob: Job? = null

    init {
        viewModelScope.launch(simDispatcher) { load() }
    }

    private fun load() {
        try {
            val pack = getApplication<Application>().assets.open(CONTENT_ASSET).use {
                ContentLoader.load(it.readBytes().decodeToString())
            }
            sim = Simulation(pack, restoreOrCreate(pack))
            publish(force = true)
        } catch (e: NewerSaveException) {
            allowSaving = false
            _ui.value = GameUiState.Failed(e.message ?: "This save needs a newer version of the app.")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start", e)
            _ui.value = GameUiState.Failed("Could not load game content: ${e.message}")
        }
    }

    /** Latest valid snapshot, falling back to the previous one (blueprint "Recovery"). */
    private fun restoreOrCreate(pack: ContentPack): GameState {
        for ((label, text) in store.readCandidates()) {
            try {
                val state = SnapshotCodec.decode(pack, text)
                if (label != "latest") {
                    rotateOnNextSave = false
                    _messages.tryEmit("Recovered your previous save")
                }
                return state
            } catch (e: NewerSaveException) {
                throw e // never overwrite a save from a newer app
            } catch (e: Exception) {
                Log.w(TAG, "Save '$label' unusable: ${e.message}")
            }
        }
        return GameState.newGame(pack, START_HARBOR, Random.nextInt())
    }

    /** Called from Activity.onStart. */
    fun resume() {
        if (loopJob?.isActive == true) return
        loopJob = viewModelScope.launch(simDispatcher) {
            val clock = FixedStepClock()
            while (isActive) {
                val s = sim
                if (s != null && !upgradesOpen) {
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

    /** Joystick in screen space: x right, y down, each -1..1. */
    fun setMove(screenX: Float, screenY: Float) {
        if (upgradesOpen) return
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

    fun setUpgradesOpen(open: Boolean) {
        upgradesOpen = open
        if (open) enqueueMove(0f, 0f)
        viewModelScope.launch(simDispatcher) { publish(force = true) }
    }

    fun purchase(upgradeId: String) {
        commands += Command.PurchaseUpgrade(upgradeId, UUID.randomUUID().toString())
        // Management panels pause the world; advance a single tick so the command commits now.
        if (upgradesOpen) viewModelScope.launch(simDispatcher) {
            sim?.let { step(it); publish(force = true) }
        }
    }

    fun reel() {
        if (upgradesOpen) return
        commands += Command.Reel
    }

    /** Cycle Auto → each recipe → Auto for the station under the player's feet (no tick advance). */
    fun cycleStationRecipe(stationId: String) {
        if (upgradesOpen) return
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
        for (e in events) {
            when (e) {
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
                is GameEvent.QuestCompleted -> _messages.tryEmit("Goal complete: ${s.content.questsById[e.questId]?.name}")
                is GameEvent.CheckpointRequested -> save()
                else -> Unit
            }
        }
        latestView = s.view()
        if (transaction) publish(force = true)
    }

    /** Encodes on the sim thread (one consistent tick), writes on the IO thread. */
    private fun save() {
        val s = sim ?: return
        if (!allowSaving) return
        val text = SnapshotCodec.encode(s.content, s.state)
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
        _ui.value = GameUiState.Ready(v, upgradesOpen)
    }

    override fun onCleared() {
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
        const val HUD_PUBLISH_INTERVAL_NANOS = 100_000_000L
    }
}
