package com.willio.jeanvilma.fishshopping.ui

import com.willio.jeanvilma.fishshopping.core.sim.MachineStatus
import com.willio.jeanvilma.fishshopping.persistence.GameSettings
import kotlin.math.abs

/**
 * Phase 19 — accessibility helpers (presentation-only). Shape cues back status
 * colour, HUD text scale, and a one-tap Accessibility preset.
 */
enum class StatusShape { TRIANGLE, CIRCLE, SQUARE, DIAMOND, RING }

enum class HudTextScale(val value: Float) {
    DEFAULT(1f),
    MEDIUM(1.15f),
    LARGE(1.3f),
}

fun statusShapeFor(status: MachineStatus): StatusShape = when (status) {
    MachineStatus.PROCESSING -> StatusShape.TRIANGLE
    MachineStatus.PAUSED -> StatusShape.SQUARE
    MachineStatus.NEEDS_REPAIR, MachineStatus.LOCKED -> StatusShape.DIAMOND
    MachineStatus.OUTPUT_FULL -> StatusShape.RING
    MachineStatus.WAITING_FOR_INPUT -> StatusShape.CIRCLE
}

fun statusShapeGlyph(shape: StatusShape): String = when (shape) {
    StatusShape.TRIANGLE -> "▶"
    StatusShape.SQUARE -> "■"
    StatusShape.DIAMOND -> "◆"
    StatusShape.RING -> "◎"
    StatusShape.CIRCLE -> "●"
}

fun clampHudTextScale(v: Float): Float =
    HudTextScale.entries.minByOrNull { abs(it.value - v) }?.value ?: 1f

fun hudTextScaleLabel(scale: Float): String = when (clampHudTextScale(scale)) {
    1.15f -> "Med"
    1.3f -> "Large"
    else -> "Default"
}

/** One-tap Accessibility preset. */
fun applyAccessibilityPreset(settings: GameSettings): GameSettings = settings.copy(
    reducedMotion = true,
    captionsEnabled = true,
    hudTextScale = 1.15f,
    shapeCues = true,
    timingAssist = true,
)
