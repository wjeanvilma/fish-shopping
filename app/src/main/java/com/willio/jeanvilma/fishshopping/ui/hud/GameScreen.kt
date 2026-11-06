package com.willio.jeanvilma.fishshopping.ui.hud

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.focusable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawingPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.unit.dp
import com.willio.jeanvilma.fishshopping.core.sim.ContextCard
import com.willio.jeanvilma.fishshopping.core.sim.SimView
import com.willio.jeanvilma.fishshopping.core.sim.UpgradeView
import com.willio.jeanvilma.fishshopping.game.GameUiState
import com.willio.jeanvilma.fishshopping.game.GameViewModel
import com.willio.jeanvilma.fishshopping.render.HarborView
import com.willio.jeanvilma.fishshopping.ui.theme.Action
import com.willio.jeanvilma.fishshopping.ui.theme.Danger
import com.willio.jeanvilma.fishshopping.ui.theme.Ink
import com.willio.jeanvilma.fishshopping.ui.theme.PanelSurface
import com.willio.jeanvilma.fishshopping.ui.theme.Reward
import kotlinx.coroutines.delay

private val PanelShape = RoundedCornerShape(16.dp)
private val Tabular = TextStyle(fontFeatureSettings = "tnum")

/** The harbor is the home screen; management panels open over it (blueprint "Navigation rules"). */
@Composable
fun GameScreen(vm: GameViewModel) {
    val ui by vm.ui.collectAsState()
    Box(Modifier.fillMaxSize().background(Color(0xFF9FD3EA))) {
        HarborView(viewProvider = { vm.latestView }, modifier = Modifier.fillMaxSize())
        when (val s = ui) {
            GameUiState.Loading -> CenterCard {
                CircularProgressIndicator(color = Action)
                Spacer(Modifier.height(12.dp))
                Text("Loading harbor...")
            }
            is GameUiState.Failed -> CenterCard {
                Text("Something went wrong", style = MaterialTheme.typography.titleMedium, color = Danger)
                Spacer(Modifier.height(8.dp))
                Text(s.message)
            }
            is GameUiState.Ready -> Hud(s, vm)
        }
        MessageTicker(vm)
    }
}

@Composable
private fun Hud(state: GameUiState.Ready, vm: GameViewModel) {
    val v = state.view
    val focus = remember { FocusRequester() }
    val keys = remember { mutableStateListOf<Key>() }

    BackHandler(enabled = state.upgradesOpen) { vm.setUpgradesOpen(false) }
    LaunchedEffect(Unit) { focus.requestFocus() }

    Box(
        Modifier
            .fillMaxSize()
            .safeDrawingPadding()
            .padding(16.dp)
            .focusRequester(focus)
            .focusable()
            // Hardware keyboard (emulators, Chromebooks): WASD / arrows, like the web client.
            .onKeyEvent { e ->
                val k = e.key
                if (e.type == KeyEventType.KeyDown && (k == Key.Spacebar || k == Key.F) && e.nativeKeyEvent.repeatCount == 0) {
                    vm.reel()
                    return@onKeyEvent true
                }
                if (k !in MOVE_KEYS) return@onKeyEvent false
                if (e.type == KeyEventType.KeyDown && k !in keys) keys += k
                if (e.type == KeyEventType.KeyUp) keys -= k
                val x = (if (keys.any { it == Key.D || it == Key.DirectionRight }) 1f else 0f) -
                    (if (keys.any { it == Key.A || it == Key.DirectionLeft }) 1f else 0f)
                val y = (if (keys.any { it == Key.S || it == Key.DirectionDown }) 1f else 0f) -
                    (if (keys.any { it == Key.W || it == Key.DirectionUp }) 1f else 0f)
                vm.setMove(x, y)
                true
            },
    ) {
        // Top left: current harbor.
        Pill(Modifier.align(Alignment.TopStart)) {
            Text(v.harborName, fontWeight = FontWeight.SemiBold)
        }
        // Top centre: coins.
        Pill(Modifier.align(Alignment.TopCenter), background = Reward) {
            Text("${formatCoins(v.coins)} coins", style = Tabular, fontWeight = FontWeight.Bold, color = Ink)
        }
        // Top right: management.
        Button(onClick = { vm.setUpgradesOpen(true) }, modifier = Modifier.align(Alignment.TopEnd).heightIn(min = 48.dp)) {
            Text("Upgrades")
        }
        // Left edge: tracked objective with one clear next step.
        v.tutorialText?.let { text ->
            Surface(
                Modifier.align(Alignment.CenterStart).widthIn(max = 220.dp),
                shape = PanelShape, color = PanelSurface.copy(alpha = 0.92f),
            ) {
                Column(Modifier.padding(12.dp)) {
                    Text("NEXT", style = MaterialTheme.typography.labelSmall, color = Action)
                    Text(text, fontWeight = FontWeight.Medium)
                }
            }
        }
        // Bottom left: joystick.
        Joystick(onMove = vm::setMove, modifier = Modifier.align(Alignment.BottomStart))
        // Bottom centre: station card, only in range.
        v.context?.let { StationCard(it, Modifier.align(Alignment.BottomCenter)) }
        if (v.fishingCanReel) {
            Button(
                onClick = vm::reel,
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .padding(bottom = 120.dp)
                    .heightIn(min = 48.dp),
                enabled = true,
            ) {
                Text(if (v.fishingTimingWindow) "Reel!" else "Reel")
            }
        }
        // Bottom right: carry indicator.
        CarryIndicator(v, Modifier.align(Alignment.BottomEnd))

        if (state.upgradesOpen) {
            UpgradePanel(
                upgrades = v.upgrades,
                coins = v.coins,
                onBuy = vm::purchase,
                onClose = { vm.setUpgradesOpen(false) },
                modifier = Modifier.align(Alignment.Center),
            )
        }
    }
}

