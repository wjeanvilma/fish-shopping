package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.foundation.layout.offset
import com.willio.jeanvilma.fishshopping.ui.theme.Ink
import com.willio.jeanvilma.fishshopping.ui.theme.PanelSurface
import kotlin.math.roundToInt

/**
 * Floating virtual joystick. The pad fills [modifier]; on press the stick base
 * relocates under the finger (floating placement) and reports a screen-space vector
 * (x right, y down) in -1..1, then (0, 0) on release.
 */
@Composable
fun Joystick(
    onMove: (x: Float, y: Float) -> Unit,
    modifier: Modifier = Modifier,
    diameter: Dp = 140.dp,
) {
    val density = LocalDensity.current
    val diameterPx = with(density) { diameter.toPx() }
    var padW by remember { mutableStateOf(0) }
    var padH by remember { mutableStateOf(0) }
    var baseCenter by remember { mutableStateOf<Offset?>(null) }
    var knob by remember { mutableStateOf(Offset.Zero) }
    val currentOnMove by rememberUpdatedState(onMove)

    val resting = remember(padW, padH, diameterPx) {
        if (padW <= 0 || padH <= 0) Offset.Zero
        else Offset(padW / 2f, padH - diameterPx / 2f)
    }
    val center = baseCenter ?: resting

    Box(
        modifier
            .fillMaxSize()
            .onSizeChanged {
                padW = it.width
                padH = it.height
            }
            .semantics { contentDescription = "Movement joystick" }
            .pointerInput(diameterPx) {
                val radius = diameterPx / 2f
                fun update(position: Offset, origin: Offset) {
                    var v = position - origin
                    val len = v.getDistance()
                    if (len > radius) v *= radius / len
                    knob = v
                    currentOnMove(v.x / radius, v.y / radius)
                }
                awaitEachGesture {
                    val down = awaitFirstDown()
                    val origin = down.position
                    baseCenter = origin
                    update(down.position, origin)
                    while (true) {
                        val event = awaitPointerEvent()
                        val change = event.changes.firstOrNull { it.id == down.id } ?: break
                        if (!change.pressed) break
                        update(change.position, origin)
                        change.consume()
                    }
                    baseCenter = null
                    knob = Offset.Zero
                    currentOnMove(0f, 0f)
                }
            },
    ) {
        Canvas(
            Modifier
                .size(diameter)
                .offset {
                    IntOffset(
                        (center.x - diameterPx / 2f).roundToInt(),
                        (center.y - diameterPx / 2f).roundToInt(),
                    )
                }
                .align(Alignment.TopStart),
        ) {
            val r = size.minDimension / 2f
            drawCircle(PanelSurface.copy(alpha = 0.35f), radius = r)
            drawCircle(Ink.copy(alpha = 0.5f), radius = r - 2f, style = Stroke(width = 3f))
            drawCircle(Color.White.copy(alpha = 0.9f), radius = r * 0.38f, center = this.center + knob)
            drawCircle(Ink, radius = r * 0.38f, center = this.center + knob, style = Stroke(width = 4f))
        }
    }
}
