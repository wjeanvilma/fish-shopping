package com.willio.jeanvilma.fishshopping.audio

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent

/**
 * Presentation-only SFX cues derived from sim events. No new sim APIs —
 * hosts map [GameEvent] → cue and [AudioBus] plays (or stays silent when muted).
 */
enum class SfxCue {
    CATCH,
    MACHINE_DONE,
    SALE,
    ABANDON,
    UPGRADE,
    RUSH,
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
