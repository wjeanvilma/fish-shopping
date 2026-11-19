package com.willio.jeanvilma.fishshopping.audio

import com.willio.jeanvilma.fishshopping.core.sim.GameEvent

/**
 * Presentation-only SFX cues derived from sim events + UI panel opens.
 * Hosts map events → cue; [AudioBus] plays authored clips (or stays silent when muted).
 * Finish 2.0 Phase 21 adds achievement/festival/contract/goal/mastery/quest stingers.
 * Finish 3.0 Phase 23 adds rival/travel/hire/prestige/loan/trophy stingers.
 * Finish 4.0 Phase 23 adds decor/cosmetic/endgame/contract/bait/unlock/break/spoil stingers.
 * Finish 5.0 Phase 12 adds cast/spoil/service/contract/quest pressure stingers.
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
    RIVAL_OPEN,
    RIVAL_STEAL,
    RIVAL_BEAT,
    HARBOR_TRAVEL,
    HIRE,
    PRESTIGE,
    LOAN,
    TROPHY_SET,
    DECOR,
    COSMETIC,
    ENDGAME_TIER,
    ENDGAME_CHALLENGE,
    CONTRACT_ACCEPT,
    BAIT,
    FULL_UNLOCK,
    MACHINE_BREAK,
    SPOIL,
    CAST_STRIKE,
    SPOIL_WARN,
    SERVICE_QUEUE,
    CONTRACT_DEADLINE,
    QUEST_NEAR,
    ;

    /** Android `res/raw` name without extension (sfx_catch, …). */
    fun androidRawName(): String = "sfx_" + catalogId()

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
        RIVAL_OPEN -> "rival_open"
        RIVAL_STEAL -> "rival_steal"
        RIVAL_BEAT -> "rival_beat"
        HARBOR_TRAVEL -> "harbor_travel"
        HIRE -> "hire"
        PRESTIGE -> "prestige"
        LOAN -> "loan"
        TROPHY_SET -> "trophy_set"
        DECOR -> "decor"
        COSMETIC -> "cosmetic"
        ENDGAME_TIER -> "endgame_tier"
        ENDGAME_CHALLENGE -> "endgame_challenge"
        CONTRACT_ACCEPT -> "contract_accept"
        BAIT -> "bait"
        FULL_UNLOCK -> "full_unlock"
        MACHINE_BREAK -> "machine_break"
        SPOIL -> "spoil"
        CAST_STRIKE -> "cast_strike"
        SPOIL_WARN -> "spoil_warn"
        SERVICE_QUEUE -> "service_queue"
        CONTRACT_DEADLINE -> "contract_deadline"
        QUEST_NEAR -> "quest_near"
    }
}

/** Cues that should also pulse a short haptic. */
fun SfxCue.wantsHaptic(): Boolean =
    this == SfxCue.CATCH ||
        this == SfxCue.SALE ||
        this == SfxCue.ACHIEVEMENT ||
        this == SfxCue.RIVAL_BEAT ||
        this == SfxCue.PRESTIGE ||
        this == SfxCue.TROPHY_SET ||
        this == SfxCue.COSMETIC ||
        this == SfxCue.ENDGAME_TIER ||
        this == SfxCue.ENDGAME_CHALLENGE ||
        this == SfxCue.FULL_UNLOCK ||
        this == SfxCue.CAST_STRIKE

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
    is GameEvent.RivalMarketOpened -> SfxCue.RIVAL_OPEN
    is GameEvent.RivalSaleStolen -> SfxCue.RIVAL_STEAL
    is GameEvent.RivalBeaten -> SfxCue.RIVAL_BEAT
    is GameEvent.HarborTraveled -> if (e.replayed) null else SfxCue.HARBOR_TRAVEL
    is GameEvent.WorkerHired -> if (e.replayed) null else SfxCue.HIRE
    is GameEvent.PrestigeUnlocked -> SfxCue.PRESTIGE
    is GameEvent.LoanTaken -> if (e.replayed) null else SfxCue.LOAN
    is GameEvent.TrophySetCompleted -> SfxCue.TROPHY_SET
    is GameEvent.DecorPurchased -> if (e.replayed) null else SfxCue.DECOR
    is GameEvent.IapCosmeticGranted -> if (e.replayed) null else SfxCue.COSMETIC
    is GameEvent.EndgameTierUnlocked -> SfxCue.ENDGAME_TIER
    is GameEvent.EndgameChallengeCompleted -> SfxCue.ENDGAME_CHALLENGE
    is GameEvent.ContractAccepted -> if (e.replayed) null else SfxCue.CONTRACT_ACCEPT
    is GameEvent.BaitPurchased -> if (e.replayed) null else SfxCue.BAIT
    is GameEvent.FullHarborUnlockGranted -> if (e.replayed) null else SfxCue.FULL_UNLOCK
    is GameEvent.MachineBroke -> SfxCue.MACHINE_BREAK
    is GameEvent.ItemsSpoiled -> SfxCue.SPOIL
    is GameEvent.CastStrikeReel -> SfxCue.CAST_STRIKE
    else -> null
}
