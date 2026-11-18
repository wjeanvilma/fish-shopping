package com.willio.jeanvilma.fishshopping.ui.theme

import androidx.compose.ui.graphics.Color

/**
 * Brand palette mirrors shared/tokens/design-tokens.json.
 * Light vals remain the default imports; [HarborPalette] supplies theme-aware sets.
 */

// Light (default brand)
val Ink = Color(0xFF153449)
val Action = Color(0xFF008F95)
val Reward = Color(0xFFE8AF4A)
val PanelSurface = Color(0xFFFBF7EF)
val PanelMuted = Color(0xFFEFE8DA)
val OnAction = Color(0xFFFFFFFF)
val Danger = Color(0xFFB3412E)
val Water = Color(0xFF2E7FA8)
val Muted = Color(0xFF4A5D68)
val Sky = Color(0xFF9FD3EA)
val RewardText = Color(0xFF8A5A10)

// Dark
val InkDark = Color(0xFFE8F1F6)
val ActionDark = Color(0xFF2BB8BE)
val RewardDark = Color(0xFFF0C15A)
val PanelSurfaceDark = Color(0xFF1A2A35)
val PanelMutedDark = Color(0xFF243744)
val OnActionDark = Color(0xFF082226)
val DangerDark = Color(0xFFE57368)
val WaterDark = Color(0xFF3A8FBA)
val MutedDark = Color(0xFF9BB0BC)
val SkyDark = Color(0xFF0E1A22)
val RewardTextDark = Color(0xFFF0C15A)

data class HarborPalette(
    val ink: Color,
    val action: Color,
    val reward: Color,
    val surface: Color,
    val surfaceMuted: Color,
    val onAction: Color,
    val danger: Color,
    val water: Color,
    val muted: Color,
    val sky: Color,
    val rewardText: Color,
) {
    companion object {
        val Light = HarborPalette(
            ink = Ink,
            action = Action,
            reward = Reward,
            surface = PanelSurface,
            surfaceMuted = PanelMuted,
            onAction = OnAction,
            danger = Danger,
            water = Water,
            muted = Muted,
            sky = Sky,
            rewardText = RewardText,
        )
        val Dark = HarborPalette(
            ink = InkDark,
            action = ActionDark,
            reward = RewardDark,
            surface = PanelSurfaceDark,
            surfaceMuted = PanelMutedDark,
            onAction = OnActionDark,
            danger = DangerDark,
            water = WaterDark,
            muted = MutedDark,
            sky = SkyDark,
            rewardText = RewardTextDark,
        )
    }
}
