package com.willio.jeanvilma.fishshopping.core.shell

/**
 * Finish 3.0 Phase 4 — shared HUD panel ids + immutable flag snapshot.
 * Single source of truth for Android GameViewModel and web GameHost.
 */
enum class ShellPanelId(val wire: String) {
    UPGRADES("upgrades"),
    STAFF("staff"),
    QUESTS("quests"),
    CONTRACTS("contracts"),
    MAP("map"),
    WAREHOUSE("warehouse"),
    SPECIES_BOOK("speciesBook"),
    DASHBOARD("dashboard"),
    PAUSE("pause"),
    SETTINGS("settings"),
    BAG("bag"),
    STATION("station"),
    ;

    companion object {
        fun fromWire(wire: String): ShellPanelId? = entries.firstOrNull { it.wire == wire }

        val ALL: List<ShellPanelId> = entries.toList()

        val WIRES: List<String> = entries.map { it.wire }
    }
}

/** Immutable open/closed flags for the 12 management panels (offline modal is separate). */
data class ShellPanelFlags(
    val upgradesOpen: Boolean = false,
    val staffOpen: Boolean = false,
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
) {
    val anyHudPanelOpen: Boolean
        get() = upgradesOpen || staffOpen || questsOpen || contractsOpen || mapOpen ||
            warehouseOpen || speciesBookOpen || dashboardOpen || pauseOpen || settingsOpen ||
            bagOpen || stationOpen

    fun isOpen(id: ShellPanelId): Boolean = when (id) {
        ShellPanelId.UPGRADES -> upgradesOpen
        ShellPanelId.STAFF -> staffOpen
        ShellPanelId.QUESTS -> questsOpen
        ShellPanelId.CONTRACTS -> contractsOpen
        ShellPanelId.MAP -> mapOpen
        ShellPanelId.WAREHOUSE -> warehouseOpen
        ShellPanelId.SPECIES_BOOK -> speciesBookOpen
        ShellPanelId.DASHBOARD -> dashboardOpen
        ShellPanelId.PAUSE -> pauseOpen
        ShellPanelId.SETTINGS -> settingsOpen
        ShellPanelId.BAG -> bagOpen
        ShellPanelId.STATION -> stationOpen
    }

    fun activePanel(): ShellPanelId? = ShellPanelId.ALL.firstOrNull { isOpen(it) }

    companion object {
        val EMPTY = ShellPanelFlags()

        /** Opening one panel closes the others. */
        fun openOnly(id: ShellPanelId): ShellPanelFlags = when (id) {
            ShellPanelId.UPGRADES -> EMPTY.copy(upgradesOpen = true)
            ShellPanelId.STAFF -> EMPTY.copy(staffOpen = true)
            ShellPanelId.QUESTS -> EMPTY.copy(questsOpen = true)
            ShellPanelId.CONTRACTS -> EMPTY.copy(contractsOpen = true)
            ShellPanelId.MAP -> EMPTY.copy(mapOpen = true)
            ShellPanelId.WAREHOUSE -> EMPTY.copy(warehouseOpen = true)
            ShellPanelId.SPECIES_BOOK -> EMPTY.copy(speciesBookOpen = true)
            ShellPanelId.DASHBOARD -> EMPTY.copy(dashboardOpen = true)
            ShellPanelId.PAUSE -> EMPTY.copy(pauseOpen = true)
            ShellPanelId.SETTINGS -> EMPTY.copy(settingsOpen = true)
            ShellPanelId.BAG -> EMPTY.copy(bagOpen = true)
            ShellPanelId.STATION -> EMPTY.copy(stationOpen = true)
        }

        fun close(flags: ShellPanelFlags, id: ShellPanelId): ShellPanelFlags = when (id) {
            ShellPanelId.UPGRADES -> flags.copy(upgradesOpen = false)
            ShellPanelId.STAFF -> flags.copy(staffOpen = false)
            ShellPanelId.QUESTS -> flags.copy(questsOpen = false)
            ShellPanelId.CONTRACTS -> flags.copy(contractsOpen = false)
            ShellPanelId.MAP -> flags.copy(mapOpen = false)
            ShellPanelId.WAREHOUSE -> flags.copy(warehouseOpen = false)
            ShellPanelId.SPECIES_BOOK -> flags.copy(speciesBookOpen = false)
            ShellPanelId.DASHBOARD -> flags.copy(dashboardOpen = false)
            ShellPanelId.PAUSE -> flags.copy(pauseOpen = false)
            ShellPanelId.SETTINGS -> flags.copy(settingsOpen = false)
            ShellPanelId.BAG -> flags.copy(bagOpen = false)
            ShellPanelId.STATION -> flags.copy(stationOpen = false)
        }
    }
}

/**
 * Mutable panel controller. Hosts keep platform side-effects (audio, stick clear);
 * this owns mutual-exclusion state only.
 */
class ShellPanelController {
    @Volatile
    private var flags: ShellPanelFlags = ShellPanelFlags.EMPTY

    fun snapshot(): ShellPanelFlags = flags

    fun open(id: ShellPanelId): ShellPanelFlags {
        flags = ShellPanelFlags.openOnly(id)
        return flags
    }

    fun close(id: ShellPanelId): ShellPanelFlags {
        flags = ShellPanelFlags.close(flags, id)
        return flags
    }

    fun closeAll(): ShellPanelFlags {
        flags = ShellPanelFlags.EMPTY
        return flags
    }

    fun isOpen(id: ShellPanelId): Boolean = flags.isOpen(id)

    fun anyHudPanelOpen(): Boolean = flags.anyHudPanelOpen
}

object ShellModalPolicy {
    /** True when a HUD panel or the offline summary modal blocks world input / sim loop. */
    fun blocksWorldInput(flags: ShellPanelFlags, offlineReportPending: Boolean): Boolean =
        flags.anyHudPanelOpen || offlineReportPending

    /**
     * While a management panel is open (and offline summary is not showing), hosts still
     * step the sim for in-panel transactions (hire, buy, claim, deliver, …).
     */
    fun shouldCommitPanelCommand(flags: ShellPanelFlags, offlineReportPending: Boolean): Boolean =
        flags.anyHudPanelOpen && !offlineReportPending

    fun allowsSimTick(flags: ShellPanelFlags, offlineReportPending: Boolean): Boolean =
        !blocksWorldInput(flags, offlineReportPending)
}

object ShellHudPolicy {
    const val PUBLISH_INTERVAL_MS = 100L
    const val PUBLISH_INTERVAL_NANOS = 100_000_000L
}
