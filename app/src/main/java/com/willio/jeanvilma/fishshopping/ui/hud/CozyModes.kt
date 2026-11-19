package com.willio.jeanvilma.fishshopping.ui.hud

import android.widget.Toast
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.render.HarborCapture
import com.willio.jeanvilma.fishshopping.ui.ComposeUiTags

/** Cozy art pass 5: HUD modes beyond normal play. */
enum class CozyMode { PLAY, PHOTO, DECOR }

private val CozyShape = RoundedCornerShape(20.dp)

/**
 * Photo mode: hides the HUD, orbit camera (drag / pinch), time-of-day slider, snap + share.
 * Mirrors web PhotoModeOverlay.
 */
@Composable
fun PhotoModeOverlay(v: SimView, vm: GameViewModel, onExit: () -> Unit) {
    val context = LocalContext.current
    var time by remember { mutableStateOf<Float?>(null) }
    DisposableEffect(Unit) {
        vm.setWorldHold(true)
        HarborCapture.setPhotoMode(true)
        onDispose {
            HarborCapture.setPhotoMode(false)
            vm.setWorldHold(false)
        }
    }
    Box(
        Modifier
            .fillMaxSize()
            .pointerInput(Unit) {
                detectTransformGestures { _, pan, zoom, _ ->
                    HarborCapture.orbit(pan.x * 0.006, pan.y * 0.004, (1f - zoom) * 8.0)
                }
            },
    ) {
        Surface(
            Modifier.align(Alignment.TopCenter).safeDrawingPadding().padding(top = 12.dp),
            shape = CozyShape,
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.9f),
        ) {
            Text(UiStrings.t("photo.hint"), Modifier.padding(horizontal = 16.dp, vertical = 8.dp))
        }
        Surface(
            Modifier
                .align(Alignment.BottomCenter)
                .safeDrawingPadding()
                .padding(16.dp)
                .widthIn(max = 520.dp),
            shape = CozyShape,
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.94f),
        ) {
            Column(Modifier.padding(14.dp)) {
                Text(UiStrings.t("photo.timeOfDay"), style = MaterialTheme.typography.labelMedium)
                Slider(
                    value = time ?: v.dayProgressPermille.toFloat(),
                    onValueChange = {
                        time = it
                        HarborCapture.timeOverride = it.toInt()
                    },
                    valueRange = 0f..999f,
                )
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TextButton(
                        onClick = {
                            time = null
                            HarborCapture.timeOverride = null
                        },
                        enabled = time != null,
                    ) { Text(UiStrings.t("photo.live")) }
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = {
                            HarborCapture.capture(context, v.harborName) { uri ->
                                if (uri == null) {
                                    Toast.makeText(context, "Couldn't save the photo", Toast.LENGTH_SHORT).show()
                                } else {
                                    Toast.makeText(context, "Saved to Pictures/FishShopping", Toast.LENGTH_SHORT).show()
                                    HarborCapture.share(context, uri, v.harborName)
                                }
                            }
                        },
                        modifier = Modifier.heightIn(min = 48.dp).testTag(ComposeUiTags.PHOTO_SNAP),
                    ) { Text(UiStrings.t("photo.snap")) }
                    OutlinedButton(onClick = onExit, modifier = Modifier.heightIn(min = 48.dp)) { Text(UiStrings.t("photo.exit")) }
                }
            }
        }
    }
}

