package com.willio.jeanvilma.fishshopping.game

import com.willio.jeanvilma.fishshopping.core.sim.OfflineReport
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.persistence.GameSettings

/** Finish 4.0 Phase 4 — UI state sealed hierarchy extracted from GameViewModel. */
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
