package com.willio.jeanvilma.fishshopping.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.staticCompositionLocalOf
import com.willio.jeanvilma.fishshopping.persistence.ThemePreference

/**
 * Finish 3.0 Phase 7 — brand light/dark schemes. HUD contrast stays predictable
 * and matches the web client when [themePreference] resolves the same mode.
 */
val LocalHarborPalette = staticCompositionLocalOf { HarborPalette.Light }

private val LightGameColorScheme = lightColorScheme(
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

private val DarkGameColorScheme = darkColorScheme(
    primary = ActionDark,
    onPrimary = OnActionDark,
    secondary = RewardDark,
    onSecondary = InkDark,
    tertiary = InkDark,
    background = PanelSurfaceDark,
    onBackground = InkDark,
    surface = PanelSurfaceDark,
    onSurface = InkDark,
    surfaceVariant = PanelMutedDark,
    onSurfaceVariant = InkDark,
    error = DangerDark,
)

fun resolveDarkTheme(
    preference: ThemePreference,
    systemDark: Boolean,
): Boolean = when (preference) {
    ThemePreference.LIGHT -> false
    ThemePreference.DARK -> true
    ThemePreference.SYSTEM -> systemDark
}

@Composable
fun FishShoppingTheme(
    themePreference: ThemePreference = ThemePreference.SYSTEM,
    content: @Composable () -> Unit,
) {
    val dark = resolveDarkTheme(themePreference, isSystemInDarkTheme())
    val palette = if (dark) HarborPalette.Dark else HarborPalette.Light
    CompositionLocalProvider(LocalHarborPalette provides palette) {
        MaterialTheme(
            colorScheme = if (dark) DarkGameColorScheme else LightGameColorScheme,
            typography = Typography,
            content = content,
        )
    }
}
