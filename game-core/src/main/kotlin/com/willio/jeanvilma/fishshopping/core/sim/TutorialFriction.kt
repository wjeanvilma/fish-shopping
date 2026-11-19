package com.willio.jeanvilma.fishshopping.core.sim

/**
 * Phase 22 (post-1.0) — tutorial friction contracts from
 * `shared/content/tutorial-friction.json`. Copy + dwell nudges only;
 * advanceOn / schema 20 / content 1.0.0 stay frozen.
 */
object TutorialFriction {
    const val PHASE = 22
    const val SCHEMA = "fish.content.tutorial_friction.v1"
    const val CATALOG = "shared/content/tutorial-friction.json"
    const val CONTENT_PACK = "shared/content/content-pack.json"
    /** Content version when Phase 22 copy patches landed (live pack may be newer). */
    const val FROZEN_AT_CONTENT_VERSION = "1.0.0"
    const val SCHEMA_VERSION = 21
    const val DEFAULT_HINT_AFTER_MS = 9_000

    val HIGH_FRICTION_STEP_IDS: List<String> = listOf(
        "tutorial.catch_three",
        "tutorial.deliver_cutter",
        "tutorial.buy_upgrade",
        "tutorial.first_contract",
        "tutorial.hire_staff",
        "tutorial.grill_line",
        "tutorial.plot_marker",
    )

    data class Nudge(val stepId: String, val hintAfterMs: Int, val nudge: String)

    val NUDGES: List<Nudge> = listOf(
        Nudge("tutorial.catch_three", 7000, "Tip: hold Cast to charge, release into the green Reel window — early taps miss"),
        Nudge("tutorial.deliver_cutter", 8000, "Tip: walk fully onto the left teal In pad — dropping beside it does nothing"),
        Nudge("tutorial.buy_upgrade", 9000, "Tip: tap Upgrades (or press U) — Bag capacity is the first buy"),
        Nudge("tutorial.first_contract", 10000, "Tip: Jobs lists contracts; accept one, then carry the goods to the drop"),
        Nudge("tutorial.hire_staff", 11000, "Tip: keep selling until Make 10 sales, then Staff unlocks Hire"),
        Nudge("tutorial.grill_line", 10000, "Tip: the grill In pad is charcoal-side — walk onto it with fish in the bag"),
        Nudge("tutorial.plot_marker", 11000, "Tip: stand centered on the glowing expansion marker, then confirm the spend"),
    )

    fun nudgeFor(stepId: String): Nudge? = NUDGES.firstOrNull { it.stepId == stepId }

    fun nudgeText(stepId: String?, dwellMs: Long): String? {
        if (stepId.isNullOrBlank()) return null
        val n = nudgeFor(stepId) ?: return null
        if (dwellMs < n.hintAfterMs) return null
        return n.nudge
    }

    fun isHighFriction(stepId: String): Boolean = stepId in HIGH_FRICTION_STEP_IDS
}
