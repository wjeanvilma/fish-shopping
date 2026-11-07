package com.willio.jeanvilma.fishshopping.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioTrack
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.sin
import kotlin.random.Random

/**
 * Phase 17 — layered AudioTrack bus: harbor ambience + SFX stingers, independent
 * music/SFX gains, optional haptics, and a concurrent-voice cap. Mute is a master
 * audio gate (music + SFX); haptics stay independent. Safe to call from the sim
 * thread — work is posted to the main looper.
 *
 * Phase 28 — USAGE_GAME audio focus: silence on LOSS / LOSS_TRANSIENT, restore on GAIN.
 */
class AudioBus(context: Context) {
    private val app = context.applicationContext
    private val main = Handler(Looper.getMainLooper())
    private val audioManager = app.getSystemService(AudioManager::class.java)
    @Volatile private var muted = false
    @Volatile private var musicVolume = 0.7f
    @Volatile private var sfxVolume = 1f
    @Volatile private var hapticsEnabled = true
    @Volatile private var activeVoices = 0
    /** Phase 28: silenced by system audio-focus loss (independent of Settings mute). */
    @Volatile private var focusHeld = false
    @Volatile private var silencedByFocusLoss = false
    private var focusRequest: AudioFocusRequest? = null

    private var ambienceTrack: AudioTrack? = null

