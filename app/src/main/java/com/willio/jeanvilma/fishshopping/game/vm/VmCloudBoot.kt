package com.willio.jeanvilma.fishshopping.game.vm

import android.util.Log
import com.willio.jeanvilma.fishshopping.cloud.CloudSyncCoordinator
import com.willio.jeanvilma.fishshopping.core.content.ContentPack
import com.willio.jeanvilma.fishshopping.core.persistence.CloudConflictOffer
import com.willio.jeanvilma.fishshopping.core.persistence.CloudSync
import com.willio.jeanvilma.fishshopping.core.persistence.NewerSaveException
import com.willio.jeanvilma.fishshopping.core.persistence.SnapshotCodec
import com.willio.jeanvilma.fishshopping.core.persistence.SyncSource
import com.willio.jeanvilma.fishshopping.core.sim.GameState
import com.willio.jeanvilma.fishshopping.game.CloudConflictView
import com.willio.jeanvilma.fishshopping.game.LocalRecoveryView
import com.willio.jeanvilma.fishshopping.game.SnapshotChoice
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import com.willio.jeanvilma.fishshopping.persistence.SettingsStore
import com.willio.jeanvilma.fishshopping.persistence.SnapshotStore
import kotlin.random.Random

/** Finish 6.0 Phase 5 — title-screen restore / cloud-merge boot helper. */
data class VmRestored(val state: GameState, val savedAtEpochMs: Long?)

interface VmCloudBootHost {
    val store: SnapshotStore
    val cloud: CloudSyncCoordinator
    val settingsStore: SettingsStore
    var settings: GameSettings
    var pendingConflict: CloudConflictOffer?
    var cloudConflictView: CloudConflictView?
    var localRecoveryView: LocalRecoveryView?
    var pendingRecoveryText: String?
    var rotateOnNextSave: Boolean
    fun emitMessage(text: String)
    fun publishTitle(hasSave: Boolean)
}

object VmCloudBoot {
    private const val TAG = "FishShopping"

    fun restoreOrCreate(host: VmCloudBootHost, pack: ContentPack, startHarbor: String): VmRestored? {
        val candidates = host.store.readCandidates()
        val localLatest = candidates.firstOrNull { it.first == "latest" }?.second
        val pull = host.cloud.pullMerge(host.settings, localLatest)
        if (pull.settings != host.settings) {
            host.settings = pull.settings
            host.settingsStore.save(host.settings)
        }
        val conflict = pull.conflict
        if (conflict != null) {
            host.pendingConflict = conflict
            host.cloudConflictView = SnapshotChoice.conflictView(conflict, pack)
            host.localRecoveryView = null
            host.pendingRecoveryText = null
            host.publishTitle(hasSave = true)
            return null
        }
        if (pull.decision.source == SyncSource.REMOTE && pull.decision.text != null) {
            runCatching {
                host.store.write(pull.decision.text!!, rotate = true)
                val decoded = SnapshotCodec.decodeEnvelope(pack, pull.decision.text!!)
                host.emitMessage("Restored newer cloud save")
                return VmRestored(decoded.state, decoded.savedAtEpochMs)
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
                            host.pendingRecoveryText = text
                            host.localRecoveryView = SnapshotChoice.recoveryView(
                                CloudSync.summaryOf(peeked, SyncSource.LOCAL),
                                pack,
                            )
                            host.pendingConflict = null
                            host.cloudConflictView = null
                            host.publishTitle(hasSave = true)
                            return null
                        }
                    }
                    host.rotateOnNextSave = false
                    host.emitMessage("Recovered your previous save")
                }
                return VmRestored(decoded.state, decoded.savedAtEpochMs)
            } catch (e: NewerSaveException) {
                throw e
            } catch (e: Exception) {
                if (label == "latest") latestCorrupt = true
                Log.w(TAG, "Save '$label' unusable: ${e.message}")
            }
        }
        return VmRestored(GameState.newGame(pack, startHarbor, Random.nextInt()), null)
    }
}
