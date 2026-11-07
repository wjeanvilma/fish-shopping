package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.core.sim.PlayerView
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/** Max pool size for flying transfer meshes (Fly_N_fish|portion in the GLB). */
const val FLYING_TRANSFER_POOL = 12
/** Arc flight time in seconds. */
const val FLYING_TRANSFER_DURATION_S = 0.35
/** Peak height of the parabolic arc above the ground (meters). */
const val FLYING_TRANSFER_ARC_HEIGHT_M = 0.9
private const val FLYING_TRANSFER_BASE_Y_M = 0.25

/** Quality-scaled VFX budget (Phase 29). Caps concurrent arcs; never exceeds GLB pool. */
enum class PresenterQuality { LOW, MEDIUM, HIGH }

fun flyingTransferPoolForQuality(quality: PresenterQuality): Int = when (quality) {
    PresenterQuality.LOW -> 4
    PresenterQuality.MEDIUM -> 8
    PresenterQuality.HIGH -> FLYING_TRANSFER_POOL
}

/** Soft crowd draw cap by quality; clamped to the GLB customer pool at bind time. */
fun crowdDrawCapForQuality(quality: PresenterQuality, glbPool: Int): Int {
    val cap = when (quality) {
        PresenterQuality.LOW -> 3
        PresenterQuality.MEDIUM -> 5
        PresenterQuality.HIGH -> 8
    }
    return max(0, min(glbPool, cap))
}

/** Phase 31 — distance fade for zone pads / far helpers (presentation-only). */
const val OCCLUSION_NEAR_M = 14.0
const val OCCLUSION_FAR_M = 32.0
/** Soft crossfade duration when swapping harbor GLBs. */
const val HARBOR_TRANSITION_S = 0.35

/** True for blockout nodes that may soft-fade with distance (Zone_* pads). */
fun isOcclusionFadeName(name: String): Boolean = name.startsWith("Zone_")

/**
 * 1 at/near the player, 0 beyond [farM]. Linear between near and far.
 * Pure helper mirrored in presenters.ts.
 */
fun occlusionOpacity(
    distanceM: Double,
    nearM: Double = OCCLUSION_NEAR_M,
    farM: Double = OCCLUSION_FAR_M,
): Double {
    if (farM <= nearM) return if (distanceM <= nearM) 1.0 else 0.0
    if (distanceM <= nearM) return 1.0
    if (distanceM >= farM) return 0.0
    return 1.0 - (distanceM - nearM) / (farM - nearM)
}

/*
 * Renderer-independent presentation logic, mirrored in web/src/render/presenters.ts.
 * Pure functions of SimView: they decide what is drawn, never what happens.
 */

private fun shortId(id: String) = id.substringAfter('.')

/**
 * Names of the pooled item slots that should be visible. Slot names follow the GLB contract
 * written by shared/tools/generate_blockout.py (Phase 14 modular env): Bag_<i>_fish|portion, In_<station>_<i>,
 * Out_<station>_<i>, Stock_<counter>_<i>.
 */
fun visibleStackSlots(v: SimView): Set<String> {
    val shown = HashSet<String>()
    var i = 0
    for (item in v.bag) {
        val kind = if (item.itemId.startsWith("species.")) "fish" else "portion"
        repeat(item.count) { shown += "Bag_${i++}_$kind" }
    }
    for (st in v.stations) {
        val s = shortId(st.stationId)
        repeat(st.inputCount) { shown += "In_${s}_$it" }
        repeat(st.outputCount) { shown += "Out_${s}_$it" }
    }
    for (c in v.counters) {
        val s = shortId(c.counterId)
        repeat(c.stock) { shown += "Stock_${s}_$it" }
    }
    return shown
}

private val STACK_SLOT = Regex("""^(Bag_\d+_(fish|portion)|In_.+_\d+|Out_.+_\d+|Stock_.+_\d+)$""")

fun isStackSlotName(name: String) = STACK_SLOT.matches(name)

/** Phase 15 locomotion clips driven by presenters (no sim mutation). */
enum class LocomotionClip { IDLE, WALK, CARRY, CAST }

