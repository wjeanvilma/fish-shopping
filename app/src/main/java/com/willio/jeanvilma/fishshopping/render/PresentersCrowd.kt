package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.PlayerView
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Finish 4.0 Phase 6 — player / customer / worker crowd smoothers.
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
