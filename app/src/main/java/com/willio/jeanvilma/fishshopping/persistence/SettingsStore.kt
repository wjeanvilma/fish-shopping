package com.willio.jeanvilma.fishshopping.persistence

import android.content.Context

/**
 * Presentation-only settings (not part of the parity save). Mute is wired in Phase 25;
 * quality is available for renderers to read.
 */
enum class QualityPreset { LOW, MEDIUM, HIGH }

data class GameSettings(
    val muted: Boolean = false,
    val quality: QualityPreset = QualityPreset.MEDIUM,
)

class SettingsStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(): GameSettings = GameSettings(
        muted = prefs.getBoolean(KEY_MUTED, false),
        quality = when (prefs.getString(KEY_QUALITY, "medium")) {
            "low" -> QualityPreset.LOW
            "high" -> QualityPreset.HIGH
            else -> QualityPreset.MEDIUM
        },
    )

    fun save(settings: GameSettings) {
        prefs.edit()
            .putBoolean(KEY_MUTED, settings.muted)
            .putString(
                KEY_QUALITY,
                when (settings.quality) {
                    QualityPreset.LOW -> "low"
                    QualityPreset.HIGH -> "high"
                    QualityPreset.MEDIUM -> "medium"
                },
            )
            .apply()
    }

    private companion object {
        const val PREFS = "fish_shopping_settings"
        const val KEY_MUTED = "muted"
        const val KEY_QUALITY = "quality"
    }
}