/** Character pose (Phase 22/15). Roots use x/z/yaw; bodies use bobY/swayRad/clip. */
data class CharacterPose(
    val x: Double,
    val z: Double,
    val yaw: Double,
    val walkPhase: Double,
    val speed01: Double,
    val bobY: Double,
    val swayRad: Double,
    val idle: Boolean,
    val clip: LocomotionClip = LocomotionClip.IDLE,
    /** 0..1 cast progress when clip === CAST; otherwise 0. */
    val cast01: Double = 0.0,
    /** Forward lean (radians) — stronger while carrying. */
    val leanRad: Double = 0.0,
)

/** Alias kept for older call sites; prefer [CharacterPose]. */
typealias CrowdMember = CharacterPose

const val WALK_SPEED_REF_M_PER_S = 1.4
const val WALK_STRIDE_RAD_PER_M = 4.2
const val WALK_BOB_AMP_M = 0.05
const val WALK_SWAY_RAD = 0.08
const val IDLE_SPEED_M_PER_S = 0.05
const val IDLE_BREATH_AMP_M = 0.012
const val IDLE_BREATH_RAD_PER_S = 2.2
const val QUEUE_IDLE_BREATH_MULT = 1.35
const val PLAYER_SMOOTHING_PER_SECOND = 18.0
const val CROWD_SMOOTHING_PER_SECOND = 10.0
const val WORKER_SMOOTHING_PER_SECOND = 12.0
/** Rest local Y of PlayerBody / CustomerBody_N / WorkerBody_N in the harbor GLB. */
const val PLAYER_BODY_REST_Y = 0.8
const val CUSTOMER_BODY_REST_Y = 0.75
const val WORKER_BODY_REST_Y = 0.78
const val PLAYER_NOSE_REST_Y = 1.25
const val PLAYER_NOSE_REST_Z = 0.32
const val PLAYER_ROD_REST_Y = 0.55
const val PLAYER_ROD_REST_X = 0.28
const val PLAYER_ROD_REST_Z = 0.05
const val WORKER_POOL = 12

/** Pick idle/walk/carry/cast from motion + inventory + fishing (presentation only). */
fun pickLocomotionClip(moving: Boolean, carrying: Boolean, casting: Boolean): LocomotionClip = when {
    casting -> LocomotionClip.CAST
    moving && carrying -> LocomotionClip.CARRY
    moving -> LocomotionClip.WALK
    carrying -> LocomotionClip.CARRY
    else -> LocomotionClip.IDLE
}

data class LocomotionOpts(
    val carrying: Boolean = false,
    val casting: Boolean = false,
    val cast01: Double = 0.0,
)

/**
 * Advance walk/idle phases from smoothed displacement. Pure helper for unit tests.
 * [queuedIdle] boosts breath when standing in a customer queue.
 */
