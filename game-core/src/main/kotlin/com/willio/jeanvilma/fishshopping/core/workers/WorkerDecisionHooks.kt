package com.willio.jeanvilma.fishshopping.core.workers

/**
 * Finish 4.0 Phase 5 — explainable worker AI decision traces.
 * Finish 4.0 Phase 19 wave-2 reasons (trophy_cast_bias / line_pro_stock /
 * dock_relay / cargo_sprint_urgency / quick_till_queue) score without save-schema changes.
 */
data class WorkerDecisionTrace(
    val workerId: String,
    val role: String,
    val kind: String,
    val reason: String,
    val score: Long? = null,
    val candidatesConsidered: Int = 0,
    val tick: Long = 0L,
)

object WorkerDecisionHooks {
    private const val MAX_TRACES = 32

    @Volatile
    var lastTraces: List<WorkerDecisionTrace> = emptyList()
        private set

    fun record(trace: WorkerDecisionTrace) {
        val next = lastTraces + trace
        lastTraces = if (next.size <= MAX_TRACES) next else next.takeLast(MAX_TRACES)
    }

    fun clear() {
        lastTraces = emptyList()
    }

    fun lastForWorker(workerId: String): WorkerDecisionTrace? =
        lastTraces.asReversed().firstOrNull { it.workerId == workerId }
}