    private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
        when (change) {
            AudioManager.AUDIOFOCUS_GAIN -> {
                silencedByFocusLoss = false
                main.post {
                    if (effectiveMusic() > 0f) ensureAmbience()
                    refreshAmbienceVolume()
                }
            }
            AudioManager.AUDIOFOCUS_LOSS,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
            AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK,
            -> {
                silencedByFocusLoss = true
                main.post { stopAmbience() }
            }
        }
    }

    private data class Tone(val freq: Double, val durMs: Int, val gain: Double = 0.22, val delayMs: Int = 0)

    private val cues: Map<SfxCue, List<Tone>> = mapOf(
        SfxCue.CATCH to listOf(
            Tone(520.0, 60, 0.28),
            Tone(780.0, 90, 0.24, delayMs = 50),
        ),
        SfxCue.MACHINE_DONE to listOf(
            Tone(340.0, 50, 0.18),
            Tone(340.0, 50, 0.18, delayMs = 80),
        ),
        SfxCue.SALE to listOf(
            Tone(880.0, 50, 0.26),
            Tone(1320.0, 120, 0.2, delayMs = 40),
        ),
        SfxCue.ABANDON to listOf(
            Tone(420.0, 100, 0.16),
            Tone(260.0, 160, 0.14, delayMs = 80),
        ),
        SfxCue.UPGRADE to listOf(
            Tone(523.0, 70, 0.22),
            Tone(659.0, 70, 0.22, delayMs = 60),
            Tone(784.0, 120, 0.24, delayMs = 120),
        ),
        SfxCue.RUSH to listOf(
            Tone(392.0, 100, 0.2),
            Tone(494.0, 100, 0.2, delayMs = 80),
            Tone(587.0, 180, 0.22, delayMs = 160),
        ),
    )

    fun applyLevels(
        muted: Boolean = this.muted,
        musicVolume: Float = this.musicVolume,
        sfxVolume: Float = this.sfxVolume,
        hapticsEnabled: Boolean = this.hapticsEnabled,
    ) {
        this.muted = muted
        this.musicVolume = clampVolume(musicVolume)
        this.sfxVolume = clampVolume(sfxVolume)
        this.hapticsEnabled = hapticsEnabled
        main.post {
            if (effectiveMusic() > 0f) ensureAmbience() else stopAmbience()
            refreshAmbienceVolume()
        }
    }

    fun setMuted(muted: Boolean) = applyLevels(muted = muted)

    fun setMusicVolume(volume: Float) = applyLevels(musicVolume = volume)

    fun setSfxVolume(volume: Float) = applyLevels(sfxVolume = volume)

    fun setHapticsEnabled(enabled: Boolean) {
        hapticsEnabled = enabled
    }

    /**
     * Phase 28: request USAGE_GAME focus while the Activity is started.
     * Returns true when focus is granted (or AudioManager is unavailable).
     */
    fun requestFocus(): Boolean {
        val mgr = audioManager ?: return true
        if (focusHeld) return !silencedByFocusLoss
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_GAME)
            .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
            .build()
        val request = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
            .setAudioAttributes(attrs)
            .setOnAudioFocusChangeListener(focusListener, main)
            .setWillPauseWhenDucked(true)
            .build()
        focusRequest = request
        val result = mgr.requestAudioFocus(request)
        focusHeld = result == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
        silencedByFocusLoss = !focusHeld
        if (focusHeld && effectiveMusic() > 0f) {
            main.post { ensureAmbience() }
        }
        return focusHeld
    }

    /** Phase 28: abandon focus on Activity stop / ViewModel clear. */
    fun abandonFocus() {
        val mgr = audioManager ?: return
        val request = focusRequest ?: return
        mgr.abandonAudioFocusRequest(request)
        focusRequest = null
        focusHeld = false
        silencedByFocusLoss = false
        main.post { stopAmbience() }
    }

    /** Test seam: true while silenced by focus loss. */
    fun isSilencedByFocusLoss(): Boolean = silencedByFocusLoss

    fun play(cue: SfxCue) {
        val tones = cues[cue] ?: return
        val sfxGain = effectiveSfx()
        main.post {
            if (sfxGain > 0f) {
                val needed = tones.size
                if (!canSpawnVoices(activeVoices, needed)) return@post
                activeVoices += needed
                for (tone in tones) {
                    main.postDelayed({
                        if (effectiveSfx() > 0f) playTone(tone, effectiveSfx().toDouble())
                        activeVoices = (activeVoices - 1).coerceAtLeast(0)
                    }, tone.delayMs.toLong())
                }
            }
            if (cue.wantsHaptic()) pulseHaptic(cue)
            if (effectiveMusic() > 0f) ensureAmbience()
        }
    }

    private fun pulseHaptic(cue: SfxCue) {
        if (!hapticsEnabled) return
        val vibrator = vibrator() ?: return
        val ms = if (cue == SfxCue.SALE) 35L else 28L
        if (Build.VERSION.SDK_INT >= 26) {
            vibrator.vibrate(VibrationEffect.createOneShot(ms, VibrationEffect.DEFAULT_AMPLITUDE))
        } else {
            @Suppress("DEPRECATION")
            vibrator.vibrate(ms)
        }
    }

    private fun vibrator(): Vibrator? {
        return if (Build.VERSION.SDK_INT >= 31) {
            val mgr = app.getSystemService(VibratorManager::class.java) ?: return null
            mgr.defaultVibrator
        } else {
            @Suppress("DEPRECATION")
            app.getSystemService(Vibrator::class.java)
        }
    }

    private fun effectiveSfx(): Float =
        if (muted || silencedByFocusLoss) 0f else sfxVolume.coerceIn(0f, 1f)

    private fun effectiveMusic(): Float =
        if (muted || silencedByFocusLoss) 0f else musicVolume.coerceIn(0f, 1f)

    private fun ensureAmbience() {
        if (ambienceTrack != null) return
        val sampleRate = 22_050
        val seconds = 2
        val samples = sampleRate * seconds
        val buf = ShortArray(samples)
        var last = 0.0
        val rnd = Random(17)
        val twoPiHum = 2.0 * PI * 78.0 / sampleRate
        for (i in 0 until samples) {
            val white = rnd.nextDouble() * 2.0 - 1.0
            last = (last + 0.02 * white) / 1.02
            val hum = sin(twoPiHum * i) * 0.18
            buf[i] = ((last * 0.55 + hum) * 0.35 * Short.MAX_VALUE).toInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                .toShort()
        }
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(buf.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        track.write(buf, 0, buf.size)
        track.setLoopPoints(0, buf.size, -1)
        val vol = (effectiveMusic() * 0.45f).coerceIn(0f, 1f)
        track.setVolume(vol)
        track.play()
        ambienceTrack = track
    }

    private fun refreshAmbienceVolume() {
        val track = ambienceTrack ?: return
        val vol = (effectiveMusic() * 0.45f).coerceIn(0f, 1f)
        track.setVolume(vol)
    }

    private fun stopAmbience() {
        val track = ambienceTrack ?: return
        ambienceTrack = null
        runCatching {
            track.stop()
            track.release()
        }
    }

    private fun playTone(tone: Tone, volumeScale: Double) {
        val sampleRate = 22_050
        val samples = (sampleRate * tone.durMs / 1000.0).toInt().coerceAtLeast(1)
        val buf = ShortArray(samples)
        val twoPiF = 2.0 * PI * tone.freq / sampleRate
        val peak = tone.gain * volumeScale
        for (i in 0 until samples) {
            val env = when {
                i < samples / 10 -> i.toDouble() / (samples / 10.0)
                else -> 1.0 - (i - samples / 10.0) / (samples * 0.9)
            }.coerceIn(0.0, 1.0)
            buf[i] = (sin(twoPiF * i) * peak * env * Short.MAX_VALUE).toInt()
                .coerceIn(Short.MIN_VALUE.toInt(), Short.MAX_VALUE.toInt())
                .toShort()
        }
        val track = AudioTrack.Builder()
            .setAudioAttributes(
                AudioAttributes.Builder()
                    .setUsage(AudioAttributes.USAGE_GAME)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                    .build(),
            )
            .setAudioFormat(
                AudioFormat.Builder()
                    .setEncoding(AudioFormat.ENCODING_PCM_16BIT)
                    .setSampleRate(sampleRate)
                    .setChannelMask(AudioFormat.CHANNEL_OUT_MONO)
                    .build(),
            )
            .setBufferSizeInBytes(buf.size * 2)
            .setTransferMode(AudioTrack.MODE_STATIC)
            .build()
        track.write(buf, 0, buf.size)
        track.play()
        main.postDelayed({
            runCatching {
                track.stop()
                track.release()
            }
        }, tone.durMs + 40L)
    }

    companion object {
        const val MAX_SFX_VOICES = 6
        val VOLUME_STEPS = floatArrayOf(0f, 0.35f, 0.7f, 1f)

        fun clampVolume(v: Float): Float =
            VOLUME_STEPS.minByOrNull { abs(it - v) } ?: 1f

        fun canSpawnVoices(active: Int, needed: Int, max: Int = MAX_SFX_VOICES): Boolean {
            if (needed <= 0) return false
            return active + needed <= max
        }

        fun effectiveSfxGain(muted: Boolean, sfxVolume: Float): Float =
            if (muted) 0f else sfxVolume.coerceIn(0f, 1f)

        fun effectiveMusicGain(muted: Boolean, musicVolume: Float): Float =
            if (muted) 0f else musicVolume.coerceIn(0f, 1f)
    }
}