fun locomoteFromMotion(
    prevX: Double,
    prevZ: Double,
    x: Double,
    z: Double,
    yaw: Double,
    walkPhase: Double,
    idlePhase: Double,
    dt: Double,
    queuedIdle: Boolean = false,
    opts: LocomotionOpts = LocomotionOpts(),
): Triple<CharacterPose, Double, Double> {
    val speed = if (dt > 1e-6) hypot(x - prevX, z - prevZ) / dt else 0.0
    val speed01 = min(1.0, speed / WALK_SPEED_REF_M_PER_S)
    val idle = speed < IDLE_SPEED_M_PER_S
    val cast01 = if (opts.casting) min(1.0, max(0.0, opts.cast01)) else 0.0
    val clip = pickLocomotionClip(moving = !idle, carrying = opts.carrying, casting = opts.casting)
    var wp = walkPhase
    var ip = idlePhase
    when (clip) {
        LocomotionClip.CAST -> ip += dt * IDLE_BREATH_RAD_PER_S
        else -> if (!idle) wp += speed * WALK_STRIDE_RAD_PER_M else ip += dt * IDLE_BREATH_RAD_PER_S
    }
    val breath = IDLE_BREATH_AMP_M * if (queuedIdle) QUEUE_IDLE_BREATH_MULT else 1.0
    val bobY: Double
    val swayRad: Double
    val leanRad: Double
    when (clip) {
        LocomotionClip.CAST -> {
            bobY = breath * 0.5 * sin(ip)
            swayRad = -0.12 - 0.25 * cast01
            leanRad = -0.08 - 0.18 * cast01
        }
        LocomotionClip.CARRY -> {
            bobY = if (idle) breath * sin(ip) else WALK_BOB_AMP_M * 0.7 * abs(sin(wp)) * speed01
            swayRad = if (idle) 0.02 * sin(ip) else WALK_SWAY_RAD * 0.75 * sin(wp) * speed01
            leanRad = 0.12 + if (idle) 0.0 else 0.08 * speed01
        }
        LocomotionClip.WALK -> {
            bobY = WALK_BOB_AMP_M * abs(sin(wp)) * speed01
            swayRad = WALK_SWAY_RAD * sin(wp) * speed01
            leanRad = 0.04 * speed01
        }
        LocomotionClip.IDLE -> {
            bobY = breath * sin(ip)
            swayRad = (if (queuedIdle) 0.035 else 0.015) * sin(ip * if (queuedIdle) 0.65 else 1.0)
            leanRad = 0.0
        }
    }
    return Triple(
        CharacterPose(x, z, yaw, wp, speed01, bobY, swayRad, idle, clip, cast01, leanRad),
        wp,
        ip,
    )
}

/**
 * Eases the player toward SimView and attaches walk/idle/carry/cast body language.
 */
class PlayerSmoother {
    private var x = Double.NaN
    private var z = 0.0
    private var yaw = 0.0
    private var walkPhase = 0.0
    private var idlePhase = 0.0

    fun reset() {
        x = Double.NaN
    }

    fun update(
        player: PlayerView,
        dt: Double,
        reducedMotion: Boolean = false,
        bagUsedUnits: Int = 0,
        fishingProgress: Float? = null,
    ): CharacterPose {
        val tx = player.xMm / 1000.0
        val tz = player.zMm / 1000.0
        val tyaw = atan2(player.facingX.toDouble(), player.facingZ.toDouble())
        val carrying = bagUsedUnits > 0
        val casting = fishingProgress != null
        val clipOpts = LocomotionOpts(carrying = carrying, casting = casting, cast01 = fishingProgress?.toDouble() ?: 0.0)
        if (x.isNaN() || reducedMotion) {
            x = tx; z = tz; yaw = tyaw
            walkPhase = 0.0
            idlePhase = 0.0
            val snapped = locomoteFromMotion(tx, tz, tx, tz, tyaw, 0.0, 0.0, 0.0, false, clipOpts).first
            return if (reducedMotion) {
                snapped.copy(bobY = 0.0, swayRad = 0.0, leanRad = 0.0, cast01 = if (casting) snapped.cast01 else 0.0)
            } else {
                snapped
            }
        }
        val prevX = x
        val prevZ = z
        val k = 1.0 - exp(-PLAYER_SMOOTHING_PER_SECOND * dt)
        x += (tx - x) * k
        z += (tz - z) * k
        var d = tyaw - yaw
        while (d > PI) d -= 2 * PI
        while (d < -PI) d += 2 * PI
        yaw += d * k
        val (pose, wp, ip) = locomoteFromMotion(prevX, prevZ, x, z, yaw, walkPhase, idlePhase, dt, false, clipOpts)
        walkPhase = wp
        idlePhase = ip
        return pose
    }
}

/**
 * Maps simulation customers onto a fixed pool of character models. Arriving and queued
 * customers follow their SimView position; customers that disappear from the view (paid
 * or gave up) walk back to the entry before their model is freed.
 */
