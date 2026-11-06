package com.willio.jeanvilma.fishshopping.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

/**
 * Game UI uses the fixed brand palette rather than dynamic colour, so HUD contrast
 * over the 3D world is predictable and matches the web client.
 */
private val GameColorScheme = lightColorScheme(
    primary = Action,
    onPrimary = OnAction,
    secondary = Reward,
    onSecondary = Ink,
    tertiary = Ink,
    background = PanelSurface,
    onBackground = Ink,
    surface = PanelSurface,
    onSurface = Ink,
    surfaceVariant = PanelMuted,
    onSurfaceVariant = Ink,
    error = Danger,
)

@Composable
fun FishShoppingTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = GameColorScheme,
        typography = Typography,
        content = content,
    )
}
