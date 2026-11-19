package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.PI
import kotlin.math.cos
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Finish 4.0 Phase 6 — flying transfers / world bursts / screen shake.
 */
data class FlyingTransferCue(
    val fromXMm: Int,
    val fromZMm: Int,
    val toXMm: Int,
    val toZMm: Int,
    val itemId: String,
)

data class FlyingTransferPose(
    val x: Double,
    val y: Double,
    val z: Double,
    /** "fish" | "portion" — matches Fly_<i>_<kind> GLB nodes. */
    val kind: String,
    /** Phase 16: spin while arcing. */
    val yaw: Double = 0.0,
    /** Phase 16: slight scale pulse mid-flight. */
    val scale: Double = 1.0,
)

/**
 * Resolve ItemsTransferred inventory ids to world anchors on the current SimView.
 * Returns null when either endpoint is unknown (stale worker, etc.).
 */
fun resolveFlyingTransfer(
    v: SimView,
    fromInventoryId: String,
    toInventoryId: String,
    itemId: String,
): FlyingTransferCue? {
    val from = v.transferAnchors.firstOrNull { it.inventoryId == fromInventoryId } ?: return null
    val to = v.transferAnchors.firstOrNull { it.inventoryId == toInventoryId } ?: return null
    return FlyingTransferCue(from.xMm, from.zMm, to.xMm, to.zMm, itemId)
}

/**
 * Ephemeral bag ↔ pad ↔ counter arcs. Driven by ItemsTransferred cues; never changes
 * stack visibility (sim stacks stay authoritative).
 */
class FlyingTransfers(poolSize: Int = FLYING_TRANSFER_POOL) {
    private class Slot(
        val fromX: Double,
        val fromZ: Double,
        val toX: Double,
        val toZ: Double,
        val kind: String,
        var age: Double = 0.0,
    )

    private val slots = arrayOfNulls<Slot>(poolSize)
    private var budget = poolSize

    val poolSize: Int get() = slots.size

    /**
     * Quality VFX budget. Growing expands capacity up to the GLB pool; shrinking
     * drops excess arcs immediately.
     */
    fun setBudget(n: Int) {
        budget = max(0, min(slots.size, n))
        for (i in budget until slots.size) slots[i] = null
    }

    fun clear() {
        for (i in slots.indices) slots[i] = null
    }

    /** Enqueue a cue; returns false when the quality budget is full. */
    fun spawn(cue: FlyingTransferCue): Boolean {
        var free = -1
        for (i in 0 until budget) if (slots[i] == null) { free = i; break }
        if (free < 0) return false
        slots[free] = Slot(
            fromX = cue.fromXMm / 1000.0,
            fromZ = cue.fromZMm / 1000.0,
            toX = cue.toXMm / 1000.0,
            toZ = cue.toZMm / 1000.0,
            kind = if (cue.itemId.startsWith("species.")) "fish" else "portion",
        )
        return true
    }

    fun update(dt: Double): List<FlyingTransferPose?> {
        return slots.mapIndexed { i, s ->
            if (s == null) return@mapIndexed null
            s.age += dt
            val t = min(1.0, s.age / FLYING_TRANSFER_DURATION_S)
            val e = t * (2.0 - t) // ease-out quad
            val x = s.fromX + (s.toX - s.fromX) * e
            val z = s.fromZ + (s.toZ - s.fromZ) * e
            val y = FLYING_TRANSFER_BASE_Y_M + 4.0 * FLYING_TRANSFER_ARC_HEIGHT_M * t * (1.0 - t)
            val yaw = t * PI * 2.4
            val scale = 1.0 + 0.35 * sin(PI * t)
            if (t >= 1.0) {
                slots[i] = null
                return@mapIndexed null
            }
            FlyingTransferPose(x, y, z, s.kind, yaw, scale)
        }
    }
}

/** Phase 16/21 — pooled world bursts; Finish 5.0 Phase 27 denser-scene pool for 12 harbors. */
const val VFX_BURST_POOL = 10

fun worldBurstPoolForQuality(quality: PresenterQuality): Int = when (quality) {
    PresenterQuality.LOW -> 2
    PresenterQuality.MEDIUM -> 5
    PresenterQuality.HIGH -> VFX_BURST_POOL
}

enum class WorldBurstKind {
    CATCH, PAY, CELEBRATE, MACHINE_DONE,
    ACHIEVEMENT, FESTIVAL, CONTRACT_DONE, GOAL_CLAIM,
    RIVAL_BEAT, PRESTIGE, TROPHY_SET, HARBOR_TRAVEL, HIRE, LOAN,
    DECOR, COSMETIC, ENDGAME_TIER, ENDGAME_CHALLENGE, CONTRACT_ACCEPT, BAIT, FULL_UNLOCK,
    CAST_STRIKE, SPOIL, MACHINE_BREAK, CONTRACT_DEADLINE, QUEST_NEAR,
}