class CustomerCrowd(poolSize: Int) {
    private class Member(
        val id: String,
        var x: Double,
        var z: Double,
        var yaw: Double,
        var leaving: Boolean,
        /** Index into the reverse approach path while leaving (waypoints then entry). */
        var leaveTargetIndex: Int = 0,
        var walkPhase: Double = 0.0,
        var idlePhase: Double = 0.0,
    )

    private val members = arrayOfNulls<Member>(poolSize)
    /** Soft draw budget ≤ GLB pool (Phase 29). Indices ≥ drawCap stay unused. */
    private var drawCap = poolSize

    val poolSize: Int get() = members.size

    /** Clamp how many customers may occupy pooled models. */
    fun setDrawCap(cap: Int) {
        drawCap = max(0, min(members.size, cap))
        for (i in drawCap until members.size) members[i] = null
    }

    fun update(v: SimView, dt: Double): List<CharacterPose?> {
        val present = v.customers.associateBy { it.id }
        val leavePath = buildLeavePathMeters(v)
        val k = 1.0 - exp(-CROWD_SMOOTHING_PER_SECOND * dt)

        for (m in members) if (m != null && !m.leaving && m.id !in present) {
            m.leaving = true
            m.leaveTargetIndex = 0
        }
        for (c in v.customers) {
            if (members.any { it?.id == c.id }) continue
            var free = -1
            for (i in 0 until drawCap) if (members[i] == null) { free = i; break }
            if (free < 0) continue // pool / quality budget exhausted: customer simply is not drawn
            members[free] = Member(c.id, c.xMm / 1000.0, c.zMm / 1000.0, 0.0, leaving = false)
        }

        return members.mapIndexed { i, m ->
            if (m == null) return@mapIndexed null
            if (m.leaving) {
                while (m.leaveTargetIndex < leavePath.size) {
                    val (tx, tz) = leavePath[m.leaveTargetIndex]
                    val dx = tx - m.x
                    val dz = tz - m.z
                    val d = hypot(dx, dz)
                    val step = LEAVE_SPEED_M_PER_S * dt
                    if (d <= max(step, 0.05)) {
                        m.leaveTargetIndex++
                        continue
                    }
                    val prevX = m.x
                    val prevZ = m.z
                    m.yaw = atan2(dx, dz)
                    m.x += dx / d * step
                    m.z += dz / d * step
                    val (pose, wp, ip) = locomoteFromMotion(
                        prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, false,
                    )
                    m.walkPhase = wp
                    m.idlePhase = ip
                    return@mapIndexed pose
                }
                members[i] = null
                return@mapIndexed null
            }
            val c = present.getValue(m.id)
            val dx = c.xMm / 1000.0 - m.x
            val dz = c.zMm / 1000.0 - m.z
            val targetYaw = when {
                hypot(dx, dz) > 0.02 -> atan2(dx, dz)
                c.arrived -> QUEUE_YAW
                else -> m.yaw
            }
            val prevX = m.x
            val prevZ = m.z
            m.x += dx * k
            m.z += dz * k
            var dy = targetYaw - m.yaw
            while (dy > PI) dy -= 2 * PI
            while (dy < -PI) dy += 2 * PI
            m.yaw += dy * k
            val (pose, wp, ip) = locomoteFromMotion(
                prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, c.arrived,
            )
            m.walkPhase = wp
            m.idlePhase = ip
            pose
        }
    }

    private fun buildLeavePathMeters(v: SimView): List<Pair<Double, Double>> {
        val points = ArrayList<Pair<Double, Double>>(v.customerPathWaypoints.size + 1)
        for (i in v.customerPathWaypoints.lastIndex downTo 0) {
            val p = v.customerPathWaypoints[i]
            points += p.xMm / 1000.0 to p.zMm / 1000.0
        }
        points += v.customerEntryXMm / 1000.0 to v.customerEntryZMm / 1000.0
        return points
    }

    private companion object {
        const val LEAVE_SPEED_M_PER_S = 2.0
        /** Queued customers face the counter (toward -z). */
        const val QUEUE_YAW = PI
    }
}

/**
 * Maps on-shift workers onto a fixed pool of Worker_* models (Phase 15).
 * Off-shift workers release their slot; motion drives walk/carry clips.
 */