/**
 * Decorate mode: pick an owned decor item, nudge its spot on a 250 mm grid, rotate, place or
 * store. Placement rules come from the shared DecorSystem (web + Kotlin parity fixture).
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun DecorModeOverlay(v: SimView, vm: GameViewModel, onExit: () -> Unit, onOpenGoals: () -> Unit) {
    val owned = remember(v.decorOffers) { v.decorOffers.filter { it.status == "owned" } }
    var selected by remember { mutableStateOf<String?>(null) }
    var x by remember { mutableStateOf(Math.round(v.player.xMm / 250.0).toInt() * 250) }
    var z by remember { mutableStateOf(Math.round((v.player.zMm + 2000) / 250.0).toInt() * 250) }
    var rot by remember { mutableStateOf(0) }
    DisposableEffect(Unit) {
        vm.setWorldHold(true)
        onDispose { vm.setWorldHold(false) }
    }
    val problem = selected?.let { vm.decorPlacementProblem(it, x, z) }
    val placedIds = v.decorPlacements.map { it.decorId }.toSet()
    Box(Modifier.fillMaxSize()) {
        Surface(
            Modifier.align(Alignment.TopCenter).safeDrawingPadding().padding(top = 12.dp),
            shape = CozyShape,
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
        ) {
            Text(
                when {
                    selected == null -> "Pick a decoration to place"
                    problem != null -> problem
                    else -> "Spot is clear · ${x / 1000.0} m, ${z / 1000.0} m"
                },
                Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                color = if (problem != null) MaterialTheme.colorScheme.error else MaterialTheme.colorScheme.onSurface,
            )
        }
        Surface(
            Modifier
                .align(Alignment.BottomEnd)
                .safeDrawingPadding()
                .padding(16.dp)
                .widthIn(max = 360.dp),
            shape = CozyShape,
            color = MaterialTheme.colorScheme.surface,
        ) {
            Column(Modifier.padding(14.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(UiStrings.t("decor.title"), style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                    TextButton(onClick = onExit) { Text(UiStrings.t("decor.done")) }
                }
                if (owned.isEmpty()) {
                    Text(
                        UiStrings.t("decor.empty"),
                        style = MaterialTheme.typography.bodySmall,
                    )
                    Spacer(Modifier.height(8.dp))
                    Button(onClick = onOpenGoals) { Text(UiStrings.t("decor.openGoals")) }
                    return@Column
                }
                LazyColumn(Modifier.heightIn(max = 180.dp)) {
                    items(owned, key = { it.id }) { d ->
                        val isSel = d.id == selected
                        FilledTonalButton(
                            onClick = {
                                selected = d.id
                                v.decorPlacements.firstOrNull { it.decorId == d.id }?.let {
                                    x = it.xMm
                                    z = it.zMm
                                    rot = it.rotationQuarter
                                }
                            },
                            modifier = Modifier.fillMaxWidth().padding(vertical = 3.dp).heightIn(min = 48.dp),
                        ) {
                            Text(
                                (if (isSel) "● " else "") + d.name + " · " +
                                    UiStrings.t(if (d.id in placedIds) "decor.placed" else "decor.inStorage"),
                            )
                        }
                    }
                }
                val id = selected ?: return@Column
                Spacer(Modifier.height(8.dp))
                // Screen-relative nudges: the follow camera looks toward +z, so screen-right is -x.
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedButton(onClick = { x += 250 }) { Text(UiStrings.t("decor.left")) }
                    OutlinedButton(onClick = { z += 250 }) { Text(UiStrings.t("decor.up")) }
                    OutlinedButton(onClick = { z -= 250 }) { Text(UiStrings.t("decor.down")) }
                    OutlinedButton(onClick = { x -= 250 }) { Text(UiStrings.t("decor.right")) }
                    OutlinedButton(onClick = { rot = (rot + 1) % 4 }) { Text(UiStrings.t("decor.rotate")) }
                }
                Spacer(Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    if (id in placedIds) {
                        OutlinedButton(onClick = {
                            vm.storeDecor(id)
                            selected = null
                        }) { Text(UiStrings.t("decor.store")) }
                    }
                    Spacer(Modifier.weight(1f))
                    Button(
                        onClick = { vm.placeDecor(id, x, z, rot) },
                        enabled = problem == null,
                        modifier = Modifier.heightIn(min = 48.dp).testTag(ComposeUiTags.DECOR_PLACE),
                    ) { Text(if (id in placedIds) "Move here" else "Place") }
                }
            }
        }
    }
}