private val MOVE_KEYS = setOf(
    Key.W, Key.A, Key.S, Key.D, Key.DirectionUp, Key.DirectionDown, Key.DirectionLeft, Key.DirectionRight,
)

@Composable
private fun StationCard(card: ContextCard, modifier: Modifier) {
    Surface(modifier.widthIn(min = 220.dp, max = 320.dp), shape = PanelShape, color = PanelSurface.copy(alpha = 0.95f)) {
        Column(Modifier.padding(12.dp)) {
            Text(card.title, fontWeight = FontWeight.Bold)
            card.lines.forEach { Text(it, style = Tabular) }
            card.progress?.let {
                Spacer(Modifier.height(6.dp))
                LinearProgressIndicator(progress = { it.coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth(), color = Action)
            }
        }
    }
}

@Composable
private fun CarryIndicator(v: SimView, modifier: Modifier) {
    Surface(modifier.widthIn(min = 140.dp), shape = PanelShape, color = PanelSurface.copy(alpha = 0.92f)) {
        Column(Modifier.padding(12.dp)) {
            Text("Bag ${v.bagUsedUnits}/${v.bagCapacityUnits}", fontWeight = FontWeight.Bold, style = Tabular)
            if (v.bag.isEmpty()) Text("Empty", color = Ink.copy(alpha = 0.6f))
            v.bag.forEach { Text("${it.count} x ${it.name}", style = Tabular) }
        }
    }
}

@Composable
private fun UpgradePanel(
    upgrades: List<UpgradeView>,
    coins: Long,
    onBuy: (String) -> Unit,
    onClose: () -> Unit,
    modifier: Modifier,
) {
    Surface(modifier.width(440.dp).heightIn(max = 320.dp), shape = PanelShape, color = PanelSurface, shadowElevation = 8.dp) {
        Column(Modifier.padding(16.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text("Upgrades", style = MaterialTheme.typography.titleLarge, modifier = Modifier.weight(1f))
                Text("${formatCoins(coins)} coins", style = Tabular, color = Ink)
                TextButton(onClick = onClose, modifier = Modifier.heightIn(min = 48.dp)) { Text("Close") }
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(upgrades, key = { it.id }) { u ->
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(u.name, fontWeight = FontWeight.SemiBold)
                            Text(u.description, style = MaterialTheme.typography.bodySmall)
                            // A disabled upgrade always explains the missing condition.
                            u.reason?.let { Text(it, style = MaterialTheme.typography.bodySmall, color = Danger) }
                        }
                        when {
                            u.owned -> Text("Owned", color = Action, modifier = Modifier.padding(horizontal = 12.dp))
                            else -> Button(
                                onClick = { onBuy(u.id) },
                                enabled = u.purchasable,
                                modifier = Modifier.heightIn(min = 48.dp),
                            ) { Text("${formatCoins(u.cost)}", style = Tabular) }
                        }
                    }
                }
            }
        }
    }
}

/** Short-lived feedback for committed transactions and rejected actions. */
@Composable
private fun MessageTicker(vm: GameViewModel) {
    var message by remember { mutableStateOf<String?>(null) }
    LaunchedEffect(vm) {
        vm.messages.collect { message = it }
    }
    LaunchedEffect(message) {
        if (message != null) {
            delay(1800)
            message = null
        }
    }
    message?.let {
        Box(Modifier.fillMaxSize().safeDrawingPadding().padding(top = 72.dp), contentAlignment = Alignment.TopCenter) {
            Pill(background = Ink) { Text(it, color = Color.White) }
        }
    }
}

@Composable
private fun Pill(
    modifier: Modifier = Modifier,
    background: Color = PanelSurface.copy(alpha = 0.92f),
    content: @Composable () -> Unit,
) {
    Surface(modifier.heightIn(min = 40.dp), shape = RoundedCornerShape(50), color = background) {
        Box(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), contentAlignment = Alignment.Center) { content() }
    }
}

@Composable
private fun CenterCard(content: @Composable () -> Unit) {
    Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Surface(shape = PanelShape, color = PanelSurface) {
            Column(Modifier.padding(24.dp), horizontalAlignment = Alignment.CenterHorizontally) { content() }
        }
    }
}

/** Compact notation for display only; stored values keep full precision. */
fun formatCoins(c: Long): String = when {
    c >= 1_000_000_000 -> "%.1fB".format(c / 1e9)
    c >= 1_000_000 -> "%.1fM".format(c / 1e6)
    c >= 10_000 -> "%.1fK".format(c / 1e3)
    else -> c.toString()
}