class WorkerCrowd(poolSize: Int = WORKER_POOL) {
    private class Member(
        val id: String,
        var x: Double,
        var z: Double,
        var yaw: Double,
        var walkPhase: Double = 0.0,
        var idlePhase: Double = 0.0,
    )

    private val members = arrayOfNulls<Member>(poolSize)

    val poolSize: Int get() = members.size

    fun update(v: SimView, dt: Double): List<CharacterPose?> {
        val present = v.workers.filter { it.onShift }.associateBy { it.id }
        val k = 1.0 - exp(-WORKER_SMOOTHING_PER_SECOND * dt)

        for (i in members.indices) {
            val m = members[i]
            if (m != null && m.id !in present) members[i] = null
        }
        for (w in present.values) {
            if (members.any { it?.id == w.id }) continue
            var free = -1
            for (i in members.indices) if (members[i] == null) { free = i; break }
            if (free < 0) continue
            members[free] = Member(w.id, w.xMm / 1000.0, w.zMm / 1000.0, 0.0)
        }

        return members.map { m ->
            if (m == null) return@map null
            val w = present.getValue(m.id)
            val tx = w.xMm / 1000.0
            val tz = w.zMm / 1000.0
            val dx = tx - m.x
            val dz = tz - m.z
            val targetYaw = if (hypot(dx, dz) > 0.02) atan2(dx, dz) else m.yaw
            val prevX = m.x
            val prevZ = m.z
            m.x += dx * k
            m.z += dz * k
            var dy = targetYaw - m.yaw
            while (dy > PI) dy -= 2 * PI
            while (dy < -PI) dy += 2 * PI
            m.yaw += dy * k
            val (pose, wp, ip) = locomoteFromMotion(
                prevX, prevZ, m.x, m.z, m.yaw, m.walkPhase, m.idlePhase, dt, false,
                LocomotionOpts(carrying = w.bagUsedUnits > 0),
            )
            m.walkPhase = wp
            m.idlePhase = ip
            pose
        }
    }
}

/** One sim-authoritative transfer cue (from ItemsTransferred endpoints). */
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

/** Phase 16/21 — pooled world bursts; Finish 2.0 Phase 22 adds achievement/festival/contract_done/goal_claim. */
const val VFX_BURST_POOL = 8

fun worldBurstPoolForQuality(quality: PresenterQuality): Int = when (quality) {
    PresenterQuality.LOW -> 2
    PresenterQuality.MEDIUM -> 4
    PresenterQuality.HIGH -> VFX_BURST_POOL
}

enum class WorldBurstKind {
    CATCH, PAY, CELEBRATE, MACHINE_DONE,
    ACHIEVEMENT, FESTIVAL, CONTRACT_DONE, GOAL_CLAIM,
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
}

/** Phase 21 — screen-shake kinds; Finish 2.0 Phase 22 adds achievement/festival. */
enum class ShakeKind { CATCH, CUT, SALE, CELEBRATE, ACHIEVEMENT, FESTIVAL }

const val SHAKE_DURATION_S = 0.18
const val MAX_SHAKE_AMPLITUDE_M = 0.12

fun shakeAmplitudeM(kind: ShakeKind): Double = when (kind) {
    ShakeKind.CATCH -> 0.04
    ShakeKind.CUT -> 0.03
    ShakeKind.SALE -> 0.05
    ShakeKind.CELEBRATE -> 0.08
    ShakeKind.ACHIEVEMENT -> 0.06
    ShakeKind.FESTIVAL -> 0.05
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
                WorldBurstKind.FESTIVAL -> 1.4
                WorldBurstKind.CATCH -> 0.85
                else -> 1.0
            }
            val scale = kindScale * (0.35 + 1.1 * rise)
            val opacity = 1.0 - t * t
            val yRise = when (s.kind) {
                WorldBurstKind.CELEBRATE,
                WorldBurstKind.ACHIEVEMENT,
                WorldBurstKind.FESTIVAL -> 1.1
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
