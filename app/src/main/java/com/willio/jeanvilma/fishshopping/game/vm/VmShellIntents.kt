package com.willio.jeanvilma.fishshopping.game.vm

import com.willio.jeanvilma.fishshopping.core.shell.ShellPanelId

/**
 * Finish 4.0 Phase 4 — shell panel open/close intents.
 * Settings / a11y remain on GameViewModel (presentation store wiring).
 */
class VmShellIntents(
    private val host: VmShellIntentHost,
) {
    fun setUpgradesOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.UPGRADES, open)
    fun setStaffOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.STAFF, open)
    fun setQuestsOpen(open: Boolean) {
        if (open) host.syncWallClockNow()
        host.setPanelOpen(ShellPanelId.QUESTS, open)
    }
    fun setContractsOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.CONTRACTS, open)
    fun setMapOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.MAP, open)
    fun setWarehouseOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.WAREHOUSE, open)
    fun setSpeciesBookOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.SPECIES_BOOK, open)
    fun setDashboardOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.DASHBOARD, open)
    fun setPauseOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.PAUSE, open)
    fun setSettingsOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.SETTINGS, open)
    fun setBagOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.BAG, open)
    fun setStationOpen(open: Boolean) = host.setPanelOpen(ShellPanelId.STATION, open)

    fun openFromDeepLink(panel: ShellPanelId?) {
        when (panel) {
            ShellPanelId.QUESTS -> setQuestsOpen(true)
            ShellPanelId.CONTRACTS -> setContractsOpen(true)
            ShellPanelId.STAFF -> setStaffOpen(true)
            ShellPanelId.MAP -> setMapOpen(true)
            ShellPanelId.UPGRADES -> setUpgradesOpen(true)
            ShellPanelId.DASHBOARD -> setDashboardOpen(true)
            ShellPanelId.SETTINGS -> setSettingsOpen(true)
            ShellPanelId.SPECIES_BOOK -> setSpeciesBookOpen(true)
            ShellPanelId.WAREHOUSE -> setWarehouseOpen(true)
            ShellPanelId.BAG -> setBagOpen(true)
            ShellPanelId.STATION -> setStationOpen(true)
            ShellPanelId.PAUSE -> setPauseOpen(true)
            null -> Unit
        }
    }
}