data class WorldBurstCue(
    val xMm: Int,
    val zMm: Int,
    val kind: WorldBurstKind,
)

data class WorldBurstPose(
    val x: Double,
    val y: Double,
    val z: Double,
    val scale: Double,
    val opacity: Double,
    val kind: WorldBurstKind,
)

data class MachineOperatePulse(
    val footprintName: String,
    val pulse01: Double,
)

private fun burstDurationS(kind: WorldBurstKind): Double = when (kind) {
    WorldBurstKind.CATCH -> 0.32
    WorldBurstKind.PAY -> 0.45
    WorldBurstKind.CELEBRATE -> 0.7
    WorldBurstKind.MACHINE_DONE -> 0.4
    WorldBurstKind.ACHIEVEMENT -> 0.55
    WorldBurstKind.FESTIVAL -> 0.6
    WorldBurstKind.CONTRACT_DONE -> 0.4
    WorldBurstKind.GOAL_CLAIM -> 0.35
    WorldBurstKind.RIVAL_BEAT -> 0.5
    WorldBurstKind.PRESTIGE -> 0.65
    WorldBurstKind.TROPHY_SET -> 0.55
    WorldBurstKind.HARBOR_TRAVEL -> 0.45
    WorldBurstKind.HIRE -> 0.35
    WorldBurstKind.LOAN -> 0.4
    WorldBurstKind.DECOR -> 0.35
    WorldBurstKind.COSMETIC -> 0.45
    WorldBurstKind.ENDGAME_TIER -> 0.6
    WorldBurstKind.ENDGAME_CHALLENGE -> 0.55
    WorldBurstKind.CONTRACT_ACCEPT -> 0.35
    WorldBurstKind.BAIT -> 0.3
    WorldBurstKind.FULL_UNLOCK -> 0.65
    WorldBurstKind.CAST_STRIKE -> 0.35
    WorldBurstKind.SPOIL -> 0.4
    WorldBurstKind.MACHINE_BREAK -> 0.45
    WorldBurstKind.CONTRACT_DEADLINE -> 0.4
    WorldBurstKind.QUEST_NEAR -> 0.35
}

/** Phase 21 + Finish 2.0/3.0/4.0/5.0 shake kinds. */
enum class ShakeKind {
    CATCH, CUT, SALE, CELEBRATE, ACHIEVEMENT, FESTIVAL, RIVAL_BEAT, PRESTIGE,
    ENDGAME_TIER, ENDGAME_CHALLENGE, CAST_STRIKE, CONTRACT_DEADLINE,
}

const val SHAKE_DURATION_S = 0.18
const val MAX_SHAKE_AMPLITUDE_M = 0.12

fun shakeAmplitudeM(kind: ShakeKind): Double = when (kind) {
    ShakeKind.CATCH -> 0.04
    ShakeKind.CUT -> 0.03
    ShakeKind.SALE -> 0.05
    ShakeKind.CELEBRATE -> 0.08
    ShakeKind.ACHIEVEMENT -> 0.06
    ShakeKind.FESTIVAL -> 0.05
    ShakeKind.RIVAL_BEAT -> 0.07
    ShakeKind.PRESTIGE -> 0.08
    ShakeKind.ENDGAME_TIER -> 0.08
    ShakeKind.ENDGAME_CHALLENGE -> 0.07
    ShakeKind.CAST_STRIKE -> 0.06
    ShakeKind.CONTRACT_DEADLINE -> 0.07
}

fun shakeScaleForQuality(quality: PresenterQuality): Double = when (quality) {
    PresenterQuality.LOW -> 0.5
    PresenterQuality.MEDIUM -> 0.85
    PresenterQuality.HIGH -> 1.0
}

fun cappedShakeAmplitudeM(kind: ShakeKind, quality: PresenterQuality): Double =
    min(MAX_SHAKE_AMPLITUDE_M, max(0.0, shakeAmplitudeM(kind) * shakeScaleForQuality(quality)))

data class ShakeOffset(val x: Double, val y: Double)

/**
 * Decaying camera shake. Presentation-only; reduced-motion hosts skip [update].
 * Concurrent triggers take the stronger remaining amplitude.
 */
class ScreenShake {
    private var amp = 0.0
    private var age = 0.0
    private var duration = SHAKE_DURATION_S
    private var quality = PresenterQuality.MEDIUM
    private var phase = 0.0

    fun setQuality(q: PresenterQuality) {
        quality = q
    }

    fun clear() {
        amp = 0.0
        age = 0.0
    }

