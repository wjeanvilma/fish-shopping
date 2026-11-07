package com.willio.jeanvilma.fishshopping.audio

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent

/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; [AudioBus] plays authored clips (or stays silent when muted).
 * Finish 2.0 Phase 21 adds achievement/festival/contract/goal/mastery/quest stingers.
 */
enum class SfxCue {
    CATCH,
    MACHINE_DONE,
    SALE,
    UI,
    ABANDON,
    UPGRADE,
    RUSH,
    ACHIEVEMENT,
    FESTIVAL,
    CONTRACT_DONE,
    CONTRACT_FAIL,
    GOAL_CLAIM,
    MASTERY_UP,
    QUEST_DONE,
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
        ACHIEVEMENT -> "sfx_achievement"
        FESTIVAL -> "sfx_festival"
        CONTRACT_DONE -> "sfx_contract_done"
        CONTRACT_FAIL -> "sfx_contract_fail"
        GOAL_CLAIM -> "sfx_goal_claim"
        MASTERY_UP -> "sfx_mastery_up"
        QUEST_DONE -> "sfx_quest_done"
    }

    fun catalogId(): String = when (this) {
        CATCH -> "catch"
        MACHINE_DONE -> "machine_done"
        SALE -> "sale"
        UI -> "ui"
        ABANDON -> "abandon"
        UPGRADE -> "upgrade"
        RUSH -> "rush"
        ACHIEVEMENT -> "achievement"
        FESTIVAL -> "festival"
        CONTRACT_DONE -> "contract_done"
        CONTRACT_FAIL -> "contract_fail"
        GOAL_CLAIM -> "goal_claim"
        MASTERY_UP -> "mastery_up"
        QUEST_DONE -> "quest_done"
    }
}

/** Cues that should also pulse a short haptic. */
fun SfxCue.wantsHaptic(): Boolean =
    this == SfxCue.CATCH || this == SfxCue.SALE || this == SfxCue.ACHIEVEMENT

fun sfxFromEvent(e: GameEvent): SfxCue? = when (e) {
    is GameEvent.FishCaught -> SfxCue.CATCH
    is GameEvent.BatchCompleted -> SfxCue.MACHINE_DONE
    is GameEvent.SaleCommitted -> SfxCue.SALE
    is GameEvent.CustomerLeft -> if (e.paid) null else SfxCue.ABANDON
    is GameEvent.UpgradePurchased -> if (e.replayed) null else SfxCue.UPGRADE
    is GameEvent.RushStarted -> SfxCue.RUSH
    is GameEvent.AchievementUnlocked -> SfxCue.ACHIEVEMENT
    is GameEvent.SeasonalEventStarted -> SfxCue.FESTIVAL
    is GameEvent.ContractCompleted -> SfxCue.CONTRACT_DONE
    is GameEvent.ContractFailed -> SfxCue.CONTRACT_FAIL
    is GameEvent.DailyGoalClaimed -> if (e.replayed) null else SfxCue.GOAL_CLAIM
    is GameEvent.MasteryLevelUp -> SfxCue.MASTERY_UP
    is GameEvent.QuestCompleted -> SfxCue.QUEST_DONE
    else -> null
}
