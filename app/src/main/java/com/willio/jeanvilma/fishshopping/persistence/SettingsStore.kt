package com.willio.jeanvilma.fishshopping.persistence

import android.content.Context
import com.willio.jeanvilma.fishshopping.core.i18n.UiStrings

/**
 * Presentation-only settings (not part of the parity save). Mute gates music+SFX;
 * music/SFX volumes and haptics are independent (Phase 17). Quality, accessibility,
 * and optional cloud sync are client-local.
 */
enum class QualityPreset { LOW, MEDIUM, HIGH }

enum class JoystickSide { LEFT, RIGHT }

data class GameSettings(
    val muted: Boolean = false,
    /** Phase 17/20: music bed gain (0 / 0.35 / 0.7 / 1). */
    val musicVolume: Float = 0.7f,
    /** Phase 17: SFX stinger gain (0 / 0.35 / 0.7 / 1). */
    val sfxVolume: Float = 1f,
    /** Phase 17: catch/sale vibration (independent of mute). */
    val hapticsEnabled: Boolean = true,
    val quality: QualityPreset = QualityPreset.MEDIUM,
    /** Bottom corner / floating pad side for the virtual stick. */
    val joystickSide: JoystickSide = JoystickSide.LEFT,
    /** Multiplier on the 140dp design-token diameter. */
    val joystickScale: Float = 1f,
    /** When true, tapping the harbor walks toward that ground point. */
    val tapToMove: Boolean = false,
    /** Opt-in cloud save sync. Local play works with this off. */
    val cloudSyncEnabled: Boolean = false,
    /** Phase 27 in-dev HUD strip for abandon / wage / catch-share rates. */
    val showBalanceStrip: Boolean = false,
    /** Phase 10: snap camera/locomotion and skip transfer VFX. */
    val reducedMotion: Boolean = false,
    /** Phase 10: show toast captions for alerts and transactions. */
    val captionsEnabled: Boolean = true,
    /** Phase 19: HUD font scale (1 / 1.15 / 1.3). */
    val hudTextScale: Float = 1f,
    /** Phase 19: shape glyphs beside colour status cues. */
    val shapeCues: Boolean = false,
    /** Phase 19: show Good/Perfect timing meter while casting. */
    val timingAssist: Boolean = false,
    /** Phase 25: opt-in privacy-safe analytics events. */
    val analyticsConsent: Boolean = false,
    /** Phase 25: true after the player answers the consent gate. */
    val analyticsConsentDecided: Boolean = false,
    /** Anonymous / Firebase account id used as the cloud document key. */
    val cloudAccountId: String? = null,
    /** Phase 22: Identity Toolkit refresh token for guest uid recovery. */
    val cloudRefreshToken: String? = null,
    /** Phase 24: equipped harbor banner cosmetic id (presentation-only). */
    val equippedCosmeticId: String? = null,
    /** Finish 2.0 Phase 23: UI chrome locale (en | es). */
    val locale: String = UiStrings.DEFAULT_LOCALE,
) {
    companion object {
        val SCALE_OPTIONS = listOf(0.75f, 1f, 1.25f)
        val VOLUME_OPTIONS = listOf(0f, 0.35f, 0.7f, 1f)
        val HUD_TEXT_SCALE_OPTIONS = listOf(1f, 1.15f, 1.3f)
        const val BASE_DIAMETER_DP = 140f

        fun clampScale(v: Float): Float =
            SCALE_OPTIONS.minByOrNull { kotlin.math.abs(it - v) } ?: 1f

        fun clampVolume(v: Float): Float =
            VOLUME_OPTIONS.minByOrNull { kotlin.math.abs(it - v) } ?: 1f

        fun clampHudTextScale(v: Float): Float =
            HUD_TEXT_SCALE_OPTIONS.minByOrNull { kotlin.math.abs(it - v) } ?: 1f

        fun formatLastSavedLabel(lastCheckpointEpochMs: Long?, nowMs: Long = System.currentTimeMillis()): String {
            if (lastCheckpointEpochMs == null) return "Not saved this session"
            val sec = ((nowMs - lastCheckpointEpochMs) / 1000L).coerceAtLeast(0L)
            if (sec < 5L) return "Saved just now"
            if (sec < 60L) return "Saved ${sec}s ago"
            val min = sec / 60L
            if (min < 60L) return "Saved ${min}m ago"
            val h = min / 60L
            return "Saved ${h}h ago"
        }
    }
}

/** Presentation-only save / cloud status for the Settings panel. */
data class SaveStatusView(
    val persistent: Boolean,
    val lastSavedLabel: String,
    val cloudEnabled: Boolean,
    val cloudAvailable: Boolean,
    val cloudLinked: Boolean,
    /** Phase 25: offline push queue has a pending snapshot. */
    val cloudPendingUpload: Boolean = false,
)

class SettingsStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun load(): GameSettings = GameSettings(
        muted = prefs.getBoolean(KEY_MUTED, false),
        musicVolume = GameSettings.clampVolume(prefs.getFloat(KEY_MUSIC_VOLUME, 0.7f)),
        sfxVolume = GameSettings.clampVolume(prefs.getFloat(KEY_SFX_VOLUME, 1f)),
        hapticsEnabled = prefs.getBoolean(KEY_HAPTICS, true),
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
        showBalanceStrip = prefs.getBoolean(KEY_BALANCE_STRIP, false),
        reducedMotion = prefs.getBoolean(KEY_REDUCED_MOTION, false),
        captionsEnabled = prefs.getBoolean(KEY_CAPTIONS, true),
        hudTextScale = GameSettings.clampHudTextScale(prefs.getFloat(KEY_HUD_TEXT_SCALE, 1f)),
        shapeCues = prefs.getBoolean(KEY_SHAPE_CUES, false),
        timingAssist = prefs.getBoolean(KEY_TIMING_ASSIST, false),
        analyticsConsent = prefs.getBoolean(KEY_ANALYTICS_CONSENT, false),
        analyticsConsentDecided = prefs.getBoolean(KEY_ANALYTICS_DECIDED, false),
        cloudAccountId = prefs.getString(KEY_CLOUD_ACCOUNT, null),
        cloudRefreshToken = prefs.getString(KEY_CLOUD_REFRESH, null),
        equippedCosmeticId = prefs.getString(KEY_EQUIPPED_COSMETIC, null),
        locale = UiStrings.resolveLocale(prefs.getString(KEY_LOCALE, UiStrings.DEFAULT_LOCALE)),
    ).also { UiStrings.setLocale(it.locale) }

    fun save(settings: GameSettings) {
        UiStrings.setLocale(settings.locale)
        prefs.edit()
            .putBoolean(KEY_MUTED, settings.muted)
            .putFloat(KEY_MUSIC_VOLUME, GameSettings.clampVolume(settings.musicVolume))
            .putFloat(KEY_SFX_VOLUME, GameSettings.clampVolume(settings.sfxVolume))
            .putBoolean(KEY_HAPTICS, settings.hapticsEnabled)
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
            .putBoolean(KEY_BALANCE_STRIP, settings.showBalanceStrip)
            .putBoolean(KEY_REDUCED_MOTION, settings.reducedMotion)
            .putBoolean(KEY_CAPTIONS, settings.captionsEnabled)
            .putFloat(KEY_HUD_TEXT_SCALE, GameSettings.clampHudTextScale(settings.hudTextScale))
            .putBoolean(KEY_SHAPE_CUES, settings.shapeCues)
            .putBoolean(KEY_TIMING_ASSIST, settings.timingAssist)
            .putBoolean(KEY_ANALYTICS_CONSENT, settings.analyticsConsent)
            .putBoolean(KEY_ANALYTICS_DECIDED, settings.analyticsConsentDecided)
            .apply {
                val id = settings.cloudAccountId
                if (id.isNullOrBlank()) remove(KEY_CLOUD_ACCOUNT) else putString(KEY_CLOUD_ACCOUNT, id)
                val refresh = settings.cloudRefreshToken
                if (refresh.isNullOrBlank()) remove(KEY_CLOUD_REFRESH) else putString(KEY_CLOUD_REFRESH, refresh)
                val cosmetic = settings.equippedCosmeticId
                if (cosmetic.isNullOrBlank()) remove(KEY_EQUIPPED_COSMETIC) else putString(KEY_EQUIPPED_COSMETIC, cosmetic)
                putString(KEY_LOCALE, UiStrings.resolveLocale(settings.locale))
            }
            .apply()
    }

    private companion object {
        const val PREFS = "fish_shopping_settings"
        const val KEY_MUTED = "muted"
        const val KEY_MUSIC_VOLUME = "music_volume"
        const val KEY_SFX_VOLUME = "sfx_volume"
        const val KEY_HAPTICS = "haptics_enabled"
        const val KEY_QUALITY = "quality"
        const val KEY_JOYSTICK_SIDE = "joystick_side"
        const val KEY_JOYSTICK_SCALE = "joystick_scale"
        const val KEY_TAP_TO_MOVE = "tap_to_move"
        const val KEY_CLOUD_SYNC = "cloud_sync_enabled"
        const val KEY_BALANCE_STRIP = "show_balance_strip"
        const val KEY_REDUCED_MOTION = "reduced_motion"
        const val KEY_CAPTIONS = "captions_enabled"
        const val KEY_HUD_TEXT_SCALE = "hud_text_scale"
        const val KEY_SHAPE_CUES = "shape_cues"
        const val KEY_TIMING_ASSIST = "timing_assist"
        const val KEY_ANALYTICS_CONSENT = "analytics_consent"
        const val KEY_ANALYTICS_DECIDED = "analytics_consent_decided"
        const val KEY_CLOUD_ACCOUNT = "cloud_account_id"
        const val KEY_CLOUD_REFRESH = "cloud_refresh_token"
        const val KEY_EQUIPPED_COSMETIC = "equipped_cosmetic_id"
        const val KEY_LOCALE = "locale"
    }
}
