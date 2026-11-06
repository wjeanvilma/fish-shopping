package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.PlayerView
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.atan2
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
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

/*
 * Renderer-independent presentation logic, mirrored in web/src/render/presenters.ts.
 * Pure functions of SimView: they decide what is drawn, never what happens.
 */

private fun shortId(id: String) = id.substringAfter('.')

/**
 * Names of the pooled item slots that should be visible. Slot names follow the GLB contract
 * written by shared/tools/generate_blockout.py: Bag_<i>_fish|portion, In_<station>_<i>,
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

/** Grey-box locomotion pose (Phase 22). Roots use x/z/yaw; bodies use bobY/swayRad. */
data class CharacterPose(
    val x: Double,
    val z: Double,
    val yaw: Double,
    val walkPhase: Double,
    val speed01: Double,
    val bobY: Double,
    val swayRad: Double,
    val idle: Boolean,
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
/** Rest local Y of PlayerBody / CustomerBody_N in the blockout GLB. */
const val PLAYER_BODY_REST_Y = 0.8
const val CUSTOMER_BODY_REST_Y = 0.75
const val PLAYER_NOSE_REST_Y = 1.25
const val PLAYER_NOSE_REST_Z = 0.32

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
): Triple<CharacterPose, Double, Double> {
    val speed = if (dt > 1e-6) hypot(x - prevX, z - prevZ) / dt else 0.0
    val speed01 = min(1.0, speed / WALK_SPEED_REF_M_PER_S)
    val idle = speed < IDLE_SPEED_M_PER_S
    var wp = walkPhase
    var ip = idlePhase
    if (!idle) wp += speed * WALK_STRIDE_RAD_PER_M
    else ip += dt * IDLE_BREATH_RAD_PER_S
    val breath = IDLE_BREATH_AMP_M * if (queuedIdle) QUEUE_IDLE_BREATH_MULT else 1.0
    val bobY = if (idle) breath * sin(ip)
    else WALK_BOB_AMP_M * abs(sin(wp)) * speed01
    val swayRad = if (idle) {
        (if (queuedIdle) 0.035 else 0.015) * sin(ip * if (queuedIdle) 0.65 else 1.0)
    } else {
        WALK_SWAY_RAD * sin(wp) * speed01
    }
    return Triple(
        CharacterPose(x, z, yaw, wp, speed01, bobY, swayRad, idle),
        wp,
        ip,
    )
}

/**
 * Eases the player toward SimView and attaches grey-box walk/idle body language.
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

    fun update(player: PlayerView, dt: Double): CharacterPose {
        val tx = player.xMm / 1000.0
        val tz = player.zMm / 1000.0
        val tyaw = atan2(player.facingX.toDouble(), player.facingZ.toDouble())
        if (x.isNaN()) {
            x = tx; z = tz; yaw = tyaw
            return locomoteFromMotion(tx, tz, tx, tz, tyaw, 0.0, 0.0, 0.0).first
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
        val (pose, wp, ip) = locomoteFromMotion(prevX, prevZ, x, z, yaw, walkPhase, idlePhase, dt, false)
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
            if (t >= 1.0) {
                slots[i] = null
                return@mapIndexed null
            }
            FlyingTransferPose(x, y, z, s.kind)
        }
    }
}