    fun trigger(kind: ShakeKind) {
        val next = cappedShakeAmplitudeM(kind, quality)
        val remaining = amp * max(0.0, 1.0 - age / duration)
        if (next >= remaining) {
            amp = next
            age = 0.0
            duration = SHAKE_DURATION_S
            phase += 1.7
        }
    }

    fun update(dt: Double): ShakeOffset {
        if (amp <= 0.0) return ShakeOffset(0.0, 0.0)
        age += dt
        val t = min(1.0, age / duration)
        if (t >= 1.0) {
            amp = 0.0
            return ShakeOffset(0.0, 0.0)
        }
        val envelope = (1.0 - t) * (1.0 - t)
        val a = amp * envelope
        val w = age * 62.0 + phase
        return ShakeOffset(sin(w) * a, cos(w * 1.3) * a * 0.55)
    }
}

/** Footprint socket for a station id (`station.cutter_1` → `Footprint_cutter_1`). */
fun footprintNameForStation(stationId: String): String = "Footprint_${shortId(stationId)}"

/** Soft operate glow for PROCESSING stations (presentation-only). */
fun machineOperatePulses(v: SimView, elapsed: Double): List<MachineOperatePulse> {
    val out = ArrayList<MachineOperatePulse>()
    for (st in v.stations) {
        if (st.status != MachineStatus.PROCESSING) continue
        val progress = st.progress?.toDouble() ?: 0.0
        val breath = 0.55 + 0.45 * sin(elapsed * 6.0 + progress * PI)
        out += MachineOperatePulse(
            footprintName = footprintNameForStation(st.stationId),
            pulse01 = min(1.0, max(0.0, breath)),
        )
    }
    return out
}

/** Catch splash at the player (every fish_caught — Phase 21 juice). */
fun resolveCatchBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CATCH)

/** Pay burst at the selling customer, else first counter pad. */
fun resolvePayBurst(v: SimView, customerId: String): WorldBurstCue {
    val c = v.customers.firstOrNull { it.id == customerId }
    if (c != null) {
        return WorldBurstCue(c.xMm.roundToInt(), c.zMm.roundToInt(), WorldBurstKind.PAY)
    }
    val counter = v.transferAnchors.firstOrNull { it.inventoryId.startsWith("inv.counter.") }
    if (counter != null) return WorldBurstCue(counter.xMm, counter.zMm, WorldBurstKind.PAY)
    return WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.PAY)
}

/** Machine-done flash above the station output pad. */
fun resolveMachineDoneBurst(v: SimView, stationId: String): WorldBurstCue? {
    val anchor = v.transferAnchors.firstOrNull { it.inventoryId == "inv.$stationId.output" } ?: return null
    return WorldBurstCue(anchor.xMm, anchor.zMm, WorldBurstKind.MACHINE_DONE)
}

/** Celebrate at the player (rush / trophy / coin goal / perfect catch). */
fun resolveCelebrateBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CELEBRATE)

/** Finish 2.0 Phase 22 — achievement sparkle at the player. */
fun resolveAchievementBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.ACHIEVEMENT)

/** Finish 2.0 Phase 22 — festival cue at the player (seasonal start). */
fun resolveFestivalBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.FESTIVAL)

/** Finish 2.0 Phase 22 — contract complete at the player. */
fun resolveContractDoneBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CONTRACT_DONE)

/** Finish 2.0 Phase 22 — daily goal claim at the player. */
fun resolveGoalClaimBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.GOAL_CLAIM)

/** Finish 3.0 Phase 24 — rival beaten cue at the player. */
fun resolveRivalBeatBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.RIVAL_BEAT)

/** Finish 3.0 Phase 24 — prestige unlock at the player. */
fun resolvePrestigeBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.PRESTIGE)

/** Finish 3.0 Phase 24 — trophy set complete at the player. */
fun resolveTrophySetBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.TROPHY_SET)

/** Finish 3.0 Phase 24 — harbor travel at the player. */
fun resolveHarborTravelBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.HARBOR_TRAVEL)

/** Finish 3.0 Phase 24 — worker hire at the player. */
fun resolveHireBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.HIRE)

/** Finish 3.0 Phase 24 — loan taken at the player. */
fun resolveLoanBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.LOAN)

/** Finish 4.0 Phase 23 — decor purchase at the player. */
fun resolveDecorBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.DECOR)

/** Finish 4.0 Phase 23 — cosmetic grant at the player. */
fun resolveCosmeticBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.COSMETIC)

/** Finish 4.0 Phase 23 — endgame tier unlock at the player. */
fun resolveEndgameTierBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.ENDGAME_TIER)

