package com.willio.jeanvilma.fishshopping.render

import com.willio.jeanvilma.fishshopping.core.sim.SimView
import kotlin.math.max
import kotlin.math.min

/**
 * Finish 4.0 Phase 6 — quality / occlusion / stack slot presenters.
 */
const val FLYING_TRANSFER_POOL = 12
/** Arc flight time in seconds. */
const val FLYING_TRANSFER_DURATION_S = 0.35
/** Peak height of the parabolic arc above the ground (meters). */
const val FLYING_TRANSFER_ARC_HEIGHT_M = 0.9
internal const val FLYING_TRANSFER_BASE_Y_M = 0.25

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

internal fun shortId(id: String) = id.substringAfter('.')

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

