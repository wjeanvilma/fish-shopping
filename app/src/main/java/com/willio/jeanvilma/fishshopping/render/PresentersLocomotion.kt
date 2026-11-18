package com.willio.jeanvilma.fishshopping.render

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min
import kotlin.math.sin

/**
 * Finish 4.0 Phase 6 — locomotion clip / pose helpers.
 */
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
