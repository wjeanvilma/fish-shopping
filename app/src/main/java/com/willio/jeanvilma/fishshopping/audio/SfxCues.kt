package com.willio.jeanvilma.fishshopping.audio

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent

/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; [AudioBus] plays authored Phase 19 clips (or stays silent when muted).
 */
enum class SfxCue {
    CATCH,
    MACHINE_DONE,
    SALE,
    UI,
    ABANDON,
    UPGRADE,
    RUSH,
    ;

    /** Android `res/raw` name without extension (sfx_catch, …). */
    fun androidRawName(): String = when (this) {
        CATCH -> "sfx_catch"
        MACHINE_DONE -> "sfx_machine_done"
        SALE -> "sfx_sale"
        UI -> "sfx_ui"
        ABANDON -> "sfx_abandon"
        UPGRADE -> "sfx_upgrade"
        RUSH -> "sfx_rush"
    }

    fun catalogId(): String = when (this) {
        CATCH -> "catch"
        MACHINE_DONE -> "machine_done"
        SALE -> "sale"
        UI -> "ui"
        ABANDON -> "abandon"
        UPGRADE -> "upgrade"
        RUSH -> "rush"
    }
}

/** Cues that should also pulse a short haptic. */
fun SfxCue.wantsHaptic(): Boolean = this == SfxCue.CATCH || this == SfxCue.SALE

fun sfxFromEvent(e: GameEvent): SfxCue? = when (e) {
    is GameEvent.FishCaught -> SfxCue.CATCH
    is GameEvent.BatchCompleted -> SfxCue.MACHINE_DONE
    is GameEvent.SaleCommitted -> SfxCue.SALE
    is GameEvent.CustomerLeft -> if (e.paid) null else SfxCue.ABANDON
    is GameEvent.UpgradePurchased -> if (e.replayed) null else SfxCue.UPGRADE
    is GameEvent.RushStarted -> SfxCue.RUSH
    else -> null
}