/** Finish 4.0 Phase 23 — endgame challenge clear at the player. */
fun resolveEndgameChallengeBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.ENDGAME_CHALLENGE)

/** Finish 4.0 Phase 23 — contract accept at the player. */
fun resolveContractAcceptBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CONTRACT_ACCEPT)

/** Finish 4.0 Phase 23 — bait purchase at the player. */
fun resolveBaitBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.BAIT)

/** Finish 4.0 Phase 23 — full harbor unlock at the player. */
fun resolveFullUnlockBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.FULL_UNLOCK)

/** Finish 5.0 Phase 12 — cast strike splash at the player. */
fun resolveCastStrikeBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CAST_STRIKE)

/** Finish 5.0 Phase 12 — spoil cue at the player. */
fun resolveSpoilBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.SPOIL)

/** Finish 5.0 Phase 12 — machine break flash above station output, else player. */
fun resolveMachineBreakBurst(v: SimView, stationId: String? = null): WorldBurstCue {
    if (stationId != null) {
        val anchor = v.transferAnchors.firstOrNull { it.inventoryId == "inv.$stationId.output" }
        if (anchor != null) return WorldBurstCue(anchor.xMm, anchor.zMm, WorldBurstKind.MACHINE_BREAK)
    }
    return WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.MACHINE_BREAK)
}

/** Finish 5.0 Phase 12 — contract deadline warn at the player. */
fun resolveContractDeadlineBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.CONTRACT_DEADLINE)

/** Finish 5.0 Phase 12 — quest near-complete cue at the player. */
fun resolveQuestNearBurst(v: SimView): WorldBurstCue =
    WorldBurstCue(v.player.xMm, v.player.zMm, WorldBurstKind.QUEST_NEAR)

/**
 * Ephemeral world bursts. Quality-budgeted; never mutates sim.
 */
class WorldBursts(poolSize: Int = VFX_BURST_POOL) {
    private class Slot(
        val x: Double,
        val z: Double,
        val kind: WorldBurstKind,
        val duration: Double,
        var age: Double = 0.0,
    )

    private val slots = arrayOfNulls<Slot>(poolSize)
    private var budget = poolSize

    val poolSize: Int get() = slots.size

    fun setBudget(n: Int) {
        budget = max(0, min(slots.size, n))
        for (i in budget until slots.size) slots[i] = null
    }

    fun clear() {
        for (i in slots.indices) slots[i] = null
    }

    fun spawn(cue: WorldBurstCue): Boolean {
        var free = -1
        for (i in 0 until budget) if (slots[i] == null) { free = i; break }
        if (free < 0) return false
        slots[free] = Slot(
            x = cue.xMm / 1000.0,
            z = cue.zMm / 1000.0,
            kind = cue.kind,
            duration = burstDurationS(cue.kind),
        )
        return true
    }

    fun update(dt: Double): List<WorldBurstPose?> {
        return slots.mapIndexed { i, s ->
            if (s == null) return@mapIndexed null
            s.age += dt
            val t = min(1.0, s.age / s.duration)
            val rise = t * (2.0 - t)
            val kindScale = when (s.kind) {
                WorldBurstKind.CELEBRATE,
                WorldBurstKind.ACHIEVEMENT,
                WorldBurstKind.FESTIVAL,
                WorldBurstKind.PRESTIGE,
                WorldBurstKind.RIVAL_BEAT,
                WorldBurstKind.TROPHY_SET,
                WorldBurstKind.ENDGAME_TIER,
                WorldBurstKind.ENDGAME_CHALLENGE,
                WorldBurstKind.FULL_UNLOCK,
                WorldBurstKind.COSMETIC -> 1.4
                WorldBurstKind.CATCH -> 0.85
                else -> 1.0
            }
            val scale = kindScale * (0.35 + 1.1 * rise)
            val opacity = 1.0 - t * t
            val yRise = when (s.kind) {
                WorldBurstKind.CELEBRATE,
                WorldBurstKind.ACHIEVEMENT,
                WorldBurstKind.FESTIVAL,
                WorldBurstKind.PRESTIGE,
                WorldBurstKind.RIVAL_BEAT,
                WorldBurstKind.TROPHY_SET,
                WorldBurstKind.ENDGAME_TIER,
                WorldBurstKind.ENDGAME_CHALLENGE,
                WorldBurstKind.FULL_UNLOCK,
                WorldBurstKind.COSMETIC -> 1.1
                WorldBurstKind.CATCH -> 0.55
                else -> 0.7
            }
            val y = 0.35 + yRise * rise
            if (t >= 1.0) {
                slots[i] = null
                return@mapIndexed null
            }
            WorldBurstPose(s.x, y, s.z, scale, opacity, s.kind)
        }
    }
}
