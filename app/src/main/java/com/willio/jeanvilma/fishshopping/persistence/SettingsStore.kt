package com.willio.jeanvilma.fishshopping.persistence

import android.content.Context

/**
 * Presentation-only settings (not part of the parity save). Mute gates the AudioBus;
 * quality, accessibility, and optional cloud sync are client-local.
 */
enum class QualityPreset { LOW, MEDIUM, HIGH }

enum class JoystickSide { LEFT, RIGHT }

data class GameSettings(
    val muted: Boolean = false,
    val quality: QualityPreset = QualityPreset.MEDIUM,
    /** Bottom corner / floating pad side for the virtual stick. */
    val joystickSide: JoystickSide = JoystickSide.LEFT,
    /** Multiplier on the 140dp design-token diameter. */
    val joystickScale: Float = 1f,
    /** When true, tapping the harbor walks toward that ground point. */
    val tapToMove: Boolean = false,
    /** Opt-in cloud save sync. Local play works with this off. */
    val cloudSyncEnabled: Boolean = false,
    /** Anonymous / Firebase account id used as the cloud document key. */
    val cloudAccountId: String? = null,
) {
    companion object {
        val SCALE_OPTIONS = listOf(0.75f, 1f, 1.25f)
        const val BASE_DIAMETER_DP = 140f

        fun clampScale(v: Float): Float =
            SCALE_OPTIONS.minByOrNull { kotlin.math.abs(it - v) } ?: 1f
    }
}

class SettingsStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(): GameSettings = GameSettings(
        muted = prefs.getBoolean(KEY_MUTED, false),
        quality = when (prefs.getString(KEY_QUALITY, "medium")) {
            "low" -> QualityPreset.LOW
            "high" -> QualityPreset.HIGH
            else -> QualityPreset.MEDIUM
        },
        joystickSide = when (prefs.getString(KEY_JOYSTICK_SIDE, "left")) {
            "right" -> JoystickSide.RIGHT
            else -> JoystickSide.LEFT
        },
        joystickScale = GameSettings.clampScale(prefs.getFloat(KEY_JOYSTICK_SCALE, 1f)),
        tapToMove = prefs.getBoolean(KEY_TAP_TO_MOVE, false),
        cloudSyncEnabled = prefs.getBoolean(KEY_CLOUD_SYNC, false),
        cloudAccountId = prefs.getString(KEY_CLOUD_ACCOUNT, null),
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
            .putString(
                KEY_JOYSTICK_SIDE,
                when (settings.joystickSide) {
                    JoystickSide.LEFT -> "left"
                    JoystickSide.RIGHT -> "right"
                },
            )
            .putFloat(KEY_JOYSTICK_SCALE, GameSettings.clampScale(settings.joystickScale))
            .putBoolean(KEY_TAP_TO_MOVE, settings.tapToMove)
            .putBoolean(KEY_CLOUD_SYNC, settings.cloudSyncEnabled)
            .apply {
                val id = settings.cloudAccountId
                if (id.isNullOrBlank()) remove(KEY_CLOUD_ACCOUNT) else putString(KEY_CLOUD_ACCOUNT, id)
            }
            .apply()
    }

    private companion object {
        const val PREFS = "fish_shopping_settings"
        const val KEY_MUTED = "muted"
        const val KEY_QUALITY = "quality"
        const val KEY_JOYSTICK_SIDE = "joystick_side"
        const val KEY_JOYSTICK_SCALE = "joystick_scale"
        const val KEY_TAP_TO_MOVE = "tap_to_move"
        const val KEY_CLOUD_SYNC = "cloud_sync_enabled"
        const val KEY_CLOUD_ACCOUNT = "cloud_account_id"
    }
}
