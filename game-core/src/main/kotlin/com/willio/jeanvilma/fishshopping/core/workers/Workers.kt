package com.willio.jeanvilma.fishshopping.core.workers

import com.willio.jeanvilma.fishshopping.core.sim.StepContext

/**
 * Worker automation (blueprint "Workers, automation, and routing").
 * Not implemented yet; the types below fix the shape so persistence and UI can plan for it.
 *
 * Planned algorithm: generate tasks from unmet needs, score urgency/distance/demand,
 * a worker claims one task with a lease, reserves goods and destination capacity,
 * walks the route, commits the transfer, and releases the claim. Expired or invalid
 * claims return to the pool.
 */
enum class WorkerRole { FISHER, PORTER, OPERATOR, CASHIER, SUPERVISOR }

data class TaskLease(
    val taskId: String,
    val workerId: String,
    val sourceInventoryId: String,
    val destinationInventoryId: String,
    val itemId: String,
    val quantity: Int,
    val expiresAtTick: Long,
)

object WorkerSystem {
    @Suppress("UNUSED_PARAMETER")
    fun step(ctx: StepContext) {
        // TODO(phase 3): task generation, leases, reservations, routing.
    }
}
