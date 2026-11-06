package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.exp
import kotlin.math.hypot
import kotlin.math.max

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

data class CrowdMember(val x: Double, val z: Double, val yaw: Double)

/**
 * Maps simulation customers onto a fixed pool of character models. Arriving and queued
 * customers follow their SimView position; customers that disappear from the view (paid
 * or gave up) walk back to the entry before their model is freed.
 */
class CustomerCrowd(poolSize: Int) {
    private class Member(val id: String, var x: Double, var z: Double, var yaw: Double, var leaving: Boolean)

    private val members = arrayOfNulls<Member>(poolSize)

    fun update(v: SimView, dt: Double): List<CrowdMember?> {
        val present = v.customers.associateBy { it.id }
        val exitX = v.customerEntryXMm / 1000.0
        val exitZ = v.customerEntryZMm / 1000.0
        val k = 1.0 - exp(-SMOOTHING_PER_SECOND * dt)

        for (m in members) if (m != null && !m.leaving && m.id !in present) m.leaving = true
        for (c in v.customers) {
            if (members.any { it?.id == c.id }) continue
            val free = members.indexOfFirst { it == null }
            if (free < 0) continue // pool exhausted: customer simply is not drawn
            members[free] = Member(c.id, c.xMm / 1000.0, c.zMm / 1000.0, 0.0, leaving = false)
        }

        return members.mapIndexed { i, m ->
            if (m == null) return@mapIndexed null
            if (m.leaving) {
                val dx = exitX - m.x
                val dz = exitZ - m.z
                val d = hypot(dx, dz)
                val step = LEAVE_SPEED_M_PER_S * dt
                if (d <= max(step, 0.05)) {
                    members[i] = null
                    return@mapIndexed null
                }
                m.yaw = atan2(dx, dz)
                m.x += dx / d * step
                m.z += dz / d * step
                return@mapIndexed CrowdMember(m.x, m.z, m.yaw)
            }
            val c = present.getValue(m.id)
            val dx = c.xMm / 1000.0 - m.x
            val dz = c.zMm / 1000.0 - m.z
            val targetYaw = when {
                hypot(dx, dz) > 0.02 -> atan2(dx, dz)
                c.arrived -> QUEUE_YAW
                else -> m.yaw
            }
            m.x += dx * k
            m.z += dz * k
            var dy = targetYaw - m.yaw
            while (dy > PI) dy -= 2 * PI
            while (dy < -PI) dy += 2 * PI
            m.yaw += dy * k
            CrowdMember(m.x, m.z, m.yaw)
        }
    }

    private companion object {
        const val LEAVE_SPEED_M_PER_S = 2.0
        const val SMOOTHING_PER_SECOND = 10.0
        /** Queued customers face the counter (toward -z). */
        const val QUEUE_YAW = PI
    }
}
