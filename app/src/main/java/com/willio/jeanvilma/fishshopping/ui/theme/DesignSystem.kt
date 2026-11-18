package com.willio.jeanvilma.fishshopping.ui.theme

import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

/**
 * Finish 3.0 Phase 7 — theme-aware design-system primitives shared by HUD panels.
 * Mirrors shared/tokens/design-tokens.json designSystem.components.
 */
object DesignSystem {
    val PanelCorner = RoundedCornerShape(16.dp)
    val PillCorner = RoundedCornerShape(50)
    val MinTouch = 48.dp
}

@Composable
fun DsPanel(
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = modifier,
        shape = DesignSystem.PanelCorner,
        color = MaterialTheme.colorScheme.surface.copy(alpha = 0.93f),
        content = content,
    )
}

@Composable
fun DsPill(
    modifier: Modifier = Modifier,
    background: Color = MaterialTheme.colorScheme.surface.copy(alpha = 0.92f),
    content: @Composable () -> Unit,
) {
    Surface(
        modifier = modifier.heightIn(min = DesignSystem.MinTouch),
        shape = DesignSystem.PillCorner,
        color = background,
        content = content,
    )
}

@Composable
fun DsPrimaryButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    label: String,
) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = DesignSystem.MinTouch).fillMaxWidth(),
        colors = ButtonDefaults.buttonColors(
            containerColor = MaterialTheme.colorScheme.primary,
            contentColor = MaterialTheme.colorScheme.onPrimary,
        ),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(label)
    }
}

@Composable
fun DsGhostButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    enabled: Boolean = true,
    label: String,
) {
    OutlinedButton(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = DesignSystem.MinTouch),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Text(label)
    }
}

@Composable
fun DsScrim(modifier: Modifier = Modifier) {
    Surface(
        modifier = modifier,
        color = Color.Black.copy(alpha = 0.45f),
        content = {},
    )
}
