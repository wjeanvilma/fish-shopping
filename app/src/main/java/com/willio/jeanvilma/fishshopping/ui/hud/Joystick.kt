package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.ui.theme.Ink
import com.willio.jeanvilma.fishshopping.ui.theme.PanelSurface

/**
 * Virtual joystick. Reports a vector in screen space (x right, y down), each -1..1,
 * and (0, 0) on release.
 *
 * TODO(blueprint accessibility): floating placement, adjustable size, left/right layout, tap-to-move.
 */
@Composable
fun Joystick(
    onMove: (x: Float, y: Float) -> Unit,
    modifier: Modifier = Modifier,
    diameter: Dp = 140.dp,
) {
    var knob by remember { mutableStateOf(Offset.Zero) }
    val currentOnMove by rememberUpdatedState(onMove)

    Canvas(
        modifier
            .size(diameter)
            .semantics { contentDescription = "Movement joystick" }
            .pointerInput(Unit) {
                val radius = size.width / 2f
                val center = Offset(radius, size.height / 2f)
                fun update(position: Offset) {
                    var v = position - center
                    val len = v.getDistance()
                    if (len > radius) v = v * (radius / len)
                    knob = v
                    currentOnMove(v.x / radius, v.y / radius)
                }
                awaitEachGesture {
                    val down = awaitFirstDown()
                    update(down.position)
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (!change.pressed) break
                        update(change.position)
                        change.consume()
                    }
                    knob = Offset.Zero
                    currentOnMove(0f, 0f)
                }
            },
    ) {
        val r = size.minDimension / 2f
        drawCircle(PanelSurface.copy(alpha = 0.35f), radius = r)
        drawCircle(Ink.copy(alpha = 0.5f), radius = r - 2f, style = Stroke(width = 3f))
        drawCircle(Color.White.copy(alpha = 0.9f), radius = r * 0.38f, center = center + knob)
        drawCircle(Ink, radius = r * 0.38f, center = center + knob, style = Stroke(width = 4f))
    }
}
